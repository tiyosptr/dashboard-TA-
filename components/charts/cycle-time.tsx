'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

interface CycleTimeProps {
  className?: string;
}

export default function CycleTime({ className = '' }: CycleTimeProps) {
  const data = {
    labels: ['07', '08', '09', '10', '11', '12', '13', '14', '15', '16'],
    datasets: [
      {
        data: [4, 5.5, 6, 7, 6.5, 5, 6, 4.5, 5.5, 3],
        borderColor: '#5B7FFF',
        backgroundColor: 'rgba(91, 127, 255, 0.1)',
        borderWidth: 1.5,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#000',
        bodyColor: '#000',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 6,
        titleFont: { size: 9 },
        bodyFont: { size: 9 },
        displayColors: false,
        callbacks: {
          label: (context: any) => `${context.parsed.y}s`,
        },
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
        max: 8,
        grid: { color: '#f0f0f0' },
        border: { display: false },
        ticks: { stepSize: 4, font: { size: 8 } },
      },
    },
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-1.5 flex flex-col h-full w-full overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-0.5 flex-shrink-0">
        <h2 className="text-[9px] font-semibold text-gray-600">CYCLE TIME</h2>
      </div>

      {/* Stats */}
      <div className="flex-shrink-0">
        <div className="text-base font-bold text-gray-900">3.8 S</div>
        <div className="text-[7px] text-gray-500">120/jam</div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0 mt-0.5">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
