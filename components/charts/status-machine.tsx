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
      <div className={`bg-white rounded-lg shadow-sm p-1.5 text-center h-full flex items-center justify-center overflow-hidden ${className}`}>
        <span className="text-[9px] text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-1.5 h-full flex flex-col overflow-hidden ${className}`}>
      <h2 className="text-[9px] font-semibold text-gray-800 mb-0.5 text-center flex-shrink-0">
        STATUS MACHINE
      </h2>

      <div
        className="flex-1 grid gap-1 overflow-auto"
        style={{ gridTemplateColumns: `repeat(auto-fit, minmax(50px, 1fr))` }}
      >
        {machines.map((machine) => (
          <div
            key={machine.id}
            className="border border-gray-200 rounded p-1 flex flex-col items-center text-center bg-gray-50"
          >
            <div className="text-[7px] text-gray-600 truncate w-full">{machine.label}</div>
            <div
              className={`${getStatusColor(machine.status)} text-white text-[7px] font-medium py-0.5 px-1 rounded w-full text-center truncate mt-0.5`}
            >
              {getStatusText(machine.status)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

