'use client';

import { memo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Plugin } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Gauge } from 'lucide-react';
import { calculateOEE } from '@/utils/helpers';

ChartJS.register(ArcElement, Tooltip, Legend);

interface OEEChartProps {
    width?: string | number;
    height?: string | number;
    className?: string;
    // Props from SWR hook
    oeeData?: {
        availability: number;
        performance: number;
        quality: number;
        oee: number;
    };
    isLoading?: boolean;
}

function OEEChart({
    width = '100%',
    height = '100%',
    className = '',
    oeeData,
    isLoading = false,
}: OEEChartProps) {
    const availability = oeeData?.availability ?? 0;
    const performance = oeeData?.performance ?? 0;
    const quality = oeeData?.quality ?? 0;
    const oeeValue = oeeData?.oee ?? calculateOEE(availability, performance, quality);

    const metricItems = [
        { label: 'Availability', value: availability, color: '#f43f5e', bgLight: 'bg-rose-50 border-rose-100' },
        { label: 'Performance', value: performance, color: '#a78bfa', bgLight: 'bg-violet-50 border-violet-100' },
        { label: 'Quality', value: quality, color: '#6366f1', bgLight: 'bg-indigo-50 border-indigo-100' },
    ];

    const percentagePlugin: Plugin<'doughnut'> = {
        id: 'percentageOnRing',
        afterDatasetsDraw(chart) {
            const { ctx, data } = chart;
            const dataset = data.datasets[0];
            const meta = chart.getDatasetMeta(0);

            meta.data.forEach((arc: any, index) => {
                const value = dataset.data[index] as number;
                const centerAngle = (arc.startAngle + arc.endAngle) / 2;
                const radius = (arc.outerRadius + arc.innerRadius) / 2;

                const x = chart.getDatasetMeta(0).data[0].x + Math.cos(centerAngle) * radius;
                const y = chart.getDatasetMeta(0).data[0].y + Math.sin(centerAngle) * radius;

                ctx.save();
                ctx.font = 'bold 10px Inter, sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.shadowBlur = 3;
                ctx.fillText(`${value.toFixed(0)}%`, x, y);
                ctx.restore();
            });
        },
    };

    const chartDataConfig = {
        labels: metricItems.map(d => d.label),
        datasets: [{
            data: metricItems.map(d => d.value),
            backgroundColor: metricItems.map(d => d.color),
            borderWidth: 0,
            cutout: '68%',
            spacing: 3,
        }],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleColor: '#fff',
                bodyColor: '#e2e8f0',
                borderColor: 'rgba(99, 102, 241, 0.3)',
                borderWidth: 1,
                padding: 10,
                cornerRadius: 10,
                callbacks: {
                    label: (context: any) => `${context.label}: ${context.parsed.toFixed(1)}%`,
                },
            },
        },
    };

    const getOEEColor = (value: number) =>
        value >= 85 ? 'text-emerald-600' : value >= 60 ? 'text-amber-500' : 'text-rose-600';

    const getOEEBg = (value: number) =>
        value >= 85 ? 'stat-badge-success' : value >= 60 ? 'stat-badge-warning' : 'stat-badge-danger';

    const getOEEStatus = (value: number) =>
        value >= 85 ? '🏆 World Class' : value >= 60 ? '✅ Good' : value >= 40 ? '⚠️ Fair' : '🔴 Poor';

    if (isLoading && !oeeData) {
        return (
            <div className={`chart-card p-3 h-full flex flex-col items-center justify-center overflow-hidden ${className}`}>
                <Gauge size={20} className="text-indigo-300 animate-pulse mb-1" />
                <div className="text-xs text-slate-400 font-medium">Calculating OEE...</div>
            </div>
        );
    }

    return (
        <div className={`chart-card p-3 h-full flex flex-col overflow-hidden ${className}`} style={{ width, height }}>
            <div className="flex items-center justify-between mb-1 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                    <Gauge size={13} className="text-indigo-500" />
                    <h2 className="text-xs font-bold text-slate-800 tracking-wider">OEE</h2>
                </div>
                <span className={`stat-badge ${getOEEBg(oeeValue)}`}>{getOEEStatus(oeeValue)}</span>
            </div>

            <div className="flex-shrink-0 mb-1">
                <div className={`text-xl font-black ${getOEEColor(oeeValue)} tracking-tight`}>{oeeValue.toFixed(2)}%</div>
                <div className="text-[9px] text-slate-400 font-medium">Overall Equipment Effectiveness</div>
            </div>

            <div className="flex-1 flex items-center justify-center relative min-h-0">
                <Doughnut data={chartDataConfig} options={options} plugins={[percentagePlugin]} />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className={`text-sm font-black ${getOEEColor(oeeValue)}`}>{oeeValue.toFixed(1)}%</div>
                </div>
            </div>

            <div className="flex-shrink-0 mt-1.5 space-y-1">
                {metricItems.map(item => (
                    <div key={item.label} className={`flex items-center justify-between text-[10px] px-2 py-0.5 rounded-lg ${item.bgLight} border`}>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }}></div>
                            <span className="text-slate-700 font-medium">{item.label}</span>
                        </div>
                        <span className="font-bold text-slate-800">{item.value.toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default memo(OEEChart);
