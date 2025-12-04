'use client';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { TrendData } from '@/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface TrendAnalysisProps {
  className?: string;
}

export default function TrendAnalysis({ className = '' }: TrendAnalysisProps) {
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
    labels: trendData.map(d => d.date),
    datasets: [
      {
        label: 'Output',
        data: trendData.map(d => d.output),
        borderColor: '#5B7FFF',
        backgroundColor: '#5B7FFF',
        borderWidth: 1.5,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
        yAxisID: 'y',
      },
      {
        label: 'Quality',
        data: trendData.map(d => d.quality),
        borderColor: '#10B981',
        backgroundColor: '#10B981',
        borderWidth: 1.5,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
        yAxisID: 'y1',
      },
      {
        label: 'Efficiency',
        data: trendData.map(d => d.efficiency),
        borderColor: '#A78BFA',
        backgroundColor: '#A78BFA',
        borderWidth: 1.5,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
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
        labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: 'circle', padding: 6, font: { size: 8 } },
      },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#000',
        bodyColor: '#000',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 6,
        titleFont: { size: 9 },
        bodyFont: { size: 9 },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 8 } } },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: { color: '#f0f0f0' },
        border: { display: false },
        ticks: { font: { size: 8 } },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        border: { display: false },
        ticks: { font: { size: 8 } },
      },
    },
  };

  const kpiData = [
    { title: 'Output', value: latestData.output, trend: outputTrend, color: 'blue' },
    { title: 'Quality', value: `${latestData.quality}%`, trend: qualityTrend, color: 'green' },
    { title: 'Efficiency', value: `${latestData.efficiency}%`, trend: efficiencyTrend, color: 'purple' },
    { title: 'Downtime', value: `${latestData.downtime}h`, trend: downtimeTrend, color: 'red' },
  ];

  return (
    <div className={`bg-white rounded-lg shadow-sm p-1.5 sm:p-2 flex flex-col h-full w-full overflow-hidden ${className}`}>
      {/* Header - compact */}
      <div className="mb-1 flex-shrink-0">
        <h2 className="text-[10px] sm:text-xs font-semibold text-gray-800">Trend Analysis</h2>
        <p className="text-[8px] text-gray-500">7 Hari Terakhir</p>
      </div>

      {/* KPI Cards - very compact */}
      <div className="grid grid-cols-4 gap-1 mb-1 flex-shrink-0">
        {kpiData.map((kpi) => (
          <div key={kpi.title} className={`bg-${kpi.color}-50 border border-${kpi.color}-200 rounded p-1`}>
            <div className="flex items-center justify-between">
              <span className="text-[7px] font-medium text-gray-600 truncate">{kpi.title}</span>
              <div className={`flex items-center text-[7px] font-semibold ${kpi.trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {kpi.trend.isPositive ? <TrendingUp size={6} /> : <TrendingDown size={6} />}
              </div>
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-900">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Chart - takes remaining space */}
      <div className="flex-1 min-h-0">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}