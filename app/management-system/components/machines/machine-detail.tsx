// app/management-system/components/machines/machine-detail.tsx

'use client';

import { X, Activity, TrendingUp, TrendingDown, AlertTriangle, Clock, Gauge, Thermometer, Radio, Zap } from 'lucide-react';
import { MachineDetail as MachineDetailType } from '@/types';
import { Bar, Line } from 'react-chartjs-2';

interface MachineDetailProps {
  machine: MachineDetailType;
  onClose: () => void;
}

export default function MachineDetail({ machine, onClose }: MachineDetailProps) {
  // Mock data for charts
  const outputData = {
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
    datasets: [
      {
        label: 'Actual Output',
        data: [450, 520, 480, 510, 495, 465],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#3b82f6',
      },
      {
        label: 'Target Output',
        data: [500, 500, 500, 500, 500, 500],
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#10b981',
      },
    ],
  };

  const cycleTimeTrend = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Cycle Time',
        data: [3.0, 3.1, 3.2, 3.3, 3.4, 3.5, 3.2],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#f59e0b',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
      {
        label: 'Target',
        data: [3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0],
        borderColor: '#10b981',
        borderWidth: 2,
        borderDash: [8, 4],
        fill: false,
        pointRadius: 0,
      },
    ],
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'running': return 'from-green-500 to-green-600';
      case 'warning': return 'from-yellow-500 to-yellow-600';
      case 'downtime': return 'from-red-500 to-red-600';
      case 'maintenance': return 'from-blue-500 to-blue-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'running': return 'bg-green-100 text-green-700 border-green-300';
      case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'downtime': return 'bg-red-100 text-red-700 border-red-300';
      case 'maintenance': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'running': return 'Running';
      case 'warning': return 'Warning';
      case 'downtime': return 'Downtime';
      case 'maintenance': return 'Under Maintenance';
      default: return 'Unknown';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full my-8 animate-fadeIn">
        {/* Header with Gradient */}
        <div className={`flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r ${getStatusColor(machine.status)} rounded-t-2xl`}>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-bold text-white">{machine.name}</h2>
              <span className={`px-4 py-1.5 rounded-full text-sm font-bold border-2 ${getStatusBadge(machine.status)} shadow-lg`}>
                {getStatusText(machine.status)}
              </span>
            </div>
            <p className="text-white/90 text-sm font-medium">{machine.id} • {machine.location}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2.5 rounded-xl transition-all hover:scale-110"
          >
            <X size={28} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Key Metrics Grid - Enhanced */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 rounded-2xl p-5 border-2 border-blue-300 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-700">OEE</span>
                <div className="p-2 bg-white rounded-lg shadow">
                  <Activity className="text-blue-600" size={22} />
                </div>
              </div>
              <p className="text-4xl font-black text-blue-700 mb-1">{machine.metrics.oee}%</p>
              <div className="flex items-center gap-1 text-xs font-semibold">
                {machine.metrics.oee >= 85 ? (
                  <><TrendingUp size={16} className="text-green-600" /><span className="text-green-600">Excellent</span></>
                ) : machine.metrics.oee >= 70 ? (
                  <><TrendingUp size={16} className="text-yellow-600" /><span className="text-yellow-600">Good</span></>
                ) : (
                  <><TrendingDown size={16} className="text-red-600" /><span className="text-red-600">Poor</span></>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 via-green-100 to-green-200 rounded-2xl p-5 border-2 border-green-300 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-700">Availability</span>
                <div className="p-2 bg-white rounded-lg shadow">
                  <Clock className="text-green-600" size={22} />
                </div>
              </div>
              <p className="text-4xl font-black text-green-700 mb-1">{machine.metrics.availability}%</p>
              <p className="text-xs text-gray-600 font-medium">Uptime: {machine.metrics.uptime}h</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 rounded-2xl p-5 border-2 border-purple-300 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-700">Performance</span>
                <div className="p-2 bg-white rounded-lg shadow">
                  <Gauge className="text-purple-600" size={22} />
                </div>
              </div>
              <p className="text-4xl font-black text-purple-700 mb-1">{machine.metrics.performance}%</p>
              <p className="text-xs text-gray-600 font-medium">Target efficiency</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 via-yellow-100 to-yellow-200 rounded-2xl p-5 border-2 border-yellow-300 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-700">Quality</span>
                <div className="p-2 bg-white rounded-lg shadow">
                  <Zap className="text-yellow-600" size={22} />
                </div>
              </div>
              <p className="text-4xl font-black text-yellow-700 mb-1">{machine.metrics.quality}%</p>
              <p className="text-xs text-gray-600 font-medium">Reject: {machine.metrics.reject}</p>
            </div>
          </div>

          {/* Production Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Actual Output */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
              <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="text-blue-600" size={20} />
                </div>
                Production Output
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <p className="text-sm text-gray-600 mb-2 font-medium">Actual Output</p>
                  <p className="text-3xl font-black text-blue-700 mb-1">
                    {machine.metrics.actualOutput.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">units produced</p>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 mb-2 font-medium">Target Output</p>
                  <p className="text-3xl font-black text-gray-700 mb-1">
                    {machine.metrics.targetOutput.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">units expected</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-3 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ 
                    width: `${Math.min((machine.metrics.actualOutput / machine.metrics.targetOutput) * 100, 100)}%` 
                  }}
                >
                  <span className="text-xs font-bold text-white">
                    {((machine.metrics.actualOutput / machine.metrics.targetOutput) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <p className="text-sm text-center text-gray-600 font-medium">
                {((machine.metrics.actualOutput / machine.metrics.targetOutput) * 100).toFixed(1)}% of target achieved
              </p>
            </div>

            {/* Throughput & Cycle Time */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
              <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Gauge className="text-purple-600" size={20} />
                </div>
                Performance Metrics
              </h3>
              <div className="space-y-5">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-700 font-semibold">Throughput</span>
                    <span className="text-3xl font-black text-purple-700">{machine.metrics.throughput}</span>
                  </div>
                  <p className="text-xs text-gray-600 font-medium">units per hour</p>
                </div>

                <div className={`rounded-xl p-4 border-2 ${
                  machine.metrics.cycleTime > machine.metrics.targetCycleTime * 1.1 
                    ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200' 
                    : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-700 font-semibold">Cycle Time</span>
                    <div className="text-right">
                      <span className={`text-3xl font-black ${
                        machine.metrics.cycleTime > machine.metrics.targetCycleTime * 1.1 
                          ? 'text-red-700' 
                          : 'text-green-700'
                      }`}>
                        {machine.metrics.cycleTime}s
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 font-medium">Target: {machine.metrics.targetCycleTime}s</p>
                  {machine.metrics.cycleTime > machine.metrics.targetCycleTime * 1.1 && (
                    <div className="mt-3 bg-red-100 border-2 border-red-300 rounded-lg p-2">
                      <p className="text-xs text-red-800 font-bold flex items-center gap-1">
                        <AlertTriangle size={14} />
                        Exceeded by {(((machine.metrics.cycleTime / machine.metrics.targetCycleTime) - 1) * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-700 font-semibold">Reject Rate</span>
                    <span className="text-3xl font-black text-red-700">
                      {((machine.metrics.reject / machine.metrics.actualOutput) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 font-medium">{machine.metrics.reject} rejected units</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts - Enhanced */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Output Trend (24h)</h3>
              <div className="h-64">
                <Bar 
                  data={outputData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: true, position: 'bottom', labels: { font: { size: 11, weight: 'bold' }, padding: 15, usePointStyle: true } },
                      tooltip: { backgroundColor: '#fff', titleColor: '#000', bodyColor: '#000', borderColor: '#e5e7eb', borderWidth: 1, padding: 12 }
                    },
                    scales: {
                      y: { beginAtZero: true, grid: { color: '#f0f0f0' } },
                      x: { grid: { display: false } }
                    },
                  }}
                />
              </div>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Cycle Time Trend (7 Days)</h3>
              <div className="h-64">
                <Line 
                  data={cycleTimeTrend}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: true, position: 'bottom', labels: { font: { size: 11, weight: 'bold' }, padding: 15, usePointStyle: true } },
                      tooltip: { backgroundColor: '#fff', titleColor: '#000', bodyColor: '#000', borderColor: '#e5e7eb', borderWidth: 1, padding: 12 }
                    },
                    scales: {
                      y: { beginAtZero: false, min: 2, max: 4, grid: { color: '#f0f0f0' } },
                      x: { grid: { display: false } }
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Maintenance & Downtime */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="text-blue-600" size={20} />
                </div>
                Maintenance Schedule
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <span className="text-sm font-semibold text-gray-700">Last Maintenance</span>
                  <span className="font-bold text-gray-900">
                    {new Date(machine.lastMaintenance).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                  <span className="text-sm font-semibold text-gray-700">Next Maintenance</span>
                  <span className="font-bold text-blue-700">
                    {new Date(machine.nextMaintenance).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-orange-50 rounded-xl p-4 border-2 border-orange-200">
                  <span className="text-sm font-semibold text-gray-700">Days Until PM</span>
                  <span className="font-bold text-orange-700 text-xl">
                    {Math.ceil((new Date(machine.nextMaintenance).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="text-green-600" size={20} />
                </div>
                Downtime Analysis
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-green-50 rounded-xl p-4 border-2 border-green-200">
                  <span className="text-sm font-semibold text-gray-700">Total Uptime</span>
                  <span className="font-bold text-green-700 text-xl">{machine.metrics.uptime}h</span>
                </div>
                <div className="flex justify-between items-center bg-red-50 rounded-xl p-4 border-2 border-red-200">
                  <span className="text-sm font-semibold text-gray-700">Total Downtime</span>
                  <span className="font-bold text-red-700 text-xl">{machine.metrics.downtime}h</span>
                </div>
                <div className="pt-2">
                  <div className="w-full bg-gray-200 rounded-full h-6 flex overflow-hidden shadow-lg">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-xs text-white font-bold"
                      style={{ width: `${(machine.metrics.uptime / (machine.metrics.uptime + machine.metrics.downtime)) * 100}%` }}
                    >
                      {((machine.metrics.uptime / (machine.metrics.uptime + machine.metrics.downtime)) * 100).toFixed(1)}%
                    </div>
                    <div 
                      className="bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center text-xs text-white font-bold"
                      style={{ width: `${(machine.metrics.downtime / (machine.metrics.uptime + machine.metrics.downtime)) * 100}%` }}
                    >
                      {((machine.metrics.downtime / (machine.metrics.uptime + machine.metrics.downtime)) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Enhanced */}
        <div className="flex items-center justify-between gap-3 p-6 border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 rounded-b-2xl">
          <div className="text-sm text-gray-600">
            Last updated: <span className="font-semibold text-gray-900">{new Date().toLocaleTimeString()}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-200 transition-all font-semibold hover:scale-105"
            >
              Close
            </button>
            <button className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-lg hover:shadow-xl hover:scale-105">
              Create Work Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}