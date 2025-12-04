'use client';

import { useState } from 'react';
import { Plus, Calendar, Clock, AlertCircle, Play, Pause, Edit } from 'lucide-react';
import PreventiveMaintenanceForm from './preventive-maintenance-form';
import { PreventiveSchedule } from '@/types';

export default function MaintenanceSchedule() {
  const [showForm, setShowForm] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<PreventiveSchedule | null>(null);

  // Mock data
  const schedules: PreventiveSchedule[] = [
    {
      id: 'PM-001',
      machineId: 'M-001',
      machineName: 'Injection Molding #1',
      scheduleType: 'Time-based',
      interval: 'Every 750 hours',
      lastMaintenance: '2025-01-10',
      nextMaintenance: '2025-02-10',
      status: 'Active',
    },
    {
      id: 'PM-002',
      machineId: 'M-002',
      machineName: 'Injection Molding #2',
      scheduleType: 'Time-based',
      interval: 'Every 750 hours',
      lastMaintenance: '2025-01-12',
      nextMaintenance: '2025-02-12',
      status: 'Active',
    },
    {
      id: 'PM-003',
      machineId: 'M-003',
      machineName: 'Injection Molding #3',
      scheduleType: 'Condition-based',
      interval: 'When conditions met',
      lastMaintenance: '2024-12-28',
      nextMaintenance: '2025-01-28',
      status: 'Active',
      conditions: {
        runningHours: 750,
        temperature: 80,
        vibration: 3.0,
      },
    },
    {
      id: 'PM-004',
      machineId: 'M-004',
      machineName: 'Extruder #4',
      scheduleType: 'Time-based',
      interval: 'Every 1000 hours',
      lastMaintenance: '2025-01-08',
      nextMaintenance: '2025-02-08',
      status: 'Active',
    },
    {
      id: 'PM-005',
      machineId: 'M-005',
      machineName: 'Extruder #5',
      scheduleType: 'Condition-based',
      interval: 'When conditions met',
      lastMaintenance: '2025-01-05',
      nextMaintenance: 'Condition-based',
      status: 'Paused',
      conditions: {
        runningHours: 500,
        cycleCount: 10000,
        temperature: 85,
      },
    },
    {
      id: 'PM-006',
      machineId: 'M-006',
      machineName: 'Welding Machine #6',
      scheduleType: 'Time-based',
      interval: 'Every 30 days',
      lastMaintenance: '2025-01-15',
      nextMaintenance: '2025-02-15',
      status: 'Active',
    },
  ];

  const getDaysUntil = (date: string) => {
    if (date === 'Condition-based') return null;
    const today = new Date();
    const target = new Date(date);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyColor = (days: number | null) => {
    if (days === null) return 'bg-gray-100 text-gray-700';
    if (days < 0) return 'bg-red-100 text-red-700';
    if (days <= 7) return 'bg-orange-100 text-orange-700';
    if (days <= 14) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Preventive Maintenance Schedule</h2>
          <p className="text-sm text-gray-500">Manage automated maintenance schedules</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus size={20} />
          New Schedule
        </button>
      </div>

      {/* Schedule Types Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Clock className="text-white" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Time-based Maintenance</h3>
              <p className="text-sm text-gray-700">
                Scheduled at fixed intervals (hours, days, or cycles) regardless of machine condition.
              </p>
              <p className="text-xs text-blue-700 mt-2 font-medium">
                Active schedules: {schedules.filter(s => s.scheduleType === 'Time-based' && s.status === 'Active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-600 rounded-lg">
              <AlertCircle className="text-white" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Condition-based Maintenance</h3>
              <p className="text-sm text-gray-700">
                Triggered when machine conditions exceed predefined thresholds (temperature, vibration, etc.)
              </p>
              <p className="text-xs text-green-700 mt-2 font-medium">
                Active schedules: {schedules.filter(s => s.scheduleType === 'Condition-based' && s.status === 'Active').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schedules.map((schedule) => {
          const daysUntil = getDaysUntil(schedule.nextMaintenance);
          
          return (
            <div
              key={schedule.id}
              className={`bg-white rounded-xl shadow-sm border-2 p-6 ${
                schedule.status === 'Active' ? 'border-gray-200' : 'border-gray-300 opacity-70'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900">{schedule.machineName}</h3>
                  <p className="text-sm text-gray-600">{schedule.machineId}</p>
                </div>
                <div className="flex items-center gap-2">
                  {schedule.status === 'Active' ? (
                    <Play className="text-green-600" size={20} />
                  ) : (
                    <Pause className="text-gray-600" size={20} />
                  )}
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    schedule.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {schedule.status}
                  </span>
                </div>
              </div>

              {/* Schedule Type */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  {schedule.scheduleType === 'Time-based' ? (
                    <Clock className="text-blue-600" size={18} />
                  ) : (
                    <AlertCircle className="text-green-600" size={18} />
                  )}
                  <span className="text-sm font-semibold text-gray-700">{schedule.scheduleType}</span>
                </div>
                <p className="text-sm text-gray-600">{schedule.interval}</p>
              </div>

              {/* Dates */}
              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Last Maintenance</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(schedule.lastMaintenance).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Next Maintenance</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">
                      {schedule.nextMaintenance === 'Condition-based' ? (
                        'Condition-based'
                      ) : (
                        new Date(schedule.nextMaintenance).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })
                      )}
                    </p>
                    {daysUntil !== null && (
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getUrgencyColor(daysUntil)}`}>
                        {daysUntil < 0 ? 'Overdue' : daysUntil === 0 ? 'Today' : `${daysUntil}d`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Conditions */}
              {schedule.conditions && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Trigger Conditions:</p>
                  <div className="space-y-1 text-xs text-gray-600">
                    {schedule.conditions.runningHours && (
                      <div className="flex justify-between">
                        <span>Running Hours:</span>
                        <span className="font-semibold">&gt;{schedule.conditions.runningHours}h</span>
                      </div>
                    )}
                    {schedule.conditions.cycleCount && (
                      <div className="flex justify-between">
                        <span>Cycle Count:</span>
                        <span className="font-semibold">&gt;{schedule.conditions.cycleCount.toLocaleString()}</span>
                      </div>
                    )}
                    {schedule.conditions.temperature && (
                      <div className="flex justify-between">
                        <span>Temperature:</span>
                        <span className="font-semibold">&gt;{schedule.conditions.temperature}°C</span>
                      </div>
                    )}
                    {schedule.conditions.vibration && (
                      <div className="flex justify-between">
                        <span>Vibration:</span>
                        <span className="font-semibold">&gt;{schedule.conditions.vibration} mm/s</span>
                      </div>
                    )}</div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedSchedule(schedule)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button
                  className="flex-1 px-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                >
                  {schedule.status === 'Active' ? 'Pause' : 'Activate'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {showForm && <PreventiveMaintenanceForm onClose={() => setShowForm(false)} />}
      {selectedSchedule && (
        <PreventiveMaintenanceForm 
          schedule={selectedSchedule}
          onClose={() => setSelectedSchedule(null)} 
        />
      )}
    </div>
  );
}