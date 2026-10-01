import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/supabase/db';

export async function GET() {
  try {
    const stats = await getDashboardStats();
    return NextResponse.json({ success: true, stats });
  } catch (error: unknown) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
