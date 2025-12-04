'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ChevronDown } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

interface CycleTimeProps {
  className?: string; // tambahan class dari page
}

export default function CycleTime({ className = '' }: CycleTimeProps) {
  const data = {
    labels: ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'],
    datasets: [
      {
        data: [4, 5.5, 6, 7, 6.5, 5, 6, 4.5, 5.5, 3],
        borderColor: '#5B7FFF',
        backgroundColor: 'rgba(91, 127, 255, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#5B7FFF',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false, // agar chart mengikuti ukuran container
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#000',
        bodyColor: '#000',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
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
        ticks: { font: { size: 10 } },
      },
      y: {
        min: 0,
        max: 8,
        grid: { color: '#f0f0f0' },
        border: { display: false },
        ticks: {
          stepSize: 2,
          font: { size: 10 },
          callback: (value: any) => `${value}s`,
        },
      },
    },
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 flex flex-col h-full w-full ${className}`}>
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <h2 className="text-xs sm:text-sm font-semibold text-gray-600 tracking-wide">CYCLE TIME</h2>
        <button className="flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <span className="hidden sm:inline">Proses</span> Oven <ChevronDown size={14} className="sm:w-4 sm:h-4" />
        </button>
      </div>

      <div className="mb-2 sm:mb-4">
        <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-0.5 sm:mb-1">3.8 S</div>
        <div className="text-[10px] sm:text-sm text-gray-500">120/jam</div>
      </div>

      {/* Chart akan mengikuti ukuran parent */}
      <div className="flex-1 min-h-[150px]">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
