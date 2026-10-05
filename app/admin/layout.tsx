'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Activity,
  Users,
  UploadCloud,
  QrCode,
  FileText,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/template', label: 'Template Studio', icon: Sparkles },
    { href: '/admin/qr', label: 'QR Tickets', icon: QrCode },
    { href: '/admin/attendees', label: 'Attendees & Manual Entry', icon: Users },
    { href: '/admin/event', label: 'Live Monitor', icon: Activity },
    { href: '/admin/import', label: 'CSV Import', icon: UploadCloud },
    { href: '/admin/logs', label: 'Audit Logs', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#0e020a] text-slate-100 flex flex-col">
      {/* Top Admin Bar */}
      <header className="border-b border-amber-500/20 bg-[#170311]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition border border-white/10"
              title="Return to Main Portal"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Portal
            </Link>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-xs">
                K
              </div>
              <span className="font-black text-amber-400 tracking-wider text-base sm:text-lg">
                NUV KHELAIYA ADMIN
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/scan"
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs hover:bg-amber-500/30 transition flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" /> Open Scanner
            </Link>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 sm:space-x-2 overflow-x-auto py-2 border-t border-white/5 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-md'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
