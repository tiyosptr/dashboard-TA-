'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Maximize2, Minimize2, X, ChevronLeft, ChevronRight,
  Play, Pause, RotateCcw, Settings, Layers,
  Activity, AlertTriangle, CheckCircle, Clock,
  BarChart3, Gauge, Shield, Box, Cpu, CalendarDays,
  RefreshCw, Filter, Search, Zap, Wrench, PowerOff
} from 'lucide-react';
import { MachineData } from '@/types';

interface FullscreenMonitoringProps {
  machines: MachineData[];
  onClose: () => void;
  initialLineId?: string | null;
}

interface LineGroup {
  lineId: string | null;
  lineName: string;
  machines: MachineData[];
}

export default function FullscreenMonitoring({
  machines,
  onClose,
  initialLineId = null
}: FullscreenMonitoringProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [rotationInterval, setRotationInterval] = useState(15); // seconds
  const [showSettings, setShowSettings] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Group machines by line
  const lineGroups = machines.reduce<LineGroup[]>((groups, machine) => {
    const lineId = machine.line_id || '__unassigned__';
    const lineName = machine.line_name || 'Unassigned';
    
    const existingGroup = groups.find(g => g.lineId === lineId);
    if (existingGroup) {
      existingGroup.machines.push(machine);
    } else {
      groups.push({
        lineId: lineId === '__unassigned__' ? null : lineId,
        lineName,
        machines: [machine]
      });
    }
    
    return groups;
  }, []);

  // Sort lines: named lines first, unassigned last
  const sortedLineGroups = [...lineGroups].sort((a, b) => {
    if (a.lineName === 'Unassigned') return 1;
    if (b.lineName === 'Unassigned') return -1;
    return a.lineName.localeCompare(b.lineName);
  });

  // Set initial line index based on initialLineId
  useEffect(() => {
    if (initialLineId && sortedLineGroups.length > 0) {
      const index = sortedLineGroups.findIndex(group => group.lineId === initialLineId);
      if (index !== -1) {
        setCurrentLineIndex(index);
      }
    }
  }, [initialLineId, sortedLineGroups]);

  // Auto rotation effect
  useEffect(() => {
    if (!isAutoRotating || sortedLineGroups.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentLineIndex(prev => (prev + 1) % sortedLineGroups.length);
    }, rotationInterval * 1000);

    return () => clearInterval(interval);
  }, [isAutoRotating, rotationInterval, sortedLineGroups.length]);

  // Enter/exit fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      } else if ((containerRef.current as any).msRequestFullscreen) {
        (containerRef.current as any).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  }, [isFullscreen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
        onClose();
      }
      
      // Navigate with arrow keys
      if (e.key === 'ArrowLeft') {
        setCurrentLineIndex(prev => (prev - 1 + sortedLineGroups.length) % sortedLineGroups.length);
      } else if (e.key === 'ArrowRight') {
        setCurrentLineIndex(prev => (prev + 1) % sortedLineGroups.length);
      }
      
      // Toggle auto rotation with Space
      if (e.key === ' ') {
        e.preventDefault();
        setIsAutoRotating(prev => !prev);
      }
      
      // Toggle fullscreen with F11
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sortedLineGroups.length, toggleFullscreen, onClose]);

  const currentLine = sortedLineGroups[currentLineIndex];
  const filteredMachines = currentLine?.machines.filter(machine => {
    if (filterStatus !== 'all' && machine.status?.toLowerCase() !== filterStatus.toLowerCase()) {
      return false;
    }
    if (searchQuery && !machine.name_machine.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  }) || [];

  // Status configuration
  const getStatusConfig = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'active' || s === 'running') {
      return {
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200',
        gradient: 'from-green-400 to-emerald-500',
        dot: 'bg-green-500',
        label: 'ACTIVE'
      };
    } else if (s === 'maintenance') {
      return {
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        gradient: 'from-yellow-400 to-amber-500',
        dot: 'bg-yellow-500',
        label: 'MAINT'
      };
    } else if (s === 'on hold' || s === 'on-hold' || s === 'onhold' || s === 'hold') {
      return {
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        gradient: 'from-orange-400 to-red-500',
        dot: 'bg-orange-500',
        label: 'HOLD'
      };
    } else if (s === 'downtime' || s === 'down' || s === 'error') {
      return {
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        gradient: 'from-red-400 to-rose-500',
        dot: 'bg-red-500',
        label: 'DOWN'
      };
    } else if (s === 'inactive' || s === 'offline' || s === 'stopped') {
      return {
        color: 'text-gray-600',
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        gradient: 'from-gray-400 to-slate-500',
        dot: 'bg-gray-500',
        label: 'OFFLINE'
      };
    }
    return {
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      gradient: 'from-blue-400 to-indigo-500',
      dot: 'bg-blue-500',
      label: 'UNKNOWN'
    };
  };

  const getStatusIcon = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'active' || s === 'running') return Activity;
    if (s === 'maintenance') return Wrench;
    if (s === 'on hold' || s === 'on-hold' || s === 'onhold' || s === 'hold') return Clock;
    if (s === 'downtime' || s === 'down' || s === 'error') return AlertTriangle;
    if (s === 'inactive' || s === 'offline' || s === 'stopped') return PowerOff;
    return Activity;
  };

  const formatCycleTimeDisplay = (val: number | null | undefined): string => {
    if (!val || val <= 0) return '0 sec';
    if (val < 60) {
      return `${val.toFixed(1)} sec`;
    }
    if (val < 3600) {
      return `${(val / 60).toFixed(1)} min`;
    }
    return `${(val / 3600).toFixed(1)} hour`;
  };

  const formatDurationFromHours = (hoursStr: string | null): string => {
    if (!hoursStr) return '0s';
    const hours = parseFloat(hoursStr);
    if (isNaN(hours) || hours <= 0) return '0s';

    const totalSeconds = Math.round(hours * 3600);
    if (totalSeconds < 60) {
      return `${totalSeconds}s`;
    }
    if (totalSeconds < 3600) {
      const min = Math.floor(totalSeconds / 60);
      const sec = totalSeconds % 60;
      return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
    }
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  if (sortedLineGroups.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
        <div className="bg-slate-900 rounded-2xl p-8 max-w-md">
          <div className="text-center">
            <Cpu className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Machines Found</h2>
            <p className="text-slate-400 mb-6">There are no machines available for monitoring.</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 ${isFullscreen ? 'bg-slate-950' : 'bg-black/90'} transition-colors duration-300`}
    >
      {/* Control Bar */}
      <div className="absolute top-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              >
                <X size={16} />
                <span className="font-medium">Exit</span>
              </button>

              <div className="h-6 w-px bg-slate-700"></div>

              <div className="flex items-center gap-2">
                <Layers className="text-indigo-400" size={18} />
                <h1 className="text-lg font-bold text-white">Fullscreen Monitoring</h1>
                <span className="text-sm text-slate-400 ml-2">
                  Line: <span className="font-semibold text-white">{currentLine?.lineName}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Line Navigation */}
              <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-2 py-1">
                <button
                  onClick={() => setCurrentLineIndex(prev => (prev - 1 + sortedLineGroups.length) % sortedLineGroups.length)}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                
                <div className="flex items-center gap-1">
                  {sortedLineGroups.map((group, index) => (
                    <button
                      key={group.lineId || 'unassigned'}
                      onClick={() => setCurrentLineIndex(index)}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${index === currentLineIndex
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                    >
                      {group.lineName}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentLineIndex(prev => (prev + 1) % sortedLineGroups.length)}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Auto Rotation Control */}
              <button
                onClick={() => setIsAutoRotating(!isAutoRotating)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${isAutoRotating
                  ? 'bg-green-900/30 text-green-400 border border-green-800'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
              >
                {isAutoRotating ? <Pause size={14} /> : <Play size={14} />}
                <span className="text-sm font-medium">
                  {isAutoRotating ? 'Auto: ON' : 'Auto: OFF'}
                </span>
                <span className="text-xs text-slate-400">
                  ({rotationInterval}s)
                </span>
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-900/30 hover:bg-indigo-800 text-indigo-300 border border-indigo-800 rounded-lg transition-colors"
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                <span className="text-sm font-medium">
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </span>
              </button>

              {/* Settings */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="mt-3 bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Rotation Interval (seconds)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRotationInterval(prev => Math.max(5, prev - 5))}
                      className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={rotationInterval}
                      onChange={(e) => setRotationInterval(Math.max(5, Math.min(60, parseInt(e.target.value) || 15)))}
                      className="w-20 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-white text-center"
                    />
                    <button
                      onClick={() => setRotationInterval(prev => Math.min(60, prev + 5))}
                      className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Filter by Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="onhold">On Hold</option>
                    <option value="downtime">Downtime</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Search Machines
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="text"
                      placeholder="Search machine name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-16 pb-14 h-full overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Line Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {currentLine?.lineName} Line
                </h2>
                <p className="text-slate-400">
                  {filteredMachines.length} machines • Auto rotation: {isAutoRotating ? 'ON' : 'OFF'} • {rotationInterval}s interval
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAutoRotating(!isAutoRotating)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${isAutoRotating
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                >
                  {isAutoRotating ? 'Pause Rotation' : 'Start Rotation'}
                </button>
                <button
                  onClick={() => router.push(`/admin/line/${currentLine?.lineId}`)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                  View Line Details
                </button>
              </div>
            </div>
          </div>

          {/* Machines Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMachines.map((machine) => {
              const config = getStatusConfig(machine.status || '');
              const StatusIcon = getStatusIcon(machine.status || '');
              const metrics = {
                oee: Math.floor(Math.random() * 30) + 70, // Simulated OEE
                output: machine.real_output || 0,
                throughput: machine.real_throughput || 0,
                cycleTime: machine.real_cycle_time || 0,
                defectRate: machine.real_defect_rate || 0
              };

              const oeeColor = metrics.oee >= 90 ? 'text-green-400' :
                metrics.oee >= 80 ? 'text-yellow-400' :
                  metrics.oee >= 70 ? 'text-orange-400' : 'text-red-400';

              const oeeBarColor = metrics.oee >= 90 ? 'from-green-400 to-emerald-500' :
                metrics.oee >= 80 ? 'from-yellow-400 to-amber-500' :
                  metrics.oee >= 70 ? 'from-orange-400 to-red-500' : 'from-red-400 to-rose-500';

              return (
                <div
                  key={machine.id}
                  className={`bg-slate-900 rounded-xl border ${config.border} shadow-lg hover:shadow-xl/50 transition-all duration-300 overflow-hidden group`}
                >
                  {/* Top accent bar */}
                  <div className={`h-1 w-full bg-gradient-to-r ${config.gradient}`} />

                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-white truncate">
                            {machine.name_machine || 'Unknown Machine'}
                          </h3>
                          <div className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`} />
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {machine.process_name && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs font-medium">
                              <Settings size={10} />
                              {machine.process_name}
                            </span>
                          )}
                          {machine.last_maintenance && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs font-medium">
                              <Clock size={10} />
                              Last: {new Date(machine.last_maintenance).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${config.bg} ${config.color}`}>
                        <StatusIcon size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {config.label}
                        </span>
                      </div>
                    </div>

                    {/* OEE Progress */}
                    <div className="mb-3">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          OEE
                        </span>
                        <span className={`text-xl font-black ${oeeColor}`}>
                          {metrics.oee}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${oeeBarColor} transition-all duration-700`}
                          style={{ width: `${Math.min(metrics.oee, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-slate-800 rounded-lg p-2">
                        <div className="text-xs text-slate-400 mb-1">Output</div>
                        <div className="text-lg font-bold text-white">
                          {metrics.output.toLocaleString('id-ID')}
                        </div>
                        <div className="text-xs text-slate-500">pcs</div>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-2">
                        <div className="text-xs text-slate-400 mb-1">Throughput</div>
                        <div className="text-lg font-bold text-white">
                          {metrics.throughput < 1 
                            ? (metrics.throughput * 60).toFixed(1)
                            : metrics.throughput.toFixed(1)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {metrics.throughput < 1 ? '/min' : '/s'}
                        </div>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-2">
                        <div className="text-xs text-slate-400 mb-1">Cycle Time</div>
                        <div className="text-lg font-bold text-white">
                          {formatCycleTimeDisplay(metrics.cycleTime)}
                        </div>
                        <div className="text-xs text-slate-500">per unit</div>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-2">
                        <div className="text-xs text-slate-400 mb-1">Defect Rate</div>
                        <div className="text-lg font-bold text-white">
                          {(metrics.defectRate * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-500">reject</div>
                      </div>
                    </div>

                    {/* Running Hours */}
                    {machine.total_running_hours && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-slate-400">Running Hours:</div>
                        <div className="text-white font-medium">
                          {formatDurationFromHours(machine.total_running_hours)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {filteredMachines.length === 0 && (
            <div className="text-center py-12">
              <Cpu className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-300 mb-2">No Machines Found</h3>
              <p className="text-slate-500 mb-6">
                {searchQuery 
                  ? `No machines match "${searchQuery}"`
                  : `No machines with status "${filterStatus}"`}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Footer Stats */}
          <div className="mt-8 bg-slate-900/50 rounded-xl p-4 border border-slate-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {filteredMachines.length}
                </div>
                <div className="text-sm text-slate-400">Machines</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {filteredMachines.filter(m => m.status?.toLowerCase() === 'active').length}
                </div>
                <div className="text-sm text-slate-400">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {filteredMachines.filter(m => m.status?.toLowerCase() === 'maintenance').length}
                </div>
                <div className="text-sm text-slate-400">Maintenance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">
                  {filteredMachines.filter(m => m.status?.toLowerCase() === 'downtime').length}
                </div>
                <div className="text-sm text-slate-400">Downtime</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <div className="inline-flex items-center gap-4 bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-800">
          <span className="text-xs text-slate-400">
            <span className="font-medium text-slate-300">Keyboard Shortcuts:</span>
            <span className="ml-2">← → Navigate</span>
            <span className="ml-2">Space Pause/Play</span>
            <span className="ml-2">F11 Fullscreen</span>
            <span className="ml-2">Esc Exit</span>
          </span>
        </div>
      </div>
    </div>
  );
}