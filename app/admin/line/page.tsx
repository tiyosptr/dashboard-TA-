'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Factory, Plus, Trash2, RefreshCw,
    CheckCircle2, AlertCircle, Loader2, PlayCircle, Clock,
    Check, X, Search, Layers, ChevronDown, ListPlus
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ─── Types ───────────────────────────────────────────────────
interface Line {
    id: string;
    name: string;
    status: string | null;
    total_running_hours: number | null;
}

interface Toast {
    id: number;
    type: 'success' | 'error';
    message: string;
}

interface MasterProcess {
    id: string;
    name: string;
    index: number;
}

interface LineProcess {
    id: string;
    process_order: number;
    process_id: string;
    process: {
        id: string;
        name: string;
        index: number;
    };
}

// ─── Constants & Status Helpers ──────────────────────────────
const LINE_STATUSES = ['Active', 'On Hold', 'Inactive'];

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

export default function LineManagerPage() {
    // State Lines
    const [lines, setLines] = useState<Line[]>([]);
    const [loadingLines, setLoadingLines] = useState(false);

    // Form state Add Line
    const [name, setName] = useState('');
    const [status, setStatus] = useState('Active');
    const [adding, setAdding] = useState(false);

    // Filter
    const [search, setSearch] = useState('');

    // Delete
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    // Status Updating (Custom Dropdown)
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    // Toasts
    const [toasts, setToasts] = useState<Toast[]>([]);

    // State Process Management
    const [processModalOpen, setProcessModalOpen] = useState(false);
    const [activeLine, setActiveLine] = useState<Line | null>(null);
    const [lineProcesses, setLineProcesses] = useState<LineProcess[]>([]);
    const [masterProcesses, setMasterProcesses] = useState<MasterProcess[]>([]);
    const [loadingLineProcess, setLoadingLineProcess] = useState(false);

    // Form Add Process
    const [selectedProcessId, setSelectedProcessId] = useState('');
    const [selectedProcessOrder, setSelectedProcessOrder] = useState('1');
    const [addingProcess, setAddingProcess] = useState(false);
    const [deletingProcessId, setDeletingProcessId] = useState<string | null>(null);

    // Click outside to close custom dropdown
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.status-dropdown-container')) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const addToast = (type: 'success' | 'error', message: string) => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    };

    // ─── Fetch Lines ───
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

    // ─── Fetch Master Process ───
    const fetchMasterProcesses = useCallback(async () => {
        try {
            const res = await fetch('/api/process');
            const json = await res.json();
            if (json.success) setMasterProcesses(json.data);
        } catch {
            console.error('Gagal memuat master process');
        }
    }, []);

    useEffect(() => {
        fetchLines();
        fetchMasterProcesses();
    }, [fetchLines, fetchMasterProcesses]);

    // ─── CRUD Line ───
    const handleAddLine = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setAdding(true);
        try {
            const res = await fetch('/api/lines', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), status }),
            });
            const json = await res.json();

            if (!res.ok || !json.success) {
                addToast('error', json.error ?? 'Gagal menambahkan line');
            } else {
                addToast('success', 'Line berhasil ditambahkan');
                setName('');
                setStatus('Active');
                fetchLines();
            }
        } catch {
            addToast('error', 'Terjadi kesalahan server');
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteLine = async (id: string) => {
        setDeletingId(id);
        try {
            const res = await fetch(`/api/lines?id=${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (!res.ok || !json.success) {
                if (json.error?.includes('foreign key constraint')) {
                    addToast('error', 'Line masih digunakan. Hapus data terkait terlebih dahulu.');
                } else {
                    addToast('error', json.error ?? 'Hapus gagal');
                }
            } else {
                addToast('success', 'Line berhasil dihapus');
                setLines((prev) => prev.filter((p) => p.id !== id));
            }
        } catch {
            addToast('error', 'Terjadi kesalahan server');
        } finally {
            setDeletingId(null);
            setConfirmDelete(null);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        setUpdatingStatusId(id);
        try {
            const res = await fetch(`/api/lines`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus }),
            });
            const json = await res.json();
            if (json.success) {
                addToast('success', 'Status Line diupdate');
                setLines(prev => prev.map(l => l.id === id ? {
                    ...l,
                    status: json.data?.status ?? newStatus,
                    total_running_hours: json.data?.total_running_hours ?? l.total_running_hours
                } : l));
            } else {
                addToast('error', json.error ?? 'Gagal update status');
            }
        } catch {
            addToast('error', 'Gagal menghubungi server');
        } finally {
            setUpdatingStatusId(null);
        }
    };

    // ─── Manajemen Process ───
    const openProcessModal = async (line: Line) => {
        setActiveLine(line);
        setProcessModalOpen(true);
        setLoadingLineProcess(true);
        try {
            const res = await fetch(`/api/lines/${line.id}/process`);
            const json = await res.json();
            if (json.success) {
                setLineProcesses(json.data);
                if (json.data.length > 0) {
                    setSelectedProcessOrder(String(json.data.length + 1));
                } else {
                    setSelectedProcessOrder("1");
                }
            }
        } catch {
            addToast('error', 'Gagal memuat proses data');
        } finally {
            setLoadingLineProcess(false);
        }
    };

    const handleAddProcess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeLine || !selectedProcessId) return;

        setAddingProcess(true);
        try {
            const res = await fetch(`/api/lines/${activeLine.id}/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    process_id: selectedProcessId,
                    process_order: parseInt(selectedProcessOrder)
                }),
            });
            const json = await res.json();
            if (json.success) {
                addToast('success', 'Process ditambahkan ke line');
                setLineProcesses([...lineProcesses, json.data].sort((a, b) => a.process_order - b.process_order));
                setSelectedProcessOrder(String(parseInt(selectedProcessOrder) + 1));
            } else {
                addToast('error', json.error ?? 'Gagal menambah process');
            }
        } catch {
            addToast('error', 'Server error');
        } finally {
            setAddingProcess(false);
        }
    };

    const handleDeleteProcess = async (lineProcessId: string) => {
        if (!activeLine) return;
        setDeletingProcessId(lineProcessId);
        try {
            const res = await fetch(`/api/lines/${activeLine.id}/process?id=${lineProcessId}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                addToast('success', 'Process dilepas dari line');
                setLineProcesses(prev => prev.filter(p => p.id !== lineProcessId));
            } else {
                addToast('error', 'Gagal menghapus process dari line');
            }
        } catch {
            addToast('error', 'Server error');
        } finally {
            setDeletingProcessId(null);
        }
    };


    const filteredLines = search.trim()
        ? lines.filter(l => l.name?.toLowerCase().includes(search.toLowerCase()))
        : lines;

    return (
        <div className="pb-24 min-h-screen relative">
            {/* ── Toast Container ── */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-[13px] font-semibold pointer-events-auto
              ${t.type === 'success' ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-red-500 text-white shadow-red-500/30'}`}
                        style={{ animation: 'slideIn 0.3s ease-out' }}
                    >
                        {t.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                        {t.message}
                    </div>
                ))}
            </div>

            {/* ── Modal Line Process ── */}
            {processModalOpen && activeLine && (
                <div className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header Modal */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                    <Layers className="text-blue-600" size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 tracking-wide">Kelola Process Line</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Line terkait: <span className="font-semibold text-slate-700">{activeLine.name}</span></p>
                                </div>
                            </div>
                            <button onClick={() => setProcessModalOpen(false)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                                <X size={14} className="text-slate-500" />
                            </button>
                        </div>

                        {/* Body Modal */}
                        <div className="p-6 flex-1 overflow-y-auto space-y-6">

                            {/* Form Assign Process */}
                            <form onSubmit={handleAddProcess} className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 flex gap-3 items-end flex-wrap sm:flex-nowrap">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-[10px] text-blue-600 font-bold uppercase tracking-widest mb-1.5">Pilih Process (Master)</label>
                                    <select
                                        className="w-full px-3 py-2.5 rounded-xl border border-blue-200 bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
                                        value={selectedProcessId}
                                        onChange={(e) => setSelectedProcessId(e.target.value)}
                                        required
                                    >
                                        <option value="" disabled>-- Pilih Process --</option>
                                        {masterProcesses.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} (Idx: {p.index})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-[100px]">
                                    <label className="block text-[10px] text-blue-600 font-bold uppercase tracking-widest mb-1.5">Order</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full px-3 py-2.5 rounded-xl border border-blue-200 bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 tabular-nums"
                                        value={selectedProcessOrder}
                                        onChange={(e) => setSelectedProcessOrder(e.target.value)}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={addingProcess || !selectedProcessId}
                                    className="h-[42px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {addingProcess ? <Loader2 size={14} className="animate-spin" /> : <ListPlus size={14} />}
                                    Tambah
                                </button>
                            </form>

                            {/* List Existing Processes */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Daftar Process Berjalan di Line</h4>
                                {loadingLineProcess ? (
                                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                                        <Loader2 className="animate-spin text-blue-500" size={24} />
                                        <span className="text-sm text-slate-500">Memuat Process...</span>
                                    </div>
                                ) : lineProcesses.length === 0 ? (
                                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                                        <Layers size={24} className="mx-auto text-slate-300 mb-2" />
                                        <p className="text-sm font-semibold text-slate-500">Belum ada Process</p>
                                        <p className="text-xs text-slate-400 mt-1">Gunakan form di atas untuk menempatkan process di line ini.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {lineProcesses.map((lp) => (
                                            <div key={lp.id} className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-3 hover:border-blue-200 transition-colors group">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-mono font-bold text-slate-500 text-xs">
                                                    #{lp.process_order}
                                                </div>
                                                <div className="flex-1 flex flex-col gap-0.5">
                                                    <h5 className="text-sm font-bold text-slate-800">{lp.process?.name || 'Unknown'}</h5>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteProcess(lp.id)}
                                                    disabled={deletingProcessId === lp.id}
                                                    className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all disabled:opacity-50"
                                                    title="Hapus Process dari Line"
                                                >
                                                    {deletingProcessId === lp.id ? <Loader2 size={12} className="animate-spin" /> : <X size={14} />}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            )}


            {/* ── Page Header ── */}
            <div className="px-8 py-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Factory className="text-indigo-600" />
                        Production Line Manager
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Tambah dan kelola daftar production line yang tersedia.
                    </p>
                </div>
                <button
                    onClick={fetchLines}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[13px] font-bold transition-colors"
                >
                    <RefreshCw size={14} />
                    Refresh Data
                </button>
            </div>

            {/* ── Main Content ── */}
            <div className="w-full px-8 flex flex-col gap-8 items-start">

                {/* ── Add Form Card (Top) ── */}
                <div className="w-full bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col z-10 relative">
                    <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100/60 rounded-t-3xl">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <Plus size={14} className="text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-800">Tambah Line Baru</h2>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleAddLine} className="p-6 flex flex-col md:flex-row gap-6 items-end">
                        {/* Nama Line */}
                        <div className="flex-1 w-full">
                            <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">
                                Nama Line
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Line 01"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-sm font-semibold text-slate-700"
                            />
                        </div>

                        {/* Status Awal */}
                        <div className="w-full md:w-[320px]">
                            <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">
                                Status Awal
                            </label>
                            <div className="flex bg-slate-50/80 p-1.5 rounded-2xl gap-1 border border-slate-100">
                                {LINE_STATUSES.map(st => (
                                    <button
                                        key={st}
                                        type="button"
                                        onClick={() => setStatus(st)}
                                        className={`flex-1 text-center text-[12px] font-bold py-2.5 rounded-xl transition-all ${status === st
                                            ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 border border-transparent'
                                            }`}
                                    >
                                        {st}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="w-full md:w-[180px]">
                            <button
                                type="submit"
                                disabled={!name.trim() || adding}
                                className={`w-full h-[52px] flex items-center justify-center gap-2 px-6 rounded-xl text-sm font-bold transition-all duration-200
                                    ${name.trim() && !adding
                                        ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-95'
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                {adding ? <><Loader2 size={16} className="animate-spin" /> ...</> : <><Plus size={18} strokeWidth={2.5} /> Tambah</>}
                            </button>
                        </div>
                    </form>
                </div>

                {/* ── Table Container (Bottom) ── */}
                <div className="w-full bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col pb-32">
                    <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                                <Factory size={18} className="text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-800">Daftar Production Line</h2>
                                <p className="text-[10px] text-slate-400 mt-0.5">{lines.length} total baris terdaftar</p>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="w-full sm:w-auto min-w-[250px] flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200/60 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                            <Search size={16} className="text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari nama line..."
                                className="flex-1 bg-transparent text-sm font-semibold text-slate-700 placeholder:text-slate-400 outline-none w-full"
                            />
                        </div>
                    </div>

                    <div className="w-full">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100 whitespace-nowrap">
                                    <th className="px-6 py-4 text-[11px] text-slate-500 font-bold uppercase tracking-widest w-[25%]">Nama Line</th>
                                    <th className="px-6 py-4 text-[11px] text-slate-500 font-bold uppercase tracking-widest w-[25%]">Status Saat Ini</th>
                                    <th className="px-6 py-4 text-[11px] text-slate-500 font-bold uppercase tracking-widest w-[25%]">Total Jam Aktif</th>
                                    <th className="px-6 py-4 text-[11px] text-slate-500 font-bold uppercase tracking-widest text-right pr-6 w-[25%]">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50/80 relative">
                                {loadingLines && lines.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-16 text-center">
                                            <Loader2 size={24} className="animate-spin text-indigo-400 mx-auto mb-3" />
                                            <p className="text-sm font-medium text-slate-400">Memuat data line...</p>
                                        </td>
                                    </tr>
                                ) : filteredLines.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-16 text-center">
                                            <div className="w-16 h-16 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                                                <Factory size={28} className="text-slate-300" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-600">Tidak ada data ditemukan</p>
                                            <p className="text-xs text-slate-400 mt-1">Belum ada line terdaftar atau tidak cocok dengan pencarian.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLines.map((line) => (
                                        <tr key={line.id} className="hover:bg-slate-50/60 transition-colors group/row">
                                            {/* Nama Line */}
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                                                        <Factory size={16} className="text-indigo-500" />
                                                    </div>
                                                    <span className="text-[15px] font-bold text-slate-800 tracking-wide">{line.name}</span>
                                                </div>
                                            </td>

                                            {/* Status Editable dengan Custom Dropdown */}
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="relative inline-block w-40 status-dropdown-container">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenDropdownId(openDropdownId === line.id ? null : line.id);
                                                        }}
                                                        disabled={updatingStatusId === line.id}
                                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all border ${statusBgColor(line.status)} ${updatingStatusId === line.id ? 'opacity-70 cursor-wait' : 'hover:shadow-md hover:border-slate-300 border-transparent shadow-sm'}`}
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <span className={`w-2.5 h-2.5 rounded-full ${statusColor(line.status)} shadow-sm`} />
                                                            {line.status || 'Pilih'}
                                                        </div>
                                                        {updatingStatusId === line.id ? (
                                                            <Loader2 size={14} className="animate-spin text-slate-400" />
                                                        ) : (
                                                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${openDropdownId === line.id ? 'rotate-180' : ''}`} />
                                                        )}
                                                    </button>

                                                    {/* Dropdown Menu */}
                                                    {openDropdownId === line.id && (
                                                        <div className="absolute top-full left-0 mt-2 w-full min-w-[150px] bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50">
                                                            {LINE_STATUSES.map(st => (
                                                                <button
                                                                    key={st}
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleUpdateStatus(line.id, st);
                                                                        setOpenDropdownId(null);
                                                                    }}
                                                                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-3 transition-colors"
                                                                >
                                                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor(st)}`} />
                                                                    {st}
                                                                    {line.status === st && <Check size={14} className="ml-auto text-indigo-500" />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Jam Running */}
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                        <Clock size={14} className="text-slate-400" />
                                                    </div>
                                                    <span className="text-[14px] text-slate-700 font-mono font-medium">
                                                        {line.total_running_hours ?? 0} <span className="text-[11px] text-slate-400 font-sans ml-1">Jam</span>
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Aksi */}
                                            <td className="px-6 py-5 text-right whitespace-nowrap pr-6">
                                                {confirmDelete === line.id ? (
                                                    <div className="flex items-center justify-end gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
                                                        <span className="text-xs text-red-500 font-bold mr-2">Yakin hapus?</span>
                                                        <button
                                                            onClick={() => handleDeleteLine(line.id)}
                                                            disabled={deletingId === line.id}
                                                            className="flex items-center justify-center w-9 h-9 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all shadow-md shadow-red-500/20"
                                                        >
                                                            {deletingId === line.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDelete(null)}
                                                            className="flex items-center justify-center w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-3">
                                                        <button
                                                            onClick={() => openProcessModal(line)}
                                                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all border border-blue-100"
                                                        >
                                                            <Layers size={14} /> Kelola Process
                                                        </button>

                                                        <button
                                                            onClick={() => setConfirmDelete(line.id)}
                                                            className="opacity-0 group-hover/row:opacity-100 flex items-center justify-center w-9 h-9 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
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
