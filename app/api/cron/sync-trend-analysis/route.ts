import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';
import { aggregateAndSaveTrendAnalysis } from '@/services/calculation/dashboard-line/trend_analysis';
import { getActiveShiftWindow } from '@/services/calculation/shift-window';

/**
 * POST /api/cron/sync-trend-analysis
 * 
 * Cron job untuk aggregate dan save trend analysis data setiap jam
 * Dipanggil oleh scheduler eksternal (Vercel Cron, cron-job.org, dll)
 */
export async function POST(request: NextRequest) {
    try {
        console.log('[Cron] Starting trend analysis sync...');

        // Verify cron secret (optional, untuk keamanan)
        const authHeader = request.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get active shift
        const shiftWindow = await getActiveShiftWindow();
        if (!shiftWindow) {
            console.log('[Cron] No active shift found');
            return NextResponse.json({ 
                success: false, 
                error: 'No active shift found' 
            });
        }

        console.log('[Cron] Active shift:', shiftWindow.shift_name);

        // Get all active lines
        const { data: lines, error: linesError } = await supabaseAdmin
            .from('line')
            .select('id, name')
            .in('status', ['active', 'Active']);

        if (linesError) {
            console.error('[Cron] Error fetching lines:', linesError);
            return NextResponse.json({ 
                success: false, 
                error: linesError.message 
            }, { status: 500 });
        }

        if (!lines || lines.length === 0) {
            console.log('[Cron] No active lines found');
            return NextResponse.json({ 
                success: true, 
                message: 'No active lines to process' 
            });
        }

        console.log('[Cron] Processing', lines.length, 'lines...');

        // Process each line
        const results = await Promise.allSettled(
            lines.map(async (line) => {
                console.log('[Cron] Processing line:', line.name);
                const result = await aggregateAndSaveTrendAnalysis(
                    line.id,
                    shiftWindow.shift_id
                );
                return { line: line.name, ...result };
            })
        );

        // Count successes and failures
        const successes = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
        const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !(r.value as any).success)).length;

        console.log('[Cron] Trend analysis sync completed:', {
            total: lines.length,
            successes,
            failures
        });

        return NextResponse.json({
            success: true,
            message: 'Trend analysis sync completed',
            stats: {
                total: lines.length,
                successes,
                failures,
                shift: shiftWindow.shift_name
            },
            results: results.map(r => {
                if (r.status === 'fulfilled') {
                    return r.value;
                } else {
                    return { error: r.reason?.message || 'Unknown error' };
                }
            })
        });

    } catch (error: any) {
        console.error('[Cron] Unexpected error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal server error'
        }, { status: 500 });
    }
}

/**
 * GET /api/cron/sync-trend-analysis
 * 
 * Manual trigger untuk testing
 */
export async function GET(request: NextRequest) {
    return POST(request);
}
