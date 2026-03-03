'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, LayoutGrid, List, Clock, User, AlertCircle, Filter } from 'lucide-react';
import WorkOrderForm from './work-order-form';
import WorkOrderDetail from './work-order-detail';
import WorkOrderKanban from './work-order-kanban';
import { WorkOrder, WorkOrderStatus } from '@/types';
import { supabase } from '@/lib/supabase/supabase';

export default function WorkOrderList() {
  const [showForm, setShowForm] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load work orders from API
  const loadWorkOrders = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    setIsRefreshing(true);

    try {
      const response = await fetch('/api/work-orders', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      const result = await response.json();

      if (result.success) {
        console.log('Work orders loaded:', result.data.length);
        setWorkOrders(result.data);
      }
    } catch (error) {
      console.error('Error loading work orders:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Update work order status
  const handleStatusChange = async (workOrderId: string, newStatus: WorkOrderStatus) => {
    try {
      const response = await fetch('/api/work-orders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: workOrderId,
          status: newStatus,
          userId: 'Current User',
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Reload all work orders to ensure consistency
        await loadWorkOrders(false);

        // Update selected work order if it's open
        if (selectedWorkOrder && selectedWorkOrder.id === workOrderId) {
          setSelectedWorkOrder(prev => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  useEffect(() => {
    loadWorkOrders();

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
          // Reload work orders when any change is detected
          loadWorkOrders(false);
        }
      )
      .subscribe();

    // Polling as backup (every 10 seconds)
    const pollInterval = setInterval(() => {
      loadWorkOrders(false);
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, []);

  const handleRefresh = () => {
    loadWorkOrders(false);
  };

  const filteredWorkOrders = workOrders.filter((wo) => {
    const matchesSearch =
      wo.work_order_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.machine_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || wo.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || wo.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
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
    switch (type) {
      case 'Preventive': return 'bg-green-100 text-green-700 border-green-300';
      case 'Corrective': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'Inspection': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading work orders...</p>
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
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-lg hover:bg-white/30 transition-all disabled:opacity-50 font-medium text-sm"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
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
                      <span className={`px-2 py-1 rounded-md text-xs font-bold border ${getTypeColor(wo.type)}`}>
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
                      <div className="flex items-center gap-1.5 text-xs text-gray-700">
                        <Clock size={12} className="text-gray-400" />
                        {new Date(wo.schedule_date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
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
            loadWorkOrders(false); // Reload after closing form
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
    </div>
  );
}