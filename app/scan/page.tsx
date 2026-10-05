'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ScannerComponent from '@/components/ScannerComponent';
import { playSuccessSound, playDuplicateSound, playErrorSound } from '@/lib/audio';
import { ScanResponse, GateId, ScannerId } from '@/lib/types';
import Link from 'next/link';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Wifi,
  WifiOff,
  Settings,
  UserCheck,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

export default function EntryScannerPage() {
  // Scanner Identity State (stored in localStorage)
  const [gate, setGate] = useState<GateId>('Gate 1');
  const [scannerId, setScannerId] = useState<ScannerId>('G1-A');
  const [dutyMode, setDutyMode] = useState<'entry' | 'distribution'>('entry');
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  // Network State
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Scan In-Flight & Result State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<ScanResponse | null>(null);
  const [scanCount, setScanCount] = useState<number>(0);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize configuration from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedGate = localStorage.getItem('khelaiya_gate') as GateId;
      const savedScanner = localStorage.getItem('khelaiya_scanner') as ScannerId;
      const savedCount = localStorage.getItem('khelaiya_scancount');

      if (savedGate && savedScanner) {
        setGate(savedGate);
        setScannerId(savedScanner);
        setIsConfigured(true);
      } else {
        setShowConfigModal(true);
      }

      if (savedCount) {
        setScanCount(parseInt(savedCount, 10));
      }

      const savedMode = localStorage.getItem('khelaiya_duty_mode') as 'entry' | 'distribution';
      if (savedMode) {
        setDutyMode(savedMode);
      }

      // Online/Offline listener
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const saveConfiguration = (g: GateId, s: ScannerId) => {
    setGate(g);
    setScannerId(s);
    setIsConfigured(true);
    setShowConfigModal(false);
    localStorage.setItem('khelaiya_gate', g);
    localStorage.setItem('khelaiya_scanner', s);
  };

  const clearResultAndResume = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    setLastResult(null);
    setNetworkError(null);
    setIsProcessing(false);
  }, []);

  const handleScan = async (decodedText: string) => {
    if (isProcessing) return;

    if (!navigator.onLine) {
      setIsOnline(false);
      setNetworkError('CONNECTION LOST. SCAN NOT CONFIRMED. Please reconnect to verify.');
      playErrorSound();
      return;
    }

    setIsProcessing(true);
    setNetworkError(null);

    // Distribution Desk Approval Mode
    if (dutyMode === 'distribution') {
      try {
        const res = await fetch('/api/admin/passes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'approve',
            ticketIdOrPassNumber: decodedText,
            scannerId,
            gate,
          }),
        });

        const data = await res.json();
        setLastResult(data);

        if (data.success) {
          playSuccessSound();
          setScanCount((prev) => {
            const next = prev + 1;
            localStorage.setItem('khelaiya_scancount', next.toString());
            return next;
          });
        } else {
          playDuplicateSound();
        }
      } catch {
        setNetworkError('Connection error during ticket pass approval.');
        playErrorSound();
      } finally {
        setIsProcessing(false);
      }

      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        clearResultAndResume();
      }, 3000);
      return;
    }

    // Standard Gate Entry Mode (1-time check)
    try {
      const res = await fetch('/api/scan/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: decodedText,
          gate,
          scannerId,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data: ScanResponse = await res.json();
      setLastResult(data);

      if (data.result === 'valid') {
        playSuccessSound();
        setScanCount((prev) => {
          const next = prev + 1;
          localStorage.setItem('khelaiya_scancount', next.toString());
          return next;
        });
      } else if (data.result === 'already_entered' || data.result === 'not_approved') {
        playDuplicateSound();
      } else {
        playErrorSound();
      }

      // Automatically reset screen after 3.2 seconds to scan next attendee
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        clearResultAndResume();
      }, 3200);
    } catch (err: unknown) {
      console.error('Scan submission error:', err);
      setNetworkError('CONNECTION ERROR — SCAN NOT CONFIRMED. Please check internet connection.');
      playErrorSound();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-between p-4 sm:p-6 select-none">
      {/* 1. TOP HEADER: Status, Identity, Network */}
      <header className="w-full max-w-md flex items-center justify-between bg-white/5 border border-amber-500/20 backdrop-blur-md rounded-2xl px-3 py-2.5 shadow-lg">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 hover:text-white transition flex items-center justify-center shrink-0"
            title="Back to Home / Portal"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-amber-400 tracking-wider text-base">
                NUV KHELAIYA
              </span>
              <button
                type="button"
                onClick={() => {
                  const nextMode = dutyMode === 'entry' ? 'distribution' : 'entry';
                  setDutyMode(nextMode);
                  localStorage.setItem('khelaiya_duty_mode', nextMode);
                }}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase transition ${
                  dutyMode === 'distribution'
                    ? 'bg-purple-500/30 text-purple-200 border border-purple-400/40'
                    : 'bg-amber-400/20 text-amber-300'
                }`}
                title="Click to toggle between Gate Entry and Desk Approval"
              >
                {dutyMode === 'distribution' ? 'Desk Approval' : 'Gate Entry'}
              </button>
            </div>
            <div className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mt-0.5">
              <span className="text-amber-200 font-bold">{gate}</span>
              <span>·</span>
              <span className="font-mono text-amber-300 font-bold">{scannerId}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection Indicator */}
          <div
            className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
            }`}
          >
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-0.5" />
                <span>ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 mr-0.5" />
                <span>OFFLINE</span>
              </>
            )}
          </div>

          <button
            onClick={() => setShowConfigModal(true)}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition"
            title="Configure Gate/Scanner"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 1.5 DUTY MODE SELECTOR TABS (Scan 1 vs Scan 2) */}
      <div className="w-full max-w-md my-2.5 grid grid-cols-2 gap-1.5 p-1.5 bg-white/5 border border-amber-500/20 backdrop-blur-md rounded-2xl shadow-lg">
        <button
          type="button"
          onClick={() => {
            setDutyMode('distribution');
            localStorage.setItem('khelaiya_duty_mode', 'distribution');
          }}
          className={`py-2 px-3 rounded-xl text-xs font-black transition flex flex-col items-center justify-center gap-0.5 ${
            dutyMode === 'distribution'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg border border-purple-300/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            <span>SCAN 1: ACTIVATION</span>
          </div>
          <span className="text-[10px] opacity-80 font-normal">Ticket Distribution Desk</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setDutyMode('entry');
            localStorage.setItem('khelaiya_duty_mode', 'entry');
          }}
          className={`py-2 px-3 rounded-xl text-xs font-black transition flex flex-col items-center justify-center gap-0.5 ${
            dutyMode === 'entry'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg border border-amber-300/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-950" />
            <span>SCAN 2: GATE ENTRY</span>
          </div>
          <span className="text-[10px] opacity-80 font-normal">Single-Entry at Gate</span>
        </button>
      </div>

      {/* 2. SCAN RESULT FULLSCREEN OVERLAY MODAL */}
      {(lastResult || networkError) && (
        <div
          onClick={clearResultAndResume}
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 cursor-pointer transition-all ${
            networkError
              ? 'bg-amber-600'
              : lastResult?.result === 'activated' || (dutyMode === 'distribution' && lastResult?.success)
              ? 'bg-emerald-600'
              : lastResult?.result === 'valid'
              ? 'bg-emerald-600'
              : lastResult?.result === 'already_entered'
              ? 'bg-rose-700'
              : lastResult?.result === 'not_activated' || lastResult?.result === 'not_approved'
              ? 'bg-amber-700'
              : lastResult?.result === 'revoked'
              ? 'bg-rose-900'
              : 'bg-rose-800'
          }`}
        >
          {/* TAP TO DISMISS BADGE */}
          <div className="absolute top-6 px-4 py-1.5 rounded-full bg-black/30 backdrop-blur-md text-white/90 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Tap anywhere to scan next
          </div>

          {/* NETWORK ERROR STATE */}
          {networkError && (
            <div className="text-center max-w-sm space-y-4 animate-in fade-in zoom-in duration-150">
              <WifiOff className="w-24 h-24 mx-auto text-white drop-shadow-lg" />
              <h2 className="text-4xl font-black uppercase tracking-tight text-white">
                CONNECTION LOST
              </h2>
              <div className="bg-black/30 rounded-2xl p-4 text-white text-base font-semibold">
                SCAN NOT CONFIRMED
              </div>
              <p className="text-amber-100 text-sm font-medium">
                Please reconnect to WiFi or Mobile Data before accepting the attendee.
              </p>
            </div>
          )}

          {/* DISTRIBUTION DESK SUCCESS (GREEN) */}
          {(lastResult?.result === 'activated' || (dutyMode === 'distribution' && lastResult?.success)) && (
            <div className="text-center max-w-md w-full space-y-4 animate-in fade-in zoom-in duration-150">
              <div className="w-24 h-24 bg-white/20 rounded-full mx-auto flex items-center justify-center shadow-xl border-4 border-white">
                <CheckCircle2 className="w-16 h-16 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white drop-shadow-md">
                PASS ACTIVATED!
              </h1>

              <div className="bg-black/30 backdrop-blur-md rounded-3xl p-5 border border-white/20 shadow-2xl text-left space-y-3">
                <div>
                  <span className="text-xs uppercase font-bold text-emerald-200 tracking-wider">
                    Physical Ticket Pass
                  </span>
                  <p className="text-4xl font-black text-amber-300 leading-tight">
                    {lastResult.attendee?.pass_number
                      ? `PASS #${String(lastResult.attendee.pass_number).padStart(4, '0')}`
                      : lastResult.attendee?.name || lastResult.ticket_id}
                  </p>
                </div>
                <div className="bg-emerald-950/60 border border-emerald-400/40 rounded-xl p-3 text-emerald-100 text-sm font-semibold">
                  ✅ Pass activated! Hand ticket to attendee — it is now ready for single gate entry.
                </div>
                <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs font-mono text-emerald-100">
                  <span className="flex items-center gap-1 font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date().toLocaleTimeString()}
                  </span>
                  <span className="font-bold opacity-80">{lastResult.ticket_id}</span>
                </div>
              </div>
            </div>
          )}

          {/* CASE 1: GATE ENTRY APPROVED (GREEN) */}
          {dutyMode === 'entry' && lastResult?.result === 'valid' && (
            <div className="text-center max-w-md w-full space-y-4 animate-in fade-in zoom-in duration-150">
              <div className="w-24 h-24 bg-white/20 rounded-full mx-auto flex items-center justify-center shadow-xl border-4 border-white">
                <ShieldCheck className="w-16 h-16 text-white" />
              </div>
              <h1 className="text-5xl font-black uppercase tracking-tight text-white drop-shadow-md">
                ENTRY APPROVED
              </h1>

              <div className="bg-black/30 backdrop-blur-md rounded-3xl p-5 border border-white/20 shadow-2xl text-left space-y-3">
                <div>
                  <span className="text-xs uppercase font-bold text-emerald-200 tracking-wider">
                    {lastResult.attendee?.name && !lastResult.attendee.name.startsWith('Pass #')
                      ? 'Attendee Name'
                      : 'Physical Pass'}
                  </span>
                  <p className="text-3xl sm:text-4xl font-black text-amber-300 leading-tight">
                    {lastResult.attendee?.pass_number
                      ? `PASS #${String(lastResult.attendee.pass_number).padStart(4, '0')}`
                      : lastResult.attendee?.name || lastResult.ticket_id}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/20">
                  <div>
                    <span className="text-[11px] uppercase font-bold text-emerald-200">
                      Pass Code
                    </span>
                    <p className="text-lg font-mono font-bold text-white">
                      {lastResult.attendee?.enrollment || lastResult.ticket_id}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase font-bold text-emerald-200">
                      Gate
                    </span>
                    <p className="text-lg font-bold text-white">{gate}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs font-mono text-emerald-100">
                  <span className="flex items-center gap-1 font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date().toLocaleTimeString()}
                  </span>
                  <span className="font-bold opacity-80">{lastResult.attendee?.ticket_id}</span>
                </div>
              </div>
            </div>
          )}

          {/* CASE 2: ALREADY ENTERED (RED) */}
          {lastResult?.result === 'already_entered' && (
            <div className="text-center max-w-md w-full space-y-4 animate-in fade-in zoom-in duration-150">
              <div className="w-24 h-24 bg-white/20 rounded-full mx-auto flex items-center justify-center shadow-xl border-4 border-white animate-bounce">
                <AlertTriangle className="w-16 h-16 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white drop-shadow-md">
                ALREADY ENTERED
              </h1>

              <div className="bg-black/30 backdrop-blur-md rounded-3xl p-5 border border-white/20 shadow-2xl text-left space-y-3">
                <div>
                  <span className="text-xs uppercase font-bold text-rose-200 tracking-wider">
                    Ticket Pass
                  </span>
                  <p className="text-3xl font-black text-white leading-tight">
                    {lastResult.attendee?.pass_number
                      ? `PASS #${String(lastResult.attendee.pass_number).padStart(4, '0')}`
                      : lastResult.attendee?.name || lastResult.ticket_id}
                  </p>
                </div>

                <div className="bg-rose-950/60 border border-rose-400/40 rounded-xl p-3 text-rose-100 text-sm font-semibold">
                  ⚠️ This ticket was already scanned. Duplicate scan rejected!
                </div>

                <div className="grid grid-cols-2 gap-2 text-left">
                  <div>
                    <span className="text-[11px] uppercase font-bold text-rose-200">
                      First Entry Time
                    </span>
                    <p className="text-base font-bold text-white">
                      {lastResult.attendee?.entry_time
                        ? new Date(lastResult.attendee.entry_time).toLocaleTimeString()
                        : 'Earlier'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase font-bold text-rose-200">
                      Original Gate
                    </span>
                    <p className="text-base font-bold text-white">
                      {lastResult.attendee?.entry_gate || 'Gate 1'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CASE: TICKET NOT ACTIVATED / NOT DISTRIBUTED (AMBER) */}
          {(lastResult?.result === 'not_activated' || lastResult?.result === 'not_approved') && (
            <div className="text-center max-w-md w-full space-y-4 animate-in fade-in zoom-in duration-150">
              <div className="w-24 h-24 bg-white/20 rounded-full mx-auto flex items-center justify-center shadow-xl border-4 border-white animate-pulse">
                <AlertTriangle className="w-16 h-16 text-amber-200" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white drop-shadow-md">
                PASS NOT ACTIVATED!
              </h1>

              <div className="bg-black/30 backdrop-blur-md rounded-3xl p-5 border border-white/20 shadow-2xl text-left space-y-3">
                <div>
                  <span className="text-xs uppercase font-bold text-amber-200 tracking-wider">
                    Physical Ticket Pass
                  </span>
                  <p className="text-3xl font-black text-amber-300 leading-tight">
                    {lastResult.attendee?.pass_number
                      ? `PASS #${String(lastResult.attendee.pass_number).padStart(4, '0')}`
                      : lastResult.attendee?.name || lastResult.ticket_id}
                  </p>
                </div>

                <div className="bg-amber-950/60 border border-amber-400/40 rounded-xl p-3 text-amber-100 text-sm font-semibold">
                  ⚠️ This pass has NOT been activated at the ticket distribution desk yet. Please direct attendee to the ticket distribution counter for Scan 1.
                </div>

                <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs font-mono text-amber-100">
                  <span className="flex items-center gap-1 font-semibold">
                    <Clock className="w-3.5 h-3.5" /> {new Date().toLocaleTimeString()}
                  </span>
                  <span className="font-bold opacity-80">{lastResult.ticket_id}</span>
                </div>
              </div>
            </div>
          )}

          {/* CASE 3: INVALID QR (RED) */}
          {lastResult?.result === 'invalid' && (
            <div className="text-center max-w-sm space-y-4 animate-in fade-in zoom-in duration-150">
              <XCircle className="w-24 h-24 mx-auto text-white drop-shadow-lg" />
              <h1 className="text-5xl font-black uppercase tracking-tight text-white drop-shadow-md">
                INVALID QR
              </h1>
              <div className="bg-black/30 rounded-2xl p-4 text-white text-base font-semibold">
                This ticket is NOT registered for NUV Khelaiya.
              </div>
              <p className="text-rose-200 text-xs font-mono">
                Scanned: {lastResult.ticket_id}
              </p>
            </div>
          )}

          {/* CASE 4: REVOKED (ORANGE) */}
          {lastResult?.result === 'revoked' && (
            <div className="text-center max-w-sm space-y-4 animate-in fade-in zoom-in duration-150">
              <AlertTriangle className="w-24 h-24 mx-auto text-white drop-shadow-lg" />
              <h1 className="text-4xl font-black uppercase tracking-tight text-white drop-shadow-md">
                TICKET REVOKED
              </h1>
              <div className="bg-black/30 rounded-2xl p-4 text-white text-base font-semibold">
                Please contact the event organizer at the registration desk.
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. CENTER CAMERA SCANNER */}
      <main className="w-full max-w-md my-auto py-2 flex flex-col items-center">
        <ScannerComponent
          onScan={handleScan}
          isProcessing={isProcessing}
          disabled={!isConfigured}
        />
      </main>

      {/* 4. BOTTOM BAR: Scans Count & Last Status */}
      <footer className="w-full max-w-md bg-white/5 border border-amber-500/20 backdrop-blur-md rounded-2xl p-4 shadow-lg flex items-center justify-between">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-amber-300/80 font-bold block">
            Scans Verified Today
          </span>
          <p className="text-3xl font-black font-mono text-white leading-tight">
            {scanCount}
          </p>
        </div>

        <div className="text-right">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
            Scanner State
          </span>
          <p className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            Ready for Next QR
          </p>
        </div>
      </footer>

      {/* 5. SCANNER SETUP / GATE SELECTION MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-sm w-full space-y-5 text-white shadow-2xl">
            <div className="text-center">
              <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <h3 className="text-xl font-black tracking-wide text-amber-300">
                Configure Scanner Phone
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                Select the physical gate and scanner identity for this device.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block mb-1.5">
                  Select Physical Entry Gate
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Gate 1', 'Gate 2'] as GateId[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setGate(g);
                        setScannerId(g === 'Gate 1' ? 'G1-A' : 'G2-A');
                      }}
                      className={`py-3 rounded-xl font-bold text-sm transition border ${
                        gate === g
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block mb-1.5">
                  Select Scanner ID (4 Total Devices)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(gate === 'Gate 1'
                    ? (['G1-A', 'G1-B'] as ScannerId[])
                    : (['G2-A', 'G2-B'] as ScannerId[])
                  ).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setScannerId(s)}
                      className={`py-3 rounded-xl font-mono font-bold text-sm transition border ${
                        scannerId === s
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => saveConfiguration(gate, scannerId)}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2"
            >
              Start Scanning <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
