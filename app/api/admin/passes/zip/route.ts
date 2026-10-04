import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import QRCode from 'qrcode';
import { getAttendees } from '@/lib/supabase/db';

export async function GET() {
  try {
    const zip = new JSZip();
    const folder = zip.folder('NUV_Khelaiya_Pass_QRs');
    const diskDir = path.join(process.cwd(), 'generated_qrs');

    // 1. If files already exist in generated_qrs on disk, package directly (ultra fast)
    if (fs.existsSync(diskDir)) {
      const files = fs
        .readdirSync(diskDir)
        .filter((f) => f.toLowerCase().endsWith('.png'))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      if (files.length > 0) {
        for (const file of files) {
          const content = fs.readFileSync(path.join(diskDir, file));
          folder?.file(file, content);
        }

        const zipBuffer = await zip.generateAsync({
          type: 'nodebuffer',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        });

        return new NextResponse(new Uint8Array(zipBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="NUV_Khelaiya_All_${files.length}_Pass_QRs.zip"`,
            'Cache-Control': 'no-cache',
          },
        });
      }
    }

    // 2. Otherwise generate from attendees database
    const { attendees } = await getAttendees({ limit: 2000 });
    const count = attendees.length > 0 ? attendees.length : 1500;

    for (let i = 1; i <= count; i++) {
      const pad = String(i).padStart(4, '0');
      const ticketId = attendees[i - 1]?.ticket_id || `NUV-KHL-${pad}`;
      const buf = await QRCode.toBuffer(ticketId, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 512,
        color: { dark: '#000000', light: '#ffffff' },
      });
      folder?.file(`Pass_${pad}.png`, buf);
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="NUV_Khelaiya_All_${count}_Pass_QRs.zip"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: unknown) {
    console.error('Server ZIP error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to generate ZIP archive' },
      { status: 500 }
    );
  }
}
