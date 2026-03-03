'use client';

import { memo, useState, useEffect, useRef } from 'react';
import { Settings, Clock, Activity, Zap, Sun, Sunset, Moon, AlertCircle } from 'lucide-react';
import LineSelector from '@/components/line-selector';

interface HeaderProps {
  onManagementClick?: () => void;
  selectedLineId: string | null;
  onLineChange: (lineId: string | null, lineName: string | null) => void;
}

interface ShiftInfo {
  id: string;
  shift_name: string;
  start_time: string;
  end_time: string;
}

interface ShiftResponse {
  currentShift: ShiftInfo | null;
  isWorkingDay: boolean;
  remainingMinutes: number | null;
  currentTimeWIB?: string;
  allShifts: ShiftInfo[];
}

/** Format "HH:MM:SS" → "HH:MM" */
function fmtTime(t: string) {
  return t?.slice(0, 5) ?? '';
}

/** Pilih icon & warna berdasarkan nama/urutan shift */
function getShiftStyle(shiftName: string, allShifts: ShiftInfo[], currentId: string) {
  const idx = allShifts.findIndex((s) => s.id === currentId);
  const order = idx === -1 ? 0 : idx;
  const styles = [
    {
      icon: Sun,
      gradient: 'from-amber-500/20 to-orange-500/10',
      border: 'border-amber-400/30',
      text: 'text-amber-300',
      dot: 'bg-amber-400',
      label: 'Morning',
    },
    {
      icon: Sunset,
      gradient: 'from-orange-500/20 to-rose-500/10',
      border: 'border-orange-400/30',
      text: 'text-orange-300',
      dot: 'bg-orange-400',
      label: 'Evening',
    },
    {
      icon: Moon,
      gradient: 'from-blue-500/20 to-indigo-500/10',
      border: 'border-blue-400/30',
      text: 'text-blue-300',
      dot: 'bg-blue-400',
      label: 'Night',
    },
  ];
  return styles[order % styles.length];
}

function Header({ onManagementClick, selectedLineId, onLineChange }: HeaderProps) {
  const [time, setTime] = useState('');
  const [mounted, setMounted] = useState(false);
  const [shiftData, setShiftData] = useState<ShiftResponse | null>(null);
  const [shiftFade, setShiftFade] = useState(true); // untuk animasi saat shift berganti
  const prevShiftId = useRef<string | null>(null);

  // ── Clock (1 detik) ─────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const update = () =>
      setTime(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Fetch shift (setiap 60 detik) ───────────────────────────
  const fetchShift = async () => {
    try {
      const res = await fetch('/api/shift/current');
      const json = await res.json() as ShiftResponse;
      setShiftData(json);

      // Animasi fade jika shift berganti
      const newId = json.currentShift?.id ?? null;
      if (prevShiftId.current !== null && prevShiftId.current !== newId) {
        setShiftFade(false);
        setTimeout(() => setShiftFade(true), 400);
      }
      prevShiftId.current = newId;
    } catch (err) {
      console.error('Failed to fetch shift:', err);
    }
  };

  useEffect(() => {
    fetchShift();
    const id = setInterval(fetchShift, 60_000); // re-check setiap 1 menit
    return () => clearInterval(id);
  }, []);

  // ── Derived shift UI ─────────────────────────────────────────
  const current = shiftData?.currentShift;
  const allShifts = shiftData?.allShifts ?? [];
  const isWorking = shiftData?.isWorkingDay ?? true;
  const style = current
    ? getShiftStyle(current.shift_name, allShifts, current.id)
    : null;
  const ShiftIcon = style?.icon ?? AlertCircle;

  // Find next upcoming shift when between shifts
  const nextShift = (() => {
    if (current || !shiftData || allShifts.length === 0) return null;
    const nowStr = shiftData.currentTimeWIB; // "HH:MM"
    if (!nowStr) return allShifts[0];
    // Find the first shift whose start_time is after current time
    const found = allShifts.find(s => fmtTime(s.start_time) > nowStr);
    // If no shift starts later today, wrap around to first shift (tomorrow)
    return found || allShifts[0];
  })();

  return (
    <header className="relative flex-none z-50" style={{ height: '52px' }}>
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900" />
      {/* Animated line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] animated-gradient opacity-60" />

      <div className="relative h-full w-full px-5 flex items-center justify-between">

        {/* Left - Branding */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Activity size={17} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
              Dashboard Monitoring
              <Zap size={12} className="text-amber-400" />
            </h1>
            <p className="text-[10px] text-indigo-300/80 font-medium -mt-0.5">
              PT Volex Indonesia • Production Line
            </p>
          </div>
        </div>

        {/* Center - Line Selector */}
        <div className="flex items-center">
          <LineSelector selectedLineId={selectedLineId} onLineChange={onLineChange} />
        </div>

        {/* Right - Info + Button */}
        <div className="flex items-center gap-2.5">

          {/* Live + Clock */}
          {mounted && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Live</span>
              </div>
              <div className="w-px h-3 bg-white/20" />
              <div className="flex items-center gap-1">
                <Clock size={11} className="text-slate-400" />
                <span className="text-xs font-mono text-slate-300 tabular-nums">{time}</span>
              </div>
            </div>
          )}

          {/* ── Shift Badge ── */}
          {mounted && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r backdrop-blur-sm rounded-xl border transition-all duration-500
                ${style
                  ? `${style.gradient} ${style.border}`
                  : 'from-slate-500/10 to-slate-400/5 border-slate-500/20'
                }`}
              style={{
                opacity: shiftFade ? 1 : 0,
                transform: shiftFade ? 'translateY(0)' : 'translateY(-4px)',
                transition: 'opacity 0.4s ease, transform 0.4s ease',
              }}
            >
              {current && style ? (
                <>
                  {/* Icon */}
                  <ShiftIcon size={11} className={style.text} />

                  {/* Nama shift */}
                  <span className={`text-[11px] font-bold tracking-wide ${style.text}`}>
                    {current.shift_name}
                  </span>

                  {/* Separator */}
                  <div className="w-px h-3 bg-white/15" />

                  {/* Jam */}
                  <span className="text-[10px] font-mono text-white/50 tabular-nums">
                    {fmtTime(current.start_time)}–{fmtTime(current.end_time)}
                  </span>

                  {/* Status dot */}
                  <div className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse`} />
                </>
              ) : !isWorking ? (
                // Hari libur
                <>
                  <Moon size={11} className="text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-400 tracking-wide">Day Off</span>
                </>
              ) : shiftData ? (
                // Data sudah loaded tapi tidak ada shift aktif (gap antar shift)
                <>
                  <Clock size={11} className="text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-400 tracking-wide">
                    Between Shifts
                  </span>
                  {nextShift && (
                    <>
                      <div className="w-px h-3 bg-white/15" />
                      <span className="text-[10px] font-mono text-white/40 tabular-nums">
                        Next: {nextShift.shift_name} ({fmtTime(nextShift.start_time)})
                      </span>
                    </>
                  )}
                </>
              ) : (
                // Benar-benar loading
                <span className="text-[11px] font-bold text-slate-400 tracking-wide animate-pulse">
                  Loading shift...
                </span>
              )}
            </div>
          )}

          {/* Management Button */}
          <button
            onClick={onManagementClick}
            className="group flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-xs font-bold hover:from-indigo-500 hover:to-purple-500 transition-all duration-300 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-95"
          >
            <Settings size={13} className="group-hover:rotate-90 transition-transform duration-500" />
            Management
          </button>
        </div>
      </div>
    </header>
  );
}

export default memo(Header);