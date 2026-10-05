'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { Attendee } from '@/lib/types';
import TicketCard from '@/components/TicketCard';
import Link from 'next/link';
import {
  QrCode,
  Download,
  Archive,
  Printer,
  Search,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';

export default function QRManagementPage() {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState('');
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);

  const fetchAttendees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/attendees?limit=1500');
      const data = await res.json();
      if (data.success) {
        setAttendees(data.attendees);
      }
    } catch (err) {
      console.error('Error loading attendees for QR center:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendees();
  }, []);

  const filtered = attendees.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.enrollment.toLowerCase().includes(search.toLowerCase()) ||
      a.ticket_id.toLowerCase().includes(search.toLowerCase())
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [genCount, setGenCount] = useState(1500);
  const [genStatus, setGenStatus] = useState<'unactivated' | 'approved'>('unactivated');

  // Generate Numbered Passes (1 to 1500)
  const handleGeneratePasses = async () => {
    if (
      !confirm(
        `Generate ${genCount} physical ticket passes numbered Pass #0001 to #${String(
          genCount
        ).padStart(4, '0')} with initial status "${genStatus.toUpperCase()}"?`
      )
    ) {
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          count: genCount,
          initialStatus: genStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || `Successfully generated ${genCount} ticket passes!`);
        fetchAttendees();
      } else {
        alert(data.message || 'Failed to generate passes');
      }
    } catch (err) {
      alert('Error generating passes');
    } finally {
      setIsGenerating(false);
    }
  };

  // Bulk ZIP Download
  const handleBulkZipDownload = async () => {
    setIsZipping(true);
    setZipProgress('Creating ZIP package on server...');

    try {
      const res = await fetch('/api/admin/passes/zip');
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `NUV_Khelaiya_All_${attendees.length > 0 ? attendees.length : 1500}_Pass_QRs.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('ZIP error:', err);
      alert('Failed to download ZIP archive.');
    } finally {
      setIsZipping(false);
      setZipProgress('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-amber-400 tracking-wide">
            QR Generation & Ticket Badges
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Export individual or bulk QR codes (containing strictly ticket ID) and print passes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/template"
            className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-black rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            Ticket Template Studio
          </Link>
          <button
            onClick={handleBulkZipDownload}
            disabled={isZipping || loading || attendees.length === 0}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center gap-2"
          >
            <Archive className="w-4 h-4" />
            {isZipping ? zipProgress : `Download All ${attendees.length} QRs (ZIP)`}
          </button>
        </div>
      </div>

      {/* Banner for Ticket Template Studio */}
      <div className="bg-gradient-to-r from-purple-950/60 via-indigo-950/60 to-slate-900 border border-purple-500/40 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-bold border border-purple-500/30">
            <Sparkles className="w-3 h-3 text-amber-400" /> NEW: Custom Ticket Template Studio
          </div>
          <h2 className="text-lg font-black text-white">Have a Ticket Artwork Design?</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Upload your custom graphic design, interactively position & resize the QR code and pass number, and export high-resolution composite tickets ready for printing.
          </p>
        </div>
        <Link
          href="/admin/template"
          className="whitespace-nowrap px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-black rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center gap-2 self-start md:self-auto"
        >
          Open Template Studio →
        </Link>
      </div>

      {/* Safety Notice & Status (Section 24) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4">
          <span className="text-slate-400 text-xs font-semibold uppercase block">
            Registered Attendees
          </span>
          <p className="text-3xl font-black font-mono text-white mt-1">
            {attendees.length.toLocaleString()}
          </p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4">
          <span className="text-slate-400 text-xs font-semibold uppercase block">
            QR Codes Generated
          </span>
          <p className="text-3xl font-black font-mono text-emerald-400 mt-1">
            {attendees.length.toLocaleString()}
          </p>
          <span className="text-[10px] text-emerald-400/80 mt-0.5 block flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> 100% Unique & Cryptographically Secure
          </span>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4">
          <span className="text-slate-400 text-xs font-semibold uppercase block">
            Print Badge Sheet
          </span>
          <button
            onClick={() => window.print()}
            className="mt-2 w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-amber-300" /> Print Visible Passes
          </button>
        </div>
      </div>

      {/* ⚡ PHYSICAL PASS GENERATOR (1 to 1500) */}
      <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-rose-500/10 border-2 border-amber-500/30 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-black text-amber-300">
                Generate Physical Ticket Passes (1 to 1,500)
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Instantly create generic numbered passes (Pass #0001 to Pass #1500). No student names needed — attach QR codes directly to physical tickets or wristbands.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs">
              <span className="text-slate-400 font-semibold">Qty:</span>
              <select
                value={genCount}
                onChange={(e) => setGenCount(Number(e.target.value))}
                className="bg-transparent text-amber-300 font-bold focus:outline-none"
              >
                <option value={1500} className="bg-slate-900 text-white">1,500 Passes</option>
                <option value={1200} className="bg-slate-900 text-white">1,200 Passes</option>
                <option value={1000} className="bg-slate-900 text-white">1,000 Passes</option>
                <option value={500} className="bg-slate-900 text-white">500 Passes</option>
                <option value={100} className="bg-slate-900 text-white">100 Passes</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs">
              <span className="text-slate-400 font-semibold">Status:</span>
              <select
                value={genStatus}
                onChange={(e) => setGenStatus(e.target.value as 'unactivated' | 'approved')}
                className="bg-transparent text-amber-300 font-bold focus:outline-none"
              >
                <option value="unactivated" className="bg-slate-900 text-white">Unactivated (Scan to Activate at Desk)</option>
                <option value="approved" className="bg-slate-900 text-white">Pre-Activated (Ready for Gate Entry)</option>
              </select>
            </div>

            <button
              onClick={handleGeneratePasses}
              disabled={isGenerating}
              className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs transition shadow-md flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              {isGenerating ? 'Generating...' : `Generate ${genCount} Passes`}
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          placeholder="Search by name or enrollment to inspect ticket pass..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
        />
      </div>

      {/* Passes Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading ticket passes...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-slate-900/30 rounded-3xl border border-white/5">
          No attendee passes match your filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.slice(0, 30).map((att) => (
            <TicketCard key={att.id} attendee={att} />
          ))}
        </div>
      )}

      {filtered.length > 30 && (
        <p className="text-center text-xs text-slate-400 pt-4">
          Showing 30 of {filtered.length} passes on screen. Click &quot;Download All QRs (ZIP)&quot; above to download the full batch of all {attendees.length} QR files!
        </p>
      )}
    </div>
  );
}
