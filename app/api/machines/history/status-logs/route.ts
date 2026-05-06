import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const machineId = searchParams.get('machineId')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // 1. Build machine → line/process map using ONLY machines that have a valid
    //    line_process entry (inner join). Machines with no line relation are excluded.
    const { data: lineProcesses } = await supabaseAdmin
      .from('line_process')
      .select('line_id, process_id, process_order, line:line_id(id, name)')

    const { data: processes } = await supabaseAdmin
      .from('process')
      .select('id, name, machine_id')

    const processMap = new Map<string, any>()
    ;(processes || []).forEach(p => processMap.set(p.id, p))

    // machineId → { lineName, lineId, processName, processOrder }
    const machineMap = new Map<string, any>()
    ;(lineProcesses || []).forEach((lp: any) => {
      const proc = processMap.get(lp.process_id)
      if (proc?.machine_id) {
        // Only set if not already mapped (first line_process wins)
        if (!machineMap.has(proc.machine_id)) {
          machineMap.set(proc.machine_id, {
            lineName: lp.line?.name || null,
            lineId: lp.line?.id || lp.line_id,
            processName: proc.name,
            processOrder: lp.process_order || 0,
          })
        }
      }
    })

    // 2. Fetch associated work order history to get tasks
    const { data: woHistory } = await supabaseAdmin
      .from('work_order_history')
      .select('id, machine_status_log_id, task')

    const logToWoMap = new Map<string, any>()
    ;(woHistory || []).forEach((wo: any) => {
      if (wo.machine_status_log_id) {
        logToWoMap.set(wo.machine_status_log_id, wo)
      }
    })

    // 3. Build query for status logs
    let query = supabaseAdmin
      .from('machine_status_log')
      .select(`
        *,
        machine:machine_id (
          id,
          name_machine
        )
      `)
      .not('end_time', 'is', null)
      .order('end_time', { ascending: false })

    if (machineId && machineId !== 'all') {
      query = query.eq('machine_id', machineId)
    }
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (startDate) {
      query = query.gte('start_time', startDate)
    }
    if (endDate) {
      query = query.lte('end_time', endDate)
    }

    const { data: logs, error } = await query
    if (error) throw error

    // 4. Enrich logs — only include logs whose machine is mapped to a line
    //    (machines with no line relation are silently skipped)
    const machineAggregates = new Map<string, any>()

    const enrichedLogs = (logs || [])
      .filter((log: any) => {
        // When fetching a specific machine (e.g. from /history/machine/[id] page),
        // always include regardless of line mapping so the detail page still works.
        if (machineId && machineId !== 'all') return true
        // Otherwise only include machines that have a known line
        return machineMap.has(log.machine_id)
      })
      .map((log: any) => {
        const info = machineMap.get(log.machine_id)
        const wo = logToWoMap.get(log.id)
        const tasks = Array.isArray(wo?.task) ? wo.task : []

        // Supabase returns duration_seconds as bigint → serialize to number
        // Also compute from timestamps as fallback if the generated column is null
        let durationSeconds: number | null = null
        if (log.duration_seconds != null) {
          durationSeconds = Number(log.duration_seconds)
        } else if (log.start_time && log.end_time) {
          durationSeconds = Math.floor(
            (new Date(log.end_time).getTime() - new Date(log.start_time).getTime()) / 1000
          )
        }

        // Build / update aggregate for this machine
        if (!machineAggregates.has(log.machine_id)) {
          machineAggregates.set(log.machine_id, {
            machine_id: log.machine_id,
            name_machine: log.machine?.name_machine,
            line_name: info?.lineName ?? null,
            line_id: info?.lineId ?? null,
            process_name: info?.processName ?? 'Unknown',
            process_order: info?.processOrder ?? 999,
            maintenanceCount: 0,
            downtimeCount: 0,
            onHoldCount: 0,
            inactiveCount: 0,
          })
        }
        const agg = machineAggregates.get(log.machine_id)
        const s = log.status?.toLowerCase()
        if (s === 'maintenance') agg.maintenanceCount++
        else if (s === 'downtime') agg.downtimeCount++
        else if (s === 'on hold') agg.onHoldCount++
        else if (s === 'inactive') agg.inactiveCount++

        return {
          ...log,
          duration_seconds: durationSeconds,   // always a number or null
          line_name: info?.lineName ?? null,
          line_id: info?.lineId ?? null,
          process_name: info?.processName ?? 'Unknown',
          process_order: info?.processOrder ?? 999,
          tasks,
        }
      })

    return NextResponse.json({
      success: true,
      data: enrichedLogs,
      machineSummaries: Array.from(machineAggregates.values()),
    })
  } catch (error: any) {
    console.error('Error fetching machine status logs:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
