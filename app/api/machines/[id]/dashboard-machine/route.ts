/**
 * GET /api/machines/[id]/dashboard-machine
 * 
 * Unified endpoint that consolidates all machine detail data into
 * a single response. Eliminates the waterfall problem of calling
 * 5+ separate endpoints when opening a machine detail modal.
 * 
 * Query params:
 *   - date: string (optional, YYYY-MM-DD, defaults to today WIB)
 *   - shiftId: string (optional, auto-detects current shift if omitted)
 * 
 * Returns all metrics in parallel using Promise.all:
 *   - output (pass/reject/total + hourly breakdown)
 *   - cycleTime (latest + history)
 *   - throughput (latest saved value)
 *   - defectRate (aggregate + hourly breakdown)
 *   - runtime/downtime from machine table
 *   - shift info
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

export const dynamic = 'force-dynamic';

// ─── Helpers ─────────────────────────────────────────────────────────
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function isInShift(nowMinutes: number, startMin: number, endMin: number): boolean {
  if (endMin > startMin) {
    return nowMinutes >= startMin && nowMinutes < endMin;
  }
  return nowMinutes >= startMin || nowMinutes < endMin;
}

function buildShiftSlots(startTime: string, endTime: string) {
  const startH = parseInt(startTime.split(':')[0], 10);
  const endH = parseInt(endTime.split(':')[0], 10);
  const slots: { slot: string; hour: number }[] = [];

  if (endH > startH) {
    for (let h = startH; h < endH; h++) {
      slots.push({
        slot: `${h.toString().padStart(2, '0')}:00-${(h + 1).toString().padStart(2, '0')}:00`,
        hour: h,
      });
    }
  } else {
    for (let h = startH; h < 24; h++) {
      slots.push({
        slot: `${h.toString().padStart(2, '0')}:00-${(h + 1).toString().padStart(2, '0')}:00`,
        hour: h,
      });
    }
    for (let h = 0; h < endH; h++) {
      slots.push({
        slot: `${h.toString().padStart(2, '0')}:00-${(h + 1).toString().padStart(2, '0')}:00`,
        hour: h,
      });
    }
  }
  return slots;
}

// ─── GET Handler ─────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: machineId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get('date');
    const shiftId = searchParams.get('shiftId');

    // ══════════════════════════════════════════════════════════════════
    // PHASE 1: Shared lookups (needed by multiple metrics)
    // Run machine info + processes + shifts in parallel
    // ══════════════════════════════════════════════════════════════════

    const [machineResult, processesResult, shiftsResult] = await Promise.all([
      // 1. Machine basic info
      supabaseAdmin
        .from('machine')
        .select('id, name_machine, status, next_maintenance, last_maintenance, total_running_hours, total_downtime_hours')
        .eq('id', machineId)
        .single(),

      // 2. Processes linked to this machine
      supabaseAdmin
        .from('process')
        .select('id, name')
        .eq('machine_id', machineId),

      // 3. All shifts
      supabaseAdmin
        .from('shift')
        .select('id, shift_name, start_time, end_time')
        .order('start_time', { ascending: true }),
    ]);

    if (machineResult.error) {
      return NextResponse.json(
        { success: false, error: `Machine not found: ${machineResult.error.message}` },
        { status: 404 }
      );
    }

    const machine = machineResult.data;
    const processes = processesResult.data || [];
    const allShifts = shiftsResult.data || [];

    // ── Resolve line_process IDs ─────────────────────────────────────
    const processIds = processes.map((p: any) => p.id);
    let lineProcessIds: string[] = [];
    let lineIds: string[] = [];

    if (processIds.length > 0) {
      const { data: lineProcesses } = await supabaseAdmin
        .from('line_process')
        .select('id, line_id')
        .in('process_id', processIds);

      if (lineProcesses && lineProcesses.length > 0) {
        lineProcessIds = lineProcesses.map((lp: any) => lp.id);
        lineIds = [...new Set(lineProcesses.map((lp: any) => lp.line_id))];
      }
    }

    // ── Determine target date (WIB) ──────────────────────────────────
    let wibDateStr: string;
    if (dateStr) {
      wibDateStr = dateStr;
    } else {
      const now = new Date();
      const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      wibDateStr = wibNow.toISOString().split('T')[0];
    }

    // ── Determine active shift ───────────────────────────────────────
    type ShiftType = { id: string; shift_name: string; start_time: string; end_time: string };
    let activeShift: ShiftType | null = null;

    if (shiftId && allShifts.length > 0) {
      activeShift = allShifts.find((s: any) => s.id === shiftId) || null;
    } else if (allShifts.length > 0) {
      const now = new Date();
      const wibOffset = 7 * 60;
      const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
      const wibMinutes = (utcMinutes + wibOffset) % (24 * 60);

      for (const shift of allShifts) {
        const startMin = timeToMinutes(shift.start_time);
        const endMin = timeToMinutes(shift.end_time);
        if (isInShift(wibMinutes, startMin, endMin)) {
          activeShift = shift;
          break;
        }
      }
      if (!activeShift) activeShift = allShifts[0];
    }

    // ── Build UTC time range for shift + date ────────────────────────
    const [year, month, day] = wibDateStr.split('-').map(Number);
    let rangeStartUtc: Date;
    let rangeEndUtc: Date;

    if (activeShift) {
      const startH = parseInt(activeShift.start_time.split(':')[0], 10);
      const startM = parseInt(activeShift.start_time.split(':')[1], 10);
      const endH = parseInt(activeShift.end_time.split(':')[0], 10);
      const endM = parseInt(activeShift.end_time.split(':')[1], 10);
      const isOvernight = endH < startH || (endH === startH && endM <= startM);

      let shiftStartDay = day;
      let shiftEndDay = day;

      if (isOvernight) {
        const wibNow = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
        if (year === wibNow.getUTCFullYear() && month === wibNow.getUTCMonth() + 1 && day === wibNow.getUTCDate()) {
          const currentMinutes = wibNow.getUTCHours() * 60 + wibNow.getUTCMinutes();
          const startMinutes = startH * 60 + startM;
          if (currentMinutes < startMinutes) {
            shiftStartDay = day - 1;
            shiftEndDay = day;
          } else {
            shiftStartDay = day;
            shiftEndDay = day + 1;
          }
        } else {
          shiftStartDay = day;
          shiftEndDay = day + 1;
        }
      }

      rangeStartUtc = new Date(Date.UTC(year, month - 1, shiftStartDay, startH, startM, 0, 0));
      rangeStartUtc.setUTCHours(rangeStartUtc.getUTCHours() - 7);
      rangeEndUtc = new Date(Date.UTC(year, month - 1, shiftEndDay, endH, endM, 0, 0));
      rangeEndUtc.setUTCHours(rangeEndUtc.getUTCHours() - 7);
    } else {
      rangeStartUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      rangeStartUtc.setUTCHours(rangeStartUtc.getUTCHours() - 7);
      rangeEndUtc = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      rangeEndUtc.setUTCHours(rangeEndUtc.getUTCHours() - 7);
    }

    // ══════════════════════════════════════════════════════════════════
    // PHASE 2: All metric queries in parallel (the main optimization)
    // ══════════════════════════════════════════════════════════════════

    const hasLineProcesses = lineProcessIds.length > 0;

    // Build all promises
    const targetOutputPromise = Promise.resolve(1000);

    const defectPromise = hasLineProcesses
      ? (async () => {
        let query = supabaseAdmin
          .from('defect_by_process')
          .select('*')
          .in('line_process_id', lineProcessIds)
          .eq('recorded_date', wibDateStr);
        if (activeShift) {
          query = query.eq('shift_id', activeShift.id);
        }
        const { data } = await query.order('recorded_hour', { ascending: true });
        return data || [];
      })()
      : Promise.resolve([]);

    const cycleTimePromise = supabaseAdmin
      .from('cycle_time_machine')
      .select('*')
      .eq('machine_id', machineId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const cycleTimeHistoryPromise = (async () => {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - 1);
      const { data } = await supabaseAdmin
        .from('cycle_time_machine')
        .select('*, shift:shift_id(id, shift_name, start_time, end_time), machine:machine_id(id, name_machine)')
        .eq('machine_id', machineId)
        .gte('created_at', sinceDate.toISOString())
        .order('created_at', { ascending: false });
      return data || [];
    })();

    const throughputPromise = supabaseAdmin
      .from('troughput_machine')
      .select('*')
      .eq('machine_id', machineId)
      .limit(1)
      .maybeSingle();

    // Execute ALL in parallel
    const [
      targetOutputResult,
      defectRecords,
      cycleTimeResult,
      cycleTimeHistory,
      throughputResult,
    ] = await Promise.all([
      targetOutputPromise,
      defectPromise,
      cycleTimePromise,
      cycleTimeHistoryPromise,
      throughputPromise,
    ]);

    // ══════════════════════════════════════════════════════════════════
    // PHASE 3: Aggregate results (Instant CPU mapping, no raw loop)
    // ══════════════════════════════════════════════════════════════════

    // ── Defect rate & Totals aggregation ─────────────────────────────
    let defectTotalProduced = 0;
    let defectTotalPass = 0;
    let defectTotalReject = 0;

    defectRecords.forEach((rec: any) => {
      defectTotalProduced += Number(rec.total_produced) || 0;
      defectTotalPass += Number(rec.total_pass) || 0;
      defectTotalReject += Number(rec.total_reject) || 0;
    });

    const defectRate = defectTotalProduced > 0
      ? +((defectTotalReject / defectTotalProduced) * 100).toFixed(2)
      : 0;

    // ── Output aggregation ───────────────────────────────────────────
    const totalPass = defectTotalPass;
    const totalReject = defectTotalReject;
    const totalProduced = defectTotalProduced;
    const targetOutput = targetOutputResult;

    const shiftSlots = activeShift
      ? buildShiftSlots(activeShift.start_time, activeShift.end_time)
      : Array.from({ length: 24 }, (_, h) => ({
        slot: `${h.toString().padStart(2, '0')}:00-${(h + 1).toString().padStart(2, '0')}:00`,
        hour: h,
      }));

    // Generate Hourly Metrics from Pre-aggregated Defect Data
    const outputHourly = shiftSlots.map(s => {
      const hourRecords = defectRecords.filter((r: any) => r.recorded_hour === s.hour);
      const hourProduced = hourRecords.reduce((sum: number, r: any) => sum + (Number(r.total_produced) || 0), 0);
      const hourReject = hourRecords.reduce((sum: number, r: any) => sum + (Number(r.total_reject) || 0), 0);
      const hourPass = hourRecords.reduce((sum: number, r: any) => sum + (Number(r.total_pass) || 0), 0);
      return {
        hour_slot: s.slot,
        pass: hourPass,
        reject: hourReject,
        total: hourProduced,
      };
    });

    const defectHourly = shiftSlots.map(s => {
      const hourRecords = defectRecords.filter((r: any) => r.recorded_hour === s.hour);
      const hourProduced = hourRecords.reduce((sum: number, r: any) => sum + (Number(r.total_produced) || 0), 0);
      const hourReject = hourRecords.reduce((sum: number, r: any) => sum + (Number(r.total_reject) || 0), 0);
      const hourPass = hourRecords.reduce((sum: number, r: any) => sum + (Number(r.total_pass) || 0), 0);
      const hourDefectRate = hourProduced > 0 ? +((hourReject / hourProduced) * 100).toFixed(2) : 0;
      return {
        hour_slot: s.slot,
        total_produced: hourProduced,
        total_pass: hourPass,
        total_reject: hourReject,
        defect_rate: hourDefectRate,
      };
    });

    // ── Cycle time ───────────────────────────────────────────────────
    const latestCycleTime = cycleTimeResult.data ? {
      machine_id: cycleTimeResult.data.machine_id,
      shift_id: cycleTimeResult.data.shift_id,
      line_id: cycleTimeResult.data.line_id,
      line_process_id: cycleTimeResult.data.line_process_id,
      total_output: Number(cycleTimeResult.data.total_output),
      actual_cycle_time: cycleTimeResult.data.actual_cycle_time !== null
        ? Number(cycleTimeResult.data.actual_cycle_time)
        : null,
      id_machine_status_log: cycleTimeResult.data.id_machine_status_log,
      created_at: cycleTimeResult.data.created_at,
    } : null;

    // ── Throughput ────────────────────────────────────────────────────
    const latestThroughput = throughputResult.data ? {
      id: throughputResult.data.id,
      troughput: Number(throughputResult.data.troughput),
      total_pass: Number(throughputResult.data.total_pass),
      interval_time: Number(throughputResult.data.interval_time),
      machine_id: throughputResult.data.machine_id,
      line_id: throughputResult.data.line_id,
      line_process_id: throughputResult.data.line_process_id,
    } : null;

    // ── Shift info ───────────────────────────────────────────────────
    const shiftInfo = activeShift ? {
      id: activeShift.id,
      name: activeShift.shift_name,
      start_time: activeShift.start_time,
      end_time: activeShift.end_time,
    } : null;

    const allShiftsFormatted = allShifts.map((s: any) => ({
      id: s.id,
      name: s.shift_name,
      start_time: s.start_time,
      end_time: s.end_time,
    }));

    // ══════════════════════════════════════════════════════════════════
    // RESPONSE: Single unified payload
    // ══════════════════════════════════════════════════════════════════

    return NextResponse.json({
      success: true,
      data: {
        // Machine info
        machine: {
          id: machine.id,
          name_machine: machine.name_machine,
          status: machine.status,
          next_maintenance: machine.next_maintenance,
          last_maintenance: machine.last_maintenance,
          total_running_hours: machine.total_running_hours,
          total_downtime_hours: machine.total_downtime_hours,
        },

        // Output metrics
        output: {
          totalPass,
          totalReject,
          totalProduced,
          targetOutput,
          hourly: outputHourly,
          date: wibDateStr,
          machineId,
        },

        // Cycle time
        cycleTime: latestCycleTime,
        cycleTimeHistory,

        // Throughput
        throughput: latestThroughput,

        // Defect rate
        defectRate: {
          totalProduced: defectTotalProduced,
          totalPass: defectTotalPass,
          totalReject: defectTotalReject,
          defectRate,
          hourly: defectHourly,
          date: wibDateStr,
          machineId,
        },

        // Shift context
        shift: shiftInfo,
        allShifts: allShiftsFormatted,
      },
    });
  } catch (error: any) {
    console.error('[api/machines/[id]/dashboard-machine] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
