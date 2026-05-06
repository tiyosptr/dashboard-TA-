/**
 * GET /api/machines/[id]/runtime-stats
 *
 * Menghitung total_running_hours dan total_downtime_hours langsung dari
 * machine_status_log (closed events + live open event), bukan dari kolom
 * text di tabel machine yang bisa stale.
 *
 * Returns:
 *   - machine: basic info
 *   - totalRunningHours  (dari status 'active' / 'running')
 *   - totalDowntimeHours (dari status 'downtime' / 'down')
 *   - currentStatus
 *   - openEvent: event yang sedang berjalan (jika ada)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: machineId } = await params;

    // 1. Machine basic info
    const { data: machine, error: machineErr } = await supabaseAdmin
      .from('machine')
      .select('id, name_machine, status, next_maintenance, last_maintenance')
      .eq('id', machineId)
      .single();

    if (machineErr || !machine) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    // 2. All closed logs for this machine - use consistent status filter
    const { data: closedLogs, error: logsErr } = await supabaseAdmin
      .from('machine_status_log')
      .select('id, status, start_time, end_time, duration_seconds')
      .eq('machine_id', machineId)
      .not('end_time', 'is', null);

    if (logsErr) throw logsErr;

    // 3. Current open event (end_time IS NULL)
    const { data: openLogs } = await supabaseAdmin
      .from('machine_status_log')
      .select('id, status, start_time')
      .eq('machine_id', machineId)
      .is('end_time', null)
      .order('start_time', { ascending: false })
      .limit(1);

    const openEvent = openLogs?.[0] ?? null;

    // 4. Aggregate closed logs - use consistent status filter
    let closedRunningSeconds = 0;
    let closedDowntimeSeconds = 0;

    (closedLogs || []).forEach((log: any) => {
      const s = (log.status ?? '').toLowerCase().trim();
      // Use pre-computed duration_seconds if available, else calculate
      let secs = 0;
      if (log.duration_seconds != null) {
        secs = Number(log.duration_seconds);
      } else if (log.start_time && log.end_time) {
        secs = Math.max(
          0,
          (new Date(log.end_time).getTime() - new Date(log.start_time).getTime()) / 1000
        );
      }

      if (s === 'active' || s === 'running') {
        closedRunningSeconds += secs;
      } else if (s === 'downtime') { // Consistent status filter
        closedDowntimeSeconds += secs;
      }
    });

    // 5. Add live duration from open event - use consistent status filter
    let liveRunningSeconds = 0;
    let liveDowntimeSeconds = 0;

    if (openEvent) {
      const liveSecs = Math.max(
        0,
        (Date.now() - new Date(openEvent.start_time).getTime()) / 1000
      );
      const s = (openEvent.status ?? '').toLowerCase().trim();
      if (s === 'active' || s === 'running') {
        liveRunningSeconds = liveSecs;
      } else if (s === 'downtime') { // Consistent status filter
        liveDowntimeSeconds = liveSecs;
      }
    }

    const totalRunningSeconds = closedRunningSeconds + liveRunningSeconds;
    const totalDowntimeSeconds = closedDowntimeSeconds + liveDowntimeSeconds;

    return NextResponse.json({
      success: true,
      data: {
        machine,
        totalRunningSeconds,
        totalDowntimeSeconds,
        totalRunningHours: totalRunningSeconds / 3600,
        totalDowntimeHours: totalDowntimeSeconds / 3600,
        openEvent: openEvent
          ? {
              id: openEvent.id,
              status: openEvent.status,
              start_time: openEvent.start_time,
              liveDurationSeconds: liveRunningSeconds || liveDowntimeSeconds,
            }
          : null,
      },
    });
  } catch (err: any) {
    console.error('[runtime-stats]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
