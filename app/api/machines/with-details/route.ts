import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'

/**
 * GET /api/machines/with-details
 * 
 * Fetch all machines with their associated line & process information.
 * Joins: machine → process → line_process → line
 * 
 * Query params:
 *   - lineId: string (optional, filter by production line)
 *   - status: string (optional, filter by status)
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const lineId = searchParams.get('lineId')
        const status = searchParams.get('status')

        // Get all machines with their process & line_process info
        let machineQuery = supabaseAdmin
            .from('machine')
            .select('*')
            .order('name_machine', { ascending: true })

        if (status && status !== 'all') {
            // Map frontend filter key to DB value(s)
            const statusMap: Record<string, string[]> = {
                active: ['active', 'running'],
                maintenance: ['maintenance'],
                onhold: ['On Hold', 'on-hold', 'on hold'],
                downtime: ['downtime', 'down', 'error'],
                inactive: ['inactive', 'offline', 'stopped'],
            }
            const dbStatuses = statusMap[status] || [status]
            machineQuery = machineQuery.in('status', dbStatuses)
        }

        const { data: machines, error: machineError } = await machineQuery

        if (machineError) {
            console.error('Error fetching machines:', machineError)
            return NextResponse.json({ success: false, error: 'Failed to fetch machines' }, { status: 500 })
        }

        if (!machines || machines.length === 0) {
            return NextResponse.json({ success: true, data: [] })
        }

        // Fetch all processes with their machine_id
        const { data: processes, error: processError } = await supabaseAdmin
            .from('process')
            .select('id, name, index, machine_id')

        if (processError) {
            console.error('Error fetching processes:', processError)
        }

        // Fetch all line_processes with line info
        const { data: lineProcesses, error: lpError } = await supabaseAdmin
            .from('line_process')
            .select(`
                id,
                line_id,
                process_id,
                process_order,
                line:line_id (
                    id,
                    name,
                    status
                )
            `)

        if (lpError) {
            console.error('Error fetching line_processes:', lpError)
        }

        // Build machine → process → line mapping
        const processMap = new Map<string, any>()
            ; (processes || []).forEach((p: any) => {
                processMap.set(p.id, p)
            })

        // Build machine_id → line info mapping
        const machineLineMap = new Map<string, { lineName: string; lineId: string; processName: string; processOrder: number }>()
            ; (lineProcesses || []).forEach((lp: any) => {
                const process = processMap.get(lp.process_id)
                if (process && process.machine_id) {
                    const line = lp.line as any
                    if (line) {
                        machineLineMap.set(process.machine_id, {
                            lineName: line.name || 'Unknown Line',
                            lineId: line.id,
                            processName: process.name || 'Unknown Process',
                            processOrder: lp.process_order || 0,
                        })
                    }
                }
            })

        // Enrich machines with line and process info
        let enrichedMachines = machines.map((machine: any) => {
            const lineInfo = machineLineMap.get(machine.id)
            return {
                id: machine.id,
                name_machine: machine.name_machine,
                status: machine.status || 'inactive',
                next_maintenance: machine.next_maintenance,
                last_maintenance: machine.last_maintenance,
                total_running_hours: machine.total_running_hours,
                total_downtime_hours: machine.total_downtime_hours,
                line_name: lineInfo?.lineName || null,
                line_id: lineInfo?.lineId || null,
                process_name: lineInfo?.processName || null,
                process_order: lineInfo?.processOrder || 0,
            }
        })

        // Filter by lineId if provided
        if (lineId) {
            enrichedMachines = enrichedMachines.filter((m: any) => m.line_id === lineId)
        }

        return NextResponse.json({
            success: true,
            data: enrichedMachines,
        })
    } catch (error) {
        console.error('Error in machines/with-details:', error)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
