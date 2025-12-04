'use client';

import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface Machine {
  id: string;
  name_machine: string;
}

export default function NotifPage() {
  const router = useRouter();
  const [isTriggering, setIsTriggering] = useState(false);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  // Load machines from Supabase
  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = async () => {
    try {
      const response = await fetch('/api/machines');
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        setMachines(result.data);
        setSelectedMachine(result.data[0]); // Select first machine by default
      } else {
        // Fallback to mock data if no machines in DB
        const mockMachines = [
          { id: crypto.randomUUID(), name_machine: 'Extruder #5' },
          { id: crypto.randomUUID(), name_machine: 'Injection Molding #3' },
          { id: crypto.randomUUID(), name_machine: 'Welding Machine #2' },
          { id: crypto.randomUUID(), name_machine: 'Conveyor Belt #1' },
        ];
        setMachines(mockMachines);
        setSelectedMachine(mockMachines[0]);
      }
    } catch (error) {
      console.error('Error loading machines:', error);
      // Use mock data on error
      const mockMachines = [
        { id: crypto.randomUUID(), name_machine: 'Extruder #5' },
        { id: crypto.randomUUID(), name_machine: 'Injection Molding #3' },
        { id: crypto.randomUUID(), name_machine: 'Welding Machine #2' },
        { id: crypto.randomUUID(), name_machine: 'Conveyor Belt #1' },
      ];
      setMachines(mockMachines);
      setSelectedMachine(mockMachines[0]);
    }
  };

  const triggerDowntime = async () => {
    if (!selectedMachine) {
      alert('Please select a machine first');
      return;
    }

    setIsTriggering(true);

    try {
      // Data downtime baru
      const reasons = [
        'Overheating detected - immediate attention required',
        'Mechanical failure - component breakdown',
        'Power supply issue - electrical fault',
        'Sensor malfunction - calibration needed',
        'Hydraulic pressure drop detected',
        'Abnormal vibration levels',
      ];

      const severities = ['critical', 'high', 'medium'];

      const newDowntime = {
        machineId: selectedMachine.id, // Using actual UUID
        machineName: selectedMachine.name_machine,
        reason: reasons[Math.floor(Math.random() * reasons.length)],
        severity: severities[Math.floor(Math.random() * severities.length)],
      };

      // Create notification via API
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDowntime),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create notification');
      }

      // Success
      alert(
        `✅ Downtime notification created!\n\nMachine: ${newDowntime.machineName}\nReason: ${newDowntime.reason}\nSeverity: ${newDowntime.severity.toUpperCase()}\n\nCheck Notifications page for details.`
      );

      // Redirect ke notifications page
      router.push('/notifications');
    } catch (error: any) {
      console.error('Failed to trigger downtime:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-8">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg border border-gray-700"
      >
        <ArrowLeft size={20} />
        <span className="font-medium">Back to Dashboard</span>
      </button>

      {/* Main Content */}
      <div className="text-center max-w-md w-full">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-red-600 rounded-full mb-8 shadow-2xl">
          <AlertTriangle size={48} className="text-white" />
        </div>

        <h1 className="text-4xl font-bold text-white mb-4">Trigger Downtime</h1>
        <p className="text-gray-400 mb-8 text-lg">
          Select a machine and trigger a downtime alert. Notification will be saved to database with realtime updates.
        </p>

        {/* Machine Selection */}
        <div className="mb-6">
          <label className="block text-left text-sm font-medium text-gray-300 mb-2">
            Select Machine
          </label>
          <select
            value={selectedMachine?.id || ''}
            onChange={(e) => {
              const machine = machines.find((m) => m.id === e.target.value);
              setSelectedMachine(machine || null);
            }}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {machines.map((machine) => (
              <option key={machine.id} value={machine.id}>
                {machine.name_machine}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={triggerDowntime}
          disabled={isTriggering || !selectedMachine}
          className="w-full px-8 py-5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl shadow-2xl transition-all transform hover:scale-105 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isTriggering ? (
            <>
              <Loader2 size={28} className="animate-spin" />
              <span className="text-xl">Creating Notification...</span>
            </>
          ) : (
            <>
              <AlertTriangle size={28} />
              <span className="text-xl">Trigger Downtime Alert</span>
            </>
          )}
        </button>

        <div className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-sm text-gray-400">
            💡 <strong className="text-white">Info:</strong> Notification will be stored in Supabase database with realtime updates enabled
          </p>
        </div>
      </div>
    </div>
  );
}