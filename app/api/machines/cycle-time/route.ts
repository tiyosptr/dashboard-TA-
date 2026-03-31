/**
 * GET /api/machines/cycle-time?machineId=xxx&shiftId=xxx
 * 
 * Membaca data cycle time yang SUDAH TERSIMPAN di table cycle_time_machine.
 * Tidak melakukan perhitungan di sini — perhitungan dilakukan saat
 * data_item ditambahkan (pass/reject) via /api/data-items-add.
 * 
 * Query params:
 *   - machineId (required): ID mesin
 *   - shiftId (optional): filter by shift
 *   - history=true (optional): get full history
 *   - days=7 (optional): lookback period for history
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getLatestCycleTime,
    getCycleTimeHistory,
} from '@/services/cycle_time_machine';

// ─── GET: Read saved cycle time (fast, no calculation) ──────────────
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const machineId = searchParams.get('machineId');
        const shiftId = searchParams.get('shiftId') || undefined;
        const history = searchParams.get('history');

        if (!machineId) {
            return NextResponse.json(
                { success: false, error: 'machineId is required' },
                { status: 400 }
            );
        }

        // History mode: return all saved records
        if (history === 'true') {
            const days = parseInt(searchParams.get('days') || '7', 10);
            const result = await getCycleTimeHistory(machineId, days);
            return NextResponse.json({
                success: result.success,
                data: result.data,
                error: result.error,
            });
        }

        // Default: return latest saved cycle time
        const result = await getLatestCycleTime(machineId, shiftId);

        return NextResponse.json({
            success: result.success,
            data: result.data ? {
                machine_id: result.data.machine_id,
                shift_id: result.data.shift_id,
                line_id: result.data.line_id,
                line_process_id: result.data.line_process_id,
                total_output: Number(result.data.total_output),
                actual_cycle_time: result.data.actual_cycle_time !== null
                    ? Number(result.data.actual_cycle_time)
                    : null,
                id_machine_status_log: result.data.id_machine_status_log,
                created_at: result.data.created_at,
            } : null,
            error: result.error,
        });
    } catch (error: any) {
        console.error('[api/machines/cycle-time] GET error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
