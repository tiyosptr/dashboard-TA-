/**
 * GET /api/test-throughput?lineProcessId=xxx
 *
 * Endpoint debug untuk menguji kalkulasi throughput secara manual.
 * Gunakan ini untuk memverifikasi bahwa data tersimpan ke tabel troughput_machine.
 *
 * Params:
 *   - lineProcessId  : ID dari tabel line_process (wajib)
 *   - interval       : Δt dalam detik (opsional, default 10)
 */
import { NextRequest, NextResponse } from 'next/server';
import { triggerThroughputUpdate } from '@/services/throughput_machine';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const lineProcessId = searchParams.get('lineProcessId');

    if (!lineProcessId) {
        return NextResponse.json(
            { error: 'Param lineProcessId wajib diisi. Contoh: /api/test-throughput?lineProcessId=xxxx-xxxx' },
            { status: 400 }
        );
    }

    const intervalSeconds = parseInt(searchParams.get('interval') || '10', 10);

    console.log('[test-throughput] Manual trigger for:', lineProcessId, 'interval:', intervalSeconds);
    const result = await triggerThroughputUpdate(lineProcessId, intervalSeconds);

    return NextResponse.json({
        debug: true,
        lineProcessId,
        intervalSeconds,
        result,
    });
}
