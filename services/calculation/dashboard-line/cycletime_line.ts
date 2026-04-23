/**
 * Service: Cycle Time Line (Dashboard)
 *
 * Rumus Inti:
 *   CT_line = Operating Time Line / Total Output (dari Proses Terakhir / VIFG)
 *
 * Operating Time Line
 *   = Durasi shift dalam detik (start_time → end_time pada tabel public.shift).
 *   Contoh: SHIFT-1 07:00–15:00 → 8 jam = 28.800 detik.
 *   Untuk shift overnight (misal 23:00–07:00) durasinya dihitung menyeberangi
 *   tengah malam.
 *
 * Total Output
 *   = Jumlah record di tabel actual_output dengan output = 'pass'
 *     yang data_item_id-nya mengarah ke data_items dengan line_process_id = VIFG
 *     (proses terakhir / proses dengan is_vifg = true) pada rentang waktu shift.
 *
 * Strategi penyimpanan: INSERT saja (tidak hapus/update record lama)
 *   → History terakumulasi → chart bisa menggambar tren dari waktu ke waktu.
 *
 * Tabel target: public.cycle_time_line
 */

import { supabaseAdmin } from '@/lib/supabase/supabase-admin';
import { calculateElapsedShiftTime } from '@/utils/helpers';
import { getActiveShiftWindow } from '../shift-window';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CycleTimeLineResult {
    success: boolean;
    step: string;
    line_id?: string;
    line_process_id?: string;
    last_process_name?: string;
    shift_id?: string | null;
    shift_name?: string | null;
    /** Durasi shift dalam detik */
    operating_time_seconds?: number;
    /** Jumlah unit pass dari VIFG pada shift ini */
    total_output?: number;
    /** CT = operating_time / total_output (detik/unit), null bila total_output = 0 */
    actual_cycle_time?: number | null;
    error?: string;
}

export interface CycleTimeLineRecord {
    id: string;
    created_at: string;
    actual_cycle_time: number | null;
    line_id: string | null;
    line_process_id: string | null;
    shift_id: string | null;
    actual_output_id: string | null;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Ambil line_process VIFG (atau proses terakhir) untuk satu line.
 */
async function getVifgLineProcess(
    line_id: string
): Promise<{ line_process_id: string; process_name: string } | null> {
    const { data, error } = await supabaseAdmin
        .from('line_process')
        .select('id, process_order, process:process_id(name)')
        .eq('line_id', line_id)
        .order('process_order', { ascending: true });

    if (error || !data || data.length === 0) {
        console.error('[cycletime_line] Error fetching line_processes:', error?.message);
        return null;
    }

    const vifg = data.find((lp: any) =>
        (lp.process as any)?.name?.toUpperCase() === 'VIFG'
    );
    const target = vifg ?? data[data.length - 1];

    return {
        line_process_id: target.id,
        process_name: (target.process as any)?.name ?? '',
    };
}

// ─── Core Calculation ─────────────────────────────────────────────────────────

/**
 * Menghitung Cycle Time Line dan menyimpannya ke tabel cycle_time_line.
 */
export async function calculateLineCycleTime(
    line_id: string,
    shift_id: string,
    windowStart: Date,
    windowEnd: Date,
): Promise<CycleTimeLineResult> {
    try {
        console.log('[cycletime_line] ▶ START | line_id:', line_id, '| shift_id:', shift_id);

        const window = await getActiveShiftWindow(shift_id);
        if (!window) {
            return {
                success: false, step: 'fetch_shift', line_id,
                error: `Active shift window not found`,
            };
        }

        const { 
            shift_id: activeShiftId, 
            shift_name, 
            total_shift_seconds,
            shift_start_ts,
            shift_end_ts
        } = window;

        // Temukan line_process VIFG
        const vifgInfo = await getVifgLineProcess(line_id);
        if (!vifgInfo) {
            return { success: false, step: 'find_vifg', line_id, error: `No VIFG process found` };
        }
        const { line_process_id, process_name } = vifgInfo;

        // Ambil data_items IDs VIFG pass
        const { data: diRows, error: diError } = await supabaseAdmin
            .from('data_items')
            .select('id')
            .eq('line_process_id', line_process_id)
            .eq('status', 'pass');

        if (diError) return { success: false, step: 'query_data_items', error: diError.message };

        const dataItemIds = (diRows ?? []).map((r: any) => r.id as string);
        if (dataItemIds.length === 0) {
            await insertCycleTimeLine({
                line_id, line_process_id, shift_id: activeShiftId,
                actual_cycle_time: null, actual_output_id: null,
            });
            return {
                success: true, step: 'done_zero', line_id, line_process_id,
                last_process_name: process_name, shift_id: activeShiftId,
                shift_name, operating_time_seconds: total_shift_seconds,
                total_output: 0, actual_cycle_time: null,
            };
        }

        // Count actual_output pass dalam window
        const CHUNK = 50;
        let totalOutput = 0;
        let latestActualOutputId: string | null = null;

        for (let i = 0; i < dataItemIds.length; i += CHUNK) {
            const chunk = dataItemIds.slice(i, i + CHUNK);
            const { data: aoRows, error: aoError } = await supabaseAdmin
                .from('actual_output')
                .select('id, output')
                .in('data_item_id', chunk)
                .eq('output', 'pass')
                .gte('created_at', windowStart.toISOString())
                .lte('created_at', windowEnd.toISOString())
                .order('created_at', { ascending: false });

            if (aoError) continue;
            totalOutput += (aoRows ?? []).length;
            if (!latestActualOutputId && aoRows && aoRows.length > 0) latestActualOutputId = aoRows[0].id;
        }

        const actualCycleTime = (totalOutput > 0) ? Math.round((total_shift_seconds / totalOutput) * 100) / 100 : null;

        await insertCycleTimeLine({
            line_id, line_process_id, shift_id: activeShiftId,
            actual_cycle_time: actualCycleTime, actual_output_id: latestActualOutputId,
        });

        return {
            success: true, step: 'done', line_id, line_process_id,
            last_process_name: process_name, shift_id: activeShiftId,
            shift_name, operating_time_seconds: total_shift_seconds,
            total_output: totalOutput, actual_cycle_time: actualCycleTime,
        };

    } catch (err: any) {
        console.error('[cycletime_line] ✗ EXCEPTION:', err);
        return { success: false, step: 'exception', error: err.message };
    }
}

// ─── Insert Helper ────────────────────────────────────────────────────────────

interface InsertCycleTimePayload {
    line_id: string;
    line_process_id: string;
    shift_id: string;
    actual_cycle_time: number | null;
    actual_output_id: string | null;
}

async function insertCycleTimeLine(payload: InsertCycleTimePayload): Promise<void> {
    const row = {
        line_id: payload.line_id,
        line_process_id: payload.line_process_id,
        shift_id: payload.shift_id,
        actual_cycle_time: payload.actual_cycle_time,
        actual_output_id: payload.actual_output_id ?? null,
    };
    await supabaseAdmin.from('cycle_time_line').insert(row);
}

// ─── READ Helpers ─────────────────────────────────────────────────────────────

export async function getLatestLineCycleTime(line_id: string) {
    const { data, error } = await supabaseAdmin
        .from('cycle_time_line')
        .select('*')
        .eq('line_id', line_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    return { success: !error, data, error: error?.message };
}

export async function getLineCycleTimeHistory(line_id: string, limit: number = 24) {
    const { data, error } = await supabaseAdmin
        .from('cycle_time_line')
        .select('*')
        .eq('line_id', line_id)
        .order('created_at', { ascending: false })
        .limit(limit);
    return { success: !error, data: data ?? [], error: error?.message };
}

/**
 * Hitung CT secara langsung dari data yang ada tanpa INSERT ke DB.
 */
export async function computeLineCycleTimeRealtime(
    line_id: string,
    shift_id?: string | null,
) {
    const FALLBACK = {
        operating_time_seconds: 0,
        total_output: 0,
        actual_cycle_time: null,
        line_process_id: null,
        process_name: null,
        shift_name: null,
    };

    try {
        const window = await getActiveShiftWindow(shift_id);
        if (!window) return FALLBACK;

        const { shift_name, shift_start_ts, shift_end_ts } = window;
        const operatingTimeSec = calculateElapsedShiftTime(shift_start_ts, shift_end_ts);

        const vifgInfo = await getVifgLineProcess(line_id);
        if (!vifgInfo) return { ...FALLBACK, shift_name };
        const { line_process_id, process_name } = vifgInfo;

        const { count } = await supabaseAdmin
            .from('data_items')
            .select('*', { count: 'exact', head: true })
            .eq('line_process_id', line_process_id)
            .eq('status', 'pass')
            .gte('created_at', shift_start_ts)
            .lte('created_at', shift_end_ts);

        const totalOutput = count || 0;
        const actualCycleTime = (totalOutput > 0 && operatingTimeSec > 0)
            ? Math.round((operatingTimeSec / totalOutput) * 100) / 100
            : null;

        return {
            operating_time_seconds: operatingTimeSec,
            total_output: totalOutput,
            actual_cycle_time: actualCycleTime,
            line_process_id,
            process_name,
            shift_name,
        };
    } catch (err: any) {
        console.error('[cycletime_line] Realtime exception:', err.message);
        return FALLBACK;
    }
}

export function formatCycleTime(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined || seconds <= 0) return '—';
    if (seconds < 60) return `${seconds.toFixed(1)} sec`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
    return `${(seconds / 3600).toFixed(1)} hour`;
}
