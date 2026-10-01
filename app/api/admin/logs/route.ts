import { NextRequest, NextResponse } from 'next/server';
import { getScanLogs } from '@/lib/supabase/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const gate = searchParams.get('gate') || '';
    const scannerId = searchParams.get('scannerId') || '';
    const result = searchParams.get('result') || '';
    const ticketId = searchParams.get('ticketId') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const format = searchParams.get('format') || 'json';

    const { logs, total } = await getScanLogs({ gate, scannerId, result, ticketId, limit, offset });

    if (format === 'csv') {
      const headers = ['Timestamp', 'Gate', 'Scanner', 'Ticket ID', 'Result', 'Scan Type', 'Attendee Name', 'Enrollment'];
      const rows = logs.map((l) => [
        `"${new Date(l.scanned_at).toLocaleString()}"`,
        `"${l.gate}"`,
        `"${l.scanner_id}"`,
        `"${l.ticket_id}"`,
        `"${l.result.toUpperCase()}"`,
        `"${l.scan_type}"`,
        `"${l.attendee?.name || ''}"`,
        `"${l.attendee?.enrollment || ''}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="nuv_khelaiya_scan_logs_${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, logs, total });
  } catch (error: unknown) {
    console.error('Logs API error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
