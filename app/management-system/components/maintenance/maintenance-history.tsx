'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Search, Calendar, Clock, User, Download, Filter, Settings, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import BaseModal from '@/app/components/ui/BaseModal';

const fetcher = (url: string) => fetch(url).then(r => r.json());

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return '0m 0s';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export default function MaintenanceHistory() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMachine, setFilterMachine] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedHistoryModal, setSelectedHistoryModal] = useState<any | null>(null);

  // Build query string
  const params = new URLSearchParams();
  if (filterMachine !== 'all') params.set('machineId', filterMachine);
  if (filterType !== 'all') params.set('type', filterType);
  if (dateRange.start) params.set('startDate', dateRange.start);
  if (dateRange.end) params.set('endDate', dateRange.end);

  const { data: apiResponse, isLoading } = useSWR(`/api/work-order-history?${params.toString()}`, fetcher);
  
  const historyData = apiResponse?.success ? apiResponse.data : [];

  const filteredHistory = (historyData || []).filter((item: any) => {
    if (!searchTerm) return true;
    const searchLow = searchTerm.toLowerCase();
    const machineName = item.machine?.name_machine?.toLowerCase() || '';
    const woCode = item.work_order_code?.toLowerCase() || '';
    const desc = item.description?.toLowerCase() || '';
    return machineName.includes(searchLow) || woCode.includes(searchLow) || desc.includes(searchLow);
  });

  const totalDurationSeconds = filteredHistory.reduce((sum: number, item: any) => sum + (Number(item.duration_seconds) || 0), 0);
  const totalDurationHours = totalDurationSeconds / 3600;

  const exportToCSV = () => {
    if (!filteredHistory.length) return;
    const headers = ['Date', 'Machine', 'Type', 'Work Order', 'Technician', 'Duration (seconds)', 'Description', 'Action Taken'];
    const rows = filteredHistory.map((item: any) => [
      new Date(item.event_start).toISOString(),
      item.machine?.name_machine || 'Unknown',
      item.event_type,
      item.work_order_code || '',
      item.technician?.name || '',
      item.duration_seconds || 0,
      `"${(item.description || '').replace(/"/g, '""')}"`,
      `"${(item.action_taken || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `maintenance_history_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'maintenance': return 'bg-blue-100 text-blue-700';
      case 'downtime': return 'bg-rose-100 text-rose-700';
      case 'on hold': return 'bg-amber-100 text-amber-700';
      case 'repair': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Machine History</h2>
          <p className="text-xs text-gray-500">Record of all maintenance, downtime, and repair events</p>
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
            <span className="text-xs font-medium text-gray-600">Total Events</span>
            <FileText className="text-blue-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-gray-900">{filteredHistory.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">recorded events</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">Total Duration</span>
            <Clock className="text-orange-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalDurationHours.toFixed(1)}h</p>
          <p className="text-xs text-gray-500 mt-0.5">total event time</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">Avg. Duration</span>
            <Clock className="text-purple-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {filteredHistory.length > 0 ? (totalDurationHours / filteredHistory.length).toFixed(1) : 0}h
          </p>
          <p className="text-xs text-gray-500 mt-0.5">per event</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3">
           <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">Downtimes</span>
            <AlertTriangle className="text-rose-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {filteredHistory.filter((i: any) => i.event_type === 'downtime').length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">recorded downtimes</p>
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
             // Using simple text input or mock selections since actual machine lists require an extra fetch. 
            // In a full app, we would fetch machine list and populate this.
            value={filterMachine}
            onChange={(e) => setFilterMachine(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Machines</option>
            {/* If we had machine list, we'd map it here. For now it triggers "all" by default. User can rely on search string to filter machine names. */}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="maintenance">Maintenance</option>
            <option value="downtime">Downtime</option>
            <option value="repair">Repair</option>
            <option value="on hold">On Hold</option>
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
        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date & Time</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Machine</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Event Type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Work Order</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description & Action</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Technician</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredHistory.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-gray-900">
                          {new Date(item.event_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {new Date(item.event_start).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          {item.event_end && ` - ${new Date(item.event_end).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Settings size={12} className="text-slate-400" />
                        <span className="text-xs font-semibold text-gray-900">{item.machine?.name_machine || '-'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getTypeColor(item.event_type)}`}>
                        {item.event_type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {item.work_order_code ? (
                        <div className="flex flex-col gap-0.5">
                          <span 
                            className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                            onClick={() => setSelectedHistoryModal(item)}
                          >
                            {item.work_order_code}
                          </span>
                          {item.priority && (
                            <span className="text-[9px] text-gray-500 uppercase">{item.priority} priority</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-xs text-gray-900 max-w-sm">
                        {item.description || <span className="text-gray-400 italic">No description</span>}
                      </div>
                      {item.action_taken && (
                        <div className="text-[10px] text-green-700 mt-1 flex gap-1 items-start bg-green-50 p-1.5 rounded border border-green-100 w-fit">
                          <CheckCircle size={12} className="flex-shrink-0 mt-0.5" />
                          <span>{item.action_taken}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-gray-400" />
                        <span className="text-xs text-gray-700">{item.technician?.name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-gray-400" />
                        <span className="text-xs font-medium text-gray-900">
                           {formatDuration(item.duration_seconds)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!isLoading && filteredHistory.length === 0 && (
          <div className="text-center py-12 text-gray-500 border-t border-gray-100">
            <Filter size={48} className="mx-auto mb-4 opacity-30 text-slate-400" />
            <p className="font-medium text-sm text-slate-600">No history found</p>
            <p className="text-xs text-slate-400 mt-1">Adjust your filters to see more results.</p>
          </div>
        )}
      </div>

      {/* History Detail Modal via shared BaseModal */}
      <BaseModal
        isOpen={!!selectedHistoryModal}
        onClose={() => setSelectedHistoryModal(null)}
        title={selectedHistoryModal?.work_order_code || 'Historical Record'}
        subtitle={
          <>
            <Settings className="w-4 h-4" />
            {selectedHistoryModal?.machine?.name_machine || 'Unknown Machine'} 
          </>
        }
        headerGradient={
          selectedHistoryModal?.event_type?.toLowerCase() === 'downtime' 
            ? 'bg-gradient-to-r from-rose-700 via-red-800 to-rose-900'
            : selectedHistoryModal?.event_type?.toLowerCase() === 'maintenance'
            ? 'bg-gradient-to-r from-teal-700 via-emerald-800 to-teal-900'
            : 'bg-gradient-to-r from-blue-700 via-indigo-800 to-purple-900'
        }
        headerTags={
           <span className="px-4 py-1.5 rounded-full text-xs font-bold shadow-sm backdrop-blur-md border border-white/20 text-white bg-white/10 uppercase">
             {selectedHistoryModal?.event_type || 'Record'}
           </span>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Event Type</p>
              <p className="font-bold text-gray-900 capitalize">{selectedHistoryModal?.event_type || '-'}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Work Order Status</p>
              <p className="font-bold text-gray-900 capitalize">{selectedHistoryModal?.work_order_status || '-'}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Priority</p>
              <p className="font-bold text-gray-900 capitalize">{selectedHistoryModal?.priority || '-'}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Duration</p>
              <p className="font-bold text-gray-900">{formatDuration(selectedHistoryModal?.duration_seconds)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Technician / Assigned To</p>
              <p className="font-bold text-gray-900 flex items-center gap-2">
                <User size={14} className="text-gray-400" />
                {selectedHistoryModal?.technician?.name || selectedHistoryModal?.assigned_to || '-'}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Resolved By</p>
              <p className="font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle size={14} className="text-gray-400" />
                {selectedHistoryModal?.resolved_by || '-'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Description</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-800 h-24 overflow-y-auto">
                {selectedHistoryModal?.description || <span className="italic text-gray-400">No description provided.</span>}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Root Cause</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-800 h-24 overflow-y-auto">
                {selectedHistoryModal?.root_cause || <span className="italic text-gray-400">No root cause recorded.</span>}
              </div>
            </div>
          </div>

          {selectedHistoryModal?.action_taken && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <CheckCircle size={16} className="text-green-600" />
                Action Taken
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-900">
                {selectedHistoryModal.action_taken}
              </div>
            </div>
          )}

          <details className="mt-6 bg-slate-50 border border-slate-200 rounded-lg">
            <summary className="font-semibold text-sm text-slate-700 cursor-pointer p-4 hover:bg-slate-100 transition-colors">
              System Reference Data (Raw)
            </summary>
            <div className="p-4 border-t border-slate-200 text-xs text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              <div className="truncate"><span className="font-semibold text-slate-800">id:</span> {selectedHistoryModal?.id || '-'}</div>
              <div className="truncate"><span className="font-semibold text-slate-800">work_order_id:</span> {selectedHistoryModal?.work_order_id || '-'}</div>
              <div className="truncate"><span className="font-semibold text-slate-800">machine_id:</span> {selectedHistoryModal?.machine_id || '-'}</div>
              <div className="truncate"><span className="font-semibold text-slate-800">line_id:</span> {selectedHistoryModal?.line_id || '-'}</div>
              <div className="truncate"><span className="font-semibold text-slate-800">machine_status_log_id:</span> {selectedHistoryModal?.machine_status_log_id || '-'}</div>
              <div className="truncate"><span className="font-semibold text-slate-800">technician_id:</span> {selectedHistoryModal?.technician_id || '-'}</div>
              <div className="truncate"><span className="font-semibold text-slate-800">event_start:</span> {selectedHistoryModal?.event_start ? new Date(selectedHistoryModal.event_start).toLocaleString('id-ID') : '-'}</div>
              <div className="truncate"><span className="font-semibold text-slate-800">event_end:</span> {selectedHistoryModal?.event_end ? new Date(selectedHistoryModal.event_end).toLocaleString('id-ID') : '-'}</div>
              <div className="truncate"><span className="font-semibold text-slate-800">is_resolved:</span> {selectedHistoryModal?.is_resolved !== undefined ? (selectedHistoryModal.is_resolved ? 'true' : 'false') : '-'}</div>
              <div className="truncate"><span className="font-semibold text-slate-800">resolved_at:</span> {selectedHistoryModal?.resolved_at ? new Date(selectedHistoryModal.resolved_at).toLocaleString('id-ID') : '-'}</div>
              <div className="truncate"><span className="font-semibold text-slate-800">created_at:</span> {selectedHistoryModal?.created_at ? new Date(selectedHistoryModal.created_at).toLocaleString('id-ID') : '-'}</div>
              <div className="truncate"><span className="font-semibold text-slate-800">updated_at:</span> {selectedHistoryModal?.updated_at ? new Date(selectedHistoryModal.updated_at).toLocaleString('id-ID') : '-'}</div>
            </div>
          </details>
        </div>
      </BaseModal>
    </div>
  );
}