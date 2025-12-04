//app/api/notifications/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/supabase';

// PATCH - Update notification (mark as read, acknowledge)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, acknowledgedBy } = body;
    const notificationId = id;

    const updateData: any = {};

    if (action === 'mark_read') {
      updateData.read = 'true';
    } else if (action === 'acknowledge') {
      updateData.acknowladged = 'true';
      updateData.acknowladged_by = acknowledgedBy || 'System Admin';
      updateData.acknowladged_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('notification')
      .update(updateData)
      .eq('id', notificationId)
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
      message: 'Notification updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}