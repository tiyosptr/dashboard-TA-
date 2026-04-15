'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  headerTags?: React.ReactNode;
  headerGradient?: string;
  tabs?: { id: string; label: React.ReactNode }[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string;
}

export default function BaseModal({
  isOpen,
  onClose,
  title,
  subtitle,
  headerTags,
  headerGradient = 'bg-gradient-to-r from-blue-700 via-indigo-800 to-purple-900',
  tabs,
  activeTab,
  onTabChange,
  children,
  footer,
  maxWidthClass = 'max-w-5xl'
}: BaseModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidthClass} max-h-[90vh] overflow-hidden flex flex-col relative animate-fade-in-up`}>
        
        {/* Header Banner */}
        <div className={`h-40 ${headerGradient} rounded-t-2xl flex flex-col justify-between p-6 pb-4 relative overflow-hidden flex-shrink-0`}>
          {/* Background Decorative Rings */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full border-[16px] border-white/5 opacity-50"></div>
          <div className="absolute bottom-0 right-20 -mb-10 w-32 h-32 rounded-full border-[8px] border-white/10 opacity-50"></div>

          <div className="flex justify-between items-start relative z-10">
            <div className="flex flex-col gap-1">
              <h2 className="text-3xl font-extrabold text-white flex items-center gap-3">
                {title}
              </h2>
              {subtitle && (
                <p className="text-indigo-100 font-medium opacity-90 flex items-center gap-1.5">
                  {subtitle}
                </p>
              )}
            </div>
            
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all"
            >
              <X size={24} />
            </button>
          </div>

          {headerTags && (
            <div className="flex items-center gap-3 relative z-10">
              {headerTags}
            </div>
          )}
        </div>

        {/* Tabs */}
        {tabs && tabs.length > 0 && onTabChange && (
          <div className="flex border-b border-gray-100 bg-white px-6 shadow-sm sticky top-0 z-10 flex-shrink-0 hide-scrollbar overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-6 py-4 font-semibold text-sm transition-all relative whitespace-nowrap ${
                    activeTab === tab.id
                    ? 'text-indigo-600'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
              >
                {tab.label}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></div>}
              </button>
            ))}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
