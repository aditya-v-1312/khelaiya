'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { QrCode, Search, Shield, Activity, Sparkles } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: '/scan', label: 'Entry Scanner', icon: QrCode },
    { href: '/verify', label: 'Verify', icon: Search },
    { href: '/admin', label: 'Admin', icon: Shield },
    { href: '/admin/event', label: 'Live Monitor', icon: Activity },
  ];

  return (
    <nav className="w-full bg-[#1b0213]/90 backdrop-blur-md border-b border-amber-500/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition">
            <Sparkles className="w-5 h-5 text-amber-200" />
          </div>
          <div>
            <span className="font-black text-amber-400 tracking-wider text-base sm:text-lg block leading-tight">
              NUV KHELAIYA
            </span>
            <span className="text-[10px] text-rose-300/80 uppercase tracking-widest font-semibold block">
              Pass Verification
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href) && link.href !== '/admin' && pathname !== '/admin');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                    : 'text-amber-100/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
