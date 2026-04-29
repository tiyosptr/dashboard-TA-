'use client';
import { memo } from 'react';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { History, Calendar, Loader2 } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface HistoryChartProps {
    width?: string | number;
    height?: string | number;
    className?: string;
    lineId?: string | null;
    // Accept data from parent (useDashboardData)
    historyData?: Array<{
        date: string; // YYYY-MM-DD
        maintenance: number; // Minutes (changed from hours)
        downtime: number; // Minutes (changed from hours)
        reject: number; // Count
    }>;
    isLoading?: boolean;
    onRefresh?: () => void;
}

function HistoryChart({ 
    width = '100%', 
    height = '100%', 
    className = '',
    lineId,
    historyData,
    isLoading = false,
    onRefresh
}: HistoryChartProps) {
    
    console.log('[History Component] Received data:', historyData);

    // Handle loading state
    if (isLoading) {
        return (
            <div
                className={`chart-card p-4 flex flex-col h-full w-full overflow-hidden ${className}`}
                style={{ width, height }}
            >
                <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
                        <History size={13} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xs font-bold text-slate-800 tracking-wide">HISTORY</h2>
                        <p className="text-[9px] text-slate-400">Last 7 Days</p>
                    </div>
                </div>
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                </div>
            </div>
        );
    }

    // Handle no data state
    if (!historyData || historyData.length === 0) {
        return (
            <div
                className={`chart-card p-4 flex flex-col h-full w-full overflow-hidden ${className}`}
                style={{ width, height }}
            >
                <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
                        <History size={13} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xs font-bold text-slate-800 tracking-wide">HISTORY</h2>
                        <p className="text-[9px] text-slate-400">Last 7 Days</p>
                    </div>
                </div>
                <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-slate-400">No data available</p>
                </div>
            </div>
        );
    }

    // Format labels from "2026-04-26" to "26 Apr"
    const labels = historyData.map(d => {
        const dateObj = new Date(d.date + 'T00:00:00');
        const day = dateObj.getDate();
        const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
        return `${day} ${month}`;
    });

    // Get date range for display
    const firstDate = historyData[0]?.date;
    const lastDate = historyData[historyData.length - 1]?.date;
    const dateRangeText = firstDate && lastDate 
        ? `${new Date(firstDate + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} - ${new Date(lastDate + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`
        : 'Last 7 Days';

    const data = {
        labels,
        datasets: [
            {
                label: 'Maintenance',
                data: historyData.map(d => d.maintenance),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.06)',
                borderWidth: 2.5,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                fill: true,
            },
            {
                label: 'Downtime',
                data: historyData.map(d => d.downtime),
                borderColor: '#a78bfa',
                backgroundColor: '#a78bfa',
                borderWidth: 2.5,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#a78bfa',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
            },
            {
                label: 'Reject',
                data: historyData.map(d => d.reject),
                borderColor: '#f43f5e',
                backgroundColor: '#f43f5e',
                borderWidth: 2.5,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#f43f5e',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
            },
        ],
    };

    console.log('[History Component] Chart data:', {
        labels,
        maintenance: data.datasets[0].data,
        downtime: data.datasets[1].data,
        reject: data.datasets[2].data,
    });

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'bottom' as const,
                labels: {
                    boxWidth: 8,
                    boxHeight: 8,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 10,
                    font: { size: 10, weight: 500 as any },
                },
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleColor: '#fff',
                bodyColor: '#e2e8f0',
                borderColor: 'rgba(99, 102, 241, 0.3)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 10,
                titleFont: { size: 11, weight: 'bold' as const },
                bodyFont: { size: 11 },
                callbacks: {
                    label: function(context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            // Format based on dataset
                            if (context.datasetIndex === 2) {
                                // Reject is count
                                label += context.parsed.y;
                            } else {
                                // Maintenance and Downtime are in minutes
                                label += context.parsed.y.toFixed(1) + ' min';
                            }
                        }
                        return label;
                    }
                }
            },
        },
        scales: {
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: { font: { size: 10 }, color: '#94a3b8' },
            },
            y: {
                grid: { color: 'rgba(226, 232, 240, 0.5)' },
                border: { display: false },
                ticks: { font: { size: 10 }, color: '#94a3b8' },
            },
        },
    };

    return (
        <div
            className={`chart-card p-4 flex flex-col h-full w-full overflow-hidden ${className}`}
            style={{ width, height }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
                        <History size={13} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xs font-bold text-slate-800 tracking-wide">HISTORY</h2>
                        <p className="text-[9px] text-slate-400">Last 7 Days</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-lg border border-slate-200">
                    <Calendar size={10} className="text-slate-400" />
                    <span className="text-[9px] text-slate-500 font-semibold">{dateRangeText}</span>
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0">
                <Line data={data} options={options} />
            </div>
        </div>
    );
}

export default memo(HistoryChart);
