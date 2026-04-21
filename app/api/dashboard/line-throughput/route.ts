import { NextRequest, NextResponse } from 'next/server';
import {
    calculateLineThroughput,
    getLatestLineThroughput,
    getLineThroughputHistory,
} from '@/services/calculation/dashboard-line/throughput_line';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/line-throughput
 *
 * Query params:
 *   - lineId:  string (required) — UUID line yang ingin dibaca
 *   - history: 'true' (optional) — jika true, kembalikan history bukan hanya latest
 *   - limit:   number (optional, default 24) — jumlah record history
 *
 * Response:
 *   { success, data: ThroughputLineRecord | ThroughputLineRecord[] }
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const lineId = searchParams.get('lineId');
        const wantHistory = searchParams.get('history') === 'true';
        const limit = parseInt(searchParams.get('limit') || '24', 10);

        if (!lineId) {
            return NextResponse.json(
                { success: false, error: 'Parameter lineId wajib diisi' },
                { status: 400 }
            );
        }

        if (wantHistory) {
            const result = await getLineThroughputHistory(lineId, limit);
            return NextResponse.json(result, {
                headers: { 'Cache-Control': 'no-store, max-age=0' },
            });
        }

        const result = await getLatestLineThroughput(lineId);
        return NextResponse.json(result, {
            headers: { 'Cache-Control': 'no-store, max-age=0' },
        });
    } catch (err: any) {
        console.error('[line-throughput GET] Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

/**
 * POST /api/dashboard/line-throughput
 *
 * Trigger kalkulasi throughput line dan simpan ke tabel troughput_line.
 *
 * Body JSON:
 *   {
 *     lineId:         string   (required)
 *     windowMinutes?: number   (default 10)
 *     shiftId?:       string
 *     targetPerHour?: number   (default 500)
 *   }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { lineId, windowMinutes = 10, shiftId, targetPerHour = 500 } = body;

        if (!lineId) {
            return NextResponse.json(
                { success: false, error: 'Field lineId wajib diisi' },
                { status: 400 }
            );
        }

        const result = await calculateLineThroughput(
            lineId,
            windowMinutes,
            shiftId ?? null,
            targetPerHour
        );

        if (!result.success) {
            return NextResponse.json(result, { status: 500 });
        }

        return NextResponse.json(result, { status: 200 });
    } catch (err: any) {
        console.error('[line-throughput POST] Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
