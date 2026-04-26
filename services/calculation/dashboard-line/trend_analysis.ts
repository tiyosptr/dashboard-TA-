/**
 * Service: Trend Analysis Calculation & Storage
 * 
 * Menyimpan data trend analysis ke database untuk analisis 7 hari terakhir
 */

import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

export interface TrendAnalysisData {
    line_id: string;
    line_process_id?: string | null;
    shift_id?: string | null;
    recorded_date: string; // YYYY-MM-DD
    recorded_hour: number; // 0-23
    total_output: number;
    total_pass: number;
    total_reject: number;
    // quality_rate is GENERATED column, don't include in insert/update
    efficiency?: number;
    total_downtime_seconds?: number;
    downtime_count?: number;
    planned_time_seconds?: number;
}

/**
 * Simpan atau update data trend analysis untuk satu jam tertentu
 */
export async function saveTrendAnalysis(data: TrendAnalysisData): Promise<{
    success: boolean;
    id?: string;
    error?: string;
}> {
    try {
        const payload = {
            line_id: data.line_id,
            line_process_id: data.line_process_id,
            shift_id: data.shift_id,
            recorded_date: data.recorded_date,
            recorded_hour: data.recorded_hour,
            total_output: data.total_output,
            total_pass: data.total_pass,
            total_reject: data.total_reject,
            // quality_rate is GENERATED, don't include
            efficiency: data.efficiency,
            total_downtime_seconds: data.total_downtime_seconds || 0,
            downtime_count: data.downtime_count || 0,
            planned_time_seconds: data.planned_time_seconds,
            updated_at: new Date().toISOString(),
        };

        // Cek apakah sudah ada data untuk line_id, date, dan hour ini
        const { data: existing } = await supabaseAdmin
            .from('trend_analysis')
            .select('id')
            .eq('line_id', data.line_id)
            .eq('recorded_date', data.recorded_date)
            .eq('recorded_hour', data.recorded_hour)
            .maybeSingle();

        if (existing) {
            // Update existing record
            const { data: updated, error } = await supabaseAdmin
                .from('trend_analysis')
                .update(payload)
                .eq('id', existing.id)
                .select('id')
                .single();

            if (error) {
                console.error('[trend_analysis] UPDATE error:', error.message);
                return { success: false, error: error.message };
            }

            console.log(`[trend_analysis] ✓ Updated | Date: ${data.recorded_date} Hour: ${data.recorded_hour}`);
            return { success: true, id: updated.id };
        } else {
            // Insert new record
            const { data: inserted, error } = await supabaseAdmin
                .from('trend_analysis')
                .insert(payload)
                .select('id')
                .single();

            if (error) {
                console.error('[trend_analysis] INSERT error:', error.message);
                return { success: false, error: error.message };
            }

            console.log(`[trend_analysis] ✓ Inserted | Date: ${data.recorded_date} Hour: ${data.recorded_hour}`);
            return { success: true, id: inserted.id };
        }
    } catch (error: any) {
        console.error('[trend_analysis] Error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Aggregate dan simpan trend analysis untuk hari ini
 * Dipanggil secara periodik (misalnya setiap jam atau setiap ada data baru)
 */
export async function aggregateAndSaveTrendAnalysis(
    line_id: string,
    shift_id?: string | null
): Promise<{ success: boolean; error?: string }> {
    try {
        const now = new Date();
        // Use local date for recorded_date (not UTC)
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const currentHour = now.getHours();

        console.log(`[trend_analysis] Aggregating for line ${line_id}, date ${today}, hour ${currentHour} (Local time: ${now.toLocaleString()}, UTC: ${now.toISOString()})`);

        // 1. Ambil line_process_id (VIFG)
        const { data: vifgProcess } = await supabaseAdmin
            .from('line_process')
            .select('id, process:process_id(name)')
            .eq('line_id', line_id)
            .order('process_order', { ascending: false });

        const vifgRow = (vifgProcess ?? []).find(p => (p.process as any)?.name?.toUpperCase() === 'VIFG') 
                        || (vifgProcess ? vifgProcess[0] : null);

        if (!vifgRow) {
            console.warn('[trend_analysis] No VIFG process found for line');
            return { success: false, error: 'No VIFG process found for line' };
        }

        console.log(`[trend_analysis] Using line_process_id: ${vifgRow.id}`);

        // 2. Hitung output untuk jam ini DARI DATA_ITEMS (bukan actual_output)
        const hourStart = new Date(now);
        hourStart.setMinutes(0, 0, 0);
        const hourEnd = new Date(hourStart);
        hourEnd.setHours(hourStart.getHours() + 1);

        console.log(`[trend_analysis] Time window: ${hourStart.toISOString()} to ${hourEnd.toISOString()}`);

        // Count pass dari data_items
        const { count: passCount } = await supabaseAdmin
            .from('data_items')
            .select('*', { count: 'exact', head: true })
            .eq('line_process_id', vifgRow.id)
            .eq('status', 'pass')
            .gte('created_at', hourStart.toISOString())
            .lt('created_at', hourEnd.toISOString());

        // Count reject dari data_items
        const { count: rejectCount } = await supabaseAdmin
            .from('data_items')
            .select('*', { count: 'exact', head: true })
            .eq('line_process_id', vifgRow.id)
            .eq('status', 'reject')
            .gte('created_at', hourStart.toISOString())
            .lt('created_at', hourEnd.toISOString());

        const total_pass = passCount || 0;
        const total_reject = rejectCount || 0;
        const total_output = total_pass + total_reject;

        console.log(`[trend_analysis] Output from data_items: ${total_output} (Pass: ${total_pass}, Reject: ${total_reject})`);

        // 3. Hitung downtime untuk jam ini
        // Ambil machine IDs dari line
        const { data: lineProcesses } = await supabaseAdmin
            .from('line_process')
            .select('id, process(machine_id)')
            .eq('line_id', line_id);

        const machineIds: string[] = [];
        (lineProcesses ?? []).forEach((lp: any) => {
            const mid = lp.process?.machine_id;
            if (mid && !machineIds.includes(mid)) machineIds.push(mid);
        });

        let total_downtime_seconds = 0;
        let downtime_count = 0;

        if (machineIds.length > 0) {
            const { data: downtimeData } = await supabaseAdmin
                .from('machine_status_log')
                .select('duration_seconds')
                .in('machine_id', machineIds)
                .eq('status', 'downtime')
                .gte('start_time', hourStart.toISOString())
                .lt('start_time', hourEnd.toISOString())
                .not('duration_seconds', 'is', null);

            if (downtimeData) {
                total_downtime_seconds = downtimeData.reduce((sum, row) => sum + (row.duration_seconds || 0), 0);
                downtime_count = downtimeData.length;
            }
        }

        console.log(`[trend_analysis] Downtime: ${total_downtime_seconds}s (Count: ${downtime_count})`);

        // 4. Hitung efficiency (butuh target)
        // Target bisa diambil dari actual_output atau gunakan default 100 per jam
        const { data: outputData } = await supabaseAdmin
            .from('actual_output')
            .select('target_output')
            .gte('created_at', hourStart.toISOString())
            .lt('created_at', hourEnd.toISOString())
            .limit(1)
            .maybeSingle();

        const target = outputData?.target_output ? Number(outputData.target_output) : 100;
        const efficiency = target > 0 ? (total_output / target) * 100 : 0;

        console.log(`[trend_analysis] Efficiency: ${efficiency.toFixed(2)}% (Target: ${target}, Actual: ${total_output})`);

        // 5. Simpan ke trend_analysis
        const result = await saveTrendAnalysis({
            line_id,
            line_process_id: vifgRow.id,
            shift_id,
            recorded_date: today,
            recorded_hour: currentHour,
            total_output,
            total_pass,
            total_reject,
            efficiency,
            total_downtime_seconds,
            downtime_count,
            planned_time_seconds: 3600, // 1 jam = 3600 detik
        });

        return result;
    } catch (error: any) {
        console.error('[trend_analysis] aggregateAndSave error:', error.message);
        return { success: false, error: error.message };
    }
}
