'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Header from '@/components/header';
import PNSelector from '@/components/pn-selector';
import { DowntimeAlert as DowntimeAlertType } from '@/types';
import { Activity } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';

// Skeleton component for loading states
const ChartSkeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-white/80 backdrop-blur-sm rounded-xl shadow-sm animate-pulse border border-gray-100 ${className}`}>
    <div className="p-3">
      <div className="h-3 bg-gray-200 rounded-full w-1/3 mb-3"></div>
      <div className="h-16 bg-gradient-to-r from-gray-100 to-gray-50 rounded-lg"></div>
    </div>
  </div>
);

// Dynamic imports with loading states (code-split each chart)
const ActualOutput = dynamic(() => import('@/components/charts/actual-output-chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

const OEEChart = dynamic(() => import('@/components/charts/oee-chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

const CycleTime = dynamic(() => import('@/components/charts/cycle-time'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

const HistoryChart = dynamic(() => import('@/components/charts/history'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

const StatusMachine = dynamic(() => import('@/components/charts/status-machine'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

const DefectRejectChart = dynamic(() => import('@/components/charts/defect-reject'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

const ThroughputChart = dynamic(() => import('@/components/charts/throughput-chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

const TrendAnalysis = dynamic(() => import('@/components/charts/trend-analysis'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

const DowntimeAlert = dynamic(() => import('@/components/downtime-alert'), {
  ssr: false,
});

export default function Home() {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [selectedLineName, setSelectedLineName] = useState<string | null>(null);
  const [selectedPnId, setSelectedPnId] = useState<string | null>(null);
  const [selectedPn, setSelectedPn] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const router = useRouter();

  // =========================================================
  // SWR: Fetch ONLY the active tab's data, refresh every 10s
  // =========================================================
  const activeTab = showAnalysis ? 'analysis' : 'dashboard';

  const {
    data: dashboardData,
    isLoading,
    isValidating,
    mutate,
  } = useDashboardData({
    tab: activeTab as 'dashboard' | 'analysis',
    lineId: selectedLineId,
    pn: selectedPn,
    enabled: mounted, // Don't fetch until mounted
  });

  // Prevent hydration mismatch + restore saved line selection
  useEffect(() => {
    setMounted(true);
    // Restore last selected line from localStorage
    try {
      const saved = localStorage.getItem('dashboard_selected_line');
      if (saved) {
        const { lineId, lineName } = JSON.parse(saved);
        if (lineId) {
          setSelectedLineId(lineId);
          setSelectedLineName(lineName);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Auto-rotate between Dashboard and Analysis every 10 seconds
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setShowAnalysis(prev => !prev);
    }, 10000);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Global Realtime WebSocket for Dashboard
  useEffect(() => {
    const socket = new WebSocket('ws://localhost:3001');
    
    socket.onopen = () => {
      console.log('[Dashboard] WebSocket connected');
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Dashboard] WebSocket event received:', data.type);
        
        // Handle different types of updates
        switch (data.type) {
          case 'DASHBOARD_UPDATE':
          case 'TREND_ANALYSIS_UPDATE':
          case 'MACHINE_STATUS_UPDATE':
            console.log('[Dashboard] Triggering data refresh...');
            mutate();
            break;
          case 'NOTIFICATION_UPDATE':
            // Could handle notifications separately if needed
            console.log('[Dashboard] Notification update detected');
            mutate(); // Still refresh dashboard for notification counts
            break;
          default:
            console.log('[Dashboard] Unknown event type:', data.type);
        }
      } catch (err) {
        console.error('[Dashboard] WebSocket message error:', err);
      }
    };

    socket.onerror = (error) => {
      console.error('[Dashboard] WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('[Dashboard] WebSocket disconnected');
    };

    return () => {
      socket.close();
    };
  }, [mutate]);

  // Downtime alerts handling

  const handleManagementSystem = useCallback(() => {
    router.push('/management-system');
  }, [router]);

  const handleLineChange = useCallback((lineId: string | null, lineName: string | null) => {
    setSelectedLineId(lineId);
    setSelectedLineName(lineName);
    // Persist to localStorage so selection survives refresh
    try {
      if (lineId) {
        localStorage.setItem('dashboard_selected_line', JSON.stringify({ lineId, lineName }));
      } else {
        localStorage.removeItem('dashboard_selected_line');
      }
    } catch {
      // ignore storage errors
    }
    // Force re-fetch data when line changes
    mutate();
  }, [mutate]);



  const handlePnChange = useCallback((pnId: string | null, partNumber: string | null) => {
    setSelectedPnId(pnId);
    setSelectedPn(partNumber);
    // Force re-fetch data when PN changes
    mutate();
  }, [mutate]);

  const handleRefresh = useCallback(() => {
    mutate();
  }, [mutate]);

  // =========================================================
  // Dashboard Content - pass SWR data as props to components
  // Only rendered when Dashboard tab is active
  // =========================================================
  const DashboardContent = useMemo(() => (
    <main className="flex-1 p-2 overflow-hidden" style={{ height: 'calc(100vh - 48px)' }}>
      <div className="h-full flex flex-col gap-2">

        {/* TOP ROW: Actual Output FULL WIDTH - Height: 38% */}
        <div className="w-full" style={{ height: '38%' }}>
          <ActualOutput
            className="h-full w-full"
            hourlyData={dashboardData?.actualOutput?.hourly}
            summary={dashboardData?.actualOutput?.summary}
            isLoading={isLoading}
            isValidating={isValidating}
            onRefresh={handleRefresh}
          />
        </div>

        {/* MIDDLE ROW: OEE + Throughput + Cycle Time + Status Machine - Height: 31% */}
        <div className="flex gap-2" style={{ height: '31%' }}>
          <div className="w-[25%]">
            <OEEChart
              className="h-full w-full"
              oeeData={dashboardData?.oee}
              isLoading={isLoading}
            />
          </div>
          <div className="w-[25%]">
            <ThroughputChart
              className="h-full w-full"
              lineId={selectedLineId}
              throughputData={dashboardData?.throughput}
            />
          </div>
          <div className="w-[25%]">
            <CycleTime
              className="h-full w-full"
              cycleTimeData={dashboardData?.cycleTimeLine}
              lineId={selectedLineId}
              isLoading={isLoading}
            />
          </div>
          <div className="w-[25%]">
            <StatusMachine
              className="h-full w-full"
              machinesData={dashboardData?.machines}
              isLoading={isLoading}
              selectedLineId={selectedLineId}
            />
          </div>
        </div>

        {/* BOTTOM ROW: Defect FULL WIDTH - Height: 28% */}
        <div className="w-full" style={{ height: '28%' }}>
          <DefectRejectChart 
              className="h-full w-full" 
              defectData={dashboardData?.defectByProcess}
              actualOutputData={dashboardData?.actualOutput}
          />
        </div>

      </div>
    </main>
  ), [dashboardData, isLoading, isValidating, handleRefresh, selectedLineId]);

  // =========================================================
  // Analysis Content - Only rendered when Analysis tab is active
  // =========================================================
  const AnalysisContent = useMemo(() => (
    <main className="flex-1 p-2 overflow-hidden" style={{ height: 'calc(100vh - 48px)' }}>
      <div className="h-full flex flex-col gap-2">

        {/* Trend Analysis - 60% height */}
        <div className="w-full" style={{ height: '60%' }}>
          <TrendAnalysis 
            className="h-full w-full" 
            lineId={selectedLineId}
            trendData={dashboardData?.trend}
            isLoading={isLoading}
            onRefresh={handleRefresh}
          />
        </div>

        {/* History Chart - 38% height */}
        <div className="w-full" style={{ height: '38%' }}>
          <HistoryChart className="h-full w-full" />
        </div>

      </div>
    </main>
  ), [selectedLineId, dashboardData?.trend, isLoading, handleRefresh]);

  if (!mounted) {
    return (
      <div className="h-screen w-full bg-gradient-to-br from-slate-100 via-indigo-50/50 to-purple-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in-up">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-xl shadow-indigo-500/30 animate-pulse">
              <Activity size={24} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white animate-bounce" />
          </div>
          <div>
            <div className="text-sm text-slate-700 font-bold text-center">Loading Dashboard</div>
            <div className="text-[10px] text-slate-400 text-center mt-0.5">Connecting to production systems...</div>
          </div>
          <div className="w-32 h-1 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full animated-gradient rounded-full shimmer" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden" style={{ background: 'linear-gradient(135deg, #f1f5f9 0%, #eef2ff 30%, #f5f3ff 60%, #fdf4ff 100%)' }}>
      <Header
        onManagementClick={handleManagementSystem}
        selectedLineId={selectedLineId}
        onLineChange={handleLineChange}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused(prev => !prev)}
      />

      <DowntimeAlert selectedLineId={selectedLineId} />

      {/* View Toggle + PN Selector */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-white/60 backdrop-blur-md border-b border-slate-200/50">

        {/* Kiri: PN Selector */}
        <div className="flex items-center">
          <PNSelector
            selectedPnId={selectedPnId}
            selectedPn={selectedPn}
            onPnChange={handlePnChange}
            selectedLineId={selectedLineId}
          />
        </div>

        {/* Tengah: Tab Dashboard / Analysis */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-100/80 rounded-full p-0.5 border border-slate-200/50">
            <button
              onClick={() => setShowAnalysis(false)}
              className={`px-4 py-1 rounded-full text-xs font-bold transition-all duration-300 ${!showAnalysis
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-400/30'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setShowAnalysis(true)}
              className={`px-4 py-1 rounded-full text-xs font-bold transition-all duration-300 ${showAnalysis
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-400/30'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}
            >
              📈 Analysis
            </button>
          </div>

          {/* Active Line indicator */}
          {selectedLineName && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 rounded-full border border-indigo-200/50">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[10px] font-bold text-indigo-600">{selectedLineName}</span>
            </div>
          )}
          {/* Active PN indicator */}
          {selectedPn && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 bg-violet-50 rounded-full border border-violet-200/50">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-[10px] font-bold text-violet-600">{selectedPn}</span>
            </div>
          )}
        </div>

        {/* Kanan: Auto-refresh indicator */}
        <div className="flex items-center gap-1">
          {isValidating && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />}
          <div className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse-soft" />
          <span className="text-[9px] text-slate-400 font-medium">auto 10s</span>
        </div>
      </div>

      {/* Container for Dashboard/Analysis - ONLY render active tab */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        {/* Dashboard Content - only render when active */}
        <div className={`flex-1 flex flex-col transition-opacity duration-500 ${showAnalysis ? 'hidden' : 'flex'}`}>
          {!showAnalysis && DashboardContent}
        </div>

        {/* Analysis Content - only render when active */}
        <div className={`flex-1 flex flex-col transition-opacity duration-500 ${showAnalysis ? 'flex' : 'hidden'}`}>
          {showAnalysis && AnalysisContent}
        </div>
      </div>

      <style jsx global>{`
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        /* Optimize animations */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}