// app/management-system/components/machines/machine-list.tsx
'use client';

import { useState } from 'react';
import { Search, Activity, AlertTriangle, CheckCircle, Wrench, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import MachineDetail from './machine-detail';
import { MachineDetail as MachineDetailType } from '@/types';

export default function MachineList() {
  const [selectedMachine, setSelectedMachine] = useState<MachineDetailType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock data with detailed metrics
  const machines: MachineDetailType[] = [
    {
      id: 'M-001',
      name: 'Injection Molding #1',
      location: 'Line A - Zone 1',
      status: 'running',
      metrics: {
        actualOutput: 4520,
        targetOutput: 4800,
        reject: 45,
        throughput: 565,
        cycleTime: 3.2,
        targetCycleTime: 3.0,
        oee: 88.5,
        availability: 92.0,
        performance: 94.2,
        quality: 99.0,
        uptime: 22.08,
        downtime: 1.92,
        temperature: 68,
        vibration: 2.1,
      },
      lastMaintenance: '2025-01-10',
      nextMaintenance: '2025-02-10',
      totalRunningHours: 1250,
    },
    {
      id: 'M-002',
      name: 'Injection Molding #2',
      location: 'Line A - Zone 2',
      status: 'running',
      metrics: {
        actualOutput: 4350,
        targetOutput: 4800,
        reject: 52,
        throughput: 544,
        cycleTime: 3.3,
        targetCycleTime: 3.0,
        oee: 85.2,
        availability: 90.0,
        performance: 92.5,
        quality: 98.8,
        uptime: 21.6,
        downtime: 2.4,
        temperature: 72,
        vibration: 2.3,
      },
      lastMaintenance: '2025-01-12',
      nextMaintenance: '2025-02-12',
      totalRunningHours: 1180,
    },
    {
      id: 'M-003',
      name: 'Injection Molding #3',
      location: 'Line A - Zone 3',
      status: 'warning',
      metrics: {
        actualOutput: 3800,
        targetOutput: 4800,
        reject: 120,
        throughput: 475,
        cycleTime: 3.8,
        targetCycleTime: 3.0,
        oee: 72.5,
        availability: 85.0,
        performance: 86.5,
        quality: 96.8,
        uptime: 20.4,
        downtime: 3.6,
        temperature: 82,
        vibration: 3.2,
      },
      lastMaintenance: '2024-12-28',
      nextMaintenance: '2025-01-28',
      totalRunningHours: 1420,
    },
    {
      id: 'M-004',
      name: 'Extruder #4',
      location: 'Line B - Zone 1',
      status: 'running',
      metrics: {
        actualOutput: 3200,
        targetOutput: 3600,
        reject: 32,
        throughput: 400,
        cycleTime: 4.5,
        targetCycleTime: 4.0,
        oee: 82.0,
        availability: 88.0,
        performance: 90.0,
        quality: 99.0,
        uptime: 21.12,
        downtime: 2.88,
        temperature: 75,
        vibration: 2.5,
      },
      lastMaintenance: '2025-01-08',
      nextMaintenance: '2025-02-08',
      totalRunningHours: 980,
    },
    {
      id: 'M-005',
      name: 'Extruder #5',
      location: 'Line C - Zone 1',
      status: 'downtime',
      metrics: {
        actualOutput: 1800,
        targetOutput: 3600,
        reject: 180,
        throughput: 225,
        cycleTime: 8.0,
        targetCycleTime: 4.0,
        oee: 45.0,
        availability: 50.0,
        performance: 50.0,
        quality: 90.0,
        uptime: 12.0,
        downtime: 12.0,
        temperature: 95,
        vibration: 4.5,
      },
      lastMaintenance: '2025-01-05',
      nextMaintenance: '2025-02-05',
      totalRunningHours: 1350,
    },
    {
      id: 'M-006',
      name: 'Welding Machine #6',
      location: 'Line D - Zone 1',
      status: 'maintenance',
      metrics: {
        actualOutput: 0,
        targetOutput: 2400,
        reject: 0,
        throughput: 0,
        cycleTime: 0,
        targetCycleTime: 6.0,
        oee: 0,
        availability: 0,
        performance: 0,
        quality: 0,
        uptime: 0,
        downtime: 24.0,
        temperature: 45,
        vibration: 0,
      },
      lastMaintenance: '2025-01-15',
      nextMaintenance: '2025-02-15',
      totalRunningHours: 850,
    },
  ];

  const filteredMachines = machines.filter(machine => {
    const matchesSearch = machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || machine.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <CheckCircle size={18} />;
      case 'warning': return <AlertTriangle size={18} />;
      case 'downtime': return <AlertTriangle size={18} />;
      case 'maintenance': return <Wrench size={18} />;
      default: return <Activity size={18} />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500 shadow-green-500/50';
      case 'warning': return 'bg-yellow-500 shadow-yellow-500/50';
      case 'downtime': return 'bg-red-500 shadow-red-500/50';
      case 'maintenance': return 'bg-blue-500 shadow-blue-500/50';
      default: return 'bg-gray-500 shadow-gray-500/50';
    }
  };

  const getCardBorderStyle = (status: string) => {
    switch (status) {
      case 'running': return 'border-green-200 hover:border-green-400 hover:shadow-green-100';
      case 'warning': return 'border-yellow-200 hover:border-yellow-400 hover:shadow-yellow-100';
      case 'downtime': return 'border-red-200 hover:border-red-400 hover:shadow-red-100';
      case 'maintenance': return 'border-blue-200 hover:border-blue-400 hover:shadow-blue-100';
      default: return 'border-gray-200 hover:border-gray-400';
    }
  };

  const statusCounts = machines.reduce((acc, machine) => {
    acc[machine.status] = (acc[machine.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-xl p-4 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-1">Machine Management</h2>
        <p className="text-blue-100 text-sm">Real-time monitoring and control of all production machines</p>
      </div>

      {/* Stats Cards - Modern Design */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-3 border border-green-200 shadow-md hover:shadow-lg transition-all group">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 bg-green-100 rounded-md group-hover:scale-110 transition-transform">
              <CheckCircle className="text-green-600" size={18} />
            </div>
            <TrendingUp className="text-green-500" size={16} />
          </div>
          <p className="text-xs font-medium text-gray-600 mb-0.5">Running</p>
          <p className="text-2xl font-bold text-green-600">{statusCounts.running || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Operating normally</p>
        </div>

        <div className="bg-white rounded-lg p-3 border border-yellow-200 shadow-md hover:shadow-lg transition-all group">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 bg-yellow-100 rounded-md group-hover:scale-110 transition-transform">
              <AlertTriangle className="text-yellow-600" size={18} />
            </div>
            <Zap className="text-yellow-500" size={16} />
          </div>
          <p className="text-xs font-medium text-gray-600 mb-0.5">Warning</p>
          <p className="text-2xl font-bold text-yellow-600">{statusCounts.warning || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Needs attention</p>
        </div>

        <div className="bg-white rounded-lg p-3 border border-red-200 shadow-md hover:shadow-lg transition-all group">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 bg-red-100 rounded-md group-hover:scale-110 transition-transform">
              <AlertTriangle className="text-red-600" size={18} />
            </div>
            <TrendingDown className="text-red-500" size={16} />
          </div>
          <p className="text-xs font-medium text-gray-600 mb-0.5">Downtime</p>
          <p className="text-2xl font-bold text-red-600">{statusCounts.downtime || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Not operational</p>
        </div>

        <div className="bg-white rounded-lg p-3 border border-blue-200 shadow-md hover:shadow-lg transition-all group">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 bg-blue-100 rounded-md group-hover:scale-110 transition-transform">
              <Wrench className="text-blue-600" size={18} />
            </div>
            <Activity className="text-blue-500" size={16} />
          </div>
          <p className="text-xs font-medium text-gray-600 mb-0.5">Maintenance</p>
          <p className="text-2xl font-bold text-blue-600">{statusCounts.maintenance || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Under service</p>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white rounded-lg shadow-md p-3 border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by machine name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium cursor-pointer transition-all"
          >
            <option value="all">All Status</option>
            <option value="running">Running</option>
            <option value="warning">Warning</option>
            <option value="downtime">Downtime</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Machine Grid - Enhanced Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMachines.map((machine) => (
          <div
            key={machine.id}
            onClick={() => setSelectedMachine(machine)}
            className={`bg-white rounded-xl shadow-md border p-4 cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 ${getCardBorderStyle(machine.status)}`}
          >
            {/* Header with Status Badge */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <h3 className="font-bold text-sm text-gray-900">{machine.name}</h3>
                  <div className={`w-2.5 h-2.5 rounded-full animate-pulse shadow-md ${getStatusStyle(machine.status)}`}></div>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{machine.id}</span>
                  <span>•</span>
                  <span>{machine.location}</span>
                </p>
              </div>
              <div className={`p-1.5 rounded-md ${machine.status === 'running' ? 'bg-green-100 text-green-600' : machine.status === 'warning' ? 'bg-yellow-100 text-yellow-600' : machine.status === 'downtime' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                {getStatusIcon(machine.status)}
              </div>
            </div>

            {/* OEE Progress */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-gray-700">Overall OEE</span>
                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {machine.metrics.oee}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${machine.metrics.oee >= 85 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                      machine.metrics.oee >= 70 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                        'bg-gradient-to-r from-red-500 to-red-600'
                    }`}
                  style={{ width: `${machine.metrics.oee}%` }}
                ></div>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-md p-2 border border-blue-200">
                <p className="text-xs text-gray-600">Output</p>
                <p className="text-base font-bold text-blue-700">
                  {(machine.metrics.actualOutput / 1000).toFixed(1)}k
                </p>
                <p className="text-xs text-gray-500">
                  of {(machine.metrics.targetOutput / 1000).toFixed(1)}k
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-md p-2 border border-purple-200">
                <p className="text-xs text-gray-600">Throughput</p>
                <p className="text-base font-bold text-purple-700">
                  {machine.metrics.throughput}
                </p>
                <p className="text-xs text-gray-500">units/hour</p>
              </div>
            </div>

            {/* Performance Indicators */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center">
                <p className="text-xs text-gray-500">Cycle</p>
                <p className={`text-xs font-bold ${machine.metrics.cycleTime > machine.metrics.targetCycleTime * 1.1 ? 'text-red-600' : 'text-green-600'
                  }`}>
                  {machine.metrics.cycleTime}s
                </p>
              </div>
              <div className="text-center border-x border-gray-200">
                <p className="text-xs text-gray-500">Quality</p>
                <p className="text-xs font-bold text-green-600">{machine.metrics.quality}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Reject</p>
                <p className="text-xs font-bold text-red-600">{machine.metrics.reject}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-xs">
              <span className="text-gray-600 flex items-center gap-1">
                <Activity size={10} />
                {machine.totalRunningHours}h runtime
              </span>
              <span className="text-blue-600 font-medium">
                PM: {new Date(machine.nextMaintenance).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredMachines.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <Activity className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500 text-lg font-medium">No machines found</p>
          <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filter</p>
        </div>
      )}

      {/* Machine Detail Modal */}
      {selectedMachine && (
        <MachineDetail
          machine={selectedMachine}
          onClose={() => setSelectedMachine(null)}
        />
      )}
    </div>
  );
}