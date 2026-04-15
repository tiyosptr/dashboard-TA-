'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/supabase';
import { Notification } from '@/types';

export default function DowntimeAlert({ selectedLineId }: { selectedLineId?: string | null }) {
  const [alerts, setAlerts] = useState<Notification[]>([]);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const url = selectedLineId
          ? `/api/notifications?filter=all&lineId=${selectedLineId}`
          : '/api/notifications?filter=all';

        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
          // Filter: Only show downtime notifications that are not yet done (work order not completed)
          const activeAlerts = result.data
            .filter((n: Notification) =>
              (!n.done_at || n.done_at === '' || n.done_at === null) &&
              n.type?.toLowerCase() === 'downtime'
            )
            .slice(0, 3);

          setAlerts(activeAlerts);
        }
      } catch (error) {
        console.error('Error loading alerts:', error);
      }
    };

    loadAlerts();

    // Subscribe to Supabase Realtime
    const channel = supabase
      .channel('downtime-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification'
        },
        () => {
          loadAlerts();
        }
      )
      .subscribe();

    // Refresh every 5 seconds to ensure accuracy in case realtime misses an event
    const interval = setInterval(loadAlerts, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [selectedLineId]);

  const handleDismiss = async (alertId: string) => {
    // Optimistic UI update
    setAlerts(prev => prev.filter(a => a.id !== alertId));

    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: alertId,
          read: true,
          acknowledged: true, // Acknowledge it so it doesn't show up again here
        }),
      });
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
      // Revert if failed (optional, but let's keep it simple)
      setAlerts([]); // simplistic way or reload
    }
  };

  if (alerts.length === 0) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="absolute inset-0 bg-red-600 animate-pulse-fast opacity-20" />

        <div className="relative z-10 w-full max-w-2xl mx-4 pointer-events-auto">
          {alerts.map((alert) => (
            <div key={alert.id} className="relative mb-4 animate-scale-in">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-red-600 to-red-500 rounded-2xl animate-border-glow blur-md" />
              <div className="relative bg-gray-900 border-4 border-red-600 rounded-2xl shadow-2xl overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-scanning" />

                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                        <div className="relative bg-red-600 p-4 rounded-full animate-pulse">
                          <AlertTriangle className="text-white" size={32} strokeWidth={3} />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-2xl font-bold text-white mb-1 animate-pulse">
                            ⚠️ MACHINE DOWNTIME DETECTED
                          </h3>
                          <div className="flex items-center gap-3 text-red-400">
                            <span className="text-sm font-mono">{alert.machine_id}</span>
                            <span className="text-sm">•</span>
                            <span className="text-sm">
                              {new Date(alert.start_at + (alert.start_at?.endsWith('Z') ? '' : 'Z')).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                            <span className="text-sm">•</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${alert.severity?.toLowerCase() === 'critical' ? 'bg-red-500 text-white' :
                              alert.severity?.toLowerCase() === 'high' ? 'bg-amber-500 text-white' :
                                'bg-yellow-500 text-white'
                              }`}>
                              {alert.severity || 'HIGH'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDismiss(alert.id)}
                          className="p-2 hover:bg-red-900 rounded-lg transition-colors"
                          aria-label="Dismiss alert"
                        >
                          <X className="text-white" size={24} />
                        </button>
                      </div>

                      <div className="bg-red-950 border border-red-800 rounded-xl p-4 mb-3">
                        <p className="text-sm text-red-300 mb-1">Machine Name:</p>
                        <p className="text-xl font-bold text-white">{alert.machine_name}</p>
                        {alert.messages && (
                          <div className="mt-3 pt-3 border-t border-red-800/50">
                            <p className="text-sm text-red-300 mb-1">Description/Reason:</p>
                            <p className="text-base text-red-100">{alert.messages}</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-yellow-400 animate-pulse">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
                          <span className="text-sm font-medium">
                            Production Stopped - Immediate Action Required
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-red-400">
                          <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                          <span className="text-sm font-medium">Please acknowledge to stop the alarm</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-2 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-scanning-reverse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse-fast {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes border-glow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes scanning {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes scanning-reverse {
          0% { transform: translateX(200%); }
          100% { transform: translateX(-100%); }
        }

        .animate-pulse-fast { animation: pulse-fast 1s cubic-bezier(0.4,0,0.6,1) infinite; }
        .animate-scale-in { animation: scale-in 0.3s ease-out; }
        .animate-border-glow { animation: border-glow 2s ease-in-out infinite; }
        .animate-scanning { animation: scanning 2s linear infinite; }
        .animate-scanning-reverse { animation: scanning-reverse 2s linear infinite; }
      `}</style>
    </>
  );
}