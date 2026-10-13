'use client';

import React, { useState, useEffect } from 'react';
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
  Lock,
  User,
  KeyRound,
  LogOut,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Check auth state on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAuth = localStorage.getItem('khelaiya_admin_auth') === 'true';
      setIsAuthenticated(isAuth);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = password.trim();

    // Hardcoded credentials: user: nuvcc, pass: nuvcc2026
    if (trimmedUser === 'nuvcc' && trimmedPass === 'nuvcc2026') {
      if (typeof window !== 'undefined') {
        localStorage.setItem('khelaiya_admin_auth', 'true');
      }
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid Admin ID or Password.');
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('khelaiya_admin_auth');
    }
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
  };

  // While checking localStorage, render minimal loading screen
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#0e020a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not Authenticated -> Show Admin Login Form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0e020a] text-white flex flex-col justify-between selection:bg-amber-500 selection:text-black">
        {/* Background Glows */}
        <div className="fixed top-0 left-1/4 -translate-x-1/2 w-96 h-96 bg-[#5f1040]/30 rounded-full blur-[140px] pointer-events-none" />
        <div className="fixed bottom-0 right-1/4 translate-x-1/2 w-96 h-96 bg-[#febf4a]/15 rounded-full blur-[140px] pointer-events-none" />

        {/* Top Header */}
        <header className="p-4 sm:p-6 max-w-6xl mx-auto w-full flex items-center justify-between relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Portal
          </Link>

          <Link
            href="/scan"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/30 transition"
          >
            <QrCode className="w-3.5 h-3.5" /> Open Gate & Activation Scanner
          </Link>
        </header>

        {/* Centered Login Card */}
        <div className="max-w-md w-full mx-auto px-4 py-8 relative z-10">
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-gradient-to-tr from-amber-500/20 to-purple-500/20 border border-amber-500/40 rounded-2xl mx-auto flex items-center justify-center text-amber-400 shadow-lg">
                <Lock className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-black text-amber-400 tracking-wide">
                NUV KHELAIYA ADMIN
              </h1>
              <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                Protected Organizer Access
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Admin User ID
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter Admin ID"
                    className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Admin Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Password"
                    className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-rose-300 font-semibold bg-rose-950/60 border border-rose-500/30 p-2.5 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-sm transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <span>Unlock Admin Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="pt-2 border-t border-white/10 text-center">
              <p className="text-[11px] text-slate-400">
                Gate volunteers and activation desk crew do not require admin credentials.
              </p>
              <Link
                href="/scan"
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-300 hover:text-amber-200"
              >
                Go directly to Scanner & Activation →
              </Link>
            </div>
          </div>
        </div>

        <footer className="p-4 text-center text-xs text-slate-500 relative z-10">
          NUV Khelaiya 2026 · Cultural Committee Admin Control
        </footer>
      </div>
    );
  }

  // Authenticated -> Render Full Admin Layout
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
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition"
              title="Lock Admin Access"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
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
