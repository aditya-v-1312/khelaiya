'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  FileText,
  ClipboardPaste,
  Sparkles,
} from 'lucide-react';

interface ParsedRow {
  name: string;
  enrollment: string;
  phone: string;
  isValid: boolean;
  error?: string;
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState<string>('');
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

  /**
   * Ultra-robust CSV Parser:
   * Handles:
   * 1. Preamble titles (e.g. 'Table 1', 'Sheet 1', etc.)
   * 2. Trailing empty commas (e.g. 'Name,Enrollment,Mobile number,,,,')
   * 3. Irregular column positions
   * 4. Leading / trailing spaces, quotes, and tabs
   */
  const parseRawCsvContent = (content: string) => {
    setImportSummary(null);
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      alert('The provided file or text is empty.');
      return;
    }

    let headerIndex = -1;
    let nameCol = 0;
    let enrollmentCol = 1;
    let phoneCol = 2;

    // Scan lines to locate the true header row, skipping preambles like "Table 1"
    for (let i = 0; i < lines.length; i++) {
      const parsed = Papa.parse<string[]>(lines[i], { header: false }).data[0];
      if (!parsed) continue;

      const nIdx = parsed.findIndex((c) => /name/i.test((c || '').trim()));
      const eIdx = parsed.findIndex((c) => /enroll/i.test((c || '').trim()));
      const pIdx = parsed.findIndex((c) => /mobile|phone|contact/i.test((c || '').trim()));

      if (nIdx !== -1 && (eIdx !== -1 || pIdx !== -1)) {
        headerIndex = i;
        nameCol = nIdx;
        enrollmentCol = eIdx !== -1 ? eIdx : 1;
        phoneCol = pIdx !== -1 ? pIdx : 2;
        break;
      }
    }

    const seenEnrollments = new Set<string>();
    let duplicates = 0;
    let invalids = 0;
    const processed: ParsedRow[] = [];

    // Parse data rows starting after the header (or from index 0 if no header found)
    const startIndex = headerIndex !== -1 ? headerIndex + 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parsed = Papa.parse<string[]>(lines[i], { header: false }).data[0];
      if (!parsed || parsed.length === 0) continue;

      const rawName = (parsed[nameCol] || '').trim();
      const rawEnrollment = (parsed[enrollmentCol] || '').trim();
      let rawPhone = (parsed[phoneCol] || '').trim();

      // Skip completely blank rows or repetitive header rows
      if (!rawName && !rawEnrollment && !rawPhone) continue;
      if (/^name$/i.test(rawName) && /^enroll/i.test(rawEnrollment)) continue;

      // Normalize phone: strip spaces, dashes, +91 prefix
      rawPhone = rawPhone.replace(/\D/g, '');
      if (rawPhone.length === 12 && rawPhone.startsWith('91')) {
        rawPhone = rawPhone.slice(2);
      }

      // Validations
      if (!rawName) {
        invalids++;
        processed.push({
          name: '',
          enrollment: rawEnrollment,
          phone: rawPhone,
          isValid: false,
          error: 'Missing Name',
        });
        continue;
      }

      if (!rawEnrollment) {
        invalids++;
        processed.push({
          name: rawName,
          enrollment: '',
          phone: rawPhone,
          isValid: false,
          error: 'Missing Enrollment Number',
        });
        continue;
      }

      if (seenEnrollments.has(rawEnrollment)) {
        duplicates++;
        processed.push({
          name: rawName,
          enrollment: rawEnrollment,
          phone: rawPhone,
          isValid: false,
          error: `Duplicate Enrollment #${rawEnrollment} in file`,
        });
        continue;
      }
      seenEnrollments.add(rawEnrollment);

      processed.push({
        name: rawName,
        enrollment: rawEnrollment,
        phone: rawPhone,
        isValid: true,
      });
    }

    setParsedRows(processed);
    setDuplicateCount(duplicates);
    setInvalidCount(invalids);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        parseRawCsvContent(content);
      }
    };
    reader.readAsText(uploadedFile);
  };

  const handlePasteProcess = () => {
    if (!pasteText.trim()) {
      alert('Please paste CSV text into the box first.');
      return;
    }
    parseRawCsvContent(pasteText);
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

  const loadSampleAttendeeList = () => {
    const sample = `Table 1
Name,Enrollment,Mobile number,,,,
Vishwa Prajapati,26001017,9409679991,,,,
Jiya Khetwani,26000996,8460916715,,,,
Disha Patel,26000828,9426261371,,,,
Yana Paraliya,26000727,8160084485,,,,
Mitali Gawas,26000238,9274073963,,,,
Dhruvi Agrawal,26000374,9328372304,,,,
Riya Soni,26000339,8320250985,,,,
Guneet Kaur,26000058,9104091360,,,,
Pahal Soni,25000234,8320592525,,,,
Harsh Bhatt,25001054,7574867010,,,,
Jiya Patel,25000189,7265978367,,,,
Riya Agrawal,26000315,7016933703,,,,
Yuti Patel,26000410,7990891521,,,,
Aditya Narwekar,26000309,7984961066,,,,
Avni Vaidya,26000631,6356501981,,,,
Aaditi Sutawane,26001152,9313617607,,,,
Krish Mirchandani,25000214,9099336531,,,,
Dhanshri Mehta,25001139,7984052384,,,,
Darshan Gohil,25000131,9274282811,,,,
Raviraj Parmar,25000148,8460393975,,,,
Vishv Sangani,25000160,7069047970,,,,
Aarya Pandya,26000884,9979880076,,,,
Shreya Chauhan,25001124,6357288639,,,,
Hraday Desai,26000782,8980434438,,,,
Yesha Shah,26000462,7575819129,,,,
Vyoma Patel,26001024,9328813626,,,,
Rashmi Samvedi,26001026,8487914680,,,,
Pal shah,26001034,6355120743,,,,
Twinkle panchal,26000988,9825705717,,,,
Pranaali surve,26001006,7801919206,,,,
Drishti upadhyay,26001288,9407883618,,,,
Aashi Arora,26000705,9687200807,,,,
harsh patel,24000195,7984797348,,,,
vaibhavi shah,25001272,8347031369,,,,`;
    setPasteText(sample);
    setActiveTab('paste');
    parseRawCsvContent(sample);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-amber-400 tracking-wide">
          Google Sheets & CSV Attendee Import
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Upload or paste attendee spreadsheet to generate secure tickets and sync with Supabase
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-900/80 rounded-2xl border border-white/10 w-fit">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'upload'
              ? 'bg-amber-400 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Upload CSV File
        </button>

        <button
          onClick={() => setActiveTab('paste')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'paste'
              ? 'bg-amber-400 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ClipboardPaste className="w-3.5 h-3.5" /> Paste Text Directly
        </button>

        <button
          onClick={loadSampleAttendeeList}
          className="px-3 py-2 rounded-xl text-xs font-semibold text-amber-300 hover:bg-white/10 transition flex items-center gap-1 border border-amber-400/20"
          title="Load 34 Attendees from your message"
        >
          <Sparkles className="w-3.5 h-3.5" /> Load Attendees List
        </button>
      </div>

      {/* TAB 1: FILE UPLOAD */}
      {activeTab === 'upload' && (
        <div className="bg-slate-900/60 border-2 border-dashed border-amber-500/30 rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full mx-auto flex items-center justify-center text-amber-400">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">Choose CSV File</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Supports Google Sheets, Apple Numbers (with &quot;Table 1&quot; preamble), and Excel CSV exports. Trailing commas are handled automatically.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <label className="cursor-pointer px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Select CSV File
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {file && (
            <p className="text-xs font-mono text-emerald-400 pt-2">
              Loaded: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>
      )}

      {/* TAB 2: PASTE TEXT DIRECTLY */}
      {activeTab === 'paste' && (
        <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Paste Spreadsheet Data</h3>
              <p className="text-xs text-slate-400">
                Paste directly from Google Sheets, Excel, or chat text
              </p>
            </div>
            <button
              onClick={handlePasteProcess}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition shadow-md flex items-center gap-1.5"
            >
              Parse Data <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <textarea
            rows={8}
            placeholder={`Table 1\nName,Enrollment,Mobile number,,,,\nVishwa Prajapati,26001017,9409679991,,,,\nJiya Khetwani,26000996,8460916715,,,,`}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
          />
        </div>
      )}

      {/* IMPORT RESULT SUMMARY BANNER */}
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
                {parsedRows.length} attendees detected · {duplicateCount} duplicates · {invalidCount} invalid
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
                {parsedRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-white/5 ${
                      !row.isValid ? 'bg-rose-950/20 text-rose-200' : ''
                    }`}
                  >
                    <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                    <td className="py-2 px-3 font-sans font-bold text-white">{row.name}</td>
                    <td className="py-2 px-3 text-amber-200 font-bold">{row.enrollment}</td>
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
        </div>
      )}
    </div>
  );
}
