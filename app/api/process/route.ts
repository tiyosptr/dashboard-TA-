import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

/**
 * GET /api/process
 * Mengambil master data process (bisa difilter by lineId)
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const lineId = searchParams.get('lineId');

        if (lineId) {
            // Get processes specific to a line
            const { data, error } = await supabaseAdmin
                .from('line_process')
                .select(`
                    process_order,
                    process:process_id ( id, name, index )
                `)
                .eq('line_id', lineId)
                .order('process_order', { ascending: true });

            if (error) {
                return NextResponse.json({ success: false, error: error.message }, { status: 500 });
            }

            // Extract the nested process objects
            const processes = data
                .map((item: any) => item.process)
                .filter(Boolean);

            return NextResponse.json({ success: true, data: processes });
        }

        // Get all processes to build templates
        const { data: processes, error } = await supabaseAdmin
            .from('process')
            .select('id, name, index')
            .order('index', { ascending: true });

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Filter out duplicates by name to create a template list
        const uniqueProcesses: any[] = [];
        const seen = new Set();
        (processes || []).forEach(p => {
            const nameKey = (p.name || '').toLowerCase().trim();
            if (!seen.has(nameKey)) {
                seen.add(nameKey);
                uniqueProcesses.push(p);
            }
        });

        return NextResponse.json({ success: true, data: uniqueProcesses });
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
