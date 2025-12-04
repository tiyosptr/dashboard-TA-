'use client';

import { Bell, Settings, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/supabase';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  // Load unread count
  const loadUnreadCount = async () => {
    try {
      const { count, error } = await supabase
        .from('notification')
        .select('*', { count: 'exact', head: true })
        .eq('read', 'false');

      if (!error && count !== null) {
        setUnreadCount(count);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  useEffect(() => {
    loadUnreadCount();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('notifications-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification',
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Manufacturing Dashboard</h1>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button
              onClick={() => router.push('/notifications')}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell size={20} className="text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex items-center justify-center rounded-full h-5 w-5 bg-red-500 text-white text-xs font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </span>
              )}
            </button>

            {/* Settings */}
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings size={20} className="text-gray-600" />
            </button>

            {/* User */}
            <button className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User size={18} className="text-white" />
              </div>
              <span className="hidden sm:block font-medium text-gray-700">Admin</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}