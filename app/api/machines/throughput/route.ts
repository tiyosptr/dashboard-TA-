/**
 * GET /api/machines/throughput?machineId=xxx
 *
 * Membaca throughput terakhir yang tersimpan di table `troughput_machine`.
 * Perhitungan dilakukan di service saat data_item ditambahkan.
 *
 * Query params:
 *   - machineId (required) : ID mesin
 *   - history=true         : kembalikan semua record (untuk grafik)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getLatestThroughput,
    getThroughputHistory,
} from '@/services/throughput_machine';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const machineId = searchParams.get('machineId');
        const history = searchParams.get('history');

        if (!machineId) {
            return NextResponse.json(
                { success: false, error: 'machineId is required' },
                { status: 400 }
            );
        }

        // ── History mode ──────────────────────────────────────────────
        if (history === 'true') {
            const result = await getThroughputHistory(machineId);
            return NextResponse.json({
                success: result.success,
                data: result.data,
                error: result.error,
            });
        }

        // ── Latest throughput ─────────────────────────────────────────
        const result = await getLatestThroughput(machineId);

        return NextResponse.json({
            success: result.success,
            data: result.data
                ? {
                    id: result.data.id,
                    troughput: Number(result.data.troughput),
                    total_pass: Number(result.data.total_pass),
                    interval_time: Number(result.data.interval_time),
                    machine_id: result.data.machine_id,
                    line_id: result.data.line_id,
                    line_process_id: result.data.line_process_id,
                }
                : null,
            error: result.error,
        });
    } catch (error: any) {
        console.error('[api/machines/throughput] GET error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
