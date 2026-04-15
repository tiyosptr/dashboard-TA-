'use client';

import { useState, useMemo } from 'react';
import { Settings, Calendar, Play, AlertTriangle, User, FileText, ChevronRight, Briefcase, Clock, Search, Check } from 'lucide-react';
import BaseModal from '@/app/components/ui/BaseModal';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'motion/react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface PreventiveMaintenanceFormProps {
  schedule?: any; // Accepting machine or schedule object
  onClose: () => void;
}

export default function PreventiveMaintenanceForm({ schedule, onClose }: PreventiveMaintenanceFormProps) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'work-order' | 'status'>('schedule');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: techniciansResponse } = useSWR('/api/technician', fetcher);
  const technicians = techniciansResponse?.success ? techniciansResponse.data : [];

  // Custom Dropdown State
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
    // Simulation of API calls based on active tab
    try {
      if (activeTab === 'schedule') {
        console.log('Saving schedule:', formData);
      } else if (activeTab === 'work-order') {
        console.log('Generating Work Order:', formData);
      } else if (activeTab === 'status') {
        console.log('Changing status to:', formData.machineStatus);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'schedule', label: 'Maintenance Schedule', icon: Calendar },
    { id: 'work-order', label: 'Generate Work Order', icon: FileText },
    { id: 'status', label: 'Machine Status', icon: Settings },
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
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm flex items-center gap-2"
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
              onClick={() => setActiveTab(tab.id)}
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

        <div className="p-6 overflow-y-auto">
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
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Priority Level</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'Low', color: 'bg-emerald-50 text-emerald-700 border-emerald-100 active:bg-emerald-500 active:text-white' },
                    { id: 'Medium', color: 'bg-amber-50 text-amber-700 border-amber-100 active:bg-amber-500 active:text-white' },
                    { id: 'High', color: 'bg-rose-50 text-rose-700 border-rose-100 active:bg-rose-500 active:text-white' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData({...formData, woPriority: p.id})}
                      className={`py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider border transition-all shadow-sm ${
                        formData.woPriority === p.id 
                          ? p.color.split(' active')[0] + ' ring-2 ring-offset-1 ring-current' 
                          : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                      }`}
                    >
                      {p.id}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Assigned Technician</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsTechDropdownOpen(!isTechDropdownOpen)}
                      className={`w-full relative flex items-center justify-between pl-12 pr-4 py-3 bg-slate-50 border rounded-2xl transition-all duration-300 ${
                        isTechDropdownOpen 
                          ? 'border-indigo-500 ring-4 ring-indigo-100 bg-white shadow-md' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <User className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isTechDropdownOpen ? 'text-indigo-500' : 'text-slate-400'}`} size={18} />
                        <span className={`text-sm font-bold truncate ${formData.woAssignedTo ? 'text-slate-700' : 'text-slate-400'}`}>
                          {formData.woAssignedTo || 'Select a technician...'}
                        </span>
                      </div>
                      <ChevronRight className={`text-slate-400 transition-transform duration-300 ${isTechDropdownOpen ? 'rotate-90' : 'rotate-0'}`} size={16} />
                    </button>

                    <AnimatePresence>
                      {isTechDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="bg-white border border-slate-200 rounded-2xl shadow-inner overflow-hidden"
                        >
                          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                              <input
                                type="text"
                                placeholder="Search technician..."
                                value={searchTech}
                                onChange={(e) => setSearchTech(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                              />
                            </div>
                          </div>
                          <div 
                            className="max-h-60 overflow-y-auto p-2 custom-scrollbar overscroll-contain"
                            onWheel={(e) => e.stopPropagation()}
                          >
                              {filteredTechnicians.length === 0 ? (
                                <div className="p-8 text-center bg-slate-50 rounded-xl">
                                  <User className="mx-auto text-slate-300 mb-2" size={24} />
                                  <p className="text-xs text-slate-500 font-bold">No technician matches found</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 gap-1">
                                  {filteredTechnicians.map((t: any) => (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={() => {
                                        setFormData({...formData, woAssignedTo: t.name});
                                        setIsTechDropdownOpen(false);
                                      }}
                                      className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                                        formData.woAssignedTo === t.name 
                                          ? 'bg-indigo-50 border border-indigo-100' 
                                          : 'hover:bg-slate-50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${formData.woAssignedTo === t.name ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                          <Briefcase size={14} />
                                        </div>
                                        <div className="flex-1 text-left">
                                          <div className="flex items-center justify-between gap-4">
                                            <div className="flex flex-col">
                                              <div className={`text-xs font-black uppercase tracking-tight ${formData.woAssignedTo === t.name ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                {t.name}
                                              </div>
                                              <div className="text-[10px] text-slate-400 font-bold">{t.specialization || 'General Technician'}</div>
                                            </div>
                                            
                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all duration-500 ${
                                              t.is_active 
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                : 'bg-slate-50 text-slate-400 border-slate-100'
                                            }`}>
                                              {t.is_active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                                              {t.is_active ? 'Active' : 'Inactive'}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      {formData.woAssignedTo === t.name && (
                                        <motion.div
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          className="text-indigo-600"
                                        >
                                          <Check size={16} strokeWidth={3} />
                                        </motion.div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Description of Work</label>
                <div className="relative group">
                  <FileText className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  <textarea
                    rows={4}
                    value={formData.woDescription}
                    onChange={(e) => setFormData({...formData, woDescription: e.target.value})}
                    placeholder="Describe the maintenance tasks to be performed..."
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white outline-none font-medium text-slate-600 transition-all shadow-sm resize-none text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: STATUS */}
          {activeTab === 'status' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Select Machine Operational Mode</label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'active', label: 'Active', icon: Play, desc: 'Machine is in normal production mode', color: 'indigo' },
                  { id: 'maintenance', label: 'Maintenance', icon: Settings, desc: 'Machine is under repair or service', color: 'blue' },
                  { id: 'onhold', label: 'On Hold', icon: AlertTriangle, desc: 'Machine paused waiting for parts/approval', color: 'amber' },
                  { id: 'downtime', label: 'Downtime', icon: AlertTriangle, desc: 'Machine stopped due to unexpected error', color: 'rose' },
                  { id: 'inactive', label: 'Inactive', icon: Calendar, desc: 'Machine is fully powered down', color: 'slate' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setFormData({...formData, machineStatus: s.id})}
                    className={`flex items-center gap-4 p-4 border-2 rounded-2xl text-left transition-all relative overflow-hidden group ${
                      formData.machineStatus === s.id 
                        ? `border-${s.color}-500 bg-${s.color}-50/50 ring-4 ring-${s.color}-100` 
                        : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {formData.machineStatus === s.id && (
                      <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-${s.color}-500/10 rounded-full blur-2xl animate-pulse`}></div>
                    )}
                    <div className={`p-3 rounded-xl transition-all duration-500 ${
                      formData.machineStatus === s.id 
                        ? `bg-${s.color}-500 text-white shadow-lg shadow-${s.color}-200` 
                        : 'bg-slate-100 text-slate-400 group-hover:scale-110'
                    }`}>
                      <s.icon size={20} />
                    </div>
                    <div className="flex-1">
                      <div className={`font-black text-sm uppercase tracking-tight transition-colors ${
                        formData.machineStatus === s.id ? `text-${s.color}-900` : 'text-slate-600'
                      }`}>
                        {s.label}
                      </div>
                      <div className="text-[11px] text-slate-500 font-bold leading-tight mt-0.5">
                        {s.desc}
                      </div>
                    </div>
                    {formData.machineStatus === s.id && (
                      <div className={`w-2 h-2 rounded-full bg-${s.color}-500 animate-ping`}></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
}