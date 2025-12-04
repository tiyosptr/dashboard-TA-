'use client';
import { useEffect, useRef, useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

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
}

export default function DefectRejectBarChart({
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
        { process: 'Extrusion', defectCount: 420, percentage: 33.7, color: '#EF4444' },
        { process: 'Molding', defectCount: 315, percentage: 25.3, color: '#F59E0B' },
        { process: 'Assembly', defectCount: 245, percentage: 19.6, color: '#3B82F6' },
        { process: 'Coating', defectCount: 178, percentage: 14.3, color: '#8B5CF6' },
        { process: 'Packaging', defectCount: 89, percentage: 7.1, color: '#6B7280' },
        { process: 'Testing', defectCount: 67, percentage: 5.4, color: '#10B981' },
        { process: 'Inspection', defectCount: 33, percentage: 2.6, color: '#F97316' },
        { process: 'Quality Control', defectCount: 25, percentage: 2.0, color: '#EC4899' },
    ];

    // Auto-scroll functionality
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
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!isScrollReady) return;

        const el = scrollRef.current;
        if (!el) return;

        const scrollableHeight = el.scrollHeight / 2;
        if (scrollableHeight <= 10) return;

        const speed = 0.5;

        const animate = () => {
            scrollPositionRef.current += speed;

            if (scrollPositionRef.current >= scrollableHeight) {
                scrollPositionRef.current = 0;
            }

            el.scrollTop = scrollPositionRef.current;
            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isScrollReady]);

    return (
        <div className={`bg-white rounded-xl shadow-sm p-3 flex flex-col h-full w-full overflow-hidden ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <h3 className="font-bold text-gray-900 text-base">Defect by Process</h3>
                <div
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold ${stats.trend < 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                >
                    {stats.trend < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                    {Math.abs(stats.trend)}%
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex gap-3 mb-3 flex-shrink-0">
                <div className="bg-blue-50 rounded-xl px-4 py-2 flex-1 text-center border border-blue-100">
                    <div className="text-xs text-gray-500 font-medium">Produced</div>
                    <div className="text-lg font-bold text-blue-700">{(stats.totalProduced / 1000).toFixed(1)}K</div>
                </div>
                <div className="bg-red-50 rounded-xl px-4 py-2 flex-1 text-center border border-red-100">
                    <div className="text-xs text-gray-500 font-medium">Defect</div>
                    <div className="text-lg font-bold text-red-700">{stats.totalDefect}</div>
                </div>
                <div className="bg-orange-50 rounded-xl px-4 py-2 flex-1 text-center border border-orange-100">
                    <div className="text-xs text-gray-500 font-medium">Rate</div>
                    <div className="text-lg font-bold text-orange-700">{stats.defectRate}%</div>
                </div>
            </div>

            {/* Auto-Scrolling Progress Bars List */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-hidden"
                style={{ minHeight: 0 }}
            >
                <div className="space-y-3">
                    {defectByProcess.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            {/* Process Name */}
                            <span className="text-sm text-gray-700 w-24 truncate font-semibold">{item.process}</span>

                            {/* Progress Bar */}
                            <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                                    style={{
                                        width: `${item.percentage}%`,
                                        backgroundColor: item.color
                                    }}
                                >
                                    <span className="text-xs text-white font-bold drop-shadow">{item.defectCount}</span>
                                </div>
                            </div>

                            {/* Percentage */}
                            <span className="text-sm font-bold text-gray-900 w-14 text-right">{item.percentage}%</span>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                div::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}
