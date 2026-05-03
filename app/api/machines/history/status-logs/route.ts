import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const machineId = searchParams.get('machineId')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // 1. Fetch ALL machines to get their line/process info
    const { data: machines } = await supabaseAdmin.from('machine').select('*')
    const { data: processes } = await supabaseAdmin.from('process').select('id, name, machine_id')
    const { data: lineProcesses } = await supabaseAdmin.from('line_process').select('line_id, process_id, process_order, line:line_id(name)')

    const machineMap = new Map<string, any>()
    const processMap = new Map<string, any>()
      ; (processes || []).forEach(p => processMap.set(p.id, p))
      ; (lineProcesses || []).forEach((lp: any) => {
        const proc = processMap.get(lp.process_id)
        if (proc && proc.machine_id) {
          machineMap.set(proc.machine_id, {
            lineName: lp.line?.name || 'Unknown',
            lineId: lp.line_id,
            processName: proc.name,
            processOrder: lp.process_order || 0
          })
        }
      })

    // 2. Fetch associated work order history to get tasks
    const { data: woHistory } = await supabaseAdmin
      .from('work_order_history')
      .select(`
        id,
        machine_status_log_id,
        task
      `)

    const logToWoMap = new Map<string, any>()
      ; (woHistory || []).forEach((wo: any) => {
        if (wo.machine_status_log_id) {
          logToWoMap.set(wo.machine_status_log_id, wo)
        }
      })

    // 3. Build Query for logs
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

    // 4. Enrich logs and Aggregate by machine
    const machineAggregates = new Map<string, any>()

    // Pre-populate with ALL machines so even machines with no logs appear in the UI
    ;(machines || []).forEach((m: any) => {
      const info = machineMap.get(m.id)
      machineAggregates.set(m.id, {
        machine_id: m.id,
        name_machine: m.name_machine,
        line_name: info?.lineName || 'Unassigned',
        line_id: info?.lineId || null,
        process_name: info?.processName || 'Unknown',
        process_order: info?.processOrder || 999,
        maintenanceCount: 0,
        downtimeCount: 0,
        onHoldCount: 0,
        inactiveCount: 0
      })
    })

    const enrichedLogs = (logs || []).map((log: any) => {
      const info = machineMap.get(log.machine_id)
      const wo = logToWoMap.get(log.id)
      const tasks = Array.isArray(wo?.task) ? wo.task : []

      // Update machine aggregate
      if (!machineAggregates.has(log.machine_id)) {
        machineAggregates.set(log.machine_id, {
          machine_id: log.machine_id,
          name_machine: log.machine?.name_machine,
          line_name: info?.lineName || 'Unassigned',
          line_id: info?.lineId || null,
          process_name: info?.processName || 'Unknown',
          process_order: info?.processOrder || 999,
          maintenanceCount: 0,
          downtimeCount: 0,
          onHoldCount: 0,
          inactiveCount: 0
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
        line_name: info?.lineName || 'Unassigned',
        line_id: info?.lineId || null,
        process_name: info?.processName || 'Unknown',
        process_order: info?.processOrder || 999,
        tasks: tasks
      }
    })

    return NextResponse.json({
      success: true,
      data: enrichedLogs,
      machineSummaries: Array.from(machineAggregates.values())
    })
  } catch (error: any) {
    console.error('Error fetching machine status logs:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
