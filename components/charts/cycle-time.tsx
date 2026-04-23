'use client';

import { memo, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Clock, Zap, RefreshCw } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

// ─── Types ────────────────────────────────────────────────────────────────────

interface CycleTimeHistoryRecord {
    id: string;
    created_at: string;
    actual_cycle_time: number | null;
    line_id: string | null;
    line_process_id: string | null;
    shift_id: string | null;
    actual_output_id: string | null;
}

interface CycleTimeData {
    actual_cycle_time: number | null;
    total_output: number;
    operating_time_seconds: number;
    process_name: string | null;
    line_process_id: string | null;
    shift_name: string | null;
    history: CycleTimeHistoryRecord[];
}

interface CycleTimeProps {
    className?: string;
    /** Data dari /api/dashboard/summary (cycleTimeLine field) */
    cycleTimeData?: CycleTimeData;
    lineId?: string | null;
    isLoading?: boolean;
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatCT(seconds: number | null | undefined): { value: string; unit: string } {
    if (seconds === null || seconds === undefined || seconds <= 0) return { value: '—', unit: '' };
    if (seconds < 60) return { value: seconds.toFixed(1), unit: 'sec' };
    if (seconds < 3600) return { value: (seconds / 60).toFixed(1), unit: 'min' };
    return { value: (seconds / 3600).toFixed(1), unit: 'hour' };
}

function formatOperatingTime(seconds: number): string {
    if (seconds <= 0) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}j ${m}m`;
    return `${m} mnt`;
}

// ─── Component ────────────────────────────────────────────────────────────────

function CycleTime({ className = '', cycleTimeData, lineId, isLoading = false }: CycleTimeProps) {

    const hasData = !!cycleTimeData && (cycleTimeData.history.length > 0 || cycleTimeData.actual_cycle_time !== null);
    const hasLineId = !!lineId;

    // Chart: ambil max 15 titik history terakhir
    const displayHistory = useMemo(() => {
        return (cycleTimeData?.history ?? []).slice(-15);
    }, [cycleTimeData?.history]);

    const labels = displayHistory.map(r =>
        r.created_at
            ? new Date(r.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            : '—'
    );

    const values = displayHistory.map(r => Number(r.actual_cycle_time ?? 0));

    const maxVal = Math.max(...values, 1);
    const yMax = Math.ceil(maxVal * 1.5 / 5) * 5;

    // Tampilkan CT terkini: dari actual_cycle_time prop (live) atau titik terakhir history
    const currentCT = cycleTimeData?.actual_cycle_time
        ?? (displayHistory.length > 0 ? displayHistory[displayHistory.length - 1].actual_cycle_time : null);

    const avgCT = values.length > 0
        ? values.filter(v => v > 0).reduce((a, b) => a + b, 0) / values.filter(v => v > 0).length
        : null;

    const { value: ctValue, unit: ctUnit } = formatCT(currentCT);
    const { value: avgValue } = formatCT(avgCT);

    const totalOutput = cycleTimeData?.total_output ?? 0;
    const operatingTime = cycleTimeData?.operating_time_seconds ?? 0;
    const shiftName = cycleTimeData?.shift_name;

    let chartLabels = labels;
    let chartValues = values;

    if (displayHistory.length === 0) {
        chartLabels = ['—', '—', '—', '—', '—'];
        chartValues = [0, 0, 0, 0, 0];
    } else if (displayHistory.length === 1) {
        chartLabels = [labels[0] + ' ', labels[0]];
        chartValues = [values[0], values[0]];
    }

    // Chart data
    const chartData = {
        labels: chartLabels,
        datasets: [{
            data: chartValues,
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
            pointRadius: displayHistory.length <= 2 ? 4 : 2,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#6366f1',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
            pointBackgroundColor: '#6366f1',
        }],
    };

    const options: any = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        interaction: { mode: 'index' as const, intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleColor: '#fff',
                bodyColor: '#e2e8f0',
                borderColor: 'rgba(99, 102, 241, 0.3)',
                borderWidth: 1,
                padding: 8,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    label: (ctx: any) => {
                        const val = ctx.parsed.y ?? 0;
                        if (val <= 0) return 'CT: —';
                        if (val < 60) return `CT: ${val.toFixed(1)} sec`;
                        if (val < 3600) return `CT: ${(val / 60).toFixed(1)} min`;
                        return `CT: ${(val / 3600).toFixed(1)} hour`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: { font: { size: 8 }, color: '#94a3b8', maxRotation: 0, maxTicksLimit: 5 },
            },
            y: {
                min: 0,
                max: yMax || 10,
                grid: { color: 'rgba(226, 232, 240, 0.5)' },
                border: { display: false },
                ticks: { font: { size: 8 }, color: '#94a3b8', maxTicksLimit: 4 },
            },
        },
    };

    return (
        <div className={`chart-card p-3 flex flex-col h-full w-full overflow-hidden ${className}`}>

            {/* Header */}
            <div className="flex items-center justify-between mb-1 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-indigo-500" />
                    <h2 className="text-xs font-bold text-slate-800 tracking-wider">CYCLE TIME</h2>
                </div>
                <div className="flex items-center gap-1">
                    {isLoading && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />}
                    {!hasLineId && <span className="text-[8px] text-slate-400 italic">Pilih Line</span>}
                    {shiftName && hasLineId && (
                        <span className="text-[8px] text-slate-400 font-medium">{shiftName}</span>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-2 flex-shrink-0 mb-1.5">
                {/* Current CT */}
                <div className="flex items-baseline gap-0.5">
                    <div className="text-xl font-black text-slate-900 tracking-tight">
                        {hasLineId && hasData ? ctValue : '—'}
                    </div>
                    {hasLineId && hasData && ctUnit && (
                        <span className="text-[9px] text-slate-400 font-semibold">{ctUnit}</span>
                    )}
                </div>

                {hasLineId && (
                    <>
                        <div className="h-5 w-px bg-slate-200" />
                        <div className="flex flex-wrap items-center gap-1">
                            {/* Avg */}
                            {avgCT !== null && (
                                <div className="stat-badge stat-badge-info">
                                    <Zap size={8} />
                                    avg {avgValue}
                                </div>
                            )}
                            {/* Total output */}
                            {totalOutput > 0 && (
                                <div className="px-1.5 py-0.5 bg-emerald-50 rounded-md border border-emerald-100">
                                    <span className="text-[9px] font-bold text-emerald-700">
                                        {totalOutput.toLocaleString('id-ID')} unit
                                    </span>
                                </div>
                            )}
                            {/* Operating time */}
                            {operatingTime > 0 && (
                                <div className="px-1.5 py-0.5 bg-indigo-50 rounded-md border border-indigo-100">
                                    <span className="text-[9px] font-bold text-indigo-700">
                                        {formatOperatingTime(operatingTime)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0">
                {!hasLineId ? (
                    <div className="h-full flex items-center justify-center">
                        <p className="text-[10px] text-slate-400 italic text-center leading-relaxed">
                            Pilih line produksi<br />untuk melihat cycle time
                        </p>
                    </div>
                ) : isLoading && !hasData ? (
                    <div className="h-full flex items-center justify-center">
                        <RefreshCw size={14} className="text-indigo-400 animate-spin" />
                    </div>
                ) : (
                    <Line data={chartData} options={options} />
                )}
            </div>
        </div>
    );
}

export default memo(CycleTime);
