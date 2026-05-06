'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Layers, Factory, AlertCircle, Loader2, GitCommit,
    Settings2, Hash, ArrowDown, Printer, X, Tag,
    CheckCircle2, Barcode, ChevronDown, Search, Check,
} from 'lucide-react';

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

interface Toast {
    id: number;
    type: 'success' | 'error';
    message: string;
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
    const [toasts, setToasts] = useState<Toast[]>([]);

    // SN Modal state
    const [snModalOpen, setSnModalOpen] = useState(false);
    const [selectedLine, setSelectedLine] = useState<LineWithProcesses | null>(null);
    const [activePns, setActivePns] = useState<any[]>([]);
    const [selectedPnId, setSelectedPnId] = useState('');
    const [pnSearch, setPnSearch] = useState('');
    const [pnDropdownOpen, setPnDropdownOpen] = useState(false);
    const [generatingSn, setGeneratingSn] = useState(false);
    const [snQuantity, setSnQuantity] = useState(1);
    const [generatedSns, setGeneratedSns] = useState<string[]>([]);
    const [selectedLineProcessId, setSelectedLineProcessId] = useState('');
    const [loadingPns, setLoadingPns] = useState(false);

    const addToast = (type: 'success' | 'error', message: string) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };

    const openSnModal = async (line: LineWithProcesses, lpId: string) => {
        setSelectedLine(line);
        setSelectedLineProcessId(lpId);
        setSnModalOpen(true);
        setGeneratedSns([]);
        setSnQuantity(1);
        setActivePns([]);
        setSelectedPnId('');
        setPnSearch('');
        setPnDropdownOpen(false);
        setLoadingPns(true);

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
            console.error('Failed to fetch PNs:', err);
            addToast('error', 'Failed to load Part Numbers');
        } finally {
            setLoadingPns(false);
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
                    line_process_id: selectedLineProcessId,
                }),
            });
            const json = await res.json();

            if (json.success) {
                setGeneratedSns(json.data);
                addToast('success', `${json.data.length} SN generated successfully`);
            } else {
                addToast('error', json.error || 'Failed to generate SN');
            }
        } catch {
            addToast('error', 'Network error');
        } finally {
            setGeneratingSn(false);
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/lines/with-processes');
            const json = await res.json();
            if (json.success) {
                setLines(json.data);
            } else {
                setError(json.error || 'Failed to load data');
            }
        } catch {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const selectedPn = activePns.find(p => p.id === selectedPnId);
    const filteredPns = pnSearch.trim()
        ? activePns.filter(p => p.part_number?.toLowerCase().includes(pnSearch.toLowerCase()))
        : activePns;

    return (
        <div className="pb-24 min-h-screen relative p-8">
            {/* ── Toast Container ── */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
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

            {/* ── SN Generate Modal ── */}
            {snModalOpen && selectedLine && (
                <div className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-visible flex flex-col">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                    <Barcode className="text-indigo-600" size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 tracking-wide">Generate Serial Number</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Line: <span className="font-semibold text-slate-700">{selectedLine.name}</span>
                                        {' · '}
                                        Process: <span className="font-semibold text-slate-700">
                                            {selectedLine.line_process.find(lp => lp.id === selectedLineProcessId)?.process?.name || '—'}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSnModalOpen(false)}
                                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                            >
                                <X size={14} className="text-slate-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <form onSubmit={handleGenerateSn} className="space-y-4">
                                {/* PN Selector */}
                                <div>
                                    <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">
                                        Part Number (PN)
                                    </label>

                                    {loadingPns ? (
                                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50">
                                            <Loader2 size={14} className="animate-spin text-indigo-400" />
                                            <span className="text-sm text-slate-400">Loading part numbers...</span>
                                        </div>
                                    ) : activePns.length === 0 ? (
                                        <div className="px-4 py-3 rounded-xl border-2 border-amber-100 bg-amber-50">
                                            <div className="flex items-center gap-2 text-amber-700">
                                                <AlertCircle size={14} />
                                                <span className="text-sm font-semibold">No Part Numbers registered for this line.</span>
                                            </div>
                                            <p className="text-xs text-amber-600 mt-1 ml-5">
                                                Go to <strong>PN Manager</strong> to generate a Part Number first.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => { setPnDropdownOpen(!pnDropdownOpen); setPnSearch(''); }}
                                                className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-left transition-all
                                                    ${pnDropdownOpen
                                                        ? 'border-indigo-400 ring-4 ring-indigo-100 bg-white'
                                                        : selectedPn
                                                            ? 'border-indigo-200 bg-indigo-50/50'
                                                            : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                                                    }`}
                                            >
                                                <Tag size={14} className={selectedPn ? 'text-indigo-500' : 'text-slate-400'} />
                                                <span className={`flex-1 text-sm font-semibold truncate ${selectedPn ? 'text-slate-800' : 'text-slate-400'}`}>
                                                    {selectedPn ? selectedPn.part_number : 'Select Part Number...'}
                                                </span>
                                                <ChevronDown size={14} className={`text-slate-400 transition-transform ${pnDropdownOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {pnDropdownOpen && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                                                    <div className="p-2 border-b border-slate-100">
                                                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200/60">
                                                            <Search size={12} className="text-slate-400" />
                                                            <input
                                                                autoFocus
                                                                type="text"
                                                                value={pnSearch}
                                                                onChange={e => setPnSearch(e.target.value)}
                                                                placeholder="Search PN..."
                                                                className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="max-h-44 overflow-y-auto p-1.5">
                                                        {filteredPns.length === 0 ? (
                                                            <div className="text-center py-4 text-sm text-slate-400">No results</div>
                                                        ) : filteredPns.map(pn => (
                                                            <button
                                                                key={pn.id}
                                                                type="button"
                                                                onClick={() => { setSelectedPnId(pn.id); setPnDropdownOpen(false); }}
                                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all mb-0.5
                                                                    ${selectedPnId === pn.id ? 'bg-indigo-50 border border-indigo-200/60' : 'hover:bg-slate-50 border border-transparent'}`}
                                                            >
                                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedPnId === pn.id ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                                                                    <Tag size={12} className={selectedPnId === pn.id ? 'text-indigo-500' : 'text-slate-400'} />
                                                                </div>
                                                                <span className="text-sm font-semibold text-slate-700">{pn.part_number}</span>
                                                                {selectedPnId === pn.id && (
                                                                    <div className="ml-auto w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                                                                        <Check size={10} className="text-white" strokeWidth={3} />
                                                                    </div>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Quantity */}
                                <div>
                                    <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">
                                        Quantity (1 – 1000)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="1000"
                                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-sm font-semibold text-slate-700"
                                        value={snQuantity}
                                        onChange={e => setSnQuantity(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={!selectedPnId || generatingSn || activePns.length === 0}
                                    className="w-full h-[46px] flex items-center justify-center gap-2 px-6 rounded-xl text-sm font-bold transition-all bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    {generatingSn
                                        ? <><Loader2 size={16} className="animate-spin" /> Generating...</>
                                        : <><Barcode size={16} /> Generate {snQuantity} Serial Number{snQuantity > 1 ? 's' : ''}</>
                                    }
                                </button>
                            </form>

                            {/* Results */}
                            {generatedSns.length > 0 && (
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl animate-in fade-in zoom-in duration-300">
                                    <div className="flex items-center gap-2 mb-3">
                                        <CheckCircle2 size={15} className="text-emerald-600" />
                                        <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
                                            {generatedSns.length} SN Generated Successfully
                                        </p>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                        {generatedSns.map((sn, idx) => (
                                            <div key={idx} className="text-sm font-mono font-black text-slate-800 tracking-wider bg-white py-1.5 px-3 rounded-lg border border-emerald-200 shadow-sm">
                                                {sn}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-emerald-500/80 font-medium mt-2">
                                        Serial numbers have been recorded in the system.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Page Header ── */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Layers className="text-indigo-600" />
                        Process Manager
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        View process flow per line and generate Serial Numbers for any process step.
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                    <Settings2 size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* ── Content ── */}
            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                    <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading process structure...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                    <AlertCircle className="text-red-500 mb-3" size={28} />
                    <h3 className="text-sm font-bold text-red-700">Failed to Load Data</h3>
                    <p className="text-xs text-red-600 mt-1">{error}</p>
                    <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold transition-colors">
                        Retry
                    </button>
                </div>
            ) : lines.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                    <Factory className="text-slate-300 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-slate-700">No Production Lines</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm text-center">Create a production line first in Line Manager.</p>
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
                                                {line.status || 'Idle'}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                                <Layers size={10} /> {line.line_process?.length || 0} processes
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Process Flow */}
                            <div className="p-5">
                                {!line.line_process || line.line_process.length === 0 ? (
                                    <div className="py-6 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                                        <div className="w-8 h-8 rounded-full bg-slate-200/50 flex items-center justify-center mx-auto mb-2">
                                            <Layers size={14} className="text-slate-400" />
                                        </div>
                                        <p className="text-xs font-bold text-slate-500">No processes configured</p>
                                        <p className="text-[10px] text-slate-400 mt-1">This line has no process steps yet.</p>
                                    </div>
                                ) : (
                                    <div className="relative flex flex-col gap-2">
                                        {/* Connector line */}
                                        <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-indigo-100 z-0" />

                                        {line.line_process.map((lp, idx) => {
                                            const isLast = idx === line.line_process.length - 1;
                                            return (
                                                <div key={lp.id} className="relative z-10 flex gap-4 pr-2 group/step">
                                                    {/* Step node */}
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

                                                    {/* Step content */}
                                                    <div className={`flex-1 ${isLast ? 'mb-0' : 'mb-[10px]'} bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 group-hover/step:shadow-sm group-hover/step:border-indigo-100 transition-all`}>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <h4 className="text-[13px] font-extrabold text-slate-700 group-hover/step:text-indigo-700 transition-colors line-clamp-1">
                                                                {lp.process?.name || 'Unknown Process'}
                                                            </h4>
                                                            {/* Generate SN button — visible on every process */}
                                                            <button
                                                                onClick={() => openSnModal(line, lp.id)}
                                                                title="Generate Serial Number for this process"
                                                                className="flex-shrink-0 flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-sm transition-all"
                                                            >
                                                                <Barcode size={11} /> SN
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            <GitCommit size={10} className="text-slate-400" />
                                                            <p className="text-[10px] text-slate-400 line-clamp-1">
                                                                ID: {lp.process?.id?.substring(0, 8)}...
                                                            </p>
                                                            <span className="ml-auto flex items-center gap-1 text-[10px] font-mono font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                                                <Hash size={9} />idx {lp.process?.index ?? '—'}
                                                            </span>
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

            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(20px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
}
