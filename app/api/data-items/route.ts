import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET all data items with optional filters
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const pn = searchParams.get('pn')
        const lineId = searchParams.get('lineId')
        const status = searchParams.get('status')

        const where: any = {}
        if (pn) where.pn = pn
        if (lineId) where.lineId = lineId
        if (status) where.status = status

        const dataItems = await prisma.dataItem.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json(dataItems)
    } catch (error) {
        console.error('Error fetching data items:', error)
        return NextResponse.json({ error: 'Failed to fetch data items' }, { status: 500 })
    }
}

// Helper to calculate hour slot
function calculateHourSlot(date: Date): string {
    const hour = date.getHours();
    const nextHour = (hour + 1) % 24;
    return `${hour.toString().padStart(2, '0')}:00-${nextHour.toString().padStart(2, '0')}:00`;
}

// POST create new data item and update actual output
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // 1. Create DataItem
        const dataItem = await prisma.dataItem.create({
            data: body,
        })

        // 2. Immediately update ActualOutput
        if (dataItem.lineId && dataItem.pn) {
            try {
                const createdAt = dataItem.createdAt ? new Date(dataItem.createdAt) : new Date();
                const dateOnly = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate()); // Strip time
                const hourSlot = calculateHourSlot(createdAt);
                const shiftNumber = 1; // Default shift logic

                const isPass = dataItem.status === 'pass';
                const isReject = dataItem.status === 'reject';

                if (isPass || isReject) {
                    await prisma.actualOutput.upsert({
                        where: {
                            actual_output_line_id_shift_number_hour_slot_date_pn_key: {
                                lineId: dataItem.lineId,
                                shiftNumber: shiftNumber,
                                hourSlot: hourSlot,
                                date: dateOnly,
                                pn: dataItem.pn
                            }
                        },
                        update: {
                            output: isPass ? { increment: 1 } : undefined,
                            reject: isReject ? { increment: 1 } : undefined,
                            updatedAt: new Date()
                        },
                        create: {
                            lineId: dataItem.lineId,
                            shiftNumber: shiftNumber,
                            hourSlot: hourSlot,
                            date: dateOnly,
                            pn: dataItem.pn,
                            output: isPass ? 1 : 0,
                            reject: isReject ? 1 : 0,
                            targetOutput: 1000 // Default target
                        }
                    });
                }
            } catch (updateError) {
                console.error('Error auto-updating ActualOutput:', updateError);
                // We don't fail the request if the auto-update fails, but we log it.
            }
        }

        return NextResponse.json(dataItem, { status: 201 })
    } catch (error) {
        console.error('Error creating data item:', error)
        return NextResponse.json({ error: 'Failed to create data item' }, { status: 500 })
    }
}

// PUT update data item
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { sn, ...data } = body

        if (!sn) {
            return NextResponse.json({ error: 'SN is required' }, { status: 400 })
        }

        const dataItem = await prisma.dataItem.update({
            where: { sn },
            data,
        })

        return NextResponse.json(dataItem)
    } catch (error) {
        console.error('Error updating data item:', error)
        return NextResponse.json({ error: 'Failed to update data item' }, { status: 500 })
    }
}

// DELETE data item
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const sn = searchParams.get('sn')

        if (!sn) {
            return NextResponse.json({ error: 'SN is required' }, { status: 400 })
        }

        await prisma.dataItem.delete({
            where: { sn },
        })

        return NextResponse.json({ message: 'Data item deleted successfully' })
    } catch (error) {
        console.error('Error deleting data item:', error)
        return NextResponse.json({ error: 'Failed to delete data item' }, { status: 500 })
    }
}
