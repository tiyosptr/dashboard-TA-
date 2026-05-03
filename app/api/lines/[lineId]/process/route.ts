import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

/**
 * GET /api/lines/[lineId]/process
 * Mendapatkan semua proses yang terhubung ke line tertentu
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ lineId: string }> }
) {
    try {
        const { lineId } = await context.params;

        const { data, error } = await supabaseAdmin
            .from('line_process')
            .select(`
                id,
                process_order,
                process_id,
                process:process_id (
                    id,
                    name,
                    index
                )
            `)
            .eq('line_id', lineId)
            .order('process_order', { ascending: true });

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Error fetching line process:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/lines/[lineId]/process
 * Assign proses baru ke suatu line
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ lineId: string }> }
) {
    try {
        const { lineId } = await context.params;
        const body = await request.json();
        const { process_id, process_order } = body;

        if (!process_id) {
            return NextResponse.json({ success: false, error: 'process_id wajib diisi' }, { status: 400 });
        }

        // 1. Ambil data template process yang dipilih
        const { data: templateProc } = await supabaseAdmin
            .from('process')
            .select('name, index')
            .eq('id', process_id)
            .single();

        if (!templateProc) {
            return NextResponse.json({ success: false, error: 'Process template tidak ditemukan' }, { status: 404 });
        }

        // 2. Duplikasi process tersebut untuk Line ini (dengan machine_id = null)
        const { data: newProc, error: newProcErr } = await supabaseAdmin
            .from('process')
            .insert({
                name: templateProc.name,
                index: templateProc.index,
                machine_id: null
            })
            .select()
            .single();

        if (newProcErr || !newProc) {
            return NextResponse.json({ success: false, error: 'Gagal membuat duplikasi process: ' + (newProcErr?.message || '') }, { status: 500 });
        }

        // 3. Link NEW process ke line
        const { data, error } = await supabaseAdmin
            .from('line_process')
            .insert({
                line_id: lineId,
                process_id: newProc.id,
                process_order: process_order || 0
            })
            .select('id, process_order, process_id, process:process_id(id, name, index)')
            .single();

        if (error) {
            if (error.code === '23505') { // unique constraint violation
                return NextResponse.json({ success: false, error: 'Process ini sudah ada di line ini' }, { status: 400 });
            }
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data, message: 'Process berhasil ditambahkan ke Line' }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/lines/[lineId]/process?id=LINE_PROCESS_ID
 * Hapus assignment proses dari line
 */
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ lineId: string }> }
) {
    try {
        const lineProcessId = request.nextUrl.searchParams.get('id');
        if (!lineProcessId) {
            return NextResponse.json({ success: false, error: 'ID assignment wajib disertakan' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('line_process')
            .delete()
            .eq('id', lineProcessId);

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Process berhasil di-detach dari line' });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
