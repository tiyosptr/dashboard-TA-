import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET all work orders with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const machineId = searchParams.get('machineId')
    const lineId = searchParams.get('lineId')
    const priority = searchParams.get('priority')

    const where: any = {}
    if (status) where.status = status
    if (machineId) where.machineId = machineId
    if (lineId) where.lineId = lineId
    if (priority) where.priority = priority

    const workOrders = await prisma.workOrder.findMany({
      where,
      include: {
        machine: true,
        line: true,
        notes: true,
        tasks: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(workOrders)
  } catch (error) {
    console.error('Error fetching work orders:', error)
    return NextResponse.json({ error: 'Failed to fetch work orders' }, { status: 500 })
  }
}

// POST create new work order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { notes, tasks, ...workOrderData } = body

    const workOrder = await prisma.workOrder.create({
      data: {
        ...workOrderData,
        notes: notes ? { create: notes } : undefined,
        tasks: tasks ? { create: tasks } : undefined,
      },
      include: {
        notes: true,
        tasks: true,
      },
    })

    return NextResponse.json(workOrder, { status: 201 })
  } catch (error) {
    console.error('Error creating work order:', error)
    return NextResponse.json({ error: 'Failed to create work order' }, { status: 500 })
  }
}

// PUT update work order
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const workOrder = await prisma.workOrder.update({
      where: { id },
      data,
      include: {
        notes: true,
        tasks: true,
      },
    })

    return NextResponse.json(workOrder)
  } catch (error) {
    console.error('Error updating work order:', error)
    return NextResponse.json({ error: 'Failed to update work order' }, { status: 500 })
  }
}

// DELETE work order
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await prisma.workOrder.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Work order deleted successfully' })
  } catch (error) {
    console.error('Error deleting work order:', error)
    return NextResponse.json({ error: 'Failed to delete work order' }, { status: 500 })
  }
}