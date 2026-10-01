'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  QrCode,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
  Database,
} from 'lucide-react';

interface StatsData {
  total: number;
  entered: number;
  remaining: number;
  revoked: number;
  gate1: number;
  gate2: number;
  duplicates: number;
  invalids: number;
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

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Poll every 5 seconds for live dashboard updates
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSeed = async (count: number) => {
    if (!confirm(`Generate ${count} test attendees for development / load testing?`)) return;
    setSeeding(true);
    try {
      const res = await fetch(`/api/admin/seed?count=${count}`, { method: 'POST' });
      const data = await res.json();
      alert(data.message || 'Seeding complete');
      fetchStats();
    } catch (err) {
      alert('Error seeding data');
    } finally {
      setSeeding(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-semibold">Loading Dashboard...</p>
      </div>
    );
  }

  const s = stats || {
    total: 0,
    entered: 0,
    remaining: 0,
    revoked: 0,
    gate1: 0,
    gate2: 0,
    duplicates: 0,
    invalids: 0,
    entryPercentage: 0,
    recentScans: [],
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-amber-400 tracking-wide">
            Event Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time entry monitoring & festival attendance control
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSeed(1500)}
            disabled={seeding}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 transition flex items-center gap-1.5"
            title="Seed 1,500 fake attendees for testing"
          >
            <Database className="w-3.5 h-3.5 text-amber-400" />
            {seeding ? 'Seeding 1.5k...' : 'Seed 1,500 Test Attendees'}
          </button>

          <button
            onClick={fetchStats}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition"
            title="Refresh metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 1. TOP STAT CARDS (Section 16) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Registered */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Registered</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-white">
            {s.total.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-500 mt-1 block">Confirmed attendees</span>
        </div>

        {/* QR Generated */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>QR Generated</span>
            <QrCode className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-indigo-300">
            {s.total.toLocaleString()}
          </p>
          <span className="text-[10px] text-indigo-400/80 mt-1 block">100% Ready</span>
        </div>

        {/* Entered */}
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Entered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
            {s.entered.toLocaleString()}
          </p>
          <span className="text-[10px] text-emerald-400/80 mt-1 block">
            {s.entryPercentage}% Admitted
          </span>
        </div>

        {/* Remaining */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Remaining</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-amber-300">
            {s.remaining.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-500 mt-1 block">Awaiting entry</span>
        </div>

        {/* Duplicate Attempts */}
        <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-rose-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Duplicates</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-rose-400">
            {s.duplicates.toLocaleString()}
          </p>
          <span className="text-[10px] text-rose-400/80 mt-1 block">Blocked retries</span>
        </div>

        {/* Invalid Attempts */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Invalid QRs</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-rose-300">
            {s.invalids.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-500 mt-1 block">Unregistered codes</span>
        </div>
      </div>

      {/* 2. PROGRESS BAR & GATE BREAKDOWN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Entry Progress */}
        <div className="md:col-span-2 bg-slate-900/60 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">Overall Entry Progress</h3>
            <span className="font-mono font-black text-amber-400 text-lg">
              {s.entryPercentage}%
            </span>
          </div>

          <div className="w-full bg-slate-950 h-5 rounded-full overflow-hidden p-1 border border-white/10 flex">
            <div
              className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, s.entryPercentage)}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="bg-black/30 rounded-xl p-3 border border-white/5">
              <span className="text-slate-400 block mb-0.5">Checked In</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {s.entered} / {s.total}
              </span>
            </div>
            <div className="bg-black/30 rounded-xl p-3 border border-white/5">
              <span className="text-slate-400 block mb-0.5">Pending Check-in</span>
              <span className="font-mono font-bold text-amber-300 text-sm">{s.remaining}</span>
            </div>
            <div className="bg-black/30 rounded-xl p-3 border border-white/5 col-span-2 sm:col-span-1">
              <span className="text-slate-400 block mb-0.5">Revoked Passes</span>
              <span className="font-mono font-bold text-rose-400 text-sm">{s.revoked}</span>
            </div>
          </div>
        </div>

        {/* Gate Distribution */}
        <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-white text-base">Entry by Gate</h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-200">Gate 1</span>
                <span className="font-mono text-white font-bold">{s.gate1}</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-white/5">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all"
                  style={{
                    width: `${s.entered > 0 ? (s.gate1 / s.entered) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-teal-200">Gate 2</span>
                <span className="font-mono text-white font-bold">{s.gate2}</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-white/5">
                <div
                  className="bg-teal-400 h-full rounded-full transition-all"
                  style={{
                    width: `${s.entered > 0 ? (s.gate2 / s.entered) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
            <span>4 Scanners Active</span>
            <Link
              href="/admin/event"
              className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
            >
              Live Monitor <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. RECENT SCANS STREAM */}
      <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Live Activity Feed</h3>
            <p className="text-xs text-slate-400">Latest gate scan verifications</p>
          </div>
          <Link
            href="/admin/logs"
            className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
          >
            View Full Audit Log <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Gate · Scanner</th>
                <th className="py-2.5 px-3">Attendee</th>
                <th className="py-2.5 px-3">Ticket ID</th>
                <th className="py-2.5 px-3 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {s.recentScans.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                    No scans recorded yet. Start scanning at Gate 1 or Gate 2!
                  </td>
                </tr>
              ) : (
                s.recentScans.slice(0, 8).map((scan) => (
                  <tr key={scan.id} className="hover:bg-white/5 transition">
                    <td className="py-2.5 px-3 text-slate-300">
                      {new Date(scan.scanned_at).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 text-white font-sans font-semibold">
                      {scan.gate} · <span className="font-mono text-amber-300">{scan.scanner_id}</span>
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      {scan.attendee?.name ? (
                        <div>
                          <p className="font-bold text-white leading-tight">
                            {scan.attendee.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {scan.attendee.enrollment}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Unregistered</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-amber-200/90">{scan.ticket_id}</td>
                    <td className="py-2.5 px-3 text-right font-sans">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          scan.result === 'valid'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : scan.result === 'already_entered'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : scan.result === 'revoked'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-950 text-rose-400 border border-rose-700/50'
                        }`}
                      >
                        {scan.result.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
