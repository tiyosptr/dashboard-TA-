'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/supabase';
import { MachineStatus } from '@/types';

interface StatusMachineProps {
  className?: string;
  minWidth?: string;
  gap?: string;
}

export default function StatusMachine({
  className = '',
  minWidth = '120px',
  gap = '12px',
}: StatusMachineProps) {
  const [machines, setMachines] = useState<MachineStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch machines (dibuat memoized supaya tidak recreate setiap render)
  const loadMachines = useCallback(async () => {
    try {
      const response = await fetch('/api/machines');
      const result = await response.json();

      if (result.success) {
        const formatted = result.data.map((m: any) => ({
          id: m.id,
          label: m.name_machine,
          line: m.name_line,
          status: m.status?.toLowerCase() || 'unknown',
        }));

        setMachines(formatted);
      }
    } catch (err) {
      console.error('Error loading machines:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + subscribe realtime
  useEffect(() => {
    loadMachines();

    const channel = supabase
      .channel('machine-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'machine',
        },
        (payload) => {
          console.log('Realtime update:', payload);

          // Refresh data mesin ketika ada perubahan
          loadMachines();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMachines]);

  // UI handling
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'maintenance':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return 'Running';
      case 'warning':
        return 'Warning';
      case 'error':
        return 'Error';
      case 'maintenance':
        return 'Maintenance';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
        Loading machine status...
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm p-3 sm:p-4 h-full flex flex-col ${className}`}>
      <h2 className="text-sm sm:text-base font-semibold text-gray-800 mb-2 sm:mb-3 text-center">
        Status Machine
      </h2>

      <div
        className="grid w-full gap-2 sm:gap-3"
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(100px, 1fr))`,
        }}
      >
        {machines.map((machine) => (
          <div
            key={machine.id}
            className="border border-gray-200 rounded-lg sm:rounded-xl p-2 sm:p-3 flex flex-col justify-between items-center text-center hover:shadow-md transition-all duration-200 bg-gray-50"
          >
            <div className="text-center mb-1.5 sm:mb-2 w-full">
              <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Machine</div>
              <div className="font-semibold text-gray-800 text-xs sm:text-sm break-words line-clamp-2">
                {machine.label}
              </div>
              <div className="text-[9px] sm:text-[10px] text-gray-500 truncate w-full">{machine.name_line}</div>
            </div>

            <div
              className={`${getStatusColor(
                machine.status
              )} text-white text-[10px] sm:text-xs font-medium py-0.5 sm:py-1 px-1.5 sm:px-2 rounded-md w-full text-center truncate`}
            >
              {getStatusText(machine.status)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
