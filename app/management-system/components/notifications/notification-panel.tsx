'use client';

import { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  X, 
  Check, 
  ArrowLeft,
  Loader2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/supabase';
import { Notification } from '@/types';

export default function NotificationsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);

  // Load notifications
  const loadNotifications = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);

    try {
      const response = await fetch('/api/notifications?filter=all');
      const result = await response.json();

      if (result.success) {
        setNotifications(result.data);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification',
        },
        (payload) => {
          console.log('Notification change detected:', payload);
          loadNotifications(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadNotifications(false);
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'critical') return notif.severity.toLowerCase() === 'critical';
    return true;
  });

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read' }),
      });
      loadNotifications(false);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAsAcknowledged = async (id: string) => {
    try {
      const notification = notifications.find((n) => n.id === id);

      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledge',
          acknowledgedBy: 'System Admin',
        }),
      });

      loadNotifications(false);

      // Show confirmation
      if (notification) {
        alert(`✅ Notification acknowledged for ${notification.machine_name}`);
      }
    } catch (error) {
      console.error('Error acknowledging:', error);
      alert('❌ Failed to acknowledge notification');
    }
  };

  const generateWorkOrder = async (id: string) => {
    try {
      const response = await fetch('/api/work-orders/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate work order');
      }

      alert(
        `✅ Work Order Generated!\n\nID: ${result.data.id}\nAssigned to: ${result.data.assigned_to}\n\nYou can view it by clicking "View Work Order" button.`
      );

      loadNotifications(false);
    } catch (error: any) {
      console.error('Error generating work order:', error);
      alert(`❌ Error: ${error.message}`);
    }
  };

  const viewWorkOrder = (workOrderId: string) => {
    // Navigate to work orders tab with the specific work order
    router.push(`/management-system?tab=work-orders&woId=${workOrderId}`);
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.read);
      
      await Promise.all(
        unreadNotifications.map((n) =>
          fetch(`/api/notifications/${n.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'mark_read' }),
          })
        )
      );

      loadNotifications(false);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    try {
      const { error } = await supabase.from('notification').delete().eq('id', id);

      if (error) throw error;

      loadNotifications(false);
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('❌ Failed to delete notification');
    }
  };

  const getSeverityColor = (severity: string) => {
    const severityLower = severity.toLowerCase();
    switch (severityLower) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-500';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-500';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-500';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-500';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-500';
    }
  };

  const getTypeIcon = (type: string, severity: string) => {
    const severityLower = severity.toLowerCase();
    if (type === 'Downtime' || severityLower === 'critical') {
      return <AlertTriangle size={20} className="text-red-600" />;
    }
    switch (type) {
      case 'Anomaly':
        return <AlertTriangle size={20} />;
      case 'Alert':
        return <Bell size={20} />;
      case 'Warning':
        return <AlertTriangle size={20} />;
      case 'Info':
        return <Info size={20} />;
      default:
        return <Bell size={20} />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const criticalCount = notifications.filter(
    (n) => n.severity.toLowerCase() === 'critical' && !n.acknowledged
  ).length;
  const downtimeCount = notifications.filter(
    (n) => n.type === 'Downtime' && !n.acknowledged
  ).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Back to Dashboard</span>
            </button>
            <h2 className="text-3xl font-bold text-gray-900">Notifications</h2>
            <p className="text-sm text-gray-500">Real-time alerts and system notifications</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Mark All as Read
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Notifications</span>
              <Bell className="text-blue-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{notifications.length}</p>
          </div>

          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-orange-700">Unread</span>
              <Bell className="text-orange-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-orange-900">{unreadCount}</p>
          </div>

          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-red-700">Critical</span>
              <AlertTriangle className="text-red-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-red-900">{criticalCount}</p>
          </div>

          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-700">Downtime</span>
              <AlertTriangle className="text-purple-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-purple-900">{downtimeCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'critical'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Critical ({criticalCount})
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
              <CheckCircle className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-500 text-lg">No notifications to display</p>
              <p className="text-gray-400 text-sm mt-2">All caught up!</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-xl border-l-4 p-5 shadow-sm transition-all ${
                  notification.work_order_id 
                    ? 'border-green-500 ring-2 ring-green-200' 
                    : getSeverityColor(notification.severity)
                } ${!notification.read ? 'border-l-4' : 'border-l-4 opacity-75'} ${
                  notification.type === 'Downtime' && !notification.work_order_id ? 'ring-2 ring-red-500 ring-opacity-50' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`p-3 rounded-lg ${
                      notification.work_order_id 
                        ? 'bg-green-100' 
                        : notification.type === 'Downtime' || notification.severity.toLowerCase() === 'critical'
                        ? 'bg-red-100 animate-pulse'
                        : notification.severity.toLowerCase() === 'high'
                        ? 'bg-orange-100'
                        : notification.severity.toLowerCase() === 'medium'
                        ? 'bg-yellow-100'
                        : 'bg-blue-100'
                    }`}
                  >
                    {notification.work_order_id ? (
                      <CheckCircle size={20} className="text-green-600" />
                    ) : (
                      getTypeIcon(notification.type, notification.severity)
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-gray-900 text-lg">
                            {notification.machine_name}
                          </h3>
                          <span className="text-xs text-gray-500">
                            ({notification.machine_id?.substring(0, 8)}...)
                          </span>
                          {!notification.read && (
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                              NEW
                            </span>
                          )}
                          {notification.type === 'Downtime' && !notification.work_order_id && (
                            <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-semibold rounded-full animate-pulse">
                              DOWNTIME
                            </span>
                          )}
                          {notification.work_order_id && (
                            <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-semibold rounded-full">
                              WO GENERATED
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{notification.messages}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap mb-3">
                      <span
                        className={`font-semibold ${
                          notification.type === 'Downtime' ? 'text-red-600' : ''
                        }`}
                      >
                        {notification.type}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(notification.start_at).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {notification.acknowledged && (
                        <>
                          <span>•</span>
                          <span className="text-green-600 font-semibold flex items-center gap-1">
                            <CheckCircle size={14} />
                            Acknowledged
                          </span>
                        </>
                      )}
                      {notification.work_order_id && (
                        <>
                          <span>•</span>
                          <span className="text-green-600 font-semibold">
                            WO: {notification.work_order_id}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {!notification.work_order_id && !notification.acknowledged && (
                        <>
                          <button
                            onClick={() => generateWorkOrder(notification.id)}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                          >
                            <Check size={16} />
                            Generate Work Order
                          </button>
                          <button
                            onClick={() => markAsAcknowledged(notification.id)}
                            className="px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors font-medium flex items-center gap-2"
                          >
                            <Check size={16} />
                            Acknowledge Only
                          </button>
                        </>
                      )}
                      
                      {notification.work_order_id && (
                        <button
                          onClick={() => viewWorkOrder(notification.work_order_id!)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                        >
                          <ExternalLink size={16} />
                          View Work Order
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-col gap-2">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <CheckCircle size={20} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}