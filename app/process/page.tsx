'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Cpu, Factory, Layers, Search, RefreshCw,
    AlertCircle, Loader2, ChevronDown,
    Wrench, Clock, Calendar, Activity, X, Filter,
    ArrowRight, ServerCrash, Zap, AlertTriangle, ChevronRight,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Machine {
    id: string;
    name: string;
    status: string | null;
    last_maintenance: string | null;
    next_maintenance: string | null;
    total_running_hours: string | number | null;
}

interface ProcessEntry {
    line_process_id: string;
    process_order: number;
    process_id: string;
    process_name: string;
    process_index: number;
    machine: Machine | null;
}

interface LineGroup {
    line_id: string;
    line_name: string;
    line_status: string | null;
    processes: ProcessEntry[];
}

interface Line {
    id: string;
    name: string;
    status: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function machineStatusConfig(status: string | null) {
    switch (status?.toLowerCase()) {
        case 'running':
            return {
                dot: 'bg-emerald-500',
                badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                icon: <Activity size={11} className="text-emerald-600" />,
                label: 'Running',
            };
        case 'downtime':
        case 'down':
            return {
                dot: 'bg-red-500',
                badge: 'bg-red-50 text-red-700 border-red-200',
                icon: <ServerCrash size={11} className="text-red-600" />,
                label: 'Downtime',
            };
        case 'maintenance':
            return {
                dot: 'bg-amber-500',
                badge: 'bg-amber-50 text-amber-700 border-amber-200',
                icon: <Wrench size={11} className="text-amber-600" />,
                label: 'Maintenance',
            };
        case 'warning':
            return {
                dot: 'bg-orange-400',
                badge: 'bg-orange-50 text-orange-700 border-orange-200',
                icon: <AlertTriangle size={11} className="text-orange-600" />,
                label: 'Warning',
            };
        case 'idle':
            return {
                dot: 'bg-slate-400',
                badge: 'bg-slate-50 text-slate-600 border-slate-200',
                icon: <Zap size={11} className="text-slate-400" />,
                label: 'Idle',
            };
        default:
            return {
                dot: 'bg-slate-300',
                badge: 'bg-slate-50 text-slate-500 border-slate-200',
                icon: <Cpu size={11} className="text-slate-400" />,
                label: status || 'Unknown',
            };
    }
}

function lineStatusConfig(status: string | null) {
    switch (status?.toLowerCase()) {
        case 'active':
            return { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Active' };
        case 'on hold':
            return { dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200', label: 'On Hold' };
        case 'inactive':
            return { dot: 'bg-slate-400', badge: 'bg-slate-50 text-slate-600 border-slate-200', label: 'Inactive' };
        default:
            return { dot: 'bg-slate-300', badge: 'bg-slate-50 text-slate-500 border-slate-200', label: status || 'Idle' };
    }
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * DB stores total_running_hours as TEXT decimal hours (e.g. "12.5" = 12h 30m).
 * Convert to human-readable "Xh Ym" format.
 */
function formatHours(hours: string | number | null) {
    if (hours == null) return '—';
    const n = typeof hours === 'string' ? parseFloat(hours) : Number(hours);
    if (isNaN(n) || n <= 0) return '0h';
    const totalSeconds = Math.round(n * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h === 0) return `${m}m`;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProcessMachinesPage() {
    const router = useRouter();
    const [groups, setGroups] = useState<LineGroup[]>([]);
    const [lines, setLines] = useState<Line[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [selectedLineId, setSelectedLineId] = useState<string>('all');
    const [searchProcess, setSearchProcess] = useState('');
    const [searchMachine, setSearchMachine] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Collapse state per line group
    const [collapsedLines, setCollapsedLines] = useState<Set<string>>(new Set());

    const toggleCollapse = (lineId: string) => {
        setCollapsedLines(prev => {
            const next = new Set(prev);
            if (next.has(lineId)) next.delete(lineId);
            else next.add(lineId);
            return next;
        });
    };

    const fetchLines = useCallback(async () => {
        try {
            const res = await fetch('/api/lines');
            const json = await res.json();
            if (json.success) setLines(json.data);
        } catch {
            // non-critical
        }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const url = selectedLineId !== 'all'
                ? `/api/process/with-machines?lineId=${selectedLineId}`
                : '/api/process/with-machines';
            const res = await fetch(url);
            const json = await res.json();
            if (json.success) {
                setGroups(json.data);
            } else {
                setError(json.error || 'Failed to load data');
            }
        } catch {
            setError('Network error occurred');
        } finally {
            setLoading(false);
        }
    }, [selectedLineId]);

    useEffect(() => {
        fetchLines();
    }, [fetchLines]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ── Derived / filtered data ──────────────────────────────────────────────

    const filteredGroups = groups
        .map(group => {
            const filteredProcesses = group.processes.filter(p => {
                const matchProcess = !searchProcess.trim() ||
                    p.process_name.toLowerCase().includes(searchProcess.toLowerCase());
                const matchMachine = !searchMachine.trim() ||
                    (p.machine?.name?.toLowerCase().includes(searchMachine.toLowerCase()) ?? false);
                const matchStatus = statusFilter === 'all' ||
                    (p.machine?.status?.toLowerCase() === statusFilter.toLowerCase()) ||
                    (statusFilter === 'no-machine' && !p.machine);
                return matchProcess && matchMachine && matchStatus;
            });
            return { ...group, processes: filteredProcesses };
        })
        .filter(group => group.processes.length > 0);

    const totalProcesses = filteredGroups.reduce((s, g) => s + g.processes.length, 0);
    const totalMachines = filteredGroups.reduce((s, g) => s + g.processes.filter(p => p.machine).length, 0);
    const totalNoMachine = filteredGroups.reduce((s, g) => s + g.processes.filter(p => !p.machine).length, 0);

    const hasActiveFilters = searchProcess || searchMachine || statusFilter !== 'all';

    const clearFilters = () => {
        setSearchProcess('');
        setSearchMachine('');
        setStatusFilter('all');
    };

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-white pb-24 p-8 space-y-6">

            {/* ── Page Header ── */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <Cpu size={18} className="text-indigo-600" />
                        </div>
                        Process & Machine Registry
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 ml-11">
                        All registered processes with their assigned machines, grouped by production line.
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* ── Summary Stats ── */}
            {!loading && !error && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        {
                            label: 'Total Line',
                            value: filteredGroups.length,
                            icon: <Factory size={16} className="text-indigo-500" />,
                            bg: 'bg-indigo-50 border-indigo-100',
                            val: 'text-indigo-700',
                        },
                        {
                            label: 'Total Process',
                            value: totalProcesses,
                            icon: <Layers size={16} className="text-violet-500" />,
                            bg: 'bg-violet-50 border-violet-100',
                            val: 'text-violet-700',
                        },
                        {
                            label: 'Registered Machines',
                            value: totalMachines,
                            icon: <Cpu size={16} className="text-emerald-500" />,
                            bg: 'bg-emerald-50 border-emerald-100',
                            val: 'text-emerald-700',
                        },
                        {
                            label: 'No Machine',
                            value: totalNoMachine,
                            icon: <AlertCircle size={16} className="text-amber-500" />,
                            bg: 'bg-amber-50 border-amber-100',
                            val: 'text-amber-700',
                        },
                    ].map(s => (
                        <div key={s.label} className={`${s.bg} border rounded-2xl p-4 flex items-center gap-3`}>
                            <div className="p-2 bg-white rounded-xl shadow-sm">{s.icon}</div>
                            <div>
                                <p className={`text-xl font-black ${s.val}`}>{s.value}</p>
                                <p className="text-[11px] text-slate-500 font-medium">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Filter Bar ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Filter size={14} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter</span>
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="ml-auto flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors"
                        >
                            <X size={11} /> Reset Filter
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Line Filter */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            Production Line
                        </label>
                        <div className="relative">
                            <Factory size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <select
                                value={selectedLineId}
                                onChange={e => setSelectedLineId(e.target.value)}
                                className="w-full pl-8 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none"
                            >
                                <option value="all">All Lines</option>
                                {lines.map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Process Search */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            Search Process
                        </label>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={searchProcess}
                                onChange={e => setSearchProcess(e.target.value)}
                                placeholder="Process name..."
                                className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                        </div>
                    </div>

                    {/* Machine Search */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            Search Machine
                        </label>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={searchMachine}
                                onChange={e => setSearchMachine(e.target.value)}
                                placeholder="Machine name..."
                                className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            Machine Status
                        </label>
                        <div className="relative">
                            <Activity size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="w-full pl-8 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none"
                            >
                                <option value="all">All Status</option>
                                <option value="running">Running</option>
                                <option value="downtime">Downtime</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="warning">Warning</option>
                                <option value="idle">Idle</option>
                                <option value="no-machine">No Machine</option>
                            </select>
                            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Content ── */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <Loader2 size={32} className="animate-spin text-indigo-500" />
                    <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading process & machine data...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-8 flex flex-col items-center text-center">
                    <AlertCircle size={28} className="text-red-500 mb-3" />
                    <h3 className="text-sm font-bold text-red-700">Failed to Load Data</h3>
                    <p className="text-xs text-red-600 mt-1">{error}</p>
                    <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold transition-colors">
                        Try Again
                    </button>
                </div>
            ) : filteredGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                    <Layers size={40} className="text-slate-300 mb-4" />
                    <h3 className="text-base font-bold text-slate-600">No Data Found</h3>
                    <p className="text-sm text-slate-400 mt-1 text-center max-w-xs">
                        {hasActiveFilters
                            ? 'No processes match the selected filters.'
                            : 'No processes have been registered in the system yet.'}
                    </p>
                    {hasActiveFilters && (
                        <button onClick={clearFilters} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors">
                            Reset Filter
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-5">
                    {filteredGroups.map(group => {
                        const lineStatus = lineStatusConfig(group.line_status);
                        const isCollapsed = collapsedLines.has(group.line_id);
                        const machineCount = group.processes.filter(p => p.machine).length;
                        const noMachineCount = group.processes.filter(p => !p.machine).length;

                        return (
                            <div key={group.line_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                                {/* ── Line Group Header ── */}
                                <button
                                    onClick={() => toggleCollapse(group.line_id)}
                                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                        <Factory size={18} className="text-indigo-600" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h2 className="text-base font-bold text-slate-800">{group.line_name}</h2>
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${lineStatus.badge}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${lineStatus.dot}`} />
                                                {lineStatus.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                                <Layers size={10} />
                                                {group.processes.length} process
                                            </span>
                                            <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                                                <Cpu size={10} />
                                                {machineCount} machines registered
                                            </span>
                                            {noMachineCount > 0 && (
                                                <span className="text-[11px] text-amber-600 flex items-center gap-1">
                                                    <AlertCircle size={10} />
                                                    {noMachineCount} no machine
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <ChevronDown
                                        size={16}
                                        className={`text-slate-400 transition-transform flex-shrink-0 ${isCollapsed ? '' : 'rotate-180'}`}
                                    />
                                </button>

                                {/* ── Process + Machine Table ── */}
                                {!isCollapsed && (
                                    <div className="border-t border-slate-100">
                                        {/* Table Header */}
                                        <div className="grid grid-cols-12 gap-2 px-5 py-2.5 bg-slate-50 border-b border-slate-100">
                                            <div className="col-span-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">#</div>
                                            <div className="col-span-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Process</div>
                            <div className="col-span-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Machine</div>
                                            <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</div>
                                            <div className="col-span-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden lg:block">Hours</div>
                                            <div className="col-span-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden xl:block">Next Maint.</div>
                                            <div className="col-span-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right"></div>
                                        </div>

                                        {/* Rows */}
                                        <div className="divide-y divide-slate-50">
                                            {group.processes.map((p, idx) => {
                                                const mStatus = machineStatusConfig(p.machine?.status ?? null);
                                                const isLast = idx === group.processes.length - 1;

                                                return (
                                                    <div
                                                        key={p.line_process_id}
                                                        onClick={() => p.machine && router.push(`/process/${p.process_id}/${p.machine.id}`)}
                                                        className={`grid grid-cols-12 gap-2 px-5 py-3.5 items-center transition-colors group ${p.machine ? 'hover:bg-indigo-50/60 cursor-pointer' : 'hover:bg-slate-50/70'}`}
                                                    >
                                                        {/* Order */}
                                                        <div className="col-span-1">
                                                            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[11px] font-black text-indigo-600">
                                                                {p.process_order}
                                                            </div>
                                                        </div>

                                                        {/* Process Name */}
                                                        <div className="col-span-3 flex items-center gap-2 min-w-0">
                                                            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                                                                <Layers size={13} className="text-violet-500" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-slate-800 truncate">{p.process_name}</p>
                                                                <p className="text-[10px] text-slate-400 font-mono">idx: {p.process_index ?? '—'}</p>
                                                            </div>
                                                            {!isLast && (
                                                                <ArrowRight size={12} className="text-slate-200 flex-shrink-0 hidden sm:block" />
                                                            )}
                                                        </div>

                                                        {/* Machine Name */}
                                                        <div className="col-span-3 min-w-0">
                                                            {p.machine ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                                        <Cpu size={13} className="text-slate-500" />
                                                                    </div>
                                                                    <p className="text-sm font-semibold text-slate-700 truncate">{p.machine.name}</p>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                                                                        <AlertCircle size={13} className="text-amber-400" />
                                                                    </div>
                                                                    <span className="text-xs text-amber-600 font-semibold italic">No machine assigned</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Machine Status */}
                                                        <div className="col-span-2">
                                                            {p.machine ? (
                                                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border ${mStatus.badge}`}>
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${mStatus.dot} ${p.machine.status?.toLowerCase() === 'running' ? 'animate-pulse' : ''}`} />
                                                                    {mStatus.label}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-300 font-medium">—</span>
                                                            )}
                                                        </div>

                                                        {/* Running Hours */}
                                                        <div className="col-span-1 hidden lg:block">
                                                            {p.machine ? (
                                                                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                                                    <Clock size={10} className="text-slate-400" />
                                                                    <span className="font-semibold">{formatHours(p.machine.total_running_hours)}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-300">—</span>
                                                            )}
                                                        </div>

                                                        {/* Next Maintenance */}
                                                        <div className="col-span-1 hidden xl:block">
                                                            {p.machine?.next_maintenance ? (
                                                                <div className="flex items-center gap-1 text-[11px]">
                                                                    <Calendar size={10} className="text-slate-400 flex-shrink-0" />
                                                                    <span className={`font-semibold ${
                                                                        new Date(p.machine.next_maintenance) < new Date()
                                                                            ? 'text-red-600'
                                                                            : 'text-slate-500'
                                                                    }`}>
                                                                        {formatDate(p.machine.next_maintenance)}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-300">—</span>
                                                            )}
                                                        </div>

                                                        {/* Chevron navigate */}
                                                        <div className="col-span-1 flex justify-end">
                                                            {p.machine ? (
                                                                <ChevronRight size={15} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                                                            ) : (
                                                                <span />
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
