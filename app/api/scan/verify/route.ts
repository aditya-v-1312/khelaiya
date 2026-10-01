import { NextRequest, NextResponse } from 'next/server';
import { verifyQR } from '@/lib/supabase/db';

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

    const result = await verifyQR({
      ticketId: ticketId.trim(),
      gate: gate ? String(gate) : 'Verification Gate',
      scannerId: scannerId ? String(scannerId) : 'V-Scanner',
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Verify API Error:', error);
    return NextResponse.json(
      { success: false, result: 'error', message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
