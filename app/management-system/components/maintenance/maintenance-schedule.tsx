'use client';

import { useState, useMemo, useEffect } from 'react';
import { Plus, Clock, AlertCircle, Play, Settings, Search, Filter, MapPin, PauseCircle, AlertTriangle, PowerOff, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import PreventiveMaintenanceForm from './preventive-maintenance-form';
import useSWR, { mutate as swrMutate } from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

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
    icon: Settings,
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

export default function MaintenanceSchedule() {
  const [showForm, setShowForm] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lineFilter, setLineFilter] = useState('all');
  const [collapsedLines, setCollapsedLines] = useState<Set<string>>(new Set());

  const { data: apiResponse, isLoading, isValidating, mutate } = useSWR('/api/maintenance/scheduled', fetcher, {
    refreshInterval: 10000,
    keepPreviousData: true,
  });

  const { data: linesRes } = useSWR('/api/lines', fetcher);
  const uniqueLines = useMemo(() => {
    return linesRes?.success ? linesRes.data.map((l: any) => ({ id: l.id, name: l.name })) : [];
  }, [linesRes]);

  // Listen for global data updates
  useEffect(() => {
    const handleUpdate = () => {
      console.log('[MaintenanceSchedule] Data update event received, refreshing...');
      mutate();
    };
    window.addEventListener('machine-data-updated', handleUpdate);
    return () => window.removeEventListener('machine-data-updated', handleUpdate);
  }, [mutate]);

  const machines = apiResponse?.success ? apiResponse.data : [];

  // Derived filtered machines logic follows...

  // Filter and search logic
  const filteredMachines = useMemo(() => {
    return machines.filter((machine: any) => {
      const matchesSearch = machine.name_machine.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           machine.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLine = lineFilter === 'all' || machine.line_id === lineFilter;
      return matchesSearch && matchesLine;
    });
  }, [machines, searchTerm, lineFilter]);

  // Group filtered machines by line
  const groupedByLine = useMemo(() => {
    const groups = new Map<string, { lineId: string; lineName: string; machines: any[] }>();
    filteredMachines.forEach((machine: any) => {
      const key = machine.line_id || '__unassigned__';
      const name = machine.line_name || 'Unassigned';
      if (!groups.has(key)) {
        groups.set(key, { lineId: key, lineName: name, machines: [] });
      }
      groups.get(key)!.machines.push(machine);
    });
    // Sort: named lines first, unassigned last
    return Array.from(groups.values()).sort((a, b) => {
      if (a.lineName === 'Unassigned') return 1;
      if (b.lineName === 'Unassigned') return -1;
      return a.lineName.localeCompare(b.lineName);
    });
  }, [filteredMachines]);

  const toggleLine = (lineId: string) => {
    setCollapsedLines(prev => {
      const next = new Set(prev);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  };

  const getDaysUntil = (date: string | Date | null) => {
    if (!date) return null;
    const today = new Date();
    const target = new Date(date);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatMaintenanceDate = (date: string | Date | null) => {
    if (!date) return 'Not Scheduled';
    return new Date(date).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Schedule Maintenance</h2>
          <p className="text-xs text-slate-500 font-medium">Monitor and manage machine maintenance cycles</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-bold text-sm shadow-md shadow-indigo-100"
        >
          <Plus size={18} />
          Add Schedule
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search machine name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
          />
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 min-w-[200px]">
          <Filter size={16} className="text-slate-400" />
          <select 
            value={lineFilter}
            onChange={(e) => setLineFilter(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-sm font-semibold text-slate-700 w-full outline-none"
          >
            <option value="all">All Lines</option>
            {uniqueLines.map((line: any) => (
              <option key={line.id} value={line.id}>{line.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && machines.length === 0 ? (
        <div className="flex items-center justify-center h-[500px] w-full bg-white rounded-3xl shadow-sm border border-slate-100">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse">
                <Clock size={28} className="text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-[3px] border-white animate-bounce" />
            </div>
            <p className="text-slate-500 font-bold tracking-wide">Memuat Jadwal Pemeliharaan...</p>
          </div>
        </div>
      ) : filteredMachines.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-slate-200">
          <div className="p-4 bg-slate-50 rounded-full mb-4">
            <Search size={32} className="text-slate-300" />
          </div>
          <h3 className="text-slate-900 font-bold">No machines found</h3>
          <p className="text-slate-500 text-sm">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByLine.map((group) => {
            const isCollapsed = collapsedLines.has(group.lineId);

            // Categorize machines by urgency
            const overdueCount = group.machines.filter((m: any) => {
              const d = getDaysUntil(m.next_maintenance);
              return d !== null && d < 0;
            }).length;
            const todayCount = group.machines.filter((m: any) => {
              const d = getDaysUntil(m.next_maintenance);
              return d !== null && d === 0;
            }).length;
            const upcomingCount = group.machines.filter((m: any) => {
              const d = getDaysUntil(m.next_maintenance);
              return d !== null && d > 0 && d <= 7;
            }).length;
            const criticalCount = overdueCount + todayCount + upcomingCount;

            return (
              <div key={group.lineId} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Line Header */}
                <button
                  onClick={() => toggleLine(group.lineId)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-50 to-white hover:from-indigo-50 hover:to-white transition-colors border-b border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Layers size={16} className="text-indigo-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">{group.lineName}</h3>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {group.machines.length} machine{group.machines.length !== 1 ? 's' : ''}
                        {criticalCount > 0 && (
                          <span className="ml-2 text-orange-600 font-bold">• {criticalCount} need attention</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Overdue badge */}
                    {overdueCount > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-black uppercase tracking-wide">
                        <AlertTriangle size={10} className="shrink-0" />
                        {overdueCount} overdue
                      </span>
                    )}
                    {/* Today badge */}
                    {todayCount > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 border border-red-200 rounded-lg text-[10px] font-black uppercase tracking-wide animate-pulse">
                        <AlertCircle size={10} className="shrink-0" />
                        due today
                      </span>
                    )}
                    {/* Upcoming badge */}
                    {upcomingCount > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-[10px] font-black uppercase tracking-wide">
                        <Clock size={10} className="shrink-0" />
                        {upcomingCount} upcoming
                      </span>
                    )}
                    {/* All clear */}
                    {criticalCount === 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[10px] font-black uppercase tracking-wide">
                        <Play size={10} className="shrink-0" />
                        all on schedule
                      </span>
                    )}
                    {isCollapsed
                      ? <ChevronRight size={18} className="text-slate-400 ml-1" />
                      : <ChevronDown size={18} className="text-slate-400 ml-1" />
                    }
                  </div>
                </button>

                {/* Machines Grid */}
                {!isCollapsed && (
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {group.machines.map((machine: any) => {
                      const daysUntil = getDaysUntil(machine.next_maintenance);
                      const isOverdue = daysUntil !== null && daysUntil < 0;
                      const isToday = daysUntil !== null && daysUntil === 0;
                      const isUpcoming = daysUntil !== null && daysUntil > 0 && daysUntil <= 7;
                      const isCritical = isOverdue || isToday || isUpcoming;
                      const statusCfg = getStatusConfig(machine.status);
                      const StatusIcon = statusCfg.icon;

                      const cardBorder = isOverdue
                        ? 'border-rose-300 ring-2 ring-rose-100'
                        : isToday
                        ? 'border-red-300 ring-2 ring-red-100'
                        : isUpcoming
                        ? 'border-orange-200 ring-2 ring-orange-100'
                        : 'border-slate-100';

                      return (
                        <div
                          key={machine.id}
                          className={`group bg-white rounded-2xl shadow-sm border p-5 transition-all hover:shadow-xl hover:-translate-y-1 ${cardBorder}`}
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{machine.name_machine}</h3>
                                <span className={`flex h-2 w-2 rounded-full ${statusCfg.dot} ${machine.status === 'active' ? 'animate-pulse' : ''}`}></span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                                  {machine.id.substring(0, 8)}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full">
                                  <Settings size={10} />
                                  {machine.process_name}
                                </span>
                              </div>
                            </div>
                            <div className={`p-2 rounded-xl transition-all ${statusCfg.bg} ${statusCfg.color}`}>
                              <StatusIcon size={18} />
                            </div>
                          </div>

                          {/* Status Bar */}
                          <div className="mb-4">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current State</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.color}`}>
                                {statusCfg.label.toUpperCase()}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-1000 ${statusCfg.dot}`} style={{ width: machine.status === 'inactive' ? '0%' : '100%' }}></div>
                            </div>
                          </div>

                          {/* Urgency Alert Message */}
                          {daysUntil !== null && (
                            <div className={`mb-4 p-3 rounded-xl flex items-start gap-2.5 ${
                              daysUntil < 0 ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                              daysUntil <= 7 ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                              'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            }`}>
                              <AlertCircle size={16} className="mt-0.5 shrink-0" />
                              <p className="text-[11px] font-bold leading-relaxed">
                                {daysUntil < 0 ? (
                                  `OVERDUE: Maintenance was required ${Math.abs(daysUntil)} days ago!`
                                ) : daysUntil === 0 ? (
                                  'ACTION REQUIRED: Maintenance is scheduled for TODAY!'
                                ) : daysUntil <= 7 ? (
                                  `${daysUntil} days left or on ${formatMaintenanceDate(machine.next_maintenance)} maintenance must be performed.`
                                ) : (
                                  `Next cycle scheduled in ${daysUntil} days.`
                                )}
                              </p>
                            </div>
                          )}

                          {/* Info Grid */}
                          <div className="grid grid-cols-2 gap-4 mb-5 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                            <div>
                              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mb-1">Last Maintenance</p>
                              <p className="text-xs font-bold text-slate-800">{formatMaintenanceDate(machine.last_maintenance)}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mb-1">Next Maintenance</p>
                              <p className="text-xs font-bold text-indigo-600">{formatMaintenanceDate(machine.next_maintenance)}</p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedSchedule(machine)}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-xs font-bold shadow-lg shadow-indigo-100 active:scale-95"
                            >
                              <Settings size={14} />
                              Manage
                            </button>
                            <button
                              className="flex items-center justify-center px-3 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all text-xs font-bold active:scale-95"
                            >
                              <MapPin size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <PreventiveMaintenanceForm
          onClose={() => setShowForm(false)}
          onSuccess={() => swrMutate('/api/maintenance/scheduled')}
        />
      )}
      {selectedSchedule && (
        <PreventiveMaintenanceForm
          schedule={selectedSchedule}
          onClose={() => setSelectedSchedule(null)}
          onSuccess={() => swrMutate('/api/maintenance/scheduled')}
        />
      )}
    </div>
  );
}