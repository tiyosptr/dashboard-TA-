'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, LayoutGrid, List, Clock, User, AlertCircle, Filter } from 'lucide-react';
import WorkOrderForm from './work-order-form';
import WorkOrderDetail from './work-order-detail';
import WorkOrderKanban from './work-order-kanban';
import WorkOrderCompleteForm from './work-order-complete-form';
import { WorkOrder, WorkOrderStatus } from '@/types';
import { supabase } from '@/lib/supabase/supabase';
import useSWR from 'swr';

function LiveWODuration({ startTime, status }: { startTime: string; status: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status !== 'On-Solving') return;
    const start = new Date(startTime).getTime();
    const update = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime, status]);

  if (status !== 'On-Solving') return null;

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-1 mt-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 animate-pulse w-fit">
      <Clock size={10} />
      {timeString}
    </div>
  );
}

function renderDuration(wo: any) {
  if (wo.status === 'On-Solving') {
    return <LiveWODuration startTime={wo.created_at || (wo as any).createdAt} status={wo.status} />;
  }
  if (wo.status === 'Completed') {
    // Prefer actual_duration (seconds) saved by backend — it uses machine_status_log.start_time
    // which reflects the real event start, not the WO generation time
    const actualDurSecs = wo.actual_duration ? Number(wo.actual_duration) : null;
    let secs: number | null = null;

    if (actualDurSecs !== null && actualDurSecs > 0) {
      secs = actualDurSecs;
    } else {
      // Fallback: compute from timestamps (less accurate for pre-generated WOs)
      const end = wo.completed_at ? new Date(wo.completed_at).getTime() : 0;
      const start = (wo.created_at || (wo as any).createdAt) ? new Date(wo.created_at || (wo as any).createdAt).getTime() : 0;
      if (start && end && end > start) {
        secs = Math.floor((end - start) / 1000);
      }
    }

    if (secs !== null && secs > 0) {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return <div className="mt-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200 w-fit">{m}m {s}s</div>;
    }
    return <div className="mt-1 text-xs text-gray-500">-</div>;
  }
  return <div className="mt-1 text-xs text-gray-500">-</div>;
}

interface WorkOrderListProps {
  defaultWoId?: string | null;
}

export default function WorkOrderList({ defaultWoId }: WorkOrderListProps = {}) {
  const [showForm, setShowForm] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [completingWo, setCompletingWo] = useState<WorkOrder | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  // ── SWR Data Fetching ──
  const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(res => res.json());
  
  const { data: woData, isLoading, isValidating, mutate } = useSWR('/api/work-orders', fetcher, {
    refreshInterval: 10000,
    keepPreviousData: true, // Prevent UI flashing during revalidation
  });

  const workOrders: WorkOrder[] = woData?.success ? woData.data : [];

  // Auto-open logic on load
  useEffect(() => {
    if (defaultWoId && !hasAutoOpened && workOrders.length > 0) {
      const woToOpen = workOrders.find((wo: WorkOrder) => wo.id === defaultWoId);
      if (woToOpen) {
        setSelectedWorkOrder(woToOpen);
        setHasAutoOpened(true);
      }
    }
  }, [defaultWoId, workOrders, hasAutoOpened]);

  // Update work order status
  const handleStatusChange = async (workOrderId: string, newStatus: WorkOrderStatus) => {
    // Intercept completion for two-step process
    if (newStatus === 'Completed') {
      const wo = workOrders.find(w => w.id === workOrderId);
      if (wo) {
        setCompletingWo(wo);
        return;
      }
    }
    
    await performStatusUpdate(workOrderId, newStatus);
  };

  const performStatusUpdate = async (workOrderId: string, newStatus: WorkOrderStatus, taskData?: any, nextMaintenanceDate?: string) => {
    try {
      const response = await fetch('/api/work-orders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: workOrderId,
          status: newStatus,
          task: taskData, // Using the new column
          next_maintenance: nextMaintenanceDate, // For machine update
          userId: 'Current User',
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Safe machine reactivation on completion
        if (newStatus === 'Completed') {
          const wo = result.data;
          const targetMachineId = wo?.machineId || wo?.machine_id;
          if (targetMachineId) {
            console.log('[WO List] Reactivating machine:', targetMachineId);
            fetch('/api/machines/status-change', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ machine_id: targetMachineId, new_status: 'active' })
            }).catch(err => console.error('[WO List] Failed to reactivate machine:', err));
          }
        }

        // Force SWR to mutate
        mutate();
        
        // Notify other components (Machine Management, Schedule Maintenance) to refresh
        window.dispatchEvent(new CustomEvent('machine-data-updated'));

        // Update selected work order if it's open
        if (selectedWorkOrder && selectedWorkOrder.id === workOrderId) {
          setSelectedWorkOrder(prev => prev ? { ...prev, status: newStatus, task: taskData } : null);
        }
        
        setCompletingWo(null);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleCompleteSubmit = async (tasks: any[], nextMaintenanceDate?: string) => {
    if (completingWo) {
      await performStatusUpdate(completingWo.id as string, 'Completed', tasks, nextMaintenanceDate);
    }
  };

  useEffect(() => {
    // Set up real-time subscription
    const channel = supabase
      .channel('work-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_order',
        },
        (payload) => {
          console.log('Work order change detected:', payload);
          // Trigger SWR mutation
          mutate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutate]);

  const handleRefresh = () => {
    mutate();
  };

  const handlePrintMachineHistory = async (wo: any) => {
    try {
      const machineId = wo.machine_id || wo.machineId;
      const res = await fetch(`/api/work-order-history?machineId=${machineId}`);
      const json = await res.json();
      if (!json.success) {
        alert('Failed to fetch machine history');
        return;
      }

      const historyData = json.data || [];
      
      const printContent = `
        <html>
          <head>
            <title>Machine History - ${wo.machine_name}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #333; }
              h2 { margin-bottom: 5px; color: #111; }
              .header { margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; font-size: 14px; }
              th { background: #f9fafb; font-weight: bold; }
              .type-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: capitalize; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>Machine Maintenance History</h2>
              <p><strong>Machine:</strong> ${wo.machine_name}</p>
              <p><strong>Generated on:</strong> ${new Date().toLocaleString('id-ID')}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event Type</th>
                  <th>Duration</th>
                  <th>Resolved By</th>
                  <th>Actions / Description</th>
                </tr>
              </thead>
              <tbody>
                ${historyData.length > 0 ? historyData.map((h: any) => `
                  <tr>
                    <td>${new Date(h.event_start).toLocaleString('id-ID')}</td>
                    <td><span class="type-badge">${h.event_type}</span></td>
                    <td>${(() => {
                      const dur = h.duration_seconds || (h.event_start && h.event_end ? Math.floor((new Date(h.event_end).getTime() - new Date(h.event_start).getTime()) / 1000) : 0);
                      return dur ? Math.floor(dur / 60) + 'm ' + (dur % 60) + 's' : '-';
                    })()}</td>
                    <td>${h.resolved_by || (h.technician?.name) || '-'}</td>
                    <td>
                      <div><strong>${h.description || '-'}</strong></div>
                      ${h.task && Array.isArray(h.task) ? `
                        <ul style="margin-top: 5px; padding-left: 15px;">
                          ${h.task.map((t: any) => `<li>${typeof t === 'string' ? t : t.description}</li>`).join('')}
                        </ul>
                      ` : ''}
                    </td>
                  </tr>
                `).join('') : '<tr><td colspan="5" style="text-align: center;">No history found</td></tr>'}
              </tbody>
            </table>
          </body>
        </html>
      `;
      const printWindow = window.open('', '', 'width=900,height=800');
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

  const filteredWorkOrders = workOrders.filter((wo) => {
    const matchesSearch =
      wo.work_order_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.machine_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || wo.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || wo.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  }).sort((a, b) => {
    const dateA = new Date(a.created_at || (a as any).createdAt).getTime() || 0;
    const dateB = new Date(b.created_at || (b as any).createdAt).getTime() || 0;
    return dateB - dateA;
  });

  const statusCounts = {
    all: workOrders.length,
    Pending: workOrders.filter(wo => wo.status === 'Pending').length,
    'On-Solving': workOrders.filter(wo => wo.status === 'On-Solving').length,
    'On-Hold': workOrders.filter(wo => wo.status === 'On-Hold').length,
    Completed: workOrders.filter(wo => wo.status === 'Completed').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'On-Solving':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Completed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'On-Hold':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-500 text-white';
      case 'High':
        return 'bg-orange-500 text-white';
      case 'Medium':
        return 'bg-yellow-500 text-white';
      case 'Low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getTypeColor = (type: string) => {
    const t = type?.toLowerCase();
    switch (t) {
      case 'maintenance':
      case 'preventive':
      case 'inspection':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'repair':
      case 'downtime':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'on hold':
      case 'on-hold':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  if (isLoading && workOrders.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] w-full bg-white rounded-3xl shadow-sm border border-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse">
              <List size={28} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-[3px] border-white animate-bounce" />
          </div>
          <p className="text-slate-500 font-bold tracking-wide">Menyiapkan Work Orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 rounded-xl p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Work Orders Management</h2>
            <p className="text-purple-100 text-sm">Track and manage all maintenance work orders</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={isValidating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-lg hover:bg-white/30 transition-all disabled:opacity-50 font-medium text-sm"
            >
              <RefreshCw size={14} className={isValidating ? 'animate-spin' : ''} />
              Refresh
            </button>

            <div className="flex bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-white text-purple-700 shadow-md' : 'text-white hover:bg-white/20'
                  }`}
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${viewMode === 'kanban' ? 'bg-white text-purple-700 shadow-md' : 'text-white hover:bg-white/20'
                  }`}
              >
                <LayoutGrid size={14} />
              </button>
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-purple-700 rounded-lg hover:bg-purple-50 transition-all font-bold shadow-md text-sm"
            >
              <Plus size={16} />
              New Work Order
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', count: statusCounts.all, color: 'from-gray-500 to-gray-600', icon: Filter },
          { label: 'Pending', count: statusCounts.Pending, color: 'from-gray-600 to-gray-700', icon: Clock },
          { label: 'On-Solving', count: statusCounts['On-Solving'], color: 'from-blue-500 to-blue-600', icon: User },
          { label: 'On-Hold', count: statusCounts['On-Hold'], color: 'from-yellow-500 to-yellow-600', icon: AlertCircle },
          { label: 'Completed', count: statusCounts.Completed, color: 'from-green-500 to-green-600', icon: Clock },
        ].map((stat) => (
          <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-lg p-3 shadow-md hover:shadow-lg transition-all cursor-pointer group`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-white/80">{stat.label}</span>
              <stat.icon className="text-white/60 group-hover:scale-110 transition-transform" size={16} />
            </div>
            <p className="text-2xl font-black text-white">{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-3 border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by WO code, machine, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium cursor-pointer transition-all"
          >
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="On-Solving">On Solving</option>
            <option value="On-Hold">On Hold</option>
            <option value="Completed">Completed</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium cursor-pointer transition-all"
          >
            <option value="all">All Priority</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Work Order
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Machine
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Scheduled
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredWorkOrders.map((wo) => (
                  <tr
                    key={String(wo.id)}
                    className="hover:bg-purple-50 cursor-pointer transition-all group"
                    onClick={() => setSelectedWorkOrder(wo)}
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-purple-700 group-hover:text-purple-900 text-sm">{wo.work_order_code}</div>
                      <div className="text-xs text-gray-600 line-clamp-1">
                        {wo.description}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-gray-900 text-sm">{wo.machine_name}</div>
                      <div className="text-xs text-gray-500">{wo.location || 'N/A'}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold border capitalize ${getTypeColor(wo.type)}`}>
                        {wo.type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold shadow-sm ${getPriorityColor(wo.priority)}`}>
                        {wo.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        value={wo.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStatusChange(wo.id as string, e.target.value as WorkOrderStatus);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={`px-2 py-1 rounded-md text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 border ${getStatusColor(wo.status)}`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="On-Solving">On Solving</option>
                        <option value="On-Hold">On Hold</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                          {wo.assigned_to?.charAt(0) || 'U'}
                        </div>
                        <span className="text-xs font-medium text-gray-700">{wo.assigned_to}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs text-gray-700">
                          <Clock size={12} className="text-gray-400" />
                          {new Date(wo.schedule_date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        {renderDuration(wo)}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintMachineHistory(wo);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold border border-indigo-200 transition-all ml-auto"
                        title="Print Machine History"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Print History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredWorkOrders.length === 0 && (
            <div className="text-center py-16 bg-gray-50">
              <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-500 text-lg font-medium">No work orders found</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      ) : (
        <WorkOrderKanban
          workOrders={filteredWorkOrders}
          onSelectWorkOrder={setSelectedWorkOrder}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Modals */}
      {showForm && (
        <WorkOrderForm
          onClose={() => {
            setShowForm(false);
            mutate(); // Reload after closing form
          }}
        />
      )}
      {selectedWorkOrder && (
        <WorkOrderDetail
          workOrder={selectedWorkOrder}
          onClose={() => setSelectedWorkOrder(null)}
          onStatusChange={handleStatusChange}
        />
      )}
      {completingWo && (
        <WorkOrderCompleteForm
          workOrder={completingWo}
          onClose={() => setCompletingWo(null)}
          onSuccess={handleCompleteSubmit}
        />
      )}
    </div>
  );
}