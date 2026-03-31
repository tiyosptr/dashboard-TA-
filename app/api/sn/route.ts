import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';
import { triggerCycleTimeUpdate } from '@/services/cycle_time_machine';

/**
 * POST /api/sn
 * Menambahkan (Generate) record Serial Number ke suatu Part Number.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { part_number_id, quantity = 1, line_process_id } = body;

        if (!part_number_id) {
            return NextResponse.json({ success: false, error: 'Reference part_number_id wajib diisi' }, { status: 400 });
        }

        const qty = parseInt(quantity, 10);
        if (isNaN(qty) || qty < 1 || qty > 1000) {
            return NextResponse.json({ success: false, error: 'Jumlah SN harus antara 1-1000' }, { status: 400 });
        }

        const snRecords = [];
        const dataItemRecords = [];
        for (let i = 0; i < qty; i++) {
            const nowStr = Date.now().toString().slice(-4);
            const uuidPart = crypto.randomUUID().replace(/\D/g, '').slice(0, 6);
            const fallbackRand = Math.floor(100000 + Math.random() * 900000).toString().substring(0, 6);
            const randPart = (uuidPart.length === 6) ? uuidPart : fallbackRand;

            const serialNumber = `SN-${nowStr}${randPart}`;
            const snId = crypto.randomUUID();

            snRecords.push({
                id: snId,
                part_number_id,
                serial_number: serialNumber
            });

            if (line_process_id) {
                dataItemRecords.push({
                    id: crypto.randomUUID(),
                    sn: snId,
                    line_process_id,
                    status: 'pass'
                });
            }
        }

        const { data, error } = await supabaseAdmin
            .from('sn')
            .insert(snRecords)
            .select('id, serial_number, created_at, part_number_id');

        if (error) {
            console.error('Error inserting SN:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        let cycleTimeDebug = null;

        if (dataItemRecords.length > 0) {
            const { error: dataItemsError } = await supabaseAdmin
                .from('data_items')
                .insert(dataItemRecords);

            if (dataItemsError) {
                console.error('Error inserting Data Items:', dataItemsError);
            } else if (line_process_id) {
                // Trigger cycle time calculation for the first process's machine
                cycleTimeDebug = await triggerCycleTimeUpdate(line_process_id);
                console.log('[sn] Cycle time trigger result:', JSON.stringify(cycleTimeDebug));
            }
        }

        const generatedSns = data.map(d => d.serial_number);

        return NextResponse.json(
            {
                success: true,
                data: generatedSns,
                message: `${qty} Serial Number berhasil di-generate`,
                cycle_time_debug: cycleTimeDebug,
            },
            { status: 201 }
        );

    } catch (error) {
        console.error('Error generating SN:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

