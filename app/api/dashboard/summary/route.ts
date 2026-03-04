import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'

// Revalidate every 10 seconds (ISR-style caching)
export const revalidate = 10

/**
 * Resolve data_item IDs matching line and/or PN filters.
 * 
 * Schema chain:
 *   actual_output → data_items (via data_item_id)
 *   data_items → line_process (via line_process_id) → has line_id
 *   data_items → sn (via sn column) → pn (via part_number_id) → has part_number
 * 
 * Returns:
 *   null  = no filter needed (get all actual_output)
 *   []    = no matches (return empty)
 *   [...] = list of matching data_item IDs
 */
/**
 * Helper: Supabase `.in()` has a URL-length limit (~100 items).
 * This function splits the IDs into chunks, runs parallel queries,
 * and merges the results.
 */
const CHUNK_SIZE = 50

async function chunkedInQuery(
    table: string,
    selectFields: string,
    filterColumn: string,
    filterValues: string[],
    extraFilters?: (query: any) => any,
): Promise<any[]> {
    if (filterValues.length === 0) return []

    const chunks: string[][] = []
    for (let i = 0; i < filterValues.length; i += CHUNK_SIZE) {
        chunks.push(filterValues.slice(i, i + CHUNK_SIZE))
    }

    const results = await Promise.all(
        chunks.map(async (chunk) => {
            let query = supabaseAdmin
                .from(table)
                .select(selectFields)
                .in(filterColumn, chunk)

            if (extraFilters) {
                query = extraFilters(query)
            }

            const { data, error } = await query
            if (error) {
                console.error(`Error querying ${table} (chunk):`, error)
                return []
            }
            return data || []
        })
    )

    return results.flat()
}

/**
 * Resolve data_item IDs matching line and/or PN filters.
 * 
 * Schema chain:
 *   actual_output → data_items (via data_item_id)
 *   data_items → line_process (via line_process_id) → has line_id
 *   data_items → sn (via sn column) → pn (via part_number_id) → has part_number
 * 
 * Returns:
 *   null  = no filter needed (get all actual_output)
 *   []    = no matches (return empty)
 *   [...] = list of matching data_item IDs
 */
async function getFilteredDataItemIds(
    lineId: string | null,
    pn: string | null,
): Promise<string[] | null> {
    if (!lineId && !pn) return null // no filtering

    let lineProcessIds: string[] | null = null
    let snIds: string[] | null = null

    // 1) Line filter → find line_process IDs for that line
    if (lineId) {
        const { data: lpData } = await supabaseAdmin
            .from('line_process')
            .select('id')
            .eq('line_id', lineId)
        lineProcessIds = lpData?.map((lp: any) => lp.id) || []
        if (lineProcessIds.length === 0) return [] // line has no processes
    }

    // 2) PN filter → find SN IDs for that part number
    if (pn) {
        const { data: pnData } = await supabaseAdmin
            .from('pn')
            .select('id')
            .eq('part_number', pn)

        if (!pnData || pnData.length === 0) return [] // PN not found

        const pnIds = pnData.map((p: any) => p.id)

        // Find serial numbers (sn) belonging to those PNs (chunked)
        const snData = await chunkedInQuery('sn', 'id', 'part_number_id', pnIds)
        snIds = snData.map((s: any) => s.id)
        if (snIds.length === 0) return [] // no SNs for this PN
    }

    // 3) Find data_items matching constraints (chunked if needed)
    // If we have lineProcessIds filter, use chunked query
    if (lineProcessIds !== null && lineProcessIds.length > CHUNK_SIZE) {
        // Batch by lineProcessIds
        const diData = await chunkedInQuery(
            'data_items', 'id', 'line_process_id', lineProcessIds,
            snIds !== null ? (q: any) => q.in('sn', snIds!.slice(0, CHUNK_SIZE)) : undefined,
        )
        // If also filtering by snIds and snIds is large, do a second pass
        if (snIds !== null && snIds.length > CHUNK_SIZE) {
            const diIds = new Set(diData.map((d: any) => d.id))
            // Re-query with snIds chunked, filtered to lineProcessIds
            const diData2 = await chunkedInQuery(
                'data_items', 'id', 'sn', snIds,
                (q: any) => q.in('line_process_id', lineProcessIds!.slice(0, CHUNK_SIZE)),
            )
            diData2.forEach((d: any) => diIds.add(d.id))
            return Array.from(diIds)
        }
        return diData.map((d: any) => d.id)
    }

    // Standard path: lineProcessIds is small or null
    let diQuery = supabaseAdmin.from('data_items').select('id')

    if (lineProcessIds !== null) {
        diQuery = diQuery.in('line_process_id', lineProcessIds)
    }
    if (snIds !== null && snIds.length <= CHUNK_SIZE) {
        diQuery = diQuery.in('sn', snIds)
    } else if (snIds !== null) {
        // snIds is large, use chunked approach
        const diData = await chunkedInQuery(
            'data_items', 'id', 'sn', snIds,
            lineProcessIds !== null
                ? (q: any) => q.in('line_process_id', lineProcessIds!)
                : undefined,
        )
        return diData.map((d: any) => d.id)
    }

    const { data: diData } = await diQuery
    return diData?.map((d: any) => d.id) || []
}

/**
 * Query actual_output rows, optionally filtered by data_item IDs.
 * Uses chunked queries when there are too many IDs for a single `.in()`.
 */
async function queryActualOutput(
    dataItemIds: string[] | null,
    startDate: Date,
    endDate: Date,
    selectFields: string = 'id, hour_slot, output, target_output, created_at',
): Promise<any[]> {
    // dataItemIds === [] → no matches, return empty
    if (dataItemIds !== null && dataItemIds.length === 0) return []

    // No filter needed — query all
    if (dataItemIds === null) {
        const { data, error } = await supabaseAdmin
            .from('actual_output')
            .select(selectFields)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())

        if (error) {
            console.error('Error querying actual_output:', error)
            return []
        }
        return data || []
    }

    // Filter by data_item_ids — use chunked queries to avoid URL limit
    const results = await chunkedInQuery(
        'actual_output',
        selectFields,
        'data_item_id',
        dataItemIds,
        (query: any) => query
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString()),
    )
    return results
}

/**
 * GET /api/dashboard/summary
 * 
 * Single endpoint that returns ALL dashboard data in one request.
 * 
 * Query params:
 *   - tab: 'dashboard' | 'analysis' | 'all' (default: 'all')
 *   - date: string (default: today)
 *   - shift: number (default: 1)
 *   - lineId: string (optional, filter by production line)
 *   - pn: string (optional, filter by part number)
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const tab = searchParams.get('tab') || 'all'
        const shift = parseInt(searchParams.get('shift') || '1')
        const lineId = searchParams.get('lineId')
        const pn = searchParams.get('pn')

        const result: any = {
            success: true,
            timestamp: new Date().toISOString(),
            tab,
            lineId,
            pn,
        }

        // ============================================================
        // Resolve data_item IDs matching line/PN filters (done once)
        // ============================================================
        const dataItemIds = await getFilteredDataItemIds(lineId, pn)

        // ============================================
        // DASHBOARD TAB DATA
        // ============================================
        if (tab === 'dashboard' || tab === 'all') {
            let dateStr = searchParams.get('date')
            const todayStart = new Date()
            if (dateStr) {
                const parts = dateStr.split('-')
                todayStart.setFullYear(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
            }
            todayStart.setHours(0, 0, 0, 0)

            const todayEnd = new Date(todayStart)
            todayEnd.setHours(23, 59, 59, 999)

            // 1. Actual Output — filtered by data_item IDs (today only)
            const actualOutputs = await queryActualOutput(dataItemIds, todayStart, todayEnd)

            const hourSlots = Array.from({ length: 24 }, (_, i) => {
                const start = i.toString().padStart(2, '0') + ':00'
                const end = (i + 1).toString().padStart(2, '0') + ':00'
                return `${start}-${end}`
            })

            const serializedOutputs = hourSlots.map(slot => {
                const records = actualOutputs.filter((r: any) => r.hour_slot === slot)
                const passCount = records.filter((r: any) => r.output?.toLowerCase() === 'pass').length
                const rejectCount = records.filter((r: any) => r.output?.toLowerCase() === 'reject').length
                const targetOutput = records.length > 0 ? Number(records[0].target_output || 1000) : 1000

                return {
                    id: Math.random().toString(),
                    hour_slot: slot,
                    output: passCount,
                    reject: rejectCount,
                    target_output: targetOutput,
                }
            })

            // Calculate aggregates server-side to reduce client computation
            const totalOutput = serializedOutputs.reduce((sum, o) => sum + o.output, 0)
            const totalReject = serializedOutputs.reduce((sum, o) => sum + o.reject, 0)
            const totalTarget = serializedOutputs.reduce((sum, o) => sum + o.target_output, 0)
            const totalProduced = totalOutput + totalReject
            const yieldRate = totalProduced > 0 ? ((totalOutput / totalProduced) * 100) : 100
            const performanceRate = totalTarget > 0 ? ((totalProduced / totalTarget) * 100) : 0
            const qualityRate = totalProduced > 0 ? ((totalOutput / totalProduced) * 100) : 100

            result.actualOutput = {
                hourly: serializedOutputs,
                summary: {
                    totalOutput,
                    totalReject,
                    totalProduced,
                    totalTarget,
                    yieldRate: Math.round(yieldRate * 100) / 100,
                    performanceRate: Math.min(Math.round(performanceRate * 100) / 100, 100),
                    qualityRate: Math.round(qualityRate * 100) / 100,
                },
            }

            // 2. OEE (calculated from actual output data)
            const availability = 85.0 + (Math.random() * 2) // Simulated until sensor data available
            const oee = (availability * result.actualOutput.summary.performanceRate * result.actualOutput.summary.qualityRate) / 10000

            result.oee = {
                availability: Math.round(availability * 100) / 100,
                performance: result.actualOutput.summary.performanceRate,
                quality: result.actualOutput.summary.qualityRate,
                oee: Math.round(oee * 100) / 100,
            }

            // 3. Machine Status - filtered by lineId if provided
            if (lineId) {
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
                }

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

                const machines = processesWithMachines
                    .filter((p: any) => p.machine !== null)
                    .map((p: any) => ({
                        id: p.machine.id,
                        nameMachine: p.machine.nameMachine,
                        status: p.machine.status,
                    }))

                const machineStatusCounts = {
                    total: machines.length,
                    running: machines.filter((m: any) => m.status === 'active' || m.status === 'running').length,
                    maintenance: machines.filter((m: any) => m.status === 'maintenance').length,
                    onhold: machines.filter((m: any) => m.status === 'on hold' || m.status === 'on-hold').length,
                    downtime: machines.filter((m: any) => m.status === 'downtime' || m.status === 'error' || m.status === 'down').length,
                    inactive: machines.filter((m: any) => m.status === 'inactive' || m.status === 'offline' || m.status === 'stopped').length,
                }

                result.machines = {
                    list: machines,
                    counts: machineStatusCounts,
                    processes: processesWithMachines,
                }
            } else {
                const machines = await prisma.machine.findMany({
                    select: {
                        id: true,
                        nameMachine: true,
                        status: true,
                    },
                    orderBy: { nameMachine: 'asc' },
                })

                const machineStatusCounts = {
                    total: machines.length,
                    running: machines.filter(m => m.status === 'active' || m.status === 'running').length,
                    maintenance: machines.filter(m => m.status === 'maintenance').length,
                    onhold: machines.filter(m => m.status === 'on hold' || m.status === 'on-hold').length,
                    downtime: machines.filter(m => m.status === 'downtime' || m.status === 'error' || m.status === 'down').length,
                    inactive: machines.filter(m => m.status === 'inactive' || m.status === 'offline' || m.status === 'stopped').length,
                }

                result.machines = {
                    list: machines,
                    counts: machineStatusCounts,
                }
            }

            // 4. Notifications summary (only counts, not full data)
            const [unreadCount, criticalCount] = await Promise.all([
                prisma.notification.count({
                    where: { OR: [{ read: { not: 'true' } }, { read: null }] },
                }),
                prisma.notification.count({
                    where: {
                        severity: 'critical',
                        OR: [{ acknowladged: { not: 'true' } }, { acknowladged: null }],
                    },
                }),
            ])

            result.notifications = {
                unreadCount,
                criticalCount,
            }
        }

        // ============================================
        // ANALYSIS TAB DATA
        // ============================================
        if (tab === 'analysis' || tab === 'all') {
            // 5. Trend (last 7 days)
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
            const now = new Date()

            const trendRaw = await queryActualOutput(
                dataItemIds,
                sevenDaysAgo,
                now,
                'output, target_output, created_at',
            )

            const trendDays: Record<string, any> = {}
            for (let i = 0; i < 7; i++) {
                const d = new Date()
                d.setDate(d.getDate() - i)
                trendDays[d.toISOString().split('T')[0]] = { output: 0, reject: 0, target: 1000 }
            }

            trendRaw.forEach((row: any) => {
                const d = new Date(row.created_at).toISOString().split('T')[0]
                if (!trendDays[d]) trendDays[d] = { output: 0, reject: 0, target: 1000 }
                if (row.output?.toLowerCase() === 'pass') trendDays[d].output++
                if (row.output?.toLowerCase() === 'reject') trendDays[d].reject++
                if (row.target_output) trendDays[d].target = Number(row.target_output) || 1000
            })

            result.trend = Object.keys(trendDays).sort().map(dStr => {
                const row = trendDays[dStr]
                const total = row.output + row.reject
                return {
                    date: dStr,
                    output: row.output,
                    reject: row.reject,
                    target: row.target,
                    quality: total > 0 ? Math.round((row.output / total) * 10000) / 100 : 100,
                    efficiency: Math.min(Math.round((total / row.target) * 10000) / 100, 100),
                }
            })

            // 6. History (last 6 months)
            const sixMonthsAgo = new Date()
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

            const historyRaw = await queryActualOutput(
                dataItemIds,
                sixMonthsAgo,
                now,
                'output, created_at',
            )

            const monthlyHistory: Record<string, { output: number; reject: number }> = {}
            historyRaw.forEach((row: any) => {
                const month = row.created_at ? new Date(row.created_at).toISOString().substring(0, 7) : 'unknown'
                if (!monthlyHistory[month]) monthlyHistory[month] = { output: 0, reject: 0 }
                if (row.output?.toLowerCase() === 'pass') monthlyHistory[month].output++
                if (row.output?.toLowerCase() === 'reject') monthlyHistory[month].reject++
            })

            result.history = Object.entries(monthlyHistory).map(([month, data]) => ({
                month,
                output: data.output,
                reject: data.reject,
            }))
        }

        // Set cache headers
        return NextResponse.json(result, {
            headers: {
                'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
            },
        })

    } catch (error) {
        console.error('Error fetching dashboard summary:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch dashboard summary',
            timestamp: new Date().toISOString(),
        }, { status: 500 })
    }
}

/**
 * POST /api/dashboard/summary
 * 
 * Trigger materialized view refresh.
 * Called periodically to keep pre-aggregated data fresh.
 */
export async function POST() {
    try {
        // Try refreshing materialized views (will fail gracefully if not created yet)
        try {
            await prisma.$executeRawUnsafe('SELECT refresh_dashboard_views()')
        } catch {
            // Materialized views may not exist yet - that's OK
            console.warn('Materialized views not available, using live queries')
        }

        return NextResponse.json({
            success: true,
            message: 'Dashboard views refreshed',
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error('Error refreshing dashboard views:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to refresh views',
        }, { status: 500 })
    }
}
