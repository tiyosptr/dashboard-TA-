//app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

// GET - Get all notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // 'unread', 'acknowledged', or 'all'
    const lineId = searchParams.get('lineId');

    let query = supabaseAdmin
      .from('notification')
      .select('*')
      .order('start_at', { ascending: false });

    // If lineId is provided, only fetch notifications for machines/processes on that line
    if (lineId) {
      const { data: lpData } = await supabaseAdmin
        .from('line_process')
        .select('process_id')
        .eq('line_id', lineId);

      const processIds = (lpData || []).map((lp: any) => lp.process_id);

      if (processIds.length > 0) {
        query = query.in('process_id', processIds);
      } else {
        // Line has no processes, return empty
        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }

    if (filter === 'unread') {
      query = query.eq('read', 'false');
    } else if (filter === 'acknowledged') {
      query = query.eq('acknowladged', 'true');
    }

    const { data, error } = await query;

    if (error) throw error;

    // Resolve line names for notifications via process_id -> line_process -> line
    const processIds = [...new Set((data || []).filter((n: any) => n.process_id).map((n: any) => n.process_id))];

    let lineMap: Record<string, string> = {};
    if (processIds.length > 0) {
      const { data: lpData } = await supabaseAdmin
        .from('line_process')
        .select('process_id, line:line_id(id, name_line)')
        .in('process_id', processIds);

      if (lpData) {
        for (const lp of lpData) {
          const line = lp.line as any;
          if (line && lp.process_id) {
            lineMap[lp.process_id] = line.name_line || 'Unknown Line';
          }
        }
      }
    }

    // Transform data
    const notifications = (data || []).map((n: any) => ({
      ...n,
      read: n.read === 'true',
      acknowledged: n.acknowladged === 'true',
      name_line: n.process_id ? (lineMap[n.process_id] || null) : null,
    }));

    return NextResponse.json({
      success: true,
      data: notifications,
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// POST - Create new notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { machineId, machineName, reason, severity = 'high', processId } = body;

    const notificationData = {
      type: 'Downtime',
      severity: severity,
      machine_id: machineId || null,
      machine_name: machineName,
      process_id: processId || null,
      messages: reason,
      read: 'false',
      acknowladged: 'false',
      acknowladged_by: null,
      acknowladged_at: null,
      duration: null,
      start_at: new Date().toISOString(),
      done_at: null,
    };

    const { data, error } = await supabaseAdmin
      .from('notification')
      .insert(notificationData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        read: false,
        acknowledged: false,
      },
      message: 'Notification created successfully',
    });
  } catch (error: any) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT - Update notification (acknowledge/read/dismiss)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, read, acknowledged, doneAt } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Notification ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (read !== undefined) updateData.read = read ? 'true' : 'false';
    if (acknowledged !== undefined) {
      updateData.acknowladged = acknowledged ? 'true' : 'false';
      if (acknowledged) {
        updateData.acknowladged_at = new Date().toISOString();
      }
    }
    if (doneAt !== undefined) {
      updateData.done_at = doneAt;
    }

    const { data, error } = await supabaseAdmin
      .from('notification')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        read: data.read === 'true',
        acknowledged: data.acknowladged === 'true',
      },
    });
  } catch (error: any) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}