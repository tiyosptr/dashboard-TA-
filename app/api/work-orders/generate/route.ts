//api/work-orders/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/supabase';

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
    const { notificationId } = body;

    // Get notification
    const { data: notification, error: notifError } = await supabase
      .from('notification')
      .select('*')
      .eq('id', notificationId)
      .single();

    if (notifError) throw notifError;

    // Get available technician
    const { data: technician, error: techError } = await supabase
      .from('technician')
      .select('*')
      .eq('is_active', 'true')
      .limit(1)
      .single();

    if (techError || !technician) {
      return NextResponse.json(
        {
          success: false,
          error: 'No available technician found',
        },
        { status: 400 }
      );
    }
    const woCode = generateWorkOrderId();
    // Create work order
    const workOrderData = {
      work_order_code: woCode,
      type: 'Corrective',
      priority: determinePriority(notification.severity),
      machine_id: notification.machine_id,
      machine_name: notification.machine_name,
      line_id: null,
      name_line: null,
      status: 'Pending',
      assigned_to: technician.name,
      created_at: new Date().toISOString(),
      schedule_date: new Date().toISOString(),
      completed_at: null,
      estimated_duration: '2 hours',
      actual_duration: null,
      description: notification.messages,
    };

    const { data: workOrder, error: woError } = await supabase
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

    const { error: tasksError } = await supabase.from('task').insert(defaultTasks);
    if (tasksError) console.error('Error creating tasks:', tasksError);

    // Create initial note
    const { error: noteError } = await supabase.from('note').insert({
      work_order_id: workOrder.id,
      text: `Work order auto-generated from downtime notification. Assigned to ${technician.name}.`,
      author: 'System',
      timestamp: new Date().toISOString(),
    });
    if (noteError) console.error('Error creating note:', noteError);

    // Update notification with work_order_id
    await supabase
      .from('notification')
      .update({ 
        work_order_id: workOrder.id,
        acknowladged: 'true',
        acknowladged_by: 'System',
        acknowladged_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

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