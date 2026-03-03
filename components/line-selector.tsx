'use client';

import { useState, useEffect, useRef, useCallback, memo, KeyboardEvent } from 'react';
import { ChevronDown, Search, Factory, Check, Loader2, X } from 'lucide-react';

interface Line {
    id: string;
    name: string;
    status: string | null;
    total_running_hours: number | null;
}

interface LineSelectorProps {
    selectedLineId: string | null;
    onLineChange: (lineId: string | null, lineName: string | null) => void;
}

function LineSelector({ selectedLineId, onLineChange }: LineSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [lines, setLines] = useState<Line[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedLine, setSelectedLine] = useState<Line | null>(null);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Fetch lines from API
    const fetchLines = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/lines');
            const data = await res.json();
            if (data.success) {
                setLines(data.data);
            }
        } catch (err) {
            console.error('Error fetching lines:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch all lines on mount
    useEffect(() => {
        fetchLines();
    }, [fetchLines]);

    // Set selected line when selectedLineId changes
    useEffect(() => {
        if (selectedLineId && lines.length > 0) {
            const found = lines.find(l => l.id === selectedLineId);
            if (found) {
                setSelectedLine(found);
                setInputValue(found.name);
            }
        }
    }, [selectedLineId, lines]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // Reset input to selected value on close
                setInputValue(selectedLine ? selectedLine.name : '');
                setHighlightedIndex(-1);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedLine]);

    // Filter lines based on input value (autocomplete)
    const filteredLines = inputValue.trim()
        ? lines.filter(l => l.name?.toLowerCase().includes(inputValue.toLowerCase()))
        : lines;

    // Build items list: "All Lines" + filtered lines
    const allItems = [
        { type: 'all' as const, id: '__all__', name: 'All Lines', status: null, total_running_hours: null },
        ...filteredLines.map(l => ({ type: 'line' as const, ...l })),
    ];

    const handleSelect = (line: Line) => {
        setSelectedLine(line);
        setInputValue(line.name);
        onLineChange(line.id, line.name);
        setIsOpen(false);
        setHighlightedIndex(-1);
    };

    const handleSelectAll = () => {
        setSelectedLine(null);
        setInputValue('');
        onLineChange(null, null);
        setIsOpen(false);
        setHighlightedIndex(-1);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedLine(null);
        setInputValue('');
        onLineChange(null, null);
        setHighlightedIndex(-1);
    };

    const handleInputChange = (value: string) => {
        setInputValue(value);
        setIsOpen(true);
        setHighlightedIndex(-1);
    };

    const handleInputFocus = () => {
        setIsOpen(true);
        // Select all text on focus for easy replacement
        inputRef.current?.select();
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setIsOpen(true);
                e.preventDefault();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < allItems.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev > 0 ? prev - 1 : allItems.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < allItems.length) {
                    const item = allItems[highlightedIndex];
                    if (item.type === 'all') {
                        handleSelectAll();
                    } else {
                        handleSelect(item as Line);
                    }
                } else if (filteredLines.length === 1) {
                    // Auto-select if only one result
                    handleSelect(filteredLines[0]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setInputValue(selectedLine ? selectedLine.name : '');
                setHighlightedIndex(-1);
                inputRef.current?.blur();
                break;
        }
    };

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const items = listRef.current.querySelectorAll('[data-item]');
            items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlightedIndex]);

    const getStatusConfig = (status: string | null) => {
        switch (status?.toLowerCase()) {
            case 'active':
            case 'running':
                return {
                    color: 'bg-emerald-400',
                    text: 'text-emerald-600',
                    bg: 'bg-emerald-50',
                    border: 'border-emerald-200',
                    label: 'Active',
                    pulse: true,
                };
            case 'idle':
            case 'standby':
                return {
                    color: 'bg-amber-400',
                    text: 'text-amber-600',
                    bg: 'bg-amber-50',
                    border: 'border-amber-200',
                    label: 'Idle',
                    pulse: false,
                };
            case 'maintenance':
                return {
                    color: 'bg-blue-400',
                    text: 'text-blue-600',
                    bg: 'bg-blue-50',
                    border: 'border-blue-200',
                    label: 'Maintenance',
                    pulse: false,
                };
            case 'offline':
            case 'stopped':
                return {
                    color: 'bg-rose-400',
                    text: 'text-rose-600',
                    bg: 'bg-rose-50',
                    border: 'border-rose-200',
                    label: 'Offline',
                    pulse: false,
                };
            default:
                return {
                    color: 'bg-slate-400',
                    text: 'text-slate-500',
                    bg: 'bg-slate-50',
                    border: 'border-slate-200',
                    label: status || 'Unknown',
                    pulse: false,
                };
        }
    };

    // Highlight matched text in autocomplete
    const highlightMatch = (text: string) => {
        if (!inputValue.trim()) return text;
        const regex = new RegExp(`(${inputValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) =>
            regex.test(part)
                ? <mark key={i} className="bg-indigo-100 text-indigo-700 rounded-sm px-0.5 font-bold">{part}</mark>
                : part
        );
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Autocomplete Input with Dropdown Trigger */}
            <div className="flex items-center gap-0 bg-white/10 backdrop-blur-sm rounded-xl border border-white/15 hover:bg-white/15 hover:border-white/25 transition-all duration-300 min-w-[220px]">
                {/* Factory Icon */}
                <div className="pl-3 pr-1 flex items-center">
                    <Factory size={14} className="text-indigo-300 flex-shrink-0" />
                </div>

                {/* Input */}
                <div className="flex-1 flex flex-col py-1">
                    <span className="text-[7px] text-indigo-300/60 font-medium uppercase tracking-widest leading-none pl-1">Production Line</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onFocus={handleInputFocus}
                        onKeyDown={handleKeyDown}
                        placeholder="Search or select line..."
                        className="bg-transparent text-[11px] text-white font-bold pl-1 pr-1 py-0 border-none outline-none placeholder:text-white/40 w-full min-w-0"
                        autoComplete="off"
                        role="combobox"
                        aria-expanded={isOpen}
                        aria-haspopup="listbox"
                        aria-autocomplete="list"
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 pr-2">
                    {selectedLine && (
                        <button
                            onClick={handleClear}
                            className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/25 transition-colors"
                            aria-label="Clear selection"
                        >
                            <X size={8} className="text-white/70" />
                        </button>
                    )}
                    <button
                        onClick={() => { setIsOpen(!isOpen); if (!isOpen) inputRef.current?.focus(); }}
                        className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors"
                        aria-label="Toggle dropdown"
                    >
                        <ChevronDown
                            size={13}
                            className={`text-indigo-300/70 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                        />
                    </button>
                </div>
            </div>

            {/* Dropdown List */}
            {isOpen && (
                <div
                    className="absolute top-full left-0 mt-1.5 w-80 bg-white/98 backdrop-blur-xl rounded-xl shadow-2xl shadow-black/20 border border-slate-200/60 z-50 overflow-hidden"
                    style={{ animation: 'dropdownIn 0.2s ease-out' }}
                    role="listbox"
                >
                    {/* Search hint */}
                    <div className="px-3 py-1.5 bg-gradient-to-r from-indigo-50/80 to-purple-50/50 border-b border-slate-100 flex items-center gap-1.5">
                        <Search size={10} className="text-indigo-400" />
                        <span className="text-[9px] text-indigo-500/70 font-medium">
                            {inputValue ? `Showing results for "${inputValue}"` : 'Type to search or select from list'}
                        </span>
                    </div>

                    {/* Items */}
                    <div ref={listRef} className="max-h-60 overflow-auto p-1.5" style={{ scrollbarWidth: 'thin' }}>
                        {loading ? (
                            <div className="flex items-center justify-center py-6 gap-2">
                                <Loader2 size={14} className="text-indigo-500 animate-spin" />
                                <span className="text-xs text-slate-500">Loading lines...</span>
                            </div>
                        ) : filteredLines.length === 0 && inputValue.trim() ? (
                            <div className="text-center py-6">
                                <Factory size={20} className="text-slate-300 mx-auto mb-1.5" />
                                <p className="text-xs text-slate-400 font-medium">No lines match "{inputValue}"</p>
                                <p className="text-[9px] text-slate-300 mt-0.5">Try a different search term</p>
                            </div>
                        ) : (
                            <>
                                {/* All Lines option */}
                                <button
                                    data-item
                                    onClick={handleSelectAll}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-150 mb-0.5 ${highlightedIndex === 0
                                            ? 'bg-indigo-50 border border-indigo-200/50'
                                            : !selectedLineId
                                                ? 'bg-indigo-50/50 border border-indigo-100/50'
                                                : 'hover:bg-slate-50 border border-transparent'
                                        }`}
                                    role="option"
                                    aria-selected={!selectedLineId}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0">
                                        <Factory size={14} className="text-slate-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-slate-700">All Lines</div>
                                        <div className="text-[9px] text-slate-400">Show all production data</div>
                                    </div>
                                    {!selectedLineId && (
                                        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                                            <Check size={11} className="text-white" strokeWidth={3} />
                                        </div>
                                    )}
                                </button>

                                {/* Divider */}
                                <div className="h-px bg-slate-100 my-1.5" />

                                {/* Line items */}
                                {filteredLines.map((line, idx) => {
                                    const statusConfig = getStatusConfig(line.status);
                                    const isSelected = selectedLineId === line.id;
                                    const itemIndex = idx + 1; // +1 because "All Lines" is index 0
                                    const isHighlighted = highlightedIndex === itemIndex;

                                    return (
                                        <button
                                            key={line.id}
                                            data-item
                                            onClick={() => handleSelect(line)}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 mb-0.5 ${isHighlighted
                                                    ? 'bg-indigo-50 border border-indigo-200/50'
                                                    : isSelected
                                                        ? 'bg-indigo-50/50 border border-indigo-100/50'
                                                        : 'hover:bg-slate-50 border border-transparent'
                                                }`}
                                            role="option"
                                            aria-selected={isSelected}
                                        >
                                            {/* Line icon with status dot */}
                                            <div className={`w-8 h-8 rounded-lg ${statusConfig.bg} border ${statusConfig.border} flex items-center justify-center flex-shrink-0 relative`}>
                                                <Factory size={14} className={statusConfig.text} />
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${statusConfig.color} border-2 border-white ${statusConfig.pulse ? 'animate-pulse' : ''}`} />
                                            </div>

                                            {/* Line info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[11px] font-bold text-slate-700 truncate">
                                                    {highlightMatch(line.name)}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className={`text-[9px] font-semibold ${statusConfig.text} uppercase tracking-wider`}>
                                                        {statusConfig.label}
                                                    </span>
                                                    {line.total_running_hours !== null && (
                                                        <>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="text-[9px] text-slate-400 font-medium">
                                                                {Number(line.total_running_hours).toLocaleString()}h
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Selected check */}
                                            {isSelected && (
                                                <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                                                    <Check size={11} className="text-white" strokeWidth={3} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </>
                        )}
                    </div>

                    {/* Footer with count */}
                    <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <p className="text-[9px] text-slate-400">
                            {filteredLines.length} line{filteredLines.length !== 1 ? 's' : ''} available
                        </p>
                        <div className="flex items-center gap-1">
                            <kbd className="text-[8px] text-slate-400 bg-slate-100 rounded px-1 py-0.5 font-mono">↑↓</kbd>
                            <span className="text-[8px] text-slate-300">navigate</span>
                            <kbd className="text-[8px] text-slate-400 bg-slate-100 rounded px-1 py-0.5 font-mono ml-1">↵</kbd>
                            <span className="text-[8px] text-slate-300">select</span>
                        </div>
                    </div>
                </div>
            )}

            {/* CSS for dropdown animation */}
            <style jsx>{`
                @keyframes dropdownIn {
                    from {
                        opacity: 0;
                        transform: translateY(-4px) scale(0.98);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            `}</style>
        </div>
    );
}

export default memo(LineSelector);
