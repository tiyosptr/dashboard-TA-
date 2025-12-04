'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Header from '@/components/header';
import { DowntimeAlert as DowntimeAlertType } from '@/types';

// Skeleton component for loading states
const ChartSkeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-white rounded-lg shadow-sm p-3 sm:p-4 animate-pulse ${className}`}>
    <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="h-32 bg-gray-100 rounded"></div>
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
  const [showTrendAnalysis, setShowTrendAnalysis] = useState(false);
  const [downtimeAlerts, setDowntimeAlerts] = useState<DowntimeAlertType[]>([]);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-rotate between Dashboard and TrendAnalysis every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setShowTrendAnalysis(prev => !prev);
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
    <main className="flex-1 p-2 sm:p-3 lg:p-4 overflow-auto">
      <div className="min-h-full flex flex-col gap-2 sm:gap-3 lg:gap-4">

        {/* 📊 ROW 1: Actual Output - Full Width */}
        <div className="w-full" style={{ minHeight: 'clamp(180px, 25vh, 280px)' }}>
          <ActualOutput className="h-full" />
        </div>

        {/* 📈 ROW 2: Main Dashboard Grid - 4 Column Layout */}
        {/* 
          Layout sesuai wireframe:
          - Kolom 1: OEE (atas) + Cycle Time (bawah)
          - Kolom 2: Throughput Rate (atas) + Status Machine (bawah)
          - Kolom 3: Defect by Process (span 2 rows)
          - Kolom 4: History (span 2 rows)
        */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4" style={{ minHeight: 'clamp(400px, 60vh, 800px)' }}>

          {/* Left Side: 2x2 Grid for small cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">

            {/* OEE - Top Left */}
            <div style={{ minHeight: 'clamp(150px, 28vh, 350px)' }}>
              <OEEChart className="h-full w-full" />
            </div>

            {/* Throughput Rate - Top Right */}
            <div style={{ minHeight: 'clamp(150px, 28vh, 350px)' }}>
              <ThroughputChart className="h-full w-full" />
            </div>

            {/* Cycle Time - Bottom Left */}
            <div style={{ minHeight: 'clamp(150px, 28vh, 350px)' }}>
              <CycleTime className="h-full w-full" />
            </div>

            {/* Status Machine - Bottom Right */}
            <div style={{ minHeight: 'clamp(150px, 28vh, 350px)' }}>
              <StatusMachine className="h-full w-full" />
            </div>
          </div>

          {/* Defect by Process - Tall Card */}
          <div style={{ minHeight: 'clamp(300px, 58vh, 700px)' }}>
            <DefectRejectChart className="h-full w-full" />
          </div>

          {/* History - Tall Card */}
          <div style={{ minHeight: 'clamp(300px, 58vh, 700px)' }}>
            <HistoryChart className="h-full w-full" />
          </div>

        </div>

      </div>
    </main>
  ), []);

  // Trend Analysis Content - useMemo must be before conditional return
  const TrendAnalysisContent = useMemo(() => (
    <main className="flex-1 p-2 sm:p-3 lg:p-4 overflow-auto">
      <div className="min-h-full">
        <TrendAnalysis className="h-full w-full" />
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
    <div className="min-h-screen w-full bg-gray-50 flex flex-col">
      <Header onManagementClick={handleManagementSystem} />

      <DowntimeAlert
        alerts={downtimeAlerts}
        onDismiss={dismissDowntimeAlert}
        onAcknowledge={acknowledgeDowntimeAlert}
      />

      {/* Container for Dashboard/Trend Analysis with smooth transition */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        {/* ✨ Dashboard Content */}
        <div className={`flex-1 flex flex-col transition-opacity duration-500 ${showTrendAnalysis ? 'hidden' : 'flex'}`}>
          {!showTrendAnalysis && DashboardContent}
        </div>

        {/* ✨ Trend Analysis Content */}
        <div className={`flex-1 flex flex-col transition-opacity duration-500 ${showTrendAnalysis ? 'flex' : 'hidden'}`}>
          {showTrendAnalysis && TrendAnalysisContent}
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