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
import { toast } from 'react-hot-toast';

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
          toast.success('Work order completed! Data successfully saved.', { duration: 4000 });
        } else {
          toast.success(`Status successfully changed to ${newStatus}`);
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
      } else {
        toast.error(result.error || 'Failed to update work order');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('An error occurred. Please try again.');
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
      
      // Helper function to render JSONB data as HTML with better formatting
      const renderJsonData = (data: any): string => {
        if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
          return '';
        }
        
        let parsedData = data;
        if (typeof data === 'string') {
          try {
            parsedData = JSON.parse(data);
          } catch (e) {
            parsedData = data;
          }
        }

        // Filter out IDs
        const filterIds = (obj: any): any => {
          if (typeof obj !== 'object' || obj === null) return obj;
          if (Array.isArray(obj)) return obj.map(item => filterIds(item));
          
          const filtered: any = {};
          for (const [key, value] of Object.entries(obj)) {
            if (key.toLowerCase().includes('_id') || key.toLowerCase() === 'id') continue;
            filtered[key] = typeof value === 'object' ? filterIds(value) : value;
          }
          return filtered;
        };

        const cleanData = filterIds(parsedData);

        // Format label
        const formatLabel = (key: string): string => {
          return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        };

        // Format value
        const formatValue = (value: any): string => {
          if (value === null || value === undefined) return '-';
          if (typeof value === 'boolean') return value ? 'Yes' : 'No';
          if (typeof value === 'number') return value.toLocaleString('id-ID');
          if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/) && !isNaN(Date.parse(value))) {
            return new Date(value).toLocaleString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
          }
          return String(value);
        };

        // Render section
        const renderSection = (sectionKey: string, sectionData: any): string => {
          if (typeof sectionData !== 'object' || sectionData === null) {
            return `
              <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #f9fafb; border-radius: 6px; margin-bottom: 6px;">
                <span style="font-weight: 600; color: #374151; font-size: 13px;">${formatLabel(sectionKey)}</span>
                <span style="font-weight: 500; color: #111827; font-size: 13px;">${formatValue(sectionData)}</span>
              </div>
            `;
          }

          const sectionColor = 
            sectionKey.toLowerCase().includes('runtime') ? '#3b82f6' :
            sectionKey.toLowerCase().includes('maintenance') ? '#f97316' :
            sectionKey.toLowerCase().includes('performance') ? '#10b981' :
            sectionKey.toLowerCase().includes('event') ? '#8b5cf6' :
            '#6b7280';

          let content = `
            <div style="border: 2px solid ${sectionColor}20; border-radius: 12px; overflow: hidden; margin-bottom: 16px; background: white;">
              <div style="background: linear-gradient(to right, ${sectionColor}15, ${sectionColor}05); padding: 12px 16px; border-bottom: 1px solid ${sectionColor}30;">
                <span style="font-weight: bold; color: ${sectionColor}; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${formatLabel(sectionKey)}
                </span>
              </div>
              <div style="padding: 16px;">
          `;

          for (const [key, value] of Object.entries(sectionData)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              // Nested object
              content += `
                <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 12px;">
                  <div style="background: #f9fafb; padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-weight: 600; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${formatLabel(key)}
                    </span>
                  </div>
                  <div style="padding: 12px;">
              `;
              
              for (const [nestedKey, nestedValue] of Object.entries(value)) {
                const valueColor = 
                  typeof nestedValue === 'number' ? '#2563eb' :
                  typeof nestedValue === 'boolean' ? (nestedValue ? '#059669' : '#dc2626') :
                  '#111827';
                
                content += `
                  <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3f4f6;">
                    <span style="color: #6b7280; font-size: 12px;">${formatLabel(nestedKey)}</span>
                    <span style="color: ${valueColor}; font-weight: 600; font-size: 12px;">${formatValue(nestedValue)}</span>
                  </div>
                `;
              }
              
              content += `
                  </div>
                </div>
              `;
            } else {
              // Simple key-value
              const valueColor = 
                typeof value === 'number' ? '#2563eb' :
                typeof value === 'boolean' ? (value ? '#059669' : '#dc2626') :
                '#111827';
              
              content += `
                <div style="display: flex; justify-content: space-between; padding: 10px 12px; background: #f9fafb; border-radius: 6px; margin-bottom: 6px;">
                  <span style="color: #6b7280; font-size: 13px;">${formatLabel(key)}</span>
                  <span style="color: ${valueColor}; font-weight: 600; font-size: 13px;">${formatValue(value)}</span>
                </div>
              `;
            }
          }

          content += `
              </div>
            </div>
          `;

          return content;
        };

        if (typeof cleanData === 'object' && !Array.isArray(cleanData)) {
          let html = `
            <div style="margin-top: 20px; padding: 20px; background: linear-gradient(to bottom, #f0f9ff, #ffffff); border: 2px solid #3b82f6; border-radius: 16px;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-size: 20px;">📊</span>
                </div>
                <div>
                  <h3 style="margin: 0; color: #1e40af; font-size: 16px; font-weight: bold;">Machine Metrics at Downtime</h3>
                  <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">Captured performance data</p>
                </div>
              </div>
          `;

          for (const [key, value] of Object.entries(cleanData)) {
            html += renderSection(key, value);
          }

          html += `</div>`;
          return html;
        }
        
        return '';
      };
      
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
                      ${renderJsonData(h.data)}
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
          <p className="text-slate-500 font-bold tracking-wide">Preparing Work Orders...</p>
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
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <Search size={16} className="text-indigo-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Work Orders List</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {filteredWorkOrders.length} of {statusCounts.all} work orders displayed
            </p>
          </div>
        </div>

        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200/60 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all min-w-[250px]">
            <Search size={14} className="text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by WO code, machine, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent text-sm font-semibold text-slate-700 placeholder:text-slate-400 outline-none"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto min-w-[160px] px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none text-slate-700 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%221.7%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_12px_center] bg-no-repeat pr-10 hover:border-indigo-300 transition-all cursor-pointer"
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
            className="w-full sm:w-auto min-w-[160px] px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none text-slate-700 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%221.7%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_12px_center] bg-no-repeat pr-10 hover:border-indigo-300 transition-all cursor-pointer"
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