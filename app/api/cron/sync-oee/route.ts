import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

/**
 * POST /api/cron/sync-oee
 * 
 * Calculates and stores daily OEE data for all active machines.
 * Default assumptions used:
 * - Planned Time = 24 hours (86400 seconds) or 8 hours per shift.
 * - Downtime = Sum of duration from machine_status_log where status='downtime' for the day.
 * - Output data = Aggregated from actual_output or custom source.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        // Use provided date or default to yesterday's date for full calculation
        const targetDateStr = body.date || new Date(Date.now()).toISOString().split('T')[0];
        const targetDate = new Date(targetDateStr);

        // 1. Get all machines
        const machines = await prisma.machine.findMany({
            include: {
                processes: { select: { id: true } }
            }
        });

        const results = [];

        // 2. Loop through each machine and calculate OEE
        for (const machine of machines) {
            // NOTE: Replace these with actual IDs based on your logic
            // Defaulting line_id to a dummy or fetching from relation if needed
            const lineProcess = await prisma.lineProcess.findFirst({
                where: { processId: { in: machine.processes.map(p => p.id) } },
                select: { lineId: true }
            });
            const lineId = lineProcess?.lineId;

            if (!lineId) continue; // Skip if machine is not assigned to a line

            // A. TIME METRICS
            // 3 shifts * 7 working hours = 21 hours per day = 75600 seconds
            const plannedTimeSeconds = 3 * 7 * 3600;

            // Calculate actual downtime from machine_status_log for the specific date
            const startOfDay = new Date(targetDateStr + 'T00:00:00.000Z');
            const endOfDay = new Date(targetDateStr + 'T23:59:59.999Z');

            const downtimeLogs: any[] = await prisma.$queryRawUnsafe(`
                SELECT SUM(duration_seconds) as total_downtime
                FROM machine_status_log
                WHERE machine_id = $1::uuid
                  AND status = 'downtime'
                  AND start_time >= $2
                  AND start_time <= $3
            `, machine.id, startOfDay, endOfDay);

            const rawDowntime = downtimeLogs[0]?.total_downtime || 0;
            const downtimeSeconds = Number(rawDowntime);
            const operatingTimeSeconds = Math.max(0, plannedTimeSeconds - downtimeSeconds);

            // B. QUALITY METRICS
            // Query actual output and reject from the actual_output table connected through data_items -> line_process -> process
            const outputStats: any[] = await prisma.$queryRawUnsafe(`
                SELECT 
                    COUNT(*) FILTER (WHERE LOWER(ao.output) IN ('pass', 'ok', 'good')) as good_count,
                    COUNT(*) FILTER (WHERE LOWER(ao.output) IN ('reject', 'ng', 'bad')) as reject_count
                FROM actual_output ao
                JOIN data_items di ON di.id = ao.data_item_id
                JOIN line_process lp ON lp.id = di.line_process_id
                JOIN process p ON p.id = lp.process_id
                WHERE p.machine_id = $1::uuid
                  AND ao.created_at >= $2
                  AND ao.created_at <= $3
            `, machine.id, startOfDay, endOfDay);

            const goodOutput = Number(outputStats[0]?.good_count || 0);
            const rejectOutput = Number(outputStats[0]?.reject_count || 0);
            const totalOutput = goodOutput + rejectOutput;

            // C. PERFORMANCE & OEE CALCULATION
            // Availability = Operating Time / Planned Time
            const availability = plannedTimeSeconds > 0 ? operatingTimeSeconds / plannedTimeSeconds : 0;

            // Performance = (Total Output / Target Output) 
            // Target output: assuming 1000 units per hour * 21 hours = 21000 total target per day per machine
            const targetOutputPerDay = 21000;
            const performance = totalOutput / targetOutputPerDay;

            // Quality = Good Output / Total Output
            const quality = totalOutput > 0 ? goodOutput / totalOutput : 0;

            // Overall OEE = A * P * Q
            const oee = availability * performance * quality;

            // 3. Upsert into oee_summary
            // Note: If you want one row per day/machine/shift, you'd need a unique constraint in PostgreSQL.
            // For now we'll do an insert.

            const insertQuery = `
                INSERT INTO public.oee_summary (
                    date, line_id, machine_id, 
                    planned_time_seconds, operating_time_seconds, downtime_seconds, 
                    total_output, good_output, reject_output, 
                    availability, performance, quality, oee
                ) VALUES (
                    $1::date, $2::uuid, $3::uuid, 
                    $4, $5, $6, 
                    $7, $8, $9, 
                    $10, $11, $12, $13
                ) RETURNING id;
            `;

            const insertedParams = [
                targetDateStr, lineId, machine.id,
                plannedTimeSeconds, operatingTimeSeconds, downtimeSeconds,
                totalOutput, goodOutput, rejectOutput,
                availability, performance, quality, oee
            ];

            const summaryResult = await prisma.$executeRawUnsafe(insertQuery, ...insertedParams);

            results.push({
                machineId: machine.id,
                availability: (availability * 100).toFixed(2) + '%',
                performance: (performance * 100).toFixed(2) + '%',
                quality: (quality * 100).toFixed(2) + '%',
                oee: (oee * 100).toFixed(2) + '%'
            });
        }

        return NextResponse.json({
            success: true,
            message: `Synched OEE Data for ${targetDateStr}`,
            data: results
        });

    } catch (error: any) {
        console.error('Error calculating OEE:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to sync OEE' },
            { status: 500 }
        );
    }
}
