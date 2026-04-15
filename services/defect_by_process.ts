/**
 * Service: Defect By Process
 * 
 * Rumus: Defect Rate (%) = (Jumlah Unit Defect / Total Unit Diproduksi) × 100
 * 
 * Perhitungan di-trigger saat data_item baru ditambahkan (pass/reject).
 * Menghitung total pass, reject, dan produced per line_process per shift per jam,
 * lalu menyimpan/update ke table `defect_by_process`.
 * 
 * Strategi: UPSERT per (line_id, line_process_id, shift_id, recorded_date, recorded_hour)
 *   → Jika sudah ada record untuk kombinasi tersebut, UPDATE counters.
 *   → Jika belum ada, INSERT baru.
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

// ─── Result type ────────────────────────────────────────────────────
export interface DefectByProcessTriggerResult {
    success: boolean;
    step: string;
    line_process_id?: string;
    line_id?: string;
    machine_id?: string;
    machine_name?: string;
    shift_name?: string;
    recorded_date?: string;
    recorded_hour?: number;
    total_produced?: number;
    total_pass?: number;
    total_reject?: number;
    defect_rate?: number;
    error?: string;
}

// ─────────────────────────────────────────────────────────────────────
// TRIGGER: Called when a data_item is added (pass/reject).
// Counts pass/reject for this line_process in the current shift+hour,
// then UPSERTS into defect_by_process.
// ─────────────────────────────────────────────────────────────────────
export async function triggerDefectByProcessUpdate(
    line_process_id: string
): Promise<DefectByProcessTriggerResult> {
    try {
        console.log('[defect_by_process] ▶ START for line_process_id:', line_process_id);

        // ── 1. Resolve line_process → line_id + process → machine ────
        const { data: lpData, error: lpError } = await supabaseAdmin
            .from('line_process')
            .select('id, line_id, process:process_id(id, name, machine_id)')
            .eq('id', line_process_id)
            .single();

        if (lpError || !lpData) {
            console.error('[defect_by_process] ✗ line_process query error:', lpError?.message);
            return { success: false, step: 'line_process_query', error: lpError?.message || 'No row found' };
        }

        const lineId = lpData.line_id;
        if (!lineId) {
            return { success: false, step: 'no_line_id', error: `line_process ${line_process_id} has no line_id` };
        }

        const process = lpData.process as any;
        const machineId = process?.machine_id || null;

        // Get machine name for logging
        let machineName = 'Unknown';
        if (machineId) {
            const { data: machineRow } = await supabaseAdmin
                .from('machine')
                .select('name_machine')
                .eq('id', machineId)
                .single();
            machineName = machineRow?.name_machine || 'Unknown';
        }

        console.log('[defect_by_process] line_id:', lineId, '| machine:', machineName);

        // ── 2. Detect current shift ──────────────────────────────────
        const { data: allShifts, error: shiftError } = await supabaseAdmin
            .from('shift')
            .select('id, shift_name, start_time, end_time')
            .order('start_time', { ascending: true });

        if (shiftError || !allShifts || allShifts.length === 0) {
            return { success: false, step: 'no_shifts', error: shiftError?.message || 'No shifts found' };
        }

        const now = new Date();
        const wibOffset = 7 * 60; // WIB = UTC+7
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

        console.log('[defect_by_process] Shift:', activeShift.shift_name);

        // ── 3. Determine current WIB date and hour ───────────────────
        const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
        const wibYear = wibNow.getUTCFullYear();
        const wibMonth = (wibNow.getUTCMonth() + 1).toString().padStart(2, '0');
        const wibDay = wibNow.getUTCDate().toString().padStart(2, '0');
        const recordedDate = `${wibYear}-${wibMonth}-${wibDay}`;
        const recordedHour = wibNow.getUTCHours();

        console.log('[defect_by_process] Date:', recordedDate, '| Hour:', recordedHour);

        // ── 4. Build UTC range for this specific hour ────────────────
        //    We need to count data_items created in this WIB hour
        const hourStartWib = new Date(Date.UTC(wibYear, wibNow.getUTCMonth(), wibNow.getUTCDate(), recordedHour, 0, 0));
        const hourEndWib = new Date(Date.UTC(wibYear, wibNow.getUTCMonth(), wibNow.getUTCDate(), recordedHour + 1, 0, 0));

        // Convert WIB to UTC (subtract 7 hours)
        const hourStartUtc = new Date(hourStartWib.getTime() - 7 * 60 * 60 * 1000);
        const hourEndUtc = new Date(hourEndWib.getTime() - 7 * 60 * 60 * 1000);

        console.log('[defect_by_process] Hour range UTC:', hourStartUtc.toISOString(), '→', hourEndUtc.toISOString());

        // ── 5. Count pass and reject for this line_process in this hour ──
        const { count: passCount, error: passErr } = await supabaseAdmin
            .from('data_items')
            .select('id', { count: 'exact', head: true })
            .eq('line_process_id', line_process_id)
            .eq('status', 'pass')
            .gte('created_at', hourStartUtc.toISOString())
            .lt('created_at', hourEndUtc.toISOString());

        if (passErr) {
            console.error('[defect_by_process] ✗ pass count error:', passErr.message);
            return { success: false, step: 'count_pass', error: passErr.message };
        }

        const { count: rejectCount, error: rejectErr } = await supabaseAdmin
            .from('data_items')
            .select('id', { count: 'exact', head: true })
            .eq('line_process_id', line_process_id)
            .eq('status', 'reject')
            .gte('created_at', hourStartUtc.toISOString())
            .lt('created_at', hourEndUtc.toISOString());

        if (rejectErr) {
            console.error('[defect_by_process] ✗ reject count error:', rejectErr.message);
            return { success: false, step: 'count_reject', error: rejectErr.message };
        }

        const totalPass = passCount ?? 0;
        const totalReject = rejectCount ?? 0;
        const totalProduced = totalPass + totalReject;

        // Calculate defect rate
        const defectRate = totalProduced > 0
            ? (totalReject / totalProduced) * 100
            : 0;

        console.log(`[defect_by_process] Pass: ${totalPass} | Reject: ${totalReject} | Total: ${totalProduced} | DefectRate: ${defectRate.toFixed(2)}%`);

        // ── 6. UPSERT into defect_by_process ─────────────────────────
        //    Check if a record already exists for this combination
        const { data: existingRecord, error: findError } = await supabaseAdmin
            .from('defect_by_process')
            .select('id')
            .eq('line_id', lineId)
            .eq('line_process_id', line_process_id)
            .eq('shift_id', activeShift.id)
            .eq('recorded_date', recordedDate)
            .eq('recorded_hour', recordedHour)
            .maybeSingle();

        if (findError) {
            console.error('[defect_by_process] ✗ find existing error:', findError.message);
            return { success: false, step: 'find_existing', error: findError.message };
        }

        let savedRow: any = null;

        if (existingRecord) {
            // UPDATE existing record
            const { data: updated, error: updateError } = await supabaseAdmin
                .from('defect_by_process')
                .update({
                    total_produced: totalProduced,
                    total_pass: totalPass,
                    total_reject: totalReject,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existingRecord.id)
                .select()
                .single();

            if (updateError) {
                console.error('[defect_by_process] ✗ UPDATE ERROR:', updateError.message, updateError.details, updateError.hint);
                return {
                    success: false,
                    step: 'update',
                    line_process_id,
                    line_id: lineId,
                    machine_id: machineId,
                    machine_name: machineName,
                    shift_name: activeShift.shift_name,
                    recorded_date: recordedDate,
                    recorded_hour: recordedHour,
                    total_produced: totalProduced,
                    total_pass: totalPass,
                    total_reject: totalReject,
                    defect_rate: +defectRate.toFixed(2),
                    error: `Update failed: ${updateError.message}`,
                };
            }

            savedRow = updated;
            console.log('[defect_by_process] ✓ UPDATED id:', savedRow?.id);
        } else {
            // INSERT new record
            const { data: inserted, error: insertError } = await supabaseAdmin
                .from('defect_by_process')
                .insert({
                    line_id: lineId,
                    line_process_id,
                    shift_id: activeShift.id,
                    recorded_date: recordedDate,
                    recorded_hour: recordedHour,
                    total_produced: totalProduced,
                    total_pass: totalPass,
                    total_reject: totalReject,
                })
                .select()
                .single();

            if (insertError) {
                console.error('[defect_by_process] ✗ INSERT ERROR:', insertError.message, insertError.details, insertError.hint);
                return {
                    success: false,
                    step: 'insert',
                    line_process_id,
                    line_id: lineId,
                    machine_id: machineId,
                    machine_name: machineName,
                    shift_name: activeShift.shift_name,
                    recorded_date: recordedDate,
                    recorded_hour: recordedHour,
                    total_produced: totalProduced,
                    total_pass: totalPass,
                    total_reject: totalReject,
                    defect_rate: +defectRate.toFixed(2),
                    error: `Insert failed: ${insertError.message} | ${insertError.details || ''} | ${insertError.hint || ''}`,
                };
            }

            savedRow = inserted;
            console.log('[defect_by_process] ✓ INSERTED id:', savedRow?.id);
        }

        return {
            success: true,
            step: 'done',
            line_process_id,
            line_id: lineId,
            machine_id: machineId,
            machine_name: machineName,
            shift_name: activeShift.shift_name,
            recorded_date: recordedDate,
            recorded_hour: recordedHour,
            total_produced: totalProduced,
            total_pass: totalPass,
            total_reject: totalReject,
            defect_rate: +defectRate.toFixed(2),
        };
    } catch (err: any) {
        console.error('[defect_by_process] ✗ EXCEPTION:', err);
        return { success: false, step: 'exception', error: err.message };
    }
}

// ─── Read: Get defect data for a specific line_process ──────────────
export async function getDefectByProcess(
    line_process_id: string,
    date?: string,
    shift_id?: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
        let query = supabaseAdmin
            .from('defect_by_process')
            .select('*')
            .eq('line_process_id', line_process_id)
            .order('recorded_hour', { ascending: true });

        if (date) {
            query = query.eq('recorded_date', date);
        }
        if (shift_id) {
            query = query.eq('shift_id', shift_id);
        }

        const { data, error } = await query;

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Read: Get aggregated defect rate for a machine ─────────────────
export async function getMachineDefectRate(
    machine_id: string,
    date?: string,
    shift_id?: string
): Promise<{ success: boolean; data?: { totalProduced: number; totalPass: number; totalReject: number; defectRate: number }; error?: string }> {
    try {
        // Find all line_process_ids for this machine
        const { data: processes } = await supabaseAdmin
            .from('process')
            .select('id')
            .eq('machine_id', machine_id);

        if (!processes || processes.length === 0) {
            return { success: true, data: { totalProduced: 0, totalPass: 0, totalReject: 0, defectRate: 0 } };
        }

        const processIds = processes.map((p: any) => p.id);

        const { data: lineProcesses } = await supabaseAdmin
            .from('line_process')
            .select('id')
            .in('process_id', processIds);

        if (!lineProcesses || lineProcesses.length === 0) {
            return { success: true, data: { totalProduced: 0, totalPass: 0, totalReject: 0, defectRate: 0 } };
        }

        const lpIds = lineProcesses.map((lp: any) => lp.id);

        // Query defect_by_process
        let query = supabaseAdmin
            .from('defect_by_process')
            .select('total_produced, total_pass, total_reject')
            .in('line_process_id', lpIds);

        if (date) {
            query = query.eq('recorded_date', date);
        }
        if (shift_id) {
            query = query.eq('shift_id', shift_id);
        }

        const { data: records, error } = await query;

        if (error) {
            return { success: false, error: error.message };
        }

        let totalProduced = 0;
        let totalPass = 0;
        let totalReject = 0;

        (records || []).forEach((rec: any) => {
            totalProduced += Number(rec.total_produced) || 0;
            totalPass += Number(rec.total_pass) || 0;
            totalReject += Number(rec.total_reject) || 0;
        });

        const defectRate = totalProduced > 0 ? (totalReject / totalProduced) * 100 : 0;

        return {
            success: true,
            data: {
                totalProduced,
                totalPass,
                totalReject,
                defectRate: +defectRate.toFixed(2),
            },
        };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Format helper ──────────────────────────────────────────────────
export function formatDefectRate(rate: number | null | undefined): string {
    if (rate === null || rate === undefined || rate < 0) return '—';
    if (rate === 0) return '0%';
    return `${rate.toFixed(2)}%`;
}
