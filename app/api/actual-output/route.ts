import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET all actual outputs with optional filters
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const dataItemId = searchParams.get('dataItemId') || searchParams.get('data_item_id')

        const where: any = {}
        if (dataItemId) where.dataItemId = dataItemId

        const actualOutputs = await prisma.actualOutput.findMany({
            where,
            include: {
                dataItem: {
                    include: {
                        snRelation: true,
                        lineProcess: {
                            include: {
                                line: true,
                                process: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        })

        const serializedOutputs = actualOutputs.map(output => ({
            id: output.id,
            hour_slot: output.hourSlot,
            output: output.output,
            target_output: output.targetOutput ? Number(output.targetOutput) : 0,
            data_item_id: output.dataItemId,
            data_item: output.dataItem,
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
            data: {
                id: body.id || crypto.randomUUID(),
                hourSlot: body.hour_slot || body.hourSlot,
                output: body.output,
                targetOutput: body.target_output || body.targetOutput || 1000,
                dataItemId: body.data_item_id || body.dataItemId,
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                ...actualOutput,
                targetOutput: actualOutput.targetOutput?.toString(),
            }
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating actual output:', error)
        return NextResponse.json({ success: false, error: 'Failed to create actual output' }, { status: 500 })
    }
}

// PUT update actual output
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, ...rest } = body

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 })
        }

        const updateData: any = {}
        if (rest.hour_slot || rest.hourSlot) updateData.hourSlot = rest.hour_slot || rest.hourSlot
        if (rest.output !== undefined) updateData.output = rest.output
        if (rest.target_output || rest.targetOutput) updateData.targetOutput = rest.target_output || rest.targetOutput
        if (rest.data_item_id || rest.dataItemId) updateData.dataItemId = rest.data_item_id || rest.dataItemId

        const actualOutput = await prisma.actualOutput.update({
            where: { id },
            data: updateData,
        })

        return NextResponse.json({
            success: true,
            data: {
                ...actualOutput,
                targetOutput: actualOutput.targetOutput?.toString(),
            }
        })
    } catch (error) {
        console.error('Error updating actual output:', error)
        return NextResponse.json({ success: false, error: 'Failed to update actual output' }, { status: 500 })
    }
}

// DELETE actual output
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 })
        }

        await prisma.actualOutput.delete({
            where: { id },
        })

        return NextResponse.json({ success: true, message: 'Actual output deleted successfully' })
    } catch (error) {
        console.error('Error deleting actual output:', error)
        return NextResponse.json({ success: false, error: 'Failed to delete actual output' }, { status: 500 })
    }
}
