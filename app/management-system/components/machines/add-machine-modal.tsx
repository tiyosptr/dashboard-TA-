'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Plus, Cpu, Box, Layers, Activity } from 'lucide-react';

interface LineOption {
    id: string;
    name: string;
}

interface ProcessOption {
    id: string;
    name: string;
}

interface AddMachineModalProps {
    isOpen: boolean;
    onClose: () => void;
    lines: LineOption[];
    onSuccess: () => void;
}

export function AddMachineModal({ isOpen, onClose, lines, onSuccess }: AddMachineModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [machineName, setMachineName] = useState('');
    const [selectedLine, setSelectedLine] = useState('');
    const [selectedProcess, setSelectedProcess] = useState('');
    const [status, setStatus] = useState('inactive');
    const [nextMaintenance, setNextMaintenance] = useState('');
    const [lastMaintenance, setLastMaintenance] = useState('');
    const [processes, setProcesses] = useState<ProcessOption[]>([]);
    const [isLoadingProcesses, setIsLoadingProcesses] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset form when opened
    useEffect(() => {
        if (isOpen) {
            setMachineName('');
            setSelectedLine('');
            setSelectedProcess('');
            setStatus('inactive');
            setNextMaintenance('');
            setLastMaintenance('');
            setProcesses([]);
            setError(null);
        }
    }, [isOpen]);

    // Fetch processes when line changes
    useEffect(() => {
        async function fetchProcesses() {
            if (!selectedLine) {
                setProcesses([]);
                setSelectedProcess('');
                return;
            }
            setIsLoadingProcesses(true);
            setError(null);
            try {
                const res = await fetch(`/api/process?lineId=${selectedLine}`);
                const json = await res.json();
                if (json.success) {
                    setProcesses(json.data || []);
                    if (json.data?.length > 0) {
                        setSelectedProcess(json.data[0].id);
                    } else {
                        setSelectedProcess('');
                    }
                } else {
                    setError(json.error || 'Failed to fetch processes');
                }
            } catch (err: any) {
                setError(err.message || 'Error occurred while loading processes');
            } finally {
                setIsLoadingProcesses(false);
            }
        }
        fetchProcesses();
    }, [selectedLine]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!machineName.trim() || !selectedLine || !selectedProcess) {
            setError('Mohon lengkapi semua data');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/machines', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name_machine: machineName,
                    status: status,
                    process_id: selectedProcess,
                    next_maintenance: nextMaintenance ? new Date(nextMaintenance).toISOString() : null,
                    last_maintenance: lastMaintenance ? new Date(lastMaintenance).toISOString() : null,
                }),
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || 'Gagal menambahkan mesin');
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan sistem');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100/50">
                            <Plus size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">Tambah Mesin Baru</h2>
                            <p className="text-[11px] text-slate-500 font-medium">Registrasi mesin produksi</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold flex items-center gap-2">
                            <AlertTriangle size={14} className="flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Machine Name */}
                        <div>
                            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                                <Cpu size={12} className="text-indigo-500" />
                                Nama Mesin
                            </label>
                            <input
                                type="text"
                                value={machineName}
                                onChange={(e) => setMachineName(e.target.value)}
                                placeholder="Contoh: Mesin CNC 01"
                                className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-indigo-400 outline-none rounded-xl text-sm font-semibold text-slate-700 placeholder:text-slate-400 transition-all focus:ring-4 focus:ring-indigo-50"
                                required
                            />
                        </div>

                        {/* Line Selection */}
                        <div>
                            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                                <Box size={12} className="text-emerald-500" />
                                Pilih Line Produksi
                            </label>
                            <select
                                value={selectedLine}
                                onChange={(e) => setSelectedLine(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-indigo-400 outline-none rounded-xl text-sm font-semibold text-slate-700 transition-all focus:ring-4 focus:ring-indigo-50 disabled:bg-slate-100 disabled:opacity-50 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_10px_center]"
                                required
                            >
                                <option value="" disabled>-- Pilih Line --</option>
                                {lines.map((line) => (
                                    <option key={line.id} value={line.id}>{line.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Process Selection */}
                        <div>
                            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                                <Layers size={12} className="text-blue-500" />
                                Pilih Proses
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedProcess}
                                    onChange={(e) => setSelectedProcess(e.target.value)}
                                    disabled={!selectedLine || isLoadingProcesses || processes.length === 0}
                                    className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-indigo-400 outline-none rounded-xl text-sm font-semibold text-slate-700 transition-all focus:ring-4 focus:ring-indigo-50 disabled:bg-slate-100 disabled:text-slate-400 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_10px_center]"
                                    required
                                >
                                    <option value="" disabled>
                                        {!selectedLine ? '-- Pilih Line Dahulu --' :
                                            isLoadingProcesses ? 'Loading proses...' :
                                                processes.length === 0 ? '-- Tidak ada proses di line ini --' : '-- Pilih Proses --'}
                                    </option>
                                    {processes.map((proc) => (
                                        <option key={proc.id} value={proc.id}>{proc.name}</option>
                                    ))}
                                </select>
                                {isLoadingProcesses && (
                                    <Loader2 size={16} className="absolute right-10 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin" />
                                )}
                            </div>
                        </div>

                        {/* Status Selection */}
                        <div>
                            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                                <Activity size={12} className="text-rose-500" />
                                Status Awal Mesin
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-indigo-400 outline-none rounded-xl text-sm font-semibold text-slate-700 transition-all focus:ring-4 focus:ring-indigo-50 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_10px_center]"
                                required
                            >
                                <option value="active">Active (Sedang Beroperasi)</option>
                                <option value="maintenance">Maintenance (Perawatan Terjadwal)</option>
                                <option value="on hold">On Hold (Ditahan Sementara)</option>
                                <option value="downtime">Downtime (Berhenti / Rusak)</option>
                                <option value="inactive">Inactive (Mesin Dimatikan)</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Next Maintenance */}
                            <div>
                                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    <Activity size={12} className="text-teal-500" />
                                    Next Maintenance
                                </label>
                                <input
                                    type="date"
                                    value={nextMaintenance}
                                    onChange={(e) => setNextMaintenance(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-indigo-400 outline-none rounded-xl text-sm font-semibold text-slate-700 transition-all focus:ring-4 focus:ring-indigo-50"
                                />
                            </div>

                            {/* Last Maintenance */}
                            <div>
                                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    <Activity size={12} className="text-slate-500" />
                                    Last Maintenance
                                </label>
                                <input
                                    type="date"
                                    value={lastMaintenance}
                                    onChange={(e) => setLastMaintenance(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-indigo-400 outline-none rounded-xl text-sm font-semibold text-slate-700 transition-all focus:ring-4 focus:ring-indigo-50"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 mt-2 border-t border-slate-100 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2.5 flex-1 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 hover:text-slate-800 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !selectedProcess || !selectedLine || !machineName}
                            className="px-4 py-2.5 flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                'Simpan Mesin'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Just an alert triangle component if needed
function AlertTriangle({ size, className }: { size: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </svg>
    );
}
