import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/machines/update-maintenance
 * Update next_maintenance (and optionally last_maintenance) on a machine.
 *
 * Body: { machine_id: string, next_maintenance: string (ISO date) }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { machine_id, next_maintenance } = body;

    if (!machine_id) {
      return NextResponse.json(
        { success: false, error: 'machine_id is required' },
        { status: 400 }
      );
    }

    if (!next_maintenance) {
      return NextResponse.json(
        { success: false, error: 'next_maintenance is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('machine')
      .update({ next_maintenance: new Date(next_maintenance).toISOString() })
      .eq('id', machine_id)
      .select('id, name_machine, status, next_maintenance, last_maintenance')
      .single();

    if (error) {
      console.error('Error updating next_maintenance:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error updating maintenance schedule:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update maintenance schedule' },
      { status: 500 }
    );
  }
}
