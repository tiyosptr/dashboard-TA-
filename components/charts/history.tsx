'use client';
import { memo } from 'react';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { History, Calendar } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface HistoryChartProps {
    width?: string | number;
    height?: string | number;
    className?: string;
}

function HistoryChart({ width = '100%', height = '100%', className = '' }: HistoryChartProps) {
    const data = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun'],
        datasets: [
            {
                label: 'Maintenance',
                data: [80, 100, 90, 110, 95, 140],
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
                data: [120, 110, 140, 100, 130, 90],
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
                data: [140, 130, 110, 150, 120, 145],
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
            },
        },
        scales: {
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: { font: { size: 10 }, color: '#94a3b8' },
            },
            y: {
                min: 0,
                max: 210,
                grid: { color: 'rgba(226, 232, 240, 0.5)' },
                border: { display: false },
                ticks: { stepSize: 70, font: { size: 10 }, color: '#94a3b8' },
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
                        <p className="text-[9px] text-slate-400">6-month overview</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-lg border border-slate-200">
                    <Calendar size={10} className="text-slate-400" />
                    <span className="text-[9px] text-slate-500 font-semibold">Jan - Jun 2024</span>
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
