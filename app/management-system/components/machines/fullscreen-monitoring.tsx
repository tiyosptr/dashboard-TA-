'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import {
  Maximize2, Minimize2, X, ChevronLeft, ChevronRight,
  Play, Pause, Settings, Layers,
  Activity, AlertTriangle, Clock,
  Cpu, Wrench, PowerOff, Box, Search
} from 'lucide-react';
import { MachineData } from '@/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface FullscreenMonitoringProps {
  machines: MachineData[];
  onClose: () => void;
  initialLineId?: string | null;
}

interface LineGroup {
  lineId: string | null;
  lineName: string;
  machines: MachineData[];
}

// ─── Per-machine card yang membaca data dari SWR cache (shared dengan MachineCard) ───
function FullscreenMachineCard({
  machine,
  getStatusConfig,
  getStatusIcon,
  formatCycleTimeDisplay,
  formatDurationFromHours,
}: {
  machine: MachineData;
  getStatusConfig: (s: string) => any;
  getStatusIcon: (s: string) => any;
  formatCycleTimeDisplay: (v: number | null | undefined) => string;
  formatDurationFromHours: (h: string | null) => string;
}) {
  const todayWib = useMemo(() => {
    const now = new Date();
    const wib = new Date(now.getTime() + 7 * 3600000);
    return wib.toISOString().split('T')[0];
  }, []);

  // Gunakan key yang SAMA dengan MachineCard — data diambil dari SWR cache, tidak ada fetch baru
  const dashboardUrl = `/api/machines/${machine.id}/dashboard-machine?date=${todayWib}`;
  const { data: dashboardRes } = useSWR(dashboardUrl, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000, // Shared cache dengan MachineCard
  });

  const dashData = dashboardRes?.success ? dashboardRes.data : null;
  const outputData = dashData?.output ?? null;
  const defectData = dashData?.defectRate ?? null;
  const throughputData = dashData?.throughput ?? null;
  const cycleTimeData = dashData?.cycleTime ?? null;

  const displayPass = outputData?.totalPass ?? (machine.real_pass ?? 0);
  const displayReject = outputData?.totalReject ?? (machine.real_reject ?? 0);
  const displayTotal = outputData?.totalProduced ?? (displayPass + displayReject);
  const displayDefectRate = defectData?.defectRate ?? (machine.real_defect_rate ? machine.real_defect_rate * 100 : 0);
  const displayThroughput = throughputData?.troughput != null
    ? Number(throughputData.troughput)
    : (machine.real_throughput ?? 0);
  const displayCycleTime = cycleTimeData?.actual_cycle_time ?? machine.real_cycle_time ?? 0;

  const config = getStatusConfig(machine.status || '');
  const StatusIcon = getStatusIcon(machine.status || '');

  return (
    <div className={`relative bg-slate-900/80 backdrop-blur-sm rounded-2xl border ${config.border} shadow-lg overflow-hidden group hover:scale-[1.01] transition-transform duration-200`}>
      {/* Top accent bar */}
      <div className={`h-[3px] w-full bg-gradient-to-r ${config.gradient}`} />

      <div className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${config.dot} animate-pulse flex-shrink-0`} />
              <h3 className="font-bold text-sm text-white truncate">{machine.name_machine || 'Unknown'}</h3>
            </div>
            {machine.process_name && (
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">{machine.process_name}</p>
            )}
          </div>
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg ${config.bg} ${config.color} flex-shrink-0 ml-2`}>
            <StatusIcon size={10} />
            <span className="text-[9px] font-bold uppercase tracking-wider">{config.label}</span>
          </div>
        </div>

        {/* Key metrics: Output big number */}
        <div className="bg-slate-800/60 rounded-xl p-2.5 mb-2">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Total Output</p>
          <p className="text-2xl font-black text-white leading-none">{displayTotal.toLocaleString('id-ID')}
            <span className="text-xs font-normal text-slate-500 ml-1">pcs</span>
          </p>
          <div className="flex gap-3 mt-1.5">
            <span className="text-xs text-emerald-400 font-semibold">✓ {displayPass.toLocaleString('id-ID')} pass</span>
            <span className="text-xs text-rose-400 font-semibold">✗ {displayReject.toLocaleString('id-ID')} reject</span>
          </div>
        </div>

        {/* Metrics 3-col */}
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <div className="bg-slate-800/40 rounded-lg p-1.5 text-center">
            <p className="text-[9px] text-slate-500 uppercase">Throughput</p>
            <p className="text-sm font-bold text-purple-400">{Number(displayThroughput).toFixed(0)}</p>
            <p className="text-[9px] text-slate-600">u/jam</p>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-1.5 text-center">
            <p className="text-[9px] text-slate-500 uppercase">Cycle Time</p>
            <p className="text-sm font-bold text-teal-400">{formatCycleTimeDisplay(displayCycleTime)}</p>
            <p className="text-[9px] text-slate-600">per unit</p>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-1.5 text-center">
            <p className="text-[9px] text-slate-500 uppercase">Defect</p>
            <p className={`text-sm font-bold ${Number(displayDefectRate) > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {Number(displayDefectRate).toFixed(1)}%
            </p>
            <p className="text-[9px] text-slate-600">rate</p>
          </div>
        </div>

        {/* Running hours footer */}
        {machine.total_running_hours && (
          <div className="flex items-center justify-between pt-1.5 border-t border-slate-800">
            <span className="text-[10px] text-slate-600 flex items-center gap-1"><Clock size={9} />Runtime</span>
            <span className="text-[10px] text-slate-400 font-semibold">{formatDurationFromHours(machine.total_running_hours)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FullscreenMonitoring({
  machines,
  onClose,
  initialLineId = null
}: FullscreenMonitoringProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [rotationInterval, setRotationInterval] = useState(15); // seconds
  const [showSettings, setShowSettings] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [wsConnected, setWsConnected] = useState(false);

  // ── 1 koneksi WebSocket untuk realtime update semua card ──────────
  useEffect(() => {
    let socket: WebSocket;
    let retryTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      socket = new WebSocket('ws://localhost:3001');

      socket.onopen = () => {
        setWsConnected(true);
        console.log('[FullscreenMonitoring] WS connected');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (
            data.type === 'DASHBOARD_UPDATE' ||
            data.type === 'MACHINE_STATUS_UPDATE' ||
            ['CYCLE_TIME_UPDATE', 'THROUGHPUT_UPDATE', 'OUTPUT_UPDATE', 'DEFECT_RATE_UPDATE'].includes(data.type)
          ) {
            // Satu mutate untuk refresh semua SWR key dashboard-machine sekaligus
            mutate(
              (key: any) =>
                typeof key === 'string' &&
                key.includes('/api/machines/') &&
                key.includes('/dashboard-machine'),
              undefined,
              { revalidate: true }
            );
          }
        } catch { }
      };

      socket.onclose = () => {
        setWsConnected(false);
        console.log('[FullscreenMonitoring] WS disconnected, retrying in 3s...');
        retryTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    return () => {
      clearTimeout(retryTimeout);
      socket?.close();
    };
  }, []);

  // ── Memoize agar referensi stabil → fix bug auto-rotate ──────────
  const sortedLineGroups = useMemo(() => {
    const groups: LineGroup[] = [];
    machines.forEach(machine => {
      const lineId = machine.line_id || '__unassigned__';
      const lineName = machine.line_name || 'Unassigned';
      const existing = groups.find(g => g.lineId === (lineId === '__unassigned__' ? null : lineId));
      if (existing) {
        existing.machines.push(machine);
      } else {
        groups.push({ lineId: lineId === '__unassigned__' ? null : lineId, lineName, machines: [machine] });
      }
    });
    return groups.sort((a, b) => {
      if (a.lineName === 'Unassigned') return 1;
      if (b.lineName === 'Unassigned') return -1;
      return a.lineName.localeCompare(b.lineName);
    });
  }, [machines]);

  const totalLines = sortedLineGroups.length;

  // Set initial line index — hanya sekali saat mount
  useEffect(() => {
    if (initialLineId && totalLines > 0) {
      const idx = sortedLineGroups.findIndex(g => g.lineId === initialLineId);
      if (idx !== -1) setCurrentLineIndex(idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-rotation dengan countdown progress ────────────────────
  const [countdown, setCountdown] = useState(rotationInterval);

  useEffect(() => {
    if (!isAutoRotating || totalLines <= 1) {
      setCountdown(rotationInterval);
      return;
    }
    setCountdown(rotationInterval);
    const tick = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCurrentLineIndex(i => (i + 1) % totalLines);
          return rotationInterval;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [isAutoRotating, rotationInterval, totalLines]);

  // Enter/exit fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      } else if ((containerRef.current as any).msRequestFullscreen) {
        (containerRef.current as any).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  }, [isFullscreen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
        onClose();
      }
      
      // Navigate with arrow keys
      if (e.key === 'ArrowLeft') {
        setCurrentLineIndex(prev => (prev - 1 + sortedLineGroups.length) % sortedLineGroups.length);
      } else if (e.key === 'ArrowRight') {
        setCurrentLineIndex(prev => (prev + 1) % sortedLineGroups.length);
      }
      
      // Toggle auto rotation with Space
      if (e.key === ' ') {
        e.preventDefault();
        setIsAutoRotating(prev => !prev);
      }
      
      // Toggle fullscreen with F11
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sortedLineGroups.length, toggleFullscreen, onClose]);

  const currentLine = sortedLineGroups[currentLineIndex];
  const filteredMachines = currentLine?.machines.filter(machine => {
    if (filterStatus !== 'all' && machine.status?.toLowerCase() !== filterStatus.toLowerCase()) {
      return false;
    }
    if (searchQuery && !machine.name_machine.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  }) || [];

  // Status configuration
  const getStatusConfig = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'active' || s === 'running') {
      return {
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200',
        gradient: 'from-green-400 to-emerald-500',
        dot: 'bg-green-500',
        label: 'ACTIVE'
      };
    } else if (s === 'maintenance') {
      return {
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        gradient: 'from-yellow-400 to-amber-500',
        dot: 'bg-yellow-500',
        label: 'MAINT'
      };
    } else if (s === 'on hold' || s === 'on-hold' || s === 'onhold' || s === 'hold') {
      return {
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        gradient: 'from-orange-400 to-red-500',
        dot: 'bg-orange-500',
        label: 'HOLD'
      };
    } else if (s === 'downtime' || s === 'down' || s === 'error') {
      return {
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        gradient: 'from-red-400 to-rose-500',
        dot: 'bg-red-500',
        label: 'DOWN'
      };
    } else if (s === 'inactive' || s === 'offline' || s === 'stopped') {
      return {
        color: 'text-gray-600',
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        gradient: 'from-gray-400 to-slate-500',
        dot: 'bg-gray-500',
        label: 'OFFLINE'
      };
    }
    return {
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      gradient: 'from-blue-400 to-indigo-500',
      dot: 'bg-blue-500',
      label: 'UNKNOWN'
    };
  };

  const getStatusIcon = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'active' || s === 'running') return Activity;
    if (s === 'maintenance') return Wrench;
    if (s === 'on hold' || s === 'on-hold' || s === 'onhold' || s === 'hold') return Clock;
    if (s === 'downtime' || s === 'down' || s === 'error') return AlertTriangle;
    if (s === 'inactive' || s === 'offline' || s === 'stopped') return PowerOff;
    return Activity;
  };

  const formatCycleTimeDisplay = (val: number | null | undefined): string => {
    if (!val || val <= 0) return '0 sec';
    if (val < 60) {
      return `${val.toFixed(1)} sec`;
    }
    if (val < 3600) {
      return `${(val / 60).toFixed(1)} min`;
    }
    return `${(val / 3600).toFixed(1)} hour`;
  };

  const formatDurationFromHours = (hoursStr: string | null): string => {
    if (!hoursStr) return '0s';
    const hours = parseFloat(hoursStr);
    if (isNaN(hours) || hours <= 0) return '0s';

    const totalSeconds = Math.round(hours * 3600);
    if (totalSeconds < 60) {
      return `${totalSeconds}s`;
    }
    if (totalSeconds < 3600) {
      const min = Math.floor(totalSeconds / 60);
      const sec = totalSeconds % 60;
      return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
    }
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  if (sortedLineGroups.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
        <div className="bg-slate-900 rounded-2xl p-8 max-w-md">
          <div className="text-center">
            <Cpu className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Machines Found</h2>
            <p className="text-slate-400 mb-6">There are no machines available for monitoring.</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 ${isFullscreen ? 'bg-slate-950' : 'bg-black/90'} transition-colors duration-300`}
    >
      {/* Control Bar */}
      <div className="absolute top-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              >
                <X size={16} />
                <span className="font-medium">Exit</span>
              </button>

              <div className="h-6 w-px bg-slate-700"></div>

              <div className="flex items-center gap-2">
                <Layers className="text-indigo-400" size={18} />
                <h1 className="text-lg font-bold text-white">Fullscreen Monitoring</h1>
                <span className="text-sm text-slate-400 ml-2">
                  Line: <span className="font-semibold text-white">{currentLine?.lineName}</span>
                </span>
                {/* Realtime WS indicator */}
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  wsConnected
                    ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700'
                    : 'bg-red-900/40 text-red-400 border border-red-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  {wsConnected ? 'Realtime' : 'Reconnecting...'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Line Navigation */}
              <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-2 py-1">
                <button
                  onClick={() => setCurrentLineIndex(prev => (prev - 1 + sortedLineGroups.length) % sortedLineGroups.length)}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                
                <div className="flex items-center gap-1">
                  {sortedLineGroups.map((group, index) => (
                    <button
                      key={group.lineId || 'unassigned'}
                      onClick={() => setCurrentLineIndex(index)}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${index === currentLineIndex
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                    >
                      {group.lineName}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentLineIndex(prev => (prev + 1) % sortedLineGroups.length)}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Auto Rotation Control */}
              <button
                onClick={() => {
                  setIsAutoRotating(v => !v);
                  setCountdown(rotationInterval);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  isAutoRotating
                    ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {isAutoRotating ? <Pause size={14} /> : <Play size={14} />}
                <span className="text-sm font-medium">
                  {isAutoRotating ? `Auto ${countdown}s` : 'Auto: OFF'}
                </span>
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-900/30 hover:bg-indigo-800 text-indigo-300 border border-indigo-800 rounded-lg transition-colors"
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                <span className="text-sm font-medium">
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </span>
              </button>

              {/* Settings */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="mt-3 bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Rotation Interval (seconds)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRotationInterval(prev => Math.max(5, prev - 5))}
                      className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={rotationInterval}
                      onChange={(e) => setRotationInterval(Math.max(5, Math.min(60, parseInt(e.target.value) || 15)))}
                      className="w-20 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-white text-center"
                    />
                    <button
                      onClick={() => setRotationInterval(prev => Math.min(60, prev + 5))}
                      className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Filter by Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="onhold">On Hold</option>
                    <option value="downtime">Downtime</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Search Machines
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="text"
                      placeholder="Search machine name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Auto-rotate countdown bar */}
      {isAutoRotating && totalLines > 1 && (
        <div className="absolute top-[52px] left-0 right-0 h-0.5 bg-slate-800 z-10">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-none"
            style={{ width: `${((rotationInterval - countdown) / rotationInterval) * 100}%` }}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="pt-16 pb-14 h-full overflow-auto">
        <div className="max-w-screen-2xl mx-auto px-6 py-5">
          {/* Line Header */}
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                <Box size={18} className="text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  {currentLine?.lineName}
                  <span className="ml-2 text-slate-500 font-normal text-base">Production Line</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {filteredMachines.length} machines displayed
                  {isAutoRotating && totalLines > 1 && (
                    <span className="ml-2 text-indigo-400 font-semibold">• next line in {countdown}s</span>
                  )}
                </p>
              </div>
            </div>
            {/* Line status summary chips */}
            <div className="flex items-center gap-2">
              {['active','maintenance','onhold','downtime','inactive'].map(st => {
                const count = currentLine?.machines.filter(m => {
                  const s = m.status?.toLowerCase() || '';
                  if (st === 'active') return s === 'active' || s === 'running';
                  if (st === 'onhold') return ['on hold','on-hold','onhold','hold'].includes(s);
                  if (st === 'downtime') return ['downtime','down','error'].includes(s);
                  if (st === 'inactive') return ['inactive','offline','stopped'].includes(s);
                  return s === st;
                }).length || 0;
                if (count === 0) return null;
                const colors: Record<string,string> = {
                  active: 'bg-emerald-900/40 text-emerald-400 border-emerald-700',
                  maintenance: 'bg-blue-900/40 text-blue-400 border-blue-700',
                  onhold: 'bg-amber-900/40 text-amber-400 border-amber-700',
                  downtime: 'bg-red-900/40 text-red-400 border-red-700',
                  inactive: 'bg-slate-800 text-slate-400 border-slate-700',
                };
                const labels: Record<string,string> = { active:'Active', maintenance:'Maint', onhold:'Hold', downtime:'Down', inactive:'Offline' };
                return (
                  <span key={st} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${colors[st]}`}>
                    {count} {labels[st]}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Machines Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {filteredMachines.map((machine) => (
              <FullscreenMachineCard
                key={machine.id}
                machine={machine}
                getStatusConfig={getStatusConfig}
                getStatusIcon={getStatusIcon}
                formatCycleTimeDisplay={formatCycleTimeDisplay}
                formatDurationFromHours={formatDurationFromHours}
              />
            ))}
          </div>

          {/* Empty State */}
          {filteredMachines.length === 0 && (
            <div className="text-center py-12">
              <Cpu className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-300 mb-2">No Machines Found</h3>
              <p className="text-slate-500 mb-6">
                {searchQuery 
                  ? `No machines match "${searchQuery}"`
                  : `No machines with status "${filterStatus}"`}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Footer Stats */}
          <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total', val: filteredMachines.length, color: 'text-white', bg: 'bg-slate-800 border-slate-700' },
              { label: 'Active', val: filteredMachines.filter(m => { const s = m.status?.toLowerCase()||''; return s==='active'||s==='running'; }).length, color: 'text-emerald-400', bg: 'bg-emerald-900/30 border-emerald-800' },
              { label: 'Maintenance', val: filteredMachines.filter(m => m.status?.toLowerCase()==='maintenance').length, color: 'text-blue-400', bg: 'bg-blue-900/30 border-blue-800' },
              { label: 'On Hold', val: filteredMachines.filter(m => { const s=m.status?.toLowerCase()||''; return ['on hold','onhold','hold','on-hold'].includes(s); }).length, color: 'text-amber-400', bg: 'bg-amber-900/30 border-amber-800' },
              { label: 'Downtime', val: filteredMachines.filter(m => { const s=m.status?.toLowerCase()||''; return ['downtime','down','error'].includes(s); }).length, color: 'text-red-400', bg: 'bg-red-900/30 border-red-800' },
            ].map(s => (
              <div key={s.label} className={`rounded-xl p-3 border text-center ${s.bg}`}>
                <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
                <div className="text-xs text-slate-400 font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <div className="inline-flex items-center gap-4 bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-800">
          <span className="text-xs text-slate-400">
            <span className="font-medium text-slate-300">Keyboard Shortcuts:</span>
            <span className="ml-2">← → Navigate</span>
            <span className="ml-2">Space Pause/Play</span>
            <span className="ml-2">F11 Fullscreen</span>
            <span className="ml-2">Esc Exit</span>
          </span>
        </div>
      </div>
    </div>
  );
}