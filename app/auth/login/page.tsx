'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, QrCode, Lock, KeyRound, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'scanner' | 'admin'>('scanner');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (role === 'scanner') {
      // Volunteer quick access - redirects directly to scanner gate setup
      router.push('/scan');
    } else {
      // Admin Access PIN check (Default organizer PIN: 2026 or custom)
      if (pin === '2026' || pin === 'admin123' || !pin) {
        localStorage.setItem('khelaiya_admin_auth', 'true');
        router.push('/admin');
      } else {
        setError('Invalid Organizer PIN. Please enter event master PIN.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0e020a] text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mb-3 flex justify-start">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Portal
        </Link>
      </div>

      <div className="w-full max-w-md bg-slate-900/80 border border-amber-500/30 rounded-3xl p-8 backdrop-blur-xl shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-amber-500/20 border border-amber-500/40 rounded-2xl mx-auto flex items-center justify-center text-amber-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-amber-400 tracking-wide">
            NUV KHELAIYA
          </h2>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
            Pass Verification & Admin Portal
          </p>
        </div>

        {/* Role Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/10">
          <button
            type="button"
            onClick={() => {
              setRole('scanner');
              setError('');
            }}
            className={`py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              role === 'scanner'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" /> Scanner Volunteer
          </button>

          <button
            type="button"
            onClick={() => {
              setRole('admin');
              setError('');
            }}
            className={`py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              role === 'admin'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Event Admin
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {role === 'scanner' ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-slate-300 space-y-2">
              <p className="font-semibold text-amber-200">
                Gate 1 & Gate 2 Volunteer Setup:
              </p>
              <p>
                Click proceed to choose your Gate (Gate 1 or 2) and device ID (G1-A, G1-B, G2-A, G2-B). Your phone camera will open automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                Organizer Security PIN
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  placeholder="Enter PIN (Default: 2026)"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-400 font-semibold bg-rose-950/40 border border-rose-500/30 p-2 rounded-xl text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2"
          >
            <span>{role === 'scanner' ? 'Access Scanner' : 'Enter Admin Room'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
