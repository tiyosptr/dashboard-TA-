/**
 * Service: Throughput Machine
 *
 * Rumus:  T_realtime = ΔQ / Δt
 *   ΔQ  = jumlah unit PASS dalam interval waktu terakhir (dari tabel data_items)
 *   Δt  = interval waktu pemantauan (default 10 detik)
 *
 * Skema tabel troughput_machine:
 *   id, troughput, total_pass, interval_time, machine_id, line_id, line_process_id
 *   (TANPA data_item_id, TANPA created_at)
 *
 * Strategi penyimpanan: UPSERT per machine_id
 *   → hapus record lama untuk machine ini, lalu insert baru.
 *   → sehingga selalu ada tepat 1 record terbaru per mesin.
 */

import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

// ─── Result type ──────────────────────────────────────────────────────
export interface ThroughputTriggerResult {
    success: boolean;
    step: string;
    machine_id?: string;
    machine_name?: string;
    line_id?: string;
    line_process_id?: string;
    total_pass?: number;
    interval_time?: number;
    throughput?: number;
    error?: string;
}

// ─────────────────────────────────────────────────────────────────────
// TRIGGER: Dipanggil saat data_item baru ditambahkan (pass/reject).
// Menghitung throughput dan menyimpan ke tabel troughput_machine.
// ─────────────────────────────────────────────────────────────────────
export async function triggerThroughputUpdate(
    line_process_id: string,
    intervalSeconds: number = 10
): Promise<ThroughputTriggerResult> {
    try {
        console.log('[throughput] ▶ START | line_process_id:', line_process_id, '| Δt:', intervalSeconds, 's');

        // ── 1. Resolve line_process → process → machine + line ────────
        const { data: lpData, error: lpError } = await supabaseAdmin
            .from('line_process')
            .select('id, line_id, process:process_id(id, name, machine_id)')
            .eq('id', line_process_id)
            .single();

        if (lpError || !lpData) {
            console.error('[throughput] ✗ line_process query failed:', lpError?.message);
            return { success: false, step: 'line_process_query', error: lpError?.message || 'No row' };
        }

        const process = lpData.process as any;
        if (!process) {
            return { success: false, step: 'no_process', error: `No process linked to line_process ${line_process_id}` };
        }

        const machine_id: string | null = process.machine_id ?? null;
        const line_id: string | null = lpData.line_id ?? null;

        if (!machine_id) {
            return { success: false, step: 'no_machine_id', error: `Process "${process.name}" has no machine_id` };
        }

        console.log('[throughput] machine_id:', machine_id, '| line_id:', line_id);

        // ── 2. Get machine name (untuk log saja) ──────────────────────
        const { data: machineRow } = await supabaseAdmin
            .from('machine')
            .select('name_machine')
            .eq('id', machine_id)
            .single();

        const machineName = machineRow?.name_machine || 'Unknown';

        // ── 3. Kumpulkan semua line_process_id milik mesin ini ────────
        //    Satu mesin bisa punya banyak process & line_process.
        //    ΔQ dihitung dari ALL line_process pada mesin.
        const { data: machineProcesses } = await supabaseAdmin
            .from('process')
            .select('id')
            .eq('machine_id', machine_id);

        let allLpIds: string[] = [line_process_id]; // minimal LP yang di-trigger

        if (machineProcesses && machineProcesses.length > 0) {
            const pIds = machineProcesses.map((p: any) => p.id);
            const { data: allLps } = await supabaseAdmin
                .from('line_process')
                .select('id')
                .in('process_id', pIds);

            if (allLps && allLps.length > 0) {
                allLpIds = allLps.map((lp: any) => lp.id);
            }
        }

        console.log('[throughput] Cakupan line_process_ids:', allLpIds.length, 'ids');

        // ── 4. Hitung ΔQ: jumlah item PASS dari data_items ───────────
        //    dalam Δt terakhir, untuk semua line_process milik mesin ini
        const now = new Date();
        const intervalStart = new Date(now.getTime() - intervalSeconds * 1000);

        console.log('[throughput] Interval:', intervalStart.toISOString(), '→', now.toISOString());

        const { count: passCount, error: countError } = await supabaseAdmin
            .from('data_items')
            .select('id', { count: 'exact', head: true })
            .in('line_process_id', allLpIds)
            .eq('status', 'pass')
            .gte('created_at', intervalStart.toISOString())
            .lte('created_at', now.toISOString());

        if (countError) {
            console.error('[throughput] ✗ count query error:', countError.message);
            return { success: false, step: 'count_pass', error: countError.message };
        }

        const totalPass = passCount ?? 0;

        // ── 5. Hitung Throughput T = ΔQ / Δt ─────────────────────────
        const throughputRaw = totalPass / intervalSeconds;
        const throughput = Math.round(throughputRaw * 10) / 10; // 1 desimal

        console.log(`[throughput] ΔQ=${totalPass} pass | Δt=${intervalSeconds}s | T=${throughput} unit/s`);

        // ── 6. Upsert ke troughput_machine ────────────────────────────
        //    Karena tabel tidak punya created_at, kita simpan hanya 1 record
        //    per machine_id dengan cara: DELETE lama → INSERT baru.
        //    Ini memastikan selalu ada nilai terbaru per mesin.

        // 6a. Hapus record lama untuk machine ini
        const { error: deleteError } = await supabaseAdmin
            .from('troughput_machine')
            .delete()
            .eq('machine_id', machine_id);

        if (deleteError) {
            // Bukan fatal — lanjut insert
            console.warn('[throughput] ⚠ Delete lama gagal (dilanjutkan):', deleteError.message);
        }

        // 6b. Insert record baru
        const insertPayload = {
            troughput: throughput,              // numeric (1 desimal precision)
            total_pass: totalPass,              // bigint
            interval_time: intervalSeconds,     // bigint
            machine_id,
            line_id: line_id ?? undefined,      // nullable
            line_process_id,
        };

        console.log('[throughput] Inserting:', JSON.stringify(insertPayload));

        const { data: savedRow, error: insertError } = await supabaseAdmin
            .from('troughput_machine')
            .insert(insertPayload)
            .select()
            .single();

        if (insertError) {
            console.error('[throughput] ✗ INSERT ERROR:', insertError.message, '|', insertError.details, '|', insertError.hint);
            return {
                success: false,
                step: 'insert',
                machine_id,
                machine_name: machineName,
                line_id: line_id ?? undefined,
                line_process_id,
                total_pass: totalPass,
                interval_time: intervalSeconds,
                throughput,
                error: `${insertError.message} | ${insertError.details || ''} | hint: ${insertError.hint || ''}`,
            };
        }

        console.log('[throughput] ✓ SAVED! id:', savedRow?.id, '| machine:', machineName, '| throughput:', throughput, 'unit/s');

        return {
            success: true,
            step: 'done',
            machine_id,
            machine_name: machineName,
            line_id: line_id ?? undefined,
            line_process_id,
            total_pass: totalPass,
            interval_time: intervalSeconds,
            throughput,
        };
    } catch (err: any) {
        console.error('[throughput] ✗ EXCEPTION:', err);
        return { success: false, step: 'exception', error: err.message };
    }
}

// ─────────────────────────────────────────────────────────────────────
// READ: Baca throughput terbaru untuk sebuah mesin.
// Karena skema punya machine_id langsung, query langsung ke tabel.
// ─────────────────────────────────────────────────────────────────────
export async function getLatestThroughput(
    machine_id: string
): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const { data, error } = await supabaseAdmin
            .from('troughput_machine')
            .select('*')
            .eq('machine_id', machine_id)
            .limit(1)
            .maybeSingle();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data: data ?? null };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─────────────────────────────────────────────────────────────────────
// READ HISTORY: Baca semua record throughput untuk sebuah mesin.
// (Berguna nanti jika ditambah created_at ke skema)
// ─────────────────────────────────────────────────────────────────────
export async function getThroughputHistory(
    machine_id: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
        const { data, error } = await supabaseAdmin
            .from('troughput_machine')
            .select('*')
            .eq('machine_id', machine_id);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data: data ?? [] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Format helper ────────────────────────────────────────────────────
export function formatThroughput(throughput: number | null | undefined): string {
    if (throughput === null || throughput === undefined || throughput < 0) return '—';
    if (throughput === 0) return '0 unit/s';
    if (throughput < 1) return `${(throughput * 60).toFixed(1)} unit/min`;
    return `${throughput} unit/s`;
}
