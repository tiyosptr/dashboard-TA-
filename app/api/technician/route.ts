import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

// GET - Get available technician
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const onlyAvailable = searchParams.get('available') === 'true';

    let query = supabaseAdmin.from('technician').select('*');

    if (onlyAvailable) {
      query = query.eq('is_active', true).limit(1);

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') throw error;

      return NextResponse.json({
        success: true,
        data: data ? {
          ...data,
          is_active: Boolean(data.is_active),
        } : null,
      });
    } else {
      const { data, error } = await query;

      if (error) throw error;

      const technicians = (data || []).map((t: any) => ({
        ...t,
        is_active: Boolean(t.is_active),
      }));

      return NextResponse.json({
        success: true,
        data: technicians,
      });
    }
  } catch (error: any) {
    console.error('Error fetching technicians:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}