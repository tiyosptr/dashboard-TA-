'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Header from '@/components/header';
import { DowntimeAlert as DowntimeAlertType } from '@/types';

// Skeleton component for loading states
const ChartSkeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-white rounded-lg shadow-sm p-2 animate-pulse ${className}`}>
    <div className="h-3 bg-gray-200 rounded w-1/3 mb-2"></div>
    <div className="h-16 bg-gray-100 rounded"></div>
  </div>
);

// Dynamic imports with loading states
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
  const [downtimeAlerts, setDowntimeAlerts] = useState<DowntimeAlertType[]>([]);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-rotate between Dashboard and Analysis every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setShowAnalysis(prev => !prev);
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleDowntimeTrigger = () => {
      const alerts = JSON.parse(localStorage.getItem('downtimeAlerts') || '[]');
      if (alerts.length > 0) {
        setDowntimeAlerts(alerts);
        localStorage.removeItem('downtimeAlerts');
      }
    };

    handleDowntimeTrigger();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'downtimeAlerts' && e.newValue) {
        const alerts = JSON.parse(e.newValue);
        setDowntimeAlerts(alerts);
        localStorage.removeItem('downtimeAlerts');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('downtimeTriggered', handleDowntimeTrigger);

    const poll = setInterval(handleDowntimeTrigger, 1000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('downtimeTriggered', handleDowntimeTrigger);
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    const handleAcknowledge = (event: CustomEvent) => {
      const { id } = event.detail;
      setDowntimeAlerts(prev => prev.filter(alert => alert.id !== id));
    };

    const handleStorageAcknowledge = (e: StorageEvent) => {
      if (e.key === 'acknowledgeDowntime' && e.newValue) {
        const { id } = JSON.parse(e.newValue);
        setDowntimeAlerts(prev => prev.filter(alert => alert.id !== id));
        localStorage.removeItem('acknowledgeDowntime');
      }
    };

    window.addEventListener('acknowledgeDowntime' as any, handleAcknowledge);
    window.addEventListener('storage', handleStorageAcknowledge);

    return () => {
      window.removeEventListener('acknowledgeDowntime' as any, handleAcknowledge);
      window.removeEventListener('storage', handleStorageAcknowledge);
    };
  }, []);

  const handleManagementSystem = () => {
    router.push('/management-system');
  };

  const dismissDowntimeAlert = (id: number) => {
    setDowntimeAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const acknowledgeDowntimeAlert = (id: number) => {
    const alert = downtimeAlerts.find(a => a.id === id);
    if (alert) {
      const newNotification = {
        id: `N-${Date.now()}`,
        type: 'Downtime',
        severity: 'Critical',
        machineId: alert.machineId,
        machineName: alert.machineName,
        message: `Machine stopped - ${alert.reason || 'Production halted'}`,
        timestamp: alert.timestamp,
        read: false,
        acknowledged: true,
        status: 'On Solving',
      };

      const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
      localStorage.setItem('notifications', JSON.stringify([newNotification, ...notifications]));
      window.dispatchEvent(new Event('notificationUpdated'));
    }

    setDowntimeAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  // Dashboard Content - useMemo must be before conditional return
  const DashboardContent = useMemo(() => (
    <main className="flex-1 p-1 overflow-hidden" style={{ height: 'calc(100vh - 40px)' }}>
      <div className="h-full flex flex-col gap-1">

        {/* TOP ROW: Actual Output FULL WIDTH - Height: 38% */}
        <div className="w-full" style={{ height: '38%' }}>
          <ActualOutput className="h-full w-full" />
        </div>

        {/* MIDDLE ROW: OEE + Throughput + Cycle Time + Status Machine - Height: 31% */}
        <div className="flex gap-1" style={{ height: '31%' }}>
          <div className="w-[25%]">
            <OEEChart className="h-full w-full" />
          </div>
          <div className="w-[25%]">
            <ThroughputChart className="h-full w-full" />
          </div>
          <div className="w-[25%]">
            <CycleTime className="h-full w-full" />
          </div>
          <div className="w-[25%]">
            <StatusMachine className="h-full w-full" />
          </div>
        </div>

        {/* BOTTOM ROW: Defect FULL WIDTH - Height: 28% (LEBIH BESAR) */}
        <div className="w-full" style={{ height: '28%' }}>
          <DefectRejectChart className="h-full w-full" />
        </div>

      </div>
    </main>
  ), []);

  // Analysis Content - Trend Analysis + History
  const AnalysisContent = useMemo(() => (
    <main className="flex-1 p-1 overflow-hidden" style={{ height: 'calc(100vh - 40px)' }}>
      <div className="h-full flex flex-col gap-1">

        {/* Trend Analysis - 60% height */}
        <div className="w-full" style={{ height: '60%' }}>
          <TrendAnalysis className="h-full w-full" />
        </div>

        {/* History Chart - 38% height */}
        <div className="w-full" style={{ height: '38%' }}>
          <HistoryChart className="h-full w-full" />
        </div>

      </div>
    </main>
  ), []);

  if (!mounted) {
    return (
      <div className="h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gray-50 flex flex-col overflow-hidden">
      <Header onManagementClick={handleManagementSystem} />

      <DowntimeAlert
        alerts={downtimeAlerts}
        onDismiss={dismissDowntimeAlert}
        onAcknowledge={acknowledgeDowntimeAlert}
      />

      {/* Container for Dashboard/Analysis with smooth transition */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        {/* ✨ Dashboard Content */}
        <div className={`flex-1 flex flex-col transition-opacity duration-500 ${showAnalysis ? 'hidden' : 'flex'}`}>
          {!showAnalysis && DashboardContent}
        </div>

        {/* ✨ Analysis Content (Trend Analysis + History) */}
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