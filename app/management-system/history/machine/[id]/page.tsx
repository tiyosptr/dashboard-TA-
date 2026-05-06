'use client';

import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { 
  ArrowLeft, Settings, Clock, Calendar, 
  AlertTriangle, CheckCircle, Info, Filter, Printer 
} from 'lucide-react';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

function formatDuration(seconds: number | string | null | undefined) {
  const s = seconds == null ? 0 : Number(seconds);
  if (!s || s <= 0) return '0m 0s';
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export default function MachineHistoryDetail() {
  const params = useParams();
  const router = useRouter();
  const machineId = params.id;
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: response, isLoading } = useSWR(
    `/api/machines/history/status-logs?machineId=${machineId}`, 
    fetcher
  );

  const logs = response?.success ? response.data : [];
  const machineInfo = logs.length > 0 ? logs[0].machine : null;
  const lineInfo = logs.length > 0 ? { name: logs[0].line_name, process: logs[0].process_name } : null;

  const filteredLogs = logs.filter((log: any) => 
    filterStatus === 'all' || log.status?.toLowerCase() === filterStatus.toLowerCase()
  );

  const handlePrintHistory = () => {
    try {
      const printContent = `
        <html>
          <head>
            <title>Machine Maintenance History - ${machineInfo?.name_machine || 'Machine'}</title>
            <style>
              @page { margin: 20mm; }
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                padding: 0;
                margin: 0;
                color: #000;
                background: white;
                font-size: 11pt;
              }
              .header {
                margin-bottom: 30px;
              }
              h1 { 
                font-size: 24pt;
                font-weight: 700;
                margin: 0 0 20px 0;
                color: #000;
              }
              .meta-row {
                display: flex;
                gap: 10px;
                margin-bottom: 8px;
                font-size: 10pt;
              }
              .meta-label {
                font-weight: 700;
                min-width: 120px;
                color: #000;
              }
              .meta-value {
                color: #000;
              }
              .divider {
                border-bottom: 2px solid #000;
                margin: 20px 0;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 10px;
                font-size: 9pt;
              }
              thead { 
                background: #f5f5f5;
                border-top: 2px solid #000;
                border-bottom: 2px solid #000;
              }
              th { 
                padding: 10px 8px;
                text-align: left; 
                font-weight: 700;
                font-size: 9pt;
                color: #000;
              }
              td { 
                padding: 12px 8px;
                border-bottom: 1px solid #e0e0e0;
                vertical-align: top;
              }
              .status-badge { 
                display: inline-block; 
                padding: 3px 10px;
                border-radius: 4px;
                font-size: 8pt;
                font-weight: 700;
                text-transform: uppercase;
              }
              .status-active { 
                background: #e8f5e9;
                color: #2e7d32;
              }
              .status-maintenance { 
                background: #e3f2fd;
                color: #1565c0;
              }
              .status-downtime { 
                background: #ffebee;
                color: #c62828;
              }
              .status-hold { 
                background: #fff3e0;
                color: #e65100;
              }
              .status-inactive { 
                background: #f5f5f5;
                color: #616161;
              }
              .metrics-box {
                border: 2px solid #2196f3;
                border-radius: 8px;
                padding: 15px;
                margin-top: 10px;
                background: #f8f9fa;
              }
              .metrics-header {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 700;
                font-size: 11pt;
                color: #2196f3;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid #2196f3;
              }
              .metrics-icon {
                width: 20px;
                height: 20px;
                background: #2196f3;
                border-radius: 3px;
                display: inline-block;
              }
              .metrics-subtitle {
                font-size: 8pt;
                color: #666;
                margin-bottom: 10px;
              }
              .metrics-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                margin-bottom: 15px;
              }
              .metrics-item {
                display: flex;
                justify-content: space-between;
                font-size: 9pt;
              }
              .metrics-label {
                color: #666;
              }
              .metrics-value {
                font-weight: 700;
                color: #000;
              }
              .metrics-section {
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid #ddd;
              }
              .metrics-section-title {
                font-weight: 700;
                font-size: 9pt;
                color: #ff9800;
                text-transform: uppercase;
                margin-bottom: 10px;
              }
              .metrics-section-title.performance {
                color: #4caf50;
              }
              .metrics-section-title.current {
                color: #9c27b0;
              }
              .metrics-section-title.runtime {
                color: #2196f3;
              }
              .task-list {
                list-style: none;
                padding: 0;
                margin: 5px 0 0 0;
              }
              .task-item {
                padding: 3px 0;
                font-size: 8pt;
                color: #000;
                display: flex;
                align-items: flex-start;
                gap: 6px;
              }
              .task-bullet {
                margin-top: 2px;
              }
              @media print {
                body { padding: 0; }
                tr { page-break-inside: avoid; }
                .metrics-box { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Machine Maintenance History</h1>
              <div class="meta-row">
                <span class="meta-label">Machine:</span>
                <span class="meta-value">${machineInfo?.name_machine || '-'}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Generated on:</span>
                <span class="meta-value">${new Date().toLocaleString('id-ID', { 
                  day: 'numeric', 
                  month: 'numeric', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}</span>
              </div>
            </div>

            <div class="divider"></div>

            <table>
              <thead>
                <tr>
                  <th style="width: 15%;">Date</th>
                  <th style="width: 12%;">Event Type</th>
                  <th style="width: 10%;">Duration</th>
                  <th style="width: 15%;">Resolved By</th>
                  <th style="width: 48%;">Actions / Description</th>
                </tr>
              </thead>
              <tbody>
                ${filteredLogs.length > 0 ? filteredLogs.map((log: any) => {
                  const statusClass = 
                    log.status?.toLowerCase() === 'active' || log.status?.toLowerCase() === 'running' ? 'status-active' :
                    log.status?.toLowerCase() === 'maintenance' ? 'status-maintenance' :
                    log.status?.toLowerCase() === 'downtime' ? 'status-downtime' :
                    log.status?.toLowerCase() === 'on hold' ? 'status-hold' :
                    'status-inactive';
                  
                  // Get work order history data if available
                  const hasMetrics = log.data && typeof log.data === 'object' && Object.keys(log.data).length > 0;
                  
                  return `
                    <tr>
                      <td>
                        ${new Date(log.start_time).toLocaleString('id-ID', { 
                          day: 'numeric', 
                          month: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td>
                        <span class="status-badge ${statusClass}">${log.status || '-'}</span>
                      </td>
                      <td>
                        ${formatDuration(log.duration_seconds)}
                      </td>
                      <td>
                        ${log.resolved_by || log.technician?.name || '-'}
                      </td>
                      <td>
                        <div>
                          <strong>${log.description || (log.tasks && log.tasks.length > 0 ? '' : '-')}</strong>
                        </div>
                        ${log.tasks && Array.isArray(log.tasks) && log.tasks.length > 0 ? `
                          <ul class="task-list">
                            ${log.tasks.map((task: any) => `
                              <li class="task-item">
                                <span class="task-bullet">•</span>
                                <span>${typeof task === 'string' ? task : task.description}</span>
                              </li>
                            `).join('')}
                          </ul>
                        ` : ''}
                        
                        ${hasMetrics ? `
                          <div class="metrics-box">
                            <div class="metrics-header">
                              <span class="metrics-icon"></span>
                              <span>Machine Metrics at Downtime</span>
                            </div>
                            <div class="metrics-subtitle">Captured performance data</div>
                            
                            <div class="metrics-grid">
                              <div class="metrics-item">
                                <span class="metrics-label">Line Name</span>
                                <span class="metrics-value">${log.data.line_name || '-'}</span>
                              </div>
                              <div class="metrics-item">
                                <span class="metrics-label">Captured At</span>
                                <span class="metrics-value">${log.data.captured_at ? new Date(log.data.captured_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                              </div>
                            </div>

                            ${log.data.maintenance ? `
                              <div class="metrics-section">
                                <div class="metrics-section-title">MAINTENANCE</div>
                                <div class="metrics-grid">
                                  <div class="metrics-item">
                                    <span class="metrics-label">Last Maintenance</span>
                                    <span class="metrics-value">${log.data.maintenance.last_maintenance ? new Date(log.data.maintenance.last_maintenance).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
                                  </div>
                                  <div class="metrics-item">
                                    <span class="metrics-label">Next Maintenance</span>
                                    <span class="metrics-value">${log.data.maintenance.next_maintenance ? new Date(log.data.maintenance.next_maintenance).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
                                  </div>
                                </div>
                              </div>
                            ` : ''}

                            ${log.data.performance ? `
                              <div class="metrics-section">
                                <div class="metrics-section-title performance">PERFORMANCE</div>
                                <div class="metrics-grid">
                                  ${log.data.performance.quality ? `
                                    <div class="metrics-item">
                                      <span class="metrics-label">Quality</span>
                                      <span class="metrics-value">${log.data.performance.quality.quality_rate_pct || 0}%</span>
                                    </div>
                                  ` : '<div class="metrics-item"><span class="metrics-label">Quality</span><span class="metrics-value">-</span></div>'}
                                  ${log.data.performance.cycle_time ? `
                                    <div class="metrics-item">
                                      <span class="metrics-label">Cycle Time</span>
                                      <span class="metrics-value">${log.data.performance.cycle_time.value_seconds || 0}s</span>
                                    </div>
                                  ` : '<div class="metrics-item"><span class="metrics-label">Cycle Time</span><span class="metrics-value">-</span></div>'}
                                  ${log.data.performance.throughput ? `
                                    <div class="metrics-item">
                                      <span class="metrics-label">Throughput</span>
                                      <span class="metrics-value">${log.data.performance.throughput.value || 0}</span>
                                    </div>
                                  ` : '<div class="metrics-item"><span class="metrics-label">Throughput</span><span class="metrics-value">-</span></div>'}
                                </div>
                              </div>
                            ` : ''}

                            ${log.data.current_event ? `
                              <div class="metrics-section">
                                <div class="metrics-section-title current">CURRENT EVENT</div>
                                <div class="metrics-grid">
                                  <div class="metrics-item">
                                    <span class="metrics-label">Status</span>
                                    <span class="metrics-value">${log.data.current_event.status || '-'}</span>
                                  </div>
                                  <div class="metrics-item">
                                    <span class="metrics-label">Start Time</span>
                                    <span class="metrics-value">${log.data.current_event.start_time ? new Date(log.data.current_event.start_time).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                  </div>
                                  <div class="metrics-item">
                                    <span class="metrics-label">Duration Seconds</span>
                                    <span class="metrics-value">${log.data.current_event.duration_seconds || 0}</span>
                                  </div>
                                </div>
                              </div>
                            ` : ''}

                            ${log.data.runtime_stats ? `
                              <div class="metrics-section">
                                <div class="metrics-section-title runtime">RUNTIME STATS</div>
                                <div class="metrics-grid">
                                  <div class="metrics-item">
                                    <span class="metrics-label">Downtime Count</span>
                                    <span class="metrics-value">${log.data.runtime_stats.downtime_count || 0}</span>
                                  </div>
                                  <div class="metrics-item">
                                    <span class="metrics-label">Maintenance Count</span>
                                    <span class="metrics-value">${log.data.runtime_stats.maintenance_count || 0}</span>
                                  </div>
                                  <div class="metrics-item">
                                    <span class="metrics-label">Total Running Hours</span>
                                    <span class="metrics-value">${log.data.runtime_stats.total_running_hours || 0}h</span>
                                  </div>
                                  <div class="metrics-item">
                                    <span class="metrics-label">Total Downtime Hours</span>
                                    <span class="metrics-value">${log.data.runtime_stats.total_downtime_hours || 0}h</span>
                                  </div>
                                </div>
                              </div>
                            ` : ''}

                            <div class="metrics-grid" style="margin-top: 15px;">
                              <div class="metrics-item">
                                <span class="metrics-label">Machine Name</span>
                                <span class="metrics-value">${log.data.machine_name || machineInfo?.name_machine || '-'}</span>
                              </div>
                              <div class="metrics-item">
                                <span class="metrics-label">Process Name</span>
                                <span class="metrics-value">${log.data.process_name || lineInfo?.process || '-'}</span>
                              </div>
                            </div>

                            <div class="metrics-item" style="margin-top: 10px;">
                              <span class="metrics-label">Machine Status</span>
                              <span class="metrics-value">${log.data.machine_status || log.status || '-'}</span>
                            </div>
                          </div>
                        ` : ''}
                      </td>
                    </tr>
                  `;
                }).join('') : '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #999;">No records found</td></tr>'}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const printWindow = window.open('', '', 'width=1000,height=800');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 250);
      }
    } catch (err) {
      console.error('Print history error:', err);
      alert('Error printing history');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'active': case 'running': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'maintenance': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'downtime': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'on hold': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'inactive': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Back Navigation */}
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-black text-xs uppercase tracking-widest group"
        >
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-200 group-hover:border-indigo-200 shadow-sm">
            <ArrowLeft size={16} />
          </div>
          Back to History
        </button>

        {/* Machine Header Card */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full -mr-32 -mt-32 blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-100">
                <Settings size={40} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                  {machineInfo?.name_machine || 'Loading...'}
                </h1>
                <div className="flex flex-wrap gap-3 mt-2">
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest border border-slate-200">
                    Line: {lineInfo?.name || '-'}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                    Process: {lineInfo?.process || '-'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handlePrintHistory}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-100 hover:shadow-xl hover:shadow-indigo-200 active:scale-95"
              >
                <Printer size={18} />
                Print History
              </button>
              
              <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Records</p>
                <p className="text-xl font-black text-slate-900">{logs.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-500 mr-2 uppercase tracking-tight">Filter Status:</span>
            <div className="flex gap-1.5">
              {['all', 'active', 'maintenance', 'downtime', 'on hold'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                    filterStatus === s 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' 
                      : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Timestamp</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tasks Performed</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Time Interval</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-8 py-6"><div className="h-4 bg-slate-50 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-30">
                        <Info size={48} className="text-slate-400" />
                        <p className="font-black text-slate-900 uppercase tracking-widest text-sm">No record entries found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-white transition-colors">
                            <Calendar size={14} className="text-slate-400" />
                          </div>
                          <span className="text-xs font-bold text-slate-900">
                            {new Date(log.start_time).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${getTypeColor(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        {log.tasks && Array.isArray(log.tasks) && log.tasks.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {log.tasks.map((task: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 group/task">
                                <CheckCircle size={12} className={(typeof task === 'object' && task.is_completed) ? "text-emerald-500" : "text-slate-300"} />
                                <span className={`text-[10px] font-medium ${(typeof task === 'object' && task.is_completed) ? "text-slate-600" : "text-slate-500"}`}>
                                  {typeof task === 'string' ? task : task.description}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic">No tasks recorded</span>
                        )}
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap">
                        <div className="flex flex-col gap-1 text-[10px] font-bold text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            {new Date(log.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                            {log.end_time ? new Date(log.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap text-right">
                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 shadow-sm shadow-indigo-50/50">
                          {formatDuration(log.duration_seconds)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
