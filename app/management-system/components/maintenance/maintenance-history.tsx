'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Search, Calendar, Clock, User, Download, Filter, Settings, AlertTriangle, FileText, CheckCircle, History as HistoryIcon, Briefcase, Loader2, ChevronRight } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'status-logs' | 'work-orders'>('status-logs');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMachine, setFilterMachine] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedHistoryModal, setSelectedHistoryModal] = useState<any | null>(null);

  const [filterLine, setFilterLine] = useState('all');

  // Build query string
  const params = new URLSearchParams();
  if (filterMachine !== 'all') params.set('machineId', filterMachine);
  if (filterType !== 'all') params.set('type', filterType);
  if (dateRange.start) params.set('startDate', dateRange.start);
  if (dateRange.end) params.set('endDate', dateRange.end);

  const { data: woResponse, isLoading: woLoading } = useSWR(`/api/work-order-history?${params.toString()}`, fetcher);
  const { data: logResponse, isLoading: logLoading } = useSWR(`/api/machines/history/status-logs?${params.toString()}`, fetcher);
  const { data: linesResponse } = useSWR('/api/lines', fetcher);
  
  const woHistory = woResponse?.success ? woResponse.data : [];
  const logSummaries = logResponse?.success ? logResponse.machineSummaries : [];
  const allLines = linesResponse?.success ? linesResponse.data : [];

  const filteredWo = (woHistory || []).filter((item: any) => {
    if (!searchTerm) return true;
    const searchLow = searchTerm.toLowerCase();
    const machineName = item.machine?.name_machine?.toLowerCase() || '';
    const woCode = item.work_order_code?.toLowerCase() || '';
    const desc = item.description?.toLowerCase() || '';
    return machineName.includes(searchLow) || woCode.includes(searchLow) || desc.includes(searchLow);
  }).sort((a: any, b: any) => {
    const dateA = a.event_start ? new Date(a.event_start).getTime() : 0;
    const dateB = b.event_start ? new Date(b.event_start).getTime() : 0;
    return dateB - dateA;
  });

  const filteredSummaries = (logSummaries || []).filter((item: any) => {
    const line = item.line_name || 'Unassigned';
    if (filterLine !== 'all' && line !== filterLine) return false;

    if (!searchTerm) return true;
    const searchLow = searchTerm.toLowerCase();
    const machineName = item.name_machine?.toLowerCase() || '';
    return machineName.includes(searchLow);
  });

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'maintenance': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'downtime': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'on hold': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'inactive': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'repair': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'maintenance': return <Settings size={14} className="text-blue-500" />;
      case 'downtime': return <AlertTriangle size={14} className="text-rose-500" />;
      case 'on hold': return <Clock size={14} className="text-amber-500" />;
      case 'inactive': return <CheckCircle size={14} className="text-slate-500" />;
      default: return <Clock size={14} className="text-gray-500" />;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <HistoryIcon className="text-indigo-600" size={24} />
            Historical Archives
          </h2>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Audit log of all machine events and maintenance tasks</p>
        </div>
        
        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('status-logs')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTab === 'status-logs' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock size={14} />
            Machine Logs
          </button>
          <button
            onClick={() => setActiveTab('work-orders')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTab === 'work-orders' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Briefcase size={14} />
            Work Orders
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-slate-100 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder={`Search ${activeTab === 'status-logs' ? 'machine logs' : 'work orders'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all font-medium"
          />
        </div>

        {activeTab === 'status-logs' && (
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              value={filterLine}
              onChange={(e) => setFilterLine(e.target.value)}
              className="pl-9 pr-8 py-2 text-xs font-bold border border-slate-200 rounded-xl appearance-none bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 text-slate-600"
            >
              <option value="all">All Lines</option>
              {allLines.map((line: any) => (
                <option key={line.id} value={line.name}>{line.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-1.5 text-[11px] font-bold bg-transparent border-none focus:ring-0 outline-none text-slate-600"
          />
          <span className="text-slate-300 self-center">|</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-1.5 text-[11px] font-bold bg-transparent border-none focus:ring-0 outline-none text-slate-600"
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'status-logs' ? (
          <div className="space-y-8">
            {logLoading ? (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {Array.from({ length: 6 }).map((_, i) => (
                   <div key={i} className="bg-slate-50 h-32 rounded-2xl animate-pulse border border-slate-100" />
                 ))}
               </div>
            ) : filteredSummaries.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
                <Clock size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-bold">No machine history found</p>
              </div>
            ) : (
              Object.entries(
                filteredSummaries.reduce((acc: any, log: any) => {
                  const line = log.line_name || 'Unassigned';
                  if (!acc[line]) acc[line] = [];
                  acc[line].push(log);
                  return acc;
                }, {})
              )
              .sort(([lineA], [lineB]) => lineA.localeCompare(lineB))
              .map(([lineName, summaries]: [string, any]) => (
                <div key={lineName} className="space-y-4">
                  <div className="flex items-center gap-3 px-2">
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                      Line: {lineName}
                    </span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {summaries
                      .sort((a: any, b: any) => (a.process_order || 0) - (b.process_order || 0))
                      .map((agg: any) => (
                        <div 
                          key={agg.machine_id} 
                          onClick={() => router.push(`/management-system/history/machine/${agg.machine_id}`)}
                          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1 transition-all group cursor-pointer relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-500" />
                          
                          <div className="relative flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-indigo-600 transition-colors">
                                <Settings size={20} className="text-slate-400 group-hover:text-white transition-colors" />
                              </div>
                              <div>
                                <h3 className="font-black text-slate-900 text-sm tracking-tight">{agg.name_machine}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{agg.process_name || 'Process'}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="relative grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-50">
                             <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/50 border border-blue-100/50">
                               <span className="text-[9px] font-black text-blue-600 uppercase">Maint.</span>
                               <span className="text-xs font-black text-blue-700">{agg.maintenanceCount}</span>
                             </div>
                             <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50/50 border border-rose-100/50">
                               <span className="text-[9px] font-black text-rose-600 uppercase">Down.</span>
                               <span className="text-xs font-black text-rose-700">{agg.downtimeCount}</span>
                             </div>
                             <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 border border-amber-100/50">
                               <span className="text-[9px] font-black text-amber-600 uppercase">Hold</span>
                               <span className="text-xs font-black text-amber-700">{agg.onHoldCount}</span>
                             </div>
                             <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 border border-slate-100/50">
                               <span className="text-[9px] font-black text-slate-600 uppercase">Inact.</span>
                               <span className="text-xs font-black text-slate-700">{agg.inactiveCount}</span>
                             </div>
                          </div>

                          <div className="relative flex justify-end items-center mt-4 text-[10px] font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">
                             View Complete Logs <ChevronRight size={12} className="ml-1" />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Work Order Table (Previous Implementation) */
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto min-h-[400px]">
              {woLoading ? (
                 <div className="flex items-center justify-center py-40">
                   <Loader2 size={32} className="animate-spin text-indigo-600" />
                 </div>
              ) : filteredWo.length === 0 ? (
                <div className="text-center py-20">
                  <Briefcase size={48} className="mx-auto text-slate-100 mb-4" />
                  <p className="text-slate-400 font-bold">No work order history found</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Date & Time</th>
                      <th className="px-5 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Machine</th>
                      <th className="px-5 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Event Type</th>
                      <th className="px-5 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Work Order</th>
                      <th className="px-5 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</th>
                      <th className="px-5 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Technician</th>
                      <th className="px-5 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredWo.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900">
                              {new Date(item.event_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(item.event_start).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="text-xs font-bold text-slate-700">{item.machine?.name_machine || '-'}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${getTypeColor(item.event_type)}`}>
                            {item.event_type}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span 
                            className="text-xs font-black text-indigo-600 hover:text-indigo-700 cursor-pointer underline underline-offset-4 decoration-indigo-200"
                            onClick={() => setSelectedHistoryModal(item)}
                          >
                            {item.work_order_code || '-'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-xs text-slate-600 line-clamp-1 max-w-[200px] font-medium">{item.description || '-'}</p>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-black border border-indigo-100">
                              {(item.technician?.name || '?').substring(0, 1)}
                            </div>
                            <span className="text-xs font-bold text-slate-700">{item.technician?.name || '-'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                            {formatDuration(item.duration_seconds || (item.event_start && item.event_end ? Math.floor((new Date(item.event_end).getTime() - new Date(item.event_start).getTime()) / 1000) : null))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
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
              <p className="font-bold text-gray-900">{formatDuration(selectedHistoryModal?.duration_seconds || (selectedHistoryModal?.event_start && selectedHistoryModal?.event_end ? Math.floor((new Date(selectedHistoryModal.event_end).getTime() - new Date(selectedHistoryModal.event_start).getTime()) / 1000) : null))}</p>
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

          <div className="grid grid-cols-1 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Description</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800 h-24 overflow-y-auto">
                {selectedHistoryModal?.description || <span className="italic text-gray-400">No description provided.</span>}
              </div>
            </div>
          </div>

          {selectedHistoryModal?.task && Array.isArray(selectedHistoryModal.task) && selectedHistoryModal.task.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <CheckCircle size={16} className="text-indigo-600" />
                  Actions Performed
                </p>
                <button
                  onClick={() => {
                    const printContent = `
                      <html>
                        <head>
                          <title>Work Order Tasks - ${selectedHistoryModal.work_order_code || 'N/A'}</title>
                          <style>
                            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #333; }
                            h2 { margin-bottom: 5px; color: #111; }
                            .header { margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
                            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; color: #555; }
                            .task-list { list-style: none; padding: 0; }
                            .task-item { padding: 12px 16px; margin-bottom: 8px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; display: flex; align-items: center; }
                            .task-num { font-weight: bold; margin-right: 16px; background: #e0e7ff; color: #4f46e5; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 14px; }
                          </style>
                        </head>
                        <body>
                          <div class="header">
                            <h2>Work Order Report</h2>
                            <div class="meta">
                              <div><strong>Work Order Code:</strong> ${selectedHistoryModal.work_order_code || 'N/A'}</div>
                              <div><strong>Machine:</strong> ${selectedHistoryModal.machine?.name_machine || 'N/A'}</div>
                              <div><strong>Date:</strong> ${selectedHistoryModal.event_start ? new Date(selectedHistoryModal.event_start).toLocaleString('id-ID') : 'N/A'}</div>
                              <div><strong>Technician:</strong> ${selectedHistoryModal.technician?.name || selectedHistoryModal.assigned_to || 'N/A'}</div>
                              <div><strong>Duration:</strong> ${(() => {
                                const dur = selectedHistoryModal.duration_seconds || (selectedHistoryModal.event_start && selectedHistoryModal.event_end ? Math.floor((new Date(selectedHistoryModal.event_end).getTime() - new Date(selectedHistoryModal.event_start).getTime()) / 1000) : 0);
                                return dur ? Math.floor(dur / 60) + 'm ' + (dur % 60) + 's' : '-';
                              })()}</div>
                            </div>
                          </div>
                          <h3>Actions Performed</h3>
                          <ul class="task-list">
                            ${selectedHistoryModal.task.map((t: any, i: number) => `
                              <li class="task-item">
                                <span class="task-num">${i + 1}</span>
                                <span>${typeof t === 'string' ? t : (t.description || '')}</span>
                              </li>
                            `).join('')}
                          </ul>
                        </body>
                      </html>
                    `;
                    const printWindow = window.open('', '', 'width=800,height=800');
                    if (printWindow) {
                      printWindow.document.write(printContent);
                      printWindow.document.close();
                      printWindow.focus();
                      setTimeout(() => printWindow.print(), 250);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  Print Tasks
                </button>
              </div>
              <div className="space-y-2">
                {selectedHistoryModal.task.map((t: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl group hover:bg-white hover:shadow-md transition-all">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[10px] border border-indigo-200">
                      {i + 1}
                    </div>
                    <span className="text-sm text-slate-800 font-medium">
                      {typeof t === 'string' ? t : t.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedHistoryModal?.action_taken && !selectedHistoryModal?.task && (
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