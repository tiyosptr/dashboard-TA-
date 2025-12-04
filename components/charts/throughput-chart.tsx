'use client';

import { useEffect, useRef } from 'react';
import { Chart, ChartOptions, ChartData } from 'chart.js/auto';

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

export default function ThroughputChart({
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
                        borderColor: '#5B7FFF',
                        backgroundColor: 'rgba(91, 127, 255, 0.1)',
                        borderWidth: 1.5,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 2,
                    },
                    {
                        label: 'Target',
                        data: hourlyData.map(d => d.target),
                        borderColor: '#10B981',
                        borderWidth: 1,
                        borderDash: [3, 3],
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
                        labels: { boxWidth: 6, boxHeight: 6, padding: 4, font: { size: 7 } },
                    },
                    tooltip: {
                        backgroundColor: '#fff',
                        titleColor: '#000',
                        bodyColor: '#000',
                        borderColor: '#e5e7eb',
                        borderWidth: 1,
                        padding: 6,
                        titleFont: { size: 8 },
                        bodyFont: { size: 8 },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { font: { size: 8 } },
                    },
                    y: {
                        min: 300,
                        max: 600,
                        grid: { color: '#f0f0f0' },
                        border: { display: false },
                        ticks: { font: { size: 8 }, stepSize: 100 },
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
            className={`bg-white rounded-lg shadow-sm p-1.5 flex flex-col h-full w-full overflow-hidden ${className}`}
            style={{ width, height }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-0.5 flex-shrink-0">
                <h3 className="font-semibold text-gray-900 text-[9px]">Throughput Rate</h3>
            </div>

            {/* Stats - compact row */}
            <div className="flex gap-1 mb-0.5 flex-shrink-0">
                <div className="bg-blue-50 rounded px-1 py-0.5 flex-1">
                    <div className="text-[7px] text-gray-600">Rate</div>
                    <div className="text-[10px] font-bold text-gray-900">{currentRate}/hr</div>
                </div>
                <div className="bg-green-50 rounded px-1 py-0.5 flex-1">
                    <div className="text-[7px] text-gray-600">Total</div>
                    <div className="text-[10px] font-bold text-gray-900">{totalActual}</div>
                </div>
                <div className="bg-purple-50 rounded px-1 py-0.5 flex-1">
                    <div className="text-[7px] text-gray-600">Eff</div>
                    <div className="text-[10px] font-bold text-gray-900">{avgEfficiency}%</div>
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0">
                <canvas ref={chartRef}></canvas>
            </div>
        </div>
    );
}