'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Attendee } from '@/lib/types';
import TicketCard from '@/components/TicketCard';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Ban,
  RefreshCw,
  Copy,
  Eye,
  UserCheck,
  X,
  AlertCircle,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react';

export default function AttendeesPage() {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const limit = 25;

  // Selected Attendee for Modal Actions
  const [viewTicketAttendee, setViewTicketAttendee] = useState<Attendee | null>(null);
  const [manualEntryAttendee, setManualEntryAttendee] = useState<Attendee | null>(null);
  const [reissueAttendee, setReissueAttendee] = useState<Attendee | null>(null);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [manualGate, setManualGate] = useState('Gate 1');
  const [adminNote, setAdminNote] = useState('Manual verification at Helpdesk');

  // Quick Pass Approval Toolbar
  const [quickPassInput, setQuickPassInput] = useState('');
  const [rangeStart, setRangeStart] = useState('1');
  const [rangeEnd, setRangeEnd] = useState('1500');
  const [isApproving, setIsApproving] = useState(false);

  const handleQuickApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPassInput.trim()) return;
    setIsApproving(true);
    try {
      const res = await fetch('/api/admin/passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', ticketIdOrPassNumber: quickPassInput.trim() }),
      });
      const data = await res.json();
      alert(data.message || (data.success ? 'Pass approved!' : 'Failed'));
      if (data.success) {
        setQuickPassInput('');
        fetchAttendees();
      }
    } catch {
      alert('Error approving pass');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRangeApprove = async () => {
    if (!confirm(`Approve all passes from Pass #${rangeStart} to #${rangeEnd}?`)) return;
    setIsApproving(true);
    try {
      const res = await fetch('/api/admin/passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_range',
          startNumber: Number(rangeStart),
          endNumber: Number(rangeEnd),
        }),
      });
      const data = await res.json();
      alert(data.message || 'Range approved');
      fetchAttendees();
    } catch {
      alert('Error approving range');
    } finally {
      setIsApproving(false);
    }
  };

  const handleApproveAll = async () => {
    if (!confirm('Approve ALL unapproved passes in the system?')) return;
    setIsApproving(true);
    try {
      const res = await fetch('/api/admin/passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_all' }),
      });
      const data = await res.json();
      alert(data.message || 'All passes approved');
      fetchAttendees();
    } catch {
      alert('Error approving passes');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRowApprove = async (ticketId: string) => {
    try {
      const res = await fetch('/api/admin/passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', ticketIdOrPassNumber: ticketId }),
      });
      const data = await res.json();
      alert(data.message || 'Pass approved!');
      fetchAttendees();
    } catch {
      alert('Error approving pass');
    }
  };

  const fetchAttendees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });
      const res = await fetch(`/api/admin/attendees?${params}`);
      const data = await res.json();
      if (data.success) {
        setAttendees(data.attendees);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Error fetching attendees:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAttendees();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchAttendees]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`Copied ticket ID: ${text}`);
  };

  const handleManualEntrySubmit = async () => {
    if (!manualEntryAttendee) return;
    setActionProcessing(true);

    try {
      const res = await fetch('/api/admin/manual-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendeeId: manualEntryAttendee.id,
          gate: manualGate,
          scannerId: 'Admin-Helpdesk',
          adminNote,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Entry APPROVED for ${manualEntryAttendee.name}!`);
        setManualEntryAttendee(null);
        fetchAttendees();
      } else {
        alert(`Cannot grant entry: ${data.message}`);
      }
    } catch (err) {
      alert('Error recording manual entry');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleReissueSubmit = async (action: 'reissue' | 'revoke') => {
    if (!reissueAttendee) return;
    if (
      !confirm(
        action === 'revoke'
          ? `Are you sure you want to REVOKE the ticket for ${reissueAttendee.name}?`
          : `Generate a brand NEW ticket for ${reissueAttendee.name}? Old ticket will become invalid.`
      )
    )
      return;

    setActionProcessing(true);
    try {
      const res = await fetch('/api/admin/reissue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendeeId: reissueAttendee.id,
          action,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setReissueAttendee(null);
        fetchAttendees();
      } else {
        alert(data.message || 'Operation failed');
      }
    } catch (err) {
      alert('Failed to update ticket');
    } finally {
      setActionProcessing(false);
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
            Attendee Directory & Helpdesk
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Search attendees, inspect tickets, manual entry fallback, and reissue passes
          </p>
        </div>

        <div className="text-xs font-mono font-bold text-amber-300 bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-400/20">
          Total Attendees: {total}
        </div>
      </div>

      {/* 🎟️ TICKET DISTRIBUTION & APPROVAL TOOLBAR */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-teal-500/10 border border-emerald-500/30 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
              Pass Activation & Gate Permission Control
            </span>
            <p className="text-xs text-slate-300 mt-0.5">
              Activate physical passes individually or in bulk so they are permitted for single gate entry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Single Pass Activate */}
            <form onSubmit={handleQuickApprove} className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl p-1">
              <input
                type="text"
                placeholder="Pass # (e.g. 42)"
                value={quickPassInput}
                onChange={(e) => setQuickPassInput(e.target.value)}
                className="bg-transparent text-xs text-white placeholder-slate-500 px-2 py-1 w-28 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isApproving || !quickPassInput.trim()}
                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs transition"
              >
                Activate
              </button>
            </form>

            {/* Range Activate */}
            <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl p-1 text-xs">
              <span className="text-slate-400 px-1 font-semibold">Pass:</span>
              <input
                type="number"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-lg text-white font-mono text-center w-14 py-1 focus:outline-none"
              />
              <span className="text-slate-500">to</span>
              <input
                type="number"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-lg text-white font-mono text-center w-14 py-1 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleRangeApprove}
                disabled={isApproving}
                className="px-2.5 py-1 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs transition"
              >
                Activate Range
              </button>
            </div>

            {/* Activate All */}
            <button
              type="button"
              onClick={handleApproveAll}
              disabled={isApproving}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold rounded-xl text-xs transition"
            >
              Activate All
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-white/10">
        <div className="sm:col-span-3 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by Name, Enrollment, Ticket ID, or Pass #..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-semibold"
          >
            <option value="all">All Statuses</option>
            <option value="unactivated">⚡ Unactivated (Awaiting Desk Activation)</option>
            <option value="activated">✅ Activated (Ready for Gate Entry)</option>
            <option value="entered">🚪 Entered (Single Entry Used)</option>
            <option value="revoked">🚫 Revoked</option>
          </select>
        </div>
      </div>

      {/* Attendee Table */}
      <div className="bg-slate-900/60 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-black/40 text-slate-400 uppercase tracking-wider font-semibold border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Attendee Name</th>
                <th className="py-3 px-4">Enrollment</th>
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Entry Log</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {loading && attendees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Searching attendees...
                  </td>
                </tr>
              ) : attendees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No attendees match your search query.
                  </td>
                </tr>
              ) : (
                attendees.map((a) => (
                  <tr key={a.id} className="hover:bg-white/5 transition">
                    <td className="py-3.5 px-4 font-bold text-white">{a.name}</td>
                    <td className="py-3.5 px-4 font-mono text-amber-200">{a.enrollment}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <span>{a.ticket_id}</span>
                        <button
                          onClick={() => copyToClipboard(a.ticket_id)}
                          title="Copy Ticket ID"
                          className="text-slate-500 hover:text-white transition"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          a.status === 'entered'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : a.status === 'unactivated' || a.status === 'unapproved'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : a.status === 'revoked'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {a.status === 'entered' && <CheckCircle2 className="w-3 h-3" />}
                        {(a.status === 'unactivated' || a.status === 'unapproved') && <Clock className="w-3 h-3" />}
                        {a.status === 'revoked' && <Ban className="w-3 h-3" />}
                        {(a.status === 'activated' || a.status === 'registered' || a.status === 'approved') && <CheckCircle2 className="w-3 h-3" />}
                        {a.status === 'unactivated' || a.status === 'unapproved'
                          ? 'Unactivated'
                          : a.status === 'entered'
                          ? 'Entered'
                          : a.status === 'revoked'
                          ? 'Revoked'
                          : 'Activated'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {a.entry_time ? (
                        <div>
                          <span className="text-white font-mono font-semibold">
                            {new Date(a.entry_time).toLocaleTimeString()}
                          </span>
                          <span className="text-slate-400 block text-[11px]">
                            {a.entry_gate} ({a.entry_scanner})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick Activate Button for Unactivated Passes */}
                        {(a.status === 'unactivated' || a.status === 'unapproved') && (
                          <button
                            onClick={() => handleRowApprove(a.ticket_id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition flex items-center gap-1"
                            title="Activate pass for distribution"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                          </button>
                        )}

                        {/* View Ticket Modal */}
                        <button
                          onClick={() => setViewTicketAttendee(a)}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition"
                          title="View & Download Ticket QR"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Manual Entry Fallback Button */}
                        {(a.status === 'registered' || a.status === 'approved' || a.status === 'activated') && (
                          <button
                            onClick={() => setManualEntryAttendee(a)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition flex items-center gap-1"
                            title="Manually admit attendee at gate"
                          >
                            <UserCheck className="w-3.5 h-3.5" /> Admit
                          </button>
                        )}

                        {/* Reissue / Revoke */}
                        <button
                          onClick={() => setReissueAttendee(a)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition"
                          title="Revoke or Reissue Ticket"
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing {Math.min(attendees.length, limit)} of {total} attendees
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 transition font-semibold"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * limit >= total}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 transition font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: VIEW TICKET BADGE */}
      {viewTicketAttendee && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-sm w-full">
            <button
              onClick={() => setViewTicketAttendee(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <TicketCard attendee={viewTicketAttendee} />
          </div>
        </div>
      )}

      {/* MODAL 2: MANUAL ENTRY FALLBACK (SECTION 18) */}
      {manualEntryAttendee && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-md w-full space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <UserCheck className="w-5 h-5" />
                <span>Manual Entry Fallback</span>
              </div>
              <button onClick={() => setManualEntryAttendee(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="bg-black/30 rounded-2xl p-4 space-y-1.5 text-sm">
              <p className="text-slate-400 text-xs uppercase font-semibold">Attendee Details</p>
              <p className="text-lg font-bold text-white">{manualEntryAttendee.name}</p>
              <p className="font-mono text-amber-300">
                Enrollment: {manualEntryAttendee.enrollment}
              </p>
              <p className="font-mono text-xs text-slate-400">
                Ticket: {manualEntryAttendee.ticket_id}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-amber-300 block mb-1">Entry Gate</label>
                <select
                  value={manualGate}
                  onChange={(e) => setManualGate(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="Gate 1">Gate 1</option>
                  <option value="Gate 2">Gate 2</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-amber-300 block mb-1">
                  Reason / Helpdesk Note
                </label>
                <input
                  type="text"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="e.g. Phone screen cracked, manual ID verification"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setManualEntryAttendee(null)}
                className="w-1/2 py-2.5 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleManualEntrySubmit}
                disabled={actionProcessing}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm transition flex items-center justify-center gap-1.5"
              >
                {actionProcessing ? 'Authorizing...' : 'Confirm Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REISSUE / REVOKE TICKET */}
      {reissueAttendee && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 max-w-md w-full space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <ShieldAlert className="w-5 h-5" />
                <span>Ticket Management: {reissueAttendee.name}</span>
              </div>
              <button onClick={() => setReissueAttendee(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Current Ticket: <span className="font-mono text-amber-300">{reissueAttendee.ticket_id}</span>
              <br />
              Status: <span className="font-bold uppercase text-white">{reissueAttendee.status}</span>
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleReissueSubmit('reissue')}
                disabled={actionProcessing}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Reissue Brand New Ticket ID
              </button>

              <button
                onClick={() => handleReissueSubmit('revoke')}
                disabled={actionProcessing}
                className="w-full py-3 rounded-xl bg-rose-600/30 hover:bg-rose-600/40 text-rose-200 border border-rose-500/30 font-bold text-sm transition flex items-center justify-center gap-2"
              >
                <Ban className="w-4 h-4" /> Revoke Current Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
