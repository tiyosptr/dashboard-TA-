'use client';

import { memo, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/supabase';
import { MachineStatus } from '@/types';
import { Cpu, Wifi, Layers, Wrench, Play, PauseCircle, AlertTriangle, PowerOff } from 'lucide-react';

interface ProcessMachine {
    processOrder: number | null;
    processId: string;
    processName: string | null;
    processIndex: number | null;
    machine: {
        id: string;
        nameMachine: string | null;
        status: string | null;
        nextMaintenance: string | null;
        lastMaintenance: string | null;
        totalRunningHours: string | null;
    } | null;
}

interface StatusMachineProps {
    className?: string;
    machinesData?: {
        list: {
            id: string;
            nameMachine: string | null;
            nameLine?: string | null;
            status: string | null;
        }[];
        counts: {
            total: number;
            running: number;
        };
        processes?: ProcessMachine[];
    };
    isLoading?: boolean;
    selectedLineId?: string | null;
}

/**
 * Machine Status Configuration
 * 
 * 5 Statuses with UI/UX-appropriate colors:
 * 
 * 1. ACTIVE     → Hijau (Emerald)    - Mesin sedang berjalan/beroperasi
 * 2. MAINTENANCE → Biru (Blue)       - Mesin sedang dalam perawatan terjadwal
 * 3. ON HOLD    → Kuning/Amber       - Mesin ditahan sementara, menunggu aksi
 * 4. DOWNTIME   → Merah (Rose)       - Mesin berhenti karena masalah/kerusakan
 * 5. INACTIVE   → Abu-abu (Slate)    - Mesin tidak aktif/dimatikan
 */
const getStatusConfig = (status: string) => {
    switch (status?.toLowerCase()) {
        case 'active':
        case 'running':
            return {
                badge: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white',
                dot: 'bg-emerald-300',
                label: 'Active',
                cardBg: 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200/60',
                pulse: true,
                iconColor: 'text-emerald-500',
                icon: Play,
                countBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            };
        case 'maintenance':
            return {
                badge: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
                dot: 'bg-blue-300',
                label: 'Maintenance',
                cardBg: 'bg-gradient-to-br from-blue-50 to-white border-blue-200/60',
                pulse: false,
                iconColor: 'text-blue-500',
                icon: Wrench,
                countBg: 'bg-blue-50 text-blue-700 border-blue-200',
            };
        case 'on hold':
        case 'on-hold':
        case 'onhold':
        case 'hold':
            return {
                badge: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white',
                dot: 'bg-amber-300',
                label: 'On Hold',
                cardBg: 'bg-gradient-to-br from-amber-50 to-white border-amber-200/60',
                pulse: false,
                iconColor: 'text-amber-500',
                icon: PauseCircle,
                countBg: 'bg-amber-50 text-amber-700 border-amber-200',
            };
        case 'downtime':
        case 'down':
        case 'error':
            return {
                badge: 'bg-gradient-to-r from-rose-500 to-rose-600 text-white',
                dot: 'bg-rose-300',
                label: 'Downtime',
                cardBg: 'bg-gradient-to-br from-rose-50 to-white border-rose-200/60',
                pulse: true,
                iconColor: 'text-rose-500',
                icon: AlertTriangle,
                countBg: 'bg-rose-50 text-rose-700 border-rose-200',
            };
        case 'inactive':
        case 'offline':
        case 'stopped':
            return {
                badge: 'bg-gradient-to-r from-slate-400 to-slate-500 text-white',
                dot: 'bg-slate-300',
                label: 'Inactive',
                cardBg: 'bg-gradient-to-br from-slate-50 to-white border-slate-200/60',
                pulse: false,
                iconColor: 'text-slate-400',
                icon: PowerOff,
                countBg: 'bg-slate-50 text-slate-600 border-slate-200',
            };
        default:
            return {
                badge: 'bg-gradient-to-r from-slate-400 to-slate-500 text-white',
                dot: 'bg-slate-300',
                label: status || 'Unknown',
                cardBg: 'bg-gradient-to-br from-slate-50 to-white border-slate-200/60',
                pulse: false,
                iconColor: 'text-slate-400',
                icon: PowerOff,
                countBg: 'bg-slate-50 text-slate-600 border-slate-200',
            };
    }
};

function StatusMachine({ className = '', machinesData, isLoading: externalLoading, selectedLineId }: StatusMachineProps) {
    const [localMachines, setLocalMachines] = useState<MachineStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollDirectionRef = useRef(1);

    const useSWRData = !!machinesData;

    const loadMachines = useCallback(async () => {
        if (useSWRData) return;
        try {
            const response = await fetch('/api/machines');
            const result = await response.json();
            if (result.success) {
                const formatted = result.data.map((m: any) => ({
                    id: m.id,
                    label: m.name_machine,
                    line: m.name_line,
                    status: m.status?.toLowerCase() || 'inactive',
                }));
                setLocalMachines(formatted);
            }
        } catch (err) {
            console.error('Error loading machines:', err);
        } finally {
            setLoading(false);
        }
    }, [useSWRData]);

    useEffect(() => {
        if (useSWRData) {
            setLoading(false);
            return;
        }

        loadMachines();

        const channel = supabase
            .channel('machine-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'machine' }, () => {
                loadMachines();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [loadMachines, useSWRData]);

    const machines = useSWRData
        ? (machinesData?.list || []).map(m => ({
            id: m.id,
            label: m.nameMachine || '',
            line: m.nameLine || '',
            status: m.status?.toLowerCase() || 'inactive',
        }))
        : localMachines.map(m => ({
            id: m.id,
            label: m.label || '',
            line: '',
            status: m.status || 'inactive',
        }));

    const isLoading = externalLoading ?? loading;
    const processes = machinesData?.processes || [];
    const hasProcessView = selectedLineId && processes.length > 0;

    // Count per status
    const statusCounts = {
        active: machines.filter(m => m.status === 'active' || m.status === 'running').length,
        maintenance: machines.filter(m => m.status === 'maintenance').length,
        onhold: machines.filter(m => ['on hold', 'on-hold', 'onhold', 'hold'].includes(m.status)).length,
        downtime: machines.filter(m => ['downtime', 'down', 'error'].includes(m.status)).length,
        inactive: machines.filter(m => ['inactive', 'offline', 'stopped'].includes(m.status)).length,
    };

    // Auto-scroll logic (7 seconds total duration)
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        let animationFrameId: number;
        let currentScroll = el.scrollTop;
        let lastTime = performance.now();
        const durationMs = 5000;

        const scrollStep = (timestamp: number) => {
            const deltaTime = timestamp - lastTime;
            lastTime = timestamp;

            if (!isHovered && el) {
                const maxScroll = el.scrollHeight - el.clientHeight;
                if (maxScroll > 0) {
                    const speed = maxScroll / durationMs;
                    currentScroll += speed * deltaTime * scrollDirectionRef.current;

                    if (currentScroll >= maxScroll) {
                        currentScroll = maxScroll;
                        scrollDirectionRef.current = -1;
                    } else if (currentScroll <= 0) {
                        currentScroll = 0;
                        scrollDirectionRef.current = 1;
                    }

                    el.scrollTop = currentScroll;
                }
            }
            animationFrameId = requestAnimationFrame(scrollStep);
        };

        animationFrameId = requestAnimationFrame(scrollStep);

        return () => cancelAnimationFrame(animationFrameId);
    }, [isHovered, hasProcessView, machines.length]);

    if (isLoading) {
        return (
            <div className={`chart-card p-3 text-center h-full flex flex-col items-center justify-center overflow-hidden ${className}`}>
                <Cpu size={18} className="text-indigo-300 animate-pulse mb-1" />
                <span className="text-xs text-slate-400 font-medium">Connecting to machines...</span>
            </div>
        );
    }

    return (
        <div
            className={`chart-card p-3 h-full flex flex-col overflow-hidden ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                    <Cpu size={13} className="text-indigo-500" />
                    <h2 className="text-xs font-bold text-slate-800 tracking-wider">MACHINES</h2>
                    {hasProcessView && (
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 rounded-full">
                            <Layers size={9} className="text-indigo-500" />
                            <span className="text-[8px] font-bold text-indigo-600">{processes.length} Process</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <Wifi size={10} className="text-emerald-500" />
                    <span className="text-[9px] font-bold text-emerald-600">{statusCounts.active}/{machines.length}</span>
                </div>
            </div>

            {/* Status Summary Bar */}
            <div className="flex items-center gap-1 mb-2 flex-shrink-0">
                {[
                    { key: 'active', label: 'Active', color: 'bg-emerald-500', count: statusCounts.active },
                    { key: 'maintenance', label: 'Maint', color: 'bg-blue-500', count: statusCounts.maintenance },
                    { key: 'onhold', label: 'Hold', color: 'bg-amber-500', count: statusCounts.onhold },
                    { key: 'downtime', label: 'Down', color: 'bg-rose-500', count: statusCounts.downtime },
                    { key: 'inactive', label: 'Off', color: 'bg-slate-400', count: statusCounts.inactive },
                ].map(s => (
                    <div key={s.key} className="flex items-center gap-0.5" title={`${s.label}: ${s.count}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${s.color} ${s.key === 'active' && s.count > 0 ? 'animate-pulse' : ''}`} />
                        <span className="text-[8px] text-slate-500 font-semibold">{s.count}</span>
                    </div>
                ))}
            </div>

            {/* Process-based view when line is selected */}
            {hasProcessView ? (
                <div className="flex-1 overflow-auto no-scrollbar" ref={scrollRef}>
                    <div className="flex flex-col gap-1.5 pt-1">
                        {processes.map((proc, idx) => {
                            const machine = proc.machine;
                            const status = machine?.status?.toLowerCase() || 'inactive';
                            const config = getStatusConfig(status);
                            const StatusIcon = config.icon;
                            return (
                                <div key={proc.processId || idx} className={`${config.cardBg} border rounded-lg p-2 flex items-center gap-2 transition-all duration-200 hover:shadow-md`}>
                                    {/* Process Order Badge */}
                                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                                        <span className="text-[9px] font-black text-white">{proc.processOrder ?? idx + 1}</span>
                                    </div>

                                    {/* Process & Machine Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider truncate">
                                                {proc.processName || `Process ${idx + 1}`}
                                            </span>
                                        </div>
                                        <div className="text-[10px] font-semibold text-slate-700 truncate">
                                            {machine?.nameMachine || 'No machine assigned'}
                                        </div>
                                    </div>

                                    {/* Status Badge with Icon */}
                                    {machine && (
                                        <div className={`${config.badge} text-[7px] font-bold py-0.5 px-2 rounded-full text-center shadow-sm flex-shrink-0`}>
                                            <span className="flex items-center gap-0.5">
                                                <StatusIcon size={8} strokeWidth={2.5} />
                                                {config.label}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                /* Grid view for all machines */
                <div className="flex-1 grid gap-1.5 overflow-auto no-scrollbar pt-1" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(72px, 1fr))` }} ref={scrollRef}>
                    {machines.map((machine) => {
                        const config = getStatusConfig(machine.status);
                        const StatusIcon = config.icon;
                        return (
                            <div
                                key={machine.id}
                                className={`${config.cardBg} border rounded-lg p-1.5 flex flex-col items-center text-center transition-all duration-200 hover:scale-105 hover:shadow-md cursor-default group`}
                            >
                                {/* Machine Name */}
                                <div className="text-[8px] text-slate-700 truncate w-full font-semibold mb-1">{machine.label}</div>

                                {/* Status Badge */}
                                <div className={`${config.badge} text-[7px] font-bold py-0.5 px-1.5 rounded-full w-full text-center truncate shadow-sm`}>
                                    <span className="flex items-center justify-center gap-0.5">
                                        <StatusIcon size={7} strokeWidth={2.5} />
                                        <span className={`${config.dot} w-1 h-1 rounded-full ${config.pulse ? 'animate-pulse' : ''}`} />
                                        {config.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default memo(StatusMachine);
