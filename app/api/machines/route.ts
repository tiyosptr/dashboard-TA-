import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET all machines with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const lineId = searchParams.get('lineId')

    const where: any = {}
    if (status) where.status = status
    if (lineId) where.lineId = lineId

    const machines = await prisma.machine.findMany({
      where,
      include: {
        notifications: true,
        workOrders: true,
      },
      orderBy: { nameMachine: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: machines
    })
  } catch (error) {
    console.error('Error fetching machines:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch machines'
    }, { status: 500 })
  }
}

// POST create new machine
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const machine = await prisma.machine.create({
      data: body,
    })

    return NextResponse.json(machine, { status: 201 })
  } catch (error) {
    console.error('Error creating machine:', error)
    return NextResponse.json({ error: 'Failed to create machine' }, { status: 500 })
  }
}

// PUT update machine
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const machine = await prisma.machine.update({
      where: { id },
      data,
    })

    return NextResponse.json(machine)
  } catch (error) {
    console.error('Error updating machine:', error)
    return NextResponse.json({ error: 'Failed to update machine' }, { status: 500 })
  }
}

// DELETE machine
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await prisma.machine.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Machine deleted successfully' })
  } catch (error) {
    console.error('Error deleting machine:', error)
    return NextResponse.json({ error: 'Failed to delete machine' }, { status: 500 })
  }
}