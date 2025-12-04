//app/management-system/components/notifications/notification-detail.tsx
'use client';

import { X, AlertTriangle, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface Notification {
  id: string;
  type: string;
  severity: string;
  machine_id: string;
  machine_name: string;
  messages: string;
  read: boolean;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  duration?: string;
  start_at: string;
  done_at?: string;
  work_order_id?: string;
}

interface NotificationDetailProps {
  notification: Notification;
  onClose: () => void;
  onAccept: (notificationId: string) => Promise<void>;
  onReject: (notificationId: string) => Promise<void>;
}

export default function NotificationDetail({ 
  notification, 
  onClose, 
  onAccept,
  onReject 
}: NotificationDetailProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const getSeverityColor = (severity: string) => {
    const severityLower = severity.toLowerCase();
    switch(severityLower) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    const severityLower = severity.toLowerCase();
    switch(severityLower) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="text-red-600" size={32} />;
      case 'medium':
        return <AlertTriangle className="text-yellow-600" size={32} />;
      default:
        return <AlertTriangle className="text-blue-600" size={32} />;
    }
  };

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await onAccept(notification.id);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await onReject(notification.id);
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-red-600 to-red-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              {getSeverityIcon(notification.severity)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Downtime Alert</h2>
              <p className="text-red-100 text-sm">Review and take action</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Severity Badge */}
          <div className="flex items-center justify-center">
            <span className={`px-6 py-2 rounded-full text-sm font-bold uppercase border-2 ${getSeverityColor(notification.severity)}`}>
              {notification.severity} Priority
            </span>
          </div>

          {/* Machine Info */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Machine Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Machine Name</p>
                <p className="text-lg font-bold text-gray-900">{notification.machine_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Machine ID</p>
                <p className="font-medium text-gray-900">{notification.machine_id}</p>
              </div>
            </div>
          </div>

          {/* Issue Description */}
          <div className="bg-red-50 rounded-lg p-6 border border-red-200">
            <h3 className="text-sm font-semibold text-red-900 uppercase mb-3 flex items-center gap-2">
              <AlertTriangle size={16} />
              Issue Detected
            </h3>
            <p className="text-gray-900 leading-relaxed">{notification.messages}</p>
          </div>

          {/* Timestamp Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={18} className="text-blue-600" />
                <p className="text-sm font-semibold text-blue-900">Started At</p>
              </div>
              <p className="text-gray-900 font-medium">
                {new Date(notification.start_at).toLocaleString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </p>
            </div>

            {notification.acknowledged && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={18} className="text-green-600" />
                  <p className="text-sm font-semibold text-green-900">Acknowledged</p>
                </div>
                <p className="text-gray-900 text-sm">
                  By: {notification.acknowledged_by}
                  <br />
                  At: {notification.acknowledged_at ? new Date(notification.acknowledged_at).toLocaleString('id-ID') : '-'}
                </p>
              </div>
            )}
          </div>

          {/* Work Order Info */}
          {notification.work_order_id && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={18} className="text-green-600" />
                <p className="text-sm font-semibold text-green-900">Work Order Generated</p>
              </div>
              <p className="text-gray-900 font-mono text-sm">{notification.work_order_id}</p>
            </div>
          )}

          {/* Warning Info */}
          {!notification.acknowledged && (
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <p className="text-sm text-yellow-900">
                <strong>⚠️ Action Required:</strong> Review the details above and decide whether to accept or reject this notification. Accepting will automatically generate a work order and assign it to an available technician.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!notification.acknowledged && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleReject}
              disabled={isRejecting || isAccepting}
              className="flex items-center gap-2 px-6 py-3 border-2 border-red-500 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRejecting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle size={20} />
                  Reject Alert
                </>
              )}
            </button>
            
            <button
              onClick={handleAccept}
              disabled={isAccepting || isRejecting}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAccepting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Generating WO...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Accept & Generate Work Order
                </>
              )}
            </button>
          </div>
        )}

        {notification.acknowledged && (
          <div className="flex items-center justify-center p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}