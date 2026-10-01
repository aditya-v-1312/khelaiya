import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NUV Khelaiya · QR Ticket & Entry Verification System',
  description:
    'Official high-security QR admission, duplicate detection, and live gate telemetry system for NUV Khelaiya Garba Mahotsav.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#170311',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="antialiased min-h-screen bg-[#0b0108] text-white">
        {children}
      </body>
    </html>
  );
}
