'use client';

import { X, AlertTriangle, Clock, MapPin, CheckCircle, Database } from 'lucide-react';
import { Notification } from '@/types';
import JsonDataDisplay from '@/app/components/ui/JsonDataDisplay';

interface NotificationDetailProps {
  notification: Notification;
  onClose: () => void;
}

export default function NotificationDetail({ notification, onClose }: NotificationDetailProps) {
  const getSeverityColor = (severity: string) => {
    const severityLower = severity.toLowerCase();
    switch (severityLower) {
      case 'critical':
        return 'from-red-600 to-red-700';
      case 'high':
        return 'from-orange-600 to-orange-700';
      case 'medium':
        return 'from-yellow-600 to-yellow-700';
      case 'low':
        return 'from-blue-600 to-blue-700';
      default:
        return 'from-gray-600 to-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`bg-gradient-to-r ${getSeverityColor(notification.severity)} px-6 py-5`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle size={24} className="text-white" />
                <h2 className="text-xl font-bold text-white">Notification Details</h2>
              </div>
              <p className="text-white/90 text-sm">
                {notification.machine_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6">
          {/* Basic Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Type</p>
              <p className="font-bold text-gray-900 capitalize">{notification.type}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Severity</p>
              <p className="font-bold text-gray-900 capitalize">{notification.severity}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Status</p>
              <div className="flex items-center gap-2">
                {notification.acknowledged ? (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold flex items-center gap-1">
                    <CheckCircle size={12} />
                    Acknowledged
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-md text-xs font-bold">
                    Pending
                  </span>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Machine ID</p>
              <p className="font-mono text-xs text-gray-700">{notification.machine_id}</p>
            </div>

            {notification.name_line && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Line</p>
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-indigo-600" />
                  <p className="font-bold text-gray-900">{notification.name_line}</p>
                </div>
              </div>
            )}

            {notification.work_order_id && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Work Order</p>
                <p className="font-mono text-xs text-green-700 font-bold">{notification.work_order_id}</p>
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-blue-600" />
                <p className="text-xs text-blue-700 uppercase tracking-wider font-semibold">Start Time</p>
              </div>
              <p className="font-bold text-blue-900">
                {new Date(notification.start_at + (notification.start_at?.endsWith('Z') ? '' : 'Z')).toLocaleString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </p>
            </div>

            {notification.done_at && (
              <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-green-600" />
                  <p className="text-xs text-green-700 uppercase tracking-wider font-semibold">Done Time</p>
                </div>
                <p className="font-bold text-green-900">
                  {new Date(notification.done_at + (notification.done_at?.endsWith('Z') ? '' : 'Z')).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Message */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Message</p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-gray-800">{notification.messages}</p>
            </div>
          </div>

          {/* Acknowledged Info */}
          {notification.acknowledged && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={18} className="text-green-600" />
                <p className="text-sm font-semibold text-green-900">Acknowledgement Information</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {notification.acknowledged_by && (
                  <div>
                    <p className="text-xs text-green-700 font-semibold mb-1">Acknowledged By</p>
                    <p className="text-sm text-green-900">{notification.acknowledged_by}</p>
                  </div>
                )}
                {notification.acknowledged_at && (
                  <div>
                    <p className="text-xs text-green-700 font-semibold mb-1">Acknowledged At</p>
                    <p className="text-sm text-green-900">
                      {new Date(notification.acknowledged_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* JSONB Data Display - Machine Metrics */}
          {notification.data && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Database size={20} className="text-indigo-600" />
                <h3 className="text-lg font-bold text-indigo-900">Machine Metrics at Downtime</h3>
              </div>
              
              <JsonDataDisplay 
                data={notification.data} 
                title="Performance & Status Data"
                defaultExpanded={true}
                className="bg-white"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
