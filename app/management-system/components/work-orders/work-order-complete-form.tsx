'use client';

import { useState } from 'react';
import { X, CheckCircle, Plus, Trash2, Save } from 'lucide-react';
import { WorkOrder } from '@/types';

interface WorkOrderCompleteFormProps {
  workOrder: WorkOrder;
  onClose: () => void;
  onSuccess: (tasks: any[]) => void;
}

export default function WorkOrderCompleteForm({ workOrder, onClose, onSuccess }: WorkOrderCompleteFormProps) {
  const [tasks, setTasks] = useState<{ description: string }[]>([]);
  const [newTask, setNewTask] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);
    try {
      console.log('Submitting completed tasks:', finalTasks);
      await onSuccess(finalTasks);
    } catch (error) {
      console.error('Error completing work order:', error);
      alert('Failed to complete work order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fade-in-up">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-fade-in-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-6 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <CheckCircle size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Complete Work Order</h3>
                <p className="text-green-50 text-sm opacity-90">{workOrder.work_order_code}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex gap-3 shadow-sm">
            <div className="bg-emerald-100 p-2 rounded-lg h-fit">
              <CheckCircle size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-emerald-900 text-sm font-bold">
                Task Completion Summary
              </p>
              <p className="text-emerald-700 text-xs mt-0.5 leading-relaxed">
                Describe the actions taken to resolve this {workOrder.type}. This will be saved in the maintenance history.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                Add performed action
              </label>
              <div className="flex gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white transition-all">
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                  placeholder="Describe your action..."
                  className="flex-1 px-3 py-2 bg-transparent border-none focus:outline-none text-slate-900 text-sm font-medium placeholder:text-slate-400"
                />
                <button
                  onClick={handleAddTask}
                  disabled={!newTask.trim()}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 disabled:opacity-30 transition-all font-bold text-sm shadow-md shadow-emerald-200 flex items-center gap-1.5"
                >
                  <Plus size={18} />
                  Add
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                Performed actions list
              </label>
              <div className="max-h-[280px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                {tasks.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/30">
                    <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Plus size={20} className="text-slate-400" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium italic">No actions recorded yet</p>
                  </div>
                ) : (
                  tasks.map((task, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-50 transition-all animate-fade-in-up"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-xs border border-emerald-100">
                          {index + 1}
                        </div>
                        <span className="text-sm text-slate-800 font-bold">{task.description}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveTask(index)}
                        className="text-slate-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded-xl"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (tasks.length === 0 && !newTask.trim())}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 shadow-lg shadow-green-200 transition-all text-sm"
          >
            <Save size={18} />
            {isSubmitting ? 'Saving...' : 'Finish & Complete'}
          </button>
        </div>
      </div>
    </div>
  );
}
