import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

// Helper function to calculate hour slot from timestamp
function calculateHourSlot(date: Date): string {
    const hour = date.getHours();
    const nextHour = (hour + 1) % 24;
    return `${hour.toString().padStart(2, '0')}:00-${nextHour.toString().padStart(2, '0')}:00`;
}

/**
 * POST - Sync/recalculate actual output from data_items
 * 
 * New schema relationships:
 *   actual_output → data_items (via data_item_id)
 *   data_items → line_process (via line_process_id) → has line_id
 *   data_items → sn (via sn column) → pn (via part_number_id)
 * 
 * Body params:
 *   - line_id: optional filter by line
 *   - date: optional filter by date
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { line_id, date } = body;

        // Build query for data_items
        let query = supabaseAdmin
            .from('data_items')
            .select(`
                id,
                sn,
                status,
                created_at,
                line_process_id,
                line_process:line_process_id (
                    line_id
                )
            `)
            .order('created_at', { ascending: true });

        // Filter by date range
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            query = query
                .gte('created_at', startDate.toISOString())
                .lt('created_at', endDate.toISOString());
        }

        const { data: dataItems, error: fetchError } = await query;

        if (fetchError) {
            console.error('Error fetching data_items:', fetchError);
            return NextResponse.json({
                success: false,
                error: fetchError.message,
            }, { status: 500 });
        }

        if (!dataItems || dataItems.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No data items found to sync',
                processed: 0,
            });
        }

        // Filter by line_id if provided (through line_process relation)
        let filteredItems = dataItems;
        if (line_id) {
            filteredItems = dataItems.filter((item: any) => {
                const lp = item.line_process;
                return lp && (lp as any).line_id === line_id;
            });
        }

        // Check which data_items already have actual_output records
        const dataItemIds = filteredItems.map((item: any) => item.id);

        const { data: existingOutputs } = await supabaseAdmin
            .from('actual_output')
            .select('id, data_item_id')
            .in('data_item_id', dataItemIds);

        const existingDataItemIds = new Set(
            (existingOutputs || []).map((o: any) => o.data_item_id)
        );

        // Create actual_output records for data_items that don't have one yet
        const newOutputs = filteredItems
            .filter((item: any) => !existingDataItemIds.has(item.id))
            .map((item: any) => {
                const createdAt = new Date(item.created_at);
                const hourSlot = calculateHourSlot(createdAt);

                return {
                    id: crypto.randomUUID(),
                    data_item_id: item.id,
                    hour_slot: hourSlot,
                    output: item.status, // 'pass' or 'reject'
                    target_output: 1000,
                };
            });

        if (newOutputs.length > 0) {
            const { error: insertError } = await supabaseAdmin
                .from('actual_output')
                .insert(newOutputs);

            if (insertError) {
                console.error('Error inserting actual_output:', insertError);
                return NextResponse.json({
                    success: false,
                    error: insertError.message,
                }, { status: 500 });
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Actual output synced successfully',
            processed: newOutputs.length,
            skipped: filteredItems.length - newOutputs.length,
        });
    } catch (error: any) {
        console.error('Error syncing actual output:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message,
            },
            { status: 500 }
        );
    }
}
