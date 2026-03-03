'use client';

import { AlertTriangle, ArrowLeft, Loader2, Info, Clock, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/supabase';
import { Notification } from '@/types';

interface Line {
  id: string;
  name: string;
}

interface ProcessWithMachine {
  processId: string;
  processName: string;
  machine: {
    id: string;
    nameMachine: string;
  } | null;
}

export default function NotifPage() {
  const router = useRouter();
  const [isTriggering, setIsTriggering] = useState(false);

  // Data States
  const [lines, setLines] = useState<Line[]>([]);
  const [processes, setProcesses] = useState<ProcessWithMachine[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<Notification[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);

  // Form State
  const [selectedLineId, setSelectedLineId] = useState<string>('');
  const [selectedProcessId, setSelectedProcessId] = useState<string>('');
  const [severity, setSeverity] = useState<string>('high');
  const [description, setDescription] = useState<string>('');

  // 1. Initial Load: Fetch all lines & recent alerts
  useEffect(() => {
    loadLines();
    loadRecentAlerts();

    // Subscribe to real-time updates for notifications
    const channel = supabase
      .channel('downtime-alerts-page')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification'
        },
        () => {
          loadRecentAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadLines = async () => {
    try {
      const response = await fetch('/api/lines');
      const result = await response.json();

      if (result.success && result.data.length > 0) {
        setLines(result.data);
      }
    } catch (error) {
      console.error('Error loading lines:', error);
    }
  };

  const loadRecentAlerts = async () => {
    try {
      const response = await fetch('/api/notifications?filter=all');
      const result = await response.json();
      if (result.success) {
        // Show all recent downtime notifications, ordered by start_at (already done by API)
        const downtimeAlerts = result.data.filter((n: Notification) => n.type === 'Downtime').slice(0, 10);
        setRecentAlerts(downtimeAlerts);
      }
    } catch (error) {
      console.error('Error loading recent alerts:', error);
    } finally {
      setIsLoadingAlerts(false);
    }
  };

  // 2. Load processes when a line is selected
  useEffect(() => {
    if (selectedLineId) {
      loadProcesses(selectedLineId);
    } else {
      setProcesses([]);
      setSelectedProcessId('');
    }
  }, [selectedLineId]);

  const loadProcesses = async (lineId: string) => {
    try {
      const response = await fetch(`/api/lines/${lineId}/machines`);
      const result = await response.json();

      if (result.success && result.data.processes) {
        // Only show processes that have an actual machine assigned
        const processesWithAssignedMachine = result.data.processes.filter((p: any) => p.machine !== null);
        setProcesses(processesWithAssignedMachine);
        setSelectedProcessId(''); // Reset selected process when line changes
      }
    } catch (error) {
      console.error('Error loading processes:', error);
    }
  };

  const triggerDowntime = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLineId || !selectedProcessId || !description.trim()) {
      alert('Please complete all requires fields.');
      return;
    }

    setIsTriggering(true);

    try {
      const selectedProcess = processes.find(p => p.processId === selectedProcessId);
      const selectedMachine = selectedProcess?.machine;

      if (!selectedMachine) {
        throw new Error("Invalid machine mapping selected");
      }

      const newDowntime = {
        machineId: selectedMachine.id,
        machineName: selectedMachine.nameMachine,
        processId: selectedProcessId,
        reason: description,
        severity: severity,
      };

      // Create notification via API
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDowntime),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create notification');
      }

      // Reset form on success but stay on page
      setDescription('');
      setSelectedProcessId('');
      setSelectedLineId('');
      setSeverity('high');

      // We don't need to manually alert/push anymore; UI updates locally and lists it via realtime
    } catch (error: any) {
      console.error('Failed to trigger downtime:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6 sm:p-8 pt-24" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
      {/* Back Button */}
      <button
        onClick={() => router.push('/')}
        className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md"
      >
        <ArrowLeft size={18} />
        <span className="font-medium text-sm">Back to Dashboard</span>
      </button>

      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

        {/* Left: Form Card (Col Span 2) */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 sm:p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-rose-500 to-rose-700 rounded-2xl mb-4 shadow-lg shadow-rose-500/30 rotate-3">
                <AlertTriangle size={30} className="text-white" strokeWidth={2.5} />
              </div>

              <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Report Issue</h1>
              <p className="text-slate-400 text-sm">
                Create a new ticket for machine downtime based on its process line.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={triggerDowntime} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-300">
                  Production Line <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedLineId}
                    onChange={(e) => setSelectedLineId(e.target.value)}
                    className="w-full appearance-none pl-4 pr-10 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all"
                    required
                  >
                    <option value="" disabled>Select a Line...</option>
                    {lines.map((line) => (
                      <option key={line.id} value={line.id}>
                        {line.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-slate-400"></div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-300">
                  Process & Machine <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedProcessId}
                    onChange={(e) => setSelectedProcessId(e.target.value)}
                    disabled={!selectedLineId || processes.length === 0}
                    className="w-full appearance-none pl-4 pr-10 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="" disabled>
                      {!selectedLineId
                        ? 'Wait for Line...'
                        : processes.length === 0
                          ? 'No machines found'
                          : 'Select Process...'}
                    </option>
                    {processes.map((proc) => (
                      <option key={proc.processId} value={proc.processId}>
                        {proc.processName} • {proc.machine?.nameMachine}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-slate-400"></div>
                  </div>
                </div>
              </div>

              {/* Severity Selection */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-sm font-semibold text-slate-300">
                  Severity Level <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'critical', label: 'Critical', color: 'bg-rose-500 border-rose-500 text-white shadow-rose-500/20' },
                    { value: 'high', label: 'High', color: 'bg-amber-500 border-amber-500 text-white shadow-amber-500/20' },
                    { value: 'low', label: 'Low', color: 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20' }
                  ].map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setSeverity(level.value)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${severity === level.value
                        ? `${level.color} shadow-lg scale-105`
                        : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                        }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description / Message */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-sm font-semibold text-slate-300">
                  Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue, symptoms, or error messages..."
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all resize-none h-28"
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isTriggering || !selectedProcessId}
                className="w-full mt-4 px-6 py-4 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 active:scale-[0.98] text-white font-bold rounded-xl shadow-xl shadow-rose-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTriggering ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Submitting Alert...</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={20} />
                    <span>Submit Ticket</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="px-6 py-4 bg-slate-900/40 border-t border-white/5 flex gap-3">
            <Info size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed">
              Alerts will immediately notify linked dashboard screens via realtime connection.
            </p>
          </div>
        </div>

        {/* Right: Notification History Card (Col Span 3) */}
        <div className="lg:col-span-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[750px]">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Clock size={20} className="text-indigo-400" />
              Recent Notifications
            </h2>
            <div className="text-xs font-semibold px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              Live Sync
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {isLoadingAlerts ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Loader2 size={32} className="animate-spin mb-4 text-indigo-500" />
                <p>Loading notification history...</p>
              </div>
            ) : recentAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <CheckCircle2 size={48} className="mb-4 text-emerald-500/50" strokeWidth={1.5} />
                <p>No recent downtime alerts.</p>
                <p className="text-sm">Systems are running smoothly.</p>
              </div>
            ) : (
              recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-2xl border transition-all ${alert.acknowledged
                    ? 'bg-slate-800/50 border-slate-700/50 opacity-70'
                    : 'bg-slate-800 border-white/10 hover:border-slate-600 shadow-md'
                    }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${alert.severity?.toLowerCase() === 'critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' :
                        alert.severity?.toLowerCase() === 'high' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                        }`}>
                        {alert.severity || 'HIGH'}
                      </span>
                      {alert.acknowledged && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                          <CheckCircle2 size={12} /> ACKNOWLEDGED
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      {new Date(alert.start_at + (alert.start_at.endsWith('Z') ? '' : 'Z')).toLocaleString('id-ID', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </span>
                  </div>

                  <div className="flex gap-4">
                    <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${alert.acknowledged
                      ? 'bg-slate-700 text-slate-400'
                      : 'bg-gradient-to-br from-rose-500 to-orange-500 text-white'
                      }`}>
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {alert.machine_name || 'Unknown Machine'}
                        <span className="text-slate-500 font-normal text-sm ml-2">#{alert.machine_id?.split('-')[0]}</span>
                      </h3>
                      <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                        {alert.messages || 'No description provided.'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}