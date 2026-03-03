import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

/**
 * GET /api/process
 * Mengambil semua master data process
 */
export async function GET(request: NextRequest) {
    try {
        const { data: processes, error } = await supabaseAdmin
            .from('process')
            .select('*')
            .order('index', { ascending: true });

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: processes || [] });
    } catch (error) {
        console.error('Error fetching processes:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/process
 * Menambahkan master process baru
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, index } = body;

        if (!name) {
            return NextResponse.json({ success: false, error: 'Nama process wajib diisi' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('process')
            .insert({ name, index: index || 0 })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data, message: 'Process berhasil ditambahkan' }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
