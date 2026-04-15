import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'

/**
 * GET /api/machines/defect-rate
 * 
 * Calculates Defect/Reject Rate from defect_by_process table
 * Formula: Defect Rate (%) = (Jumlah Unit Defect / Total Unit Diproduksi) × 100
 * 
 * Query params:
 *   - machineId: string (required)
 *   - date: string (optional, YYYY-MM-DD, defaults to today WIB)
 *   - shiftId: string (optional)
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const machineId = searchParams.get('machineId')
        const dateStr = searchParams.get('date')
        const shiftId = searchParams.get('shiftId')

        if (!machineId) {
            return NextResponse.json({ success: false, error: 'machineId is required' }, { status: 400 })
        }

        // 1. Find processes → line_process for this machine
        const { data: processes, error: processError } = await supabaseAdmin
            .from('process')
            .select('id, name')
            .eq('machine_id', machineId)

        if (processError) {
            console.error('Error fetching processes:', processError)
            return NextResponse.json({ success: false, error: 'Failed to fetch processes' }, { status: 500 })
        }

        if (!processes || processes.length === 0) {
            return NextResponse.json({ success: true, data: buildEmptyDefectResult() })
        }

        const processIds = processes.map((p: any) => p.id)

        const { data: lineProcesses, error: lpError } = await supabaseAdmin
            .from('line_process')
            .select('id, line_id')
            .in('process_id', processIds)

        if (lpError) {
            console.error('Error fetching line_processes:', lpError)
            return NextResponse.json({ success: false, error: 'Failed to fetch line processes' }, { status: 500 })
        }

        if (!lineProcesses || lineProcesses.length === 0) {
            return NextResponse.json({ success: true, data: buildEmptyDefectResult() })
        }

        const lineProcessIds = lineProcesses.map((lp: any) => lp.id)
        const lineIds = [...new Set(lineProcesses.map((lp: any) => lp.line_id))]

        // 2. Determine target date (WIB)
        let wibDateStr: string
        if (dateStr) {
            wibDateStr = dateStr
        } else {
            const now = new Date()
            const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000)
            wibDateStr = wibNow.toISOString().split('T')[0]
        }

        // 3. Get all shifts
        const { data: allShifts } = await supabaseAdmin
            .from('shift')
            .select('id, shift_name, start_time, end_time')
            .order('start_time', { ascending: true })

        // 4. Determine shift to use
        let activeShift: { id: string; shift_name: string; start_time: string; end_time: string } | null = null
        if (shiftId && allShifts) {
            activeShift = allShifts.find((s: any) => s.id === shiftId) || null
        } else if (!shiftId && allShifts && allShifts.length > 0) {
            const now = new Date()
            const wibOffset = 7 * 60
            const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
            const wibMinutes = (utcMinutes + wibOffset) % (24 * 60)

            for (const shift of allShifts) {
                const startMin = timeToMinutes(shift.start_time)
                const endMin = timeToMinutes(shift.end_time)
                if (isInShift(wibMinutes, startMin, endMin)) {
                    activeShift = shift
                    break
                }
            }
            if (!activeShift) activeShift = allShifts[0]
        }

        // 5. Query defect_by_process with filters
        let query = supabaseAdmin
            .from('defect_by_process')
            .select('*')
            .in('line_process_id', lineProcessIds)
            .eq('recorded_date', wibDateStr)

        if (activeShift) {
            query = query.eq('shift_id', activeShift.id)
        }

        const { data: defectRecords, error: defectError } = await query.order('recorded_hour', { ascending: true })

        if (defectError) {
            console.error('Error fetching defect_by_process:', defectError)
            return NextResponse.json({ success: false, error: 'Failed to fetch defect data' }, { status: 500 })
        }

        // 6. Aggregate totals
        let totalProduced = 0
        let totalPass = 0
        let totalReject = 0

        if (defectRecords && defectRecords.length > 0) {
            defectRecords.forEach((rec: any) => {
                totalProduced += Number(rec.total_produced) || 0
                totalPass += Number(rec.total_pass) || 0
                totalReject += Number(rec.total_reject) || 0
            })
        }

        // 7. Calculate defect rate: (total_reject / total_produced) * 100
        const defectRate = totalProduced > 0
            ? (totalReject / totalProduced) * 100
            : 0

        // 8. Build hourly breakdown
        const shiftSlots = activeShift
            ? buildShiftSlots(activeShift.start_time, activeShift.end_time)
            : Array.from({ length: 24 }, (_, h) => ({
                slot: `${h.toString().padStart(2, '0')}:00-${(h + 1).toString().padStart(2, '0')}:00`,
                hour: h,
            }))

        const hourlyDefect = shiftSlots.map(s => {
            const hourRecords = (defectRecords || []).filter((r: any) => r.recorded_hour === s.hour)
            const hourProduced = hourRecords.reduce((sum: number, r: any) => sum + (Number(r.total_produced) || 0), 0)
            const hourReject = hourRecords.reduce((sum: number, r: any) => sum + (Number(r.total_reject) || 0), 0)
            const hourPass = hourRecords.reduce((sum: number, r: any) => sum + (Number(r.total_pass) || 0), 0)
            const hourDefectRate = hourProduced > 0 ? (hourReject / hourProduced) * 100 : 0

            return {
                hour_slot: s.slot,
                total_produced: hourProduced,
                total_pass: hourPass,
                total_reject: hourReject,
                defect_rate: +hourDefectRate.toFixed(2),
            }
        })

        return NextResponse.json({
            success: true,
            data: {
                totalProduced,
                totalPass,
                totalReject,
                defectRate: +defectRate.toFixed(2),
                hourly: hourlyDefect,
                date: wibDateStr,
                machineId,
                shift: activeShift ? {
                    id: activeShift.id,
                    name: activeShift.shift_name,
                    start_time: activeShift.start_time,
                    end_time: activeShift.end_time,
                } : null,
                allShifts: (allShifts || []).map((s: any) => ({
                    id: s.id,
                    name: s.shift_name,
                    start_time: s.start_time,
                    end_time: s.end_time,
                })),
            },
        })
    } catch (error) {
        console.error('Error in /api/machines/defect-rate:', error)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

function timeToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
}

function isInShift(nowMinutes: number, startMin: number, endMin: number): boolean {
    if (endMin > startMin) {
        return nowMinutes >= startMin && nowMinutes < endMin
    } else {
        return nowMinutes >= startMin || nowMinutes < endMin
    }
}

function buildShiftSlots(startTime: string, endTime: string) {
    const startH = parseInt(startTime.split(':')[0], 10)
    const endH = parseInt(endTime.split(':')[0], 10)
    const slots: { slot: string; hour: number }[] = []

    if (endH > startH) {
        for (let h = startH; h < endH; h++) {
            slots.push({
                slot: `${h.toString().padStart(2, '0')}:00-${(h + 1).toString().padStart(2, '0')}:00`,
                hour: h,
            })
        }
    } else {
        for (let h = startH; h < 24; h++) {
            slots.push({
                slot: `${h.toString().padStart(2, '0')}:00-${(h + 1).toString().padStart(2, '0')}:00`,
                hour: h,
            })
        }
        for (let h = 0; h < endH; h++) {
            slots.push({
                slot: `${h.toString().padStart(2, '0')}:00-${(h + 1).toString().padStart(2, '0')}:00`,
                hour: h,
            })
        }
    }
    return slots
}

function buildEmptyDefectResult() {
    return {
        totalProduced: 0,
        totalPass: 0,
        totalReject: 0,
        defectRate: 0,
        hourly: [],
        shift: null,
        allShifts: [],
    }
}
