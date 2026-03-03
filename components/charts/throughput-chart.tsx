'use client';

import { memo, useEffect, useRef } from 'react';
import {
    Chart, ChartOptions, ChartData,
    CategoryScale, LinearScale, PointElement, LineElement,
    Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { ArrowUpRight } from 'lucide-react';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface ThroughputChartProps {
    width?: string | number;
    height?: string | number;
    className?: string;
}

interface HourlyData {
    hour: string;
    actual: number;
    target: number;
}

function ThroughputChart({
    width = '100%',
    height = 'auto',
    className = '',
}: ThroughputChartProps) {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    const hourlyData: HourlyData[] = [
        { hour: '07', actual: 445, target: 500 },
        { hour: '08', actual: 480, target: 500 },
        { hour: '09', actual: 465, target: 500 },
        { hour: '10', actual: 510, target: 500 },
        { hour: '11', actual: 495, target: 500 },
        { hour: '12', actual: 420, target: 500 },
        { hour: '13', actual: 488, target: 500 },
        { hour: '14', actual: 505, target: 500 },
    ];

    const totalActual = hourlyData.reduce((sum, d) => sum + d.actual, 0);
    const currentRate = hourlyData[hourlyData.length - 1].actual;
    const avgEfficiency = Math.round((totalActual / (hourlyData.length * 500)) * 100);
    const aboveTarget = hourlyData.filter(d => d.actual >= d.target).length;

    useEffect(() => {
        if (!chartRef.current || !chartContainerRef.current) return;
        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        const createChart = () => {
            if (chartInstance.current) chartInstance.current.destroy();

            const data: ChartData<'line'> = {
                labels: hourlyData.map(d => d.hour),
                datasets: [
                    {
                        label: 'Actual',
                        data: hourlyData.map(d => d.actual),
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.08)',
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointBackgroundColor: '#6366f1',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 1.5,
                        pointHoverRadius: 5,
                    },
                    {
                        label: 'Target',
                        data: hourlyData.map(d => d.target),
                        borderColor: '#10b981',
                        borderWidth: 1.5,
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0,
                        pointRadius: 0,
                    },
                ],
            };

            const options: ChartOptions<'line'> = {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: { boxWidth: 8, boxHeight: 8, padding: 6, font: { size: 9 }, usePointStyle: true, pointStyle: 'circle' },
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        titleColor: '#fff',
                        bodyColor: '#e2e8f0',
                        borderColor: 'rgba(99, 102, 241, 0.3)',
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 10,
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { font: { size: 9 }, color: '#94a3b8' },
                    },
                    y: {
                        min: 300,
                        max: 600,
                        grid: { color: 'rgba(226, 232, 240, 0.5)' },
                        border: { display: false },
                        ticks: { font: { size: 9 }, stepSize: 100, color: '#94a3b8' },
                    },
                },
            };

            chartInstance.current = new Chart(ctx, { type: 'line', data, options });
        };

        createChart();

        const resizeObserver = new ResizeObserver(() => createChart());
        resizeObserver.observe(chartContainerRef.current);

        return () => {
            chartInstance.current?.destroy();
            resizeObserver.disconnect();
        };
    }, [hourlyData]);

    return (
        <div
            ref={chartContainerRef}
            className={`chart-card p-3 flex flex-col h-full w-full overflow-hidden ${className}`}
            style={{ width, height }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-1 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                    <ArrowUpRight size={13} className="text-indigo-500" />
                    <h3 className="text-xs font-bold text-slate-800 tracking-wider">THROUGHPUT</h3>
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex gap-1.5 mb-1.5 flex-shrink-0">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-lg px-2 py-1 flex-1 border border-indigo-100">
                    <div className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider">Rate</div>
                    <div className="text-xs font-black text-indigo-700">{currentRate}/hr</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-lg px-2 py-1 flex-1 border border-emerald-100">
                    <div className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider">Total</div>
                    <div className="text-xs font-black text-emerald-700">{totalActual.toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-lg px-2 py-1 flex-1 border border-violet-100">
                    <div className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider">Eff</div>
                    <div className="text-xs font-black text-violet-700">{avgEfficiency}%</div>
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0">
                <canvas ref={chartRef}></canvas>
            </div>
        </div>
    );
}

export default memo(ThroughputChart);
