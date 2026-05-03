import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lineId = searchParams.get('line_id');

    // 1. Fetch ALL machines
    const { data: machines, error: machineError } = await supabaseAdmin
      .from('machine')
      .select('*')
      .order('name_machine', { ascending: true });

    if (machineError) throw machineError;

    // 2. Fetch ALL processes for mapping
    const { data: processes } = await supabaseAdmin
      .from('process')
      .select('id, name, machine_id');
    
    const processMap = new Map<string, any>();
    (processes || []).forEach(p => processMap.set(p.id, p));

    // 3. Fetch ALL line_processes for mapping
    const { data: lineProcesses } = await supabaseAdmin
      .from('line_process')
      .select(`
        id, line_id, process_id, process_order,
        line:line_id (id, name)
      `);

    // machine_id -> { lineName, lineId, processName, processOrder }
    const machineLineMap = new Map<string, any>();
    (lineProcesses || []).forEach((lp: any) => {
      const proc = processMap.get(lp.process_id);
      if (proc && proc.machine_id) {
        machineLineMap.set(proc.machine_id, {
          lineName: lp.line?.name || 'Unassigned',
          lineId: lp.line?.id || null,
          processName: proc.name || 'Unknown',
          processOrder: lp.process_order || 999
        });
      }
    });

    // 4. Fetch additional stats (open logs)
    const { data: openLogs, error: logsError } = await supabaseAdmin
      .from('machine_status_log')
      .select('machine_id, status, start_time')
      .is('end_time', null)

    if (logsError) console.error('Error fetching open logs:', logsError)

    const liveDurationMap = new Map<string, { activeAdd: number, downtimeAdd: number }>()
    const nowMs = Date.now()
    if (openLogs) {
      openLogs.forEach((log: any) => {
        const startMs = new Date(log.start_time).getTime()
        if (isNaN(startMs)) return;
        const diffHours = Math.max(0, (nowMs - startMs) / (1000 * 3600))
        const machineId = log.machine_id?.toLowerCase()
        if (!machineId) return

        if (!liveDurationMap.has(machineId)) {
          liveDurationMap.set(machineId, { activeAdd: 0, downtimeAdd: 0 })
        }
        const stats = liveDurationMap.get(machineId)!
        const s = log.status?.toLowerCase().trim() || ''
        if (s === 'active' || s === 'running') stats.activeAdd += diffHours
        else if (['downtime', 'down', 'error'].includes(s)) stats.downtimeAdd += diffHours
      })
    }

    // 5. Final Assembly
    const mappedMachines = (machines || []).map((machine: any) => {
      const mId = machine.id?.toLowerCase()
      const lineInfo = machineLineMap.get(machine.id)
      const liveStats = liveDurationMap.get(mId) || { activeAdd: 0, downtimeAdd: 0 }
      const currentRunning = parseFloat(machine.total_running_hours || '0')
      const currentDowntime = parseFloat(machine.total_downtime_hours || '0')
      
      return {
        id: machine.id,
        name_machine: machine.name_machine,
        status: machine.status,
        last_maintenance: machine.last_maintenance,
        next_maintenance: machine.next_maintenance,
        total_running_hours: (currentRunning + liveStats.activeAdd).toFixed(4),
        total_downtime_hours: (currentDowntime + liveStats.downtimeAdd).toFixed(4),
        line_name: lineInfo?.lineName || 'Unassigned',
        line_id: lineInfo?.lineId || null,
        process_order: lineInfo?.processOrder || 999,
        process_name: lineInfo?.processName || 'Unknown',
      };
    });

    // 5. Filter by lineId if provided
    let finalData = mappedMachines;
    if (lineId && lineId !== 'all') {
      finalData = finalData.filter(m => m.line_id === lineId);
    }

    // Sort by line name, then process order
    const sortedMachines = finalData.sort((a, b) => {
      const lineCompare = (a.line_name || '').localeCompare(b.line_name || '');
      if (lineCompare !== 0) return lineCompare;
      return (a.process_order || 0) - (b.process_order || 0);
    });

    return NextResponse.json({ success: true, data: sortedMachines });
  } catch (error: any) {
    console.error('Error fetching scheduled maintenance data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
