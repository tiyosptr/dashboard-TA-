'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useSWR, { preload, mutate } from 'swr';
import {
  Search, Activity, AlertTriangle, CheckCircle, Wrench,
  TrendingUp, TrendingDown, Zap, RefreshCw, Filter,
  ChevronRight, Settings, X, ArrowUpRight, ArrowDownRight,
  BarChart3, Clock, Gauge, Shield, Box, Cpu, CalendarDays,
  Play, PauseCircle, PowerOff, Plus, Layers
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { AddMachineModal } from './add-machine-modal';
import FullscreenMonitoring from './fullscreen-monitoring';
import { MachineData } from '@/types';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

// ─── Types ───────────────────────────────────────────────────────────
interface LineOption {
  id: string;
  name: string;
}

// Simulated metrics - in production these would come from real sensor data
const fetcher = (url: string) => fetch(url).then((res) => res.json());

function generateMetrics(machine: MachineData) {
  return {
    oee: 0,
    targetOutput: 0,
    quality: 0,
    output: machine.real_pass ?? 0,
    reject: machine.real_reject ?? 0,
    throughput: machine.real_throughput ?? 0,
    cycleTime: machine.real_cycle_time ?? 0,
  };
}

function formatDurationFromHours(hoursStr: string | null): string {
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
}

// ─── Format cycle time (seconds per item) for display ───────────────
function formatCycleTimeDisplay(val: number | null | undefined): string {
  if (!val || val <= 0) return '0 sec';
  if (val < 60) {
    return `${val.toFixed(1)} sec`;
  }
  if (val < 3600) {
    return `${(val / 60).toFixed(1)} min`;
  }
  return `${(val / 3600).toFixed(1)} hour`;
}

// ─── Status Helpers ──────────────────────────────────────────────────
// 5 Statuses:
// 1. ACTIVE     → Emerald  - Mesin sedang berjalan/beroperasi
// 2. MAINTENANCE → Blue    - Mesin sedang dalam perawatan terjadwal
// 3. ON HOLD    → Amber    - Mesin ditahan sementara, menunggu aksi
// 4. DOWNTIME   → Rose     - Mesin berhenti karena masalah/kerusakan
// 5. INACTIVE   → Slate    - Mesin tidak aktif/dimatikan
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any; dot: string; gradient: string }> = {
  active: {
    label: 'Active',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: Play,
    dot: 'bg-emerald-500',
    gradient: 'from-emerald-500 to-emerald-600',
  },
  maintenance: {
    label: 'Maintenance',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: Wrench,
    dot: 'bg-blue-500',
    gradient: 'from-blue-500 to-blue-600',
  },
  onhold: {
    label: 'On Hold',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: PauseCircle,
    dot: 'bg-amber-500',
    gradient: 'from-amber-500 to-amber-600',
  },
  downtime: {
    label: 'Downtime',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    icon: AlertTriangle,
    dot: 'bg-rose-500',
    gradient: 'from-rose-500 to-rose-600',
  },
  inactive: {
    label: 'Inactive',
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    icon: PowerOff,
    dot: 'bg-slate-400',
    gradient: 'from-slate-400 to-slate-500',
  },
};

function getStatusConfig(status: string) {
  const s = status?.toLowerCase() || '';
  if (s === 'active' || s === 'running') return STATUS_CONFIG['active'];
  if (s === 'maintenance') return STATUS_CONFIG['maintenance'];
  if (s === 'on hold' || s === 'on-hold' || s === 'onhold' || s === 'hold') return STATUS_CONFIG['onhold'];
  if (s === 'downtime' || s === 'down' || s === 'error') return STATUS_CONFIG['downtime'];
  if (s === 'inactive' || s === 'offline' || s === 'stopped') return STATUS_CONFIG['inactive'];
  return STATUS_CONFIG['active'];
}

function MachineCard({ machine, onClick }: { machine: MachineData; onClick: (m: MachineData) => void }) {
  const config = getStatusConfig(machine.status);
  const metrics = useMemo(() => generateMetrics(machine), [machine]);
  const StatusIcon = config.icon;

  const oeeColor = metrics.oee >= 85 ? 'text-emerald-600' : metrics.oee >= 70 ? 'text-amber-600' : 'text-red-600';
  const oeeBarColor = metrics.oee >= 85 ? 'from-emerald-400 to-emerald-600' : metrics.oee >= 70 ? 'from-amber-400 to-amber-600' : 'from-red-400 to-red-600';

  const todayWib = useMemo(() => {
    const now = new Date();
    const wib = new Date(now.getTime() + 7 * 3600000);
    return wib.toISOString().split('T')[0];
  }, []);

  const outParams = new URLSearchParams({ machineId: machine.id, date: todayWib });
  const outputQueryUrl = `/api/machines/output?${outParams.toString()}`;
  const { data: outputRes } = useSWR(outputQueryUrl, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });
  const outputApiData = outputRes?.data;

  const defectParams = new URLSearchParams({ machineId: machine.id, date: todayWib });
  const defectQueryUrl = `/api/machines/defect-rate?${defectParams.toString()}`;
  const { data: defectRes } = useSWR(defectQueryUrl, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });
  const defectApiData = defectRes?.data;
  const displayPass = defectApiData?.totalPass ?? metrics.output;
  const displayReject = defectApiData?.totalReject ?? metrics.reject;
  const displayTotal = displayPass + displayReject; // Calculated directly from data_items (Pass + Reject)
  const displayDefectRate = defectApiData?.defectRate ?? 0;

  return (
    <div
      onClick={() => onClick({
        ...machine,
        real_output: displayTotal,
        real_pass: displayPass,
        real_reject: displayReject,
        real_defect_rate: displayDefectRate
      })}
      onMouseEnter={() => {
        const todayWib = (() => {
          const now = new Date();
          const wib = new Date(now.getTime() + 7 * 3600000);
          return wib.toISOString().split('T')[0];
        })();
        // Preload unified dashboard endpoint
        preload(`/api/machines/${machine.id}/dashboard-machine?date=${todayWib}`, fetcher);
      }}
      className={`group relative bg-white rounded-2xl border ${config.border} shadow-sm hover:shadow-xl 
                transition-all duration-300 cursor-pointer hover:-translate-y-1 overflow-hidden`}
    >
      {/* Top accent bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${config.gradient}`} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-sm text-slate-900 truncate">{machine.name_machine || 'Unknown Machine'}</h3>
              <div className={`w-2 h-2 rounded-full ${config.dot} animate-pulse shadow-sm`} />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              {machine.line_name && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded font-medium">
                  <Box size={10} />
                  {machine.line_name}
                </span>
              )}
              {machine.process_name && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded font-medium">
                  <Settings size={10} />
                  {machine.process_name}
                </span>
              )}
              {machine.last_maintenance && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 rounded font-medium">
                  <Clock size={10} />
                  Last: {new Date(machine.last_maintenance).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                </span>
              )}
              {machine.next_maintenance && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-teal-50 text-teal-600 border border-teal-200 rounded font-medium">
                  <Activity size={10} />
                  Next: {new Date(machine.next_maintenance).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                </span>
              )}
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${config.bg} ${config.color}`}>
            <StatusIcon size={12} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{config.label}</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <MetricCell label="Output" value={displayTotal.toLocaleString('id-ID')} unit="pcs" color="text-blue-600" />
          <MetricCell
            label="Throughput"
            value={machine.real_throughput !== undefined && machine.real_throughput !== null
              ? (machine.real_throughput < 1 ? (machine.real_throughput * 60).toFixed(1) : machine.real_throughput.toFixed(1))
              : metrics.throughput.toString()}
            unit={machine.real_throughput !== undefined && machine.real_throughput !== null
              ? (machine.real_throughput < 1 ? "/min" : "/s")
              : "/hr"}
            color="text-purple-600"
          />
          <MetricCell
            label="Cycle Time"
            value={machine.real_cycle_time !== undefined && machine.real_cycle_time !== null
              ? formatCycleTimeDisplay(machine.real_cycle_time)
              : formatCycleTimeDisplay(metrics.cycleTime)}
            unit=""
            color="text-teal-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <MetricCell label="Reject" value={displayReject.toLocaleString('id-ID')} unit="pcs" color="text-rose-600" />
          <MetricCell label="Defect Rate" value={`${displayDefectRate}%`} unit="" color="text-rose-600" />
        </div>



        {/* Footer */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1" title="Runtime">
              <Clock size={10} className="text-slate-400" />
              {formatDurationFromHours(machine.total_running_hours)}
            </span>
            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1" title="Downtime">
              <AlertTriangle size={10} className="text-rose-400" />
              {formatDurationFromHours(machine.total_downtime_hours)}
            </span>
          </div>
          <span className="text-[10px] text-indigo-500 font-semibold flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
            View detail
            <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </div>
  );
}

function MetricCell({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2 text-center">
      <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${color}`}>
        {value}<span className="text-[9px] font-normal text-slate-400 ml-0.5">{unit}</span>
      </p>
    </div>
  );
}

// ─── Machine Detail Modal ────────────────────────────────────────────
function MachineDetailModal({
  machine,
  onClose,
  onStatusChange
}: {
  machine: MachineData;
  onClose: () => void;
  onStatusChange?: () => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // ── Date & Shift selection ───────────────────────────────────────
  const todayWib = (() => {
    const now = new Date();
    const wib = new Date(now.getTime() + 7 * 3600000);
    return wib.toISOString().split('T')[0];
  })();
  const [selectedDate, setSelectedDate] = useState(todayWib);
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');

  // ── SWR Data Fetching (UNIFIED SINGLE ENDPOINT) ──────────────
  const dashboardParams = new URLSearchParams({ date: selectedDate });
  if (selectedShiftId) dashboardParams.set('shiftId', selectedShiftId);
  const dashboardUrl = `/api/machines/${machine.id}/dashboard-machine?${dashboardParams.toString()}`;

  const { data: dashboardRes, isLoading: dashboardLoading } = useSWR(
    dashboardUrl,
    fetcher,
    { keepPreviousData: true, revalidateOnFocus: false }
  );

  const dashData = dashboardRes?.success ? dashboardRes.data : null;
  const outputApiData = dashData?.output ?? null;
  const cycleTimeApiData = dashData?.cycleTime ? {
    total_output: dashData.cycleTime.total_output ?? 0,
    actual_cycle_time: dashData.cycleTime.actual_cycle_time,
  } : null;
  const throughputApiData = dashData?.throughput ?? null;
  const defectApiData = dashData?.defectRate ?? null;
  const ctHistoryRes = { data: dashData?.cycleTimeHistory ?? [] };

  // Backward-compatible loading flags
  const outputLoading = dashboardLoading;
  const cycleTimeLoading = dashboardLoading;
  const tpLoading = dashboardLoading;

  useEffect(() => {
    if (!selectedShiftId && dashData?.shift) {
      setSelectedShiftId(dashData.shift.id);
    }
  }, [dashData?.shift, selectedShiftId]);

  const handleStatusChange = async (newStatus: string) => {
    if (machine.status === newStatus || isUpdating) return;

    setIsUpdating(true);
    setShowStatusMenu(false);
    try {
      const res = await fetch('/api/machines/status-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_id: machine.id, new_status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        if (onStatusChange) onStatusChange();
      } else {
        alert(data.error || 'Gagal mengubah status mesin');
      }
    } catch (err) {
      console.error('Error changing status:', err);
      alert('Terjadi kesalahan jaringan saat mengubah status.');
    } finally {
      setIsUpdating(false);
    }
  };

  // ── Real-time Subscription (Custom WebSocket Server) ────────
  useEffect(() => {
    if (!machine.id) return;

    const socket = new WebSocket('ws://localhost:3001');

    socket.onopen = () => {
      console.log(`[ws] Connected to server | Machine: ${machine.id}`);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.machine_id && data.machine_id !== machine.id) return;

        // Single mutation for the unified endpoint and global grid hooks
        if (['CYCLE_TIME_UPDATE', 'THROUGHPUT_UPDATE', 'OUTPUT_UPDATE', 'DEFECT_RATE_UPDATE'].includes(data.type)) {
          mutate(dashboardUrl);
          // Sync background grid cards
          mutate(`/api/machines/output?machineId=${machine.id}&date=${todayWib}`);
          mutate(`/api/machines/defect-rate?machineId=${machine.id}&date=${todayWib}`);
        }
      } catch (err) {
        console.error('[ws] Parse error:', err);
      }
    };

    socket.onclose = () => {
      console.log('[ws] Disconnected from server');
    };

    return () => {
      socket.close();
    };
  }, [machine.id, dashboardUrl]);

  const config = getStatusConfig(machine.status);
  const metrics = useMemo(() => generateMetrics(machine), [machine]);
  const StatusIcon = config.icon;

  // ── Derived output values ────────────────────────────────────────
  const hasRealData = (outputApiData !== null);
  const displayPass = hasRealData ? (outputApiData?.totalPass ?? 0) : metrics.output;
  const displayReject = hasRealData ? (outputApiData?.totalReject ?? 0) : metrics.reject;
  const displayTotal = hasRealData ? (outputApiData?.totalProduced ?? 0) : (metrics.output + metrics.reject);
  const displayTarget = hasRealData ? (outputApiData?.targetOutput ?? metrics.targetOutput) : metrics.targetOutput;
  const activeShiftInfo = dashData?.shift ?? null;
  const allShifts = dashData?.allShifts ?? [];

  const defectRateValue = defectApiData?.defectRate ?? 0;

  // ── Derived throughput values ───────────────────────────────────
  const hasRealThroughput = (throughputApiData !== null);
  const displayThroughput = hasRealThroughput
    ? Number(throughputApiData.troughput)
    : (machine.real_throughput ?? null);

  // ── Derived cycle time values ───────────────────────────────────
  const hasRealCycleTime = (cycleTimeApiData !== null);
  const displayCycleTime = hasRealCycleTime && cycleTimeApiData?.actual_cycle_time !== null
    ? cycleTimeApiData.actual_cycle_time
    : metrics.cycleTime;
  const displayCycleTimeOutput = hasRealCycleTime
    ? cycleTimeApiData?.total_output ?? 0
    : 0;

  // Format cycle time value for display (items per second)
  const formatCTValue = (val: number) => {
    if (!val || val <= 0) return '0 sec';
    if (val < 60) return `${val.toFixed(1)} sec`;
    if (val < 3600) return `${(val / 60).toFixed(1)} min`;
    return `${(val / 3600).toFixed(1)} hour`;
  };

  // Help format cycle time chart Y-axis labels for duration
  const formatDurationTicks = (val: number) => {
    if (val === 0) return '0';
    if (val < 60) return `${val}s`;
    if (val < 3600) return `${(val / 60).toFixed(1)}m`;
    return `${(val / 3600).toFixed(1)}h`;
  };

  // Help format throughput values dynamically
  const formatThroughputValue = (val: number) => {
    if (!val || val <= 0) return '0';
    if (val < 1) {
      // Jika sangat lambat per jam, coba per menit
      const perMin = val * 60;
      if (perMin < 1) return `${(perMin * 60).toFixed(2)}/hr`; // Fallback to hour if still tiny
      return `${perMin.toFixed(1)}/min`;
    }
    if (val >= 3600) {
      return `${(val / 3600).toFixed(1)}/s`;
    }
    if (val >= 60) {
      return `${(val / 60).toFixed(1)}/min`;
    }
    return `${val.toFixed(0)}/hr`;
  };

  // ── Hourly chart data from API with smart instant mathematical array fallbacks ──
  const resolveCurrentShiftArray = () => {
    const wibHr = (new Date().getUTCHours() + 7) % 24;
    let fallback = [];
    if (wibHr >= 7 && wibHr < 15) { fallback = ['07', '08', '09', '10', '11', '12', '13', '14']; }
    else if (wibHr >= 15 && wibHr < 23) { fallback = ['15', '16', '17', '18', '19', '20', '21', '22']; }
    else { fallback = ['23', '00', '01', '02', '03', '04', '05', '06']; }
    return fallback;
  };

  const fallbackHours = resolveCurrentShiftArray();
  const hasHourlyData = outputApiData?.hourly && outputApiData.hourly.length > 0;

  const shiftHours = hasHourlyData
    ? outputApiData.hourly.map((h: any) => h.hour_slot.split('-')[0])
    : fallbackHours;

  const seedNum = machine.id.charCodeAt(0);

  const realOutputByHour = hasHourlyData
    ? outputApiData.hourly.map((h: any) => h.pass)
    : fallbackHours.map(() => 0);

  const realRejectByHour = hasHourlyData
    ? outputApiData.hourly.map((h: any) => h.reject)
    : fallbackHours.map(() => 0);

  // ── Real hourly data for charts ─────────────────────────────────

  // Throughput chart: using real hourly pass counts (units/hour)
  const throughputData = shiftHours.map((_: any, i: number) => {
    if (hasHourlyData) {
      const hourData = outputApiData.hourly[i];
      return hourData ? hourData.pass : 0;
    }
    return 0;
  });

  // Cycle time chart: mapping historical records to shift hours
  const shiftSlots = activeShiftInfo
    ? activeShiftInfo.start_time < activeShiftInfo.end_time
      ? Array.from({ length: parseInt(activeShiftInfo.end_time) - parseInt(activeShiftInfo.start_time) }, (_: any, i: number) => parseInt(activeShiftInfo.start_time) + i)
      : [...Array.from({ length: 24 - parseInt(activeShiftInfo.start_time) }, (_: any, i: number) => parseInt(activeShiftInfo.start_time) + i), ...Array.from({ length: parseInt(activeShiftInfo.end_time) }, (_: any, i: number) => i)]
    : Array.from({ length: 24 }, (_: any, i: number) => i);

  // Hourly cycle time data
  const cycleTimeLineData = shiftHours.map((_: any, i: number) => {
    if (ctHistoryRes?.data && ctHistoryRes.data.length > 0) {
      const slotHour = shiftSlots[i];
      const recordsInHour = ctHistoryRes.data.filter((r: any) => {
        const h = new Date(new Date(r.created_at).getTime() + 7 * 3600000).getUTCHours();
        return h === slotHour;
      });
      const v = recordsInHour.length > 0 ? (recordsInHour[0].actual_cycle_time || 0) : 0;
      return v > 0 ? +v.toFixed(1) : 0;
    }
    return 0;
  });

  // Quality & OEE charts
  const defectRateData = shiftHours.map((_: any, i: number) => {
    if (defectApiData?.hourly && defectApiData.hourly.length > 0) {
      const hourData = defectApiData.hourly[i];
      return hourData ? hourData.defect_rate : 0;
    }
    return 0;
  });

  const oeeData = shiftHours.map((_: any, i: number) => {
    return 0;
  });

  const chartTheme = {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    titleColor: '#fff',
    bodyColor: '#e2e8f0',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderWidth: 1,
    padding: 10,
    cornerRadius: 10,
    titleFont: { size: 11, weight: 'bold' as const },
    bodyFont: { size: 10 },
    displayColors: false,
  };

  const makeLineChart = (label: string, data: number[], color: string, fillColor: string) => ({
    data: {
      labels: shiftHours,
      datasets: [{
        label,
        data,
        borderColor: '#6366f1',
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(99, 102, 241, 0.08)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0.01)');
          return gradient;
        },
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#6366f1',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: chartTheme,
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            font: { size: 9 },
            color: '#94a3b8',
            maxRotation: 45,
            minRotation: 0,
            autoSkip: true,
            maxTicksLimit: 12
          }
        },
        y: {
          grid: { color: 'rgba(226, 232, 240, 0.5)' },
          border: { display: false },
          ticks: {
            font: { size: 9 },
            color: '#94a3b8',
            callback: function (value: any) {
              // Only apply duration formatting for Cycle Time chart
              // We'll pass a flag or handle it in the specific usage
              return value;
            }
          }
        },
      },
    },
  });

  const makeBarChart = (label: string, data: number[], color: string) => ({
    data: {
      labels: shiftHours,
      datasets: [{
        label,
        data,
        backgroundColor: color,
        borderRadius: 6,
        borderSkipped: false,
        hoverBackgroundColor: color.replace('0.7', '1').replace('0.8', '1'),
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: chartTheme,
      },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 9 }, color: '#94a3b8' } },
        y: { grid: { color: 'rgba(226,232,240,0.5)' }, border: { display: false }, ticks: { font: { size: 9 }, color: '#94a3b8' } },
      },
    },
  });

  // ── Stacked bar chart: Pass + Reject per hour (REAL DATA) ────────
  const realOutputChartData = {
    labels: shiftHours,
    datasets: [
      {
        label: 'Pass',
        data: realOutputByHour,
        backgroundColor: 'rgba(99, 102, 241, 0.85)',
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Reject',
        data: realRejectByHour,
        backgroundColor: 'rgba(244, 63, 94, 0.75)',
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const realOutputChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom' as const, labels: { font: { size: 9 }, padding: 8, usePointStyle: true } },
      tooltip: {
        ...chartTheme,
        callbacks: {
          afterBody: (items: any[]) => {
            const idx = items[0]?.dataIndex;
            if (idx !== undefined) {
              const total = (realOutputByHour[idx] || 0) + (realRejectByHour[idx] || 0);
              return [`Total: ${total} pcs`];
            }
            return [];
          },
        },
      },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { font: { size: 9 }, color: '#94a3b8' } },
      y: { stacked: true, grid: { color: 'rgba(226,232,240,0.5)' }, border: { display: false }, ticks: { font: { size: 9 }, color: '#94a3b8' } },
    },
  };

  const throughputChart = makeLineChart('Throughput', throughputData, '#8b5cf6', 'rgba(139, 92, 246, 0.1)');
  const cycleTimeChart = makeLineChart('Cycle Time (s)', cycleTimeLineData, '#14b8a6', 'rgba(20, 184, 166, 0.1)');

  const defectChart = makeLineChart('Defect Rate (%)', defectRateData, '#f43f5e', 'rgba(244, 63, 94, 0.1)');
  const oeeChart = makeLineChart('OEE', oeeData, '#f59e0b', 'rgba(245, 158, 11, 0.1)');


  const oeeColor = metrics.oee >= 85 ? 'text-emerald-600' : metrics.oee >= 70 ? 'text-amber-600' : 'text-red-600';

  // OEE Doughnut
  const doughnutData = {
    labels: ['OEE', 'Remaining'],
    datasets: [{
      data: [metrics.oee, 100 - metrics.oee],
      backgroundColor: [
        metrics.oee >= 85 ? '#10b981' : metrics.oee >= 70 ? '#f59e0b' : '#ef4444',
        'rgba(226, 232, 240, 0.3)',
      ],
      borderWidth: 0,
      cutout: '78%',
    }],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 bg-gradient-to-r ${config.gradient} px-6 py-4 rounded-t-2xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Cpu size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{machine.name_machine || 'Unknown Machine'}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {machine.line_name && (
                    <span className="text-xs text-white/80 bg-white/15 px-2 py-0.5 rounded-full">{machine.line_name}</span>
                  )}
                  {machine.process_name && (
                    <span className="text-xs text-white/80 bg-white/15 px-2 py-0.5 rounded-full">{machine.process_name}</span>
                  )}
                  {machine.last_maintenance && (
                    <span className="text-xs text-white/80 bg-white/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock size={10} />
                      Last Maint: {new Date(machine.last_maintenance).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {machine.next_maintenance && (
                    <span className="text-xs text-teal-100 bg-white/15 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                      <Activity size={10} />
                      Next Maint: {new Date(machine.next_maintenance).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  <span className="text-xs text-white/90 bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                    <StatusIcon size={10} />
                    {config.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 relative">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 text-[11px] font-bold shadow-sm backdrop-blur-sm ${showHistory
                    ? 'bg-white text-indigo-700'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                  }`}
              >
                <Clock size={14} />
                <span>{showHistory ? 'Close History' : 'See History Machine'}</span>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); setShowStatusMenu(!showStatusMenu); }}
                disabled={isUpdating}
                className="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-xl transition-colors flex items-center gap-2 text-white text-[11px] font-bold shadow-sm backdrop-blur-sm"
              >
                {isUpdating ? <RefreshCw size={14} className="animate-spin text-white" /> : <Settings size={14} className="text-white" />}
                <span>Ubah Status</span>
              </button>

              {showStatusMenu && (
                <div
                  className="absolute top-full right-8 mt-2 w-40 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden z-[100]"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="p-1.5 flex flex-col gap-0.5">
                    {[
                      { val: 'active', label: 'Active', icon: Play, color: 'text-emerald-700', bg: 'hover:bg-emerald-50' },
                      { val: 'maintenance', label: 'Maintenance', icon: Wrench, color: 'text-blue-700', bg: 'hover:bg-blue-50' },
                      { val: 'on hold', label: 'On Hold', icon: PauseCircle, color: 'text-amber-700', bg: 'hover:bg-amber-50' },
                      { val: 'downtime', label: 'Downtime', icon: AlertTriangle, color: 'text-rose-700', bg: 'hover:bg-rose-50' },
                      { val: 'inactive', label: 'Inactive', icon: PowerOff, color: 'text-slate-600', bg: 'hover:bg-slate-50' }
                    ].map(st => {
                      const isActive = machine.status?.toLowerCase() === st.val ||
                        (machine.status?.toLowerCase() === 'running' && st.val === 'active') ||
                        (machine.status?.toLowerCase() === 'onhold' && st.val === 'on hold') ||
                        (machine.status?.toLowerCase() === 'down' && st.val === 'downtime');

                      return (
                        <button
                          key={st.val}
                          onClick={() => handleStatusChange(st.val)}
                          disabled={isActive}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-bold rounded-lg transition-colors ${st.bg} ${st.color} ${isActive ? 'bg-slate-50 opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <st.icon size={13} className={isActive ? 'opacity-50' : ''} />
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button onClick={onClose} className="p-2 bg-white/15 hover:bg-white/25 rounded-xl transition-colors backdrop-blur-sm">
                <X size={18} className="text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Date & Shift Filter Bar ── */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <CalendarDays size={14} className="text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              max={todayWib}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all cursor-pointer"
            />
            {selectedDate !== todayWib && (
              <button
                onClick={() => setSelectedDate(todayWib)}
                className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors"
              >
                Hari ini
              </button>
            )}
          </div>

          {/* Shift Selector */}
          {allShifts.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">Shift:</span>
              {allShifts.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedShiftId(s.id)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${selectedShiftId === s.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                >
                  {s.name}
                  <span className={`ml-1 text-[9px] font-medium ${selectedShiftId === s.id ? 'text-indigo-200' : 'text-slate-400'
                    }`}>
                    {s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Active shift indicator */}
          {activeShiftInfo && (
            <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Clock size={10} />
              {activeShiftInfo.name} • {activeShiftInfo.start_time.slice(0, 5)}–{activeShiftInfo.end_time.slice(0, 5)}
            </span>
          )}

          {outputLoading && <RefreshCw size={13} className="animate-spin text-slate-400 ml-auto" />}
        </div>

        <div className="p-6 space-y-5">
          {/* Machine History Log View */}
          {showHistory && (
            <div className="bg-slate-50 rounded-2xl p-6 border-2 border-indigo-100 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                    <Clock size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">Machine History & Troubleshooting Log</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tindakan pemeliharaan dan perbaikan terakhir</p>
                  </div>
                </div>
              </div>

              {dashboardLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw size={24} className="animate-spin text-indigo-500" />
                </div>
              ) : dashData?.machineHistory && dashData.machineHistory.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dashData.machineHistory.map((h: any) => (
                    h.task && Array.isArray(h.task) && h.task.length > 0 && (
                      <div key={h.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-3 border-b border-slate-50 pb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-black text-indigo-600">{h.work_order_code}</p>
                              <span className="text-[10px] text-slate-400">•</span>
                              <div className="flex items-center gap-1 text-[10px] text-slate-600 font-bold">
                                <Shield size={10} className="text-slate-400" />
                                {h.technician?.name || h.resolved_by || 'Technician'}
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold">{new Date(h.event_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${h.event_type === 'downtime' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                            {h.event_type}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {h.task.map((t: any, i: number) => (
                            <div key={i} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                              <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                              <span className="text-[11px] font-bold text-slate-700 leading-tight">
                                {typeof t === 'string' ? t : t.description}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
                  <p className="text-sm text-slate-500 font-bold">Belum ada riwayat tindakan untuk mesin ini.</p>
                </div>
              )}

              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setShowHistory(false)}
                  className="px-6 py-2 bg-slate-800 text-white text-[11px] font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200"
                >
                  Selesai Melihat Riwayat
                </button>
              </div>
            </div>
          )}

          {/* Quick Stats Row — real data where available */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <QuickStat
              icon={<BarChart3 size={14} />}
              label="Pass"
              value={displayPass.toLocaleString('id-ID')}
              color="text-indigo-600"
            />
            <QuickStat
              icon={<AlertTriangle size={14} />}
              label="Reject"
              value={displayReject.toLocaleString('id-ID')}
              color="text-rose-600"
            />
            <QuickStat
              icon={<Zap size={14} />}
              label="Throughput"
              value={displayThroughput !== null
                ? (displayThroughput >= 1 ? `${displayThroughput.toFixed(1)}/s` : `${(displayThroughput * 60).toFixed(1)}/min`)
                : `${metrics.throughput}/hr`}
              color="text-purple-600"
            />
            <QuickStat
              icon={<Clock size={14} />}
              label="Cycle Time"
              value={formatCTValue(displayCycleTime)}
              color="text-teal-600"
            />
            <QuickStat icon={<Activity size={14} />} label="Runtime" value={formatDurationFromHours(machine.total_running_hours)} color="text-slate-600" />
            <QuickStat icon={<AlertTriangle size={14} />} label="Downtime" value={formatDurationFromHours(machine.total_downtime_hours)} color="text-rose-500" />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Output Chart — REAL DATA (stacked pass+reject with summary) */}
            <ChartCard
              title={`Output — Pass: ${displayPass.toLocaleString('id-ID')}  Reject: ${displayReject.toLocaleString('id-ID')}`}
              subtitle={hasRealData ? `Total: ${displayTotal.toLocaleString('id-ID')} / Target: ${displayTarget.toLocaleString('id-ID')}` : `Total: ${displayTotal.toLocaleString('id-ID')} / Target: ${displayTarget.toLocaleString('id-ID')}`}
              color="indigo"
            >
              <Bar data={realOutputChartData} options={realOutputChartOptions} />
            </ChartCard>

            <ChartCard title="Throughput" subtitle="Units per hour" color="purple">
              <Line
                data={throughputChart.data}
                options={{
                  ...throughputChart.options,
                  plugins: {
                    ...throughputChart.options.plugins,
                    tooltip: {
                      ...throughputChart.options.plugins.tooltip,
                      callbacks: {
                        label: (context: any) => `Throughput: ${context.parsed.y} units/hr`
                      }
                    }
                  }
                } as any}
              />
            </ChartCard>

            <ChartCard
              title={`Cycle Time — ${displayCycleTime !== null ? formatCTValue(displayCycleTime) : 'N/A'}`}
              subtitle={hasRealCycleTime
                ? `Total Item: ${displayCycleTimeOutput} pcs`
                : 'Mengalkulasi riwayat...'
              }
              color="teal"
            >
              <Line
                data={cycleTimeChart.data}
                options={{
                  ...cycleTimeChart.options,
                  scales: {
                    ...cycleTimeChart.options.scales,
                    y: {
                      ...cycleTimeChart.options.scales.y,
                      ticks: {
                        ...cycleTimeChart.options.scales.y.ticks,
                        callback: (value: any) => formatDurationTicks(value)
                      }
                    }
                  }
                } as any}
              />
            </ChartCard>

            <ChartCard
              title={dashboardLoading ? 'Defect/Reject Rate' : `Defect/Reject Rate — ${defectRateValue}%`}
              subtitle="Persentase defect per jam"
              color="rose"
            >
              <Line data={defectChart.data} options={defectChart.options as any} />
            </ChartCard>
          </div>
        </div>

      </div>
    </div>
  );
}

function QuickStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100 hover:border-slate-200 transition-colors">
      <div className={`flex items-center justify-center mb-1 ${color}`}>{icon}</div>
      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
      <p className={`text-base font-black ${color}`}>{value}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, color, children }: { title: string; subtitle: string; color: string; children: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    indigo: 'from-indigo-500 to-indigo-600',
    purple: 'from-purple-500 to-violet-600',
    teal: 'from-teal-500 to-teal-600',
    emerald: 'from-emerald-500 to-green-600',
    rose: 'from-rose-500 to-red-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="p-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-5 rounded-full bg-gradient-to-b ${colorMap[color] || colorMap.indigo}`} />
          <div>
            <h4 className="text-xs font-bold text-slate-800">{title}</h4>
            <p className="text-[9px] text-slate-400">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="p-3 h-40">
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export default function MachineManagement() {
  const router = useRouter();
  const [machines, setMachines] = useState<MachineData[]>([]);
  const [lines, setLines] = useState<LineOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLine, setFilterLine] = useState('all');
  const [hasRestoredLine, setHasRestoredLine] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<MachineData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [fullscreenLineId, setFullscreenLineId] = useState<string | null>(null);

  // Restore filterLine from localStorage on load
  useEffect(() => {
    try {
      const saved = localStorage.getItem('management_selected_line');
      if (saved) setFilterLine(saved);
    } catch { }
    setHasRestoredLine(true);
  }, []);

  // Save filterLine to localStorage on change
  useEffect(() => {
    if (hasRestoredLine) {
      try {
        localStorage.setItem('management_selected_line', filterLine);
      } catch { }
    }
  }, [filterLine, hasRestoredLine]);

  // Fetch machines
  const fetchMachines = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterLine !== 'all') params.set('lineId', filterLine);
      if (filterStatus !== 'all') params.set('status', filterStatus);

      const res = await fetch(`/api/machines/with-details?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setMachines(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching machines:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterLine, filterStatus]);

  // Fetch lines for filter
  const fetchLines = useCallback(async () => {
    try {
      const res = await fetch('/api/lines');
      const json = await res.json();
      if (json.success) {
        setLines(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching lines:', err);
    }
  }, []);

  useEffect(() => {
    fetchLines();
  }, [fetchLines]);

  useEffect(() => {
    // Tampilkan loading skeleton HANYA saat pertama kali fetch atau saat filter berubah awal
    setLoading(true);
    fetchMachines();

    // Auto-refresh data tiap 5 detik (Real-time polling)
    const interval = setInterval(() => {
      fetchMachines();
    }, 5000);

    // ── Global WebSocket List Listener ──
    const socket = new WebSocket('ws://localhost:3001');
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'MACHINE_STATUS_UPDATE') {
          console.log('[ws] Global Status Update Detected. Refreshing Machine List...');
          fetchMachines();
        }
        if (['CYCLE_TIME_UPDATE', 'THROUGHPUT_UPDATE', 'OUTPUT_UPDATE', 'DEFECT_RATE_UPDATE'].includes(data.type)) {
          // Mutate ALL machine data cards dynamically across the Grid 
          mutate(
            (key: any) => typeof key === 'string' && key.startsWith('/api/machines'),
            undefined,
            { revalidate: true }
          );
        }
      } catch (err) { }
    };

    return () => {
      clearInterval(interval);
      socket.close();
    };
  }, [fetchMachines]);

  // Listen for external machine data updates (e.g. from maintenance schedule form)
  useEffect(() => {
    const handler = () => fetchMachines();
    window.addEventListener('machine-data-updated', handler);
    return () => window.removeEventListener('machine-data-updated', handler);
  }, [fetchMachines]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMachines();
  };

  // Filter by search
  const filteredMachines = useMemo(() => {
    return machines.filter(m => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = !term ||
        (m.name_machine || '').toLowerCase().includes(term) ||
        (m.line_name || '').toLowerCase().includes(term) ||
        (m.process_name || '').toLowerCase().includes(term);
      return matchesSearch;
    });
  }, [machines, searchTerm]);

  // Group machines by line
  const groupedByLine = useMemo(() => {
    const groups: { lineName: string; lineId: string | null; machines: MachineData[] }[] = [];
    const lineMap = new Map<string, MachineData[]>();
    const lineOrder: string[] = [];

    filteredMachines.forEach(m => {
      const key = m.line_name || '__unassigned__';
      if (!lineMap.has(key)) {
        lineMap.set(key, []);
        lineOrder.push(key);
      }
      lineMap.get(key)!.push(m);
    });

    // Sort: named lines alphabetically, unassigned at end
    lineOrder.sort((a, b) => {
      if (a === '__unassigned__') return 1;
      if (b === '__unassigned__') return -1;
      return a.localeCompare(b);
    });

    lineOrder.forEach(key => {
      const machs = lineMap.get(key)!;
      // Sort machines within line by process_order
      machs.sort((a, b) => (a.process_order || 0) - (b.process_order || 0));
      groups.push({
        lineName: key === '__unassigned__' ? 'Unassigned' : key,
        lineId: machs[0]?.line_id || null,
        machines: machs,
      });
    });

    return groups;
  }, [filteredMachines]);

  // Status counts (5 statuses)
  const statusCounts = useMemo(() => {
    const counts = { active: 0, maintenance: 0, onhold: 0, downtime: 0, inactive: 0, total: 0 };
    machines.forEach(m => {
      const s = m.status?.toLowerCase() || '';
      if (s === 'active' || s === 'running') counts.active++;
      else if (s === 'maintenance') counts.maintenance++;
      else if (s === 'on hold' || s === 'on-hold' || s === 'onhold' || s === 'hold') counts.onhold++;
      else if (s === 'downtime' || s === 'down' || s === 'error') counts.downtime++;
      else if (s === 'inactive' || s === 'offline' || s === 'stopped') counts.inactive++;
      else counts.active++; // default
      counts.total++;
    });
    return counts;
  }, [machines]);

  return (
    <div className="space-y-6">
      {/* ── Page Header (matches admin style) ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Cpu className="text-indigo-600" />
            Machine Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time monitoring dan kontrol seluruh mesin produksi.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Fullscreen Monitoring Button */}
          <button
            onClick={() => {
              setFullscreenLineId(filterLine !== 'all' ? filterLine : null);
              setShowFullscreen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-[13px] font-bold transition-colors shadow-lg shadow-indigo-600/30"
          >
            <Layers size={14} />
            Fullscreen Monitoring
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[13px] font-bold transition-colors shadow-sm shadow-indigo-600/20"
          >
            <Plus size={14} />
            Tambah Mesin
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[13px] font-bold transition-colors"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* ── Status Cards (5 columns: total + 4 status) ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {/* Total Machine Card */}
          <button
            onClick={() => setFilterStatus('all')}
            className={`text-left rounded-2xl p-3.5 border transition-all ${filterStatus === 'all'
              ? 'bg-indigo-50 border-indigo-300 ring-2 ring-offset-1 ring-indigo-400'
              : 'bg-slate-50 border-slate-200 hover:border-indigo-300 hover:shadow-md'
              }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <Cpu size={14} className="text-white" />
              </div>
              {filterStatus === 'all' && (
                <span className="text-[9px] font-bold text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded">ALL</span>
              )}
            </div>
            <p className="text-2xl font-black text-slate-900">{statusCounts.total}</p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Mesin</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Semua mesin terdaftar</p>
          </button>

          {/* 5 Status filter cards */}
          {[
            { key: 'active', label: 'Active', count: statusCounts.active, desc: 'Sedang beroperasi', icon: Play, gradient: 'from-emerald-500 to-emerald-600' },
            { key: 'maintenance', label: 'Maintenance', count: statusCounts.maintenance, desc: 'Perawatan terjadwal', icon: Wrench, gradient: 'from-blue-500 to-blue-600' },
            { key: 'onhold', label: 'On Hold', count: statusCounts.onhold, desc: 'Ditahan sementara', icon: PauseCircle, gradient: 'from-amber-500 to-amber-600' },
            { key: 'downtime', label: 'Downtime', count: statusCounts.downtime, desc: 'Berhenti/kerusakan', icon: AlertTriangle, gradient: 'from-rose-500 to-rose-600' },
            { key: 'inactive', label: 'Inactive', count: statusCounts.inactive, desc: 'Tidak aktif', icon: PowerOff, gradient: 'from-slate-400 to-slate-500' },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setFilterStatus(filterStatus === s.key ? 'all' : s.key)}
              className={`text-left rounded-2xl p-3.5 border transition-all ${bgHoverEffect(s.key, filterStatus)} ${filterStatus === s.key ? 'ring-2 ring-offset-1 ring-indigo-400' : 'hover:shadow-md'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-1.5 rounded-lg bg-gradient-to-br ${s.gradient}`}>
                  <s.icon size={14} className="text-white" />
                </div>
                {filterStatus === s.key && (
                  <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">FILTER</span>
                )}
              </div>
              <p className="text-2xl font-black text-slate-900">{s.count}</p>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Filters (matches admin card style) ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <Search size={16} className="text-indigo-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Daftar Mesin</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {filteredMachines.length} dari {statusCounts.total} mesin ditampilkan
            </p>
          </div>
        </div>

        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200/60 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all min-w-[250px]">
            <Search size={14} className="text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Cari mesin, line, process..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent text-sm font-semibold text-slate-700 placeholder:text-slate-400 outline-none"
            />
          </div>

          <select
            value={filterLine}
            onChange={(e) => setFilterLine(e.target.value)}
            className="w-full sm:w-auto min-w-[160px] px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none text-slate-700 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%221.7%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_12px_center] bg-no-repeat pr-10 hover:border-indigo-300 transition-all cursor-pointer"
          >
            <option value="all">Semua Line</option>
            {lines.map(line => (
              <option key={line.id} value={line.id}>{line.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto min-w-[160px] px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none text-slate-700 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%221.7%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_12px_center] bg-no-repeat pr-10 hover:border-indigo-300 transition-all cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="onhold">On Hold</option>
            <option value="downtime">Downtime</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Machine Grid */}
      {/* Machine Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-32 w-full bg-white rounded-3xl shadow-sm border border-slate-100">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse">
                <Activity size={28} className="text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-[3px] border-white animate-bounce" />
            </div>
            <p className="text-slate-500 font-bold tracking-wide">Sinkronisasi Sensor Mesin...</p>
          </div>
        </div>
      ) : filterLine === 'all' ? (
        <div className="bg-white rounded-3xl border border-slate-200 py-20 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-6 shadow-inner border border-indigo-100">
            <Layers size={32} className="text-indigo-500 animate-pulse text-opacity-80" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">Pilih Area Produksi</h3>
          <p className="text-sm font-medium text-slate-500 mt-3 max-w-sm leading-relaxed">
            Data mesin terlalu luas. Harap pilih <strong>Line Produksi</strong> spesifik pada menu <em>dropdown</em> di atas untuk memantau performa dan rincian mesin secara mendetail.
          </p>
        </div>
      ) : filteredMachines.length > 0 ? (
        <div className="space-y-6">
          {groupedByLine.map((group) => {
            // Count per status in this line group
            const lineActive = group.machines.filter(m => { const st = m.status?.toLowerCase() || ''; return st === 'active' || st === 'running'; }).length;
            const lineMaint = group.machines.filter(m => m.status?.toLowerCase() === 'maintenance').length;
            const lineHold = group.machines.filter(m => { const st = m.status?.toLowerCase() || ''; return ['on hold', 'on-hold', 'onhold', 'hold'].includes(st); }).length;
            const lineDown = group.machines.filter(m => { const st = m.status?.toLowerCase() || ''; return ['downtime', 'down', 'error'].includes(st); }).length;
            const lineInactive = group.machines.filter(m => { const st = m.status?.toLowerCase() || ''; return ['inactive', 'offline', 'stopped'].includes(st); }).length;

            return (
              <div key={group.lineName} className="space-y-3">
                {/* Line Section Header */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2 rounded-xl shadow-md shadow-indigo-500/20">
                    <Box size={15} />
                    <span className="text-sm font-bold tracking-wide">{group.lineName}</span>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-indigo-200 via-slate-200 to-transparent" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">{group.machines.length} machine{group.machines.length !== 1 ? 's' : ''}</span>
                    <div className="flex items-center gap-1">
                      {lineActive > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold border border-emerald-200">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {lineActive}
                        </span>
                      )}
                      {lineMaint > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold border border-blue-200">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {lineMaint}
                        </span>
                      )}
                      {lineHold > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-bold border border-amber-200">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          {lineHold}
                        </span>
                      )}
                      {lineDown > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded text-[10px] font-bold border border-rose-200">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          {lineDown}
                        </span>
                      )}
                      {lineInactive > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded text-[10px] font-bold border border-slate-200">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          {lineInactive}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Machine Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.machines.map((machine) => (
                    <MachineCard
                      key={machine.id}
                      machine={machine}
                      onClick={(enhancedMachine) => setSelectedMachine(enhancedMachine)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-gradient-to-br from-slate-50 to-white rounded-2xl border-2 border-dashed border-slate-200">
          <Cpu className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500 text-base font-semibold">No machines found</p>
          <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedMachine && (
        <MachineDetailModal
          machine={selectedMachine}
          onClose={() => setSelectedMachine(null)}
          onStatusChange={() => {
            // Re-fetch to update the parent list
            handleRefresh();
          }}
        />
      )}

      {/* Add Machine Modal */}
      <AddMachineModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        lines={lines}
        onSuccess={() => {
          handleRefresh(); // Refresh data after adding
        }}
      />

      {/* Fullscreen Monitoring */}
      {showFullscreen && (
        <FullscreenMonitoring
          machines={machines}
          onClose={() => setShowFullscreen(false)}
          initialLineId={fullscreenLineId}
        />
      )}
    </div>
  );
}

function bgHoverEffect(key: string, current: string) {
  if (current === key) return 'border-indigo-300 bg-indigo-50/50';
  const map: Record<string, string> = {
    active: 'border-slate-200 hover:border-emerald-300',
    maintenance: 'border-slate-200 hover:border-blue-300',
    onhold: 'border-slate-200 hover:border-amber-300',
    downtime: 'border-slate-200 hover:border-rose-300',
    inactive: 'border-slate-200 hover:border-slate-300',
  };
  return map[key] || 'border-slate-200';
}