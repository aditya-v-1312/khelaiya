import { NextRequest, NextResponse } from 'next/server';
import { reissueAttendeeTicket } from '@/lib/supabase/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { attendeeId, action } = body;

    if (!attendeeId || !action || !['reissue', 'revoke'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid attendee ID or action.' },
        { status: 400 }
      );
    }

    const res = await reissueAttendeeTicket(attendeeId, action);
    return NextResponse.json(res);
  } catch (error: unknown) {
    console.error('Reissue API error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update ticket.' },
      { status: 500 }
    );
  }
}
