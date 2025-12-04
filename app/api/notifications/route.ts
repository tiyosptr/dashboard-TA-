//app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

// GET - Get all notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // 'unread', 'acknowledged', or 'all'

    let query = supabaseAdmin
      .from('notification')
      .select('*')
      .order('start_at', { ascending: false });

    if (filter === 'unread') {
      query = query.eq('read', 'false');
    } else if (filter === 'acknowledged') {
      query = query.eq('acknowladged', 'true');
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform data
    const notifications = (data || []).map((n: any) => ({
      ...n,
      read: n.read === 'true',
      acknowledged: n.acknowladged === 'true',
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
    const { machineId, machineName, reason, severity = 'high' } = body;

    // Get machine UUID from database by machine name
    // If machineId starts with 'M-', it's a code, not UUID
    let actualMachineId = machineId;

    if (machineId && machineId.startsWith('M-')) {
      // Try to find machine by name
      const { data: machines, error: machineError } = await supabaseAdmin
        .from('machine')
        .select('id, name_machine')
        .ilike('name_machine', `%${machineName}%`)
        .limit(1);

      if (!machineError && machines && machines.length > 0) {
        actualMachineId = machines[0].id;
      } else {
        // If machine not found, use a default UUID or create dummy
        actualMachineId = '00000000-0000-0000-0000-000000000000';
      }
    }

    const notificationData = {
      type: 'Downtime',
      severity: severity,
      machine_id: actualMachineId,
      machine_name: machineName,
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