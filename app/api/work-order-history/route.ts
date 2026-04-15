import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const machineId = searchParams.get('machineId');
        const eventType = searchParams.get('type');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        let query = supabaseAdmin
            .from('work_order_history')
            .select(`
                *,
                machine:machine_id(id, name_machine),
                technician:technician_id(id, name)
            `)
            .order('event_start', { ascending: false })
            .limit(150);

        if (machineId && machineId !== 'all') {
            query = query.eq('machine_id', machineId);
        }

        if (eventType && eventType !== 'all') {
            query = query.eq('event_type', eventType.toLowerCase());
        }

        if (startDate) {
            query = query.gte('event_start', new Date(startDate).toISOString());
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // Until end of the day
            query = query.lte('event_start', end.toISOString());
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching work order history:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Error in /api/work-order-history:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
