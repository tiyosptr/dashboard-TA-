'use client';

import { memo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ChevronDown, RefreshCw, TrendingUp, BarChart3 } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ActualOutputProps {
    className?: string;
    // Props from SWR hook (optional for backward compat)
    hourlyData?: {
        hour_slot: string | null;
        output: number;
        reject: number;
        target_output: number;
        [key: string]: unknown;
    }[];
    summary?: {
        totalOutput: number;
        totalReject: number;
        totalProduced: number;
        yieldRate: number;
    };
    isLoading?: boolean;
    isValidating?: boolean;
    onRefresh?: () => void;
}

function ActualOutput({
    className = '',
    hourlyData = [],
    summary,
    isLoading = false,
    isValidating = false,
}: ActualOutputProps) {
    const hourSlots = Array.from({ length: 24 }, (_, i) => {
        const start = i.toString().padStart(2, '0') + ':00';
        const end = (i + 1).toString().padStart(2, '0') + ':00';
        return `${start}-${end}`;
    });

    const outputByHour = hourSlots.map(slot => {
        const record = hourlyData.find(d => d.hour_slot === slot);
        return record ? Number(record.output) : 0;
    });

    const rejectByHour = hourSlots.map(slot => {
        const record = hourlyData.find(d => d.hour_slot === slot);
        return record ? Number(record.reject) : 0;
    });

    const totalGood = summary?.totalOutput ?? outputByHour.reduce((a, b) => a + b, 0);
    const totalReject = summary?.totalReject ?? rejectByHour.reduce((a, b) => a + b, 0);
    const totalOutput = summary?.totalProduced ?? (totalGood + totalReject);
    const yieldRate = summary?.yieldRate ?? (totalOutput > 0 ? ((totalGood / totalOutput) * 100) : 100);

    const chartData = {
        labels: hourSlots.map(slot => slot.split('-')[0]),
        datasets: [
            {
                label: 'Good Output',
                data: outputByHour,
                backgroundColor: (context: any) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return 'rgba(99, 102, 241, 0.85)';
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.95)');
                    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.6)');
                    return gradient;
                },
                hoverBackgroundColor: 'rgba(99, 102, 241, 1)',
                borderRadius: 8,
                borderSkipped: false,
            },
            {
                label: 'Reject/NG',
                data: rejectByHour,
                backgroundColor: (context: any) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return 'rgba(244, 63, 94, 0.85)';
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(244, 63, 94, 0.95)');
                    gradient.addColorStop(1, 'rgba(244, 63, 94, 0.6)');
                    return gradient;
                },
                hoverBackgroundColor: 'rgba(244, 63, 94, 1)',
                borderRadius: 8,
                borderSkipped: false,
            },
        ],
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
                padding: 12,
                cornerRadius: 10,
                displayColors: true,
                titleFont: { size: 11, weight: 'bold' as const },
                bodyFont: { size: 11 },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: { font: { size: 10 }, color: '#94a3b8' },
            },
            y: {
                grid: { color: 'rgba(226, 232, 240, 0.5)', drawBorder: false },
                border: { display: false },
                ticks: { stepSize: 20, font: { size: 10 }, color: '#94a3b8' },
            },
        },
    };

    if (isLoading && hourlyData.length === 0) {
        return (
            <div className={`chart-card p-4 flex flex-col h-full w-full overflow-hidden ${className}`}>
                <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-2">
                        <RefreshCw size={18} className="text-indigo-400 animate-spin" />
                        <span className="text-xs text-slate-500 font-medium">Loading production data...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`chart-card p-4 flex flex-col h-full w-full overflow-hidden ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                        <BarChart3 size={14} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xs font-bold text-slate-800 tracking-wide">ACTUAL OUTPUT</h2>
                        <p className="text-[9px] text-slate-400 -mt-0.5">Hourly production tracking</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="stat-badge stat-badge-success">
                        <TrendingUp size={9} />
                        {yieldRate.toFixed(1)}% yield
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-4 mb-2.5 flex-shrink-0">
                <div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">{totalOutput.toLocaleString('id-ID')}</div>
                    <div className="text-[10px] text-slate-400 font-medium">Total Output</div>
                </div>
                <div className="h-8 w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent" />
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.95), rgba(99,102,241,0.6))' }}></div>
                        <span className="text-xs text-slate-600 font-medium">Pass: <span className="font-bold text-indigo-600">{totalGood.toLocaleString('id-ID')}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded" style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.95), rgba(244,63,94,0.6))' }}></div>
                        <span className="text-xs text-slate-600 font-medium">Reject: <span className="font-bold text-rose-600">{totalReject.toLocaleString('id-ID')}</span></span>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0">
                <Bar data={chartData} options={options} />
            </div>

            {hourlyData.length === 0 && !isLoading && (
                <div className="text-center text-slate-400 text-xs mt-1 font-medium">No data available for this period</div>
            )}
        </div>
    );
}

// React.memo prevents re-renders when props haven't changed
export default memo(ActualOutput);
