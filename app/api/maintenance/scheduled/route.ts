import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lineId = searchParams.get('line_id');

    // Fetch machines that are actually assigned to a line via line_process → process → machine
    // Using an inner join approach: only machines with a valid line_process entry are returned.
    const { data: lineProcesses, error: lpError } = await supabaseAdmin
      .from('line_process')
      .select(`
        id,
        process_order,
        line_id,
        line:line_id (
          id,
          name
        ),
        process:process_id (
          id,
          name,
          machine_id,
          machine:machine_id (
            id,
            name_machine,
            status,
            last_maintenance,
            next_maintenance,
            total_running_hours,
            total_downtime_hours
          )
        )
      `)
      .order('process_order', { ascending: true });

    if (lpError) throw lpError;

    // Fetch open logs for live duration calculation
    const { data: openLogs } = await supabaseAdmin
      .from('machine_status_log')
      .select('machine_id, status, start_time')
      .is('end_time', null);

    const liveDurationMap = new Map<string, { activeAdd: number; downtimeAdd: number }>();
    const nowMs = Date.now();
    (openLogs || []).forEach((log: any) => {
      const startMs = new Date(log.start_time).getTime();
      if (isNaN(startMs)) return;
      const diffHours = Math.max(0, (nowMs - startMs) / (1000 * 3600));
      const mId = log.machine_id;
      if (!mId) return;
      if (!liveDurationMap.has(mId)) {
        liveDurationMap.set(mId, { activeAdd: 0, downtimeAdd: 0 });
      }
      const stats = liveDurationMap.get(mId)!;
      const s = log.status?.toLowerCase().trim() || '';
      if (s === 'active' || s === 'running') stats.activeAdd += diffHours;
      else if (['downtime', 'down', 'error'].includes(s)) stats.downtimeAdd += diffHours;
    });

    // Build result — one entry per line_process that has a machine assigned
    const seen = new Set<string>(); // deduplicate by machine_id
    const mappedMachines: any[] = [];

    for (const lp of (lineProcesses || []) as any[]) {
      const proc = lp.process;
      const machine = proc?.machine;
      if (!machine) continue; // skip processes with no machine assigned

      // Deduplicate: if same machine appears in multiple line_processes, take first
      if (seen.has(machine.id)) continue;
      seen.add(machine.id);

      const liveStats = liveDurationMap.get(machine.id) || { activeAdd: 0, downtimeAdd: 0 };
      const currentRunning = parseFloat(machine.total_running_hours || '0');
      const currentDowntime = parseFloat(machine.total_downtime_hours || '0');

      mappedMachines.push({
        id: machine.id,
        name_machine: machine.name_machine,
        status: machine.status,
        last_maintenance: machine.last_maintenance,
        next_maintenance: machine.next_maintenance,
        total_running_hours: (currentRunning + liveStats.activeAdd).toFixed(4),
        total_downtime_hours: (currentDowntime + liveStats.downtimeAdd).toFixed(4),
        line_name: lp.line?.name || null,
        line_id: lp.line?.id || null,
        process_name: proc?.name || 'Unknown',
        process_order: lp.process_order || 999,
      });
    }

    // Filter by lineId if provided
    let finalData = mappedMachines;
    if (lineId && lineId !== 'all') {
      finalData = finalData.filter((m: any) => m.line_id === lineId);
    }

    // Sort: by line name, then process order
    finalData.sort((a: any, b: any) => {
      const lineCompare = (a.line_name || '').localeCompare(b.line_name || '');
      if (lineCompare !== 0) return lineCompare;
      return (a.process_order || 0) - (b.process_order || 0);
    });

    return NextResponse.json({ success: true, data: finalData });
  } catch (error: any) {
    console.error('Error fetching scheduled maintenance data:', error);
    return NextResponse.json(
      { success: false, error: error.message, details: String(error), hint: '', code: '' },
      { status: 500 }
    );
  }
}
