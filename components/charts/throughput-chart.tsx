'use client';

import { useEffect, useRef, useState } from 'react';
import { Chart, ChartOptions, ChartData } from 'chart.js/auto';
import { Activity, TrendingUp, Clock, Zap } from 'lucide-react';

interface ThroughputChartProps {
    width?: string | number;
    height?: string | number;
    className?: string;
}

interface HourlyData {
    hour: string;
    actual: number;
    target: number;
    efficiency: number;
}

export default function ThroughputChart({
    width = '100%',
    height = 'auto',
    className = '',
}: ThroughputChartProps) {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    // Data throughput per jam
    const hourlyData: HourlyData[] = [
        { hour: '07:00', actual: 445, target: 500, efficiency: 89 },
        { hour: '08:00', actual: 480, target: 500, efficiency: 96 },
        { hour: '09:00', actual: 465, target: 500, efficiency: 93 },
        { hour: '10:00', actual: 510, target: 500, efficiency: 102 },
        { hour: '11:00', actual: 495, target: 500, efficiency: 99 },
        { hour: '12:00', actual: 420, target: 500, efficiency: 84 },
        { hour: '13:00', actual: 488, target: 500, efficiency: 98 },
        { hour: '14:00', actual: 505, target: 500, efficiency: 101 },
    ];

    // Hitung statistik
    const totalActual = hourlyData.reduce((sum, d) => sum + d.actual, 0);
    const totalTarget = hourlyData.reduce((sum, d) => sum + d.target, 0);
    const avgEfficiency = Math.round(hourlyData.reduce((sum, d) => sum + d.efficiency, 0) / hourlyData.length);
    const currentRate = hourlyData[hourlyData.length - 1].actual;
    const trend = currentRate - hourlyData[hourlyData.length - 2].actual;

    // Chart setup
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
                        label: 'Actual Throughput',
                        data: hourlyData.map(d => d.actual),
                        borderColor: '#5B7FFF',
                        backgroundColor: 'rgba(91, 127, 255, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointBackgroundColor: '#5B7FFF',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                    },
                    {
                        label: 'Target',
                        data: hourlyData.map(d => d.target),
                        borderColor: '#10B981',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                    },
                ],
            };

            const options: ChartOptions<'line'> = {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            boxWidth: 12,
                            boxHeight: 12,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 15,
                            font: { size: 11 },
                        },
                    },
                    tooltip: {
                        backgroundColor: '#fff',
                        titleColor: '#000',
                        bodyColor: '#000',
                        borderColor: '#e5e7eb',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: (context) => {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y;
                                return `${label}: ${value} units/hr`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { font: { size: 10 } },
                    },
                    y: {
                        beginAtZero: true,
                        max: 600,
                        grid: { color: '#f0f0f0' },
                        border: { display: false },
                        ticks: {
                            stepSize: 100,
                            font: { size: 10 },
                            callback: (value) => `${value}`,
                        },
                    },
                },
            };

            chartInstance.current = new Chart(ctx, {
                type: 'line',
                data,
                options,
            });
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
            className={`bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 flex flex-col h-full w-full ${className}`}
            style={{ width, height }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                        <Activity className="text-blue-600" size={16} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Throughput Rate</h3>
                        <p className="text-[10px] sm:text-xs text-gray-500">Production units per hour</p>
                    </div>
                </div>

                <div
                    className={`flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                >
                    <TrendingUp size={10} className={trend < 0 ? 'rotate-180 sm:w-3 sm:h-3' : 'sm:w-3 sm:h-3'} />
                    {Math.abs(trend)} units
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
                <StatCard
                    icon={<Zap size={12} className="text-blue-600 sm:w-3.5 sm:h-3.5" />}
                    label="Current Rate"
                    value={`${currentRate}/hr`}
                    bg="blue"
                />
                <StatCard
                    icon={<Activity size={12} className="text-green-600 sm:w-3.5 sm:h-3.5" />}
                    label="Total Output"
                    value={totalActual.toLocaleString('id-ID')}
                    bg="green"
                />
                <StatCard
                    icon={<Clock size={12} className="text-purple-600 sm:w-3.5 sm:h-3.5" />}
                    label="Avg Efficiency"
                    value={`${avgEfficiency}%`}
                    bg="purple"
                />
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-[150px] relative mb-3 sm:mb-4">
                <canvas ref={chartRef}></canvas>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-gray-200">
                <div className="bg-blue-50 rounded-lg p-2 sm:p-3">
                    <div className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">Actual vs Target</div>
                    <div className="flex items-baseline gap-1 sm:gap-2">
                        <span className="text-lg sm:text-xl font-bold text-blue-600">{totalActual}</span>
                        <span className="text-xs sm:text-sm text-gray-500">/ {totalTarget}</span>
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">
                        {((totalActual / totalTarget) * 100).toFixed(1)}% of target
                    </div>
                </div>

                <div className="bg-green-50 rounded-lg p-2 sm:p-3">
                    <div className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">Performance</div>
                    <div className="text-lg sm:text-xl font-bold text-green-600">{avgEfficiency}%</div>
                    <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">
                        {avgEfficiency >= 95 ? '✓ Excellent' : avgEfficiency >= 85 ? '✓ Good' : '⚠ Below Target'}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    bg,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    bg: string;
}) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-50 border-blue-200',
        green: 'bg-green-50 border-green-200',
        purple: 'bg-purple-50 border-purple-200',
    };

    return (
        <div className={`rounded-lg p-1.5 sm:p-2.5 border ${colors[bg]}`}>
            <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                {icon}
                <span className="text-[10px] sm:text-xs text-gray-600 truncate">{label}</span>
            </div>
            <div className="text-sm sm:text-lg font-bold text-gray-900 truncate">{value}</div>
        </div>
    );
}