/**
 * Service: Cycle Time Machine
 * 
 * Rumus: Cycle Time = Jumlah Item (pass + reject) / Total Run Time Mesin
 * 
 * Perhitungan di-trigger saat data_item baru ditambahkan (pass/reject),
 * BUKAN saat modal dibuka. Modal hanya membaca data yang sudah tersimpan.
 * 
 * Hasil disimpan ke table `cycle_time_machine`.
 */

import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

// ─── Helper: time string → minutes since midnight ───────────────────
function timeToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

// ─── Helper: check if time is in a shift range ──────────────────────
function isInShift(nowMinutes: number, startMin: number, endMin: number): boolean {
    if (endMin > startMin) {
        return nowMinutes >= startMin && nowMinutes < endMin;
    }
    return nowMinutes >= startMin || nowMinutes < endMin;
}

// ─── Result type for trigger ────────────────────────────────────────
export interface CycleTimeTriggerResult {
    success: boolean;
    step: string;
    machine_id?: string;
    machine_name?: string;
    shift_name?: string;
    total_output?: number;
    operating_time_seconds?: number;
    actual_cycle_time?: number | null;
    error?: string;
}

// ─────────────────────────────────────────────────────────────────────
// TRIGGER: Called when a data_item is added (pass/reject)
// Returns a result object so callers can see what happened.
// ─────────────────────────────────────────────────────────────────────
export async function triggerCycleTimeUpdate(line_process_id: string): Promise<CycleTimeTriggerResult> {
    try {
        console.log('[cycle_time] ▶ START for line_process_id:', line_process_id);

        // ── 1. line_process → process → machine ──────────────────
        const { data: lpData, error: lpError } = await supabaseAdmin
            .from('line_process')
            .select('id, line_id, process:process_id(id, name, machine_id)')
            .eq('id', line_process_id)
            .single();

        if (lpError) {
            console.error('[cycle_time] ✗ line_process query error:', lpError);
            return { success: false, step: 'line_process_query', error: lpError.message };
        }

        if (!lpData || !lpData.process) {
            console.log('[cycle_time] ✗ No process linked to line_process:', line_process_id);
            return { success: false, step: 'no_process', error: `No process for LP ${line_process_id}` };
        }

        const process = lpData.process as any;
        const machine_id = process.machine_id;
        const lineId = lpData.line_id || null;

        console.log('[cycle_time] Process:', process.name, '| machine_id:', machine_id);

        if (!machine_id) {
            return { success: false, step: 'no_machine_id', error: `Process "${process.name}" has no machine_id` };
        }

        // Get machine name
        const { data: machineRow } = await supabaseAdmin
            .from('machine')
            .select('name_machine')
            .eq('id', machine_id)
            .single();

        const machineName = machineRow?.name_machine || 'Unknown';

        // ── 2. Detect current shift ──────────────────────────────
        const { data: allShifts, error: shiftError } = await supabaseAdmin
            .from('shift')
            .select('id, shift_name, start_time, end_time')
            .order('start_time', { ascending: true });

        if (shiftError || !allShifts || allShifts.length === 0) {
            return { success: false, step: 'no_shifts', error: shiftError?.message || 'No shifts found' };
        }

        const now = new Date();
        const wibOffset = 7 * 60;
        const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
        const wibMinutes = (utcMinutes + wibOffset) % (24 * 60);

        let activeShift = allShifts[0]; // default fallback
        for (const shift of allShifts) {
            const startMin = timeToMinutes(shift.start_time);
            const endMin = timeToMinutes(shift.end_time);
            if (isInShift(wibMinutes, startMin, endMin)) {
                activeShift = shift;
                break;
            }
        }

        console.log('[cycle_time] Shift:', activeShift.shift_name);

        // ── 3. Build shift UTC time range ────────────────────────
        const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
        const year = wibNow.getUTCFullYear();
        const month = wibNow.getUTCMonth();
        const day = wibNow.getUTCDate();

        const startH = parseInt(activeShift.start_time.split(':')[0], 10);
        const startM = parseInt(activeShift.start_time.split(':')[1], 10);
        const endH = parseInt(activeShift.end_time.split(':')[0], 10);
        const endM = parseInt(activeShift.end_time.split(':')[1], 10);
        const isOvernight = endH < startH || (endH === startH && endM <= startM);

        let rangeStartUtc: Date;
        let rangeEndUtc: Date;

        if (isOvernight) {
            rangeStartUtc = new Date(Date.UTC(year, month, day - 1, startH - 7, startM));
            rangeEndUtc = new Date(Date.UTC(year, month, day, endH - 7, endM));
        } else {
            rangeStartUtc = new Date(Date.UTC(year, month, day, startH - 7, startM));
            rangeEndUtc = new Date(Date.UTC(year, month, day, endH - 7, endM));
        }

        console.log('[cycle_time] Range:', rangeStartUtc.toISOString(), '→', rangeEndUtc.toISOString());

        // ── 4. Calculate Operating Time (Run Time) ───────────────
        //    Get all 'active' status logs for this machine overlapping with shift
        const { data: closedLogs } = await supabaseAdmin
            .from('machine_status_log')
            .select('id, start_time, end_time')
            .eq('machine_id', machine_id)
            .eq('status', 'active')
            .not('end_time', 'is', null)
            .lt('start_time', rangeEndUtc.toISOString())
            .gt('end_time', rangeStartUtc.toISOString());

        const { data: openLogs } = await supabaseAdmin
            .from('machine_status_log')
            .select('id, start_time, end_time')
            .eq('machine_id', machine_id)
            .eq('status', 'active')
            .is('end_time', null)
            .lt('start_time', rangeEndUtc.toISOString());

        const allLogs = [...(closedLogs || []), ...(openLogs || [])];

        // Deduplicate by id
        const uniqueLogs = allLogs.filter((log, idx, arr) =>
            arr.findIndex(l => l.id === log.id) === idx
        );

        let operatingTimeSeconds = 0;
        let latestLogId: string | null = null;

        for (const log of uniqueLogs) {
            const logStart = new Date(log.start_time);
            const logEnd = log.end_time ? new Date(log.end_time) : now;
            const effectiveStart = logStart < rangeStartUtc ? rangeStartUtc : logStart;
            const effectiveEnd = logEnd > rangeEndUtc ? rangeEndUtc : logEnd;
            if (effectiveEnd > effectiveStart) {
                operatingTimeSeconds += Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / 1000);
            }
            latestLogId = log.id;
        }

        console.log('[cycle_time] Operating time:', operatingTimeSeconds, 'sec | Logs:', uniqueLogs.length);

        // ── 5. Count total items (pass + reject) ────────────────
        const { data: processes } = await supabaseAdmin
            .from('process')
            .select('id')
            .eq('machine_id', machine_id);

        let totalOutput = 0;

        if (processes && processes.length > 0) {
            const processIds = processes.map((p: any) => p.id);

            const { data: lineProcesses } = await supabaseAdmin
                .from('line_process')
                .select('id')
                .in('process_id', processIds);

            if (lineProcesses && lineProcesses.length > 0) {
                const lpIds = lineProcesses.map((lp: any) => lp.id);

                const { count } = await supabaseAdmin
                    .from('data_items')
                    .select('id', { count: 'exact', head: true })
                    .in('line_process_id', lpIds)
                    .gte('created_at', rangeStartUtc.toISOString())
                    .lt('created_at', rangeEndUtc.toISOString());

                totalOutput = count || 0;
            }
        }

        console.log('[cycle_time] Total output:', totalOutput);

        // ── 6. Calculate Cycle Time ──────────────────────────────
        let actualCycleTime: number | null = null;
        if (totalOutput > 0 && operatingTimeSeconds > 0) {
            actualCycleTime = parseFloat((totalOutput / operatingTimeSeconds).toFixed(4));
        }

        console.log('[cycle_time] Cycle time:', actualCycleTime);

        // ── 7. Save to cycle_time_machine ────────────────────────
        const insertData: Record<string, any> = {
            id: crypto.randomUUID(),
            machine_id,
            shift_id: activeShift.id,
            line_id: lineId,
            line_process_id,
            total_output: totalOutput,
            actual_cycle_time: actualCycleTime,
        };

        // Only set FK if we have a valid reference
        if (latestLogId) {
            insertData.id_machine_status_log = latestLogId;
        }

        const { data: savedRow, error: insertError } = await supabaseAdmin
            .from('cycle_time_machine')
            .insert(insertData)
            .select()
            .single();

        if (insertError) {
            console.error('[cycle_time] ✗ INSERT ERROR:', insertError.message, insertError.details, insertError.hint);
            return {
                success: false,
                step: 'insert',
                machine_id,
                machine_name: machineName,
                shift_name: activeShift.shift_name,
                total_output: totalOutput,
                operating_time_seconds: operatingTimeSeconds,
                actual_cycle_time: actualCycleTime,
                error: `Insert failed: ${insertError.message} | ${insertError.details || ''} | ${insertError.hint || ''}`
            };
        }

        console.log('[cycle_time] ✓ SAVED! id:', savedRow?.id);

        return {
            success: true,
            step: 'done',
            machine_id,
            machine_name: machineName,
            shift_name: activeShift.shift_name,
            total_output: totalOutput,
            operating_time_seconds: operatingTimeSeconds,
            actual_cycle_time: actualCycleTime,
        };
    } catch (err: any) {
        console.error('[cycle_time] ✗ EXCEPTION:', err);
        return { success: false, step: 'exception', error: err.message };
    }
}

// ─── Read saved cycle time for a machine (for modal display) ────────
export async function getLatestCycleTime(
    machine_id: string,
    shift_id?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        let query = supabaseAdmin
            .from('cycle_time_machine')
            .select('*')
            .eq('machine_id', machine_id)
            .order('created_at', { ascending: false })
            .limit(1);

        if (shift_id) {
            query = query.eq('shift_id', shift_id);
        }

        const { data, error } = await query.single();

        if (error && error.code !== 'PGRST116') {
            return { success: false, error: error.message };
        }

        return { success: true, data: data || null };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Get Cycle Time History for a Machine ─────────────────────────
export async function getCycleTimeHistory(
    machine_id: string,
    days: number = 7
): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - days);

        const { data, error } = await supabaseAdmin
            .from('cycle_time_machine')
            .select(`
                *,
                shift:shift_id (id, shift_name, start_time, end_time),
                machine:machine_id (id, name_machine)
            `)
            .eq('machine_id', machine_id)
            .gte('created_at', sinceDate.toISOString())
            .order('created_at', { ascending: false });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Format helpers ───────────────────────────────────────────────
export function formatCycleTime(value: number | null): string {
    if (value === null || value <= 0) return '—';
    if (value < 1) {
        const perMinute = value * 60;
        return `${perMinute.toFixed(2)}/minute`;
    }
    return `${value.toFixed(2)}/sec`;
}

export function formatOperatingTime(seconds: number): string {
    if (seconds <= 0) return '0 sec';
    if (seconds < 60) return `${seconds} sec`;
    if (seconds < 3600) {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return sec > 0 ? `${min} minute ${sec} sec` : `${min} minute`;
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h} hour ${m} minute` : `${h} hour`;
}
