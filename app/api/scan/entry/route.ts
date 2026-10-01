import { NextRequest, NextResponse } from 'next/server';
import { recordQREntry } from '@/lib/supabase/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticketId, gate, scannerId } = body;

    if (!ticketId || typeof ticketId !== 'string') {
      return NextResponse.json(
        { success: false, result: 'invalid', message: 'Missing or invalid ticket ID' },
        { status: 400 }
      );
    }

    if (!gate || !scannerId) {
      return NextResponse.json(
        { success: false, result: 'error', message: 'Gate and Scanner ID are required' },
        { status: 400 }
      );
    }

    const result = await recordQREntry({
      ticketId: ticketId.trim(),
      gate: String(gate),
      scannerId: String(scannerId),
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Scan Entry API Error:', error);
    return NextResponse.json(
      { success: false, result: 'error', message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
