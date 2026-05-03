'use client';

import { useState } from 'react';
import { X, CheckCircle, Plus, Trash2, Save, Clock } from 'lucide-react';
import { WorkOrder } from '@/types';

interface WorkOrderCompleteFormProps {
  workOrder: WorkOrder;
  onClose: () => void;
  onSuccess: (tasks: any[], nextMaintenanceDate?: string) => void;
}

export default function WorkOrderCompleteForm({ workOrder, onClose, onSuccess }: WorkOrderCompleteFormProps) {
  const [tasks, setTasks] = useState<{ description: string }[]>([]);
  const [newTask, setNewTask] = useState('');
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMaintenanceType = ['preventive', 'maintenance', 'planned downtime'].includes(workOrder.type?.toLowerCase());

  const handleAddTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, { description: newTask.trim() }]);
      setNewTask('');
    }
  };

  const handleRemoveTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    let finalTasks = [...tasks];
    
    // Auto-add current text if user hasn't clicked "+"
    if (newTask.trim()) {
      finalTasks.push({ description: newTask.trim() });
    }

    if (finalTasks.length === 0) {
      alert('Please add at least one task or description of what was done.');
      return;
    }

    if (isMaintenanceType && !nextMaintenanceDate) {
      alert('Please select a date for the next maintenance.');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Submitting completed tasks:', finalTasks, 'Next Maintenance:', nextMaintenanceDate);
      await onSuccess(finalTasks, nextMaintenanceDate || undefined);
    } catch (error) {
      console.error('Error completing work order:', error);
      alert('Failed to complete work order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
        {/* Header - Premium Glassmorphism Effect */}
        <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl"></div>
          
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl shadow-inner border border-white/30">
                <CheckCircle size={28} className="text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight leading-none mb-1">Finish Work Order</h3>
                <p className="text-emerald-50 text-sm font-medium opacity-80 flex items-center gap-1.5">
                  <span className="bg-emerald-400/30 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest border border-white/10">ID</span>
                  {workOrder.work_order_code}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all border border-white/10"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content - Optimized Two Column Layout */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-slate-50/30">
          {/* Summary Banner */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-5 rounded-3xl flex gap-4 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100/50 rounded-full -mr-12 -mt-12 blur-2xl"></div>
            <div className="bg-white p-2.5 rounded-xl shadow-sm h-fit z-10 border border-emerald-100">
              <CheckCircle size={22} className="text-emerald-600" />
            </div>
            <div className="z-10">
              <p className="text-emerald-900 text-sm font-black uppercase tracking-wide">
                Task Completion Summary
              </p>
              <p className="text-emerald-700/80 text-xs mt-1 leading-relaxed font-medium">
                Describe the actions taken to resolve this <span className="font-bold underline decoration-emerald-300 underline-offset-2">{workOrder.type}</span>. Detailed logs help improve future maintenance predictions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - Actions (Wider) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  Add Performed Action
                </label>
                <div className="flex gap-2 p-2 bg-white border border-slate-200 rounded-2xl focus-within:ring-4 focus-within:ring-emerald-500/10 focus-within:border-emerald-500 transition-all shadow-sm">
                  <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                    placeholder="E.g., Replaced oil filter..."
                    className="flex-1 px-3 py-2 bg-transparent border-none focus:outline-none text-slate-800 text-sm font-bold placeholder:text-slate-300"
                  />
                  <button
                    onClick={handleAddTask}
                    disabled={!newTask.trim()}
                    className="bg-emerald-600 text-white px-5 py-2 rounded-xl hover:bg-emerald-700 disabled:opacity-30 transition-all font-black text-xs shadow-lg shadow-emerald-200 flex items-center gap-2"
                  >
                    <Plus size={16} strokeWidth={3} />
                    ADD
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  Performed Actions List
                </label>
                <div className="max-h-[320px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {tasks.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-[2rem] bg-white/50 backdrop-blur-sm">
                      <div className="bg-slate-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <Plus size={24} className="text-slate-300" />
                      </div>
                      <p className="text-slate-400 text-sm font-bold italic tracking-tight">Record your maintenance actions here</p>
                    </div>
                  ) : (
                    tasks.map((task, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/5 transition-all animate-in slide-in-from-left-4 duration-300"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-sm border border-emerald-100 shadow-sm">
                            {index + 1}
                          </div>
                          <span className="text-sm text-slate-700 font-bold">{task.description}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveTask(index)}
                          className="text-slate-300 hover:text-rose-500 p-2 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50 rounded-xl"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Maintenance Date (Narrower) */}
            <div className="lg:col-span-5 space-y-6">
              {isMaintenanceType ? (
                <div className="flex flex-col gap-3 p-6 bg-indigo-600 rounded-[2rem] shadow-xl shadow-indigo-200 text-white relative overflow-hidden group">
                  <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                  
                  <label className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Clock size={14} strokeWidth={3} />
                    Schedule Next *
                  </label>
                  
                  <div className="relative z-10">
                    <input
                      type="date"
                      required
                      value={nextMaintenanceDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setNextMaintenanceDate(e.target.value)}
                      className="w-full px-5 py-4 bg-white border-none rounded-2xl focus:outline-none focus:ring-4 focus:ring-white/30 text-indigo-900 font-black shadow-lg transition-all"
                    />
                  </div>
                  
                  <div className="space-y-2 mt-2">
                    <p className="text-[10px] text-indigo-100/70 font-bold leading-relaxed">
                      Maintenance scheduling is <span className="text-white underline underline-offset-4 decoration-indigo-300">mandatory</span> for {workOrder.type} types.
                    </p>
                    <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                       <div className={`h-full bg-white transition-all duration-500 ${nextMaintenanceDate ? 'w-full' : 'w-1/3'}`}></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-100/50 rounded-[2rem] border border-slate-200 border-dashed">
                  <Clock size={40} className="text-slate-300 mb-4 opacity-50" />
                  <p className="text-slate-400 text-xs font-bold text-center">Next maintenance scheduling not required for this type.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Sticky Shadow Effect */}
        <div className="p-8 bg-white border-t border-slate-100 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-4 border-2 border-slate-100 rounded-2xl text-slate-500 font-black hover:bg-slate-50 hover:border-slate-200 transition-all text-sm uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (tasks.length === 0 && !newTask.trim())}
            className="flex-[2] flex items-center justify-center gap-3 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 disabled:opacity-40 shadow-xl shadow-emerald-200 transition-all text-sm uppercase tracking-widest group"
          >
            <Save size={20} className="group-hover:scale-110 transition-transform" />
            {isSubmitting ? 'Saving Progress...' : 'Finish & Update Machine'}
          </button>
        </div>
      </div>
    </div>
  );
}
