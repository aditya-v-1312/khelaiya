'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Clock, ShieldCheck, ArrowLeft, RefreshCw, Radio } from 'lucide-react';

interface EventStats {
  total: number;
  entered: number;
  remaining: number;
  gate1: number;
  gate2: number;
  entryPercentage: number;
  recentScans: Array<{
    id: string;
    ticket_id: string;
    gate: string;
    scanner_id: string;
    result: string;
    scanned_at: string;
    attendee?: { name: string; enrollment: string } | null;
  }>;
}

export default function LiveEventMonitorPage() {
  const [stats, setStats] = useState<EventStats | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchLiveStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.error('Error fetching live event stats:', e);
    }
  };

  useEffect(() => {
    fetchLiveStats();
    // High-frequency auto-refresh every 2.5 seconds during live event
    const timer = setInterval(fetchLiveStats, 2500);
    return () => clearInterval(timer);
  }, []);

  const s = stats || {
    total: 0,
    entered: 0,
    remaining: 0,
    gate1: 0,
    gate2: 0,
    entryPercentage: 0,
    recentScans: [],
  };

  const validEntries = s.recentScans.filter((sc) => sc.result === 'valid');

  return (
    <div className="space-y-6">
      {/* High-Contrast Stage Top Bar */}
      <div className="bg-gradient-to-r from-[#2c0520] via-[#1a0214] to-[#0c0009] border border-amber-500/30 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Radio className="w-8 h-8 text-rose-500 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-amber-400 tracking-wider">
              LIVE ENTRY MONITOR
            </h1>
            <p className="text-xs text-rose-200 uppercase tracking-widest font-bold">
              Real-Time Gate Telemetry · NUV Khelaiya 2026
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-slate-300">
            Last Sync: <span className="text-emerald-400 font-bold">{lastRefreshed || 'Syncing...'}</span>
          </div>
          <button
            onClick={fetchLiveStats}
            className="p-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold transition"
            title="Refresh now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* GIANT HIGH-CONTRAST METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total */}
        <div className="bg-slate-900 border-2 border-white/10 rounded-3xl p-6 text-center shadow-xl">
          <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400 block mb-1">
            Total Capacity
          </span>
          <p className="text-5xl font-black font-mono text-white">
            {s.total.toLocaleString()}
          </p>
        </div>

        {/* Entered */}
        <div className="bg-emerald-950/80 border-2 border-emerald-500/50 rounded-3xl p-6 text-center shadow-xl">
          <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-300 block mb-1">
            Admitted (Entered)
          </span>
          <p className="text-5xl font-black font-mono text-emerald-400">
            {s.entered.toLocaleString()}
          </p>
        </div>

        {/* Remaining */}
        <div className="bg-amber-950/40 border-2 border-amber-500/50 rounded-3xl p-6 text-center shadow-xl">
          <span className="text-xs uppercase font-extrabold tracking-widest text-amber-300 block mb-1">
            Remaining Outside
          </span>
          <p className="text-5xl font-black font-mono text-amber-300">
            {s.remaining.toLocaleString()}
          </p>
        </div>

        {/* Gate 1 */}
        <div className="bg-slate-900 border-2 border-amber-500/30 rounded-3xl p-6 text-center shadow-xl">
          <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400 block mb-1">
            Gate 1
          </span>
          <p className="text-5xl font-black font-mono text-amber-300">
            {s.gate1.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Scanners G1-A & G1-B</span>
        </div>

        {/* Gate 2 */}
        <div className="bg-slate-900 border-2 border-teal-500/30 rounded-3xl p-6 text-center shadow-xl">
          <span className="text-xs uppercase font-extrabold tracking-widest text-teal-400 block mb-1">
            Gate 2
          </span>
          <p className="text-5xl font-black font-mono text-teal-300">
            {s.gate2.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Scanners G2-A & G2-B</span>
        </div>
      </div>

      {/* RECENT ENTRIES STREAM (SECTION 30 SPEC) */}
      <div className="bg-slate-900/90 border border-amber-500/20 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Live Admitted Stream (Recent Entries)
          </h2>
          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full">
            Realtime Auto-Updating
          </span>
        </div>

        <div className="space-y-2">
          {validEntries.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-medium">
              Awaiting entry scans from Gate 1 or Gate 2...
            </div>
          ) : (
            validEntries.slice(0, 15).map((entry, idx) => (
              <div
                key={entry.id || idx}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-white/5 hover:border-emerald-500/30 transition text-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-300 text-xs font-mono">
                    {idx + 1}
                  </div>
                  <div>
                    <span className="font-black text-white text-base block">
                      {entry.attendee?.name || 'Registered Attendee'}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Enrollment: {entry.attendee?.enrollment || 'N/A'} · Ticket: {entry.ticket_id}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {entry.gate} ({entry.scanner_id})
                  </span>
                  <span className="font-mono text-emerald-300 font-bold text-sm">
                    {new Date(entry.scanned_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
