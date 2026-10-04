'use client';

import React, { useState } from 'react';
import ScannerComponent from '@/components/ScannerComponent';
import { playSuccessSound, playErrorSound } from '@/lib/audio';
import { ScanResponse } from '@/lib/types';
import {
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';

export default function VerificationPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [manualTicketInput, setManualTicketInput] = useState('');

  const handleScan = async (decodedText: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const res = await fetch('/api/scan/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: decodedText,
          gate: 'Verification Desk',
          scannerId: 'V-Desk',
        }),
      });

      const data: ScanResponse = await res.json();
      setResult(data);

      if (data.result === 'valid_entered' || data.result === 'valid_not_entered') {
        playSuccessSound();
      } else {
        playErrorSound();
      }
    } catch (err) {
      console.error('Verification error:', err);
      playErrorSound();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualTicketInput.trim()) {
      handleScan(manualTicketInput.trim());
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-4 sm:p-6">
      {/* Top Header */}
      <header className="w-full max-w-md flex items-center justify-between mb-4 bg-white/5 border border-amber-500/20 backdrop-blur-md rounded-2xl px-3 py-2.5">
        <Link
          href="/"
          className="p-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 hover:text-white transition flex items-center gap-1.5 text-xs font-bold"
          title="Back to Home / Portal"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Portal
        </Link>
        <div className="text-right">
          <h1 className="text-sm font-black text-amber-400 uppercase tracking-wider">
            Verification Scanner
          </h1>
          <p className="text-[10px] text-slate-400 font-semibold">Read-Only Mode</p>
        </div>
      </header>

      {/* Safety Notice */}
      <div className="w-full max-w-md mb-4 bg-blue-950/40 border border-blue-500/30 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-blue-200">
        <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0" />
        <span>
          <strong>Safe Read-Only Mode:</strong> Scans performed here check status but{' '}
          <strong>do NOT redeem tickets</strong>.
        </span>
      </div>

      {/* Result Display Card */}
      {result && (
        <div className="w-full max-w-md mb-4 animate-in fade-in zoom-in-95 duration-150">
          <div
            className={`rounded-3xl p-5 border shadow-2xl space-y-4 ${
              result.result === 'valid_entered'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-100'
                : result.result === 'valid_not_entered'
                ? 'bg-sky-950/80 border-sky-500/40 text-sky-100'
                : result.result === 'revoked'
                ? 'bg-amber-950/80 border-amber-500/40 text-amber-100'
                : 'bg-rose-950/80 border-rose-500/40 text-rose-100'
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider">
                Inspection Result
              </span>
              <button
                onClick={() => setResult(null)}
                className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg text-white font-semibold transition"
              >
                Clear
              </button>
            </div>

            <div className="flex items-center gap-3">
              {result.result === 'valid_entered' && (
                <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
              )}
              {result.result === 'valid_not_entered' && (
                <Clock className="w-8 h-8 text-sky-400 shrink-0" />
              )}
              {result.result === 'revoked' && (
                <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
              )}
              {result.result === 'invalid' && (
                <XCircle className="w-8 h-8 text-rose-400 shrink-0" />
              )}
              <div>
                <h3 className="text-xl font-black tracking-wide">{result.message}</h3>
                <p className="text-xs opacity-80 font-mono">
                  {result.attendee?.ticket_id || result.ticket_id}
                </p>
              </div>
            </div>

            {result.attendee && (
              <div className="bg-black/40 rounded-2xl p-4 space-y-2 text-sm border border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs uppercase font-semibold">
                    Attendee
                  </span>
                  <span className="font-bold text-white text-base">
                    {result.attendee.name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs uppercase font-semibold">
                    Enrollment
                  </span>
                  <span className="font-mono text-amber-300 font-bold">
                    {result.attendee.enrollment}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs uppercase font-semibold">
                    Status
                  </span>
                  <span className="font-bold uppercase tracking-wider text-xs px-2 py-0.5 rounded-full bg-white/10 text-white">
                    {result.attendee.status}
                  </span>
                </div>
                {result.attendee.entry_time && (
                  <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <span className="text-slate-400 text-xs uppercase font-semibold">
                      Admitted At
                    </span>
                    <span className="text-xs text-slate-200">
                      {new Date(result.attendee.entry_time).toLocaleTimeString()} (
                      {result.attendee.entry_gate || 'Gate 1'})
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera Scanner */}
      <div className="w-full max-w-md my-auto flex flex-col items-center">
        <ScannerComponent onScan={handleScan} isProcessing={isProcessing} />
      </div>

      {/* Manual Ticket Input */}
      <div className="w-full max-w-md mt-4">
        <form onSubmit={handleManualSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Or type Ticket ID (e.g. NUV-KHL-...)"
            value={manualTicketInput}
            onChange={(e) => setManualTicketInput(e.target.value)}
            className="flex-1 bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm transition flex items-center gap-1.5"
          >
            <Search className="w-4 h-4" /> Verify
          </button>
        </form>
      </div>
    </div>
  );
}
