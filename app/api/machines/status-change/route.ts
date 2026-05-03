import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * POST /api/machines/status-change
 * 
 * Event-based machine status change.
 * 1. Closes the current open event (sets end_time)
 * 2. Inserts a new event with the new status
 * 3. Updates machine.status and machine.total_running_hours
 * 
 * Uses SELECT FOR UPDATE to prevent race conditions.
 * 
 * Body: { machine_id: string, new_status: string }
 * 
 * Valid statuses: 'active', 'maintenance', 'on hold', 'downtime', 'inactive'
 */

const VALID_STATUSES = ['active', 'maintenance', 'on hold', 'downtime', 'inactive'];

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { machine_id, new_status } = body;

        if (!machine_id || !new_status) {
            return NextResponse.json(
                { success: false, error: 'machine_id and new_status are required' },
                { status: 400 }
            );
        }

        if (!VALID_STATUSES.includes(new_status)) {
            return NextResponse.json(
                { success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
                { status: 400 }
            );
        }

        // Execute everything in a transaction with row-level locking
        const result = await prisma.$transaction(async (tx) => {
            const now = new Date();

            // 1. Lock and close the current open event (if exists)
            // Use raw query for SELECT FOR UPDATE (not natively supported by Prisma)
            const openEvents: any[] = await tx.$queryRawUnsafe(
                `SELECT id, status, start_time 
                 FROM machine_status_log 
                 WHERE machine_id = $1::uuid AND end_time IS NULL 
                 FOR UPDATE`,
                machine_id
            );

            let previousDurationSeconds = 0;
            let previousStatus: string | null = null;

            if (openEvents.length > 0) {
                const openEvent = openEvents[0];
                previousStatus = openEvent.status;

                // If status is the same, we still want to ensure the machine table is in sync,
                // but we don't need to close/open new log entries.
                if (previousStatus === new_status) {
                    // Skip log updates but proceed to machine table update below
                } else {
                    // Safely calculate duration of the closed event.
                    let startTime = openEvent.start_time instanceof Date 
                        ? openEvent.start_time 
                        : new Date(openEvent.start_time);
                    
                    let diffSecs = Math.floor((now.getTime() - startTime.getTime()) / 1000);
                    if (diffSecs < 0) diffSecs = 0;
                    
                    previousDurationSeconds = diffSecs;

                    // Close the current event
                    await tx.$queryRawUnsafe(
                        `UPDATE machine_status_log 
                         SET end_time = $1
                         WHERE id = $2::uuid`,
                        now,
                        openEvent.id
                    );

                    // 2. Insert new event (only if status changed)
                    await tx.machineStatusLog.create({
                        data: {
                            machineId: machine_id,
                            status: new_status,
                            startTime: now,
                        },
                    });
                }
            } else {
                // No open event, create one
                await tx.machineStatusLog.create({
                    data: {
                        machineId: machine_id,
                        status: new_status,
                        startTime: now,
                    },
                });
            }

            // 3. Update machine's current status and accumulate running hours / downtime
            let totalRunningUpdate: string | undefined;
            let totalDowntimeUpdate: string | undefined;

            if (previousDurationSeconds > 0) {
                // Fetch the current machine state first to aggregate
                const machineRecord: any[] = await tx.$queryRawUnsafe(`SELECT total_running_hours, total_downtime_hours FROM machine WHERE id = $1::uuid`, machine_id);
                const machine = machineRecord[0];

                const currentRunning = parseFloat(machine?.total_running_hours || '0');
                const currentDowntime = parseFloat(machine?.total_downtime_hours || '0');
                const additionalHours = previousDurationSeconds / 3600;

                if (previousStatus === 'active' || previousStatus === 'running') {
                    totalRunningUpdate = (currentRunning + additionalHours).toFixed(4);
                } else if (['downtime', 'down', 'error'].includes(previousStatus?.toLowerCase() || '')) {
                    // Only count actual downtime towards total_downtime_hours
                    totalDowntimeUpdate = (currentDowntime + additionalHours).toFixed(4);
                }
            }

            // Using raw query to avoid Prisma cache/generation issue while adding new column
            let updateQuery = `UPDATE machine SET status = $1`;
            const queryParams: any[] = [new_status];
            let paramIdx = 2;

            if (totalRunningUpdate !== undefined) {
                updateQuery += `, total_running_hours = $${paramIdx}`;
                queryParams.push(totalRunningUpdate);
                paramIdx++;
            }
            if (totalDowntimeUpdate !== undefined) {
                updateQuery += `, total_downtime_hours = $${paramIdx}`;
                queryParams.push(totalDowntimeUpdate);
                paramIdx++;
            }

            updateQuery += ` WHERE id = $${paramIdx}::uuid RETURNING *`;
            queryParams.push(machine_id);

            const updatedMachineResult: any[] = await tx.$queryRawUnsafe(updateQuery, ...queryParams);
            const updatedMachine = updatedMachineResult[0];

            return {
                changed: previousStatus !== new_status,
                previousStatus,
                newStatus: new_status,
                previousDurationSeconds,
                machine: {
                    id: updatedMachine.id,
                    status: updatedMachine.status,
                    totalRunningHours: updatedMachine.total_running_hours,
                    totalDowntimeHours: updatedMachine.total_downtime_hours,
                },
            };
        });

        return NextResponse.json({
            success: true,
            data: result,
        });

    } catch (error: any) {
        console.error('Error changing machine status:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to change machine status' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/machines/status-change?machine_id=xxx
 * 
 * Get status history for a machine.
 * Optional query params:
 *   - machine_id: specific machine (required)
 *   - days: number of days to look back (default: 7)
 *   - status: filter by status
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const machineId = searchParams.get('machine_id');
        const days = parseInt(searchParams.get('days') || '7');
        const statusFilter = searchParams.get('status');

        if (!machineId) {
            return NextResponse.json(
                { success: false, error: 'machine_id is required' },
                { status: 400 }
            );
        }

        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - days);

        const where: any = {
            machineId,
            startTime: { gte: sinceDate },
        };
        if (statusFilter) where.status = statusFilter;

        const logs = await prisma.machineStatusLog.findMany({
            where,
            orderBy: { startTime: 'desc' },
            take: 500,
        });

        // Calculate summary
        const summary: Record<string, { count: number; totalSeconds: number; totalHours: number }> = {};
        for (const log of logs) {
            if (!summary[log.status]) {
                summary[log.status] = { count: 0, totalSeconds: 0, totalHours: 0 };
            }
            summary[log.status].count++;

            if (log.durationSeconds) {
                summary[log.status].totalSeconds += Number(log.durationSeconds);
                summary[log.status].totalHours = Math.round(summary[log.status].totalSeconds / 36) / 100;
            } else {
                // Current open event — calculate live duration
                const liveSeconds = Math.floor((Date.now() - log.startTime.getTime()) / 1000);
                summary[log.status].totalSeconds += liveSeconds;
                summary[log.status].totalHours = Math.round(summary[log.status].totalSeconds / 36) / 100;
            }
        }

        // Serialize BigInt
        const serializedLogs = logs.map(log => ({
            ...log,
            durationSeconds: log.durationSeconds !== null ? Number(log.durationSeconds) : null,
        }));

        return NextResponse.json({
            success: true,
            data: {
                logs: serializedLogs,
                summary,
                totalEvents: logs.length,
                period: { from: sinceDate.toISOString(), to: new Date().toISOString() },
            },
        });

    } catch (error: any) {
        console.error('Error fetching status logs:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch status logs' },
            { status: 500 }
        );
    }
}
