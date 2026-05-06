/**
 * Service: Downtime Snapshot
 *
 * Captures a snapshot of machine performance metrics at the moment a downtime event starts.
 * The snapshot is stored as a JSONB `data` column in:
 *   - machine_status_log (via update after creation)
 *   - work_order (on creation)
 *   - work_order_history (on completion)
 *   - notification (on creation)
 *
 * Snapshot shape:
 * {
 *   total_output: number,       // total items (pass + reject) in current shift
 *   pass: number,               // pass count in current shift
 *   reject: number,             // reject count in current shift
 *   actual_cycle_time: number | null,  // seconds/unit from cycle_time_machine
 *   actual_throughput: number | null,  // units/hour from troughput_machine
 *   defect_rate: number,        // percentage (reject / total_output * 100)
 *   snapshot_at: string,        // ISO timestamp when snapshot was taken
 *   shift_id: string | null,
 *   shift_name: string | null,
 * }
 */

import { supabaseAdmin } from '@/lib/supabase/supabase-admin';
import { getActiveShiftWindow } from '@/services/calculation/shift-window';

export interface DowntimeSnapshot {
    total_output: number;
    pass: number;
    reject: number;
    actual_cycle_time: number | null;
    actual_throughput: number | null;
    defect_rate: number;
    snapshot_at: string;
    shift_id: string | null;
    shift_name: string | null;
}

/**
 * Capture a performance snapshot for a machine at the moment of downtime.
 * Queries the latest stored metrics from troughput_machine and cycle_time_machine,
 * and counts pass/reject from data_items within the current shift window.
 */
export async function captureDowntimeSnapshot(machine_id: string): Promise<DowntimeSnapshot> {
    const snapshot_at = new Date().toISOString();

    // ── 1. Resolve all line_process_ids for this machine ─────────────────────
    const { data: processes } = await supabaseAdmin
        .from('process')
        .select('id')
        .eq('machine_id', machine_id);

    let allLpIds: string[] = [];
    if (processes && processes.length > 0) {
        const pIds = processes.map((p: any) => p.id);
        const { data: lps } = await supabaseAdmin
            .from('line_process')
            .select('id')
            .in('process_id', pIds);
        if (lps) allLpIds = lps.map((lp: any) => lp.id);
    }

    // ── 2. Get active shift window ────────────────────────────────────────────
    const shiftWindow = await getActiveShiftWindow();
    const shift_id = shiftWindow?.shift_id ?? null;
    const shift_name = shiftWindow?.shift_name ?? null;
    const shift_start = shiftWindow?.shift_start_ts ?? null;
    const shift_end = shiftWindow?.shift_end_ts ?? null;

    // ── 3. Count pass / reject from data_items in current shift ──────────────
    let pass = 0;
    let reject = 0;

    if (allLpIds.length > 0 && shift_start && shift_end) {
        const [passResult, rejectResult] = await Promise.all([
            supabaseAdmin
                .from('data_items')
                .select('id', { count: 'exact', head: true })
                .in('line_process_id', allLpIds)
                .eq('status', 'pass')
                .gte('created_at', shift_start)
                .lte('created_at', shift_end),
            supabaseAdmin
                .from('data_items')
                .select('id', { count: 'exact', head: true })
                .in('line_process_id', allLpIds)
                .eq('status', 'reject')
                .gte('created_at', shift_start)
                .lte('created_at', shift_end),
        ]);

        pass = passResult.count ?? 0;
        reject = rejectResult.count ?? 0;
    } else if (allLpIds.length > 0) {
        // Fallback: count all-time if no shift window
        const [passResult, rejectResult] = await Promise.all([
            supabaseAdmin
                .from('data_items')
                .select('id', { count: 'exact', head: true })
                .in('line_process_id', allLpIds)
                .eq('status', 'pass'),
            supabaseAdmin
                .from('data_items')
                .select('id', { count: 'exact', head: true })
                .in('line_process_id', allLpIds)
                .eq('status', 'reject'),
        ]);
        pass = passResult.count ?? 0;
        reject = rejectResult.count ?? 0;
    }

    const total_output = pass + reject;
    const defect_rate = total_output > 0
        ? parseFloat(((reject / total_output) * 100).toFixed(4))
        : 0;

    // ── 4. Get latest cycle time from cycle_time_machine ─────────────────────
    let actual_cycle_time: number | null = null;
    const { data: ctRow } = await supabaseAdmin
        .from('cycle_time_machine')
        .select('actual_cycle_time')
        .eq('machine_id', machine_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (ctRow?.actual_cycle_time != null) {
        actual_cycle_time = parseFloat(Number(ctRow.actual_cycle_time).toFixed(4));
    }

    // ── 5. Get latest throughput from troughput_machine ───────────────────────
    let actual_throughput: number | null = null;
    const { data: tpRow } = await supabaseAdmin
        .from('troughput_machine')
        .select('troughput')
        .eq('machine_id', machine_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (tpRow?.troughput != null) {
        actual_throughput = parseFloat(Number(tpRow.troughput).toFixed(4));
    }

    const snapshot: DowntimeSnapshot = {
        total_output,
        pass,
        reject,
        actual_cycle_time,
        actual_throughput,
        defect_rate,
        snapshot_at,
        shift_id,
        shift_name,
    };

    console.log('[downtime-snapshot] Captured for machine', machine_id, ':', snapshot);

    return snapshot;
}
