import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/sync-machines
 * 
 * Vercel Cron compatible endpoint.
 * Calling this endpoint executes the SQL function `split_open_status_events()`
 * which efficiently calculates and updates running hours for ALL machines 
 * in milliseconds, avoiding N+1 queries.
 */
export async function GET(request: Request) {
    try {
        // Run the optimized SQL function
        await prisma.$executeRawUnsafe(`SELECT split_open_status_events()`);

        return NextResponse.json({
            success: true,
            message: 'Successfully synchronized machine running hours',
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('CRON Error (sync-machines):', error.message);
        return NextResponse.json(
            { success: false, error: 'Failed to sync machines' },
            { status: 500 }
        );
    }
}
