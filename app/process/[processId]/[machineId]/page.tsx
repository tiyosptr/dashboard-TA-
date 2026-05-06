'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  ArrowLeft, Cpu, Clock, AlertTriangle, Wrench,
  Activity, CheckCircle, Loader2, AlertCircle,
  Calendar, Timer, TrendingDown, RefreshCw,
  ServerCrash, ChevronRight,
} from 'lucide-react';

// ─── Fetcher for SWR ──────────────────────────────────────────────────────────
const fetcher = (url: string) => fetch(url).then(r => r.json());

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSeconds(totalSec: number) {
  if (!totalSec || totalSec <= 0) return '0h 0m';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function daysUntil(d: string | null) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function statusCfg(status: string | null) {
  switch (status?.toLowerCase()) {
    case 'running':
    case 'active':
      return {
        label: 'Running', dot: 'bg-emerald-500',
        badge: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        ring: 'ring-emerald-400', glow: 'shadow-emerald-200',
      };
    case 'downtime':
    case 'down':
      return {
        label: 'Downtime', dot: 'bg-red-500',
        badge: 'bg-red-100 text-red-700 border-red-300',
        ring: 'ring-red-400', glow: 'shadow-red-200',
      };
    case 'maintenance':
      return {
        label: 'Maintenance', dot: 'bg-amber-500',
        badge: 'bg-amber-100 text-amber-700 border-amber-300',
        ring: 'ring-amber-400', glow: 'shadow-amber-200',
      };
    case 'warning':
      return {
        label: 'Warning', dot: 'bg-orange-400',
        badge: 'bg-orange-100 text-orange-700 border-orange-300',
        ring: 'ring-orange-400', glow: 'shadow-orange-200',
      };
    case 'idle':
      return {
        label: 'Idle', dot: 'bg-slate-400',
        badge: 'bg-slate-100 text-slate-600 border-slate-300',
        ring: 'ring-slate-400', glow: 'shadow-slate-200',
      };
    default:
      return {
        label: status || 'Unknown', dot: 'bg-slate-300',
        badge: 'bg-slate-100 text-slate-500 border-slate-200',
        ring: 'ring-slate-300', glow: 'shadow-slate-100',
      };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProcessMachineDetailPage() {
  const params = useParams();
  const router = useRouter();

  const processId = params?.processId as string;
  const machineId = params?.machineId as string;

  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // SWR for data fetching with auto-revalidation
  const { data: statsData, error: statsError, mutate: mutateStats } = useSWR(
    machineId ? `/api/machines/${machineId}/runtime-stats` : null,
    fetcher,
    {
      refreshInterval: 0, // Disable auto-refresh, we'll use WebSocket
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const { data: processData, error: processError } = useSWR(
    '/api/process/with-machines',
    fetcher,
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
    }
  );

  // Derived data from SWR
  const machine = statsData?.success ? statsData.data.machine : null;
  const runtimeStats = statsData?.success ? statsData.data : null;
  const loading = !statsData && !statsError;
  const error = statsError || processError;

  // Process info
  const [processInfo, setProcessInfo] = useState<any>(null);

  useEffect(() => {
    if (processData?.success) {
      for (const group of processData.data) {
        const found = group.processes.find(
          (p: any) => p.process_id === processId && p.machine?.id === machineId
        );
        if (found) {
          setProcessInfo({ ...found, line_name: group.line_name });
          break;
        }
      }
    }
  }, [processData, processId, machineId]);

  // Downtime modal
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [submitting, setSubmitting] = useState(false);
  const [submitOk, setSubmitOk] = useState(false);

  // ── Submit downtime ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId,
          machineName: machine?.name_machine ?? machineId,
          reason: reason.trim(),
          severity,
          processId: processId || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to send notification');
      setSubmitOk(true);
      setTimeout(() => {
        setShowModal(false);
        setSubmitOk(false);
        setReason('');
        setSeverity('high');
        mutateStats(); // Revalidate data using SWR
      }, 1600);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── WebSocket Connection ──────────────────────────────────────────
  useEffect(() => {
    if (!machineId) return;

    const connectWebSocket = () => {
      // Connect to standalone WebSocket server on port 3001
      const wsUrl = 'ws://localhost:3001';

      console.log('[WebSocket] Connecting to:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected to standalone server');
        // Send subscription message if needed
        ws.send(JSON.stringify({
          type: 'subscribe',
          machineId: machineId,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', data);

          // Handle different message types
          if (data.type === 'MACHINE_STATUS_UPDATE' || data.type === 'DASHBOARD_UPDATE') {
            console.log('[WebSocket] Machine status update detected, revalidating data...');
            
            // Revalidate data using SWR
            mutateStats();
            
            // If current status is downtime and we receive an update, check if it changed to active
            if (machine?.status?.toLowerCase() === 'downtime') {
              // Fetch latest status to check if it's now active
              fetch(`/api/machines/${machineId}/runtime-stats`)
                .then(r => r.json())
                .then(json => {
                  if (json.success && json.data.machine.status?.toLowerCase() === 'active') {
                    console.log('[WebSocket] Machine status changed to ACTIVE!');
                    mutateStats(); // Force refresh
                  }
                })
                .catch(err => console.error('[WebSocket] Error checking status:', err));
            }
          }
        } catch (err) {
          console.error('[WebSocket] Error parsing message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Connection error - server may not be running');
      };

      ws.onclose = () => {
        console.log('[WebSocket] Connection closed, attempting to reconnect in 5s...');
        wsRef.current = null;
        
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        console.log('[WebSocket] Closing connection');
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [machineId, machine?.status, mutateStats]);

  // ── Derived ───────────────────────────────────────────────────────
  const cfg = statusCfg(machine?.status ?? null);
  const days = daysUntil(machine?.next_maintenance);
  const isDowntime =
    machine?.status?.toLowerCase() === 'downtime' ||
    machine?.status?.toLowerCase() === 'down';

  const runSec = runtimeStats?.totalRunningSeconds ?? 0;
  const downSec = runtimeStats?.totalDowntimeSeconds ?? 0;
  const totalSec = runSec + downSec;

  // ── Loading / Error ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={36} className="animate-spin text-indigo-500" />
          <p className="text-sm font-semibold text-slate-500">Loading machine data...</p>
        </div>
      </div>
    );
  }

  if (error || statsError) {
    const errorMessage = error?.message || statsError?.message || 'Failed to load data';
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle size={40} className="text-red-400" />
          <p className="text-base font-bold text-slate-700">Failed to load data</p>
          <p className="text-sm text-slate-500">{errorMessage}</p>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-semibold text-slate-700 transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">

      {/* ── Top Bar ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0 flex-wrap">
            <span>Process</span>
            <ChevronRight size={13} className="text-slate-300 flex-shrink-0" />
            <span className="font-semibold text-slate-700 truncate">
              {processInfo?.process_name ?? processId}
            </span>
            <ChevronRight size={13} className="text-slate-300 flex-shrink-0" />
            <span className="font-semibold text-slate-800 truncate">
              {machine?.name_machine ?? machineId}
            </span>
          </div>
        </div>
        <button
          onClick={() => mutateStats()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors flex-shrink-0"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* ── Main — fills remaining height, no scroll ── */}
      <div className="flex-1 p-5 flex flex-col gap-4 min-h-0">

        {/* ── Row 1: Machine Identity ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4 flex items-center gap-5 flex-shrink-0 flex-wrap">
          <div className={`relative w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0 ring-4 ${cfg.ring} ring-offset-2 shadow-lg ${cfg.glow}`}>
            <Cpu size={26} className="text-slate-600" />
            <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${cfg.dot} ${!isDowntime ? 'animate-pulse' : ''}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-slate-800 truncate">
              {machine?.name_machine ?? '—'}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
              {processInfo && (
                <>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500">{processInfo.process_name}</span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500">{processInfo.line_name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Row 2: Metrics + Downtime Button — fills remaining space ── */}
        <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">

          {/* Left: 3 metric cards */}
          <div className="col-span-12 lg:col-span-7 grid grid-rows-3 gap-4">

            {/* Runtime */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <Timer size={24} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                  Total Runtime
                </p>
                <p className="text-3xl font-black text-emerald-700 leading-tight">
                  {formatSeconds(runSec)}
                </p>
              </div>
            </div>

            {/* Total Downtime */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <TrendingDown size={24} className="text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                  Total Downtime
                </p>
                <p className="text-3xl font-black text-red-600 leading-tight">
                  {formatSeconds(downSec)}
                </p>
              </div>
              {/* Live indicator if currently in downtime */}
              {isDowntime && runtimeStats?.openEvent && (
                <div className="hidden sm:flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <div>
                    <p className="text-xs font-bold text-red-600">Live</p>
                    <p className="text-[10px] text-red-400">
                      {formatSeconds(runtimeStats.openEvent.liveDurationSeconds)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Next Maintenance */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 flex items-center gap-5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                days !== null && days <= 7 ? 'bg-amber-50' : 'bg-indigo-50'
              }`}>
                <Calendar size={24} className={days !== null && days <= 7 ? 'text-amber-500' : 'text-indigo-500'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                  Next Maintenance
                </p>
                <p className={`text-3xl font-black leading-tight ${
                  days !== null && days <= 7 ? 'text-amber-600' : 'text-indigo-700'
                }`}>
                  {formatDate(machine?.next_maintenance)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {days !== null
                    ? days < 0
                      ? `⚠ Overdue by ${Math.abs(days)} days`
                      : days === 0
                      ? 'Today'
                      : `In ${days} days`
                    : 'Not scheduled'}
                  {machine?.last_maintenance
                    ? ` · Last: ${formatDate(machine.last_maintenance)}`
                    : ''}
                </p>
              </div>
              {days !== null && days < 0 && (
                <div className="hidden sm:flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex-shrink-0">
                  <AlertCircle size={13} className="text-red-500" />
                  <span className="text-xs font-bold text-red-600">Overdue</span>
                </div>
              )}
              {days !== null && days >= 0 && days <= 7 && (
                <div className="hidden sm:flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex-shrink-0">
                  <AlertTriangle size={13} className="text-amber-500" />
                  <span className="text-xs font-bold text-amber-600">Soon</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Big Downtime Button */}
          <div className="col-span-12 lg:col-span-5 flex flex-col min-h-0">
            <button
              onClick={() => !isDowntime && setShowModal(true)}
              disabled={isDowntime}
              className={`flex-1 rounded-2xl border-2 flex flex-col items-center justify-center gap-5 transition-all duration-200 group
                ${isDowntime
                  ? 'bg-red-50 border-red-200 cursor-not-allowed'
                  : 'bg-white border-red-200 hover:bg-red-600 hover:border-red-600 hover:shadow-2xl hover:shadow-red-200 active:scale-[0.98] cursor-pointer'
                }`}
            >
              {/* Icon circle */}
              <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 ${
                isDowntime ? 'bg-red-100' : 'bg-red-100 group-hover:bg-white/20'
              }`}>
                <ServerCrash
                  size={48}
                  className={isDowntime
                    ? 'text-red-300'
                    : 'text-red-500 group-hover:text-white transition-colors duration-200'}
                />
              </div>

              {/* Label */}
              <div className="text-center px-4">
                <p className={`text-3xl font-black transition-colors duration-200 ${
                  isDowntime ? 'text-red-300' : 'text-red-600 group-hover:text-white'
                }`}>
                  {isDowntime ? 'Currently in Downtime' : 'Report Downtime'}
                </p>
                <p className={`text-sm font-medium mt-2 transition-colors duration-200 ${
                  isDowntime ? 'text-red-200' : 'text-slate-400 group-hover:text-red-100'
                }`}>
                  {isDowntime
                    ? 'Machine is currently in downtime condition'
                    : 'Click to send notification & update machine status'}
                </p>
              </div>

              {/* Status pill */}
              {isDowntime && (
                <div className="flex items-center gap-2 bg-red-100 border border-red-200 rounded-full px-5 py-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-bold text-red-600">Active status</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Downtime Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => !submitting && setShowModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
            onClick={e => e.stopPropagation()}
          >
            {submitOk ? (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle size={32} className="text-emerald-500" />
                </div>
                <p className="text-lg font-black text-slate-800">Notification Sent!</p>
                <p className="text-sm text-slate-500 text-center">
                  Machine status updated to <strong>Downtime</strong> and notification has been sent to the system.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center flex-shrink-0">
                    <ServerCrash size={24} className="text-red-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800">Report Downtime</h2>
                    <p className="text-xs text-slate-500">{machine?.name_machine}</p>
                  </div>
                </div>

                {/* Severity */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Severity Level
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['low', 'medium', 'high', 'critical'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setSeverity(s)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all capitalize ${
                          severity === s
                            ? s === 'critical' ? 'bg-red-600 text-white border-red-600'
                              : s === 'high' ? 'bg-orange-500 text-white border-orange-500'
                              : s === 'medium' ? 'bg-amber-400 text-white border-amber-400'
                              : 'bg-blue-500 text-white border-blue-500'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Reason / Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Describe the cause of downtime..."
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !reason.trim()}
                    className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting
                      ? <><Loader2 size={14} className="animate-spin" /> Sending...</>
                      : <><ServerCrash size={14} /> Send Notification</>
                    }
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
