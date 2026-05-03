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

        // 1. Fetch ALL machines
        let machineQuery = supabaseAdmin
            .from('machine')
            .select('*')
            .order('name_machine', { ascending: true })

        if (status && status !== 'all') {
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
        if (machineError) throw machineError

        // 2. Fetch ALL processes to build mapping
        const { data: processes } = await supabaseAdmin
            .from('process')
            .select('id, name, machine_id')

        const processMap = new Map<string, any>()
        ;(processes || []).forEach(p => processMap.set(p.id, p))

        // 3. Fetch ALL line_processes to build mapping
        const { data: lineProcesses } = await supabaseAdmin
            .from('line_process')
            .select(`
                id, line_id, process_id, process_order,
                line:line_id (id, name)
            `)

        // machine_id -> { lineName, lineId, processName, processOrder }
        const machineLineMap = new Map<string, any>()
        ;(lineProcesses || []).forEach((lp: any) => {
            const proc = processMap.get(lp.process_id)
            if (proc && proc.machine_id) {
                // Jika mesin punya banyak proses, kita simpan yang ada di line
                machineLineMap.set(proc.machine_id, {
                    lineName: lp.line?.name || 'Unknown',
                    lineId: lp.line?.id,
                    processName: proc.name || 'Unknown',
                    processOrder: lp.process_order || 0
                })
            }
        })

        // 4. Fetch additional stats (open logs, cycle time, throughput)
        const { data: openLogs, error: logsError } = await supabaseAdmin
            .from('machine_status_log')
            .select('machine_id, status, start_time')
            .is('end_time', null)

        if (logsError) console.error('Error fetching open logs:', logsError)

        const liveDurationMap = new Map<string, { activeAdd: number, downtimeAdd: number }>()
        const nowMs = Date.now()
        if (openLogs) {
            openLogs.forEach((log: any) => {
                const startMs = new Date(log.start_time).getTime()
                if (isNaN(startMs)) return;
                
                const diffHours = Math.max(0, (nowMs - startMs) / (1000 * 3600))
                
                const machineId = log.machine_id?.toLowerCase()
                if (!machineId) return

                if (!liveDurationMap.has(machineId)) {
                    liveDurationMap.set(machineId, { activeAdd: 0, downtimeAdd: 0 })
                }
                const stats = liveDurationMap.get(machineId)!
                const s = log.status?.toLowerCase().trim() || ''
                if (s === 'active' || s === 'running') stats.activeAdd += diffHours
                else if (['downtime', 'down', 'error'].includes(s)) stats.downtimeAdd += diffHours
            })
        }

        const recentDate = new Date()
        recentDate.setDate(recentDate.getDate() - 3)
        const { data: cycleTimeLogs } = await supabaseAdmin
            .from('cycle_time_machine')
            .select('machine_id, actual_cycle_time')
            .gte('created_at', recentDate.toISOString())
            .order('created_at', { ascending: false })

        const latestCycleTimeMap = new Map<string, number>()
        if (cycleTimeLogs) {
            cycleTimeLogs.forEach(log => {
                if (!latestCycleTimeMap.has(log.machine_id)) {
                    latestCycleTimeMap.set(log.machine_id, Number(log.actual_cycle_time))
                }
            })
        }

        const { data: throughputLogs } = await supabaseAdmin
            .from('troughput_machine')
            .select('machine_id, troughput')
        const latestThroughputMap = new Map<string, number>()
        if (throughputLogs) {
            throughputLogs.forEach(log => latestThroughputMap.set(log.machine_id, Number(log.troughput)))
        }

        // 5. Final Assembly & Enrichment
        let enrichedMachines = (machines || []).map((machine: any) => {
            const mId = machine.id?.toLowerCase()
            const lineInfo = machineLineMap.get(machine.id)
            const liveStats = liveDurationMap.get(mId) || { activeAdd: 0, downtimeAdd: 0 }
            const currentRunning = parseFloat(machine.total_running_hours || '0')
            const currentDowntime = parseFloat(machine.total_downtime_hours || '0')

            return {
                id: machine.id,
                name_machine: machine.name_machine,
                status: machine.status || 'inactive',
                next_maintenance: machine.next_maintenance,
                last_maintenance: machine.last_maintenance,
                total_running_hours: (currentRunning + liveStats.activeAdd).toFixed(4),
                total_downtime_hours: (currentDowntime + liveStats.downtimeAdd).toFixed(4),
                real_cycle_time: latestCycleTimeMap.get(machine.id) || null,
                real_throughput: latestThroughputMap.get(machine.id) || null,
                line_name: lineInfo?.lineName || null,
                line_id: lineInfo?.lineId || null,
                process_name: lineInfo?.processName || null,
                process_order: lineInfo?.processOrder || 0,
                is_placeholder: false
            }
        })

        // 6. If filtering by line, add processes that DON'T have a machine yet
        if (lineId && lineId !== 'all') {
            // Find all line_processes for this line
            const lineSpecificProcesses = (lineProcesses || []).filter((lp: any) => lp.line_id === lineId)
            
            lineSpecificProcesses.forEach((lp: any) => {
                const proc = processMap.get(lp.process_id)
                if (!proc || !proc.machine_id) {
                    // This process has no machine assigned!
                    enrichedMachines.push({
                        id: `placeholder-${lp.id}`,
                        name_machine: 'No Machine Assigned',
                        status: 'inactive',
                        next_maintenance: null,
                        last_maintenance: null,
                        total_running_hours: '0.0000',
                        total_downtime_hours: '0.0000',
                        real_cycle_time: null,
                        real_throughput: null,
                        line_name: lp.line?.name || 'Unknown',
                        line_id: lp.line_id,
                        process_name: proc?.name || 'Unknown Process',
                        process_order: lp.process_order || 0,
                        is_placeholder: true
                    } as any)
                }
            })

            // Final filter to ensure we only have machines/placeholders for this line
            enrichedMachines = enrichedMachines.filter(m => m.line_id === lineId)
        }

        // Sort by process order
        enrichedMachines.sort((a, b) => (a.process_order || 0) - (b.process_order || 0))

        return NextResponse.json({ success: true, data: enrichedMachines })
    } catch (error: any) {
        console.error('Error in machines/with-details:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
