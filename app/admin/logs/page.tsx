'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ScanLog } from '@/lib/types';
import {
  FileText,
  Download,
  Filter,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Ban,
} from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [gateFilter, setGateFilter] = useState<string>('all');
  const [scannerFilter, setScannerFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [ticketSearch, setTicketSearch] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        gate: gateFilter,
        scannerId: scannerFilter,
        result: resultFilter,
        ticketId: ticketSearch,
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });
      const res = await fetch(`/api/admin/logs?${params}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  }, [gateFilter, scannerFilter, resultFilter, ticketSearch, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const handleExportCsv = () => {
    const params = new URLSearchParams({
      gate: gateFilter,
      scannerId: scannerFilter,
      result: resultFilter,
      ticketId: ticketSearch,
      limit: '5000',
      format: 'csv',
    });
    window.location.href = `/api/admin/logs?${params}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-amber-400 tracking-wide">
            Scan Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Immutable chronological record of every scan attempt across all gates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export CSV Log
          </button>
          <button
            onClick={fetchLogs}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-white/10 text-xs">
        {/* Ticket ID search */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Search Ticket ID
          </label>
          <input
            type="text"
            placeholder="NUV-KHL-..."
            value={ticketSearch}
            onChange={(e) => {
              setTicketSearch(e.target.value);
              setPage(0);
            }}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
          />
        </div>

        {/* Gate Filter */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Physical Gate
          </label>
          <select
            value={gateFilter}
            onChange={(e) => {
              setGateFilter(e.target.value);
              setPage(0);
            }}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
          >
            <option value="all">All Gates</option>
            <option value="Gate 1">Gate 1</option>
            <option value="Gate 2">Gate 2</option>
          </select>
        </div>

        {/* Scanner Filter */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Scanner ID
          </label>
          <select
            value={scannerFilter}
            onChange={(e) => {
              setScannerFilter(e.target.value);
              setPage(0);
            }}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono"
          >
            <option value="all">All Scanners</option>
            <option value="G1-A">G1-A</option>
            <option value="G1-B">G1-B</option>
            <option value="G2-A">G2-A</option>
            <option value="G2-B">G2-B</option>
          </select>
        </div>

        {/* Result Filter */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Scan Result
          </label>
          <select
            value={resultFilter}
            onChange={(e) => {
              setResultFilter(e.target.value);
              setPage(0);
            }}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
          >
            <option value="all">All Results</option>
            <option value="valid">Valid (Approved)</option>
            <option value="already_entered">Already Entered</option>
            <option value="invalid">Invalid QR</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900/60 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/40 text-slate-400 uppercase tracking-wider font-semibold border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Gate</th>
                <th className="py-3 px-4">Scanner</th>
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Attendee</th>
                <th className="py-3 px-4">Scan Type</th>
                <th className="py-3 px-4 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Fetching scan logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                    No scan logs found matching filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition">
                    <td className="py-3 px-4 text-slate-300">
                      {new Date(log.scanned_at).toLocaleTimeString()}{' '}
                      <span className="text-[10px] text-slate-500 block">
                        {new Date(log.scanned_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white font-sans font-semibold">
                      {log.gate}
                    </td>
                    <td className="py-3 px-4 text-amber-300 font-bold">{log.scanner_id}</td>
                    <td className="py-3 px-4 text-slate-200">{log.ticket_id}</td>
                    <td className="py-3 px-4 font-sans">
                      {log.attendee ? (
                        <div>
                          <p className="font-bold text-white">{log.attendee.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {log.attendee.enrollment}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-sans uppercase text-[10px]">
                      {log.scan_type}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          log.result === 'valid'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : log.result === 'already_entered'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : log.result === 'revoked'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-950 text-rose-400 border border-rose-700/50'
                        }`}
                      >
                        {log.result.replace('_', ' ')}
                      </span>
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
            Total recorded scans: <strong className="text-white">{total}</strong>
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
    </div>
  );
}
