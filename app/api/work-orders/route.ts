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
        machine: { select: { id: true, nameMachine: true } },
        line: { select: { id: true, name: true } },
        notes: true,
        tasks: { select: { id: true, workOrderId: true, description: true, completed: true, completedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 150, // Added upper bound for massive performance boost
    })

    // Enhanced: Fetch task JSONB data using raw SQL to bypass Prisma model limitations
    const taskDataRaw = await prisma.$queryRawUnsafe(
      `SELECT id, task FROM public.work_order WHERE id::text = ANY($1)`,
      workOrders.map(wo => wo.id)
    ) as any[];

    // Create a map for quick lookup
    const taskMap = new Map(taskDataRaw.map(item => [item.id, item.task]));

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
      task: taskMap.get(wo.id) || wo.task,
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

    if (!workOrderData.machineId) {
      return NextResponse.json({ error: 'machineId is required' }, { status: 400 })
    }

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
    
    // ... (rest of the logic)
    return NextResponse.json(workOrder, { status: 201 })
  } catch (error: any) {
    console.error('Error creating work order:', error)
    return NextResponse.json({ 
      error: 'Failed to create work order', 
      details: error?.message || 'Unknown database error' 
    }, { status: 500 })
  }
}

// PUT update work order
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, userId, ...rest } = body  // Strip userId - not a WorkOrder field
    console.log('[WO Update] Received update request for ID:', id, 'with fields:', Object.keys(rest));
    console.log('[WO Update] Task data present:', !!rest.task);

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

    // Robust fallback for 'task' JSONB column using raw SQL 
    // This ensures persistence even if the Prisma Client is out of sync
    if (rest.task) {
      try {
        const taskJson = JSON.stringify(rest.task);
        await prisma.$executeRawUnsafe(
          'UPDATE public.work_order SET task = $1::jsonb WHERE id = $2::uuid',
          taskJson,
          id
        );
        console.log('[WO Update] Task JSONB updated via raw SQL for:', id);
      } catch (rawError) {
        console.error('[WO Update] Raw SQL Task update failed:', rawError);
      }
    }

    console.log('[WO Update] Successful update for:', id);

    // When work order is completed, update the related notification's done_at and create a history record
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

        // Resolve Technician ID
        let technicianId = null;
        if (workOrder.assignedTo) {
          const tech = await prisma.technician.findFirst({
            where: { name: workOrder.assignedTo }
          });
          if (tech) technicianId = tech.id;
        }

        // Resolve Line ID if missing
        let lineId = workOrder.lineId;
        if ((!lineId || lineId === '00000000-0000-0000-0000-000000000000') && workOrder.machineId) {
          const pr = await prisma.process.findFirst({ where: { machineId: workOrder.machineId }});
          if (pr?.id) {
            const lp = await prisma.lineProcess.findFirst({ where: { processId: pr.id }});
            if (lp?.lineId) lineId = lp.lineId;
          }
        }

        // Find current open Machine Status Log
        let machineStatusLogId = null;
        if (workOrder.machineId) {
          const openLog = await prisma.machineStatusLog.findFirst({
            where: { machineId: workOrder.machineId, endTime: null },
            orderBy: { startTime: 'desc' }
          });
          if (openLog) machineStatusLogId = openLog.id;
        }

        // Add history record
        let durationSeconds = 0;
        if (workOrder.createdAt && workOrder.completedAt) {
          durationSeconds = Math.floor((workOrder.completedAt.getTime() - workOrder.createdAt.getTime()) / 1000);
        }

        const typeMap: Record<string, string> = {
          'downtime': 'downtime',
          'corrective': 'downtime',
          'preventive': 'maintenance',
          'inspection': 'maintenance',
          'maintenance': 'maintenance',
          'repair': 'repair',
          'on hold': 'on hold'
        };
        
        let eventType = typeMap[(workOrder.type || '').toLowerCase()] || 'maintenance';

        console.log('[WO Complete] Recording history for type:', workOrder.type, 'as event:', eventType);

        const historyPayload = {
          work_order_id: workOrder.id,
          machine_id: workOrder.machineId,
          line_id: lineId || null,
          machine_status_log_id: machineStatusLogId,
          technician_id: technicianId,
          event_type: eventType,
          event_start: workOrder.createdAt ? workOrder.createdAt.toISOString() : doneAt,
          event_end: doneAt,
          duration_seconds: durationSeconds,
          work_order_status: 'Completed',
          priority: workOrder.priority,
          assigned_to: workOrder.assignedTo,
          work_order_code: workOrder.workOrderCode,
          description: workOrder.description,
          task: rest.task || (workOrder as any).task, // Fallback to existing task if new one not provided
          is_resolved: true,
          resolved_at: doneAt,
          resolved_by: workOrder.assignedTo,
        };

        const { error: historyErr } = await supabaseAdmin
          .from('work_order_history')
          .insert(historyPayload);

        if (historyErr) {
          console.error('[WO Complete] ERROR inserting history Log:', historyErr);
          // Try a fallback with minimal fields if it's a constraint issue
          if (historyErr.code === '23514') { // Check constraint
             console.warn('[WO Complete] Check constraint triggered, trying fallback event type');
          }
        } else {
          console.log('[WO Complete] Work order history recorded successfully');
        }

        // 3. Reactivate machine if the completed work order was for downtime, maintenance, or repair
        if ((eventType === 'downtime' || eventType === 'maintenance' || eventType === 'repair') && workOrder.machineId) {
          try {
             // Let's directly construct the payload and fetch using nextUrl.origin to ensure NO IP/port mismatch issues
             const baseUrl = request.nextUrl.origin;
             const statusChangeUrl = `${baseUrl}/api/machines/status-change`;
             console.log('[WO Complete] Calling status-change endpoint:', statusChangeUrl);
             
             const scRes = await fetch(statusChangeUrl, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ machine_id: workOrder.machineId, new_status: 'active' })
             });
             
             const scData = await scRes.json();
             if (!scRes.ok) {
               console.error('[WO Complete] status-change error response:', scData);
             } else {
               console.log('[WO Complete] Machine status reverted to active for:', workOrder.machineId);
             }
          } catch (statusErr) {
            console.error('[WO Complete] Failed to update machine status:', statusErr);
          }
        }

      } catch (notifError) {
        console.error('[WO Complete] Error updating completion logic:', notifError);
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

    // To prevent Foreign Key constraint errors on WorkOrder deletion
    // 1. We drop the FK constraint on work_order_history to keep history intact while WO goes away
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE public.work_order_history DROP CONSTRAINT IF EXISTS work_order_history_work_order_id_fkey;');
    } catch(e) {
      console.warn("Could not drop constraint (might already be dropped):", e);
    }

    // 2. Detach notifications from this work order so they don't block deletion
    try {
      await prisma.$executeRawUnsafe('UPDATE public.notification SET work_order_id = NULL WHERE work_order_id = $1::uuid', id);
    } catch(e) {
      console.warn("Could not detach notifications:", e);
    }

    // 3. Delete dependent records that we don't need to keep (tasks, notes)
    try {
       await prisma.task.deleteMany({ where: { workOrderId: id } });
       await prisma.note.deleteMany({ where: { workOrderId: id } });
    } catch (e) {
       console.warn("Error deleting sub-records for WO:", e);
    }

    // 4. Finally delete the work order itself
    await prisma.workOrder.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Work order deleted successfully' })
  } catch (error) {
    console.error('Error deleting work order:', error)
    return NextResponse.json({ error: 'Failed to delete work order' }, { status: 500 })
  }
}