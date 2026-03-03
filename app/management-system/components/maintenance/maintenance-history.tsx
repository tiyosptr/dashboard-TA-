'use client';

import { useState } from 'react';
import { Search, Calendar, Clock, DollarSign, User, Download, Filter } from 'lucide-react';
import { MaintenanceHistory as MaintenanceHistoryType } from '@/types';

export default function MaintenanceHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMachine, setFilterMachine] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Mock data
  const historyData: MaintenanceHistoryType[] = [
    {
      id: 'MH-001',
      machineId: 'M-003',
      date: '2025-01-15',
      workOrderId: 'WO-2025-001235',
      type: 'Corrective',
      duration: '2.5 hours',
      cost: 'Rp 2.500.000',
      technician: 'Ahmad Electrician',
      description: 'Motor cooling fan replacement due to overheating',
      partsUsed: ['Cooling Fan Motor CF-250', 'Thermal Paste', 'Cleaning Materials'],
    },
    {
      id: 'MH-002',
      machineId: 'M-001',
      date: '2025-01-10',
      workOrderId: 'WO-2025-001200',
      type: 'Preventive',
      duration: '3 hours',
      cost: 'Rp 1.800.000',
      technician: 'Budi Santoso',
      description: 'Scheduled preventive maintenance - 750 hours interval',
      partsUsed: ['Hydraulic Oil SAE 68 (5L)', 'Air Filter AF-2250', 'Grease Lithium EP2'],
    },
    {
      id: 'MH-003',
      machineId: 'M-005',
      date: '2025-01-08',
      workOrderId: 'WO-2025-001180',
      type: 'Corrective',
      duration: '4 hours',
      cost: 'Rp 3.200.000',
      technician: 'Dedi Maintenance',
      description: 'Emergency repair - Belt conveyor malfunction',
      partsUsed: ['Conveyor Belt Type A', 'Belt Tensioner', 'Bearings Set'],
    },
    {
      id: 'MH-004',
      machineId: 'M-002',
      date: '2025-01-05',
      workOrderId: 'WO-2025-001150',
      type: 'Inspection',
      duration: '1 hour',
      cost: 'Rp 500.000',
      technician: 'Eko Mechanic',
      description: 'Weekly safety inspection and visual check',
      partsUsed: [],
    },
    {
      id: 'MH-005',
      machineId: 'M-004',
      date: '2025-01-03',
      workOrderId: 'WO-2025-001120',
      type: 'Corrective',
      duration: '2 hours',
      cost: 'Rp 1.500.000',
      technician: 'Ahmad Electrician',
      description: 'Electrical panel component replacement',
      partsUsed: ['Circuit Breaker 50A', 'Contactor', 'Wiring Set'],
    },
    {
      id: 'MH-006',
      machineId: 'M-006',
      date: '2024-12-28',
      workOrderId: 'WO-2024-001050',
      type: 'Preventive',
      duration: '2.5 hours',
      cost: 'Rp 2.000.000',
      technician: 'Budi Santoso',
      description: 'Monthly preventive maintenance service',
      partsUsed: ['Welding Electrode Set', 'Gas Regulator', 'Safety Equipment'],
    },
    {
      id: 'MH-007',
      machineId: 'M-001',
      date: '2024-12-20',
      workOrderId: 'WO-2024-001000',
      type: 'Corrective',
      duration: '3.5 hours',
      cost: 'Rp 2.800.000',
      technician: 'Dedi Maintenance',
      description: 'Hydraulic system pressure leak repair',
      partsUsed: ['Hydraulic Seal Kit', 'Pressure Gauge', 'Hydraulic Hose 2m'],
    },
    {
      id: 'MH-008',
      machineId: 'M-003',
      date: '2024-12-15',
      workOrderId: 'WO-2024-000980',
      type: 'Preventive',
      duration: '3 hours',
      cost: 'Rp 1.900.000',
      technician: 'Eko Mechanic',
      description: 'Quarterly comprehensive maintenance check',
      partsUsed: ['Various Filters', 'Lubricants', 'Cleaning Materials'],
    },
  ];

  const filteredHistory = historyData.filter(item => {
    const matchesSearch = item.machineId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.workOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMachine = filterMachine === 'all' || item.machineId === filterMachine;
    const matchesType = filterType === 'all' || item.type === filterType;

    let matchesDate = true;
    if (dateRange.start && dateRange.end) {
      const itemDate = new Date(item.date);
      matchesDate = itemDate >= new Date(dateRange.start) && itemDate <= new Date(dateRange.end);
    }

    return matchesSearch && matchesMachine && matchesType && matchesDate;
  });

  const totalCost = filteredHistory.reduce((sum, item) => {
    const cost = parseInt(item.cost.replace(/[^0-9]/g, ''));
    return sum + cost;
  }, 0);

  const totalDuration = filteredHistory.reduce((sum, item) => {
    const hours = parseFloat(item.duration.split(' ')[0]);
    return sum + hours;
  }, 0);

  const exportToCSV = () => {
    console.log('Exporting to CSV...');
    // Implementation for CSV export
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Preventive': return 'bg-green-100 text-green-700';
      case 'Corrective': return 'bg-orange-100 text-orange-700';
      case 'Inspection': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Maintenance History</h2>
          <p className="text-xs text-gray-500">Complete record of all maintenance activities</p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">Total Records</span>
            <Calendar className="text-blue-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-gray-900">{filteredHistory.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">maintenance activities</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">Total Cost</span>
            <DollarSign className="text-green-600" size={16} />
          </div>
          <p className="text-lg font-bold text-gray-900">
            Rp {totalCost.toLocaleString('id-ID')}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">maintenance expenses</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">Total Hours</span>
            <Clock className="text-orange-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalDuration.toFixed(1)}h</p>
          <p className="text-xs text-gray-500 mt-0.5">downtime for maintenance</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">Avg. Duration</span>
            <Clock className="text-purple-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {filteredHistory.length > 0 ? (totalDuration / filteredHistory.length).toFixed(1) : 0}h
          </p>
          <p className="text-xs text-gray-500 mt-0.5">per maintenance</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterMachine}
            onChange={(e) => setFilterMachine(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Machines</option>
            <option value="M-001">M-001</option>
            <option value="M-002">M-002</option>
            <option value="M-003">M-003</option>
            <option value="M-004">M-004</option>
            <option value="M-005">M-005</option>
            <option value="M-006">M-006</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="Preventive">Preventive</option>
            <option value="Corrective">Corrective</option>
            <option value="Inspection">Inspection</option>
          </select>

          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Machine
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Work Order
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Technician
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredHistory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-900">
                        {new Date(item.date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="text-xs font-semibold text-gray-900">{item.machineId}</span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="text-xs text-blue-600 hover:underline cursor-pointer">
                      {item.workOrderId}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getTypeColor(item.type)}`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-xs text-gray-900 max-w-xs">
                      {item.description}
                    </div>
                    {item.partsUsed.length > 0 && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        Parts: {item.partsUsed.slice(0, 2).join(', ')}
                        {item.partsUsed.length > 2 && ` +${item.partsUsed.length - 2} more`}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-700">{item.technician}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-900">{item.duration}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <DollarSign size={12} className="text-gray-400" />
                      <span className="text-xs font-semibold text-gray-900">{item.cost}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredHistory.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Filter size={48} className="mx-auto mb-4 opacity-50" />
            <p>No maintenance history found with current filters</p>
          </div>
        )}
      </div>
    </div>
  );
}