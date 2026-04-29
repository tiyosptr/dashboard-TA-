'use client';
import { memo, useEffect, useRef, useState } from 'react';
import { TrendingDown, TrendingUp, AlertTriangle, ShieldAlert } from 'lucide-react';

interface DefectRejectBarChartProps {
    width?: string | number;
    height?: string | number;
    className?: string;
    defectData?: {
        lineProcessId: string;
        processName: string;
        totalProduced: number;
        totalPass: number;
        totalReject: number;
        defectRate: number;
    }[];
    actualOutputData?: {
        summary?: {
             totalProduced: number;
             totalReject: number;
             qualityRate: number;
        };
    };
}

interface DefectProcess {
    process: string;
    defectCount: number;
    percentage: number;
    color: string;
    gradient: string;
}

function DefectRejectBarChart({
    className = '',
    defectData = [],
    actualOutputData,
}: DefectRejectBarChartProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollDirectionRef = useRef(1);
    const [isHovered, setIsHovered] = useState(false);

    // Untuk summary "Produced": ambil dari PROSES PERTAMA (input/entry point)
    // Karena itu adalah total items yang masuk ke line (sebelum ada reject di proses manapun)
    // Jika ambil dari VIFG, items yang reject di proses awal tidak terhitung
    const firstProcess = defectData[0]; // Proses pertama = entry point
    
    const totalProd = firstProcess?.totalProduced || 0;
    
    // Untuk total defect: sum dari semua proses (karena reject bisa terjadi di proses manapun)
    const totalDef = defectData.reduce((sum, d) => sum + d.totalReject, 0);
    const defRate = totalProd > 0 ? (totalDef / totalProd) * 100 : 0;

    console.log('[Defect By Process] Summary calculation:', {
        totalProduced: totalProd,
        totalDefect: totalDef,
        defectRate: defRate.toFixed(2),
        firstProcessName: firstProcess?.processName,
        processCount: defectData.length,
        processes: defectData.map(d => ({
            name: d.processName,
            produced: d.totalProduced,
            reject: d.totalReject
        }))
    });

    const stats = {
        totalProduced: totalProd,
        totalDefect: totalDef,
        defectRate: defRate.toFixed(2),
        trend: 0, // no history trend for now
    };

    const gradientPresets = [
        'from-red-500 to-red-400',
        'from-amber-500 to-amber-400',
        'from-indigo-500 to-indigo-400',
        'from-violet-500 to-violet-400',
        'from-slate-500 to-slate-400',
        'from-emerald-500 to-emerald-400',
        'from-orange-500 to-orange-400',
        'from-pink-500 to-pink-400'
    ];

    const colors = [
        '#ef4444', '#f59e0b', '#6366f1', '#8b5cf6', '#64748b', '#10b981', '#f97316', '#ec4899'
    ];

    const defectByProcess: DefectProcess[] = defectData
        .filter(d => d.totalReject > 0)
        .map((d, index) => {
            // Persentase = (reject di proses ini / total produced di proses ini) * 100
            const p = d.totalProduced > 0 ? (d.totalReject / d.totalProduced) * 100 : 0;
            return {
                process: d.processName,
                defectCount: d.totalReject,
                percentage: Math.round(p * 10) / 10,
                color: colors[index % colors.length],
                gradient: gradientPresets[index % gradientPresets.length]
            };
        }).sort((a, b) => b.defectCount - a.defectCount);

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
    }, [isHovered, defectByProcess.length]);

    return (
        <div
            className={`chart-card p-3 flex flex-col h-full w-full overflow-hidden ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shadow-sm">
                        <ShieldAlert size={13} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-xs tracking-wide">DEFECT BY PROCESS</h3>
                        <p className="text-[8px] text-slate-400 -mt-0.5">Auto-scrolling view</p>
                    </div>
                </div>
                <div className={`stat-badge ${stats.trend < 0 ? 'stat-badge-success' : 'stat-badge-danger'}`}>
                    {stats.trend < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                    {Math.abs(stats.trend)}%
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex gap-2 mb-2 flex-shrink-0">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-lg px-3 py-1.5 flex-1 text-center border border-indigo-100">
                    <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Produced</div>
                    <div className="text-sm font-black text-indigo-700">
                        {stats.totalProduced >= 1000
                            ? `${(stats.totalProduced / 1000).toFixed(1)}K`
                            : stats.totalProduced.toLocaleString()}
                    </div>
                </div>
                <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 rounded-lg px-3 py-1.5 flex-1 text-center border border-rose-100">
                    <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Defect</div>
                    <div className="text-sm font-black text-rose-700">{stats.totalDefect.toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-lg px-3 py-1.5 flex-1 text-center border border-amber-100">
                    <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Rate</div>
                    <div className="text-sm font-black text-amber-700">{stats.defectRate}%</div>
                </div>
            </div>

            {/* Auto-Scrolling Progress Bars */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-hidden no-scrollbar"
                style={{ minHeight: 0 }}
            >
                <div className="space-y-1.5">
                    {defectByProcess.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 group">
                            {/* Rank */}
                            <span className="text-[9px] font-black text-slate-400 w-3 text-right">#{idx + 1}</span>

                            {/* Process Name */}
                            <span className="text-[11px] text-slate-700 w-16 truncate font-semibold">{item.process}</span>

                            {/* Progress Bar */}
                            <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full bg-gradient-to-r ${item.gradient} flex items-center justify-end pr-2 transition-all duration-700`}
                                    style={{ width: `${Math.max(item.percentage, 10)}%` }}
                                >
                                    <span className="text-[9px] text-white font-bold drop-shadow-sm">{item.defectCount}</span>
                                </div>
                            </div>

                            {/* Percentage */}
                            <span className="text-[10px] font-black text-slate-700 w-10 text-right">{item.percentage}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default memo(DefectRejectBarChart);
