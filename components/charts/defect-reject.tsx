'use client';
import { useEffect, useRef, useState } from 'react';
import { Chart, ChartOptions, ChartData } from 'chart.js/auto';
import { AlertTriangle, TrendingDown, TrendingUp, Package, XCircle } from 'lucide-react';

interface DefectRejectBarChartProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

interface DefectProcess {
  process: string;
  defectCount: number;
  percentage: number;
  color: string;
}

export default function DefectRejectBarChart({
  width = '100%',
  height = 'auto',
  className = '',
}: DefectRejectBarChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const stats = {
    totalProduced: 45780,
    totalDefect: 1247,
    defectRate: 2.72,
    trend: -0.3,
  };

  const defectByProcess: DefectProcess[] = [
    { process: 'Extrusion', defectCount: 420, percentage: 33.7, color: '#EF4444' },
    { process: 'Molding', defectCount: 315, percentage: 25.3, color: '#F59E0B' },
    { process: 'Assembly', defectCount: 245, percentage: 19.6, color: '#3B82F6' },
    { process: 'Coating', defectCount: 178, percentage: 14.3, color: '#8B5CF6' },
    { process: 'Packaging', defectCount: 89, percentage: 7.1, color: '#6B7280' },
    { process: 'Testing', defectCount: 67, percentage: 5.4, color: '#10B981' },
    { process: 'Inspection', defectCount: 33, percentage: 2.6, color: '#F97316' },
    { process: 'Quality Control', defectCount: 25, percentage: 2.0, color: '#EC4899' },
    { process: 'Material Prep', defectCount: 18, percentage: 1.4, color: '#8B5CF6' },
    { process: 'Finishing', defectCount: 12, percentage: 0.9, color: '#06B6D4' },
    { process: 'Final Assembly', defectCount: 8, percentage: 0.6, color: '#84CC16' },
    { process: 'Shipping Prep', defectCount: 5, percentage: 0.3, color: '#F43F5E' },
  ];

  // ===========================
  // Auto-scroll smooth versi baru
  // ===========================
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // duplicate content untuk scroll seamless
    el.innerHTML += el.innerHTML;

    const speed = 0.03; // pixel per ms
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      el.scrollTop += speed * delta; // scroll smooth per ms
      if (el.scrollTop >= el.scrollHeight / 2) el.scrollTop = 0;

      requestAnimationFrame(loop);
    };

    const frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  // ===========================
  // Chart.js setup responsive
  // ===========================
  useEffect(() => {
    if (!chartRef.current || !chartContainerRef.current) return;
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const createChart = () => {
      if (chartInstance.current) chartInstance.current.destroy();

      const data: ChartData<'bar'> = {
        labels: defectByProcess.map(d =>
          d.process.length > 12 ? d.process.slice(0, 12) + '...' : d.process
        ),
        datasets: [
          {
            label: 'Defect Count',
            data: defectByProcess.map(d => d.defectCount),
            backgroundColor: defectByProcess.map(d => d.color + 'CC'),
            borderColor: defectByProcess.map(d => d.color),
            borderWidth: 1,
            borderRadius: 5,
          },
        ],
      };

      const options: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { font: { size: 10 } } },
          y: { beginAtZero: true, ticks: { font: { size: 10 } } },
        },
      };

      chartInstance.current = new Chart(ctx, { type: 'bar', data, options });
    };

    createChart();

    const resizeObserver = new ResizeObserver(() => createChart());
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      chartInstance.current?.destroy();
      resizeObserver.disconnect();
    };
  }, [defectByProcess]);

  return (
    <div
      ref={chartContainerRef}
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 flex flex-col h-full w-full ${className}`}
      style={{ width, height }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="text-red-600" size={16} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Defect by Process</h3>
            <p className="text-[10px] sm:text-xs text-gray-500">Last 24 hours</p>
          </div>
        </div>

        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium
          ${stats.trend < 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
        >
          {stats.trend < 0 ? <TrendingDown size={10} className="sm:w-3 sm:h-3" /> : <TrendingUp size={10} className="sm:w-3 sm:h-3" />}
          {Math.abs(stats.trend)}%
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <StatCard icon={<Package size={10} className="text-blue-600 sm:w-3 sm:h-3" />} label="Produced" value={stats.totalProduced.toLocaleString()} bg="blue" />
        <StatCard icon={<XCircle size={10} className="text-red-600 sm:w-3 sm:h-3" />} label="Rejected" value={stats.totalDefect.toLocaleString()} bg="red" />
        <StatCard label="Reject Rate" value={stats.defectRate + '%'} bg="orange" />
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[150px] relative mb-2 sm:mb-4">
        <canvas ref={chartRef}></canvas>
      </div>

      {/* Auto Scroll List */}
      <h4 className="text-[10px] sm:text-xs font-semibold text-gray-700 mb-1">Reject by Process:</h4>
      <div
        className="border-t border-gray-200 pt-2 overflow-hidden no-scrollbar flex-1"
        style={{ maxHeight: '120px' }}
        ref={scrollRef}
      >
        <div className="space-y-1.5 sm:space-y-2">
          {defectByProcess.map((item, idx) => (
            <ListItem key={idx} item={item} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200 text-[10px] sm:text-xs flex justify-between">
        <span className="text-gray-500">Target: &lt;3.0%</span>
        <span className={stats.defectRate < 3 ? 'text-green-600' : 'text-red-600'}>
          {stats.defectRate < 3 ? '✓ On Target' : '⚠ Above Target'}
        </span>
      </div>
    </div>
  );
}

function ListItem({ item }: { item: DefectProcess }) {
  return (
    <div className="flex items-center justify-between text-[10px] sm:text-xs">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: item.color }} />
        <span className="text-gray-700 font-medium truncate max-w-[80px] sm:max-w-none">{item.process}</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <span className="text-gray-600 w-6 sm:w-8 text-right">{item.defectCount}</span>
        <span className="font-semibold text-gray-900 w-8 sm:w-10 text-right">{item.percentage}%</span>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg }: { icon?: React.ReactNode; label: string; value: string | number; bg: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200',
    red: 'bg-red-50 border-red-200',
    orange: 'bg-orange-50 border-orange-200',
  };
  return (
    <div className={`rounded-lg p-1.5 sm:p-2 border ${colors[bg]}`}>
      {icon && <div className="flex items-center gap-1 mb-0.5 sm:mb-1">{icon}<span className="text-[10px] sm:text-xs text-gray-600 truncate">{label}</span></div>}
      {!icon && <div className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1 truncate">{label}</div>}
      <div className="text-sm sm:text-lg font-bold text-gray-900 truncate">{value}</div>
    </div>
  );
}
