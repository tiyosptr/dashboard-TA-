'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface HistoryChartProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

export default function HistoryChart({ width = '100%', height = '100%', className = '' }: HistoryChartProps) {
  const data = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun'],
    datasets: [
      {
        label: 'Maint',
        data: [80, 100, 90, 110, 95, 140],
        borderColor: '#5B7FFF',
        backgroundColor: '#5B7FFF',
        borderWidth: 1.5,
        tension: 0.4,
        pointRadius: 2,
      },
      {
        label: 'Down',
        data: [120, 110, 140, 100, 130, 90],
        borderColor: '#A78BFA',
        backgroundColor: '#A78BFA',
        borderWidth: 1.5,
        tension: 0.4,
        pointRadius: 2,
      },
      {
        label: 'Reject',
        data: [140, 130, 110, 150, 120, 145],
        borderColor: '#FF6B9D',
        backgroundColor: '#FF6B9D',
        borderWidth: 1.5,
        tension: 0.4,
        pointRadius: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          boxWidth: 6,
          boxHeight: 6,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 4,
          font: { size: 7 },
        },
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
        min: 0,
        max: 210,
        grid: { color: '#f0f0f0' },
        border: { display: false },
        ticks: { stepSize: 70, font: { size: 8 } },
      },
    },
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm p-1.5 flex flex-col h-full w-full overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Header */}
      <div className="mb-0.5 flex-shrink-0">
        <h2 className="text-[9px] font-semibold text-gray-600">HISTORY</h2>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
