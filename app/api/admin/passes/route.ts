import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import {
  generateNumberedPasses,
  approveTicket,
  approveTicketRange,
  approveAllTickets,
  clearAllData,
} from '@/lib/supabase/db';

async function generateQRFilesOnDisk(count: number) {
  try {
    const outputDir = path.join(process.cwd(), 'generated_qrs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const batchSize = 50;
    for (let i = 1; i <= count; i += batchSize) {
      const batchPromises = [];
      const end = Math.min(i + batchSize - 1, count);
      for (let j = i; j <= end; j++) {
        const pad = String(j).padStart(4, '0');
        const ticketId = `NUV-KHL-${pad}`;
        const filePath = path.join(outputDir, `Pass_${pad}.png`);
        batchPromises.push(
          QRCode.toFile(filePath, ticketId, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 512,
            color: { dark: '#000000', light: '#ffffff' },
          })
        );
      }
      await Promise.all(batchPromises);
    }
  } catch (err) {
    console.warn('Could not save QR files to disk:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'clear') {
      const result = await clearAllData();
      return NextResponse.json(result);
    }

    if (action === 'generate') {
      const count = Number(body.count) || 1500;
      const initialStatus =
        body.initialStatus === 'activated' || body.initialStatus === 'approved'
          ? 'activated'
          : 'unactivated';
      
      // 1. Save passes to database
      const result = await generateNumberedPasses({ count, initialStatus });

      // 2. Automatically save PNG files to generated_qrs/ folder on disk in background
      generateQRFilesOnDisk(count).catch((err) =>
        console.warn('Background QR disk save warning:', err)
      );

      return NextResponse.json({
        success: true,
        ...result,
        diskSaved: true,
        diskPath: 'generated_qrs/',
      });
    }

    if (action === 'approve') {
      const { ticketIdOrPassNumber, scannerId, gate } = body;
      if (!ticketIdOrPassNumber) {
        return NextResponse.json(
          { success: false, message: 'Ticket ID or Pass Number is required' },
          { status: 400 }
        );
      }
      const result = await approveTicket({
        ticketIdOrPassNumber: String(ticketIdOrPassNumber),
        scannerId: scannerId || 'DESK-1',
        gate: gate || 'Helpdesk',
      });
      return NextResponse.json(result);
    }

    if (action === 'approve_range') {
      const startNumber = Number(body.startNumber) || 1;
      const endNumber = Number(body.endNumber) || 1500;
      const result = await approveTicketRange({ startNumber, endNumber });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'approve_all') {
      const result = await approveAllTickets();
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Passes API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
