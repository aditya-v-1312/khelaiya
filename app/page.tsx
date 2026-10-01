'use client';

import React from 'react';
import Link from 'next/link';
import {
  QrCode,
  Search,
  Shield,
  Activity,
  Users,
  UploadCloud,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default function HomePage() {
  const portalCards = [
    {
      title: 'Entry Gate Scanner',
      desc: 'Mobile-first QR scanner for Gate 1 & Gate 2 volunteers. Atomic 1-time ticket redemption.',
      href: '/scan',
      badge: 'Main Gate Duty',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      icon: QrCode,
      cta: 'Launch Scanner',
      ctaStyle:
        'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-black',
    },
    {
      title: 'Verification Inspector',
      desc: 'Read-only pass checker for security officers & helpdesk. Checks validity without altering entry status.',
      href: '/verify',
      badge: 'Read-Only Mode',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      icon: Search,
      cta: 'Open Verification',
      ctaStyle:
        'bg-white/10 hover:bg-white/20 text-white font-bold border border-white/20',
    },
    {
      title: 'Live Event Monitor',
      desc: 'High-contrast real-time projection monitor displaying current attendee capacity and entries per gate.',
      href: '/admin/event',
      badge: 'Stage / Live Feeds',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      icon: Activity,
      cta: 'View Live Stream',
      ctaStyle:
        'bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-600 hover:to-amber-700 text-white font-bold',
    },
    {
      title: 'Admin Management',
      desc: 'Organizer control room for KPIs, CSV imports, QR bulk exports, and manual entry fallback.',
      href: '/admin',
      badge: 'Organizers Only',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      icon: Shield,
      cta: 'Open Admin Room',
      ctaStyle:
        'bg-amber-400 hover:bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-400/20',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0d010a] text-white flex flex-col justify-between selection:bg-amber-500 selection:text-black">
      {/* Subtle Background Glows */}
      <div className="fixed top-0 left-1/4 -translate-x-1/2 w-96 h-96 bg-[#5f1040]/30 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 translate-x-1/2 w-96 h-96 bg-[#febf4a]/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full relative z-10">
        {/* Festival Branding Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-4 h-4" /> Navrachana University Cultural
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 tracking-tight">
            NUV KHELAIYA
          </h1>

          <p className="text-base sm:text-lg text-slate-300 font-medium">
            Official QR Pass Generation & Atomic Entry Verification System
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 1,500 Capacity
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 2 Entry Gates
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 4 Scanner Phones
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Zero Duplicate Entry
            </span>
          </div>
        </div>

        {/* Portal Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {portalCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="bg-slate-900/60 border border-white/10 hover:border-amber-500/40 rounded-3xl p-6 sm:p-8 backdrop-blur-md flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/5 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${card.badgeColor}`}
                    >
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                    {card.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {card.desc}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-white/5">
                  <Link
                    href={card.href}
                    className={`w-full py-3.5 px-6 rounded-2xl transition flex items-center justify-center gap-2 text-sm ${card.ctaStyle}`}
                  >
                    <span>{card.cta}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Links Section */}
        <div className="mt-12 bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span>
              Secure Cryptographic QR Tickets · Opaque ID only (no personal data stored in QR code)
            </span>
          </div>

          <div className="flex items-center gap-4 font-semibold text-slate-300">
            <Link href="/admin/attendees" className="hover:text-amber-300 transition">
              Attendee Search
            </Link>
            <Link href="/admin/import" className="hover:text-amber-300 transition">
              CSV Import
            </Link>
            <Link href="/admin/qr" className="hover:text-amber-300 transition">
              QR ZIP Export
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 py-6 text-center text-xs text-slate-500">
        <p>Navrachana University · Khelaiya Garba Mahotsav 2026 Entry Control System</p>
      </footer>
    </div>
  );
}
