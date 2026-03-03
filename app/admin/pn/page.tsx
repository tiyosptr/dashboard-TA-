'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Package, Factory, Zap, Plus, Trash2, RefreshCw,
    ChevronDown, Search, Check, X, AlertCircle,
    CheckCircle2, Loader2, Hash, Clock
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ─── Types ───────────────────────────────────────────────────
interface Line {
    id: string;
    name: string;
    status: string | null;
}

interface PNRecord {
    id: string;
    part_number: string;
    created_at: string;
    line_id: string | null;
    line?: { id: string; name: string; status: string | null } | null;
}

interface Toast {
    id: number;
    type: 'success' | 'error';
    message: string;
}

// ─── Utilities ───────────────────────────────────────────────
function statusColor(status: string | null) {
    switch (status?.toLowerCase()) {
        case 'active':
        case 'running': return 'bg-emerald-400';
        case 'idle': return 'bg-amber-400';
        default: return 'bg-slate-400';
    }
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function PNManagerPage() {
    const router = useRouter();

    // State
    const [lines, setLines] = useState<Line[]>([]);
    const [pnList, setPnList] = useState<PNRecord[]>([]);
    const [loadingLines, setLoadingLines] = useState(false);
    const [loadingPn, setLoadingPn] = useState(false);

    const [selectedLine, setSelectedLine] = useState<Line | null>(null);
    const [lineOpen, setLineOpen] = useState(false);
    const [lineSearch, setLineSearch] = useState('');
    const [generating, setGenerating] = useState(false);

    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = (type: 'success' | 'error', message: string) => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    };

    const fetchLines = useCallback(async () => {
        setLoadingLines(true);
        try {
            const res = await fetch('/api/lines');
            const json = await res.json();
            if (json.success) setLines(json.data);
        } catch {
            addToast('error', 'Gagal memuat data line');
        } finally {
            setLoadingLines(false);
        }
    }, []);

    const fetchPn = useCallback(async () => {
        setLoadingPn(true);
        try {
            const res = await fetch('/api/pn');
            const json = await res.json();
            if (json.data) setPnList(json.data);
        } catch {
            addToast('error', 'Gagal memuat data PN');
        } finally {
            setLoadingPn(false);
        }
    }, []);

    useEffect(() => {
        fetchLines();
        fetchPn();
    }, [fetchLines, fetchPn]);

    const handleGenerate = async () => {
        if (!selectedLine) return;
        setGenerating(true);
        try {
            const res = await fetch('/api/pn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ line_id: selectedLine.id }),
            });
            const json = await res.json();

            if (!res.ok) {
                addToast('error', json.error ?? 'Generate PN gagal');
            } else {
                addToast('success', json.message ?? 'PN berhasil di-generate');
                fetchPn();
            }
        } catch {
            addToast('error', 'Terjadi kesalahan server');
        } finally {
            setGenerating(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            const res = await fetch(`/api/pn?id=${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (!res.ok) {
                addToast('error', json.error ?? 'Hapus gagal');
            } else {
                addToast('success', 'PN berhasil dihapus');
                setPnList((prev) => prev.filter((p) => p.id !== id));
            }
        } catch {
            addToast('error', 'Terjadi kesalahan server');
        } finally {
            setDeletingId(null);
            setConfirmDelete(null);
        }
    };

    const filteredLines = lineSearch.trim()
        ? lines.filter((l) => l.name?.toLowerCase().includes(lineSearch.toLowerCase()))
        : lines;

    const nextPnNumber = (() => {
        const pns = pnList.filter((p) => /^PN-\d+$/.test(p.part_number ?? ''));
        if (pns.length === 0) return 'PN-0001';
        const nums = pns.map((p) => parseInt(p.part_number.replace('PN-', ''), 10));
        const max = Math.max(...nums);
        return `PN-${String(max + 1).padStart(4, '0')}`;
    })();

    return (
        <div className="pb-16">
            {/* ── Toast Container ── */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-[13px] font-semibold pointer-events-auto
              ${t.type === 'success'
                                ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                                : 'bg-red-500 text-white shadow-red-500/30'}`}
                        style={{ animation: 'slideIn 0.3s ease-out' }}
                    >
                        {t.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                        {t.message}
                    </div>
                ))}
            </div>

            {/* ── Page Header ── */}
            <div className="px-8 py-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Package className="text-indigo-600" />
                        Part Number Manager
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Generate and manage Part Numbers for production lines
                    </p>
                </div>
                <button
                    onClick={() => { fetchLines(); fetchPn(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[13px] font-bold transition-colors"
                >
                    <RefreshCw size={14} />
                    Refresh Data
                </button>
            </div>

            {/* ── Main Content ── */}
            <div className="max-w-5xl px-8 space-y-6">
                {/* ── Generate Form Card ── */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100/60">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl bg-violet-100 flex items-center justify-center">
                                <Plus size={14} className="text-violet-600" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-800">Generate Part Number</h2>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    Pilih line terlebih dahulu, lalu generate PN otomatis
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="flex flex-col sm:flex-row gap-4 items-end">
                            {/* Line Selector */}
                            <div className="flex-1">
                                <label className="block text-[11px] text-slate-500 font-semibold uppercase tracking-widest mb-2">
                                    Production Line
                                </label>
                                <div className="relative">
                                    <button
                                        onClick={() => { setLineOpen(!lineOpen); setLineSearch(''); }}
                                        className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl border-2 text-left transition-all duration-200
                      ${lineOpen
                                                ? 'border-violet-400 ring-4 ring-violet-100 bg-white'
                                                : selectedLine
                                                    ? 'border-violet-300 bg-violet-50/50'
                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                    >
                                        <Factory size={15} className={selectedLine ? 'text-violet-500' : 'text-slate-400'} />
                                        <span className={`flex-1 text-sm font-semibold truncate ${selectedLine ? 'text-slate-800' : 'text-slate-400'}`}>
                                            {selectedLine ? selectedLine.name : 'Pilih line produksi...'}
                                        </span>
                                        {selectedLine && (
                                            <span className={`w-1.5 h-1.5 rounded-full ${statusColor(selectedLine.status)}`} />
                                        )}
                                        <ChevronDown size={15} className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${lineOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Dropdown */}
                                    {lineOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                                            <div className="p-2 border-b border-slate-100">
                                                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200/60 focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
                                                    <Search size={12} className="text-slate-400 flex-shrink-0" />
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={lineSearch}
                                                        onChange={(e) => setLineSearch(e.target.value)}
                                                        placeholder="Cari line..."
                                                        className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
                                                    />
                                                    {lineSearch && (
                                                        <button onClick={() => setLineSearch('')}>
                                                            <X size={12} className="text-slate-400 hover:text-slate-600" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="max-h-52 overflow-y-auto p-1.5" style={{ scrollbarWidth: 'thin' }}>
                                                {loadingLines ? (
                                                    <div className="flex items-center justify-center py-6 gap-2">
                                                        <Loader2 size={14} className="animate-spin text-violet-500" />
                                                        <span className="text-sm text-slate-400">Loading...</span>
                                                    </div>
                                                ) : filteredLines.length === 0 ? (
                                                    <div className="text-center py-6">
                                                        <Factory size={20} className="text-slate-300 mx-auto mb-1" />
                                                        <p className="text-sm text-slate-400">Tidak ada line ditemukan</p>
                                                    </div>
                                                ) : (
                                                    filteredLines.map((line) => {
                                                        const isSelected = selectedLine?.id === line.id;
                                                        return (
                                                            <button
                                                                key={line.id}
                                                                onClick={() => { setSelectedLine(line); setLineOpen(false); }}
                                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all mb-0.5
                                  ${isSelected
                                                                        ? 'bg-violet-50 border border-violet-200/60'
                                                                        : 'hover:bg-slate-50 border border-transparent'
                                                                    }`}
                                                            >
                                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
                                  ${isSelected ? 'bg-violet-100' : 'bg-slate-100'}`}>
                                                                    <Factory size={13} className={isSelected ? 'text-violet-500' : 'text-slate-400'} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-sm font-semibold text-slate-700 truncate">{line.name}</div>
                                                                    <div className="flex items-center gap-1 mt-0.5">
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${statusColor(line.status)}`} />
                                                                        <span className="text-[10px] text-slate-400 capitalize">{line.status ?? 'Unknown'}</span>
                                                                    </div>
                                                                </div>
                                                                {isSelected && (
                                                                    <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                                                                        <Check size={10} className="text-white" strokeWidth={3} />
                                                                    </div>
                                                                )}
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>

                                            <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/60">
                                                <span className="text-[10px] text-slate-400">{filteredLines.length} line tersedia</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* PN Preview + Generate Button */}
                            <div className="flex flex-col gap-2 min-w-[200px]">
                                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-dashed transition-all
                  ${selectedLine ? 'border-violet-300 bg-violet-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
                                    <Hash size={13} className={selectedLine ? 'text-violet-400' : 'text-slate-300'} />
                                    <span className={`text-sm font-bold tabular-nums tracking-wider
                    ${selectedLine ? 'text-violet-600' : 'text-slate-400'}`}>
                                        {selectedLine ? nextPnNumber : 'PN-????'}
                                    </span>
                                    <span className="text-[9px] text-slate-400 ml-auto font-medium">Preview</span>
                                </div>

                                <button
                                    onClick={handleGenerate}
                                    disabled={!selectedLine || generating}
                                    className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all duration-200
                    ${selectedLine && !generating
                                            ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/30 hover:from-violet-500 hover:to-purple-500 hover:scale-[1.02] active:scale-95'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    {generating ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><Zap size={14} /> Generate PN</>}
                                </button>
                            </div>
                        </div>

                        {selectedLine && (
                            <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
                                <Factory size={12} className="text-indigo-400 flex-shrink-0" />
                                <span className="text-[11px] text-indigo-600">
                                    PN akan di-generate untuk line <strong>{selectedLine.name}</strong>
                                </span>
                                <button
                                    onClick={() => setSelectedLine(null)}
                                    className="ml-auto w-4 h-4 rounded-full bg-indigo-200 hover:bg-indigo-300 flex items-center justify-center transition-colors"
                                >
                                    <X size={8} className="text-indigo-600" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── PN List Table ── */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl bg-indigo-100 flex items-center justify-center">
                                <Package size={13} className="text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-800">Daftar Part Number</h2>
                                <p className="text-[10px] text-slate-400 mt-0.5">{pnList.length} PN terdaftar</p>
                            </div>
                        </div>
                        {loadingPn && <Loader2 size={14} className="animate-spin text-indigo-400" />}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/70">
                                    <th className="text-left px-6 py-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Part Number</th>
                                    <th className="text-left px-6 py-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Production Line</th>
                                    <th className="text-left px-6 py-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Waktu Generate</th>
                                    <th className="text-right px-6 py-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loadingPn && pnList.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center">
                                            <Loader2 size={20} className="animate-spin text-indigo-400 mx-auto mb-2" />
                                            <p className="text-sm text-slate-400">Memuat data...</p>
                                        </td>
                                    </tr>
                                ) : pnList.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-14 text-center">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                                <Package size={22} className="text-slate-300" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-500">Belum ada Part Number</p>
                                        </td>
                                    </tr>
                                ) : (
                                    pnList.map((pn, idx) => (
                                        <tr key={pn.id} className="hover:bg-slate-50/60 transition-colors group">
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-50 to-purple-100 border border-violet-200/60 flex items-center justify-center flex-shrink-0">
                                                        <Package size={13} className="text-violet-500" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-800 tabular-nums tracking-wide">{pn.part_number}</div>
                                                        <div className="text-[9px] text-slate-400 font-mono">#{String(idx + 1).padStart(3, '0')}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                {pn.line ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColor(pn.line.status)}`} />
                                                        <span className="text-sm text-slate-700 font-medium">{pn.line.name}</span>
                                                    </div>
                                                ) : <span className="text-[11px] text-slate-400 italic">— Tidak ada line</span>}
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={11} className="text-slate-400 flex-shrink-0" />
                                                    <span className="text-[11px] text-slate-500 font-medium">{fmtDate(pn.created_at)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                {confirmDelete === pn.id ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => handleDelete(pn.id)}
                                                            disabled={deletingId === pn.id}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[10px] font-bold"
                                                        >
                                                            {deletingId === pn.id ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} Ya
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDelete(null)}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold"
                                                        >
                                                            <X size={10} /> Batal
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmDelete(pn.id)}
                                                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg text-[10px] font-semibold ml-auto transition-all"
                                                    >
                                                        <Trash2 size={10} /> Hapus
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
        </div>
    );
}
