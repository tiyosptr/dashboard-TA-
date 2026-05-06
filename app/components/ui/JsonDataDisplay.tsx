'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Database, FileJson, Clock, Activity, Wrench, TrendingUp, CheckCircle } from 'lucide-react';

interface JsonDataDisplayProps {
  data: any;
  title?: string;
  className?: string;
  defaultExpanded?: boolean;
}

export default function JsonDataDisplay({ 
  data, 
  title = "Additional Data", 
  className = "",
  defaultExpanded = false 
}: JsonDataDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // If data is null, undefined, or empty object, don't render anything
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return null;
  }

  // Parse data if it's a string
  let parsedData = data;
  if (typeof data === 'string') {
    try {
      parsedData = JSON.parse(data);
    } catch (e) {
      parsedData = data;
    }
  }

  // Filter out any keys that contain 'id' (case insensitive)
  const filterIds = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => filterIds(item));
    }
    
    const filtered: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip keys that contain 'id' (case insensitive) or are exactly 'id'
      if (key.toLowerCase().includes('_id') || key.toLowerCase() === 'id') {
        continue;
      }
      filtered[key] = typeof value === 'object' ? filterIds(value) : value;
    }
    return filtered;
  };

  const cleanData = filterIds(parsedData);

  // Format label to be more readable
  const formatLabel = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  // Format value based on type
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toLocaleString('id-ID');
    
    // Check if it's a date string
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/) && !isNaN(Date.parse(value))) {
      return new Date(value).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    
    return String(value);
  };

  // Get icon for section
  const getSectionIcon = (key: string) => {
    const keyLower = key.toLowerCase();
    if (keyLower.includes('runtime') || keyLower.includes('stats')) return <Activity size={16} className="text-blue-600" />;
    if (keyLower.includes('maintenance')) return <Wrench size={16} className="text-orange-600" />;
    if (keyLower.includes('performance') || keyLower.includes('quality')) return <TrendingUp size={16} className="text-green-600" />;
    if (keyLower.includes('event') || keyLower.includes('current')) return <Clock size={16} className="text-purple-600" />;
    return <CheckCircle size={16} className="text-gray-600" />;
  };

  // Render grouped sections
  const renderSection = (sectionKey: string, sectionData: any) => {
    if (typeof sectionData !== 'object' || sectionData === null) {
      return (
        <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-semibold text-gray-700">{formatLabel(sectionKey)}</span>
          <span className="text-sm text-gray-900 font-medium">{formatValue(sectionData)}</span>
        </div>
      );
    }

    return (
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {getSectionIcon(sectionKey)}
            <h4 className="font-bold text-gray-900 text-sm">{formatLabel(sectionKey)}</h4>
          </div>
        </div>
        <div className="p-4 space-y-2">
          {Object.entries(sectionData).map(([key, value]) => (
            <div key={key}>
              {typeof value === 'object' && value !== null && !Array.isArray(value) ? (
                // Nested object
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      {formatLabel(key)}
                    </span>
                  </div>
                  <div className="p-3 space-y-1.5 bg-white">
                    {Object.entries(value).map(([nestedKey, nestedValue]) => (
                      <div key={nestedKey} className="flex items-center justify-between py-1">
                        <span className="text-xs text-gray-600">{formatLabel(nestedKey)}</span>
                        <span className={`text-xs font-semibold ${
                          typeof nestedValue === 'number' ? 'text-blue-600' :
                          typeof nestedValue === 'boolean' ? (nestedValue ? 'text-green-600' : 'text-red-600') :
                          'text-gray-900'
                        }`}>
                          {formatValue(nestedValue)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Simple key-value
                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="text-sm text-gray-600">{formatLabel(key)}</span>
                  <span className={`text-sm font-semibold ${
                    typeof value === 'number' ? 'text-blue-600' :
                    typeof value === 'boolean' ? (value ? 'text-green-600' : 'text-red-600') :
                    'text-gray-900'
                  }`}>
                    {formatValue(value)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <FileJson size={20} className="text-white" />
          </div>
          <div className="text-left">
            <span className="font-bold text-gray-900 text-base block">{title}</span>
            <span className="text-xs text-gray-500">
              {typeof cleanData === 'object' && !Array.isArray(cleanData)
                ? `${Object.keys(cleanData).length} sections`
                : 'View data'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
            {isExpanded ? 'Hide' : 'Show'}
          </span>
          {isExpanded ? (
            <ChevronDown size={20} className="text-gray-400" />
          ) : (
            <ChevronRight size={20} className="text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200 bg-gradient-to-b from-gray-50 to-white">
          <div className="mt-4 space-y-3">
            {typeof cleanData === 'object' && !Array.isArray(cleanData) ? (
              Object.entries(cleanData).map(([key, value]) => (
                <div key={key}>
                  {renderSection(key, value)}
                </div>
              ))
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(cleanData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
