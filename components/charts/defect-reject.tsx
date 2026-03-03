'use client';
import { memo, useEffect, useRef, useState } from 'react';
import { TrendingDown, TrendingUp, AlertTriangle, ShieldAlert } from 'lucide-react';

interface DefectRejectBarChartProps {
    width?: string | number;
    height?: string | number;
    className?: string;
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
}: DefectRejectBarChartProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isScrollReady, setIsScrollReady] = useState(false);
    const animationRef = useRef<number | null>(null);
    const scrollPositionRef = useRef(0);
    const contentClonedRef = useRef(false);

    const stats = {
        totalProduced: 45780,
        totalDefect: 1247,
        defectRate: 2.72,
        trend: -0.3,
    };

    const defectByProcess: DefectProcess[] = [
        { process: 'Extrusion', defectCount: 420, percentage: 33.7, color: '#ef4444', gradient: 'from-red-500 to-red-400' },
        { process: 'Molding', defectCount: 315, percentage: 25.3, color: '#f59e0b', gradient: 'from-amber-500 to-amber-400' },
        { process: 'Assembly', defectCount: 245, percentage: 19.6, color: '#6366f1', gradient: 'from-indigo-500 to-indigo-400' },
        { process: 'Coating', defectCount: 178, percentage: 14.3, color: '#8b5cf6', gradient: 'from-violet-500 to-violet-400' },
        { process: 'Packaging', defectCount: 89, percentage: 7.1, color: '#64748b', gradient: 'from-slate-500 to-slate-400' },
        { process: 'Testing', defectCount: 67, percentage: 5.4, color: '#10b981', gradient: 'from-emerald-500 to-emerald-400' },
        { process: 'Inspection', defectCount: 33, percentage: 2.6, color: '#f97316', gradient: 'from-orange-500 to-orange-400' },
        { process: 'QC', defectCount: 25, percentage: 2.0, color: '#ec4899', gradient: 'from-pink-500 to-pink-400' },
    ];

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        if (!contentClonedRef.current) {
            const originalContent = el.innerHTML;
            el.innerHTML = originalContent + originalContent;
            contentClonedRef.current = true;
        }

        setIsScrollReady(true);

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, []);

    useEffect(() => {
        if (!isScrollReady) return;

        const el = scrollRef.current;
        if (!el) return;

        const scrollableHeight = el.scrollHeight / 2;
        if (scrollableHeight <= 10) return;

        const speed = 0.4;

        const animate = () => {
            scrollPositionRef.current += speed;
            if (scrollPositionRef.current >= scrollableHeight) scrollPositionRef.current = 0;
            el.scrollTop = scrollPositionRef.current;
            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isScrollReady]);

    return (
        <div className={`chart-card p-3 flex flex-col h-full w-full overflow-hidden ${className}`}>
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
                    <div className="text-sm font-black text-indigo-700">{(stats.totalProduced / 1000).toFixed(1)}K</div>
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
