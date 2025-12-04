'use client';

import { useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ChevronDown } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ActualOutputProps {
  className?: string;
  lineId?: string;
  pn?: string;
  date?: string;
  shiftNumber?: number;
}

interface ActualOutputData {
  id: number;
  line_id: string;
  shift_number: number;
  hour_slot: string;
  output: number;
  reject: number;
  target_output: number;
  date: string;
  pn: string;
}

export default function ActualOutput({
  className = '',
  lineId,
  pn,
  date = '2024-11-28', // Default to dummy data date
  shiftNumber = 1
}: ActualOutputProps) {
  const [data, setData] = useState<ActualOutputData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from API
  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Trigger Sync first to ensure data is up-to-date
      try {
        await fetch('/api/actual-output/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            line_id: lineId,
            date: date,
            pn: pn
          })
        });
      } catch (syncErr) {
        console.warn('Sync failed, proceeding with fetch:', syncErr);
      }

      // 2. Fetch updated data
      const params = new URLSearchParams();
      if (lineId) params.append('line_id', lineId);
      if (pn) params.append('pn', pn);
      if (date) params.append('date', date);
      if (shiftNumber) params.append('shift_number', shiftNumber.toString());

      console.log('Fetching from:', `/api/actual-output?${params.toString()}`);

      const response = await fetch(`/api/actual-output?${params.toString()}`);
      const result = await response.json();

      console.log('API Response:', result);

      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, [lineId, pn, date, shiftNumber]);

  // Prepare chart data
  const hourSlots = [
    '07:00-08:00', '08:00-09:00', '09:00-10:00', '10:00-11:00',
    '11:00-12:00', '12:00-13:00', '13:00-14:00', '14:00-15:00',
    '15:00-16:00', '16:00-17:00'
  ];

  const outputByHour = hourSlots.map(slot => {
    const record = data.find(d => d.hour_slot === slot);
    return record ? Number(record.output) : 0;
  });

  const rejectByHour = hourSlots.map(slot => {
    const record = data.find(d => d.hour_slot === slot);
    return record ? Number(record.reject) : 0;
  });

  const chartData = {
    labels: hourSlots.map(slot => slot.split('-')[0]),
    datasets: [
      {
        label: 'GOOD',
        data: outputByHour,
        backgroundColor: '#5B7FFF',
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: 'Reject/NG',
        data: rejectByHour,
        backgroundColor: '#FF6B9D',
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const totalGood = outputByHour.reduce((a, b) => a + b, 0);
  const totalReject = rejectByHour.reduce((a, b) => a + b, 0);
  const totalOutput = totalGood + totalReject;

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
        padding: 12,
        displayColors: true,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
      },
      y: {
        grid: { color: '#f0f0f0' },
        border: { display: false },
        ticks: { stepSize: 20 },
      },
    },
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-1.5 flex flex-col h-full w-full overflow-hidden ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500 text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-1.5 flex flex-col h-full w-full overflow-hidden ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-red-500 text-xs">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-1.5 flex flex-col h-full w-full overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1 flex-shrink-0">
        <h2 className="text-[10px] font-semibold text-gray-600">ACTUAL OUTPUT</h2>
        <div className="flex items-center gap-1">
          <button onClick={fetchData} className="text-[10px] text-gray-500 hover:text-gray-700" title="Refresh">🔄</button>
          <button className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-gray-700 border border-gray-300 rounded hover:bg-gray-50">
            Shift {shiftNumber} <ChevronDown size={10} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-1 flex-shrink-0">
        <div className="text-lg font-bold text-gray-900">{totalOutput.toLocaleString('id-ID')}</div>
        <div className="text-[8px] text-gray-500">Total Actual Output</div>
        <div className="flex items-center gap-2 text-[9px] mt-0.5">
          <div className="flex items-center gap-0.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#5B7FFF' }}></div>
            <span style={{ color: '#5B7FFF' }}>GOOD: {totalGood}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#FF6B9D' }}></div>
            <span style={{ color: '#FF6B9D' }}>Reject/NG: {totalReject}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <Bar data={chartData} options={options} />
      </div>

      {data.length === 0 && !loading && (
        <div className="text-center text-gray-400 text-[8px] mt-1">No data available</div>
      )}
    </div>
  );
}

