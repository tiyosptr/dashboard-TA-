'use client';
import { memo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { TrendData } from '@/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface TrendAnalysisProps {
  className?: string;
}

function TrendAnalysis({ className = '' }: TrendAnalysisProps) {
  const trendData: TrendData[] = [
    { date: '01', output: 3800, quality: 95, efficiency: 88, downtime: 12 },
    { date: '02', output: 4000, quality: 96, efficiency: 90, downtime: 10 },
    { date: '03', output: 3900, quality: 94, efficiency: 87, downtime: 15 },
    { date: '04', output: 4200, quality: 97, efficiency: 92, downtime: 8 },
    { date: '05', output: 4100, quality: 96, efficiency: 91, downtime: 9 },
    { date: '06', output: 4300, quality: 98, efficiency: 93, downtime: 7 },
    { date: '07', output: 4400, quality: 97, efficiency: 94, downtime: 6 },
  ];

  const latestData = trendData[trendData.length - 1];
  const previousData = trendData[trendData.length - 2];

  const calculateTrend = (current: number, previous: number) => {
    const diff = ((current - previous) / previous * 100).toFixed(1);
    return { value: Math.abs(parseFloat(diff)), isPositive: current >= previous };
  };

  const outputTrend = calculateTrend(latestData.output, previousData.output);
  const qualityTrend = calculateTrend(latestData.quality, previousData.quality);
  const efficiencyTrend = calculateTrend(latestData.efficiency, previousData.efficiency);
  const downtimeTrend = calculateTrend(latestData.downtime, previousData.downtime);

  const data = {
    labels: trendData.map(d => `Day ${d.date}`),
    datasets: [
      {
        label: 'Output',
        data: trendData.map(d => d.output),
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
        label: 'Quality',
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
        label: 'Efficiency',
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
    { title: 'Output', value: latestData.output.toLocaleString(), trend: outputTrend, icon: '📦', bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-100', valueColor: 'text-indigo-700' },
    { title: 'Quality', value: `${latestData.quality}%`, trend: qualityTrend, icon: '✅', bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-100', valueColor: 'text-emerald-700' },
    { title: 'Efficiency', value: `${latestData.efficiency}%`, trend: efficiencyTrend, icon: '⚡', bg: 'bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-100', valueColor: 'text-violet-700' },
    { title: 'Downtime', value: `${latestData.downtime}h`, trend: { ...downtimeTrend, isPositive: !downtimeTrend.isPositive }, icon: '⏱️', bg: 'bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-100', valueColor: 'text-rose-700' },
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
              <div className={`flex items-center gap-0.5 text-[9px] font-bold ${kpi.trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {kpi.trend.isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {kpi.trend.value}%
              </div>
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
