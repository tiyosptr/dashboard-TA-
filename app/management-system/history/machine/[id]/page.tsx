'use client';

import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { 
  ArrowLeft, Settings, Clock, Calendar, 
  AlertTriangle, CheckCircle, Info, Filter 
} from 'lucide-react';
import { useState } from 'react';

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
