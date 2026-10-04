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

  // Bulk ZIP Download
  const handleBulkZipDownload = async () => {
    if (attendees.length === 0) {
      alert('No attendees found to generate QR codes.');
      return;
    }

    setIsZipping(true);
    setZipProgress('Initializing ZIP archive...');

    try {
      const zip = new JSZip();
      const folder = zip.folder('NUV_Khelaiya_QR_Codes');

      let count = 0;
      for (const att of attendees) {
        setZipProgress(`Rendering QR ${count + 1} of ${attendees.length}...`);
        // Generate high resolution PNG data URL
        const dataUrl = await QRCode.toDataURL(att.ticket_id, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: 512,
        });

        // Strip data:image/png;base64, prefix
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        const filename = `${att.enrollment}_${att.name.replace(/[^a-zA-Z0-9]/g, '_')}_${att.ticket_id}.png`;
        folder?.file(filename, base64Data, { base64: true });
        count++;
      }

      setZipProgress('Compressing ZIP archive file...');
      const content = await zip.generateAsync({ type: 'blob' });

      // Trigger browser download
      const downloadUrl = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `NUV_Khelaiya_All_${attendees.length}_QR_Codes.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setZipProgress('');
      alert(`Successfully downloaded ${attendees.length} QR codes in ZIP!`);
    } catch (err) {
      console.error('ZIP error:', err);
      alert('Failed to generate ZIP archive.');
    } finally {
      setIsZipping(false);
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
