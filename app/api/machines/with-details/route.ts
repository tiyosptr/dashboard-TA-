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

        // Fetch all currently open status logs to append live duration
        const { data: openLogs, error: logsError } = await supabaseAdmin
            .from('machine_status_log')
            .select('machine_id, status, start_time')
            .is('end_time', null)

        if (logsError) {
            console.error('Error fetching open logs:', logsError)
        }

        const liveDurationMap = new Map<string, { activeAdd: number, downtimeAdd: number }>()
        const nowMs = Date.now()

        if (openLogs) {
            openLogs.forEach((log: any) => {
                const startMs = new Date(log.start_time).getTime()
                const diffHours = (nowMs - startMs) / (1000 * 3600)

                if (!liveDurationMap.has(log.machine_id)) {
                    liveDurationMap.set(log.machine_id, { activeAdd: 0, downtimeAdd: 0 })
                }

                const stats = liveDurationMap.get(log.machine_id)!
                const status = log.status?.toLowerCase() || ''
                if (status === 'active' || status === 'running') {
                    stats.activeAdd += diffHours
                } else if (status === 'downtime' || status === 'down' || status === 'error') {
                    stats.downtimeAdd += diffHours
                }
            })
        }

        // Fetch latest cycle time for all machines
        // Limit to recent entries to avoid large queries, since we only need the latest
        const recentDate = new Date()
        recentDate.setDate(recentDate.getDate() - 3) // Check last 3 days

        const { data: cycleTimeLogs, error: ctError } = await supabaseAdmin
            .from('cycle_time_machine')
            .select('machine_id, actual_cycle_time, created_at')
            .gte('created_at', recentDate.toISOString())
            .not('actual_cycle_time', 'is', null)
            .order('created_at', { ascending: false })

        if (ctError) {
            console.error('Error fetching cycle times:', ctError)
        }

        // Keep only the newest cycle time per machine
        const latestCycleTimeMap = new Map<string, number>()
        if (cycleTimeLogs) {
            for (const log of cycleTimeLogs) {
                if (!latestCycleTimeMap.has(log.machine_id) && log.actual_cycle_time !== null) {
                    latestCycleTimeMap.set(log.machine_id, log.actual_cycle_time)
                }
            }
        }

        // Fetch latest throughput for all machines
        const { data: throughputLogs, error: tError } = await supabaseAdmin
            .from('troughput_machine')
            .select('machine_id, troughput')

        if (tError) {
            console.error('Error fetching throughput:', tError)
        }

        const latestThroughputMap = new Map<string, number>()
        if (throughputLogs) {
            for (const log of throughputLogs) {
                latestThroughputMap.set(log.machine_id, Number(log.troughput))
            }
        }

        // Enrich machines with line, process info, and live running time
        let enrichedMachines = machines.map((machine: any) => {
            const lineInfo = machineLineMap.get(machine.id)
            const liveStats = liveDurationMap.get(machine.id) || { activeAdd: 0, downtimeAdd: 0 }

            // Add static db hours with live calculated hours mapping
            const currentRunning = parseFloat(machine.total_running_hours || '0')
            const currentDowntime = parseFloat(machine.total_downtime_hours || '0')

            const realCycleTime = latestCycleTimeMap.get(machine.id) || null
            const realThroughput = latestThroughputMap.get(machine.id) || null

            return {
                id: machine.id,
                name_machine: machine.name_machine,
                status: machine.status || 'inactive',
                next_maintenance: machine.next_maintenance,
                last_maintenance: machine.last_maintenance,
                total_running_hours: (currentRunning + liveStats.activeAdd).toFixed(4),
                total_downtime_hours: (currentDowntime + liveStats.downtimeAdd).toFixed(4),
                real_cycle_time: realCycleTime,
                real_throughput: realThroughput,
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
