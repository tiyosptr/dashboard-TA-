'use client';

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { PreventiveSchedule } from '@/types';

interface PreventiveMaintenanceFormProps {
  schedule?: PreventiveSchedule;
  onClose: () => void;
}

export default function PreventiveMaintenanceForm({ schedule, onClose }: PreventiveMaintenanceFormProps) {
  const [formData, setFormData] = useState({
    machineId: schedule?.machineId || '',
    scheduleType: schedule?.scheduleType || 'Time-based',
    intervalType: 'hours',
    intervalValue: '',
    conditions: {
      runningHours: schedule?.conditions?.runningHours || '',
      cycleCount: schedule?.conditions?.cycleCount || '',
      temperature: schedule?.conditions?.temperature || '',
      vibration: schedule?.conditions?.vibration || '',
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {schedule ? 'Edit Schedule' : 'Create Preventive Maintenance Schedule'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Machine Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Machine *
            </label>
            <select
              value={formData.machineId}
              onChange={(e) => setFormData({ ...formData, machineId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Machine</option>
              <option value="M-001">M-001 - Injection Molding #1</option>
              <option value="M-002">M-002 - Injection Molding #2</option>
              <option value="M-003">M-003 - Injection Molding #3</option>
              <option value="M-004">M-004 - Extruder #4</option>
              <option value="M-005">M-005 - Extruder #5</option>
              <option value="M-006">M-006 - Welding Machine #6</option>
            </select>
          </div>

          {/* Schedule Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Schedule Type *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, scheduleType: 'Time-based' })}
                className={`p-4 border-2 rounded-lg transition-all ${
                  formData.scheduleType === 'Time-based'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-semibold text-gray-900 mb-1">Time-based</div>
                <div className="text-xs text-gray-600">Fixed interval schedule</div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, scheduleType: 'Condition-based' })}
                className={`p-4 border-2 rounded-lg transition-all ${
                  formData.scheduleType === 'Condition-based'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-semibold text-gray-900 mb-1">Condition-based</div>
                <div className="text-xs text-gray-600">Triggered by conditions</div>
              </button>
            </div>
          </div>

          {/* Time-based Settings */}
          {formData.scheduleType === 'Time-based' && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Time-based Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interval Value *
                  </label>
                  <input
                    type="number"
                    value={formData.intervalValue}
                    onChange={(e) => setFormData({ ...formData, intervalValue: e.target.value })}
                    placeholder="e.g., 750"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interval Type *
                  </label>
                  <select
                    value={formData.intervalType}
                    onChange={(e) => setFormData({ ...formData, intervalType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="cycles">Cycles</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-3">
                Maintenance will be scheduled every {formData.intervalValue || 'X'} {formData.intervalType}
              </p>
            </div>
          )}

          {/* Condition-based Settings */}
          {formData.scheduleType === 'Condition-based' && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Condition-based Thresholds</h3>
              <p className="text-xs text-gray-600 mb-4">
                Maintenance will be triggered when any of these conditions are met:
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Running Hours Threshold
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.conditions.runningHours}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: { ...formData.conditions, runningHours: e.target.value }
                      })}
                      placeholder="e.g., 750"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                      hours
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cycle Count Threshold
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.conditions.cycleCount}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: { ...formData.conditions, cycleCount: e.target.value }
                      })}
                      placeholder="e.g., 10000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                      cycles
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temperature Threshold
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.conditions.temperature}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: { ...formData.conditions, temperature: e.target.value }
                      })}
                      placeholder="e.g., 80"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                      °C
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vibration Threshold
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.conditions.vibration}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: { ...formData.conditions, vibration: e.target.value }
                      })}
                      placeholder="e.g., 3.0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                      mm/s
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {schedule ? 'Update Schedule' : 'Create Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}