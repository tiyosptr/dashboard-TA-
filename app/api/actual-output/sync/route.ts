import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Helper function to calculate hour slot from timestamp
function calculateHourSlot(date: Date): string {
    const hour = date.getHours();
    const nextHour = (hour + 1) % 24;
    return `${hour.toString().padStart(2, '0')}:00-${nextHour.toString().padStart(2, '0')}:00`;
}

// POST - Sync/recalculate actual output from data_items using Prisma
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { line_id, date, pn } = body;

        // Build query filters
        const where: any = {};
        if (line_id) where.lineId = line_id;
        if (pn) where.pn = pn;
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            where.createdAt = {
                gte: startDate,
                lt: endDate
            };
        }

        // Fetch data items
        const dataItems = await prisma.dataItem.findMany({
            where,
            orderBy: { createdAt: 'asc' }
        });

        if (!dataItems || dataItems.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No data items found to sync',
                processed: 0,
            });
        }

        // Group data by line_id, shift_number, hour_slot, date, pn
        const aggregated = new Map<string, {
            lineId: string;
            shiftNumber: number;
            hourSlot: string;
            date: Date;
            pn: string;
            output: number;
            reject: number;
        }>();

        for (const item of dataItems) {
            if (!item.lineId || !item.pn || !item.createdAt) continue;

            const itemDate = new Date(item.createdAt);
            const dateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
            const hourSlot = calculateHourSlot(itemDate);
            const shiftNumber = 1; // Default shift

            const key = `${item.lineId}_${shiftNumber}_${hourSlot}_${dateOnly.toISOString()}_${item.pn}`;

            if (!aggregated.has(key)) {
                aggregated.set(key, {
                    lineId: item.lineId,
                    shiftNumber,
                    hourSlot,
                    date: dateOnly,
                    pn: item.pn,
                    output: 0,
                    reject: 0,
                });
            }

            const record = aggregated.get(key)!;
            if (item.status === 'pass') {
                record.output++;
            } else if (item.status === 'reject') {
                record.reject++;
            }
        }

        // Upsert to actual_output using Prisma
        const upsertPromises = Array.from(aggregated.values()).map(async (record) => {
            await prisma.actualOutput.upsert({
                where: {
                    actual_output_line_id_shift_number_hour_slot_date_pn_key: {
                        lineId: record.lineId,
                        shiftNumber: record.shiftNumber,
                        hourSlot: record.hourSlot,
                        date: record.date,
                        pn: record.pn
                    }
                },
                update: {
                    output: record.output,
                    reject: record.reject,
                    updatedAt: new Date(),
                },
                create: {
                    lineId: record.lineId,
                    shiftNumber: record.shiftNumber,
                    hourSlot: record.hourSlot,
                    date: record.date,
                    pn: record.pn,
                    output: record.output,
                    reject: record.reject,
                    targetOutput: 1000, // Default target
                }
            });
        });

        await Promise.all(upsertPromises);

        return NextResponse.json({
            success: true,
            message: 'Actual output synced successfully',
            processed: aggregated.size,
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
