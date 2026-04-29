'use client';

import { useState, useMemo } from 'react';
import { Settings, Calendar, Play, AlertTriangle, User, FileText, ChevronRight, Briefcase, Clock, Search, Check } from 'lucide-react';
import BaseModal from '@/app/components/ui/BaseModal';
import useSWR, { mutate as swrMutate } from 'swr';
import { motion, AnimatePresence } from 'motion/react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface PreventiveMaintenanceFormProps {
  schedule?: any; // Accepting machine or schedule object
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PreventiveMaintenanceForm({ schedule, onClose, onSuccess }: PreventiveMaintenanceFormProps) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'work-order'>('schedule');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: techniciansResponse } = useSWR('/api/technician', fetcher);
  const technicians = techniciansResponse?.success ? techniciansResponse.data : [];

  // Dropdown States
  const [isTechDropdownOpen, setIsTechDropdownOpen] = useState(false);
  const [searchTech, setSearchTech] = useState('');

  const [formData, setFormData] = useState({
    machineId: schedule?.id || schedule?.machineId || '',
    scheduleType: schedule?.scheduleType || 'Time-based',
    nextMaintenance: schedule?.next_maintenance ? new Date(schedule.next_maintenance).toISOString().split('T')[0] : '',
    intervalValue: '',
    intervalType: 'hours',
    // Work Order fields
    woPriority: 'Medium',
    woDescription: `Preventive maintenance for ${schedule?.name_machine}`,
    woAssignedTo: '', // Store name
    // Machine status
    machineStatus: schedule?.status || 'active'
  });

  const filteredTechnicians = technicians.filter((t: any) => 
    t.name.toLowerCase().includes(searchTech.toLowerCase()) ||
    (t.specialization || '').toLowerCase().includes(searchTech.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (activeTab === 'schedule') {
        if (!formData.nextMaintenance) {
          throw new Error('Please select a next maintenance date');
        }
        const res = await fetch('/api/machines/update-maintenance', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            machine_id: formData.machineId,
            next_maintenance: formData.nextMaintenance,
          })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to update schedule');
        }
        // Revalidate both schedule and machine list data
        await swrMutate('/api/maintenance/scheduled');
        await swrMutate((key: any) => typeof key === 'string' && key.startsWith('/api/machines'), undefined, { revalidate: true });
        // Notify non-SWR components (e.g. MachineList) to refresh
        window.dispatchEvent(new CustomEvent('machine-data-updated'));
      } else if (activeTab === 'work-order') {
        // 1. Update machine status first
        const statusRes = await fetch('/api/machines/status-change', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            machine_id: formData.machineId, 
            new_status: formData.machineStatus 
          })
        });
        if (!statusRes.ok) {
          const errData = await statusRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to update machine status');
        }

        // 2. Generate WO
        const woBody: any = {
          machineId: formData.machineId,
          machineName: schedule?.name_machine || schedule?.machineName,
          lineId: schedule?.line_id || schedule?.lineId,
          nameLine: schedule?.line_name || schedule?.nameLine,
          type: 'Preventive',
          priority: formData.woPriority,
          assignedTo: formData.woAssignedTo,
          description: formData.woDescription || `Technician ${formData.woAssignedTo} assigned for ${formData.machineStatus}`,
          status: 'Pending',
          workOrderCode: `WO-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`
        };

        if (formData.nextMaintenance) {
          woBody.scheduleDate = new Date(formData.nextMaintenance).toISOString();
        }

        const woRes = await fetch('/api/work-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(woBody)
        });
        if (!woRes.ok) {
          const errData = await woRes.json().catch(() => ({}));
          throw new Error(errData.error + (errData.details ? ': ' + errData.details : '') || 'Failed to generate work order');
        }
      }
      
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'schedule', label: 'Maintenance Schedule', icon: Calendar },
    { id: 'work-order', label: 'Generate Work Order', icon: FileText },
  ] as const;

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title="Maintenance Dashboard"
      subtitle={schedule?.name_machine || 'Machine Maintenance Control'}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-bold shadow-sm flex items-center gap-2 text-sm"
          >
            {isSubmitting ? 'Processing...' : activeTab === 'work-order' ? 'Generate WO' : 'Save Changes'}
            {!isSubmitting && <ChevronRight size={16} />}
          </button>
        </div>
      }
    >
      <div className="flex flex-col h-full border rounded-xl overflow-hidden bg-white shadow-inner">
        {/* Internal Tabs */}
        <div className="flex bg-slate-50 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-all border-r last:border-r-0 ${
                activeTab === tab.id 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* TAB: SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Next Scheduled Date</label>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                      type="date"
                      value={formData.nextMaintenance}
                      onChange={(e) => setFormData({...formData, nextMaintenance: e.target.value})}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-700 transition-all shadow-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Auto-Interval</label>
                  <div className="relative group">
                     <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                      type="number"
                      placeholder="750"
                      value={formData.intervalValue}
                      onChange={(e) => setFormData({...formData, intervalValue: e.target.value})}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-700 transition-all shadow-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Unit</label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-700 transition-all shadow-sm appearance-none"
                    value={formData.intervalType}
                    onChange={(e) => setFormData({...formData, intervalType: e.target.value})}
                  >
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="cycles">Cycles</option>
                  </select>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 shadow-sm">
                <div className="flex gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600">
                    <AlertTriangle size={16} />
                  </div>
                  <p className="text-[11px] text-indigo-800 font-bold leading-relaxed">
                    Automated scheduling ensures preventive maintenance is performed before failures occur, maximizing equipment OEE and reducing unplanned downtime.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: WORK ORDER */}
          {activeTab === 'work-order' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
              {/* Status Selection at the top of WO generation */}
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1 text-center">Set Machine Status & Requirements</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'active', label: 'Active', icon: Play, color: 'indigo' },
                    { id: 'maintenance', label: 'Maintenance', icon: Settings, color: 'blue' },
                    { id: 'on hold', label: 'On Hold', icon: AlertTriangle, color: 'amber' },
                    { id: 'inactive', label: 'Inactive', icon: Calendar, color: 'slate' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFormData({...formData, machineStatus: s.id})}
                      className={`flex flex-col items-center justify-center p-3 border-2 rounded-2xl transition-all gap-2 ${
                        formData.machineStatus === s.id 
                          ? `border-${s.color}-500 bg-${s.color}-50 shadow-sm ring-2 ring-${s.color}-100` 
                          : 'border-slate-100 hover:border-slate-200 bg-white'
                      }`}
                    >
                      <div className={`p-2 rounded-xl transition-all ${
                        formData.machineStatus === s.id ? `bg-${s.color}-500 text-white shadow-md` : 'bg-slate-100 text-slate-400'
                      }`}>
                        <s.icon size={16} />
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-tight ${
                        formData.machineStatus === s.id ? `text-${s.color}-800` : 'text-slate-500'
                      }`}>
                        {s.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional: Technician Selection for Maintenance */}
              <AnimatePresence mode="wait">
                {formData.machineStatus === 'maintenance' && (
                  <motion.div
                    key="tech-select"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden pt-2"
                  >
                    <div className="p-4 bg-blue-50/50 rounded-2xl border-2 border-blue-100/50">
                      <label className="block text-[11px] font-black text-blue-900 uppercase tracking-widest mb-2 px-1">Assign Responsible Technician</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsTechDropdownOpen(!isTechDropdownOpen)}
                          className={`w-full relative flex items-center justify-between pl-12 pr-4 py-3 bg-white border rounded-2xl transition-all duration-300 ${
                            isTechDropdownOpen 
                              ? 'border-blue-500 ring-4 ring-blue-100 shadow-md' 
                              : 'border-blue-200'
                          }`}
                        >
                          <User className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isTechDropdownOpen ? 'text-blue-500' : 'text-slate-400'}`} size={18} />
                          <span className={`text-sm font-bold truncate ${formData.woAssignedTo ? 'text-slate-700' : 'text-slate-400'}`}>
                            {formData.woAssignedTo || 'Select a technician...'}
                          </span>
                          <ChevronRight className={`text-slate-400 transition-transform duration-300 ${isTechDropdownOpen ? 'rotate-90' : 'rotate-0'}`} size={16} />
                        </button>

                        <AnimatePresence>
                          {isTechDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute top-full left-0 right-0 z-30 mt-2 bg-white border-2 border-blue-100 rounded-2xl shadow-xl overflow-hidden"
                            >
                              <div className="p-2 border-b bg-slate-50">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                  <input
                                    type="text"
                                    placeholder="Search tech..."
                                    value={searchTech}
                                    onChange={(e) => setSearchTech(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border rounded-xl text-xs font-bold outline-none"
                                  />
                                </div>
                              </div>
                              <div className="max-h-48 overflow-y-auto">
                                {filteredTechnicians.map((t: any) => (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => {
                                      setFormData({...formData, woAssignedTo: t.name});
                                      setIsTechDropdownOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 transition-all text-left"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[10px]">
                                      {t.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{t.name}</div>
                                      <div className="text-[9px] text-slate-500 font-bold">{t.specialization}</div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Priority</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['Low', 'Medium', 'High'].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setFormData({...formData, woPriority: p})}
                            className={`py-2 rounded-xl text-[10px] font-black border transition-all ${
                              formData.woPriority === p ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border-slate-200'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Conditional: Reason/Description for everything except Active */}
              {formData.machineStatus !== 'active' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-2"
                >
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">
                    {formData.machineStatus === 'maintenance' ? 'Work Description' : 'Status Change Reason'}
                  </label>
                  <div className="relative group">
                    <FileText className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <textarea
                      rows={3}
                      value={formData.woDescription}
                      onChange={(e) => setFormData({...formData, woDescription: e.target.value})}
                      placeholder={formData.machineStatus === 'maintenance' ? "Describe the maintenance tasks..." : "Provide context for this status change..."}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-700 transition-all shadow-sm resize-none text-xs"
                    />
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
}