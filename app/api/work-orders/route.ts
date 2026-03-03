import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'

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

    // Map Prisma camelCase to snake_case for frontend compatibility
    const mapped = workOrders.map((wo: any) => ({
      id: wo.id,
      work_order_code: wo.workOrderCode,
      type: wo.type,
      priority: wo.priority,
      machine_id: wo.machineId,
      machine_name: wo.machineName,
      line_id: wo.lineId,
      name_line: wo.nameLine,
      status: wo.status,
      assigned_to: wo.assignedTo,
      created_at: wo.createdAt,
      schedule_date: wo.scheduleDate,
      completed_at: wo.completedAt,
      estimated_duration: wo.estimatedDuration,
      actual_duration: wo.actualDuration,
      description: wo.description,
      location: wo.nameLine || wo.line?.name || 'N/A',
      tasks: (wo.tasks || []).map((t: any) => ({
        id: t.id,
        work_order_id: t.workOrderId,
        description: t.description,
        completed: t.completed === 'true' || t.completed === true,
        completed_at: t.completedAt,
      })),
      notes: (wo.notes || []).map((n: any) => ({
        id: n.id,
        work_order_id: n.workOrderId,
        text: n.text,
        author: n.author,
        timestamp: n.timestamp,
      })),
      requiredParts: [],
    }))

    return NextResponse.json({ success: true, data: mapped })
  } catch (error) {
    console.error('Error fetching work orders:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch work orders' }, { status: 500 })
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
    const { id, userId, ...rest } = body  // Strip userId - not a WorkOrder field

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 })
    }

    // Build update data with only valid WorkOrder fields
    const updateData: any = {}
    if (rest.status) updateData.status = rest.status
    if (rest.priority) updateData.priority = rest.priority
    if (rest.assignedTo) updateData.assignedTo = rest.assignedTo
    if (rest.description) updateData.description = rest.description
    if (rest.estimatedDuration) updateData.estimatedDuration = rest.estimatedDuration
    if (rest.actualDuration) updateData.actualDuration = rest.actualDuration
    if (rest.scheduleDate) updateData.scheduleDate = rest.scheduleDate

    // Auto-set completedAt when status changes to Completed
    if (rest.status === 'Completed') {
      updateData.completedAt = new Date()
    }

    const workOrder = await prisma.workOrder.update({
      where: { id },
      data: updateData,
      include: {
        notes: true,
        tasks: true,
      },
    })

    // When work order is completed, update the related notification's done_at
    if (rest.status === 'Completed') {
      try {
        const doneAt = new Date().toISOString();

        // Find notification by work_order_id and mark as done
        const { data: updated, error: notifErr } = await supabaseAdmin
          .from('notification')
          .update({
            done_at: doneAt,
            acknowladged: 'true',
            acknowladged_by: 'System',
            acknowladged_at: doneAt,
          })
          .eq('work_order_id', id)
          .select('id');

        console.log('[WO Complete] Notifications marked done by work_order_id:', { id, updated, notifErr });
      } catch (notifError) {
        console.error('[WO Complete] Error updating notification done_at:', notifError);
      }
    }

    return NextResponse.json({ success: true, data: workOrder })
  } catch (error) {
    console.error('Error updating work order:', error)
    return NextResponse.json({ success: false, error: 'Failed to update work order' }, { status: 500 })
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