import { NextRequest, NextResponse } from 'next/server';
import { importAttendeesBatch } from '@/lib/supabase/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rows } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No attendee rows provided.' },
        { status: 400 }
      );
    }

    // Validate and clean each row
    const cleanedRows: { name: string; enrollment: string; phone: string }[] = [];
    const seenEnrollments = new Set<string>();

    for (const r of rows) {
      const name = String(r.name || '').trim();
      const enrollment = String(r.enrollment || '').trim();
      let phone = String(r.phone || r['Mobile number'] || r.mobile || '').trim();

      // Normalize phone: strip spaces, dashes, +91 prefix
      phone = phone.replace(/\D/g, '');
      if (phone.length === 12 && phone.startsWith('91')) {
        phone = phone.slice(2);
      }

      if (name && enrollment && !seenEnrollments.has(enrollment)) {
        seenEnrollments.add(enrollment);
        cleanedRows.push({ name, enrollment, phone });
      }
    }

    const summary = await importAttendeesBatch(cleanedRows);

    return NextResponse.json({
      success: true,
      imported: summary.imported,
      alreadyExisted: summary.updated,
      errors: summary.errors,
      totalReceived: rows.length,
      message: `Successfully processed ${rows.length} rows. Imported: ${summary.imported}, Already existed: ${summary.updated}, Errors: ${summary.errors}`,
    });
  } catch (error: unknown) {
    console.error('Import API error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to import attendees' },
      { status: 500 }
    );
  }
}
