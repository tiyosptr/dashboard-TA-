'use client';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { TrendData } from '@/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface TrendAnalysisProps {
  className?: string;         // styling tambahan dari page
  chartHeight?: string;       // tinggi chart, default 'auto'
  cardCols?: string;          // jumlah kolom KPI cards, default 'md:grid-cols-4'
}

export default function TrendAnalysis({
  className = '',
  chartHeight = 'auto',
  cardCols = 'md:grid-cols-4',
}: TrendAnalysisProps) {
  const trendData: TrendData[] = [
    { date: '01 Nov', output: 3800, quality: 95, efficiency: 88, downtime: 12 },
    { date: '02 Nov', output: 4000, quality: 96, efficiency: 90, downtime: 10 },
    { date: '03 Nov', output: 3900, quality: 94, efficiency: 87, downtime: 15 },
    { date: '04 Nov', output: 4200, quality: 97, efficiency: 92, downtime: 8 },
    { date: '05 Nov', output: 4100, quality: 96, efficiency: 91, downtime: 9 },
    { date: '06 Nov', output: 4300, quality: 98, efficiency: 93, downtime: 7 },
    { date: '07 Nov', output: 4400, quality: 97, efficiency: 94, downtime: 6 },
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
        label: 'Output (units)',
        data: trendData.map(d => d.output),
        borderColor: '#5B7FFF',
        backgroundColor: '#5B7FFF',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y',
      },
      {
        label: 'Quality (%)',
        data: trendData.map(d => d.quality),
        borderColor: '#10B981',
        backgroundColor: '#10B981',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y1',
      },
      {
        label: 'Efficiency (%)',
        data: trendData.map(d => d.efficiency),
        borderColor: '#A78BFA',
        backgroundColor: '#A78BFA',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y1',
      },
      {
        label: 'Downtime (h)',
        data: trendData.map(d => d.downtime),
        borderColor: '#EF4444',
        backgroundColor: '#EF4444',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
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
        position: 'top' as const,
        labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true, pointStyle: 'circle', padding: 15, font: { size: 12 } },
      },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#000',
        bodyColor: '#000',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: { color: '#f0f0f0' },
        border: { display: false },
        title: { display: true, text: 'Output (units)', font: { size: 11 } },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        border: { display: false },
        title: { display: true, text: 'Percentage / Hours', font: { size: 11 } },
      },
    },
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-6 flex flex-col h-full ${className}`}>
      <div className="mb-3 sm:mb-4 md:mb-6 flex-shrink-0">
        <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-800 mb-0.5 sm:mb-1 md:mb-2">Trend Analysis</h2>
        <p className="text-[10px] sm:text-xs md:text-sm text-gray-500">Analisis pola performa mesin dan produksi - 7 Hari Terakhir</p>
      </div>

      {/* KPI Cards */}
      <div className={`grid grid-cols-2 ${cardCols} gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6 flex-shrink-0`}>
        {[
          { title: 'Output Produksi', value: latestData.output, unit: 'unit/hari', trend: outputTrend, colorFrom: 'blue-50', colorTo: 'blue-100', border: 'blue-200' },
          { title: 'Quality Rate', value: latestData.quality, unit: '%', trend: qualityTrend, colorFrom: 'green-50', colorTo: 'green-100', border: 'green-200' },
          { title: 'Efficiency', value: latestData.efficiency, unit: '%', trend: efficiencyTrend, colorFrom: 'purple-50', colorTo: 'purple-100', border: 'purple-200' },
          { title: 'Downtime', value: latestData.downtime, unit: 'h', trend: downtimeTrend, colorFrom: 'red-50', colorTo: 'red-100', border: 'red-200' },
        ].map((kpi) => (
          <div key={kpi.title} className={`bg-gradient-to-br from-${kpi.colorFrom} to-${kpi.colorTo} rounded-lg p-2 sm:p-3 md:p-4 border border-${kpi.border}`}>
            <div className="flex items-center justify-between mb-0.5 sm:mb-1 md:mb-2">
              <span className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-700 truncate">{kpi.title}</span>
              <div className={`flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-semibold ${kpi.trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {kpi.trend.isPositive ? <TrendingUp size={10} className="sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" /> : <TrendingDown size={10} className="sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />}
                {kpi.trend.value}%
              </div>
            </div>
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{kpi.value}{kpi.unit === '%' ? '%' : ''}</div>
            <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5 md:mt-1">{kpi.unit}</div>
          </div>
        ))}
      </div>

      {/* Trend Chart - Flexibel sesuai tinggi tersisa */}
      <div className="flex-1 min-h-[200px] sm:min-h-[250px] md:min-h-[300px] mb-3 sm:mb-4 md:mb-6">
        <Line data={data} options={options} />
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3 md:p-4">
          <h3 className="font-semibold text-blue-900 mb-1 sm:mb-2 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base">
            <TrendingUp size={14} className="text-blue-600 sm:w-4 sm:h-4 md:w-[18px] md:h-[18px]" /> Positive Trends
          </h3>
          <ul className="space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs md:text-sm text-blue-800">
            <li>• Output produksi meningkat 2.3% dalam 7 hari terakhir</li>
            <li>• Quality rate konsisten di atas 94%</li>
            <li>• Downtime berkurang 50% dibanding minggu lalu</li>
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 sm:p-3 md:p-4">
          <h3 className="font-semibold text-yellow-900 mb-1 sm:mb-2 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base">
            <TrendingDown size={14} className="text-yellow-600 sm:w-4 sm:h-4 md:w-[18px] md:h-[18px]" /> Areas for Improvement
          </h3>
          <ul className="space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs md:text-sm text-yellow-800">
            <li>• Mesin Welding menunjukkan penurunan efisiensi 5%</li>
            <li>• Cycle time di Proses Oven meningkat 15%</li>
            <li>• Perlu maintenance preventif untuk 3 mesin critical</li>
          </ul>
        </div>
      </div>
    </div>
  );
}