import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET all actual outputs with optional filters
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const lineId = searchParams.get('lineId') || searchParams.get('line_id')
        const shiftNumber = searchParams.get('shiftNumber') || searchParams.get('shift_number')
        const date = searchParams.get('date')
        const pn = searchParams.get('pn')

        const where: any = {}
        if (lineId) where.lineId = lineId
        if (shiftNumber) where.shiftNumber = parseInt(shiftNumber)
        if (date) where.date = new Date(date)
        if (pn) where.pn = pn

        const actualOutputs = await prisma.actualOutput.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        })

        // Convert BigInt to string for JSON serialization
        const serializedOutputs = actualOutputs.map(output => ({
            id: output.id.toString(),
            line_id: output.lineId,
            shift_number: output.shiftNumber,
            hour_slot: output.hourSlot,
            output: output.output ? Number(output.output) : 0,
            reject: output.reject ? Number(output.reject) : 0,
            target_output: output.targetOutput ? Number(output.targetOutput) : 0,
            date: output.date?.toISOString(),
            pn: output.pn,
            created_at: output.createdAt?.toISOString(),
            updated_at: output.updatedAt?.toISOString(),
        }))

        return NextResponse.json({
            success: true,
            data: serializedOutputs
        })
    } catch (error) {
        console.error('Error fetching actual outputs:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch actual outputs'
        }, { status: 500 })
    }
}

// POST create new actual output
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        const actualOutput = await prisma.actualOutput.create({
            data: body,
        })

        // Convert BigInt to string
        const serialized = {
            ...actualOutput,
            id: actualOutput.id.toString(),
            output: actualOutput.output?.toString(),
            reject: actualOutput.reject?.toString(),
            targetOutput: actualOutput.targetOutput?.toString(),
        }

        return NextResponse.json(serialized, { status: 201 })
    } catch (error) {
        console.error('Error creating actual output:', error)
        return NextResponse.json({ error: 'Failed to create actual output' }, { status: 500 })
    }
}

// PUT update actual output
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, ...data } = body

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        const actualOutput = await prisma.actualOutput.update({
            where: { id: BigInt(id) },
            data,
        })

        // Convert BigInt to string
        const serialized = {
            ...actualOutput,
            id: actualOutput.id.toString(),
            output: actualOutput.output?.toString(),
            reject: actualOutput.reject?.toString(),
            targetOutput: actualOutput.targetOutput?.toString(),
        }

        return NextResponse.json(serialized)
    } catch (error) {
        console.error('Error updating actual output:', error)
        return NextResponse.json({ error: 'Failed to update actual output' }, { status: 500 })
    }
}

// DELETE actual output
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        await prisma.actualOutput.delete({
            where: { id: BigInt(id) },
        })

        return NextResponse.json({ message: 'Actual output deleted successfully' })
    } catch (error) {
        console.error('Error deleting actual output:', error)
        return NextResponse.json({ error: 'Failed to delete actual output' }, { status: 500 })
    }
}
