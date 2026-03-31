import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';
import { triggerCycleTimeUpdate } from '@/services/cycle_time_machine';

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

        return NextResponse.json({
            success: true,
            data,
            message: 'Data item berhasil ditambahkan',
            cycle_time_debug: cycleTimeResult,
        }, { status: 201 });
    } catch (err) {
        console.error('Unexpected error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
