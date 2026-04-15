//app/management-system/components/work-orders/work-order-kanban.tsx
'use client';

import { Clock, User, GripVertical, CheckCircle2, Circle } from 'lucide-react';
import { WorkOrder, WorkOrderStatus } from '@/types';
import { useState } from 'react';

interface WorkOrderKanbanProps {
  workOrders: WorkOrder[];
  onSelectWorkOrder: (wo: WorkOrder) => void;
  onStatusChange: (workOrderId: string, newStatus: WorkOrderStatus) => void;
}

export default function WorkOrderKanban({
  workOrders,
  onSelectWorkOrder,
  onStatusChange
}: WorkOrderKanbanProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const columns = [
    {
      id: 'Pending' as WorkOrderStatus,
      title: 'Pending',
      gradient: 'from-gray-500 to-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-300'
    },
    {
      id: 'On-Solving' as WorkOrderStatus,
      title: 'On Solving',
      gradient: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300'
    },
    {
      id: 'On-Hold' as WorkOrderStatus,
      title: 'On Hold',
      gradient: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-300'
    },
    {
      id: 'Completed' as WorkOrderStatus,
      title: 'Completed',
      gradient: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300'
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'border-l-4 border-red-500 bg-red-50';
      case 'High': return 'border-l-4 border-orange-500 bg-orange-50';
      case 'Medium': return 'border-l-4 border-yellow-500 bg-yellow-50';
      case 'Low': return 'border-l-4 border-green-500 bg-green-50';
      default: return 'border-l-4 border-gray-500 bg-gray-50';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500 text-white';
      case 'High': return 'bg-orange-500 text-white';
      case 'Medium': return 'bg-yellow-500 text-white';
      case 'Low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {columns.map((column) => {
        const columnWorkOrders = workOrders.filter(wo => wo.status === column.id);
        const isDragOver = dragOverColumn === column.id;

        return (
          <div key={column.id} className="flex flex-col h-full">
            {/* Column Header */}
            <div className={`bg-gradient-to-r ${column.gradient} rounded-t-2xl p-5 border-2 ${column.borderColor} shadow-lg`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-lg">{column.title}</h3>
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <span className="text-white font-bold text-sm">{columnWorkOrders.length}</span>
                </div>
              </div>
            </div>

            {/* Column Content */}
            <div
              className={`flex-1 ${column.bgColor} rounded-b-2xl p-4 border-l-2 border-r-2 border-b-2 ${column.borderColor} space-y-3 min-h-[600px] transition-all ${isDragOver ? 'ring-4 ring-purple-400 ring-opacity-50 scale-[1.02]' : ''
                }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColumn(column.id);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragOverColumn(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverColumn(null);

                const workOrderId = e.dataTransfer.getData('text/plain');
                if (workOrderId) {
                  const workOrder = workOrders.find(wo => wo.id?.toString() === workOrderId);
                  if (workOrder && workOrder.status !== column.id) {
                    onStatusChange(workOrderId, column.id);
                  }
                }
                setDraggedId(null);
              }}
            >
              {columnWorkOrders.map((wo) => (
                <div
                  key={String(wo.id)}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', wo.id?.toString() || '');
                    setDraggedId(wo.id?.toString() || null);
                  }}
                  onDragEnd={() => {
                    setDraggedId(null);
                    setDragOverColumn(null);
                  }}
                  onClick={() => onSelectWorkOrder(wo)}
                  className={`bg-white rounded-xl p-4 shadow-md hover:shadow-xl transition-all cursor-pointer ${getPriorityColor(wo.priority)} ${draggedId === wo.id?.toString() ? 'opacity-50 scale-95 rotate-2' : 'hover:-translate-y-1'
                    }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                        <GripVertical size={18} />
                      </div>
                      <div className="font-bold text-gray-900 text-sm">{wo.work_order_code}</div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-md ${getPriorityBadge(wo.priority)}`}>
                      {wo.priority}
                    </span>
                  </div>

                  {/* Type Badge */}
                  <div className="mb-3">
                    <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold border-2 capitalize ${getTypeColor(wo.type)}`}>
                      {wo.type}
                    </span>
                  </div>

                  {/* Machine Info */}
                  <div className="mb-3">
                    <h4 className="font-bold text-gray-900 mb-1">{wo.machine_name}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2">{wo.description}</p>
                  </div>

                  {/* Assigned & Schedule */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                        {wo.assigned_to?.charAt(0) || 'U'}
                      </div>
                      <span className="text-xs text-gray-700 font-medium">{wo.assigned_to}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Clock size={14} className="text-gray-400" />
                      <span>{new Date(wo.schedule_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>

                  {/* Task Progress */}
                  {wo.tasks && wo.tasks.length > 0 && (
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-600">Tasks Progress</span>
                        <span className="text-xs font-bold text-purple-600">
                          {wo.tasks.filter((t: any) => t.completed).length}/{wo.tasks.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${(wo.tasks.filter((t: any) => t.completed).length / wo.tasks.length) * 100}%`
                            }}
                          ></div>
                        </div>
                        {wo.tasks.filter((t: any) => t.completed).length === wo.tasks.length ? (
                          <CheckCircle2 size={16} className="text-green-500" />
                        ) : (
                          <Circle size={16} className="text-gray-300" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Empty State */}
              {columnWorkOrders.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-3">
                    <Circle size={32} />
                  </div>
                  <p className="text-sm font-medium">No work orders</p>
                  <p className="text-xs mt-1">Drag items here</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}