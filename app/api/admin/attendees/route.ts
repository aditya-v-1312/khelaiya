import { NextRequest, NextResponse } from 'next/server';
import { getAttendees } from '@/lib/supabase/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await getAttendees({ search, status, limit, offset });
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    console.error('Attendees API error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch attendees' },
      { status: 500 }
    );
  }
}
