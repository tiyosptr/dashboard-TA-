'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Factory, Package, Barcode, Database, Home, ChevronRight, LogOut, Layers } from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const menuItems = [
        {
            label: 'Line Manager',
            href: '/admin/line',
            icon: Factory,
            description: 'Manage production lines'
        },
        {
            label: 'Process Manager',
            href: '/admin/process',
            icon: Layers,
            description: 'Manage master processes'
        },
        {
            label: 'PN Manager',
            href: '/admin/pn',
            icon: Package,
            description: 'Generate & manage Part Numbers'
        },
        {
            label: 'SN Manager',
            href: '/admin/sn',
            icon: Barcode,
            description: 'Manage Serial Numbers'
        },
        {
            label: 'Data Items Manager',
            href: '/admin/data-items',
            icon: Database,
            description: 'Configure system data points'
        },
    ];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* ── Sidebar ── */}
            <aside className="w-[280px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0 shadow-lg shadow-slate-200/50 z-20">
                {/* Branding */}
                <div className="h-16 flex items-center px-6 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
                            <Database size={16} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white tracking-wide">
                                Admin Panel
                            </h2>
                            <p className="text-[10px] text-indigo-300/70 font-medium -mt-0.5">
                                System Management
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
                    {menuItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`group flex items-center gap-3 w-full px-3 py-3 rounded-2xl transition-all duration-200 ${isActive
                                    ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/5 text-indigo-700'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                    }`}
                            >
                                <div
                                    className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${isActive
                                        ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                                        : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'
                                        }`}
                                >
                                    <Icon size={18} />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className={`text-sm font-bold ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>
                                        {item.label}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium">
                                        {item.description}
                                    </div>
                                </div>
                                {isActive && <ChevronRight size={14} className="text-indigo-400" />}
                            </Link>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100">
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                    >
                        <Home size={14} />
                        Back to Dashboard
                    </button>
                </div>
            </aside>

            {/* ── Main content area ── */}
            <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto relative">
                {/* Glow effect for background */}
                <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent pointer-events-none" />
                <div className="relative z-10 w-full min-h-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
