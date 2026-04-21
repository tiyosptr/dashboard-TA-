'use client';

import { memo, useEffect, useState, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale,
    PointElement, LineElement,
    Tooltip, Filler, Legend,
} from 'chart.js';
import { ArrowUpRight, RefreshCw } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend);

// ─── Types ────────────────────────────────────────────────────────────────────

interface ThroughputLineRecord {
    id: string;
    actual_trougput: number | null;
    actual_troughput: number | null;
    total_pass: number | null;
    rate: number | null;
    eff: number | null;
    created_at: string;
}

interface ThroughputData {
    latest: ThroughputLineRecord | null;
    history: ThroughputLineRecord[];
}

interface ThroughputChartProps {
    className?: string;
    lineId?: string | null;
    /** Optional: pre-fetched data from /api/dashboard/summary (avoids duplicate request) */
    throughputData?: ThroughputData;
}

// ─── Hook: fallback fetcher (used only when throughputData prop is absent) ────

function useLineThroughput(lineId: string | null | undefined, skip: boolean) {
    const [records, setRecords] = useState<ThroughputLineRecord[]>([]);
    const [latest, setLatest] = useState<ThroughputLineRecord | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchData = useCallback(async () => {
        if (!lineId || skip) return;
        setIsLoading(true);
        try {
            const [latestRes, historyRes] = await Promise.all([
                fetch(`/api/dashboard/line-throughput?lineId=${lineId}`, { cache: 'no-store' }),
                fetch(`/api/dashboard/line-throughput?lineId=${lineId}&history=true&limit=20`, { cache: 'no-store' }),
            ]);

            if (latestRes.ok) {
                const j = await latestRes.json();
                if (j.success && j.data) setLatest(j.data);
            }

            if (historyRes.ok) {
                const j = await historyRes.json();
                if (j.success && Array.isArray(j.data)) {
                    setRecords([...j.data].reverse()); // oldest → newest
                }
            }

            setLastUpdated(new Date());
        } catch (err) {
            console.error('[ThroughputChart] Fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [lineId, skip]);

    // Poll every 10 s only when not relying on parent data
    useEffect(() => {
        if (skip) return;
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData, skip]);

    // WebSocket realtime update
    useEffect(() => {
        if (!lineId || skip) return;
        let ws: WebSocket | null = null;
        try {
            ws = new WebSocket('ws://localhost:3001');
            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'LINE_THROUGHPUT_UPDATE' &&
                        (!msg.line_id || msg.line_id === lineId)) {
                        fetchData();
                    }
                } catch { /* ignore */ }
            };
        } catch { /* WS not available */ }
        return () => { ws?.close(); };
    }, [lineId, fetchData, skip]);

    return { records, latest, isLoading, lastUpdated, refetch: fetchData };
}

// ─── Component ────────────────────────────────────────────────────────────────

function ThroughputChart({ className = '', lineId, throughputData }: ThroughputChartProps) {
    // If parent already passes data, skip internal fetching
    const hasPropData = throughputData !== undefined;
    const { records: fetchedRecords, latest: fetchedLatest, isLoading, lastUpdated, refetch } =
        useLineThroughput(lineId, hasPropData);

    // Resolve: prefer prop data, fallback to internally fetched
    const records = hasPropData ? (throughputData?.history ?? []) : fetchedRecords;
    const latest = hasPropData ? (throughputData?.latest ?? null) : fetchedLatest;


    const hasData = records.length > 0;

    // ── Chart data ────────────────────────────────────────────────────────
    // Ambil max 10 titik terakhir agar label tidak terlalu padat
    const displayRecords = records.slice(-10);

    const labels = displayRecords.map(r =>
        r.created_at
            ? new Date(r.created_at).toLocaleTimeString('id-ID', {
                hour: '2-digit', minute: '2-digit',
            })
            : '—'
    );

    const values = displayRecords.map(r => Number(r.actual_troughput ?? 0));

    const maxVal = Math.max(...values, 1);
    const yMax = Math.ceil(maxVal * 1.5 / 5) * 5; // bulatkan ke kelipatan 5

    const data = {
        labels,
        datasets: [{
            data: values,
            borderColor: '#6366f1',
            backgroundColor: (context: any) => {
                const chart = context.chart;
                const { ctx, chartArea } = chart;
                if (!chartArea) return 'rgba(99,102,241,0.08)';
                const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                gradient.addColorStop(0, 'rgba(99,102,241,0.22)');
                gradient.addColorStop(0.6, 'rgba(99,102,241,0.06)');
                gradient.addColorStop(1, 'rgba(99,102,241,0.01)');
                return gradient;
            },
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: displayRecords.length <= 3 ? 4 : 2,
            pointHoverRadius: 5,
            pointBackgroundColor: '#6366f1',
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
        }],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        interaction: { mode: 'index' as const, intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15,23,42,0.95)',
                titleColor: '#fff',
                bodyColor: '#e2e8f0',
                borderColor: 'rgba(99,102,241,0.3)',
                borderWidth: 1,
                padding: 8,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    label: (ctx: any) => `Throughput: ${(ctx.parsed.y ?? 0).toFixed(1)} unit/jam`,
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: {
                    font: { size: 8 },
                    color: '#94a3b8',
                    maxRotation: 0,
                    maxTicksLimit: 5,
                },
            },
            y: {
                min: 0,
                max: yMax,
                grid: { color: 'rgba(226,232,240,0.5)' },
                border: { display: false },
                ticks: {
                    font: { size: 8 },
                    color: '#94a3b8',
                    maxTicksLimit: 4,
                },
            },
        },
    };

    // ── Stats ─────────────────────────────────────────────────────────────
    const currentRate = latest ? Number(latest.actual_troughput ?? 0) : 0;
    const totalPass = latest ? Number(latest.total_pass ?? 0) : 0;
    const efficiency = latest ? Number(latest.eff ?? 0) : 0;

    return (
        <div className={`chart-card p-3 flex flex-col h-full w-full overflow-hidden ${className}`}>

            {/* Header */}
            <div className="flex items-center justify-between mb-1 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                    <ArrowUpRight size={13} className="text-indigo-500" strokeWidth={2.5} />
                    <h3 className="text-xs font-bold text-slate-800 tracking-wider">THROUGHPUT</h3>
                </div>
                <div className="flex items-center gap-1">
                    {isLoading && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />}
                    {lastUpdated && lineId && (
                        <span className="text-[8px] text-slate-400 tabular-nums">
                            {lastUpdated.toLocaleTimeString('id-ID', {
                                hour: '2-digit', minute: '2-digit', second: '2-digit',
                            })}
                        </span>
                    )}
                    {!lineId && <span className="text-[8px] text-slate-400 italic">Pilih Line</span>}
                    <button
                        onClick={refetch}
                        disabled={isLoading || !lineId}
                        className="p-0.5 rounded hover:bg-slate-100 transition-colors disabled:opacity-40"
                        title="Refresh"
                    >
                        <RefreshCw
                            size={10}
                            className={`text-slate-400 ${isLoading ? 'animate-spin' : ''}`}
                        />
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex gap-1.5 mb-1.5 flex-shrink-0">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-lg px-2 py-1 flex-1 border border-indigo-100 min-w-0">
                    <div className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider">Rate</div>
                    <div className="text-xs font-black text-indigo-700 truncate">
                        {lineId && hasData ? `${currentRate.toFixed(1)}/jam` : '—'}
                    </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-lg px-2 py-1 flex-1 border border-emerald-100 min-w-0">
                    <div className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider">Total Pass</div>
                    <div className="text-xs font-black text-emerald-700 truncate">
                        {lineId && hasData ? totalPass.toLocaleString('id-ID') : '—'}
                    </div>
                </div>
                <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-lg px-2 py-1 flex-1 border border-violet-100 min-w-0">
                    <div className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider">Eff</div>
                    <div className="text-xs font-black text-violet-700 truncate">
                        {lineId && hasData ? `${efficiency.toFixed(1)}%` : '—'}
                    </div>
                </div>
            </div>

            {/* Chart — mengikuti pola cycle-time: flex-1 min-h-0 + <Line /> */}
            <div className="flex-1 min-h-0">
                {!lineId ? (
                    <div className="h-full flex items-center justify-center">
                        <p className="text-[10px] text-slate-400 italic text-center leading-relaxed">
                            Pilih line produksi<br />untuk melihat throughput
                        </p>
                    </div>
                ) : (
                    <Line data={data} options={options} />
                )}
            </div>

        </div>
    );
}

export default memo(ThroughputChart);
