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
        // Hitung detik dari midnight menggunakan getHours/getMinutes/getSeconds
        const nowSec = today.getHours() * 3600 + today.getMinutes() * 60 + today.getSeconds();
        
        console.log('[Shift Detection] Current time:', {
            time: `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}:${String(today.getSeconds()).padStart(2, '0')}`,
            nowSec,
        });
        
        const { data: shifts } = await supabaseAdmin
            .from('shift')
            .select('id, shift_name, start_time, end_time')
            .order('shift_name');
        
        if (shifts) {
            for (const s of shifts) {
                const ss = timeToSeconds(s.start_time);
                const se = timeToSeconds(s.end_time);
                
                console.log('[Shift Detection] Checking shift:', {
                    shift_name: s.shift_name,
                    start_time: s.start_time,
                    end_time: s.end_time,
                    ss,
                    se,
                });
                
                // Cek aktif (handle shift malam yang lewat tengah malam)
                let active = false;
                if (se > ss) {
                    // Shift normal (tidak lewat tengah malam)
                    // Contoh: 07:00-15:00 atau 15:00-23:00
                    active = (nowSec >= ss && nowSec < se);
                } else {
                    // Shift lewat tengah malam
                    // Contoh: 23:00-07:00 → aktif jika nowSec >= 23:00 ATAU nowSec < 07:00
                    active = (nowSec >= ss || nowSec < se);
                }
                
                console.log('[Shift Detection] Active check:', { active });
                
                if (active) {
                    shiftRow = s;
                    console.log('[Shift Detection] Selected shift:', s.shift_name);
                    break;
                }
            }
        }
    }

    if (!shiftRow) {
        console.log('[Shift Detection] No shift found for current time');
        return null;
    }

    const startSec = timeToSeconds(shiftRow.start_time);
    const endSec = timeToSeconds(shiftRow.end_time);
    const total_shift_seconds = calcShiftDurationSeconds(startSec, endSec);

    // Penyesuaian shift lewat tengah malam (cross-day) untuk penentuan shiftStart absolut
    const nowSecForFix = today.getHours() * 3600 + today.getMinutes() * 60 + today.getSeconds();
    
    // Tentukan tanggal mulai shift
    let shiftStartDate = new Date(today);
    shiftStartDate.setHours(0, 0, 0, 0);
    
    // Jika shift melewati tengah malam DAN waktu sekarang < waktu mulai shift
    // Berarti shift dimulai kemarin
    if (endSec < startSec && nowSecForFix < startSec) {
        // Contoh: Shift 23:00-07:00, sekarang jam 02:00
        // Shift dimulai kemarin jam 23:00
        shiftStartDate.setDate(shiftStartDate.getDate() - 1);
    }
    
    let shiftStart = buildShiftTimestamp(shiftStartDate, startSec);
    const shiftEnd = new Date(shiftStart.getTime() + total_shift_seconds * 1000);
    
    console.log('[Shift Detection] Final shift window:', {
        shift_id: shiftRow.id,
        shift_name: shiftRow.shift_name,
        now_time: today.toISOString(),
        now_sec: nowSecForFix,
        start_sec: startSec,
        end_sec: endSec,
        is_overnight: endSec < startSec,
        shift_start_date: shiftStartDate.toISOString(),
        shift_start_ts: shiftStart.toISOString(),
        shift_end_ts: shiftEnd.toISOString(),
    });

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
