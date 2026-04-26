'use client';

import { X, User, Clock, MapPin, CheckCircle, Circle, MessageSquare, Package, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { WorkOrder, WorkOrderStatus } from '@/types';
import { useState, useEffect } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface WorkOrderDetailProps {
  workOrder: WorkOrder;
  onClose: () => void;
  onStatusChange: (workOrderId: string, newStatus: WorkOrderStatus) => void;
}

export default function WorkOrderDetail({ workOrder, onClose, onStatusChange }: WorkOrderDetailProps) {
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'tasks' | 'notes'>('details');
  const [elapsedDuration, setElapsedDuration] = useState<number>(0);

  const { data: historyResponse } = useSWR(
    workOrder.machine_id ? `/api/work-order-history?machineId=${workOrder.machine_id}` : null,
    fetcher
  );
  const machineHistory = historyResponse?.success 
    ? historyResponse.data.filter((h: any) => h.id !== workOrder.id) // Filter out current WO if it exists in history
    : [];

  useEffect(() => {
    let interval: any;
    if (workOrder.status === 'On-Solving') {
      // Use created_at or createdAt as the start time, otherwise fallback to now
      const createdStr = (workOrder as any).created_at || (workOrder as any).createdAt;
      const createdTime = createdStr ? new Date(createdStr).getTime() : Date.now();
      
      const updateElapsed = () => {
        const diff = Math.floor((Date.now() - createdTime) / 1000);
        setElapsedDuration(diff > 0 ? diff : 0);
      };
      
      updateElapsed();
      interval = setInterval(updateElapsed, 1000);
    }
    return () => clearInterval(interval);
  }, [workOrder]);

  const formatLiveDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      console.log('Adding note:', newNote);
      setNewNote('');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-gray-100 text-gray-700 border border-gray-300';
      case 'On-Solving': return 'bg-blue-100 text-blue-700 border border-blue-300';
      case 'Completed': return 'bg-green-100 text-green-700 border border-green-300';
      case 'On-Hold': return 'bg-yellow-100 text-yellow-700 border border-yellow-300';
      default: return 'bg-gray-100 text-gray-700 border border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500 text-white';
      case 'High': return 'bg-orange-500 text-white';
      case 'Medium': return 'bg-yellow-500 text-white';
      case 'Low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const completedTasks = workOrder.tasks?.filter(t => t.completed).length || 0;
  const totalTasks = workOrder.tasks?.length || 0;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const getHistoryTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'maintenance': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'downtime': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'on hold': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'repair': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col relative animate-fade-in-up">
        {/* Header Banner - Sleek Dark Gradient */}
        <div className="h-40 bg-gradient-to-r from-blue-700 via-indigo-800 to-purple-900 rounded-t-2xl flex flex-col justify-between p-6 pb-4 relative overflow-hidden">
          {/* Background Decorative Rings */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full border-[16px] border-white/5 opacity-50"></div>
          <div className="absolute bottom-0 right-20 -mb-10 w-32 h-32 rounded-full border-[8px] border-white/10 opacity-50"></div>

          <div className="flex justify-between items-start relative z-10">
            <div className="flex flex-col gap-1">
              <h2 className="text-3xl font-extrabold text-white flex items-center gap-3">
                {String(workOrder.id)}
              </h2>
              <p className="text-indigo-100 font-medium opacity-90 flex items-center gap-1.5">
                <MapPin size={16} />
                {workOrder.machine_name} <span className="opacity-60">•</span> {workOrder.location}
              </p>
            </div>
            
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm backdrop-blur-md border border-white/20 text-white ${getPriorityColor(workOrder.priority).replace('text-white', '')}`}>
              {workOrder.priority} Priority
            </span>

            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={workOrder.status}
                onChange={(e) => onStatusChange(workOrder.id as string, e.target.value as WorkOrderStatus)}
                className={`appearance-none pr-8 pl-4 py-1.5 rounded-full text-xs font-bold shadow-sm backdrop-blur-md cursor-pointer outline-none focus:ring-2 focus:ring-white border border-white/20 text-white ${getStatusColor(workOrder.status).replace('text-', '')}`}
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                <option value="Pending" className="text-gray-900 bg-white">Pending</option>
                <option value="On-Solving" className="text-gray-900 bg-white">On Solving</option>
                <option value="On-Hold" className="text-gray-900 bg-white">On Hold</option>
                <option value="Completed" className="text-gray-900 bg-white">Completed</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white/80">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-white px-6 shadow-sm sticky top-0 z-10">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-4 font-semibold text-sm transition-all relative ${activeTab === 'details'
                ? 'text-indigo-600'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
          >
            Details
            {activeTab === 'details' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></div>}
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-6 py-4 font-semibold text-sm transition-all relative ${activeTab === 'tasks'
                ? 'text-indigo-600'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
          >
            Tasks
            {activeTab === 'tasks' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></div>}
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-6 py-4 font-semibold text-sm transition-all relative ${activeTab === 'notes'
                ? 'text-indigo-600'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
          >
            Notes ({workOrder.notes?.length || 0})
            {activeTab === 'notes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></div>}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                <p className="text-gray-900 bg-gray-50 p-4 rounded-lg">{workOrder.description}</p>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <User size={22} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Assigned To</p>
                      <p className="font-bold text-gray-900 text-base">{workOrder.assigned_to}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                      <Clock size={22} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Scheduled</p>
                      <p className="font-bold text-gray-900 text-sm">
                        {new Date(workOrder.schedule_date).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                      <MapPin size={22} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Location</p>
                      <p className="font-bold text-gray-900 text-sm">{workOrder.location}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <AlertCircle size={22} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Type</p>
                      <p className="font-bold text-gray-900 capitalize text-sm">{workOrder.type}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                      <Clock size={22} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Estimated Duration</p>
                      <p className="font-bold text-gray-900 text-sm">{workOrder.estimated_duration}</p>
                    </div>
                  </div>

                  {workOrder.status === 'On-Solving' ? (
                    <div className="flex items-start gap-4 p-4 rounded-xl border border-blue-200 bg-blue-50 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-blue-100 rounded-full blur-2xl opacity-60 animate-pulse"></div>
                      <div className="p-3 bg-blue-600 text-white rounded-xl shadow-sm z-10 animate-pulse">
                        <Clock size={22} />
                      </div>
                      <div className="z-10">
                        <p className="text-xs font-semibold uppercase tracking-wider text-blue-800 mb-1">Live Tracking Duration</p>
                        <p className="font-bold text-blue-900 text-lg tabular-nums tracking-tight">
                          {formatLiveDuration(elapsedDuration)}
                        </p>
                      </div>
                    </div>
                  ) : workOrder.completed_at ? (
                    <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                        <CheckCircle size={22} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Completed At</p>
                        <p className="font-bold text-gray-900 text-sm">
                          {new Date(workOrder.completed_at as string).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Required Parts */}
              {workOrder.requiredParts && workOrder.requiredParts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Package size={18} />
                    Required Parts
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    {workOrder.requiredParts.map((part) => (
                      <div key={part.id} className="flex items-center justify-between p-3 bg-white rounded border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900">{part.name}</p>
                          <p className="text-sm text-gray-500">Quantity: {part.quantity}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${part.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                          {part.available ? 'Available' : 'Out of Stock'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-3">
              {(!workOrder.task && (!workOrder.tasks || workOrder.tasks.length === 0)) ? (
                <div className="text-center py-12 text-gray-500">
                  <Circle size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No tasks defined for this work order</p>
                </div>
              ) : (
                <>
                  {/* JSONB Tasks (Performed Actions) */}
                  {workOrder.task && Array.isArray(workOrder.task) && (
                    <div className="mb-6">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <CheckCircle size={14} className="text-green-600" />
                        Actions Performed
                      </h4>
                      <div className="space-y-2">
                        {workOrder.task.map((t: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                            <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                            <span className="text-sm text-gray-800 font-medium">{t.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Machine Maintenance History tasks */}
                  {machineHistory && machineHistory.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-gray-100">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        Machine History Log
                      </h4>
                      <div className="space-y-4">
                        {machineHistory.map((history: any) => (
                          history.task && Array.isArray(history.task) && history.task.length > 0 && (
                            <div key={history.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-900">{history.work_order_code}</span>
                                  <span className="text-[10px] text-slate-500">{new Date(history.event_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                                <span className={`px-2 py-0.5 border text-[9px] font-bold rounded-lg uppercase shadow-sm ${getHistoryTypeColor(history.event_type)}`}>
                                  {history.event_type}
                                </span>
                              </div>
                              <div className="space-y-2">
                                {history.task.map((t: any, i: number) => (
                                  <div key={i} className="flex items-start gap-2 text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-50">
                                    <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                    <span className="font-medium">{typeof t === 'string' ? t : t.description}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-6">
              {/* Add Note */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Note</h3>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                  placeholder="Write a note about this work order..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Note
                </button>
              </div>

              {/* Notes List */}
              <div className="space-y-4">
                {!workOrder.notes || workOrder.notes.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No notes yet</p>
                  </div>
                ) : (
                  workOrder.notes.map((note) => (
                    <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {note.author.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{note.author}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(note.timestamp).toLocaleString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 ml-10">{note.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={async () => {
              if (confirm('Are you sure you want to delete this work order?')) {
                try {
                  await fetch(`/api/work-orders?id=${workOrder.id}`, { method: 'DELETE' });
                  onClose();
                } catch (error) {
                  console.error('Failed to delete work order:', error);
                }
              }
            }}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            <Trash2 size={18} />
            Delete Work Order
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
            >
              Close
            </button>
            <button
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Edit size={18} />
              Edit Work Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}