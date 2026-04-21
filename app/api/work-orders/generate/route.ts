//api/work-orders/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';


// Generate Work Order ID
function generateWorkOrderId(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 999999)
    .toString()
    .padStart(6, '0');
  return `WO-${year}-${random}`;
}

// Determine priority based on severity
function determinePriority(severity: string): string {
  const severityMap: Record<string, string> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };
  return severityMap[severity.toLowerCase()] || 'Medium';
}

// POST - Generate work order from notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, technicianName } = body;

    if (!technicianName) {
      return NextResponse.json(
        { success: false, error: 'Technician name is required' },
        { status: 400 }
      );
    }

    // Get notification
    const { data: notification, error: notifError } = await supabaseAdmin
      .from('notification')
      .select('*')
      .eq('id', notificationId)
      .single();

    if (notifError) throw notifError;

    // Resolve line info from process_id via line_process
    let lineId: string | null = null;
    let nameLine: string | null = null;

    if (notification.process_id) {
      const { data: lpData } = await supabaseAdmin
        .from('line_process')
        .select('line_id, line:line_id(id, name_line)')
        .eq('process_id', notification.process_id)
        .limit(1)
        .single();

      if (lpData) {
        lineId = lpData.line_id;
        const line = lpData.line as any;
        if (line) {
          nameLine = line.name_line || null;
        }
      }
    }

    const woCode = generateWorkOrderId();
    // Create work order
    const workOrderData = {
      work_order_code: woCode,
      type: 'downtime',
      priority: determinePriority(notification.severity),
      machine_id: notification.machine_id,
      machine_name: notification.machine_name,
      line_id: lineId,
      name_line: nameLine,
      status: 'On-Solving',
      assigned_to: technicianName,
      created_at: new Date().toISOString(),
      schedule_date: new Date().toISOString(),
      completed_at: null,
      estimated_duration: '2 hours',
      actual_duration: null,
      description: notification.messages,
    };

    const { data: workOrder, error: woError } = await supabaseAdmin
      .from('work_order')
      .insert(workOrderData)
      .select()
      .single();

    if (woError) throw woError;

    // Create default tasks
    const defaultTasks = [
      {
        work_order_id: workOrder.id,
        description: 'Inspect the issue',
        completed: 'false',
        completed_at: null,
      },
      {
        work_order_id: workOrder.id,
        description: 'Identify root cause',
        completed: 'false',
        completed_at: null,
      },
      {
        work_order_id: workOrder.id,
        description: 'Perform repair/replacement',
        completed: 'false',
        completed_at: null,
      },
      {
        work_order_id: workOrder.id,
        description: 'Test and verify fix',
        completed: 'false',
        completed_at: null,
      },
    ];

    const { error: tasksError } = await supabaseAdmin.from('task').insert(defaultTasks);
    if (tasksError) console.error('Error creating tasks:', tasksError);

    // Create initial note
    const { error: noteError } = await supabaseAdmin.from('note').insert({
      work_order_id: workOrder.id,
      text: `Work order auto-generated from downtime notification. Assigned to ${technicianName}.`,
      author: 'System',
      timestamp: new Date().toISOString(),
    });
    if (noteError) console.error('Error creating note:', noteError);

    // Update notification with work_order_id
    const { error: notifUpdateError } = await supabaseAdmin
      .from('notification')
      .update({
        work_order_id: workOrder.id,
        acknowladged: 'true',
        acknowladged_by: 'System',
        acknowladged_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (notifUpdateError) {
      console.error('Error linking work_order_id to notification:', notifUpdateError);
    } else {
      console.log(`Notification ${notificationId} linked to work order ${workOrder.id}`);
    }

    // Automatically sync machine status with the "On Solving" state of this work order
    if (workOrder.machine_id && workOrderData.type === 'downtime') {
      try {
        const baseUrl = request.nextUrl.origin;
        const statusChangeUrl = `${baseUrl}/api/machines/status-change`;
        console.log('[WO Generate] Calling status-change endpoint to update machine:', statusChangeUrl);

        const scRes = await fetch(statusChangeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ machine_id: workOrder.machine_id, new_status: 'downtime' })
        });
        
        if (!scRes.ok) {
          console.error('[WO Generate] status-change error response:', await scRes.text());
        } else {
          console.log('[WO Generate] Machine status successfully synchronized to downtime for:', workOrder.machine_id);
        }
      } catch (statusErr) {
        console.error('[WO Generate] Failed to update machine status:', statusErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...workOrder,
        location: workOrder.name_line || 'N/A',
      },
      message: 'Work order generated successfully',
    });
  } catch (error: any) {
    console.error('Error generating work order:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}