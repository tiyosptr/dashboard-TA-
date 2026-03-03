import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

interface ShiftRow {
    id: string;
    shift_name: string;
    start_time: string; // "HH:MM:SS"
    end_time: string;   // "HH:MM:SS"
}

/**
 * Konversi "HH:MM:SS" ke total menit dari midnight.
 */
function timeToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

/**
 * Cek apakah `nowMinutes` jatuh dalam range [start, end).
 * Handle overnight shift: jika end < start (misal 21:00–04:00).
 */
function isInShift(nowMinutes: number, startMin: number, endMin: number): boolean {
    if (endMin > startMin) {
        // Shift normal siang/sore: misalnya 07:00–14:00
        return nowMinutes >= startMin && nowMinutes < endMin;
    } else {
        // Shift overnight: misalnya 21:00–04:00
        return nowMinutes >= startMin || nowMinutes < endMin;
    }
}

export async function GET() {
    try {
        // Ambil semua shift dari DB, urutkan berdasarkan start_time
        const { data: shifts, error } = await supabaseAdmin
            .from('shift')
            .select('id, shift_name, start_time, end_time')
            .order('start_time', { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!shifts || shifts.length === 0) {
            return NextResponse.json({ currentShift: null, isWorkingDay: false }, { status: 200 });
        }

        // Waktu sekarang di timezone WIB (UTC+7)
        const now = new Date();
        const wibOffset = 7 * 60; // menit
        const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
        const wibMinutes = (utcMinutes + wibOffset) % (24 * 60);

        // Cek hari kerja (Senin=1 … Sabtu=6, Minggu=0)
        // Hitung hari WIB
        const wibMs = now.getTime() + wibOffset * 60 * 1000;
        const wibDate = new Date(wibMs);
        const dayOfWeek = wibDate.getUTCDay(); // 0=Minggu, 1=Sen, ..., 6=Sab
        const isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 6; // Senin–Sabtu

        // Cari shift yang aktif
        let currentShift: ShiftRow | null = null;
        for (const shift of shifts as ShiftRow[]) {
            const startMin = timeToMinutes(shift.start_time);
            const endMin = timeToMinutes(shift.end_time);
            if (isInShift(wibMinutes, startMin, endMin)) {
                currentShift = shift;
                break;
            }
        }

        // Hitung sisa waktu shift (dalam menit)
        let remainingMinutes: number | null = null;
        if (currentShift) {
            const endMin = timeToMinutes(currentShift.end_time);
            if (endMin > wibMinutes) {
                remainingMinutes = endMin - wibMinutes;
            } else {
                // Overnight: lewat tengah malam
                remainingMinutes = (24 * 60 - wibMinutes) + endMin;
            }
        }

        return NextResponse.json({
            currentShift,
            isWorkingDay,
            remainingMinutes,
            currentTimeWIB: `${String(Math.floor(wibMinutes / 60)).padStart(2, '0')}:${String(wibMinutes % 60).padStart(2, '0')}`,
            allShifts: shifts,
        });
    } catch (err) {
        console.error('Shift API error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
