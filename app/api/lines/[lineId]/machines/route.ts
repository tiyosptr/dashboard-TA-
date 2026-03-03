import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'

/**
 * GET /api/lines/[lineId]/machines
 * 
 * Fetches all machines for a specific line, following the relationship:
 * line → line_process → process → machine
 * 
 * Returns machines grouped by process, ordered by process_order
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ lineId: string }> }
) {
    try {
        const { lineId } = await params

        if (!lineId) {
            return NextResponse.json({
                success: false,
                error: 'lineId is required'
            }, { status: 400 })
        }

        // 1. Get all line_process entries for this line (with process details)
        const { data: lineProcesses, error: lpError } = await supabaseAdmin
            .from('line_process')
            .select(`
                id,
                process_order,
                process_id,
                process:process_id (
                    id,
                    name,
                    index,
                    machine_id,
                    machine:machine_id (
                        id,
                        name_machine,
                        status,
                        next_maintenance,
                        last_maintenance,
                        total_running_hours
                    )
                )
            `)
            .eq('line_id', lineId)
            .order('process_order', { ascending: true })

        if (lpError) {
            console.error('Error fetching line processes:', lpError)
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch line processes'
            }, { status: 500 })
        }

        // 2. Transform the data into a structured format
        const processesWithMachines = (lineProcesses || []).map((lp: any) => {
            const process = lp.process
            return {
                processOrder: lp.process_order,
                processId: process?.id,
                processName: process?.name,
                processIndex: process?.index,
                machine: process?.machine ? {
                    id: process.machine.id,
                    nameMachine: process.machine.name_machine,
                    status: process.machine.status,
                    nextMaintenance: process.machine.next_maintenance,
                    lastMaintenance: process.machine.last_maintenance,
                    totalRunningHours: process.machine.total_running_hours,
                } : null,
            }
        })

        // 3. Calculate machine status counts
        const machines = processesWithMachines
            .filter((p: any) => p.machine !== null)
            .map((p: any) => p.machine)

        const counts = {
            total: machines.length,
            running: machines.filter((m: any) => m.status === 'running').length,
            warning: machines.filter((m: any) => m.status === 'warning').length,
            error: machines.filter((m: any) => m.status === 'error').length,
            maintenance: machines.filter((m: any) => m.status === 'maintenance').length,
        }

        return NextResponse.json({
            success: true,
            data: {
                processes: processesWithMachines,
                machines,
                counts,
            }
        })
    } catch (error) {
        console.error('Error fetching line machines:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch line machines'
        }, { status: 500 })
    }
}
