'use client';

import { memo } from 'react';

interface HeaderProps {
  onManagementClick?: () => void;
}

function Header({ onManagementClick }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 flex-none">
      <div className="max-w-[1600px] mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left - Title */}
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">
              Dashboard Monitoring
            </h1>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>
                Work Order: <span className="font-medium text-gray-700">123456</span>
              </span>
              <span>
                PN: <span className="font-medium text-gray-700">PN-2024-001</span>
              </span>
              <span>
                Throughput: <span className="font-medium text-gray-700">120/jam</span>
              </span>
            </div>
          </div>

          {/* Right - Button */}
          <button
            onClick={onManagementClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Management System
          </button>
        </div>
      </div>
    </header>
  );
}

export default memo(Header);