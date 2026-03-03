import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'

/**
 * GET /api/lines
 * Fetch all production lines with optional search filter
 * 
 * Query params:
 *   - search: string (optional, filter by name)
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const search = searchParams.get('search')

        let query = supabaseAdmin
            .from('line')
            .select('id, name, status, total_running_hours')
            .order('name', { ascending: true })

        if (search) {
            query = query.ilike('name', `%${search}%`)
        }

        const { data: lines, error } = await query

        if (error) {
            console.error('Error fetching lines:', error)
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch lines'
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            data: lines || []
        })
    } catch (error) {
        console.error('Error fetching lines:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch lines'
        }, { status: 500 })
    }
}

/**
 * POST /api/lines
 * Tambah Line produksi baru
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, status } = body

        if (!name) {
            return NextResponse.json({ success: false, error: 'Nama line wajib diisi' }, { status: 400 })
        }

        const initialStatus = status || 'Idle';
        const isStartingActive = initialStatus.toLowerCase() === 'active';

        const { data, error } = await supabaseAdmin
            .from('line')
            .insert({
                name,
                status: initialStatus,
                total_running_hours: 0,
                last_active_at: isStartingActive ? new Date().toISOString() : null
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating line:', error)
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, data, message: 'Line berhasil ditambahkan' }, { status: 201 })
    } catch (error) {
        console.error('Error creating line:', error)
        return NextResponse.json({ success: false, error: 'Gagal menambahkan line' }, { status: 500 })
    }
}

/**
 * DELETE /api/lines?id=xxxx
 * Hapus Line produksi
 */
export async function DELETE(request: NextRequest) {
    try {
        const id = request.nextUrl.searchParams.get('id')
        if (!id) {
            return NextResponse.json({ success: false, error: 'ID wajib diisi' }, { status: 400 })
        }

        const { error } = await supabaseAdmin.from('line').delete().eq('id', id)

        if (error) {
            console.error('Error deleting line:', error)
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Line berhasil dihapus' })
    } catch (error) {
        console.error('Error deleting line:', error)
        return NextResponse.json({ success: false, error: 'Gagal menghapus line' }, { status: 500 })
    }
}

/**
 * PATCH /api/lines
 * Update Line produksi (contoh: status)
 */
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, status, name } = body

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID Line wajib diisi' }, { status: 400 })
        }

        const updates: any = {}
        if (name) updates.name = name

        if (status) {
            updates.status = status

            const { data: currentLine, error: fetchError } = await supabaseAdmin
                .from('line')
                .select('status, total_running_hours, last_active_at')
                .eq('id', id)
                .single()

            if (fetchError) {
                return NextResponse.json({ success: false, error: 'Gagal mendapatkan data line terkini' }, { status: 500 })
            }

            const currentStatus = currentLine.status?.toLowerCase() || ''
            const newStatus = status.toLowerCase()

            if (currentStatus !== 'active' && newStatus === 'active') {
                updates.last_active_at = new Date().toISOString()
            } else if (currentStatus === 'active' && newStatus !== 'active') {
                if (currentLine.last_active_at) {
                    const diffMs = new Date().getTime() - new Date(currentLine.last_active_at).getTime()
                    const diffHours = diffMs / (1000 * 60 * 60)
                    const newTotal = (Number(currentLine.total_running_hours) || 0) + diffHours
                    updates.total_running_hours = Math.round(newTotal * 100) / 100
                }
                updates.last_active_at = null
            }
        }

        const { data, error } = await supabaseAdmin
            .from('line')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating line:', error)
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, data, message: 'Line berhasil diperbarui' })
    } catch (error) {
        console.error('Error updating line:', error)
        return NextResponse.json({ success: false, error: 'Gagal memperbarui line' }, { status: 500 })
    }
}
