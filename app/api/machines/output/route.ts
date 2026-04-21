import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const machineId = searchParams.get('machineId')
        const dateStr = searchParams.get('date')
        const shiftId = searchParams.get('shiftId')

        if (!machineId) {
            return NextResponse.json({ success: false, error: 'machineId is required' }, { status: 400 })
        }

        // ── 1. Find processes → line_process for this machine ──────────
        const { data: processes, error: processError } = await supabaseAdmin
            .from('process')
            .select('id, name')
            .eq('machine_id', machineId)

        if (processError) {
            console.error('Error fetching processes:', processError)
            return NextResponse.json({ success: false, error: 'Failed to fetch processes' }, { status: 500 })
        }

        if (!processes || processes.length === 0) {
            return NextResponse.json({ success: true, data: buildEmptyResult() })
        }

        const processIds = processes.map((p: any) => p.id)

        const { data: lineProcesses, error: lpError } = await supabaseAdmin
            .from('line_process')
            .select('id')
            .in('process_id', processIds)

        if (lpError) {
            console.error('Error fetching line_processes:', lpError)
            return NextResponse.json({ success: false, error: 'Failed to fetch line processes' }, { status: 500 })
        }

        if (!lineProcesses || lineProcesses.length === 0) {
            return NextResponse.json({ success: true, data: buildEmptyResult() })
        }

        const lineProcessIds = lineProcesses.map((lp: any) => lp.id)

        console.log('[machines/output] machineId:', machineId)
        console.log('[machines/output] processIds:', processIds)
        console.log('[machines/output] lineProcessIds:', lineProcessIds)

        // ── 2. Get all shifts from DB ──────────────────────────────────
        const { data: allShifts } = await supabaseAdmin
            .from('shift')
            .select('id, shift_name, start_time, end_time')
            .order('start_time', { ascending: true })

        // ── 3. Determine target date (WIB) ─────────────────────────────
        let wibDateStr: string
        if (dateStr) {
            wibDateStr = dateStr
        } else {
            const now = new Date()
            const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000)
            wibDateStr = wibNow.toISOString().split('T')[0]
        }

        // ── 4. Determine shift to use ──────────────────────────────────
        let activeShift: { id: string; shift_name: string; start_time: string; end_time: string } | null = null

        if (shiftId && allShifts) {
            activeShift = allShifts.find((s: any) => s.id === shiftId) || null
        } else if (!shiftId && allShifts && allShifts.length > 0) {
            // Auto-detect: if today, find which shift is active now
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
            // If no active shift, use first shift as default
            if (!activeShift) activeShift = allShifts[0]
        }

        console.log('[machines/output] date:', wibDateStr, 'shiftId param:', shiftId, 'activeShift:', activeShift?.shift_name)

        // ── 5. Build UTC time range based on shift + date ──────────────
        const [year, month, day] = wibDateStr.split('-').map(Number)
        let rangeStartUtc: Date;
        let rangeEndUtc: Date;

        if (activeShift) {
            const startH = parseInt(activeShift.start_time.split(':')[0], 10);
            const startM = parseInt(activeShift.start_time.split(':')[1], 10);
            const endH = parseInt(activeShift.end_time.split(':')[0], 10);
            const endM = parseInt(activeShift.end_time.split(':')[1], 10);
            const isOvernight = endH < startH || (endH === startH && endM <= startM);

            let shiftStartDay = day;
            let shiftEndDay = day;

            if (isOvernight) {
                const wibNow = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
                if (year === wibNow.getUTCFullYear() && month === wibNow.getUTCMonth() + 1 && day === wibNow.getUTCDate()) {
                    const currentWibH = wibNow.getUTCHours();
                    const currentWibM = wibNow.getUTCMinutes();
                    const currentMinutes = currentWibH * 60 + currentWibM;
                    const startMinutes = startH * 60 + startM;

                    if (currentMinutes < startMinutes) {
                        shiftStartDay = day - 1;
                        shiftEndDay = day;
                    } else {
                        shiftStartDay = day;
                        shiftEndDay = day + 1;
                    }
                } else {
                    shiftStartDay = day;
                    shiftEndDay = day + 1;
                }
            } else {
                shiftStartDay = day;
                shiftEndDay = day;
            }

            rangeStartUtc = new Date(Date.UTC(year, month - 1, shiftStartDay, startH, startM, 0, 0));
            rangeStartUtc.setUTCHours(rangeStartUtc.getUTCHours() - 7);

            rangeEndUtc = new Date(Date.UTC(year, month - 1, shiftEndDay, endH, endM, 0, 0));
            rangeEndUtc.setUTCHours(rangeEndUtc.getUTCHours() - 7);
        } else {
            rangeStartUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
            rangeStartUtc.setUTCHours(rangeStartUtc.getUTCHours() - 7)
            rangeEndUtc = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
            rangeEndUtc.setUTCHours(rangeEndUtc.getUTCHours() - 7)
        }

        console.log('[machines/output] rangeStartUtc:', rangeStartUtc.toISOString(), 'rangeEndUtc:', rangeEndUtc.toISOString())

        // ── 6. Fetch data_items ────────────────────────────────────────
        const CHUNK = 50
        let allItems: any[] = []

        for (let i = 0; i < lineProcessIds.length; i += CHUNK) {
            const chunk = lineProcessIds.slice(i, i + CHUNK)
            const { data, error } = await supabaseAdmin
                .from('data_items')
                .select('id, status, created_at')
                .in('line_process_id', chunk)
                .gte('created_at', rangeStartUtc.toISOString())
                .lt('created_at', rangeEndUtc.toISOString())

            console.log('[machines/output] chunk query:', chunk, 'found:', data?.length, 'error:', error?.message)

            if (error) {
                console.error('Error fetching data_items chunk:', error)
            } else if (data) {
                allItems = allItems.concat(data)
            }
        }

        // ── 7. Target output ───────────────────────────────────────────
        let targetOutput = 1000
        if (allItems.length > 0) {
            const itemIds = allItems.slice(0, CHUNK).map((it: any) => it.id)
            const { data: aoRows } = await supabaseAdmin
                .from('actual_output')
                .select('target_output')
                .in('data_item_id', itemIds)
                .limit(1)

            if (aoRows && aoRows.length > 0 && aoRows[0].target_output) {
                targetOutput = Number(aoRows[0].target_output)
            }
        }

        // ── 8. Aggregate totals ────────────────────────────────────────
        const totalPass = allItems.filter((it: any) => it.status?.toLowerCase() === 'pass').length
        const totalReject = allItems.filter((it: any) => it.status?.toLowerCase() === 'reject').length
        const totalProduced = totalPass + totalReject

        // ── 9. Build hourly breakdown for the shift ────────────────────
        const shiftSlots = activeShift
            ? buildShiftSlots(activeShift.start_time, activeShift.end_time)
            : Array.from({ length: 24 }, (_, h) => ({
                slot: `${h.toString().padStart(2, '0')}:00-${(h + 1).toString().padStart(2, '0')}:00`,
                hour: h,
            }))

        // Map items into hourly buckets (WIB hours)
        const hourMap: Record<number, { pass: number; reject: number }> = {}
        for (let h = 0; h < 24; h++) hourMap[h] = { pass: 0, reject: 0 }

        allItems.forEach((item: any) => {
            if (!item.created_at) return
            const utcMs = new Date(item.created_at).getTime()
            const wibHour = new Date(utcMs + 7 * 60 * 60 * 1000).getUTCHours()
            const status = item.status?.toLowerCase()
            if (status === 'pass') hourMap[wibHour].pass++
            else if (status === 'reject') hourMap[wibHour].reject++
        })

        const hourly = shiftSlots.map(s => ({
            hour_slot: s.slot,
            pass: hourMap[s.hour].pass,
            reject: hourMap[s.hour].reject,
            total: hourMap[s.hour].pass + hourMap[s.hour].reject,
        }))

        return NextResponse.json({
            success: true,
            data: {
                totalPass,
                totalReject,
                totalProduced,
                targetOutput,
                hourly,
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
        console.error('Error in /api/machines/output:', error)
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
        // Overnight shift
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

function buildEmptyResult() {
    return {
        totalPass: 0,
        totalReject: 0,
        totalProduced: 0,
        targetOutput: 1000,
        hourly: [],
        shift: null,
        allShifts: [],
    }
}
