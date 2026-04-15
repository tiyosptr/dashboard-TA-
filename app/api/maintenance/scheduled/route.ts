import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Fetch machines with their latest status logs and line relations
    const machines = await prisma.machine.findMany({
      include: {
        statusLogs: {
          orderBy: { startTime: 'desc' },
          take: 1
        },
        processes: {
          include: {
            lineProcesses: {
              include: {
                line: true
              }
            }
          }
        }
      }
    });

    const mappedMachines = machines.map(machine => {
      const lastMaintenance = machine.lastMaintenance ? new Date(machine.lastMaintenance) : null;
      const nextMaintenance = machine.nextMaintenance ? new Date(machine.nextMaintenance) : null;
      
      // Basic logic to determine if the machine is "running" from the latest log
      const latestLog = machine.statusLogs[0];
      const isRunning = latestLog?.status === 'active' && !latestLog.endTime;

      // Find first associated line info and process order
      let lineName = 'N/A';
      let lineId = null;
      let processOrder = 999;
      let processName = 'Unknown';
      
      const firstProcess = machine.processes?.[0];
      if (firstProcess) {
        processName = firstProcess.name || 'Unknown';
        const firstLineProc = firstProcess.lineProcesses?.[0];
        if (firstLineProc) {
          processOrder = firstLineProc.processOrder || 999;
          if (firstLineProc.line) {
            lineName = firstLineProc.line.name || 'N/A';
            lineId = firstLineProc.line.id;
          }
        }
      }

      return {
        id: machine.id,
        name_machine: machine.nameMachine,
        status: machine.status,
        last_maintenance: lastMaintenance,
        next_maintenance: nextMaintenance,
        is_running: isRunning,
        total_running_hours: machine.totalRunningHours,
        line_name: lineName,
        line_id: lineId,
        process_order: processOrder,
        process_name: processName
      };
    });

    // We keep the urgency sort as the default on the server, 
    // but the frontend can decide to sort by process.
    // However, to satisfy the user request clearly, we can prioritize:
    // 1. Line 
    // 2. Process Order
    const sortedMachines = mappedMachines.sort((a, b) => {
      // Sort by line name first to group them
      const lineCompare = (a.line_name || '').localeCompare(b.line_name || '');
      if (lineCompare !== 0) return lineCompare;
      
      // Then by process order
      return (a.process_order || 0) - (b.process_order || 0);
    });

    return NextResponse.json({ success: true, data: sortedMachines });
  } catch (error: any) {
    console.error('Error fetching scheduled maintenance data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
