'use client';
import { memo, useEffect } from 'react';
import useSWR from 'swr';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp, TrendingDown, BarChart3, Loader2 } from 'lucide-react';
import { TrendData } from '@/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface TrendAnalysisProps {
  className?: string;
  lineId?: string | null;
  // Accept data from parent (useDashboardData) - format from API dashboard summary
  trendData?: Array<{
    date: string;
    output: number; // Total produced (pass + reject)
    pass?: number; // Good output only
    reject: number;
    target: number;
    quality: number;
    efficiency: number;
    downtime?: number;
  }>;
  isLoading?: boolean;
  onRefresh?: () => void;
}

// SWR fetcher for fallback
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch trend data');
  return res.json();
};

function TrendAnalysis({ 
  className = '', 
  lineId, 
  trendData: propTrendData,
  isLoading: propIsLoading = false,
  onRefresh
}: TrendAnalysisProps) {
  // Use prop data if available, otherwise fallback to direct API call
  const shouldUseFallback = !propTrendData;
  
  const url = shouldUseFallback && lineId 
    ? `/api/dashboard/trend-analysis?lineId=${lineId}`
    : shouldUseFallback 
    ? '/api/dashboard/trend-analysis'
    : null;

  // Fallback SWR (only used if no prop data)
  const { data: fallbackResult, error, isLoading: fallbackLoading, mutate } = useSWR(
    url,
    fetcher,
    {
      refreshInterval: shouldUseFallback ? 30000 : 0, // Only refresh if using fallback
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      keepPreviousData: true,
      revalidateIfStale: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  // WebSocket for real-time updates (only if using fallback)
  useEffect(() => {
    if (!shouldUseFallback) return; // Parent handles WebSocket

    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      try {
        socket = new WebSocket('ws://localhost:3001');
        
        socket.onopen = () => {
          console.log('[Trend Analysis] WebSocket connected');
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'TREND_ANALYSIS_UPDATE' || data.type === 'DASHBOARD_UPDATE') {
              console.log('[Trend Analysis] Update detected, refreshing data...');
              mutate();
            }
          } catch (err) {
            console.error('[Trend Analysis] WebSocket message parse error:', err);
          }
        };

        socket.onerror = () => {
          // Silently handle error - will retry on close
        };

        socket.onclose = () => {
          console.log('[Trend Analysis] WebSocket disconnected, will retry in 5s...');
          // Retry connection after 5 seconds
          reconnectTimeout = setTimeout(connect, 5000);
        };
      } catch (err) {
        console.warn('[Trend Analysis] Failed to create WebSocket connection, will retry in 5s...');
        reconnectTimeout = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [mutate, shouldUseFallback]);

  // Determine data source and convert format
  const rawTrendData = propTrendData || fallbackResult?.data || [];
  
  console.log('[Trend Component] ========== DATA FLOW DEBUG ==========');
  console.log('[Trend Component] propTrendData:', propTrendData);
  console.log('[Trend Component] fallbackResult?.data:', fallbackResult?.data);
  console.log('[Trend Component] Raw trend data received:', rawTrendData);
  console.log('[Trend Component] Raw data length:', rawTrendData.length);
  
  // Convert data to TrendData format
  const trendData: TrendData[] = rawTrendData.map((item: any, index: number) => {
    console.log(`[Trend Component] Processing item ${index}:`, item);
    
    if (item.date && typeof item.output === 'number') {
      // Data from dashboard summary API or trend-analysis API
      // Keep the full date for label formatting, but also store day number
      const fullDate = item.date; // Keep "2026-04-26" format
      const dateStr = typeof item.date === 'string' && item.date.length === 2 
        ? item.date // Already formatted as "DD"
        : new Date(item.date).getDate().toString().padStart(2, '0');
      
      const converted = {
        date: dateStr, // "26" for internal use
        fullDate: fullDate, // "2026-04-26" for label formatting
        output: item.output,
        pass: item.pass,
        quality: item.quality || 0,
        efficiency: item.efficiency || 0,
        downtime: item.downtime || 0,
        reject: item.reject || 0,
      };
      
      console.log(`[Trend Component] Converted item ${index}:`, { original: item, converted });
      return converted;
    } else {
      // Data from trend-analysis API (fallback) - already in correct format
      console.log(`[Trend Component] Using item ${index} as-is:`, item);
      return item;
    }
  });
  
  console.log('[Trend Component] Final trendData:', trendData);
  console.log('[Trend Component] Final trendData length:', trendData.length);
  console.log('[Trend Component] ========== END DATA FLOW DEBUG ==========');

  const isLoading = propIsLoading || fallbackLoading;

  // Handle refresh
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else if (mutate) {
      mutate();
    }
  };

  // Handle error state (only for fallback)
  if (shouldUseFallback && error) {
    return (
      <div className={`chart-card p-4 flex flex-col h-full w-full overflow-hidden ${className}`}>
        <div className="flex items-center gap-2 mb-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <BarChart3 size={14} className="text-white" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-800 tracking-wide">TREND ANALYSIS</h2>
            <p className="text-[9px] text-slate-400">Last 7 Days Performance</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-rose-500">Failed to load data</p>
        </div>
      </div>
    );
  }

  // Handle loading and no data states
  if (isLoading) {
    return (
      <div className={`chart-card p-4 flex flex-col h-full w-full overflow-hidden ${className}`}>
        <div className="flex items-center gap-2 mb-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <BarChart3 size={14} className="text-white" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-800 tracking-wide">TREND ANALYSIS</h2>
            <p className="text-[9px] text-slate-400">Last 7 Days Performance</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      </div>
    );
  }

  // Handle no data state
  if (trendData.length === 0) {
    console.log('[Trend Component] No data - trendData is empty');
    return (
      <div className={`chart-card p-4 flex flex-col h-full w-full overflow-hidden ${className}`}>
        <div className="flex items-center gap-2 mb-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <BarChart3 size={14} className="text-white" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-800 tracking-wide">TREND ANALYSIS</h2>
            <p className="text-[9px] text-slate-400">Last 7 Days Performance</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-slate-400">No data available</p>
        </div>
      </div>
    );
  }

  // Calculate 7-day totals instead of just showing latest day
  const totalProduced = trendData.reduce((sum, d) => sum + d.output, 0); // Total produced (pass + reject)
  const totalPass = trendData.reduce((sum, d) => sum + (d.pass || (d.output - d.reject)), 0);
  const totalReject = trendData.reduce((sum, d) => sum + d.reject, 0);
  const avgQuality = trendData.reduce((sum, d) => sum + d.quality, 0) / trendData.length;
  const avgEfficiency = trendData.reduce((sum, d) => sum + d.efficiency, 0) / trendData.length;
  
  // Calculate total downtime with detailed logging
  const downtimeValues = trendData.map(d => d.downtime || 0);
  const totalDowntime = downtimeValues.reduce((sum, val) => sum + val, 0);
  
  console.log('[Trend Component] Downtime values per day:', downtimeValues);
  console.log('[Trend Component] Total downtime (raw):', totalDowntime);
  console.log('[Trend Component] Total downtime (formatted):', totalDowntime.toFixed(1));

  const latestData = trendData[trendData.length - 1];
  const previousData = trendData.length > 1 ? trendData[trendData.length - 2] : null;

  console.log('[Trend Component] Latest data:', latestData);
  console.log('[Trend Component] Previous data:', previousData);
  console.log('[Trend Component] 7-day totals:', { 
    totalProduced, 
    totalPass, 
    totalReject, 
    avgQuality, 
    avgEfficiency, 
    totalDowntime 
  });

  const calculateTrend = (current: number, previous: number | null) => {
    if (!previous || previous === 0) return { value: 0, isPositive: current >= 0 };
    const diff = ((current - previous) / previous * 100).toFixed(1);
    return { value: Math.abs(parseFloat(diff)), isPositive: current >= previous };
  };

  const outputTrend = calculateTrend(latestData.output, previousData?.output || null);
  const qualityTrend = calculateTrend(latestData.quality, previousData?.quality || null);
  const efficiencyTrend = calculateTrend(latestData.efficiency, previousData?.efficiency || null);
  const downtimeTrend = calculateTrend(latestData.downtime, previousData?.downtime || null);

  const data = {
    labels: trendData.map(d => {
      // Use fullDate if available, otherwise fall back to date
      const dateStr = d.fullDate || d.date;
      
      // If it's in YYYY-MM-DD format, convert to "DD Mon"
      if (typeof dateStr === 'string' && dateStr.includes('-')) {
        // Parse date and format dynamically
        const dateObj = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
        const day = dateObj.getDate();
        const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
        return `${day} ${month}`;
      } else {
        // Fallback to "Day XX"
        return `Day ${dateStr}`;
      }
    }),
    datasets: [
      {
        label: 'Total Produced',
        data: trendData.map(d => d.output), // Total produced (pass + reject)
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.06)',
        borderWidth: 2.5,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        yAxisID: 'y',
        fill: true,
      },
      {
        label: 'Quality %',
        data: trendData.map(d => d.quality),
        borderColor: '#10b981',
        backgroundColor: '#10b981',
        borderWidth: 2.5,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        yAxisID: 'y1',
      },
      {
        label: 'Efficiency %',
        data: trendData.map(d => d.efficiency),
        borderColor: '#a78bfa',
        backgroundColor: '#a78bfa',
        borderWidth: 2.5,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#a78bfa',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        yAxisID: 'y1',
      },
    ],
  };

  console.log('[Trend Component] Chart data:', {
    labels: data.labels,
    totalProducedData: data.datasets[0].data,
    qualityData: data.datasets[1].data,
    efficiencyData: data.datasets[2].data,
  });

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: 'circle', padding: 10, font: { size: 10, weight: 500 as any } },
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
      x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 10 }, color: '#94a3b8' } },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: { color: 'rgba(226, 232, 240, 0.5)' },
        border: { display: false },
        ticks: { font: { size: 10 }, color: '#94a3b8' },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        border: { display: false },
        ticks: { font: { size: 10 }, color: '#94a3b8' },
      },
    },
  };

  const kpiData = [
    { 
      title: 'Total Produced', 
      value: totalProduced.toLocaleString(), 
      trend: outputTrend, 
      icon: '📦', 
      bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-100', 
      valueColor: 'text-indigo-700'
    },
    { 
      title: 'Avg Quality', 
      value: `${Math.round(avgQuality)}%`, 
      trend: qualityTrend, 
      icon: '✅', 
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-100', 
      valueColor: 'text-emerald-700'
    },
    { 
      title: 'Avg Efficiency', 
      value: `${Math.round(avgEfficiency)}%`, 
      trend: efficiencyTrend, 
      icon: '⚡', 
      bg: 'bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-100', 
      valueColor: 'text-violet-700'
    },
    { 
      title: 'Total Downtime', 
      value: `${Math.floor(totalDowntime * 10) / 10}h`, // Truncate instead of round
      trend: { ...downtimeTrend, isPositive: !downtimeTrend.isPositive }, 
      icon: '⏱️', 
      bg: 'bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-100', 
      valueColor: 'text-rose-700'
    },
  ];

  return (
    <div className={`chart-card p-4 flex flex-col h-full w-full overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
          <BarChart3 size={14} className="text-white" />
        </div>
        <div>
          <h2 className="text-xs font-bold text-slate-800 tracking-wide">TREND ANALYSIS</h2>
          <p className="text-[9px] text-slate-400">Last 7 Days Performance</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-2 mb-2 flex-shrink-0">
        {kpiData.map((kpi) => (
          <div key={kpi.title} className={`${kpi.bg} rounded-xl p-2.5 border card-hover`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-slate-600">{kpi.icon} {kpi.title}</span>
            </div>
            <div className={`text-base font-black ${kpi.valueColor}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}

export default memo(TrendAnalysis);
