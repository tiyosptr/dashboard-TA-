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

/** Parse "HH:MM:SS" atau "HH:MM" → total menit dari midnight */
function timeToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

/**
 * Hitung durasi shift dalam detik.
 * Handle overnight shift (start > end): durasi melewati tengah malam.
 */
function shiftDurationSeconds(startTime: string, endTime: string): number {
    const startMin = timeToMinutes(startTime);
    const endMin   = timeToMinutes(endTime);

    if (endMin > startMin) {
        // Shift normal: mis. 07:00–15:00 → 8 jam
        return (endMin - startMin) * 60;
    } else {
        // Overnight: mis. 23:00–07:00 → (24*60 - startMin + endMin) * 60
        return (24 * 60 - startMin + endMin) * 60;
    }
}

/**
 * Ambil line_process VIFG (atau proses terakhir) untuk satu line.
 * Sama seperti di throughput_line.ts agar konsisten.
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

    // Cari VIFG; jika tidak ada, ambil proses terakhir
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
 *
 * @param line_id         UUID line yang dihitung
 * @param shift_id        UUID shift aktif (wajib agar operating_time akurat)
 * @param windowStart     Batas awal waktu query actual_output (ISO string)
 * @param windowEnd       Batas akhir waktu query actual_output (ISO string)
 */
export async function calculateLineCycleTime(
    line_id: string,
    shift_id: string,
    windowStart: Date,
    windowEnd: Date,
): Promise<CycleTimeLineResult> {
    try {
        console.log('[cycletime_line] ▶ START | line_id:', line_id, '| shift_id:', shift_id);

        // ── 1. Ambil data shift untuk operating time ───────────────────────
        const { data: shiftRow, error: shiftError } = await supabaseAdmin
            .from('shift')
            .select('id, shift_name, start_time, end_time')
            .eq('id', shift_id)
            .maybeSingle();

        if (shiftError || !shiftRow) {
            return {
                success: false, step: 'fetch_shift', line_id,
                error: shiftError?.message ?? `Shift ${shift_id} tidak ditemukan`,
            };
        }

        const operatingTimeSeconds = shiftDurationSeconds(shiftRow.start_time, shiftRow.end_time);
        console.log(`[cycletime_line] Operating time: ${operatingTimeSeconds} detik (${shiftRow.shift_name})`);

        // ── 2. Temukan line_process VIFG ──────────────────────────────────
        const vifgInfo = await getVifgLineProcess(line_id);
        if (!vifgInfo) {
            return {
                success: false, step: 'find_vifg', line_id,
                error: `Tidak ditemukan line_process untuk line_id: ${line_id}`,
            };
        }

        const { line_process_id, process_name } = vifgInfo;
        console.log('[cycletime_line] VIFG lp_id:', line_process_id, '(', process_name, ')');

        // ── 3. Hitung Total Output dari actual_output via VIFG ─────────────
        // actual_output → data_item_id → data_items.line_process_id = VIFG
        // Filter: output = 'pass', created_at dalam window shift

        // Ambil data_items IDs yang termasuk proses VIFG
        const { data: diRows, error: diError } = await supabaseAdmin
            .from('data_items')
            .select('id')
            .eq('line_process_id', line_process_id)
            .eq('status', 'pass');

        if (diError) {
            return {
                success: false, step: 'query_data_items', line_id, line_process_id,
                last_process_name: process_name, error: diError.message,
            };
        }

        const dataItemIds = (diRows ?? []).map((r: any) => r.id as string);

        if (dataItemIds.length === 0) {
            console.log('[cycletime_line] Tidak ada data_items pass di VIFG → CT tidak bisa dihitung');
            await insertCycleTimeLine({
                line_id, line_process_id, shift_id,
                actual_cycle_time: null,
                actual_output_id: null,
            });
            return {
                success: true, step: 'done_zero', line_id, line_process_id,
                last_process_name: process_name, shift_id,
                shift_name: shiftRow.shift_name,
                operating_time_seconds: operatingTimeSeconds,
                total_output: 0,
                actual_cycle_time: null,
            };
        }

        // Hitung actual_output pass dalam window waktu, chunked jika perlu
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

            if (aoError) {
                console.error('[cycletime_line] Error query actual_output:', aoError.message);
                continue;
            }

            totalOutput += (aoRows ?? []).length;
            if (!latestActualOutputId && aoRows && aoRows.length > 0) {
                latestActualOutputId = aoRows[0].id;
            }
        }

        console.log(`[cycletime_line] Total Output (VIFG pass): ${totalOutput}`);

        // ── 4. CT = Operating Time / Total Output ─────────────────────────
        let actualCycleTime: number | null = null;
        if (totalOutput > 0) {
            actualCycleTime = Math.round((operatingTimeSeconds / totalOutput) * 100) / 100;
        }
        console.log(`[cycletime_line] CT = ${actualCycleTime} detik/unit`);

        // ── 5. INSERT ke cycle_time_line ──────────────────────────────────
        await insertCycleTimeLine({
            line_id, line_process_id, shift_id,
            actual_cycle_time: actualCycleTime,
            actual_output_id: latestActualOutputId,
        });

        return {
            success: true, step: 'done', line_id, line_process_id,
            last_process_name: process_name, shift_id,
            shift_name: shiftRow.shift_name,
            operating_time_seconds: operatingTimeSeconds,
            total_output: totalOutput,
            actual_cycle_time: actualCycleTime,
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
        line_id:          payload.line_id,
        line_process_id:  payload.line_process_id,
        shift_id:         payload.shift_id,
        actual_cycle_time: payload.actual_cycle_time,
        actual_output_id: payload.actual_output_id ?? null,
    };

    console.log('[cycletime_line] Inserting:', JSON.stringify(row));

    const { error } = await supabaseAdmin.from('cycle_time_line').insert(row);
    if (error) {
        console.error('[cycletime_line] ✗ INSERT ERROR:', error.message);
        throw new Error(`cycle_time_line insert failed: ${error.message}`);
    }
    console.log('[cycletime_line] ✓ Saved | CT:', payload.actual_cycle_time, 'detik/unit');
}

// ─── READ Helpers ─────────────────────────────────────────────────────────────

/**
 * Ambil record cycle time terbaru untuk satu line.
 */
export async function getLatestLineCycleTime(
    line_id: string
): Promise<{ success: boolean; data?: CycleTimeLineRecord | null; error?: string }> {
    try {
        const { data, error } = await supabaseAdmin
            .from('cycle_time_line')
            .select('*')
            .eq('line_id', line_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) return { success: false, error: error.message };
        return { success: true, data: data ?? null };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Ambil history cycle time untuk satu line (default 24 titik terakhir).
 */
export async function getLineCycleTimeHistory(
    line_id: string,
    limit: number = 24
): Promise<{ success: boolean; data?: CycleTimeLineRecord[]; error?: string }> {
    try {
        const { data, error } = await supabaseAdmin
            .from('cycle_time_line')
            .select('*')
            .eq('line_id', line_id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) return { success: false, error: error.message };
        return { success: true, data: data ?? [] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Hitung CT secara langsung dari data yang ada tanpa INSERT ke DB.
 * Digunakan oleh summary API untuk mode real-time ringan.
 *
 * @param line_id         UUID line
 * @param shift_id        UUID shift aktif
 * @param windowStart     Batas awal waktu query
 * @param windowEnd       Batas akhir waktu query
 */
export async function computeLineCycleTimeReadOnly(
    line_id: string,
    shift_id: string | null,
    windowStart: Date,
    windowEnd: Date,
): Promise<{
    operating_time_seconds: number;
    total_output: number;
    actual_cycle_time: number | null;
    line_process_id: string | null;
    process_name: string | null;
    shift_name: string | null;
}> {
    const FALLBACK = {
        operating_time_seconds: 0,
        total_output: 0,
        actual_cycle_time: null,
        line_process_id: null,
        process_name: null,
        shift_name: null,
    };

    try {
        // 1. Operating time dari shift
        let operatingTimeSeconds = 0;
        let shiftName: string | null = null;

        if (shift_id) {
            const { data: shiftRow } = await supabaseAdmin
                .from('shift')
                .select('shift_name, start_time, end_time')
                .eq('id', shift_id)
                .maybeSingle();

            if (shiftRow) {
                operatingTimeSeconds = shiftDurationSeconds(shiftRow.start_time, shiftRow.end_time);
                shiftName = shiftRow.shift_name;
            }
        } else {
            // Tidak ada shift dipilih: gunakan durasi jendela waktu sekarang
            operatingTimeSeconds = Math.round((windowEnd.getTime() - windowStart.getTime()) / 1000);
        }

        // 2. VIFG line process
        const vifgInfo = await getVifgLineProcess(line_id);
        if (!vifgInfo) return FALLBACK;

        const { line_process_id, process_name } = vifgInfo;

        // 3. Data items VIFG pass
        const { data: diRows } = await supabaseAdmin
            .from('data_items')
            .select('id')
            .eq('line_process_id', line_process_id)
            .eq('status', 'pass');

        const dataItemIds = (diRows ?? []).map((r: any) => r.id as string);
        if (dataItemIds.length === 0) {
            return { ...FALLBACK, line_process_id, process_name, shift_name: shiftName, operating_time_seconds: operatingTimeSeconds };
        }

        // 4. Count actual_output pass dalam window, chunked
        const CHUNK = 50;
        let totalOutput = 0;

        for (let i = 0; i < dataItemIds.length; i += CHUNK) {
            const chunk = dataItemIds.slice(i, i + CHUNK);
            const { count } = await supabaseAdmin
                .from('actual_output')
                .select('id', { count: 'exact', head: true })
                .in('data_item_id', chunk)
                .eq('output', 'pass')
                .gte('created_at', windowStart.toISOString())
                .lte('created_at', windowEnd.toISOString());

            totalOutput += count ?? 0;
        }

        // 5. CT
        const actualCycleTime = (totalOutput > 0 && operatingTimeSeconds > 0)
            ? Math.round((operatingTimeSeconds / totalOutput) * 100) / 100
            : null;

        return {
            operating_time_seconds: operatingTimeSeconds,
            total_output: totalOutput,
            actual_cycle_time: actualCycleTime,
            line_process_id,
            process_name,
            shift_name: shiftName,
        };

    } catch (err: any) {
        console.error('[cycletime_line] computeReadOnly exception:', err.message);
        return FALLBACK;
    }
}

// ─── Format Helper ────────────────────────────────────────────────────────────

export function formatCycleTime(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined || seconds <= 0) return '—';
    if (seconds < 60) return `${seconds.toFixed(1)} det/unit`;
    const minutes = seconds / 60;
    return `${minutes.toFixed(2)} mnt/unit`;
}
