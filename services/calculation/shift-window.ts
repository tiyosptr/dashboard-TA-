import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

export interface ShiftWindow {
    shift_id: string;
    shift_name: string;
    start_time: string;     // format "HH:MM:SS"
    end_time: string;       // format "HH:MM:SS"
    shift_start_ts: string;   // ISO string (Absolute start)
    shift_end_ts: string;     // ISO string (Absolute end)
    total_shift_seconds: number;
}

/** 
 * Parse "HH:MM:SS" → total detik dari midnight 
 */
export function timeToSeconds(timeStr: string): number {
    const parts = timeStr.split(':').map(Number);
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
}

/**
 * Hitung durasi murni shift (menangani lewat tengah malam)
 */
export function calcShiftDurationSeconds(startSec: number, endSec: number): number {
    if (endSec > startSec) return endSec - startSec;
    return (86400 - startSec) + endSec; // shift crossing midnight
}

/**
 * Tempelkan detik ke objek Date (asumsi start/end dari midnight hari H)
 */
export function buildShiftTimestamp(baseDate: Date, offsetSeconds: number): Date {
    const d = new Date(baseDate);
    d.setHours(0, 0, 0, 0);
    return new Date(d.getTime() + offsetSeconds * 1000);
}

/**
 * Deteksi shift yang sedang aktif atau ambil metadata shift berdasarkan ID.
 * Mengembalikan objek window lengkap dengan timestamp absolut.
 */
export async function getActiveShiftWindow(
    shift_id?: string | null,
    baseDate?: Date
): Promise<ShiftWindow | null> {
    const today = baseDate ?? new Date();
    let shiftRow: any = null;

    if (shift_id) {
        const { data } = await supabaseAdmin
            .from('shift')
            .select('id, shift_name, start_time, end_time')
            .eq('id', shift_id)
            .maybeSingle();
        shiftRow = data;
    } else {
        const nowSec = timeToSeconds(today.toLocaleTimeString('en-GB', { hour12: false }).slice(0, 8));
        const { data: shifts } = await supabaseAdmin
            .from('shift')
            .select('id, shift_name, start_time, end_time');
        
        if (shifts) {
            for (const s of shifts) {
                const ss = timeToSeconds(s.start_time);
                const se = timeToSeconds(s.end_time);
                
                // Cek aktif (handle shift malam)
                const active = se > ss
                    ? (nowSec >= ss && nowSec <= se)
                    : (nowSec >= ss || nowSec <= se);
                
                if (active) {
                    shiftRow = s;
                    break;
                }
            }
        }
    }

    if (!shiftRow) return null;

    const startSec = timeToSeconds(shiftRow.start_time);
    const endSec = timeToSeconds(shiftRow.end_time);
    const total_shift_seconds = calcShiftDurationSeconds(startSec, endSec);

    // Penyesuaian shift lewat tengah malam (cross-day) untuk penentuan shiftStart absolut
    const nowSecForFix = timeToSeconds(today.toLocaleTimeString('en-GB', { hour12: false }).slice(0, 8));
    let shiftStart = buildShiftTimestamp(today, startSec);
    
    if (endSec < startSec && nowSecForFix < startSec) {
        // Jika kita ada di jam 01:00 AM dan shift mulai 23:00, berarti mulainya kemarin.
        shiftStart = new Date(shiftStart.getTime() - 86400 * 1000);
    }
    const shiftEnd = new Date(shiftStart.getTime() + total_shift_seconds * 1000);

    return {
        shift_id: shiftRow.id,
        shift_name: shiftRow.shift_name,
        start_time: shiftRow.start_time,
        end_time: shiftRow.end_time,
        shift_start_ts: shiftStart.toISOString(),
        shift_end_ts: shiftEnd.toISOString(),
        total_shift_seconds
    };
}
