/**
 * Service: Throughput Line (Dashboard)
 *
 * Rumus Inti:  T = ΔQ / Δt
 *
 * ΔQ (Delta Quantity)
 *   = Jumlah unit yang sudah melewati proses VIFG dengan status 'pass'
 *     dalam time-window yang ditentukan.
 *   ⚠ Standar PT: VIFG adalah gerbang validasi akhir. Unit baru dihitung
 *     sebagai output lini SETELAH lolos VIFG. Ini mencegah double counting
 *     (1 unit melewati N proses ≠ N unit diproduksi).
 *
 * Δt (Delta Time)
 *   = MAX(created_at pada VIFG) − MIN(created_at pada process PERTAMA)
 *     untuk SN-SN yang sama, dikonversi ke JAM.
 *
 * Strategi penyimpanan: INSERT saja (tidak hapus record lama)
 *   → History terakumulasi → chart bisa menggambar garis dari waktu ke waktu.
 *
 * Tabel target: public.troughput_line
 */

import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ThroughputLineResult {
    success: boolean;
    step: string;
    line_id?: string;
    line_process_id?: string;
    last_process_name?: string;
    shift_id?: string | null;
    shift_name?: string | null;
    total_pass?: number;
    interval_minutes?: number;
    actual_throughput?: number;
    rate?: number;
    error?: string;
}

export interface ThroughputLineRecord {
    id: string;
    line_id: string | null;
    line_process_id: string | null;
    data_items_id: string | null;
    actual_trougput: number | null;
    actual_troughput: number | null;
    shift_id: string | null;
    rate: number | null;
    total_pass: number | null;
    eff: number | null;
    interval_time: number | null;
    created_at: string;
}

// ─── Internal helper types ─────────────────────────────────────────────────────

interface LineProcessRow {
    id: string;
    process_order: number;
    process_name: string;
    is_vifg: boolean;
}

// ─── Helper: Deteksi shift aktif berdasarkan waktu saat ini ──────────────────

/**
 * Mengambil shift yang sedang aktif saat ini dari tabel public.shift.
 *
 * Logika pencocokan waktu:
 *   - Shift normal   (start < end)  : start_time <= now <= end_time
 *   - Shift tengah malam (start > end): now >= start_time ATAU now <= end_time
 *     Contoh: SHIFT-3 23:00-07:00 → aktif saat jam 23:xx ATAU jam 00:xx-07:xx
 *
 * @returns { shift_id, shift_name } atau null jika tidak ada shift aktif
 */
export async function getCurrentActiveShift(): Promise<{
    shift_id: string;
    shift_name: string;
} | null> {
    try {
        const { data: shifts, error } = await supabaseAdmin
            .from('shift')
            .select('id, shift_name, start_time, end_time');

        if (error || !shifts || shifts.length === 0) {
            console.warn('[throughput_line] Tidak dapat mengambil data shift:', error?.message);
            return null;
        }

        // Waktu sekarang dalam format HH:MM (lokal server)
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        for (const shift of shifts) {
            // Parse "HH:MM:SS" → menit sejak midnight
            const parseTime = (t: string): number => {
                const [h, m] = t.split(':').map(Number);
                return h * 60 + (m || 0);
            };

            const startMin = parseTime(shift.start_time);
            const endMin   = parseTime(shift.end_time);

            let isActive: boolean;

            if (startMin < endMin) {
                // Shift normal: 07:00–15:00 atau 15:00–23:00
                isActive = currentMinutes >= startMin && currentMinutes < endMin;
            } else {
                // Shift tengah malam: 23:00–07:00
                isActive = currentMinutes >= startMin || currentMinutes < endMin;
            }

            if (isActive) {
                console.log('[throughput_line] Shift aktif:', shift.shift_name, '(', shift.start_time, '-', shift.end_time, ')');
                return { shift_id: shift.id, shift_name: shift.shift_name };
            }
        }

        console.warn('[throughput_line] Tidak ada shift yang cocok dengan jam saat ini:', now.toLocaleTimeString());
        return null;
    } catch (err: any) {
        console.error('[throughput_line] Exception saat cari shift:', err.message);
        return null;
    }
}

// ─── Helper: Ambil semua line_process untuk satu line ────────────────────────

async function getAllLineProcesses(line_id: string): Promise<LineProcessRow[]> {
    const { data, error } = await supabaseAdmin
        .from('line_process')
        .select('id, process_order, process:process_id(name)')
        .eq('line_id', line_id)
        .order('process_order', { ascending: true });

    if (error || !data) {
        console.error('[throughput_line] Error fetching line_processes:', error?.message);
        return [];
    }

    return data.map((lp: any) => ({
        id: lp.id,
        process_order: Number(lp.process_order),
        process_name: (lp.process as any)?.name ?? '',
        is_vifg: (lp.process as any)?.name?.toUpperCase() === 'VIFG',
    }));
}

export async function getLastLineProcessId(
    line_id: string
): Promise<{ line_process_id: string; process_name: string } | null> {
    const processes = await getAllLineProcesses(line_id);
    if (processes.length === 0) return null;

    const vifgRow = processes.find(p => p.is_vifg);
    if (vifgRow) return { line_process_id: vifgRow.id, process_name: vifgRow.process_name };

    const lastRow = processes[processes.length - 1];
    return { line_process_id: lastRow.id, process_name: lastRow.process_name };
}

// ─── Core Calculation ─────────────────────────────────────────────────────────

/**
 * Menghitung Throughput Line (T = ΔQ / Δt) dan menyimpannya.
 *
 * @param line_id         UUID line yang dihitung
 * @param windowMinutes   Lebar time-window dalam menit (default: 10)
 * @param shift_id        UUID shift aktif — jika null, akan auto-detect
 * @param target_per_hour Target produksi per jam (default: 500)
 */
export async function calculateLineThroughput(
    line_id: string,
    windowMinutes: number = 10,
    shift_id?: string | null,
    target_per_hour: number = 500
): Promise<ThroughputLineResult> {
    try {
        console.log('[throughput_line] ▶ START | line_id:', line_id, '| window:', windowMinutes, 'min');

        // ── 1. Auto-deteksi shift jika belum disediakan ───────────────────
        let activeShiftId   = shift_id ?? null;
        let activeShiftName: string | null = null;

        if (!activeShiftId) {
            const activeShift = await getCurrentActiveShift();
            if (activeShift) {
                activeShiftId   = activeShift.shift_id;
                activeShiftName = activeShift.shift_name;
            }
        }

        console.log('[throughput_line] Shift aktif:', activeShiftId, '|', activeShiftName);

        // ── 2. Temukan proses terakhir (VIFG) ────────────────────────────
        const allProcesses = await getAllLineProcesses(line_id);

        if (allProcesses.length === 0) {
            return {
                success: false, step: 'find_processes', line_id,
                error: `Tidak ditemukan line_process untuk line_id: ${line_id}`,
            };
        }

        const vifgProcess = allProcesses.find(p => p.is_vifg)
            ?? allProcesses[allProcesses.length - 1];
        const firstProcess = allProcesses[0];

        const line_process_id = vifgProcess.id;
        const process_name    = vifgProcess.process_name;

        console.log('[throughput_line] VIFG lp_id:', line_process_id, '| processes:', allProcesses.length);

        // ── 3. Ambil data_items PASS di VIFG dalam window (→ ΔQ) ─────────
        const now         = new Date();
        const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

        const { data: vifgItems, error: vifgError } = await supabaseAdmin
            .from('data_items')
            .select('id, sn, created_at')
            .eq('line_process_id', line_process_id)
            .eq('status', 'pass')
            .gte('created_at', windowStart.toISOString())
            .lte('created_at', now.toISOString())
            .order('created_at', { ascending: true });

        if (vifgError) {
            return {
                success: false, step: 'query_vifg_items', line_id, line_process_id,
                last_process_name: process_name, error: vifgError.message,
            };
        }

        // ── 4. ΔQ ─────────────────────────────────────────────────────────
        const deltaQ = vifgItems?.length ?? 0;

        if (deltaQ === 0) {
            console.log('[throughput_line] ΔQ = 0 — tidak ada unit pass di VIFG dalam window.');
            await insertThroughputLine({
                line_id, line_process_id, data_items_id: null,
                actual_troughput: 0, shift_id: activeShiftId,
                rate: 0, total_pass: 0, eff: 0, interval_time: windowMinutes,
            });
            return {
                success: true, step: 'done_zero', line_id, line_process_id,
                last_process_name: process_name, shift_id: activeShiftId,
                shift_name: activeShiftName, total_pass: 0,
                interval_minutes: 0, actual_throughput: 0, rate: 0,
            };
        }

        // ── 5. Δt: MAX(VIFG) − MIN(first process) ────────────────────────
        const maxVifgTs      = new Date(vifgItems![vifgItems!.length - 1].created_at).getTime();
        const latestVifgItem = vifgItems![vifgItems!.length - 1];

        const vifgSns: string[] = vifgItems!
            .map(item => item.sn)
            .filter((sn): sn is string => !!sn);

        let minFirstProcessTs: number | null = null;

        if (vifgSns.length > 0 && firstProcess.id !== line_process_id) {
            const { data: firstItems, error: firstError } = await supabaseAdmin
                .from('data_items')
                .select('sn, created_at')
                .eq('line_process_id', firstProcess.id)
                .in('sn', vifgSns)
                .order('created_at', { ascending: true })
                .limit(1);

            if (!firstError && firstItems && firstItems.length > 0) {
                minFirstProcessTs = new Date(firstItems[0].created_at).getTime();
            }
        }

        // Fallback ke MIN(VIFG created_at) jika proses pertama tidak ada datanya
        if (minFirstProcessTs === null) {
            minFirstProcessTs = new Date(vifgItems![0].created_at).getTime();
        }

        const deltaTMs      = maxVifgTs - minFirstProcessTs;
        const deltaTHours   = deltaTMs / (1000 * 60 * 60);
        const deltaTMinutes = deltaTMs / (1000 * 60);

        console.log(`[throughput_line] ΔQ=${deltaQ} | Δt=${deltaTMinutes.toFixed(2)} menit`);

        // ── 6. T = ΔQ / Δt ────────────────────────────────────────────────
        let actualThroughput: number;
        if (deltaTHours < 1 / 3600) {
            actualThroughput = deltaQ / (windowMinutes / 60);
        } else {
            actualThroughput = deltaQ / deltaTHours;
        }
        actualThroughput = Math.round(actualThroughput * 100) / 100;

        // ── 7. Rate dan Efficiency ────────────────────────────────────────
        const rate = target_per_hour > 0
            ? Math.round((actualThroughput / target_per_hour) * 10000) / 10000
            : 0;
        const eff = Math.round(rate * 10000) / 100;

        console.log(`[throughput_line] T=${actualThroughput} unit/jam | Eff=${eff}% | Shift: ${activeShiftName}`);

        // ── 8. INSERT ke troughput_line (tanpa delete) ────────────────────
        await insertThroughputLine({
            line_id, line_process_id,
            data_items_id: latestVifgItem.id,
            actual_troughput: actualThroughput,
            shift_id: activeShiftId,
            rate, total_pass: deltaQ, eff,
            interval_time: Math.round(deltaTMinutes * 100) / 100,
        });

        return {
            success: true, step: 'done', line_id, line_process_id,
            last_process_name: process_name, shift_id: activeShiftId,
            shift_name: activeShiftName, total_pass: deltaQ,
            interval_minutes: Math.round(deltaTMinutes * 100) / 100,
            actual_throughput: actualThroughput, rate,
        };

    } catch (err: any) {
        console.error('[throughput_line] ✗ EXCEPTION:', err);
        return { success: false, step: 'exception', error: err.message };
    }
}

// ─── Insert Helper (tanpa delete — history terakumulasi) ──────────────────────

interface InsertPayload {
    line_id: string;
    line_process_id: string;
    data_items_id: string | null;
    actual_troughput: number;
    shift_id: string | null;
    rate: number;
    total_pass: number;
    eff: number;
    interval_time: number;
}

/**
 * INSERT record baru tanpa menghapus record lama.
 * Strategi ini memungkinkan history terakumulasi sehingga chart bisa
 * menampilkan tren throughput dari waktu ke waktu.
 */
async function insertThroughputLine(payload: InsertPayload): Promise<void> {
    const insertRow = {
        line_id:          payload.line_id,
        line_process_id:  payload.line_process_id,
        data_items_id:    payload.data_items_id   ?? null,
        actual_troughput: payload.actual_troughput,
        shift_id:         payload.shift_id         ?? null,
        rate:             payload.rate,
        total_pass:       payload.total_pass,
        eff:              payload.eff,
        interval_time:    payload.interval_time,
    };

    console.log('[throughput_line] Inserting:', JSON.stringify(insertRow));

    const { error: insertError } = await supabaseAdmin
        .from('troughput_line')
        .insert(insertRow);

    if (insertError) {
        console.error(
            '[throughput_line] ✗ INSERT ERROR:', insertError.message,
            '| details:', insertError.details,
            '| hint:', insertError.hint,
            '| code:', insertError.code,
        );
        throw new Error(
            `troughput_line insert failed: ${insertError.message} | hint: ${insertError.hint || '-'}`
        );
    }

    console.log('[throughput_line] ✓ Saved | T:', payload.actual_troughput, 'unit/jam | shift:', payload.shift_id);
}

// ─── READ helpers ─────────────────────────────────────────────────────────────

export async function getLatestLineThroughput(
    line_id: string
): Promise<{ success: boolean; data?: ThroughputLineRecord | null; error?: string }> {
    try {
        const { data, error } = await supabaseAdmin
            .from('troughput_line')
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

export async function getLineThroughputHistory(
    line_id: string,
    limit: number = 24
): Promise<{ success: boolean; data?: ThroughputLineRecord[]; error?: string }> {
    try {
        const { data, error } = await supabaseAdmin
            .from('troughput_line')
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

// ─── Format Helper ────────────────────────────────────────────────────────────

export function formatLineThroughput(throughput: number | null | undefined): string {
    if (throughput === null || throughput === undefined || throughput < 0) return '—';
    if (throughput === 0) return '0 unit/jam';
    return `${throughput.toLocaleString('id-ID', { maximumFractionDigits: 1 })} unit/jam`;
}
