'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Wrench,
  Calendar,
  Bell,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  LayoutDashboard
} from 'lucide-react';
import WorkOrderList from './components/work-orders/work-order-list';
import MachineList from './components/machines/machine-list';
import MaintenanceHistory from './components/maintenance/maintenance-history';
import MaintenanceSchedule from './components/maintenance/maintenance-schedule';
import NotificationPanel from './components/notifications/notification-panel';
import MachineDashboardOverview from './components/machines/machine-dashboard-overview';
// Tambahkan 'machine-dashboard' di type
import { TabType } from '@/types';

export default function ManagementSystemPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'overview';
  const woId = searchParams.get('woId');
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Tambahkan tab Machine Dashboard
  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: <Activity size={18} /> },
    // { id: 'machine-dashboard' as TabType, label: 'Machine Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'work-orders' as TabType, label: 'Work Orders', icon: <FileText size={18} /> },
    { id: 'machines' as TabType, label: 'Machine Management', icon: <Wrench size={18} /> },
    { id: 'history' as TabType, label: 'History', icon: <Clock size={18} /> },
    { id: 'schedule' as TabType, label: 'Schedule Maintenance', icon: <Calendar size={18} /> },
    { id: 'notifications' as TabType, label: 'Notifications', icon: <Bell size={18} /> },
  ];

  const stats = [
    { label: 'Active Work Orders', value: '12', icon: <FileText className="text-blue-600" />, color: 'bg-blue-50' },
    { label: 'Pending Tasks', value: '8', icon: <Clock className="text-yellow-600" />, color: 'bg-yellow-50' },
    { label: 'Completed Today', value: '5', icon: <CheckCircle className="text-green-600" />, color: 'bg-green-50' },
    { label: 'Critical Alerts', value: '3', icon: <AlertCircle className="text-red-600" />, color: 'bg-red-50' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-sm"
              >
                <ArrowLeft size={16} />
                <span className="font-medium">Dashboard</span>
              </button>

              <div className="h-8 w-px bg-gray-300"></div>

              <div>
                <h1 className="text-lg font-bold text-gray-900">Management Maintenance System</h1>
                <p className="text-xs text-gray-500">PT Volex Indonesia</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell size={18} />
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              </button>
              <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-lg">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                  A
                </div>
                <span className="font-medium text-gray-700 text-sm">Admin</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-[52px] z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-0.5 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {stats.map((stat, index) => (
                <div key={index} className={`${stat.color} rounded-lg p-3 border border-gray-200`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-white rounded-md shadow-sm">
                      {stat.icon}
                    </div>
                    <TrendingUp className="text-green-600" size={16} />
                  </div>
                  <div className="text-xl font-bold text-gray-900 mb-0.5">{stat.value}</div>
                  <div className="text-xs text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Tambahkan button untuk Machine Dashboard */}
                {/* <button
                  onClick={() => setActiveTab('machine-dashboard')}
                  className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                >
                  <div className="p-3 bg-indigo-100 rounded-lg group-hover:bg-indigo-200">
                    <LayoutDashboard className="text-indigo-600" size={24} />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">Machine Dashboard</div>
                    <div className="text-sm text-gray-500">View all machines</div>
                  </div>
                </button> */}

                <button
                  onClick={() => setActiveTab('work-orders')}
                  className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <div className="p-2 bg-blue-100 rounded-md group-hover:bg-blue-200">
                    <FileText className="text-blue-600" size={18} />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900 text-sm">Create Work Order</div>
                    <div className="text-xs text-gray-500">New maintenance task</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('schedule')}
                  className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
                >
                  <div className="p-2 bg-green-100 rounded-md group-hover:bg-green-200">
                    <Calendar className="text-green-600" size={18} />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900 text-sm">Schedule PM</div>
                    <div className="text-xs text-gray-500">Preventive maintenance</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('machines')}
                  className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
                >
                  <div className="p-2 bg-purple-100 rounded-md group-hover:bg-purple-200">
                    <Wrench className="text-purple-600" size={18} />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900 text-sm">View Machines</div>
                    <div className="text-xs text-gray-500">Machine details</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Work Orders</h3>
                <div className="space-y-3">
                  {[
                    { id: 'WO-001235', machine: 'Extruder #5', priority: 'High', status: 'In-Progress' },
                    { id: 'WO-001234', machine: 'Molding #3', priority: 'Medium', status: 'Pending' },
                    { id: 'WO-001233', machine: 'Conveyor #2', priority: 'Low', status: 'Completed' },
                  ].map((wo) => (
                    <div key={wo.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors cursor-pointer">
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{wo.id}</div>
                        <div className="text-xs text-gray-600">{wo.machine}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${wo.priority === 'High' ? 'bg-red-100 text-red-700' :
                          wo.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                          {wo.priority}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${wo.status === 'In-Progress' ? 'bg-blue-100 text-blue-700' :
                          wo.status === 'Pending' ? 'bg-gray-100 text-gray-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                          {wo.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Critical Alerts</h3>
                <div className="space-y-2">
                  {[
                    { machine: 'Extruder #5', issue: 'Temperature high (95°C)', time: '5 mins ago', severity: 'critical' },
                    { machine: 'Molding #2', issue: 'Cycle time increased 25%', time: '15 mins ago', severity: 'warning' },
                    { machine: 'Conveyor #1', issue: 'Throughput drop 15%', time: '1 hour ago', severity: 'info' },
                  ].map((alert, index) => (
                    <div key={index} className={`flex items-start gap-2 p-2.5 rounded-md border-l-4 ${alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
                      alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                        'bg-blue-50 border-blue-500'
                      }`}>
                      <AlertCircle className={`flex-shrink-0 ${alert.severity === 'critical' ? 'text-red-600' :
                        alert.severity === 'warning' ? 'text-yellow-600' :
                          'text-blue-600'
                        }`} size={16} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm">{alert.machine}</div>
                        <div className="text-xs text-gray-600">{alert.issue}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{alert.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* {activeTab === 'machine-dashboard' && <MachineDashboardOverview />} */}
        {activeTab === 'work-orders' && <WorkOrderList defaultWoId={woId} />}
        {activeTab === 'machines' && <MachineList />}
        {activeTab === 'history' && <MaintenanceHistory />}
        {activeTab === 'schedule' && <MaintenanceSchedule />}
        {activeTab === 'notifications' && <NotificationPanel />}
      </main>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}