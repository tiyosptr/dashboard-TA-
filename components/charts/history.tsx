'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ChevronDown } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface HistoryChartProps {
  width?: string | number;   // bisa diatur dari page
  height?: string | number;  // bisa diatur dari page
  className?: string;        // tambahan class styling
}

export default function HistoryChart({ width = '100%', height = '100%', className = '' }: HistoryChartProps) {
  const data = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun'],
    datasets: [
      {
        label: 'Maintenance',
        data: [80, 100, 90, 110, 95, 140],
        borderColor: '#5B7FFF',
        backgroundColor: '#5B7FFF',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Downtime',
        data: [120, 110, 140, 100, 130, 90],
        borderColor: '#A78BFA',
        backgroundColor: '#A78BFA',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Reject',
        data: [140, 130, 110, 150, 120, 145],
        borderColor: '#FF6B9D',
        backgroundColor: '#FF6B9D',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false, // agar chart mengikuti ukuran parent
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 10,
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
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { font: { size: 11 } },
      },
      y: {
        min: 0,
        max: 210,
        grid: { color: '#f0f0f0' },
        border: { display: false },
        ticks: { stepSize: 70, font: { size: 11 } },
      },
    },
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-3 sm:p-4 flex flex-col h-full w-full ${className}`}
      style={{ width, height }}
    >
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h2 className="text-xs sm:text-sm font-semibold text-gray-600 tracking-wide">HISTORY</h2>
        <button className="flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          This Day <ChevronDown size={14} className="sm:w-4 sm:h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-[180px]">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
