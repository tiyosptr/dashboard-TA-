'use client';

import { useState, useEffect, useCallback } from 'react';
import { Layers, Factory, CheckCircle2, AlertCircle, Loader2, GitCommit, Settings2, Hash, ArrowDown, Printer, X, Tag } from 'lucide-react';

interface ProcessDetail {
    id: string;
    name: string;
    index: number;
}

interface LineProcess {
    id: string;
    process_order: number;
    process: ProcessDetail;
}

interface LineWithProcesses {
    id: string;
    name: string;
    status: string | null;
    line_process: LineProcess[];
}

function statusColor(status: string | null) {
    switch (status?.toLowerCase()) {
        case 'active': return 'bg-emerald-500';
        case 'on hold': return 'bg-amber-400';
        case 'inactive': return 'bg-slate-400';
        default: return 'bg-slate-400';
    }
}

function statusBgColor(status: string | null) {
    switch (status?.toLowerCase()) {
        case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'on hold': return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'inactive': return 'bg-slate-50 text-slate-600 border-slate-200';
        default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
}

export default function ProcessManagerPage() {
    const [lines, setLines] = useState<LineWithProcesses[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // SN Modal States
    const [snModalOpen, setSnModalOpen] = useState(false);
    const [selectedLine, setSelectedLine] = useState<LineWithProcesses | null>(null);
    const [activePns, setActivePns] = useState<any[]>([]);
    const [selectedPnId, setSelectedPnId] = useState('');
    const [generatingSn, setGeneratingSn] = useState(false);
    const [snQuantity, setSnQuantity] = useState(1);
    const [generatedSns, setGeneratedSns] = useState<string[]>([]);
    const [selectedLineProcessId, setSelectedLineProcessId] = useState('');

    const openSnModal = async (line: LineWithProcesses, lpId: string) => {
        setSelectedLine(line);
        setSelectedLineProcessId(lpId);
        setSnModalOpen(true);
        setGeneratedSns([]);
        setSnQuantity(1);
        setActivePns([]);
        setSelectedPnId('');

        try {
            const res = await fetch(`/api/pn?line_id=${line.id}`);
            const json = await res.json();
            if (json.data) {
                setActivePns(json.data);
                if (json.data.length > 0) {
                    setSelectedPnId(json.data[0].id);
                }
            }
        } catch (err) {
            console.error("Failed to fetch PNs:", err);
        }
    };

    const handleGenerateSn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPnId) return;

        setGeneratingSn(true);
        setGeneratedSns([]);

        try {
            const res = await fetch('/api/sn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    part_number_id: selectedPnId,
                    quantity: snQuantity,
                    line_process_id: selectedLineProcessId
                }),
            });
            const json = await res.json();

            if (json.success) {
                setGeneratedSns(json.data);
            } else {
                alert(json.error || 'Gagal generate SN');
            }
        } catch (err) {
            alert('Kesalahan jaringan');
        } finally {
            setGeneratingSn(false);
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/lines/with-processes');
            const json = await res.json();
            if (json.success) {
                setLines(json.data);
            } else {
                setError(json.error || 'Gagal memuat data');
            }
        } catch {
            setError('Terjadi kesalahan jaringan');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="pb-24 min-h-screen relative p-8">
            {/* Modal Print Label / Generate SN */}
            {snModalOpen && selectedLine && (
                <div className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                    <Printer className="text-indigo-600" size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 tracking-wide">Print Label / Generate SN</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Line: <span className="font-semibold text-slate-700">{selectedLine.name}</span></p>
                                </div>
                            </div>
                            <button onClick={() => setSnModalOpen(false)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                                <X size={14} className="text-slate-500" />
                            </button>
                        </div>

                        <div className="p-6">
                            <form onSubmit={handleGenerateSn} className="space-y-4">
                                <div>
                                    <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">
                                        Pilih Part Number (PN)
                                    </label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-sm font-semibold text-slate-700"
                                        value={selectedPnId}
                                        onChange={(e) => setSelectedPnId(e.target.value)}
                                        required
                                    >
                                        <option value="" disabled>-- Pilih Part Number --</option>
                                        {activePns.map(pn => (
                                            <option key={pn.id} value={pn.id}>{pn.part_number}</option>
                                        ))}
                                    </select>
                                    {activePns.length === 0 && (
                                        <div className="mt-2 text-xs text-amber-600 flex items-center gap-1.5 font-medium">
                                            <AlertCircle size={12} /> Line ini belum memiliki PN yang terdaftar.
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">
                                        Jumlah SN Dihasilkan
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="1000"
                                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-sm font-semibold text-slate-700"
                                        value={snQuantity}
                                        onChange={(e) => setSnQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={!selectedPnId || generatingSn}
                                    className="w-full h-[46px] mt-2 flex items-center justify-center gap-2 px-6 rounded-xl text-sm font-bold transition-all bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    {generatingSn ? <Loader2 size={16} className="animate-spin" /> : <Tag size={16} />}
                                    Generate Serial Number
                                </button>
                            </form>

                            {generatedSns.length > 0 && (
                                <div className="mt-6 p-5 bg-emerald-50 border border-emerald-100 rounded-2xl text-center flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">
                                        {generatedSns.length} SN BERHASIL DIGENERATE
                                    </p>
                                    <div className="w-full max-h-40 overflow-y-auto space-y-1">
                                        {generatedSns.map((sn, idx) => (
                                            <div key={idx} className="text-sm font-mono font-black text-slate-800 tracking-wider bg-white py-1.5 rounded-lg border border-emerald-200 shadow-sm">
                                                {sn}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-emerald-500/80 font-medium mt-3">Nomor seri unik telah tercatat di sistem.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Layers className="text-indigo-600" />
                        Process Mapping by Line
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Menampilkan seluruh konfigurasi proses utama berdasarkan line asalnya secara berurutan.
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                    <Settings2 size={16} className={loading ? "animate-spin" : ""} />
                    Refresh Mapping
                </button>
            </div>

            {/* Content Display */}
            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                    <p className="text-sm font-semibold text-slate-500 animate-pulse">Memuat struktur process...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                    <AlertCircle className="text-red-500 mb-3" size={28} />
                    <h3 className="text-sm font-bold text-red-700">Gagal Memuat Data</h3>
                    <p className="text-xs text-red-600 mt-1">{error}</p>
                    <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold transition-colors">
                        Coba Lagi
                    </button>
                </div>
            ) : lines.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                    <Factory className="text-slate-300 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-slate-700">Belum Ada Production Line</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm text-center">Silakan buat Line Production terlebih dahulu di menu Line Manager.</p>
                </div>
            ) : (
                <div className="columns-1 md:columns-2 xl:columns-3 gap-6">
                    {lines.map((line) => (
                        <div key={line.id} className="break-inside-avoid mb-6 w-full bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden group hover:shadow-md transition-all hover:border-indigo-100">
                            {/* Card Header */}
                            <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white text-indigo-600 transition-colors">
                                        <Factory size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-[15px] font-bold text-slate-800 tracking-wide">{line.name}</h2>
                                        <div className="flex gap-1.5 items-center mt-1">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusBgColor(line.status)}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${statusColor(line.status)}`} />
                                                {line.status || "Idle"}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                                <Layers size={10} /> {line.line_process?.length || 0} process
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Body - Process Flow */}
                            <div className="p-5">
                                {!line.line_process || line.line_process.length === 0 ? (
                                    <div className="py-6 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                                        <div className="w-8 h-8 rounded-full bg-slate-200/50 flex items-center justify-center mx-auto mb-2">
                                            <Layers size={14} className="text-slate-400" />
                                        </div>
                                        <p className="text-xs font-bold text-slate-500">Tidak ada process</p>
                                        <p className="text-[10px] text-slate-400 mt-1">Line ini belum memiliki urutan proses.</p>
                                    </div>
                                ) : (
                                    <div className="relative flex flex-col gap-2">
                                        {/* Connector line background */}
                                        <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-indigo-100 z-0" />

                                        {line.line_process.map((lp, idx) => {
                                            const isLast = idx === line.line_process.length - 1;
                                            const isPrintLabel = lp.process?.name?.toLowerCase().includes('print label');
                                            return (
                                                <div key={lp.id} className="relative z-10 flex gap-4 pr-2 group/step">
                                                    {/* Node */}
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-10 h-10 rounded-full bg-white border-[3px] border-indigo-100 shadow-sm flex items-center justify-center text-indigo-600 font-bold text-xs ring-4 ring-white group-hover/step:border-indigo-500 group-hover/step:bg-indigo-50 transition-colors">
                                                            {lp.process_order}
                                                        </div>
                                                        {!isLast && (
                                                            <div className="h-full w-4 flex flex-col justify-center items-center py-1 opacity-50">
                                                                <ArrowDown size={14} className="text-indigo-300" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Content Info */}
                                                    <div className={`flex-1 mb-[10px] ${isPrintLabel ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'} rounded-2xl py-3 px-4 border group-hover/step:shadow-sm transition-all ${isLast ? 'mb-0' : ''}`}>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <h4 className={`text-[13px] font-extrabold ${isPrintLabel ? 'text-indigo-800' : 'text-slate-700 group-hover/step:text-indigo-700'} transition-colors line-clamp-1`}>{lp.process?.name || 'Unknown Process'}</h4>
                                                            <div className="flex-shrink-0 flex items-center gap-1.5">
                                                                {isPrintLabel ? (
                                                                    <button
                                                                        onClick={() => openSnModal(line, lp.id)}
                                                                        className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-md text-[10px] font-bold shadow-sm transition-colors"
                                                                    >
                                                                        <Printer size={12} /> Print
                                                                    </button>
                                                                ) : (
                                                                    <>
                                                                        <Hash size={10} className="text-slate-400" />
                                                                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                                                                            Idx: {lp.process?.index ?? '-'}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 mt-1.5">
                                                            <GitCommit size={10} className={isPrintLabel ? 'text-indigo-400' : 'text-slate-400'} />
                                                            <p className={`text-[10px] line-clamp-1 ${isPrintLabel ? 'text-indigo-600/70' : 'text-slate-400'}`}>Master id: {lp.process?.id?.substring(0, 8)}...</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
