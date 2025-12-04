'use client';

import { memo } from 'react';

interface HeaderProps {
  onManagementClick?: () => void;
}

function Header({ onManagementClick }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 flex-none" style={{ height: '40px' }}>
      <div className="h-full w-full px-2 flex items-center justify-between">
        {/* Left - Title */}
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Dashboard Monitoring</h1>
        </div>

        {/* Right - Button */}
        <button
          onClick={onManagementClick}
          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
        >
          Management
        </button>
      </div>
    </header>
  );
}

export default memo(Header);