import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';
import { triggerCycleTimeUpdate } from '@/services/cycle_time_machine';
import { triggerThroughputUpdate } from '@/services/throughput_machine';
import { triggerDefectByProcessUpdate } from '@/services/defect_by_process';
import { calculateLineThroughput } from '@/services/calculation/dashboard-line/throughput_line';

/**
 * POST /api/data-items-add
 * Menambahkan Data Item record baru (melanjutkan sequence SN)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sn, sns, line_process_id, status } = body;

        const targetSns = sns && Array.isArray(sns) ? sns : (sn ? [sn] : []);

        if (targetSns.length === 0 || !line_process_id || !status) {
            return NextResponse.json({ success: false, error: 'SN, Process ID, dan Status wajib diisi' }, { status: 400 });
        }

        const records = targetSns.map((s: string) => ({
            id: crypto.randomUUID(),
            sn: s,
            line_process_id,
            status
        }));

        // Cek apakah line_process ini VIFG
        const { data: lpData } = await supabaseAdmin
            .from('line_process')
            .select(`process:process_id(name)`)
            .eq('id', line_process_id)
            .single();

        let isVifg = false;
        if (lpData?.process && (lpData.process as any).name?.toUpperCase() === 'VIFG') {
            isVifg = true;
        }

        const { data, error } = await supabaseAdmin
            .from('data_items')
            .insert(records)
            .select();

        if (error) {
            console.error('Error inserting data_items:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // POST processing untuk VIFG ke actual_output
        if (isVifg && data && data.length > 0) {
            const now = new Date();
            const hour = now.getHours();
            const startHour = hour.toString().padStart(2, '0') + ':00';
            const endHour = (hour + 1).toString().padStart(2, '0') + ':00';
            const hourSlot = `${startHour}-${endHour}`;

            const actualOutputsToInsert = data.map((d: any) => ({
                id: crypto.randomUUID(),
                data_item_id: d.id,
                hour_slot: hourSlot,
                output: d.status,
                target_output: 1000
            }));

            await supabaseAdmin.from('actual_output').insert(actualOutputsToInsert);
        }

        // Trigger cycle time calculation and AWAIT result (includes debug info)
        const cycleTimeResult = await triggerCycleTimeUpdate(line_process_id);
        console.log('[data-items-add] Cycle time trigger result:', JSON.stringify(cycleTimeResult));

        // Trigger throughput calculation (interval_time = 10 detik)
        const throughputResult = await triggerThroughputUpdate(line_process_id, 10);
        console.log('[data-items-add] Throughput trigger result:', JSON.stringify(throughputResult));

        // Trigger defect rate calculation → save to defect_by_process
        const defectResult = await triggerDefectByProcessUpdate(line_process_id);
        console.log('[data-items-add] Defect rate trigger result:', JSON.stringify(defectResult));

        // Trigger LINE throughput calculation (hanya jika proses VIFG / last process)
        // ΔQ diambil dari VIFG saja → tidak ada double counting antar proses
        let lineThroughputResult = null;
        let lineCycleTimeResult = null;
        if (isVifg && lpData?.process) {
            // Ambil line_id dari line_process
            const { data: lpFull } = await supabaseAdmin
                .from('line_process')
                .select('line_id')
                .eq('id', line_process_id)
                .single();

            if (lpFull?.line_id) {
                lineThroughputResult = await calculateLineThroughput(
                    lpFull.line_id,
                    10  // window 10 menit
                );
                console.log('[data-items-add] Line throughput result:', JSON.stringify(lineThroughputResult));

                // TRIGGER LINE CYCLE TIME
                const { getActiveShiftWindow } = await import('@/services/calculation/shift-window');
                const { calculateLineCycleTime } = await import('@/services/calculation/dashboard-line/cycletime_line');
                const shiftWindow = await getActiveShiftWindow();
                if (shiftWindow) {
                    const now = new Date();
                    // Gunakan batas hari ini sebagai window
                    const todayStart = new Date(now);
                    todayStart.setHours(0, 0, 0, 0);
                    lineCycleTimeResult = await calculateLineCycleTime(
                        lpFull.line_id,
                        shiftWindow.shift_id,
                        todayStart,
                        now
                    );
                    console.log('[data-items-add] Line cycle time result:', JSON.stringify(lineCycleTimeResult));
                }
            }
        }

        return NextResponse.json({
            success: true,
            data,
            message: 'Data item berhasil ditambahkan',
            cycle_time_debug: cycleTimeResult,
            throughput_debug: throughputResult,
            defect_rate_debug: defectResult,
            line_throughput_debug: lineThroughputResult,
            line_cycletime_debug: lineCycleTimeResult,
        }, { status: 201 });
    } catch (err) {
        console.error('Unexpected error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
