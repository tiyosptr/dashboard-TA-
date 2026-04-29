import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Fetch all machines with their process and line info via joins
    // machine -> process (machine_id) -> line_process (process_id) -> line (line_id)
    const { data: machines, error } = await supabaseAdmin
      .from('machine')
      .select(`
        id,
        name_machine,
        status,
        next_maintenance,
        last_maintenance,
        total_running_hours,
        total_downtime_hours,
        process (
          id,
          name,
          index,
          line_process (
            id,
            process_order,
            line (
              id,
              name
            )
          )
        )
      `)
      .order('name_machine', { ascending: true });

    if (error) {
      console.error('Error fetching machines for schedule:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const mappedMachines = (machines || []).map((machine: any) => {
      // Get first process info
      const firstProcess = machine.process?.[0] ?? null;
      const processName = firstProcess?.name ?? 'Unknown';

      // Get first line info from line_process
      const firstLineProcess = firstProcess?.line_process?.[0] ?? null;
      const processOrder = firstLineProcess?.process_order ?? 999;
      const line = firstLineProcess?.line ?? null;
      const lineName = line?.name ?? 'Unassigned';
      const lineId = line?.id ?? null;

      return {
        id: machine.id,
        name_machine: machine.name_machine,
        status: machine.status,
        last_maintenance: machine.last_maintenance,
        next_maintenance: machine.next_maintenance,
        total_running_hours: machine.total_running_hours,
        total_downtime_hours: machine.total_downtime_hours,
        line_name: lineName,
        line_id: lineId,
        process_order: processOrder,
        process_name: processName,
      };
    });

    // Sort by line name, then process order
    const sortedMachines = mappedMachines.sort((a, b) => {
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
