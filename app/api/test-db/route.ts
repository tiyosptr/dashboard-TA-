import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const lineId = searchParams.get('lineId');

    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    if (lineId) {
        const { data, error } = await supabaseAdmin
            .from('actual_output')
            .select('id, hour_slot, output, target_output, created_at, data_items!inner(line_process!inner(line_id))')
            .gte('created_at', d.toISOString())
            .lte('created_at', end.toISOString())
            .eq('data_items.line_process.line_id', lineId);

        return NextResponse.json({ data, error });
    } else {
        const { data, error } = await supabaseAdmin
            .from('actual_output')
            .select('*')
            .gte('created_at', d.toISOString())
            .lte('created_at', end.toISOString());

        return NextResponse.json({ data, error });
    }
}
