'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Bell, X, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase/supabase';
import { mutate } from 'swr';

interface ToastNotif {
  id: string;
  dbId: string;
  machineName: string;
  message: string;
  severity: string;
  type: string;
  createdAt: number;
}

interface RealtimeNotifToastProps {
  onViewNotifications?: () => void;
}

const SEVERITY_CONFIG = {
  critical: {
    bg: 'bg-red-600',
    border: 'border-red-700',
    text: 'text-white',
    sub: 'text-red-100',
    bar: 'bg-red-300',
    badge: 'bg-red-800 text-red-100',
    icon: <AlertTriangle size={18} className="text-white" />,
  },
  high: {
    bg: 'bg-orange-500',
    border: 'border-orange-600',
    text: 'text-white',
    sub: 'text-orange-100',
    bar: 'bg-orange-200',
    badge: 'bg-orange-700 text-orange-100',
    icon: <AlertTriangle size={18} className="text-white" />,
  },
  medium: {
    bg: 'bg-amber-500',
    border: 'border-amber-600',
    text: 'text-white',
    sub: 'text-amber-100',
    bar: 'bg-amber-200',
    badge: 'bg-amber-700 text-amber-100',
    icon: <Bell size={18} className="text-white" />,
  },
  low: {
    bg: 'bg-blue-600',
    border: 'border-blue-700',
    text: 'text-white',
    sub: 'text-blue-100',
    bar: 'bg-blue-300',
    badge: 'bg-blue-800 text-blue-100',
    icon: <Bell size={18} className="text-white" />,
  },
  default: {
    bg: 'bg-slate-700',
    border: 'border-slate-800',
    text: 'text-white',
    sub: 'text-slate-300',
    bar: 'bg-slate-400',
    badge: 'bg-slate-800 text-slate-200',
    icon: <Bell size={18} className="text-white" />,
  },
};

const AUTO_DISMISS_MS = 7000;
const MAX_TOASTS = 3;

function ToastItem({
  toast,
  onDismiss,
  onView,
}: {
  toast: ToastNotif;
  onDismiss: (id: string) => void;
  onView: () => void;
}) {
  const [progress, setProgress] = useState(100);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Slide in
    const t = setTimeout(() => setVisible(true), 20);

    // Progress bar countdown
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(intervalRef.current!);
        dismiss();
      }
    }, 50);

    return () => {
      clearTimeout(t);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 350);
  };

  let cfg = SEVERITY_CONFIG[toast.severity?.toLowerCase() as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.default;

  // Paksa warna MERAH untuk semua notifikasi tipe downtime
  if (toast.type?.toLowerCase() === 'downtime') {
    cfg = SEVERITY_CONFIG.critical;
  }

  return (
    <div
      className={`
        w-80 rounded-2xl shadow-2xl border overflow-hidden
        transition-all duration-350 ease-out
        ${cfg.bg} ${cfg.border}
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      style={{ transform: visible ? 'translateX(0)' : 'translateX(110%)' }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        {/* Icon */}
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
          {cfg.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.badge}`}>
              {toast.severity?.toUpperCase() || 'ALERT'}
            </span>
            {toast.type && (
              <span className="text-[10px] text-white/70 font-semibold capitalize">{toast.type}</span>
            )}
          </div>
          <p className={`text-sm font-black truncate ${cfg.text}`}>{toast.machineName}</p>
          <p className={`text-xs mt-0.5 line-clamp-2 ${cfg.sub}`}>{toast.message}</p>
        </div>

        {/* Close */}
        <button
          onClick={dismiss}
          className="flex-shrink-0 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
        >
          <X size={13} className="text-white" />
        </button>
      </div>

      {/* View button */}
      <div className="px-4 pb-3">
        <button
          onClick={() => {
            onView();
            dismiss();
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white transition-colors"
        >
          <ExternalLink size={11} />
          View Notifications
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/20">
        <div
          className={`h-full ${cfg.bar} transition-all ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default function RealtimeNotifToast({ onViewNotifications }: RealtimeNotifToastProps) {
  const [toasts, setToasts] = useState<ToastNotif[]>([]);
  // Track IDs we've already shown to avoid duplicates on reconnect
  const shownIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Pre-fill shownIds with existing unread notifications so they don't pop up on load
  useEffect(() => {
    fetch('/api/notifications?filter=unread')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          json.data.forEach((n: any) => shownIds.current.add(n.id));
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-notif-toast')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notification' },
        (payload) => {
          // Skip duplicates and skip on first load (only show truly new ones)
          if (isFirstLoad.current) return;
          
          const row = payload.new as any;
          if (!row?.id || shownIds.current.has(row.id)) return;
          shownIds.current.add(row.id);

          // Force SWR to refresh so the badge count in the header updates instantly
          mutate('/api/notifications?filter=all');

          const newToast: ToastNotif = {
            id: `${row.id}-${Date.now()}`,
            dbId: row.id,
            machineName: row.machine_name || 'Unknown Machine',
            message: row.messages || 'New notification received',
            severity: row.severity || 'low',
            type: row.type || '',
            createdAt: Date.now(),
          };

          setToasts((prev) => {
            const next = [newToast, ...prev];
            // Keep max MAX_TOASTS
            return next.slice(0, MAX_TOASTS);
          });
        }
      )
      .subscribe();

    // After subscription is ready, allow toasts
    setTimeout(() => { isFirstLoad.current = false; }, 1500);

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 items-end pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem
            toast={toast}
            onDismiss={dismiss}
            onView={() => onViewNotifications?.()}
          />
        </div>
      ))}
    </div>
  );
}
