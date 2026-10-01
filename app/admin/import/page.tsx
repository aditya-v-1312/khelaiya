'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RefreshCw,
  FileText,
} from 'lucide-react';

interface ParsedRow {
  name: string;
  enrollment: string;
  phone: string;
  isValid: boolean;
  error?: string;
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const [invalidCount, setInvalidCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importSummary, setImportSummary] = useState<{
    imported: number;
    alreadyExisted: number;
    errors: number;
    message: string;
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setImportSummary(null);

    Papa.parse<Record<string, string>>(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        validateAndPrepareRows(results.data);
      },
      error: (err) => {
        alert(`Failed to parse CSV: ${err.message}`);
      },
    });
  };

  const validateAndPrepareRows = (rawRows: Record<string, string>[]) => {
    const seenEnrollments = new Set<string>();
    const seenPhones = new Set<string>();
    let duplicates = 0;
    let invalids = 0;

    const processed: ParsedRow[] = rawRows.map((row) => {
      // Find case-insensitive keys
      const keys = Object.keys(row);
      const nameKey = keys.find((k) => /name/i.test(k)) || 'Name';
      const enrollmentKey = keys.find((k) => /enroll/i.test(k)) || 'Enrollment';
      const phoneKey =
        keys.find((k) => /mobile|phone|contact/i.test(k)) || 'Mobile number';

      const rawName = (row[nameKey] || '').trim();
      const rawEnrollment = (row[enrollmentKey] || '').trim();
      let rawPhone = (row[phoneKey] || '').trim();

      // Normalize phone: strip spaces, dashes, +91
      rawPhone = rawPhone.replace(/\D/g, '');
      if (rawPhone.length === 12 && rawPhone.startsWith('91')) {
        rawPhone = rawPhone.slice(2);
      }

      // Validations
      if (!rawName) {
        invalids++;
        return {
          name: '',
          enrollment: rawEnrollment,
          phone: rawPhone,
          isValid: false,
          error: 'Missing Name',
        };
      }

      if (!rawEnrollment) {
        invalids++;
        return {
          name: rawName,
          enrollment: '',
          phone: rawPhone,
          isValid: false,
          error: 'Missing Enrollment Number',
        };
      }

      if (seenEnrollments.has(rawEnrollment)) {
        duplicates++;
        return {
          name: rawName,
          enrollment: rawEnrollment,
          phone: rawPhone,
          isValid: false,
          error: `Duplicate Enrollment #${rawEnrollment} in file`,
        };
      }
      seenEnrollments.add(rawEnrollment);

      return {
        name: rawName,
        enrollment: rawEnrollment,
        phone: rawPhone,
        isValid: true,
      };
    });

    setParsedRows(processed);
    setDuplicateCount(duplicates);
    setInvalidCount(invalids);
  };

  const handleCommitImport = async () => {
    const validOnes = parsedRows.filter((r) => r.isValid);
    if (validOnes.length === 0) {
      alert('No valid rows found to import.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validOnes }),
      });

      const data = await res.json();
      if (data.success) {
        setImportSummary({
          imported: data.imported,
          alreadyExisted: data.alreadyExisted,
          errors: data.errors,
          message: data.message,
        });
      } else {
        alert(data.message || 'Import failed');
      }
    } catch (err) {
      console.error('Import error:', err);
      alert('Network error during import');
    } finally {
      setIsProcessing(false);
    }
  };

  // Sample CSV generator for testing
  const downloadSampleCsv = () => {
    const sample = `Name,Enrollment,Mobile number\nVishwa Prajapati,26001017,9409679991\nJiya Khetwani,26000996,8460916715\nAarav Shah,26001044,9876543210\nAnanya Desai,26001088,9898012345`;
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_khelaiya_attendees.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-amber-400 tracking-wide">
          Google Sheets & CSV Attendee Import
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Upload attendee spreadsheet to batch-generate secure tickets and sync with Supabase
        </p>
      </div>

      {/* Upload Box */}
      <div className="bg-slate-900/60 border-2 border-dashed border-amber-500/30 rounded-3xl p-8 text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full mx-auto flex items-center justify-center text-amber-400">
          <UploadCloud className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-white">Choose CSV Attendee File</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            Export your Google Sheet as <strong>CSV</strong> (Name, Enrollment, Mobile number) and upload it here.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <label className="cursor-pointer px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" /> Select CSV File
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={downloadSampleCsv}
            className="px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold rounded-xl text-xs transition border border-white/10 flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-amber-300" /> Download Sample CSV
          </button>
        </div>

        {file && (
          <p className="text-xs font-mono text-emerald-400 pt-2">
            Loaded: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>

      {/* IMPORT RESULT SUMMARY BANNER (SECTION 5 SPEC) */}
      {importSummary && (
        <div className="bg-emerald-950/70 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-3 animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
            <CheckCircle2 className="w-6 h-6" /> Import Complete!
          </div>
          <p className="text-sm text-emerald-100">{importSummary.message}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-black/40 rounded-xl p-3 border border-emerald-500/20">
              <span className="text-[10px] text-slate-400 uppercase block">New Imported</span>
              <span className="text-2xl font-black font-mono text-emerald-400">
                {importSummary.imported.toLocaleString()}
              </span>
            </div>
            <div className="bg-black/40 rounded-xl p-3 border border-emerald-500/20">
              <span className="text-[10px] text-slate-400 uppercase block">Already Existed</span>
              <span className="text-2xl font-black font-mono text-amber-300">
                {importSummary.alreadyExisted.toLocaleString()}
              </span>
            </div>
            <div className="bg-black/40 rounded-xl p-3 border border-emerald-500/20">
              <span className="text-[10px] text-slate-400 uppercase block">Skipped/Errors</span>
              <span className="text-2xl font-black font-mono text-rose-400">
                {importSummary.errors}
              </span>
            </div>
            <div className="bg-black/40 rounded-xl p-3 border border-emerald-500/20">
              <span className="text-[10px] text-slate-400 uppercase block">Ready in System</span>
              <span className="text-2xl font-black font-mono text-white">
                {(importSummary.imported + importSummary.alreadyExisted).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Parsed Preview Table */}
      {parsedRows.length > 0 && !importSummary && (
        <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 className="font-bold text-white text-base">Spreadsheet Validation Preview</h3>
              <p className="text-xs text-slate-400">
                {parsedRows.length} rows parsed · {duplicateCount} duplicates · {invalidCount} invalid
              </p>
            </div>

            <button
              onClick={handleCommitImport}
              disabled={isProcessing}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Storing in Supabase...
                </>
              ) : (
                <>
                  Commit & Generate Ticket IDs ({parsedRows.filter((r) => r.isValid).length} Rows){' '}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/40 text-slate-400 uppercase tracking-wider font-semibold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Attendee Name</th>
                  <th className="py-2.5 px-3">Enrollment</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {parsedRows.slice(0, 100).map((row, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-white/5 ${
                      !row.isValid ? 'bg-rose-950/20 text-rose-200' : ''
                    }`}
                  >
                    <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                    <td className="py-2 px-3 font-sans font-bold text-white">{row.name}</td>
                    <td className="py-2 px-3 text-amber-200">{row.enrollment}</td>
                    <td className="py-2 px-3 text-slate-300">
                      {row.phone ? `+91 ${row.phone.slice(-10)}` : 'N/A'}
                    </td>
                    <td className="py-2 px-3 font-sans">
                      {row.isValid ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> {row.error}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsedRows.length > 100 && (
            <p className="text-xs text-center text-slate-500 pt-2">
              Showing first 100 of {parsedRows.length} rows. All {parsedRows.filter((r) => r.isValid).length} valid rows will be committed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
