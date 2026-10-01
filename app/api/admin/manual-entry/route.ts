import { NextRequest, NextResponse } from 'next/server';
import { recordManualEntry } from '@/lib/supabase/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { attendeeId, gate, scannerId, adminNote } = body;

    if (!attendeeId) {
      return NextResponse.json(
        { success: false, message: 'Attendee ID is required' },
        { status: 400 }
      );
    }

    const result = await recordManualEntry({
      attendeeId,
      gate: gate || 'Gate 1',
      scannerId: scannerId || 'Admin-Desk',
      adminNote: adminNote || 'Manual entry approved by Admin',
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Manual Entry API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process manual entry' },
      { status: 500 }
    );
  }
}
