'use client';

import {
    useState, useEffect, useRef, useCallback,
    memo, KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Package, Check, Loader2, X } from 'lucide-react';

interface PNItem {
    id: string;
    part_number: string;
    created_at: string;
    line_id?: string;
    line?: { id: string; name: string; status: string | null } | null;
}

interface PNSelectorProps {
    selectedPnId: string | null;
    selectedPn: string | null;
    onPnChange: (pnId: string | null, partNumber: string | null) => void;
    selectedLineId?: string | null;
}

function PNSelector({ selectedPnId, onPnChange, selectedLineId }: PNSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');   // ← khusus filter, pisah dari label
    const [pnList, setPnList] = useState<PNItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState<PNItem | null>(null);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    // Posisi dropdown (portal)
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // ── Fetch (filtered by selectedLineId) ─────────────────────
    const fetchPnList = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedLineId) params.set('line_id', selectedLineId);
            const url = `/api/pn${params.toString() ? '?' + params.toString() : ''}`;
            const res = await fetch(url);
            const json = await res.json();
            if (json.data) setPnList(json.data);
        } catch (err) {
            console.error('Error fetching PN data:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedLineId]);

    useEffect(() => { fetchPnList(); }, [fetchPnList]);

    // ── Reset PN selection when line changes ──────────────────
    const prevLineIdRef = useRef<string | null | undefined>(undefined);
    useEffect(() => {
        if (prevLineIdRef.current !== undefined && prevLineIdRef.current !== selectedLineId) {
            // Line changed, reset PN selection
            setSelectedItem(null);
            onPnChange(null, null);
        }
        prevLineIdRef.current = selectedLineId;
    }, [selectedLineId, onPnChange]);

    // ── Sync selectedPnId ────────────────────────────────────────
    useEffect(() => {
        if (selectedPnId && pnList.length > 0) {
            const found = pnList.find((p) => p.id === selectedPnId);
            if (found) setSelectedItem(found);
        } else if (!selectedPnId) {
            setSelectedItem(null);
        }
    }, [selectedPnId, pnList]);

    // ── Hitung posisi portal dropdown ────────────────────────────
    const openDropdown = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownPos({
            top: rect.bottom + window.scrollY + 8,
            left: rect.left + window.scrollX,
            width: Math.max(rect.width, 256),
        });
        setSearchQuery('');       // reset search setiap buka
        setHighlightedIndex(-1);
        setIsOpen(true);
        // fokus ke search setelah render
        setTimeout(() => searchRef.current?.focus(), 60);
    };

    const closeDropdown = () => {
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
    };

    // ── Close on outside click ───────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                triggerRef.current?.contains(target) ||
                dropdownRef.current?.contains(target)
            ) return;
            closeDropdown();
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    // ── Filter ───────────────────────────────────────────────────
    const filteredPn = searchQuery.trim()
        ? pnList.filter((p) =>
            p.part_number?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : pnList;

    // ── Handlers ─────────────────────────────────────────────────
    const handleSelect = (item: PNItem) => {
        setSelectedItem(item);
        onPnChange(item.id, item.part_number);
        closeDropdown();
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedItem(null);
        onPnChange(null, null);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex((p) => (p < filteredPn.length - 1 ? p + 1 : 0));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex((p) => (p > 0 ? p - 1 : filteredPn.length - 1));
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredPn.length) {
                    handleSelect(filteredPn[highlightedIndex]);
                } else if (filteredPn.length === 1) {
                    handleSelect(filteredPn[0]);
                }
                break;
            case 'Escape':
                closeDropdown();
                triggerRef.current?.focus();
                break;
        }
    };

    // Scroll item highlighted ke view
    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const items = listRef.current.querySelectorAll('[data-item]');
            items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlightedIndex]);

    // ── Highlight matched text ────────────────────────────────────
    const highlightMatch = (text: string) => {
        if (!searchQuery.trim()) return <>{text}</>;
        const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        return (
            <>
                {text.split(regex).map((part, i) =>
                    regex.test(part) ? (
                        <mark key={i} className="bg-violet-100 text-violet-700 rounded px-0.5 not-italic font-bold">
                            {part}
                        </mark>
                    ) : (
                        <span key={i}>{part}</span>
                    )
                )}
            </>
        );
    };

    // ── Dropdown content (dirender ke portal) ────────────────────
    const dropdownContent = isOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
                ref={dropdownRef}
                style={{
                    position: 'fixed',
                    top: dropdownPos.top,
                    left: dropdownPos.left,
                    width: dropdownPos.width,
                    zIndex: 99999,
                    animation: 'pnDropIn 0.18s cubic-bezier(0.16,1,0.3,1)',
                }}
                className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
                role="listbox"
            >
                {/* Search bar */}
                <div className="p-2 border-b border-slate-100">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200/70 focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
                        <Search size={11} className="text-slate-400 flex-shrink-0" />
                        <input
                            ref={searchRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setHighlightedIndex(-1); }}
                            onKeyDown={handleKeyDown}
                            placeholder="Search part number..."
                            className="flex-1 bg-transparent text-[11px] text-slate-700 placeholder:text-slate-400 outline-none font-medium"
                            autoComplete="off"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => { setSearchQuery(''); setHighlightedIndex(-1); searchRef.current?.focus(); }}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={10} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Items */}
                <div
                    ref={listRef}
                    className="max-h-52 overflow-y-auto py-1.5 px-1.5"
                    style={{ scrollbarWidth: 'thin' }}
                >
                    {loading ? (
                        <div className="flex items-center justify-center py-5 gap-2">
                            <Loader2 size={13} className="text-violet-500 animate-spin" />
                            <span className="text-[11px] text-slate-400">Loading...</span>
                        </div>
                    ) : filteredPn.length === 0 ? (
                        <div className="text-center py-5">
                            <Package size={18} className="text-slate-300 mx-auto mb-1" />
                            <p className="text-[11px] text-slate-400 font-medium">
                                {searchQuery.trim()
                                    ? `No match for "${searchQuery}"`
                                    : 'No part numbers found'}
                            </p>
                        </div>
                    ) : (
                        filteredPn.map((item, idx) => {
                            const isSelected = selectedPnId === item.id;
                            const isHighlighted = highlightedIndex === idx;
                            return (
                                <button
                                    key={item.id}
                                    data-item
                                    onClick={() => handleSelect(item)}
                                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-100 mb-0.5
                      ${isHighlighted
                                            ? 'bg-violet-50 border border-violet-200/60'
                                            : isSelected
                                                ? 'bg-violet-50/60 border border-violet-100/60'
                                                : 'hover:bg-slate-50 border border-transparent'
                                        }`}
                                    role="option"
                                    aria-selected={isSelected}
                                >
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-violet-100' : 'bg-slate-100'}`}>
                                        <Package size={12} className={isSelected ? 'text-violet-500' : 'text-slate-400'} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[11px] font-semibold text-slate-700 truncate">
                                            {highlightMatch(item.part_number)}
                                        </div>
                                        <div className="text-[9px] text-slate-400 mt-0.5">Part Number</div>
                                    </div>
                                    {isSelected && (
                                        <div className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                                            <Check size={9} className="text-white" strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                {!loading && filteredPn.length > 0 && (
                    <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
                        <span className="text-[9px] text-slate-400">
                            {filteredPn.length} PN available
                        </span>
                        <div className="flex items-center gap-1">
                            <kbd className="text-[8px] text-slate-400 bg-slate-100 rounded px-1 py-0.5 font-mono">↑↓</kbd>
                            <span className="text-[8px] text-slate-300">nav</span>
                            <kbd className="text-[8px] text-slate-400 bg-slate-100 rounded px-1 py-0.5 font-mono ml-1">↵</kbd>
                            <span className="text-[8px] text-slate-300">pick</span>
                        </div>
                    </div>
                )}

                <style>{`
            @keyframes pnDropIn {
              from { opacity: 0; transform: translateY(-6px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0)   scale(1);    }
            }
          `}</style>
            </div>,
            document.body
        )
        : null;

    // ── Render ───────────────────────────────────────────────────
    return (
        <>
            {/* Pill trigger */}
            <button
                ref={triggerRef}
                onClick={() => (isOpen ? closeDropdown() : openDropdown())}
                className={`flex items-center gap-1.5 h-[26px] px-3 rounded-full border text-[11px] font-semibold transition-all duration-200 group select-none
          ${selectedItem
                        ? 'bg-violet-50 border-violet-300 text-violet-700 hover:bg-violet-100'
                        : 'bg-white/80 border-slate-200/80 text-slate-500 hover:border-slate-300 hover:text-slate-700 hover:bg-white'
                    }`}
            >
                <Package
                    size={11}
                    className={selectedItem ? 'text-violet-500' : 'text-slate-400 group-hover:text-slate-500'}
                />
                <span className="max-w-[110px] truncate">
                    {selectedItem ? selectedItem.part_number : 'Select PN'}
                </span>
                {selectedItem ? (
                    <span
                        role="button"
                        onClick={handleClear}
                        className="ml-0.5 w-3.5 h-3.5 rounded-full bg-violet-200 hover:bg-violet-300 flex items-center justify-center transition-colors"
                    >
                        <X size={7} className="text-violet-600" />
                    </span>
                ) : (
                    <ChevronDown
                        size={10}
                        className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                )}
            </button>

            {/* Portal dropdown — di luar stacking context tab bar */}
            {dropdownContent}
        </>
    );
}

export default memo(PNSelector);
