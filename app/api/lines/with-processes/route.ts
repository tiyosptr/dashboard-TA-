import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

/**
 * GET /api/lines/with-processes
 * Fetch all production lines along with their nested processes
 */
export async function GET(request: NextRequest) {
    try {
        const { data: lines, error } = await supabaseAdmin
            .from('line')
            .select(`
                id,
                name,
                status,
                line_process (
                    id,
                    process_order,
                    process (
                        id,
                        name,
                        index
                    )
                )
            `)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching lines with process:', error);
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch lines and processes'
            }, { status: 500 });
        }

        // sorting the nested processes by order
        const sortedLines = lines?.map(line => {
            if (line.line_process && Array.isArray(line.line_process)) {
                line.line_process.sort((a: any, b: any) => a.process_order - b.process_order);
            }
            return line;
        });

        return NextResponse.json({
            success: true,
            data: sortedLines || []
        });
    } catch (error) {
        console.error('Error fetching lines with process:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch lines and processes'
        }, { status: 500 });
    }
}
