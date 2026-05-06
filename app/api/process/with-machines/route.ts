import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

/**
 * GET /api/process/with-machines
 * Fetch all processes grouped by line with their assigned machines
 * Query params:
 *   - lineId: string (optional, filter by specific line)
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const lineId = searchParams.get('lineId');

        // Build query to get line_process with nested process and machine data
        let query = supabaseAdmin
            .from('line_process')
            .select(`
                id,
                process_order,
                line_id,
                line:line_id (
                    id,
                    name,
                    status
                ),
                process:process_id (
                    id,
                    name,
                    index,
                    machine_id,
                    machine:machine_id (
                        id,
                        name_machine,
                        status,
                        last_maintenance,
                        next_maintenance,
                        total_running_hours
                    )
                )
            `)
            .order('process_order', { ascending: true });

        if (lineId) {
            query = query.eq('line_id', lineId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching processes with machines:', error);
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch processes with machines'
            }, { status: 500 });
        }

        // Group by line
        const groupedByLine: Record<string, any> = {};

        (data || []).forEach((lp: any) => {
            const lineId = lp.line?.id;
            if (!lineId) return;

            if (!groupedByLine[lineId]) {
                groupedByLine[lineId] = {
                    line_id: lineId,
                    line_name: lp.line.name,
                    line_status: lp.line.status,
                    processes: []
                };
            }

            groupedByLine[lineId].processes.push({
                line_process_id: lp.id,
                process_order: lp.process_order,
                process_id: lp.process?.id,
                process_name: lp.process?.name,
                process_index: lp.process?.index,
                machine: lp.process?.machine ? {
                    id: lp.process.machine.id,
                    name: lp.process.machine.name_machine,
                    status: lp.process.machine.status,
                    last_maintenance: lp.process.machine.last_maintenance,
                    next_maintenance: lp.process.machine.next_maintenance,
                    total_running_hours: lp.process.machine.total_running_hours
                } : null
            });
        });

        // Convert to array and sort
        const result = Object.values(groupedByLine).sort((a: any, b: any) => 
            a.line_name.localeCompare(b.line_name)
        );

        return NextResponse.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error fetching processes with machines:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch processes with machines'
        }, { status: 500 });
    }
}
