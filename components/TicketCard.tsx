'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Attendee } from '@/lib/types';
import { Download, Sparkles, CheckCircle2 } from 'lucide-react';

interface TicketCardProps {
  attendee: Attendee;
  showDownload?: boolean;
}

export default function TicketCard({ attendee, showDownload = true }: TicketCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    // Generate QR containing strictly the ticket_id
    if (attendee.ticket_id) {
      QRCode.toDataURL(attendee.ticket_id, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 320,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating QR code:', err));
    }
  }, [attendee.ticket_id]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `NUV_Khelaiya_Ticket_${attendee.enrollment}_${attendee.ticket_id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="relative w-full max-w-sm mx-auto bg-gradient-to-br from-[#4a0b32] via-[#2d051f] to-[#14000d] border border-amber-400/40 rounded-3xl p-6 text-white shadow-2xl overflow-hidden print:border-black print:text-black print:bg-white print:shadow-none">
      {/* Decorative Traditional Patterns */}
      <div className="absolute top-0 right-0 -mr-12 -mt-12 w-36 h-36 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-36 h-36 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="text-center border-b border-amber-400/20 pb-4 mb-4">
        <div className="flex items-center justify-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" /> Navrachana University Cultural
        </div>
        <h2 className="text-2xl font-black text-amber-300 tracking-wider mt-1">
          NUV KHELAIYA
        </h2>
        <p className="text-rose-200/80 text-xs font-medium">Garba Mahotsav 2026</p>
      </div>

      {/* QR Code container */}
      <div className="relative bg-white p-4 rounded-2xl shadow-inner max-w-[240px] mx-auto flex items-center justify-center aspect-square">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`QR for ${attendee.ticket_id}`}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm animate-pulse">
            Generating QR...
          </div>
        )}
      </div>

      {/* Ticket Details */}
      <div className="mt-5 space-y-3 text-center">
        {attendee.name && !attendee.name.startsWith('Pass #') ? (
          <div>
            <span className="text-[11px] uppercase tracking-wider text-amber-300/70 block">
              Attendee Name
            </span>
            <p className="text-xl font-bold text-white tracking-wide">{attendee.name}</p>
          </div>
        ) : (
          <div>
            <span className="text-[11px] uppercase tracking-wider text-amber-300/70 block">
              Event Pass Badge
            </span>
            <p className="text-2xl font-black text-amber-300 tracking-wider">
              {attendee.pass_number
                ? `PASS #${String(attendee.pass_number).padStart(4, '0')}`
                : attendee.name}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-left">
          <div className="bg-white/5 rounded-xl p-2.5">
            <span className="text-[10px] uppercase tracking-wider text-amber-300/60 block">
              {attendee.pass_number ? 'Pass Code' : 'Enrollment'}
            </span>
            <p className="text-sm font-semibold font-mono text-amber-200">
              {attendee.enrollment || `PASS-${String(attendee.pass_number || 1).padStart(4, '0')}`}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5">
            <span className="text-[10px] uppercase tracking-wider text-amber-300/60 block">
              Pass Status
            </span>
            <div
              className={`flex items-center gap-1 text-sm font-semibold capitalize ${
                attendee.status === 'entered'
                  ? 'text-sky-300'
                  : attendee.status === 'activated'
                  ? 'text-emerald-300'
                  : attendee.status === 'revoked'
                  ? 'text-rose-400'
                  : 'text-amber-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {attendee.status === 'entered'
                ? 'Entered'
                : attendee.status === 'activated'
                ? 'Activated'
                : attendee.status === 'revoked'
                ? 'Revoked'
                : 'Awaiting Activation'}
            </div>
          </div>
        </div>

        {/* Ticket ID barcode tag */}
        <div className="mt-3 bg-black/40 border border-amber-400/30 rounded-xl py-2 px-3">
          <span className="text-[9px] uppercase tracking-widest text-slate-400 block">
            Official Ticket ID
          </span>
          <p className="font-mono font-bold text-amber-400 tracking-widest text-sm">
            {attendee.ticket_id}
          </p>
        </div>
      </div>

      {/* Actions */}
      {showDownload && (
        <div className="mt-5 flex gap-2 print:hidden">
          <button
            onClick={handleDownload}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg text-sm"
          >
            <Download className="w-4 h-4" /> Download QR
          </button>
        </div>
      )}
    </div>
  );
}
