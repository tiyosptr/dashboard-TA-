'use client';

import { memo, useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    LineElement,
    PointElement,
    LineController,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Bar } from 'react-chartjs-2';
import { RefreshCw, TrendingUp, BarChart3, Target } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    LineController,
    Title,
    Tooltip,
    Legend,
    annotationPlugin,
);

interface ActualOutputProps {
    className?: string;
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

    const hourlyTarget = useMemo(() => {
        const record = hourlyData.find(d => d.target_output && d.target_output > 0);
        const dailyTarget = record ? Number(record.target_output) : 1000;
        const WORKING_HOURS = 10;
        return Math.round(dailyTarget / WORKING_HOURS);
    }, [hourlyData]);

    const totalGood = summary?.totalOutput ?? outputByHour.reduce((a, b) => a + b, 0);
    const totalReject = summary?.totalReject ?? rejectByHour.reduce((a, b) => a + b, 0);
    const totalOutput = summary?.totalProduced ?? (totalGood + totalReject);
    const yieldRate = summary?.yieldRate ?? (totalOutput > 0 ? ((totalGood / totalOutput) * 100) : 100);

    const maxBarValue = Math.max(
        ...outputByHour.map((output, i) => output + rejectByHour[i]),
        hourlyTarget,
        0
    );

    // Count hours exceeding target
    const hoursOverTarget = outputByHour.reduce((count, output, i) => {
        const total = output + rejectByHour[i];
        return total > hourlyTarget ? count + 1 : count;
    }, 0);

    const hoursWithData = outputByHour.filter((o, i) => (o + rejectByHour[i]) > 0).length;

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

    // Custom plugin: draws a subtle gradient zone above the target line
    const targetZonePlugin = {
        id: 'targetZone',
        beforeDraw: (chart: any) => {
            const { ctx, chartArea, scales } = chart;
            if (!chartArea || !scales?.y) return;

            const yPixel = scales.y.getPixelForValue(hourlyTarget);
            if (yPixel < chartArea.top || yPixel > chartArea.bottom) return;

            // Draw a soft gradient fill from target line upward (the "danger zone")
            const zoneGradient = ctx.createLinearGradient(0, chartArea.top, 0, yPixel);
            zoneGradient.addColorStop(0, 'rgba(251, 146, 60, 0.06)');
            zoneGradient.addColorStop(0.7, 'rgba(251, 146, 60, 0.03)');
            zoneGradient.addColorStop(1, 'rgba(251, 146, 60, 0)');

            ctx.save();
            ctx.fillStyle = zoneGradient;
            ctx.fillRect(chartArea.left, chartArea.top, chartArea.width, yPixel - chartArea.top);
            ctx.restore();
        },
    };

    const options: any = {
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
                callbacks: {
                    afterBody: (tooltipItems: any[]) => {
                        const index = tooltipItems[0]?.dataIndex;
                        if (index !== undefined) {
                            const totalSlot = outputByHour[index] + rejectByHour[index];
                            const diff = totalSlot - hourlyTarget;
                            const lines = [``, `── Batas Target ──`, `🎯 Target/Jam: ${hourlyTarget} pcs`];
                            if (diff > 0) {
                                lines.push(`🔴 Melebihi: +${diff} pcs`);
                            } else if (diff < 0) {
                                lines.push(`🟢 Sisa: ${Math.abs(diff)} pcs`);
                            } else {
                                lines.push(`✅ Tepat di target`);
                            }
                            return lines;
                        }
                        return [];
                    },
                },
            },
            annotation: {
                annotations: {
                    // Main target line — sleek, semi-transparent with refined styling
                    targetLine: {
                        type: 'line' as const,
                        yMin: hourlyTarget,
                        yMax: hourlyTarget,
                        borderColor: 'rgba(234, 88, 12, 0.55)',
                        borderWidth: 1.5,
                        borderDash: [6, 3],
                        drawTime: 'afterDatasetsDraw' as const,
                        label: {
                            display: true,
                            content: `🎯 Max Output/Jam: ${hourlyTarget}`,
                            position: 'end' as const,
                            backgroundColor: 'rgba(234, 88, 12, 0.85)',
                            backgroundShadowColor: 'rgba(234, 88, 12, 0.15)',
                            shadowBlur: 8,
                            color: '#fff',
                            font: {
                                size: 9,
                                weight: 'bold' as const,
                                family: "'Inter', 'system-ui', sans-serif",
                            },
                            padding: { top: 3, bottom: 3, left: 6, right: 6 },
                            borderRadius: 6,
                            yAdjust: -12,
                        },
                    },
                    // Thin Y-axis tick mark on the left edge for the target value
                    targetTick: {
                        type: 'line' as const,
                        xMin: -0.6,
                        xMax: -0.3,
                        yMin: hourlyTarget,
                        yMax: hourlyTarget,
                        borderColor: 'rgba(234, 88, 12, 0.7)',
                        borderWidth: 2.5,
                    },
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: { font: { size: 10 }, color: '#94a3b8' },
            },
            y: {
                grid: {
                    color: (context: any) => {
                        // Make the grid line at the target value slightly highlighted
                        return 'rgba(226, 232, 240, 0.5)';
                    },
                    drawBorder: false,
                },
                border: { display: false },
                ticks: {
                    font: { size: 10 },
                    color: (context: any) => {
                        // Highlight the Y-axis tick that's closest to the target
                        if (context.tick && Math.abs(context.tick.value - hourlyTarget) < 5) {
                            return 'rgba(234, 88, 12, 0.8)';
                        }
                        return '#94a3b8';
                    },
                    callback: (value: number) => {
                        // Show the exact target value on the Y axis if it's close
                        if (Math.abs(value - hourlyTarget) < 5 && value !== hourlyTarget) {
                            return '';
                        }
                        return value;
                    },
                },
                suggestedMax: Math.ceil((maxBarValue * 1.15) / 10) * 10,
                afterBuildTicks: (axis: any) => {
                    // Inject the exact target value as a Y-axis tick
                    if (axis.ticks && !axis.ticks.find((t: any) => t.value === hourlyTarget)) {
                        axis.ticks.push({ value: hourlyTarget });
                        axis.ticks.sort((a: any, b: any) => a.value - b.value);
                    }
                },
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
            <div className="flex items-center gap-3 mb-2.5 flex-shrink-0">
                <div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">{totalOutput.toLocaleString('id-ID')}</div>
                    <div className="text-[10px] text-slate-400 font-medium">Total Output</div>
                </div>
                <div className="h-8 w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent" />

                {/* Legend items */}
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Pass legend */}
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.95), rgba(99,102,241,0.6))' }}></div>
                        <span className="text-[11px] text-slate-500">Pass <span className="font-bold text-indigo-600">{totalGood.toLocaleString('id-ID')}</span></span>
                    </div>
                    {/* Reject legend */}
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.95), rgba(244,63,94,0.6))' }}></div>
                        <span className="text-[11px] text-slate-500">Reject <span className="font-bold text-rose-600">{totalReject.toLocaleString('id-ID')}</span></span>
                    </div>

                    <div className="h-4 w-px bg-slate-200" />

                    {/* Target line legend — matches the actual annotation style */}
                    <div className="flex items-center gap-1.5">
                        <svg width="18" height="10" viewBox="0 0 18 10" className="flex-shrink-0">
                            <line x1="0" y1="5" x2="18" y2="5" stroke="rgba(234, 88, 12, 0.55)" strokeWidth="1.5" strokeDasharray="4 2" />
                        </svg>
                        <span className="text-[11px] text-slate-500">
                            Target <span className="font-bold text-orange-600">{hourlyTarget}/jam</span>
                        </span>
                    </div>

                    {/* Over-target indicator */}
                    {hoursOverTarget > 0 && (
                        <>
                            <div className="h-4 w-px bg-slate-200" />
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-50 rounded-md border border-orange-200/50">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                <span className="text-[10px] font-semibold text-orange-600">
                                    {hoursOverTarget}/{hoursWithData} jam melebihi target
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0">
                <Bar data={chartData} options={options} plugins={[targetZonePlugin]} />
            </div>

            {hourlyData.length === 0 && !isLoading && (
                <div className="text-center text-slate-400 text-xs mt-1 font-medium">No data available for this period</div>
            )}
        </div>
    );
}

export default memo(ActualOutput);
