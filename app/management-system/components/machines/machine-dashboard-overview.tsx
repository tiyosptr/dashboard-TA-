'use client';

import { useState } from 'react';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Zap,
  ThermometerSun,
  Wind,
  BarChart3,
  Settings
} from 'lucide-react';

interface MachineData {
  id: string;
  name: string;
  type: string;
  status: 'running' | 'idle' | 'maintenance' | 'error';
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  currentOutput: number;
  targetOutput: number;
  temperature: number;
  pressure: number;
  speed: number;
  uptime: string;
  lastMaintenance: string;
  nextMaintenance: string;
}

const mockMachines: MachineData[] = [
  {
    id: 'EXT-001',
    name: 'Extruder #1',
    type: 'Extruder',
    status: 'running',
    oee: 87.5,
    availability: 94.2,
    performance: 91.8,
    quality: 98.5,
    currentOutput: 1247,
    targetOutput: 1500,
    temperature: 185,
    pressure: 45.2,
    speed: 95,
    uptime: '12h 34m',
    lastMaintenance: '2024-11-10',
    nextMaintenance: '2024-11-24'
  },
  {
    id: 'MOL-003',
    name: 'Molding #3',
    type: 'Molding',
    status: 'running',
    oee: 92.3,
    availability: 96.5,
    performance: 94.2,
    quality: 99.1,
    currentOutput: 2840,
    targetOutput: 3000,
    temperature: 210,
    pressure: 52.8,
    speed: 98,
    uptime: '18h 12m',
    lastMaintenance: '2024-11-12',
    nextMaintenance: '2024-11-26'
  },
  {
    id: 'CNV-002',
    name: 'Conveyor #2',
    type: 'Conveyor',
    status: 'idle',
    oee: 65.2,
    availability: 78.5,
    performance: 85.2,
    quality: 97.5,
    currentOutput: 890,
    targetOutput: 1200,
    temperature: 28,
    pressure: 0,
    speed: 0,
    uptime: '0h 0m',
    lastMaintenance: '2024-11-15',
    nextMaintenance: '2024-11-29'
  },
  {
    id: 'EXT-005',
    name: 'Extruder #5',
    type: 'Extruder',
    status: 'error',
    oee: 45.8,
    availability: 52.3,
    performance: 88.5,
    quality: 99.0,
    currentOutput: 324,
    targetOutput: 1500,
    temperature: 95,
    pressure: 12.4,
    speed: 25,
    uptime: '2h 15m',
    lastMaintenance: '2024-11-08',
    nextMaintenance: '2024-11-22'
  },
  {
    id: 'MOL-001',
    name: 'Molding #1',
    type: 'Molding',
    status: 'maintenance',
    oee: 0,
    availability: 0,
    performance: 0,
    quality: 0,
    currentOutput: 0,
    targetOutput: 3000,
    temperature: 25,
    pressure: 0,
    speed: 0,
    uptime: '0h 0m',
    lastMaintenance: '2024-11-17',
    nextMaintenance: '2024-12-01'
  },
  {
    id: 'ASM-004',
    name: 'Assembly #4',
    type: 'Assembly',
    status: 'running',
    oee: 89.7,
    availability: 93.8,
    performance: 92.5,
    quality: 99.3,
    currentOutput: 1680,
    targetOutput: 1800,
    temperature: 32,
    pressure: 35.6,
    speed: 92,
    uptime: '15h 47m',
    lastMaintenance: '2024-11-13',
    nextMaintenance: '2024-11-27'
  }
];

export default function MachineDashboardOverview() {
  const [selectedMachine, setSelectedMachine] = useState<MachineData | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'idle':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'maintenance':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'error':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle size={16} />;
      case 'idle':
        return <Clock size={16} />;
      case 'maintenance':
        return <Settings size={16} />;
      case 'error':
        return <AlertCircle size={16} />;
      default:
        return <Activity size={16} />;
    }
  };

  const filteredMachines = filterStatus === 'all' 
    ? mockMachines 
    : mockMachines.filter(m => m.status === filterStatus);

  const machineStats = {
    total: mockMachines.length,
    running: mockMachines.filter(m => m.status === 'running').length,
    idle: mockMachines.filter(m => m.status === 'idle').length,
    maintenance: mockMachines.filter(m => m.status === 'maintenance').length,
    error: mockMachines.filter(m => m.status === 'error').length,
    avgOEE: (mockMachines.reduce((sum, m) => sum + m.oee, 0) / mockMachines.length).toFixed(1)
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Activity className="text-gray-600" size={20} />
            <span className="text-2xl font-bold text-gray-900">{machineStats.total}</span>
          </div>
          <div className="text-sm text-gray-600">Total Machines</div>
        </div>

        <div className="bg-green-50 rounded-xl p-4 border border-green-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="text-green-600" size={20} />
            <span className="text-2xl font-bold text-green-700">{machineStats.running}</span>
          </div>
          <div className="text-sm text-green-700">Running</div>
        </div>

        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Clock className="text-yellow-600" size={20} />
            <span className="text-2xl font-bold text-yellow-700">{machineStats.idle}</span>
          </div>
          <div className="text-sm text-yellow-700">Idle</div>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Settings className="text-blue-600" size={20} />
            <span className="text-2xl font-bold text-blue-700">{machineStats.maintenance}</span>
          </div>
          <div className="text-sm text-blue-700">Maintenance</div>
        </div>

        <div className="bg-red-50 rounded-xl p-4 border border-red-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="text-red-600" size={20} />
            <span className="text-2xl font-bold text-red-700">{machineStats.error}</span>
          </div>
          <div className="text-sm text-red-700">Error</div>
        </div>

        <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="text-purple-600" size={20} />
            <span className="text-2xl font-bold text-purple-700">{machineStats.avgOEE}%</span>
          </div>
          <div className="text-sm text-purple-700">Avg OEE</div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'running', 'idle', 'maintenance', 'error'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterStatus === status
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Machine Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredMachines.map((machine) => (
          <div
            key={machine.id}
            onClick={() => setSelectedMachine(machine)}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold text-lg">{machine.name}</h3>
                  <p className="text-blue-100 text-sm">{machine.type} • {machine.id}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(machine.status)}`}>
                  {getStatusIcon(machine.status)}
                  {machine.status.toUpperCase()}
                </div>
              </div>
            </div>

            {/* OEE Metrics */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">OEE Score</span>
                <span className={`text-2xl font-bold ${
                  machine.oee >= 85 ? 'text-green-600' :
                  machine.oee >= 70 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {machine.oee.toFixed(1)}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Availability</div>
                  <div className="text-sm font-bold text-gray-900">{machine.availability.toFixed(1)}%</div>
                </div>
                <div className="text-center border-x border-gray-300">
                  <div className="text-xs text-gray-500 mb-1">Performance</div>
                  <div className="text-sm font-bold text-gray-900">{machine.performance.toFixed(1)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Quality</div>
                  <div className="text-sm font-bold text-gray-900">{machine.quality.toFixed(1)}%</div>
                </div>
              </div>
            </div>

            {/* Production Output */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Production Output</span>
                <span className="text-sm text-gray-500">
                  {machine.currentOutput} / {machine.targetOutput}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    (machine.currentOutput / machine.targetOutput * 100) >= 90 ? 'bg-green-600' :
                    (machine.currentOutput / machine.targetOutput * 100) >= 70 ? 'bg-yellow-600' :
                    'bg-red-600'
                  }`}
                  style={{ width: `${Math.min((machine.currentOutput / machine.targetOutput * 100), 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {((machine.currentOutput / machine.targetOutput) * 100).toFixed(1)}% of target
              </div>
            </div>

            {/* Real-time Metrics */}
            <div className="p-4 grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ThermometerSun className="text-orange-600" size={16} />
                </div>
                <div className="text-lg font-bold text-gray-900">{machine.temperature}°C</div>
                <div className="text-xs text-gray-500">Temperature</div>
              </div>
              <div className="text-center border-x border-gray-200">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Wind className="text-blue-600" size={16} />
                </div>
                <div className="text-lg font-bold text-gray-900">{machine.pressure}</div>
                <div className="text-xs text-gray-500">Pressure (bar)</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Zap className="text-yellow-600" size={16} />
                </div>
                <div className="text-lg font-bold text-gray-900">{machine.speed}%</div>
                <div className="text-xs text-gray-500">Speed</div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 pb-4 pt-2 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-gray-600">
                  <Clock size={12} />
                  <span>Uptime: {machine.uptime}</span>
                </div>
                <button className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 group-hover:underline">
                  <BarChart3 size={12} />
                  Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Machine Detail Modal */}
      {selectedMachine && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedMachine(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedMachine.name}</h2>
                  <p className="text-blue-100">{selectedMachine.type} • {selectedMachine.id}</p>
                </div>
                <button
                  onClick={() => setSelectedMachine(null)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* OEE Details */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <h3 className="font-semibold text-lg mb-4 text-gray-900">OEE Performance</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">{selectedMachine.oee.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Overall OEE</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-green-600 mb-2">{selectedMachine.availability.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Availability</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-yellow-600 mb-2">{selectedMachine.performance.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Performance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-purple-600 mb-2">{selectedMachine.quality.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Quality</div>
                  </div>
                </div>
              </div>

              {/* Production & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h4 className="font-semibold mb-4 text-gray-900">Production Status</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Current Output</span>
                      <span className="font-bold text-gray-900">{selectedMachine.currentOutput}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Target Output</span>
                      <span className="font-bold text-gray-900">{selectedMachine.targetOutput}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Achievement</span>
                      <span className={`font-bold ${
                        (selectedMachine.currentOutput / selectedMachine.targetOutput * 100) >= 90 ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {((selectedMachine.currentOutput / selectedMachine.targetOutput) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="text-gray-600">Uptime</span>
                      <span className="font-bold text-blue-600">{selectedMachine.uptime}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h4 className="font-semibold mb-4 text-gray-900">Real-time Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 flex items-center gap-2">
                        <ThermometerSun className="text-orange-600" size={18} />
                        Temperature
                      </span>
                      <span className="font-bold text-gray-900">{selectedMachine.temperature}°C</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Wind className="text-blue-600" size={18} />
                        Pressure
                      </span>
                      <span className="font-bold text-gray-900">{selectedMachine.pressure} bar</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Zap className="text-yellow-600" size={18} />
                        Speed
                      </span>
                      <span className="font-bold text-gray-900">{selectedMachine.speed}%</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="text-gray-600">Status</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(selectedMachine.status)}`}>
                        {getStatusIcon(selectedMachine.status)}
                        {selectedMachine.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Maintenance Schedule */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h4 className="font-semibold mb-4 text-gray-900">Maintenance Schedule</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="text-green-600" size={24} />
                    <div>
                      <div className="text-sm text-gray-600">Last Maintenance</div>
                      <div className="font-bold text-gray-900">{selectedMachine.lastMaintenance}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <Clock className="text-blue-600" size={24} />
                    <div>
                      <div className="text-sm text-gray-600">Next Maintenance</div>
                      <div className="font-bold text-gray-900">{selectedMachine.nextMaintenance}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col md:flex-row gap-3">
                <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors">
                  View Full Report
                </button>
                <button className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-lg transition-colors">
                  Schedule Maintenance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}