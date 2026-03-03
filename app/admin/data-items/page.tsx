'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Database, Search, AlertCircle, Loader2, Factory, CheckCircle2,
    XCircle, ArrowRight, X, ChevronRight, Layers, Hash,
    RefreshCw, LayoutGrid, Package, Eye, ArrowUpRight, Clock
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────
interface Line {
    id: string;
    name: string;
    status: string | null;
}

interface ProcessDetail {
    id: string;
    name: string;
    index: number;
}

interface LineProcess {
    id: string;
    process_order: number;
    process: ProcessDetail | null;
    line: Line | null;
}

interface DataItem {
    id: string;
    status: string;
    created_at: string;
    sn: {
        id: string;
        serial_number: string;
        pn: {
            part_number: string;
            line: { id: string; name: string } | null;
        } | null;
    } | null;
    line_process: {
        id: string;
        process_order: number;
        process: ProcessDetail | null;
        line: { id: string; name: string } | null;
    } | null;
}

// ─── Portal wrapper ─────────────────────────────────────────────
function Portal({ children }: { children: React.ReactNode }) {
    const [container, setContainer] = useState<HTMLElement | null>(null);
    useEffect(() => { setContainer(document.body); }, []);
    if (!container) return null;
    return createPortal(children, container);
}

// ─── Main Component ─────────────────────────────────────────────
export default function DataItemsManager() {
    // Line & process state
    const [lines, setLines] = useState<Line[]>([]);
    const [selectedLine, setSelectedLine] = useState<Line | null>(null);
    const [loadingLines, setLoadingLines] = useState(true);
    const [lineProcesses, setLineProcesses] = useState<LineProcess[]>([]);
    const [loadingProcesses, setLoadingProcesses] = useState(false);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProcess, setSelectedProcess] = useState<LineProcess | null>(null);
    const [dataItems, setDataItems] = useState<DataItem[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // All items for the line (to determine SN advancement status)
    const [allLineItems, setAllLineItems] = useState<DataItem[]>([]);

    // Next step modal
    const [nextModalOpen, setNextModalOpen] = useState(false);
    const [selectedItemsForNext, setSelectedItemsForNext] = useState<DataItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [availableNextProcesses, setAvailableNextProcesses] = useState<LineProcess[]>([]);
    const [targetProcessId, setTargetProcessId] = useState('');
    const [targetStatus, setTargetStatus] = useState('pass');
    const [savingNext, setSavingNext] = useState(false);

    // Process item counts
    const [processItemCounts, setProcessItemCounts] = useState<Record<string, number>>({});

    // ─── Build a map: snId → highest process_order they've reached ──
    const snMaxProcessOrder = new Map<string, { order: number; processName: string }>();
    allLineItems.forEach(item => {
        const snId = item.sn?.id;
        const order = item.line_process?.process_order ?? 0;
        const pName = item.line_process?.process?.name ?? '';
        if (snId) {
            const current = snMaxProcessOrder.get(snId);
            if (!current || order > current.order) {
                snMaxProcessOrder.set(snId, { order, processName: pName });
            }
        }
    });

    // ─── Fetch Lines ────────────────────────────────────────────
    const fetchLines = useCallback(async () => {
        setLoadingLines(true);
        try {
            const res = await fetch('/api/lines');
            const json = await res.json();
            if (json.data) setLines(json.data);
        } catch (err) { console.error(err); }
        finally { setLoadingLines(false); }
    }, []);

    useEffect(() => { fetchLines(); }, [fetchLines]);

    // ─── Fetch Processes for a Line ─────────────────────────────
    const fetchProcesses = useCallback(async (lineId: string) => {
        setLoadingProcesses(true);
        try {
            const res = await fetch(`/api/lines/${lineId}/process`);
            const json = await res.json();
            if (json.success) setLineProcesses(json.data || []);
        } catch (err) { console.error(err); }
        finally { setLoadingProcesses(false); }
    }, []);

    // ─── Fetch ALL data items for a line (for SN tracking) ──────
    const fetchAllLineItems = useCallback(async (lineId: string) => {
        try {
            const res = await fetch(`/api/data-items-list?line_id=${lineId}`);
            const json = await res.json();
            if (json.success) setAllLineItems(json.data || []);
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => {
        if (selectedLine) {
            fetchProcesses(selectedLine.id);
            fetchAllLineItems(selectedLine.id);
        } else {
            setLineProcesses([]);
            setProcessItemCounts({});
            setAllLineItems([]);
        }
    }, [selectedLine, fetchProcesses, fetchAllLineItems]);

    // ─── Fetch Process Item Counts ──────────────────────────────
    const fetchProcessCounts = useCallback(async (processes: LineProcess[]) => {
        if (processes.length === 0) return;
        try {
            const counts: Record<string, number> = {};
            await Promise.all(processes.map(async (lp) => {
                const res = await fetch(`/api/data-items-list?line_process_id=${lp.id}&count_only=true`);
                const json = await res.json();
                counts[lp.id] = json.count ?? 0;
            }));
            setProcessItemCounts(counts);
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => {
        if (lineProcesses.length > 0) fetchProcessCounts(lineProcesses);
    }, [lineProcesses, fetchProcessCounts]);

    // ─── Fetch Data Items for a Process ─────────────────────────
    const fetchDataItemsForProcess = useCallback(async (lineProcessId: string) => {
        setLoadingItems(true);
        try {
            const res = await fetch(`/api/data-items-list?line_process_id=${lineProcessId}`);
            const json = await res.json();
            if (json.success) setDataItems(json.data || []);
        } catch (err) { console.error(err); }
        finally { setLoadingItems(false); }
    }, []);

    // ─── Open Process Modal ─────────────────────────────────────
    const openProcessModal = (lp: LineProcess) => {
        setSelectedProcess(lp);
        setModalOpen(true);
        setSearchQuery('');
        setSelectedIds(new Set());
        fetchDataItemsForProcess(lp.id);
    };

    // ─── Filtered items ─────────────────────────────────────────
    const filteredItems = dataItems.filter(item => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            item.sn?.serial_number?.toLowerCase().includes(q) ||
            item.sn?.pn?.part_number?.toLowerCase().includes(q) ||
            item.status?.toLowerCase().includes(q)
        );
    });

    // ─── Determine item status ──────────────────────────────────
    const getItemAdvancementInfo = (item: DataItem) => {
        const snId = item.sn?.id;
        const currentOrder = selectedProcess?.process_order ?? 0;
        const isReject = item.status?.toLowerCase() === 'reject';

        if (!snId) return { advanced: false, canProceed: false, advancedTo: '' };

        const maxInfo = snMaxProcessOrder.get(snId);
        const advanced = maxInfo ? maxInfo.order > currentOrder : false;
        const canProceed = !isReject && !advanced;

        return {
            advanced,
            canProceed,
            advancedTo: advanced ? maxInfo!.processName : ''
        };
    };

    // Valid items (can proceed)
    const validFilteredItems = filteredItems.filter(item => {
        const info = getItemAdvancementInfo(item);
        return info.canProceed;
    });

    // ─── Selection handlers ─────────────────────────────────────
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedIds(e.target.checked ? new Set(validFilteredItems.map(i => i.id)) : new Set());
    };

    const handleSelectRow = (id: string, isDisabled: boolean) => {
        if (isDisabled) return;
        const s = new Set(selectedIds);
        s.has(id) ? s.delete(id) : s.add(id);
        setSelectedIds(s);
    };

    // ─── Open Next Step Modal ───────────────────────────────────
    const openNextModal = async (items: DataItem[]) => {
        if (items.length === 0) return;
        setSelectedItemsForNext(items);
        setNextModalOpen(true);
        setTargetProcessId('');
        setTargetStatus('pass');
        if (selectedProcess) {
            const nextProcs = lineProcesses.filter(p => p.process_order > selectedProcess.process_order);
            setAvailableNextProcesses(nextProcs);
            if (nextProcs.length > 0) setTargetProcessId(nextProcs[0].id);
        }
    };

    // ─── Save Next Step ─────────────────────────────────────────
    const handleSaveNext = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedItemsForNext.length === 0 || !targetProcessId) return;
        setSavingNext(true);
        try {
            const sns = selectedItemsForNext.map(i => i.sn?.id).filter(Boolean);
            const res = await fetch('/api/data-items-add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sns, line_process_id: targetProcessId, status: targetStatus })
            });
            const json = await res.json();
            if (json.success) {
                setNextModalOpen(false);
                setSelectedIds(new Set());
                // Refresh everything
                if (selectedProcess) fetchDataItemsForProcess(selectedProcess.id);
                if (lineProcesses.length > 0) fetchProcessCounts(lineProcesses);
                if (selectedLine) fetchAllLineItems(selectedLine.id);
            } else {
                alert(json.error || 'Gagal menyimpan proses selanjutnya');
            }
        } catch {
            alert('Terjadi kesalahan jaringan');
        } finally {
            setSavingNext(false);
        }
    };

    // ─── Render ─────────────────────────────────────────────────
    return (
        <div className="p-8 pb-24 min-h-screen">

            {/* ══════════════ NEXT STEP MODAL (Portal) ═══════════════ */}
            {nextModalOpen && selectedItemsForNext.length > 0 && (
                <Portal>
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-6"
                        style={{ zIndex: 10001 }}
                        onClick={(e) => { if (e.target === e.currentTarget) setNextModalOpen(false); }}
                    >
                        <div
                            className="bg-white rounded-2xl w-full max-w-md shadow-2xl shadow-black/20 overflow-hidden"
                            style={{ animation: 'modalIn 0.25s cubic-bezier(0.16,1,0.3,1)' }}
                        >
                            {/* Header */}
                            <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 text-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                            <ArrowRight size={18} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm">Pindah Step Selanjutnya</h3>
                                            <p className="text-[10px] text-indigo-200 mt-0.5 font-mono">
                                                {selectedItemsForNext.length} SN terpilih
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => setNextModalOpen(false)} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                <form onSubmit={handleSaveNext} className="space-y-5">
                                    {/* Flow indicator */}
                                    <div className="flex items-center gap-2 p-4 rounded-xl bg-gradient-to-r from-slate-50 to-indigo-50/50 border border-slate-200/80">
                                        <div className="flex-1 text-center">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1">DARI</p>
                                            <p className="text-xs font-black text-slate-700">{selectedProcess?.process?.name ?? '—'}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                            <ArrowRight size={14} className="text-indigo-600" />
                                        </div>
                                        <div className="flex-1 text-center">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1">KE</p>
                                            <p className="text-xs font-black text-indigo-600">
                                                {availableNextProcesses.find(p => p.id === targetProcessId)?.process?.name ?? '...'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Target process */}
                                    <div>
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Process Tujuan</label>
                                        <select
                                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-sm font-semibold text-slate-700"
                                            value={targetProcessId}
                                            onChange={(e) => setTargetProcessId(e.target.value)}
                                            required
                                        >
                                            <option value="" disabled>— Pilih Step Tujuan —</option>
                                            {availableNextProcesses.map(proc => (
                                                <option key={proc.id} value={proc.id}>
                                                    Step {proc.process_order}: {proc.process?.name}
                                                </option>
                                            ))}
                                        </select>
                                        {availableNextProcesses.length === 0 && (
                                            <p className="mt-2 text-[11px] text-amber-600 font-semibold flex items-center gap-1.5">
                                                <AlertCircle size={12} /> Sudah tahap terakhir.
                                            </p>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Status</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {(['pass', 'reject'] as const).map(s => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => setTargetStatus(s)}
                                                    className={`py-2.5 rounded-xl border-2 text-sm font-bold transition-all flex justify-center items-center gap-2 ${targetStatus === s
                                                        ? s === 'pass'
                                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                                                            : 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                                                        : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    {s === 'pass' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                                                    {s === 'pass' ? 'Pass' : 'Reject'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!targetProcessId || savingNext}
                                        className="w-full h-12 mt-2 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        {savingNext ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                                        Simpan Transisi
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}

            {/* ══════════════ DATA ITEMS MODAL (Portal) ══════════════ */}
            {modalOpen && selectedProcess && (
                <Portal>
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-6"
                        style={{ zIndex: 10000 }}
                        onClick={(e) => { if (e.target === e.currentTarget) { setModalOpen(false); setSelectedIds(new Set()); } }}
                    >
                        <div
                            className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl shadow-black/20 overflow-hidden flex flex-col"
                            style={{ maxHeight: '82vh', animation: 'modalIn 0.25s cubic-bezier(0.16,1,0.3,1)' }}
                        >
                            {/* Modal Header */}
                            <div className="flex-shrink-0 bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 text-white px-6 py-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
                                            <Layers size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-base flex items-center gap-2">
                                                {selectedProcess.process?.name ?? 'Unknown'}
                                                <span className="text-xs font-mono text-indigo-200 bg-white/10 px-2 py-0.5 rounded-md">
                                                    Step {selectedProcess.process_order}
                                                </span>
                                            </h3>
                                            <p className="text-xs text-indigo-200 mt-0.5">{selectedLine?.name} • Data items di process ini</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => fetchDataItemsForProcess(selectedProcess.id)}
                                            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                                        >
                                            <RefreshCw size={14} className={loadingItems ? 'animate-spin' : ''} />
                                        </button>
                                        <button
                                            onClick={() => { setModalOpen(false); setSelectedIds(new Set()); }}
                                            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-red-500/80 flex items-center justify-center transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Toolbar */}
                            <div className="flex-shrink-0 px-6 py-3 border-b border-slate-100 flex items-center gap-4 bg-slate-50/80">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                    <input
                                        type="text"
                                        placeholder="Cari SN, PN..."
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-lg outline-none transition-all text-sm text-slate-700"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-3 ml-auto">
                                    <span className="text-xs text-slate-400 font-semibold tabular-nums">
                                        {filteredItems.length} total • {validFilteredItems.length} aktif
                                    </span>
                                    {selectedIds.size > 0 && (
                                        <button
                                            onClick={() => openNextModal(filteredItems.filter(i => selectedIds.has(i.id)))}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs shadow-md shadow-indigo-500/25 hover:bg-indigo-700 transition-all active:scale-95"
                                        >
                                            <span className="w-5 h-5 rounded-md bg-white/20 text-[10px] flex items-center justify-center font-black">{selectedIds.size}</span>
                                            Bulk Next Step <ArrowRight size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Table */}
                            <div className="flex-1 overflow-y-auto">
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 z-10 bg-white border-b border-slate-200">
                                        <tr>
                                            <th className="pl-6 pr-2 py-3 w-10">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                                    checked={selectedIds.size === validFilteredItems.length && validFilteredItems.length > 0}
                                                    onChange={handleSelectAll}
                                                    disabled={validFilteredItems.length === 0}
                                                />
                                            </th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Serial Number</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Part Number</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Progress</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Waktu</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right pr-6">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loadingItems ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-20 text-center">
                                                    <Loader2 className="animate-spin text-indigo-500 mx-auto mb-3" size={28} />
                                                    <span className="text-sm font-medium text-slate-400">Memuat data items...</span>
                                                </td>
                                            </tr>
                                        ) : filteredItems.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-20 text-center">
                                                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                                        <Package size={24} className="text-slate-300" />
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-500">Belum ada data items</p>
                                                    <p className="text-xs text-slate-400 mt-1">SN akan muncul setelah diproses</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredItems.map((item) => {
                                                const isPass = item.status?.toLowerCase() === 'pass';
                                                const isReject = item.status?.toLowerCase() === 'reject';
                                                const info = getItemAdvancementInfo(item);

                                                return (
                                                    <tr
                                                        key={item.id}
                                                        className={`transition-colors duration-150 ${selectedIds.has(item.id)
                                                            ? 'bg-indigo-50/70'
                                                            : info.advanced
                                                                ? 'bg-slate-50/50'
                                                                : 'hover:bg-slate-50/80'
                                                            }`}
                                                    >
                                                        <td className="pl-6 pr-2 py-3">
                                                            <input
                                                                type="checkbox"
                                                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed accent-indigo-600"
                                                                checked={selectedIds.has(item.id)}
                                                                onChange={() => handleSelectRow(item.id, !info.canProceed)}
                                                                disabled={!info.canProceed}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`text-sm font-bold font-mono tracking-wide ${info.advanced ? 'text-slate-400' : 'text-slate-700'}`}>
                                                                {item.sn?.serial_number ?? '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-bold rounded border border-slate-200">
                                                                {item.sn?.pn?.part_number ?? '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${isPass
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                : isReject
                                                                    ? 'bg-red-50 text-red-700 border-red-200'
                                                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                                                }`}>
                                                                {isPass ? <CheckCircle2 size={10} /> : isReject ? <XCircle size={10} /> : null}
                                                                {item.status}
                                                            </span>
                                                        </td>
                                                        {/* Progress / Advancement Status */}
                                                        <td className="px-4 py-3">
                                                            {info.advanced ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                                                                    <ArrowUpRight size={10} />
                                                                    Sudah di {info.advancedTo}
                                                                </span>
                                                            ) : isReject ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-500 border border-red-200">
                                                                    <XCircle size={10} />
                                                                    Rejected
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                                                                    <Clock size={10} />
                                                                    Menunggu
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="text-xs text-slate-500 font-mono tabular-nums">
                                                                {new Date(item.created_at).toLocaleString('id-ID', {
                                                                    day: '2-digit', month: 'short',
                                                                    hour: '2-digit', minute: '2-digit'
                                                                })}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right pr-6">
                                                            {info.canProceed ? (
                                                                <button
                                                                    onClick={() => openNextModal([item])}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 hover:shadow-md active:scale-95"
                                                                >
                                                                    Next <ArrowRight size={10} />
                                                                </button>
                                                            ) : info.advanced ? (
                                                                <span className="text-[10px] font-semibold text-blue-400">Selesai ✓</span>
                                                            ) : (
                                                                <span className="text-[10px] font-semibold text-slate-300">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex-shrink-0 px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-4 text-[11px] text-slate-500">
                                    <span><span className="font-bold text-slate-700">{filteredItems.length}</span> total</span>
                                    <span className="text-slate-300">|</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> <span className="font-bold text-amber-600">{validFilteredItems.length}</span> menunggu</span>
                                    <span className="text-slate-300">|</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> <span className="font-bold text-blue-600">{filteredItems.length - validFilteredItems.length}</span> sudah dilanjutkan</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                    </span>
                                    LIVE
                                </div>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}

            {/* ══════════════ PAGE HEADER ═══════════════════════════ */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                            <Database size={18} className="text-white" />
                        </div>
                        Data Items Manager
                    </h1>
                    <p className="text-sm text-slate-500 mt-2 ml-[52px]">
                        Pilih Line → Pilih Process → Kelola data items &amp; langkahkan ke process berikutnya
                    </p>
                </div>
            </div>

            {/* ══════════════ STEP 1: SELECT LINE ═══════════════════ */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">1</span>
                    <h2 className="text-sm font-bold text-slate-700">Pilih Production Line</h2>
                </div>
                {loadingLines ? (
                    <div className="flex items-center gap-2 text-sm text-slate-400 py-8 justify-center">
                        <Loader2 className="animate-spin" size={18} /> Memuat...
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                        {lines.map(line => {
                            const isActive = selectedLine?.id === line.id;
                            const sc = line.status?.toLowerCase() === 'active' ? 'bg-emerald-500'
                                : line.status?.toLowerCase() === 'maintenance' ? 'bg-amber-500' : 'bg-slate-300';
                            return (
                                <button
                                    key={line.id}
                                    onClick={() => setSelectedLine(isActive ? null : line)}
                                    className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${isActive
                                        ? 'border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-500/15'
                                        : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-sm'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                                        <Factory size={14} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <span className={`text-xs font-bold block truncate ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>{line.name}</span>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${sc}`} />
                                            <span className="text-[9px] text-slate-400 capitalize">{line.status}</span>
                                        </div>
                                    </div>
                                    {isActive && <CheckCircle2 size={14} className="text-indigo-500 flex-shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ══════════════ STEP 2: PROCESS PIPELINE ══════════════ */}
            {selectedLine && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center">2</span>
                        <h2 className="text-sm font-bold text-slate-700">
                            Pilih Process — <span className="text-indigo-600">{selectedLine.name}</span>
                        </h2>
                        <button onClick={() => fetchProcesses(selectedLine.id)} className="ml-auto text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1">
                            <RefreshCw size={10} /> Refresh
                        </button>
                    </div>

                    {loadingProcesses ? (
                        <div className="flex items-center gap-2 text-sm text-slate-400 py-8 justify-center">
                            <Loader2 className="animate-spin" size={18} /> Memuat proses...
                        </div>
                    ) : lineProcesses.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                            <Layers className="mx-auto text-slate-300 mb-3" size={32} />
                            <p className="text-sm font-bold text-slate-500">Belum ada proses di line ini</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                                <LayoutGrid size={13} className="text-slate-400" />
                                <span className="text-[11px] font-bold text-slate-500">{lineProcesses.length} Process Steps</span>
                                <span className="text-[10px] text-slate-400 ml-auto">Klik untuk melihat data items</span>
                            </div>
                            <div className="p-5">
                                <div className="flex flex-wrap items-center gap-2">
                                    {lineProcesses.map((lp, idx) => {
                                        const count = processItemCounts[lp.id];
                                        const hasData = typeof count === 'number' && count > 0;
                                        return (
                                            <div key={lp.id} className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openProcessModal(lp)}
                                                    className="group flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/60 hover:shadow-lg hover:shadow-indigo-500/10 transition-all active:scale-95"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 group-hover:from-indigo-500 group-hover:to-purple-500 group-hover:text-white transition-all font-black text-xs shadow-sm">
                                                        {lp.process_order}
                                                    </div>
                                                    <div className="text-left">
                                                        <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700 transition-colors block leading-tight">
                                                            {lp.process?.name ?? 'Unknown'}
                                                        </span>
                                                        <span className={`text-[10px] font-semibold ${hasData ? 'text-indigo-500' : 'text-slate-400'}`}>
                                                            {count ?? '...'} items
                                                        </span>
                                                    </div>
                                                    <Eye size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors ml-1" />
                                                </button>
                                                {idx < lineProcesses.length - 1 && <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Empty state */}
            {!selectedLine && !loadingLines && (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-indigo-50 flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Factory size={28} className="text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-600">Pilih Production Line di atas</p>
                    <p className="text-xs text-slate-400 mt-1">Untuk melihat process dan data items</p>
                </div>
            )}

            <style jsx global>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.95) translateY(8px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}
