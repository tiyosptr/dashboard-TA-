'use client';

import { memo, useCallback } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Clock, Zap } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

interface CycleTimeProps {
    className?: string;
}

function CycleTime({ className = '' }: CycleTimeProps) {
    const rawData = [4, 5.5, 6, 7, 6.5, 5, 6, 4.5, 5.5, 3];
    const current = rawData[rawData.length - 1];
    const avg = (rawData.reduce((a, b) => a + b, 0) / rawData.length).toFixed(1);

    const data = {
        labels: ['07', '08', '09', '10', '11', '12', '13', '14', '15', '16'],
        datasets: [{
            data: rawData,
            borderColor: '#6366f1',
            backgroundColor: (context: any) => {
                const chart = context.chart;
                const { ctx, chartArea } = chart;
                if (!chartArea) return 'rgba(99, 102, 241, 0.1)';
                const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                gradient.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
                gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.08)');
                gradient.addColorStop(1, 'rgba(99, 102, 241, 0.01)');
                return gradient;
            },
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#6366f1',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
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
                displayColors: false,
                callbacks: { label: (context: any) => `Cycle: ${context.parsed.y}s` },
            },
        },
        scales: {
            x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 9 }, color: '#94a3b8' } },
            y: { min: 0, max: 8, grid: { color: 'rgba(226, 232, 240, 0.5)' }, border: { display: false }, ticks: { stepSize: 4, font: { size: 9 }, color: '#94a3b8' } },
        },
    };

    return (
        <div className={`chart-card p-3 flex flex-col h-full w-full overflow-hidden ${className}`}>
            <div className="flex items-center justify-between mb-1 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-indigo-500" />
                    <h2 className="text-xs font-bold text-slate-800 tracking-wider">CYCLE TIME</h2>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 mb-1.5">
                <div className="text-xl font-black text-slate-900 tracking-tight">
                    {current}<span className="text-xs text-slate-400 font-semibold ml-0.5">sec</span>
                </div>
                <div className="h-5 w-px bg-slate-200" />
                <div className="flex items-center gap-1.5">
                    <div className="stat-badge stat-badge-info"><Zap size={8} />{avg}s avg</div>
                    <div className="px-1.5 py-0.5 bg-emerald-50 rounded-md border border-emerald-100">
                        <span className="text-[9px] font-bold text-emerald-700">120/jam</span>
                    </div>
                </div>
            </div>
            <div className="flex-1 min-h-0"><Line data={data} options={options} /></div>
        </div>
    );
}

export default memo(CycleTime);
