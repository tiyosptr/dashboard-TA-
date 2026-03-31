import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { triggerCycleTimeUpdate } from '@/services/cycle_time_machine'

// GET all data items with optional filters
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const lineProcessId = searchParams.get('lineProcessId')
        const status = searchParams.get('status')

        const where: any = {}
        if (lineProcessId) where.lineProcessId = lineProcessId
        if (status) where.status = status

        const dataItems = await prisma.dataItem.findMany({
            where,
            include: {
                snRelation: true,
                lineProcess: true,
                actualOutputs: true,
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json(dataItems)
    } catch (error) {
        console.error('Error fetching data items:', error)
        return NextResponse.json({ error: 'Failed to fetch data items' }, { status: 500 })
    }
}

// POST create new data item
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        const dataItem = await prisma.dataItem.create({
            data: body,
        })

        // Trigger cycle time calculation if lineProcessId is provided
        if (body.lineProcessId || body.line_process_id) {
            const lpId = body.lineProcessId || body.line_process_id;
            triggerCycleTimeUpdate(lpId).catch(err =>
                console.error('[data-items] cycle time trigger error:', err)
            );
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
        const { id, ...data } = body

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        const dataItem = await prisma.dataItem.update({
            where: { id },
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
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        await prisma.dataItem.delete({
            where: { id },
        })

        return NextResponse.json({ message: 'Data item deleted successfully' })
    } catch (error) {
        console.error('Error deleting data item:', error)
        return NextResponse.json({ error: 'Failed to delete data item' }, { status: 500 })
    }
}
