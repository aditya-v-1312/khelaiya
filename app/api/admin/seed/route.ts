import { NextRequest, NextResponse } from 'next/server';
import { seedTestData } from '@/lib/supabase/db';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const count = parseInt(searchParams.get('count') || '1500', 10);
    
    const result = await seedTestData(count);
    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${result.count} test attendees.`,
      count: result.count,
    });
  } catch (error: unknown) {
    console.error('Seed API error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to seed test data' },
      { status: 500 }
    );
  }
}
