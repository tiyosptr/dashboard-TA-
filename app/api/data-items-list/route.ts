import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

/**
 * GET /api/data-items-list
 * Mendapatkan semua data_items dengan relasinya (sn, line_process, dll)
 * 
 * Query params:
 *   - line_process_id: filter by specific line_process
 *   - line_id: filter by line (via line_process)
 *   - count_only: if 'true', return only the count
 */
export async function GET(request: NextRequest) {
    try {
        const lineProcessId = request.nextUrl.searchParams.get('line_process_id');
        const lineId = request.nextUrl.searchParams.get('line_id');
        const countOnly = request.nextUrl.searchParams.get('count_only') === 'true';

        if (countOnly && lineProcessId) {
            const { count, error } = await supabaseAdmin
                .from('data_items')
                .select('id', { count: 'exact', head: true })
                .eq('line_process_id', lineProcessId);

            if (error) {
                return NextResponse.json({ success: false, error: error.message }, { status: 500 });
            }
            return NextResponse.json({ success: true, count: count ?? 0 });
        }

        // If filtering by line_id, first get all line_process IDs for that line
        let lineProcessIds: string[] | null = null;
        if (lineId) {
            const { data: lpData, error: lpError } = await supabaseAdmin
                .from('line_process')
                .select('id')
                .eq('line_id', lineId);

            if (lpError) {
                return NextResponse.json({ success: false, error: lpError.message }, { status: 500 });
            }
            lineProcessIds = (lpData || []).map(lp => lp.id);

            if (lineProcessIds.length === 0) {
                return NextResponse.json({ success: true, data: [] });
            }
        }

        let query = supabaseAdmin
            .from('data_items')
            .select(`
                id,
                status,
                created_at,
                sn:sn (
                    id,
                    serial_number,
                    pn:part_number_id (
                        id,
                        part_number,
                        line:line_id (
                            id,
                            name
                        )
                    )
                ),
                line_process:line_process_id (
                    id,
                    process_order,
                    process:process_id (
                        id,
                        name,
                        index
                    ),
                    line:line_id (
                        id,
                        name
                    )
                )
            `)
            .order('created_at', { ascending: false });

        if (lineProcessId) {
            query = query.eq('line_process_id', lineProcessId);
        } else if (lineProcessIds) {
            query = query.in('line_process_id', lineProcessIds);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching data items join:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: data || [] }, { status: 200 });
    } catch (err) {
        console.error('Unexpected error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

