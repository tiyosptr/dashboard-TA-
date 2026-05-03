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
 * Hapus Line produksi beserta seluruh data terkait (cascade manual)
 */
export async function DELETE(request: NextRequest) {
    try {
        const id = request.nextUrl.searchParams.get('id');
        if (!id) {
            return NextResponse.json({ success: false, error: 'ID wajib diisi' }, { status: 400 });
        }

        // --- 1. Gather all related IDs ---
        // Get line_process
        const { data: lineProcesses } = await supabaseAdmin.from('line_process').select('id, process_id').eq('line_id', id);
        const lineProcessIds = lineProcesses?.map(lp => lp.id) || [];
        const processIds = lineProcesses?.map(lp => lp.process_id).filter(Boolean) || [];

        // Get machines
        let machineIds: string[] = [];
        if (processIds.length > 0) {
            const { data: procs } = await supabaseAdmin.from('process').select('machine_id').in('id', processIds);
            machineIds = procs?.map(p => p.machine_id).filter(Boolean) || [];
        }

        // Get Work Orders
        const { data: wos } = await supabaseAdmin.from('work_order').select('id').eq('line_id', id);
        const woIds = wos?.map(w => w.id) || [];

        // Get Part Numbers (PN)
        const { data: pns } = await supabaseAdmin.from('pn').select('id').eq('line_id', id);
        const pnIds = pns?.map(p => p.id) || [];

        // Get Data Items
        let diIds: string[] = [];
        if (lineProcessIds.length > 0) {
            const { data: di } = await supabaseAdmin.from('data_items').select('id').in('line_process_id', lineProcessIds);
            diIds = di?.map(d => d.id) || [];
        }

        // --- 2. Delete Leaf Node Data ---
        // Parallel deletes for independent leaf nodes
        await Promise.all([
            // AI Prediction
            supabaseAdmin.from('ai_prediction_log').delete().eq('line_id', id),
            
            // Analytics & Metrics
            supabaseAdmin.from('availability_line').delete().eq('line_id', id),
            supabaseAdmin.from('cycle_time_line').delete().eq('line_id', id),
            supabaseAdmin.from('cycle_time_machine').delete().eq('line_id', id),
            supabaseAdmin.from('defect_by_process').delete().eq('line_id', id),
            supabaseAdmin.from('trend_analysis').delete().eq('line_id', id),
            supabaseAdmin.from('troughput_line').delete().eq('line_id', id),
            supabaseAdmin.from('troughput_machine').delete().eq('line_id', id),
            supabaseAdmin.from('oee_line').delete().eq('line_id', id),
            
            // Notifications (Linked to machine)
            machineIds.length > 0 ? supabaseAdmin.from('notification').delete().in('machine_id', machineIds) : Promise.resolve(),
            
            // Work Order Tasks & Notes
            woIds.length > 0 ? supabaseAdmin.from('task').delete().in('work_order_id', woIds) : Promise.resolve(),
            woIds.length > 0 ? supabaseAdmin.from('note').delete().in('work_order_id', woIds) : Promise.resolve(),
            
            // SN (depends on PN)
            pnIds.length > 0 ? supabaseAdmin.from('sn').delete().in('part_number_id', pnIds) : Promise.resolve(),
            
            // Actual Output (depends on Data Items)
            diIds.length > 0 ? supabaseAdmin.from('actual_output').delete().in('data_item_id', diIds) : Promise.resolve()
        ]);

        // --- 3. Delete Intermediate Nodes ---
        await Promise.all([
            // Work Orders & History
            supabaseAdmin.from('work_order_history').delete().eq('line_id', id),
            supabaseAdmin.from('work_order').delete().eq('line_id', id),
            
            // PN & Data Items
            pnIds.length > 0 ? supabaseAdmin.from('pn').delete().in('id', pnIds) : Promise.resolve(),
            lineProcessIds.length > 0 ? supabaseAdmin.from('data_items').delete().in('line_process_id', lineProcessIds) : Promise.resolve(),
            
            // Machine Status Log
            machineIds.length > 0 ? supabaseAdmin.from('machine_status_log').delete().in('machine_id', machineIds) : Promise.resolve()
        ]);

        // --- 4. Delete Core Hierarchy ---
        // Must delete line_process first
        await supabaseAdmin.from('line_process').delete().eq('line_id', id);
        
        // Then process
        if (processIds.length > 0) {
            await supabaseAdmin.from('process').delete().in('id', processIds);
        }
        
        // Then machines
        if (machineIds.length > 0) {
            await supabaseAdmin.from('machine').delete().in('id', machineIds);
        }

        // Finally, the Line itself
        const { error: lineError } = await supabaseAdmin.from('line').delete().eq('id', id);

        if (lineError) {
            console.error('Error deleting line:', lineError);
            return NextResponse.json({ success: false, error: lineError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Line beserta seluruh data terkait berhasil dihapus' });
    } catch (error) {
        console.error('Error deleting line:', error);
        return NextResponse.json({ success: false, error: 'Gagal menghapus line secara keseluruhan' }, { status: 500 });
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
