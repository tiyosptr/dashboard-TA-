/**
 * Service: OEE Line Calculation (Dashboard)
 *
 * Rumus OEE:
 *   OEE = Availability × Performance × Quality
 *
 * ─────────────────────────────────────────────
 *  Availability = Operating Time / Planned Production Time
 *
 *  Planned Production Time = Total Shift Time − Planned Downtime
 *    - Total Shift Time  : dari tabel shift (start_time – end_time), default 8 jam
 *    - Planned Downtime  : istirahat (60 mnt) + jadwal maintenance mesin
 *                          (diambil dari machine.next_maintenance jika jatuh di
 *                          window shift hari ini, asumsi durasi 30 mnt per mesin)
 *
 *  Operating Time = Planned Production Time − Unplanned Downtime
 *    - Unplanned Downtime: SUM(duration_seconds) dari machine_status_log
 *      dimana status = 'downtime' dalam window waktu shift.
 * ─────────────────────────────────────────────
 *
 * Tabel target: public.oee_line
 */

import { supabaseAdmin } from '@/lib/supabase/supabase-admin';
import { getActiveShiftWindow } from '../shift-window';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OeeLineResult {
    line_id: string;
    shift_id: string;
    shift_name: string;
    /** Waktu shift dalam detik */
    total_shift_seconds: number;
    /** Istirahat dalam detik */
    break_seconds: number;
    /** Scheduled maintenance dalam detik (dari machine.next_maintenance) */
    scheduled_maintenance_seconds: number;
    /** Planned downtime = break + scheduled_maintenance */
    planned_downtime_seconds: number;
    /** Planned production time = total_shift − planned_downtime */
    planned_production_seconds: number;
    /** Unplanned downtime dari machine_status_log status='downtime' */
    unplanned_downtime_seconds: number;
    /** Operating time = planned_production − unplanned_downtime */
    operating_time_seconds: number;
    /** Availability ratio 0–1 */
    availability: number;
    /** Availability persen 0–100 */
    availability_pct: number;
    /** Output yang lulus VIFG (pass) */
    good_output: number;
    /** Output yang gagal VIFG (reject) */
    reject_output: number;
    /** Total produksi = Good + Reject */
    total_production: number;
    /** Quality ratio 0–1 */
    quality: number;
    /** Quality persen 0–100 */
    quality_pct: number;
    /** Performance ratio 0–1 */
    performance: number;
    /** Performance persen 0–100 */
    performance_pct: number;
    /** Target ideal berdasarkan operating time */
    target_ideal: number;
    /** Timestamp window awal shift */
    shift_start_ts: string;
    /** Timestamp window akhir shift */
    shift_end_ts: string;
    /** Jumlah mesin yang masuk jadwal maintenance dalam shift */
    scheduled_machines_count: number;
}

export interface OeeLineCalculationError {
    success: false;
    step: string;
    error: string;
}

// ─── Konstanta ────────────────────────────────────────────────────────────────

/** Durasi istirahat karyawan per shift (menit) */
const BREAK_MINUTES = 60;

/** Estimasi durasi 1 sesi scheduled maintenance (menit) per mesin */
const SCHEDULED_MAINTENANCE_DURATION_MINUTES = 30;

// ─── Helpers removed (moved to shift-window.ts) ──────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Menghitung Quality berdasarkan tabel data_items (VIFG).
 * Quality = Good / (Good + Reject)
 * 
 * Menggunakan shift window untuk query data
 */
export async function calculateLineQuality(
    line_id: string,
    shift_start_ts: string,
    shift_end_ts: string
): Promise<{ good: number; reject: number; total: number; ratio: number; pct: number }> {
    // 1. Ambil line_process_id yang merupakan VIFG untuk line ini
    const { data: vifgProcess } = await supabaseAdmin
        .from('line_process')
        .select('id, process:process_id(name)')
        .eq('line_id', line_id)
        .order('process_order', { ascending: false });

    const vifgRow = (vifgProcess ?? []).find(p => (p.process as any)?.name?.toUpperCase() === 'VIFG') 
                    || (vifgProcess ? vifgProcess[0] : null);

    if (!vifgRow) return { good: 0, reject: 0, total: 0, ratio: 0, pct: 0 };

    // 2. Gunakan shift window untuk query
    const shiftStart = new Date(shift_start_ts);
    const shiftEnd = new Date(shift_end_ts);

    console.log('[OEE Quality] Using shift window:', {
        line_process_id: vifgRow.id,
        shift_start: shiftStart.toISOString(),
        shift_end: shiftEnd.toISOString(),
    });

    // 3. Hitung Good (Pass) - Langsung dari data_items menggunakan vifgRow.id
    const { count: goodCount } = await supabaseAdmin
        .from('data_items')
        .select('*', { count: 'exact', head: true })
        .eq('line_process_id', vifgRow.id)
        .eq('status', 'pass')
        .gte('created_at', shiftStart.toISOString())
        .lt('created_at', shiftEnd.toISOString());

    // 4. Hitung Reject
    const { count: rejectCount } = await supabaseAdmin
        .from('data_items')
        .select('*', { count: 'exact', head: true })
        .eq('line_process_id', vifgRow.id)
        .eq('status', 'reject')
        .gte('created_at', shiftStart.toISOString())
        .lt('created_at', shiftEnd.toISOString());

    const good = goodCount || 0;
    const reject = rejectCount || 0;
    const total = good + reject;
    const ratio = total > 0 ? good / total : 0;
    const pct = Math.round(ratio * 10000) / 100;

    console.log('[OEE Quality] Result:', { good, reject, total, pct });

    return { good, reject, total, ratio, pct };
}

/**
 * Menghitung Performance Lini berdasarkan total aktual / target ideal
 * 
 * Menggunakan shift window untuk query data
 * 
 * @param line_id - UUID line
 * @param shift_start_ts - Timestamp awal shift (ISO)
 * @param shift_end_ts - Timestamp akhir shift (ISO)
 * @param operating_time_seconds - Operating time (dalam detik)
 * @param target_per_hour - Target produksi per jam (default 100)
 */
export async function calculateLinePerformance(
    line_id: string,
    shift_start_ts: string,
    shift_end_ts: string,
    operating_time_seconds: number,
    target_per_hour: number = 100
): Promise<{ target_ideal: number; total_actual: number; performance_ratio: number; performance_pct: number }> {

    // 1. Ambil line_process_id untuk proses terakhir (End-Of-Line / VIFG)
    const { data: vifgProcess } = await supabaseAdmin
        .from('line_process')
        .select('id, process:process_id(name)')
        .eq('line_id', line_id)
        .order('process_order', { ascending: false });

    // Cari proses dengan nama VIFG, atau ambil proses dengan order tertinggi (fallback)
    const vifgRow = (vifgProcess ?? []).find(p => (p.process as any)?.name?.toUpperCase() === 'VIFG') 
                    || (vifgProcess ? vifgProcess[0] : null);

    if (!vifgRow) {
        return { target_ideal: 0, total_actual: 0, performance_ratio: 0, performance_pct: 0 };
    }

    // 2. Gunakan shift window untuk query
    const shiftStart = new Date(shift_start_ts);
    const shiftEnd = new Date(shift_end_ts);

    console.log('[OEE Performance] Using shift window:', {
        line_process_id: vifgRow.id,
        shift_start: shiftStart.toISOString(),
        shift_end: shiftEnd.toISOString(),
    });

    // 3. Query ke tabel data_items untuk menghitung total_produced (Pass + Reject)
    const { count: total_actual, error } = await supabaseAdmin
        .from('data_items')
        .select('*', { count: 'exact', head: true })
        .eq('line_process_id', vifgRow.id)
        .in('status', ['pass', 'reject']) // Memfilter hanya status pass dan reject
        .gte('created_at', shiftStart.toISOString())
        .lt('created_at', shiftEnd.toISOString());

    const actual = total_actual || 0;

    // 4. Kalkulasi Target Ideal Lini
    // Target Ideal = (Operating Time dalam Jam) * target_per_hour
    const operating_hours = operating_time_seconds / 3600;
    const target_ideal = operating_hours * target_per_hour;

    // 5. Hitung Performance Ratio
    // Cegah pembagian dengan nol jika tidak ada target ideal (mesin mati)
    let performance_ratio = 0;
    if (target_ideal > 0) {
        performance_ratio = actual / target_ideal;
    }

    // Konversi ke persentase dengan pembulatan 2 angka desimal
    const performance_pct = Math.round(performance_ratio * 10000) / 100;

    console.log('[OEE Performance] Result:', { 
        total_actual: actual, 
        target_ideal, 
        operating_hours: operating_hours.toFixed(2),
        performance_pct 
    });

    return { 
        target_ideal, 
        total_actual: actual, 
        performance_ratio, 
        performance_pct 
    };
}


// ─── Core Calculation ─────────────────────────────────────────────────────────

/**
 * Menghitung Availability untuk satu line pada shift tertentu.
 *
 * @param line_id   - UUID line
 * @param shift_id  - UUID shift; jika null, dideteksi otomatis dari jam sekarang
 * @param baseDate  - Tanggal referensi (default: now)
 */
export async function calculateLineAvailability(
    line_id: string,
    shift_id?: string | null,
    baseDate?: Date,
): Promise<OeeLineResult | OeeLineCalculationError> {
    const today = baseDate ?? new Date();

    // ─── Langkah 1: Ambil / Deteksi Shift Window ──────────────────────────
    const window = await getActiveShiftWindow(shift_id, baseDate);
    if (!window) {
        return { success: false, step: 'detect_shift', error: 'No active shift found' };
    }

    const { 
        shift_id: activeShiftId, 
        shift_name, 
        shift_start_ts, 
        shift_end_ts, 
        total_shift_seconds 
    } = window;

    const shiftStart = new Date(shift_start_ts);
    const shiftEnd = new Date(shift_end_ts);

    // ─── Langkah 2a: Kumpulkan machine_id di line ────────────────────────
    const { data: lineProcesses } = await supabaseAdmin
        .from('line_process')
        .select('id, process(machine_id)')
        .eq('line_id', line_id);

    const machineIds: string[] = [];
    (lineProcesses ?? []).forEach((lp: any) => {
        const mid = lp.process?.machine_id;
        if (mid && !machineIds.includes(mid)) machineIds.push(mid);
    });

    // ─── Langkah 2b: Scheduled Maintenance dari machine.next_maintenance ──
    // Cek tabel machine: jika next_maintenance jatuh pada tanggal hari ini
    // DAN waktunya masuk dalam window shift ini → masuk planned downtime.
    // Jika tanggal berbeda atau tidak ada jadwal → scheduled_maintenance = 0.
    let scheduled_machines_count = 0;

    if (machineIds.length > 0) {
        const { data: machinesData } = await supabaseAdmin
            .from('machine')
            .select('id, next_maintenance')
            .in('id', machineIds);

        // Buat date-only string hari ini dalam format lokal "YYYY-MM-DD"
        const todayDateStr = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, '0'),
            String(today.getDate()).padStart(2, '0'),
        ].join('-');

        (machinesData ?? []).forEach((m: any) => {
            if (!m.next_maintenance) return;

            const nextMaint = new Date(m.next_maintenance);

            // Langkah 1: Cek apakah tanggalnya hari ini
            const maintDateStr = [
                nextMaint.getFullYear(),
                String(nextMaint.getMonth() + 1).padStart(2, '0'),
                String(nextMaint.getDate()).padStart(2, '0'),
            ].join('-');

            if (maintDateStr !== todayDateStr) return; // beda tanggal → skip

            // Langkah 2: Cek apakah waktu maintenance masuk dalam window shift
            if (nextMaint >= shiftStart && nextMaint <= shiftEnd) {
                scheduled_machines_count++;
            }
        });
    }

    const break_seconds = BREAK_MINUTES * 60;
    const scheduled_maintenance_seconds =
        scheduled_machines_count * SCHEDULED_MAINTENANCE_DURATION_MINUTES * 60;
    const planned_downtime_seconds = break_seconds + scheduled_maintenance_seconds;
    const planned_production_seconds = Math.max(total_shift_seconds - planned_downtime_seconds, 0);

    // ─── Langkah 3: Unplanned Downtime dari machine_status_log ───────────
    let unplanned_downtime_seconds = 0;

    console.log('[OEE Availability] Checking downtime for machines:', {
        machine_count: machineIds.length,
        machine_ids: machineIds,
        shift_start: shiftStart.toISOString(),
        shift_end: shiftEnd.toISOString(),
    });

    if (machineIds.length > 0) {
        const CHUNK = 20;
        const chunks: string[][] = [];
        for (let i = 0; i < machineIds.length; i += CHUNK) {
            chunks.push(machineIds.slice(i, i + CHUNK));
        }

        const downtimeResults = await Promise.all(
            chunks.map(async (chunk) => {
                const { data, error } = await supabaseAdmin
                    .from('machine_status_log')
                    .select('machine_id, start_time, end_time, duration_seconds, status')
                    .in('machine_id', chunk)
                    .eq('status', 'downtime')
                    .gte('start_time', shiftStart.toISOString())
                    .lt('start_time', shiftEnd.toISOString()); // Changed from lte to lt

                if (error) {
                    console.error('[OEE Availability] Error querying downtime:', error);
                    return 0;
                }

                console.log('[OEE Availability] Downtime records found:', {
                    chunk_size: chunk.length,
                    records_count: data?.length || 0,
                    records: data?.map(r => ({
                        machine_id: r.machine_id,
                        start: r.start_time,
                        end: r.end_time,
                        duration: r.duration_seconds
                    }))
                });

                return (data ?? []).reduce((acc: number, row: any) => {
                    let duration = 0;
                    
                    if (row.duration_seconds != null && row.duration_seconds > 0) {
                        duration = Number(row.duration_seconds);
                    } else if (row.end_time) {
                        duration = (new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / 1000;
                    } else {
                        // Status masih berjalan → hitung sejak start sampai sekarang/akhir shift
                        const now = new Date();
                        const endRef = now < shiftEnd ? now : shiftEnd;
                        duration = (endRef.getTime() - new Date(row.start_time).getTime()) / 1000;
                    }
                    
                    duration = Math.max(duration, 0);
                    console.log('[OEE Availability] Downtime duration calculated:', {
                        machine_id: row.machine_id,
                        duration_seconds: duration,
                        duration_minutes: (duration / 60).toFixed(2)
                    });
                    
                    return acc + duration;
                }, 0);
            })
        );

        unplanned_downtime_seconds = downtimeResults.reduce((a, b) => a + b, 0);
    }

    console.log('[OEE Availability] Total unplanned downtime:', {
        seconds: unplanned_downtime_seconds,
        minutes: (unplanned_downtime_seconds / 60).toFixed(2),
        hours: (unplanned_downtime_seconds / 3600).toFixed(2)
    });

    // ─── Langkah 4–5: Operating Time + Availability ───────────────────────
    const operating_time_seconds = Math.max(
        planned_production_seconds - unplanned_downtime_seconds, 0
    );
    const availability = planned_production_seconds > 0
        ? operating_time_seconds / planned_production_seconds
        : 0;
    const availability_pct = Math.round(availability * 10000) / 100;

    console.log('[OEE Availability] Calculation result:', {
        total_shift_seconds,
        break_seconds,
        scheduled_maintenance_seconds,
        planned_downtime_seconds,
        planned_production_seconds,
        unplanned_downtime_seconds,
        operating_time_seconds,
        availability_ratio: availability,
        availability_pct,
    });

    // ─── Langkah 6: Quality & Performance ───────────────────────────
    const qData = await calculateLineQuality(line_id, window.shift_start_ts, window.shift_end_ts);
    
    // Default target 100 unit/jam sesuai batasan
    const pData = await calculateLinePerformance(line_id, window.shift_start_ts, window.shift_end_ts, operating_time_seconds, 100);

    return {
        line_id,
        shift_id: activeShiftId,
        shift_name,
        total_shift_seconds,
        break_seconds,
        scheduled_maintenance_seconds,
        planned_downtime_seconds,
        planned_production_seconds,
        unplanned_downtime_seconds,
        operating_time_seconds,
        availability,
        availability_pct,
        good_output: qData.good,
        reject_output: qData.reject,
        total_production: qData.total,
        quality: qData.ratio,
        quality_pct: qData.pct,
        performance: pData.performance_ratio,
        performance_pct: pData.performance_pct,
        target_ideal: pData.target_ideal,
        shift_start_ts: shiftStart.toISOString(),
        shift_end_ts: shiftEnd.toISOString(),
        scheduled_machines_count,
    };
}

// ─── Simpan ke tabel oee_line ─────────────────────────────────────────────────

/**
 * Hitung Availability + INSERT baris baru ke `oee_line`.
 *
 * Dipanggil setiap kali ada data baru (misalnya dari data-items-add route).
 */
export async function saveLineAvailability(
    line_id: string,
    line_process_id: string,
    actual_output_id?: string | null,
    machine_status_log_id?: string | null,
    shift_id?: string | null,
    baseDate?: Date,
): Promise<{ success: boolean; availability_pct?: number; oee_line_id?: string; error?: string }> {
    const avResult = await calculateLineAvailability(line_id, shift_id, baseDate);

    if ('error' in avResult) {
        console.error('[oee_line] saveLineAvailability error:', avResult.error);
        return { success: false, error: avResult.error };
    }

    // Hitung OEE final = Availability × Performance × Quality
    const oee_final = avResult.availability * avResult.performance * avResult.quality;

    const payload: Record<string, any> = {
        line_id,
        shift_id: avResult.shift_id,
        line_process_id,
        availability: avResult.availability,  // rasio 0–1
        perfomance: avResult.performance,     // rasio 0–1 (typo db col: perfomance)
        quality: avResult.quality,            // rasio 0–1
        oee_line: oee_final,                  // rasio 0–1 (A × P × Q)
        updated_at: new Date().toISOString(),
    };

    if (actual_output_id) payload.actual_output_id = actual_output_id;
    if (machine_status_log_id) payload.machine_status_log_id = machine_status_log_id;

    const { data, error } = await supabaseAdmin
        .from('oee_line')
        .insert(payload)
        .select('id')
        .single();

    if (error) {
        console.error('[oee_line] INSERT error:', error.message);
        return { success: false, error: error.message };
    }

    console.log(
        `[oee_line] ✓ Saved | OEE: ${Math.round(oee_final * 100)}%` +
        ` | Availability: ${avResult.availability_pct}%` +
        ` | Performance: ${avResult.performance_pct}%` +
        ` | Quality: ${avResult.quality_pct}%` +
        ` | Shift: ${avResult.shift_name}` +
        ` | Unplanned DT: ${Math.round(avResult.unplanned_downtime_seconds / 60)} mnt` +
        ` | Scheduled machines: ${avResult.scheduled_machines_count}`
    );

    return { success: true, availability_pct: avResult.availability_pct, oee_line_id: data?.id };
}

// ─── Read-only untuk /api/dashboard/summary ──────────────────────────────────

/**
 * Hitung Availability secara real-time tanpa menyimpan ke DB.
 * Gunakan fungsi ini di dashboard summary API.
 */
export async function computeLineAvailabilityReadOnly(
    line_id: string,
    shift_id?: string | null,
    baseDate?: Date,
): Promise<{
    availability: number;
    availability_pct: number;
    planned_production_seconds: number;
    operating_time_seconds: number;
    unplanned_downtime_seconds: number;
    scheduled_maintenance_seconds: number;
    scheduled_machines_count: number;
    shift_name: string | null;
    shift_id: string | null;
    shift_start_ts: string | null;
    shift_end_ts: string | null;
    quality: number;
    quality_pct: number;
    performance: number;
    performance_pct: number;
    target_ideal: number;
    good_output: number;
    reject_output: number;
}> {
    const result = await calculateLineAvailability(line_id, shift_id, baseDate);

    if ('error' in result) {
        console.warn('[oee_line] computeReadOnly error:', result.error);
        return {
            availability: 0,
            availability_pct: 0,
            planned_production_seconds: 0,
            operating_time_seconds: 0,
            unplanned_downtime_seconds: 0,
            scheduled_maintenance_seconds: 0,
            scheduled_machines_count: 0,
            shift_name: null,
            shift_id: null,
            shift_start_ts: null,
            shift_end_ts: null,
            quality: 0,
            quality_pct: 0,
            performance: 0,
            performance_pct: 0,
            target_ideal: 0,
            good_output: 0,
            reject_output: 0,
        };
    }

    return {
        availability: result.availability,
        availability_pct: result.availability_pct,
        planned_production_seconds: result.planned_production_seconds,
        operating_time_seconds: result.operating_time_seconds,
        unplanned_downtime_seconds: result.unplanned_downtime_seconds,
        scheduled_maintenance_seconds: result.scheduled_maintenance_seconds,
        scheduled_machines_count: result.scheduled_machines_count,
        shift_name: result.shift_name,
        shift_id: result.shift_id,
        shift_start_ts: result.shift_start_ts,
        shift_end_ts: result.shift_end_ts,
        quality: result.quality,
        quality_pct: result.quality_pct,
        performance: result.performance,
        performance_pct: result.performance_pct,
        target_ideal: result.target_ideal,
        good_output: result.good_output,
        reject_output: result.reject_output,
    };
}
