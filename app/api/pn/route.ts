import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

// GET /api/pn — ambil semua PN (dengan join line)
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const lineId = searchParams.get('line_id');

        let query = supabaseAdmin
            .from('pn')
            .select('id, part_number, created_at, line_id, line:line_id(id, name, status)')
            .order('created_at', { ascending: false });

        if (lineId) {
            query = query.eq('line_id', lineId);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data }, { status: 200 });
    } catch (err) {
        console.error('Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/pn — generate PN otomatis format PN-XXXX dan simpan
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { line_id } = body;

        if (!line_id) {
            return NextResponse.json({ error: 'line_id wajib diisi' }, { status: 400 });
        }

        // Cek line exist
        const { data: lineData, error: lineError } = await supabaseAdmin
            .from('line')
            .select('id, name')
            .eq('id', line_id)
            .single();

        if (lineError || !lineData) {
            return NextResponse.json({ error: 'Line tidak ditemukan' }, { status: 404 });
        }

        // Cari PN terakhir untuk generate nomor berikutnya
        // Format: PN-XXXX (4 digit, zero-padded)
        const { data: lastPn } = await supabaseAdmin
            .from('pn')
            .select('part_number')
            .like('part_number', 'PN-%')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        let nextNumber = 1;
        if (lastPn?.part_number) {
            const match = lastPn.part_number.match(/^PN-(\d+)$/);
            if (match) {
                nextNumber = parseInt(match[1], 10) + 1;
            }
        }

        const partNumber = `PN-${String(nextNumber).padStart(4, '0')}`;

        // Simpan ke DB
        const { data: newPn, error: insertError } = await supabaseAdmin
            .from('pn')
            .insert({
                id: crypto.randomUUID(), // <-- Tambahkan ID
                part_number: partNumber,
                line_id,
            })
            .select('id, part_number, created_at, line_id')
            .single();

        if (insertError) {
            console.error('Insert error:', insertError);
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json(
            {
                success: true,
                data: { ...newPn, line: lineData },
                message: `PN "${partNumber}" berhasil di-generate untuk Line "${lineData.name}"`,
            },
            { status: 201 }
        );
    } catch (err) {
        console.error('Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/pn?id=xxx — hapus PN
export async function DELETE(request: NextRequest) {
    try {
        const id = request.nextUrl.searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 });
        }

        const { error } = await supabaseAdmin.from('pn').delete().eq('id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'PN berhasil dihapus' });
    } catch (err) {
        console.error('Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
