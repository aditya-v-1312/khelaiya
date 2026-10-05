'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  Download,
  QrCode,
  Sparkles,
  Sliders,
  Type,
  FileArchive,
  Eye,
  RefreshCw,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Image as ImageIcon,
  Printer,
  ChevronLeft,
  ChevronRight,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface OverlayConfig {
  qrX: number; // percentage (0 to 100)
  qrY: number; // percentage (0 to 100)
  qrSize: number; // percentage of template width (5 to 50)
  qrBgPad: boolean; // white padding behind QR
  qrPadSize: number; // padding in px (scaled)
  qrDarkColor: string;
  qrLightColor: string;

  // Pass Number Text
  showPassText: boolean;
  passTextX: number; // percentage (0 to 100)
  passTextY: number; // percentage (0 to 100)
  passTextFormat: 'PASS_HASH' | 'HASH_ONLY' | 'PASS_SPACE' | 'NUMBER_ONLY';
  passFontSize: number; // base px at 1000px width
  passFontColor: string;
  passFontWeight: 'bold' | '900' | '600';
  passTextAlign: 'center' | 'left' | 'right';

  // Ticket ID Text
  showTicketId: boolean;
  ticketIdX: number;
  ticketIdY: number;
  ticketIdFontSize: number;
  ticketIdColor: string;
}

const DEFAULT_CONFIG: OverlayConfig = {
  qrX: 82,
  qrY: 50,
  qrSize: 22,
  qrBgPad: true,
  qrPadSize: 8,
  qrDarkColor: '#000000',
  qrLightColor: '#ffffff',

  showPassText: true,
  passTextX: 82,
  passTextY: 82,
  passTextFormat: 'PASS_HASH',
  passFontSize: 24,
  passFontColor: '#fbbf24', // amber gold
  passFontWeight: '900',
  passTextAlign: 'center',

  showTicketId: false,
  ticketIdX: 82,
  ticketIdY: 88,
  ticketIdFontSize: 14,
  ticketIdColor: '#ffffff',
};

export default function TicketTemplateStudioPage() {
  const [templateImage, setTemplateImage] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({
    width: 1200,
    height: 600,
  });
  const [config, setConfig] = useState<OverlayConfig>(DEFAULT_CONFIG);
  const [previewPassNumber, setPreviewPassNumber] = useState<number>(1);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'qr' | 'text' | 'export'>('qr');

  // Dragging state for visual editor
  const [isDraggingQR, setIsDraggingQR] = useState(false);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Bulk Export State
  const [exportStart, setExportStart] = useState<number>(1);
  const [exportEnd, setExportEnd] = useState<number>(1500);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{
    current: number;
    total: number;
    status: string;
  }>({ current: 0, total: 0, status: '' });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const templateImgRef = useRef<HTMLImageElement | null>(null);

  // Load saved config on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedConfig = localStorage.getItem('khelaiya_template_config');
      if (savedConfig) {
        try {
          setConfig(JSON.parse(savedConfig));
        } catch {}
      }

      // Check for saved template image
      const savedTemplate = localStorage.getItem('khelaiya_template_image');
      if (savedTemplate) {
        setTemplateImage(savedTemplate);
        const img = new Image();
        img.onload = () => {
          setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          templateImgRef.current = img;
        };
        img.src = savedTemplate;
      } else {
        // Generate sleek default sample template
        generateDefaultTemplate();
      }
    }
  }, []);

  // Save config when changed
  const updateConfig = (updater: Partial<OverlayConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updater };
      if (typeof window !== 'undefined') {
        localStorage.setItem('khelaiya_template_config', JSON.stringify(next));
      }
      return next;
    });
  };

  // Generate built-in high-res sample template if user hasn't uploaded one
  const generateDefaultTemplate = () => {
    const width = 1200;
    const height = 500;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background gradient: Rich Royal Gujarati Maroon / Purple
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#3b0728');
    grad.addColorStop(0.5, '#200318');
    grad.addColorStop(1, '#0e010b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Decorative Borders
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(26, 26, width - 52, height - 52);

    // Left Accent Glow
    const glow = ctx.createRadialGradient(250, 250, 20, 250, 250, 350);
    glow.addColorStop(0, 'rgba(245, 158, 11, 0.2)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // Header Badge Text
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('NAVRACHANA UNIVERSITY CULTURAL COMMITTEE PRESENTS', 60, 90);

    // Main Title
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 68px sans-serif';
    ctx.fillText('NUV KHELAIYA 2026', 60, 170);

    // Subtitle
    ctx.fillStyle = '#fbcfe8';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('GRAND GARBA MAHOTSAV · OFFICIAL ENTRY PASS', 60, 220);

    // Divider
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 250);
    ctx.lineTo(680, 250);
    ctx.stroke();

    // Event Details
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('📍 University Football Ground · Vadodara', 60, 295);
    ctx.fillText('⏰ Gates Open: 7:00 PM  |  Valid for Single Admission', 60, 335);

    // Instruction Note
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '16px sans-serif';
    ctx.fillText('• Must be activated at Ticket Distribution Desk before gate entry.', 60, 395);
    ctx.fillText('• Security QR will be scanned upon arrival.', 60, 425);

    // Dotted Tear Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(760, 20);
    ctx.lineTo(760, height - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // Right Stub Header
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SECURITY BADGE', 980, 80);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('Scan at Gate', 980, 110);
    ctx.textAlign = 'left';

    const dataUrl = canvas.toDataURL('image/png');
    setTemplateImage(dataUrl);
    setImageDimensions({ width, height });

    const img = new Image();
    img.onload = () => {
      templateImgRef.current = img;
    };
    img.src = dataUrl;
  };

  // Upload user's custom ticket image template
  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        setTemplateImage(dataUrl);
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        templateImgRef.current = img;

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('khelaiya_template_image', dataUrl);
          } catch {
            console.warn('Image too large to store in localStorage; kept in session memory.');
          }
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Format Pass Number Text
  const formatPassText = (num: number, format: OverlayConfig['passTextFormat']) => {
    const pad = String(num).padStart(4, '0');
    switch (format) {
      case 'PASS_HASH':
        return `PASS #${pad}`;
      case 'HASH_ONLY':
        return `#${pad}`;
      case 'PASS_SPACE':
        return `Pass ${num}`;
      case 'NUMBER_ONLY':
        return pad;
      default:
        return `PASS #${pad}`;
    }
  };

  // Composite single ticket on canvas at full native resolution
  const renderCompositeTicket = useCallback(
    async (passNumber: number): Promise<string> => {
      const img = templateImgRef.current;
      if (!img) return '';

      const width = img.naturalWidth || imageDimensions.width;
      const height = img.naturalHeight || imageDimensions.height;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      // 1. Draw base template image
      ctx.drawImage(img, 0, 0, width, height);

      // 2. Compute absolute coordinates
      const qrBoxWidth = (width * config.qrSize) / 100;
      const qrBoxHeight = qrBoxWidth; // square QR
      const qrCenterX = (width * config.qrX) / 100;
      const qrCenterY = (height * config.qrY) / 100;
      const qrLeft = qrCenterX - qrBoxWidth / 2;
      const qrTop = qrCenterY - qrBoxHeight / 2;

      // 3. Draw white background pad behind QR if enabled
      if (config.qrBgPad) {
        const pad = (width * config.qrPadSize) / 1000;
        ctx.fillStyle = config.qrLightColor || '#ffffff';
        const radius = Math.min(16, pad * 1.5);

        ctx.beginPath();
        ctx.roundRect(qrLeft - pad, qrTop - pad, qrBoxWidth + pad * 2, qrBoxHeight + pad * 2, radius);
        ctx.fill();

        // Subtle border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 4. Generate high-resolution QR code
      const padNum = String(passNumber).padStart(4, '0');
      const ticketId = `NUV-KHL-${padNum}`;

      const qrDataUrl = await QRCode.toDataURL(ticketId, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: Math.max(256, Math.floor(qrBoxWidth * 2)),
        color: {
          dark: config.qrDarkColor || '#000000',
          light: config.qrLightColor || '#ffffff',
        },
      });

      const qrImg = await new Promise<HTMLImageElement>((resolve) => {
        const qr = new Image();
        qr.onload = () => resolve(qr);
        qr.src = qrDataUrl;
      });

      ctx.drawImage(qrImg, qrLeft, qrTop, qrBoxWidth, qrBoxHeight);

      // 5. Draw Pass Number text
      if (config.showPassText) {
        const textX = (width * config.passTextX) / 100;
        const textY = (height * config.passTextY) / 100;
        const scaledFontSize = (width * config.passFontSize) / 1000;

        ctx.font = `${config.passFontWeight} ${scaledFontSize}px sans-serif`;
        ctx.fillStyle = config.passFontColor;
        ctx.textAlign = config.passTextAlign;
        ctx.textBaseline = 'middle';

        // Subtle drop shadow for legibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;

        const text = formatPassText(passNumber, config.passTextFormat);
        ctx.fillText(text, textX, textY);

        ctx.shadowColor = 'transparent';
      }

      // 6. Draw Ticket ID text
      if (config.showTicketId) {
        const idX = (width * config.ticketIdX) / 100;
        const idY = (height * config.ticketIdY) / 100;
        const scaledIdSize = (width * config.ticketIdFontSize) / 1000;

        ctx.font = `bold ${scaledIdSize}px monospace`;
        ctx.fillStyle = config.ticketIdColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ticketId, idX, idY);
      }

      return canvas.toDataURL('image/png');
    },
    [config, imageDimensions]
  );

  // Update live preview when config or preview pass changes
  useEffect(() => {
    let active = true;
    renderCompositeTicket(previewPassNumber).then((url) => {
      if (active) setPreviewDataUrl(url);
    });
    return () => {
      active = false;
    };
  }, [renderCompositeTicket, previewPassNumber]);

  // Download Single Sample Ticket
  const downloadSampleTicket = () => {
    if (!previewDataUrl) return;
    const a = document.createElement('a');
    a.href = previewDataUrl;
    a.download = `Ticket_Pass_${String(previewPassNumber).padStart(4, '0')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Bulk Batch ZIP Generator (Runs client-side using JSZip & Canvas)
  const handleBulkExport = async () => {
    if (exportStart < 1 || exportEnd < exportStart) {
      alert('Please enter a valid pass range.');
      return;
    }

    const total = exportEnd - exportStart + 1;
    if (
      !confirm(
        `Generate and package ${total} composite tickets (Pass #${String(exportStart).padStart(
          4,
          '0'
        )} to #${String(exportEnd).padStart(4, '0')}) into a ZIP file?`
      )
    ) {
      return;
    }

    setIsExporting(true);
    setExportProgress({ current: 0, total, status: 'Initializing generator...' });

    const zip = new JSZip();
    const folder = zip.folder(`Tickets_${exportStart}_to_${exportEnd}`);

    try {
      const batchSize = 10;
      for (let i = exportStart; i <= exportEnd; i++) {
        const pad = String(i).padStart(4, '0');
        setExportProgress({
          current: i - exportStart + 1,
          total,
          status: `Compositing Ticket Pass #${pad}...`,
        });

        const dataUrl = await renderCompositeTicket(i);
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        folder?.file(`Pass_${pad}.png`, base64Data, { base64: true });

        // Yield execution to keep UI responsive
        if (i % batchSize === 0) {
          await new Promise((r) => setTimeout(r, 10));
        }
      }

      setExportProgress({ current: total, total, status: 'Compressing ZIP package...' });

      const zipBlob = await zip.generateAsync(
        { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
        (meta) => {
          setExportProgress({
            current: total,
            total,
            status: `Packaging ZIP: ${meta.percent.toFixed(0)}%`,
          });
        }
      );

      // Trigger automatic browser download
      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `NUV_Khelaiya_Printed_Tickets_${exportStart}_to_${exportEnd}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      alert(`✅ Success! Downloaded ${total} composite printed ticket passes!`);
    } catch (err) {
      console.error('Bulk generation error:', err);
      alert('Failed during bulk generation. Check console for details.');
    } finally {
      setIsExporting(false);
      setExportProgress({ current: 0, total: 0, status: '' });
    }
  };

  // Mouse / Touch handlers for visual canvas interaction
  const handlePreviewMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = previewContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    // Check if clicked near QR code
    const qrDist = Math.hypot(clickX - config.qrX, clickY - config.qrY);
    if (qrDist < config.qrSize / 2 + 5) {
      setIsDraggingQR(true);
      return;
    }

    // Check if clicked near Pass text
    if (config.showPassText) {
      const textDist = Math.hypot(clickX - config.passTextX, clickY - config.passTextY);
      if (textDist < 8) {
        setIsDraggingText(true);
        return;
      }
    }
  };

  const handlePreviewMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = previewContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const newX = Math.max(5, Math.min(95, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const newY = Math.max(5, Math.min(95, Math.round(((e.clientY - rect.top) / rect.height) * 100)));

    if (isDraggingQR) {
      updateConfig({ qrX: newX, qrY: newY });
    } else if (isDraggingText) {
      updateConfig({ passTextX: newX, passTextY: newY });
    }
  };

  const handlePreviewMouseUp = () => {
    setIsDraggingQR(false);
    setIsDraggingText(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/admin/qr"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to QR Center
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-amber-400 tracking-wide flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-amber-400" />
            Ticket Template Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Upload your physical ticket artwork, drag the QR code to your chosen spot, and generate 1,500 print-ready tickets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadSampleTicket}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs sm:text-sm transition flex items-center gap-2 border border-white/10"
          >
            <Download className="w-4 h-4 text-amber-400" />
            Download Sample (PNG)
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center gap-2"
          >
            <FileArchive className="w-4 h-4" />
            Bulk Export All (ZIP)
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Placement Canvas (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
            {/* Visual Editor Toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold text-amber-300 tracking-wider">
                  Interactive Preview
                </span>
                <span className="text-[11px] text-slate-400">
                  ({imageDimensions.width} × {imageDimensions.height} px)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <label className="cursor-pointer px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" /> Upload Your Template
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleTemplateUpload}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={generateDefaultTemplate}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition"
                  title="Reset to default NUV sample template"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Visual Canvas Viewport with Draggable Overlay */}
            <div
              ref={previewContainerRef}
              onMouseDown={handlePreviewMouseDown}
              onMouseMove={handlePreviewMouseMove}
              onMouseUp={handlePreviewMouseUp}
              onMouseLeave={handlePreviewMouseUp}
              className="relative w-full rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 bg-black flex items-center justify-center cursor-crosshair select-none aspect-video max-h-[500px]"
            >
              {previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt="Composite Ticket Preview"
                  className="w-full h-full object-contain pointer-events-none"
                />
              ) : (
                <div className="text-slate-500 text-sm flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  Generating preview...
                </div>
              )}

              {/* Helper Drag Overlay Callout */}
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-amber-200 font-semibold border border-white/10 pointer-events-none flex items-center gap-1.5">
                <Sliders className="w-3 h-3 text-amber-400" /> Click or drag on the spot to reposition
              </div>

              {/* Visual Spot Target Box Guide */}
              <div
                style={{
                  left: `${config.qrX}%`,
                  top: `${config.qrY}%`,
                  width: `${config.qrSize}%`,
                  aspectRatio: '1',
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute border-2 border-amber-400 border-dashed rounded-xl pointer-events-none transition-all ${
                  isDraggingQR ? 'bg-amber-400/20 shadow-[0_0_20px_#febf4a]' : 'bg-amber-400/5'
                }`}
              >
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                  QR CODE SPOT
                </div>
              </div>
            </div>

            {/* Pass Navigation & Live Tester */}
            <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-2xl p-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewPassNumber((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                  title="Previous pass"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-semibold">Testing Pass:</span>
                  <input
                    type="number"
                    min={1}
                    max={1500}
                    value={previewPassNumber}
                    onChange={(e) =>
                      setPreviewPassNumber(Math.max(1, Math.min(1500, Number(e.target.value) || 1)))
                    }
                    className="w-16 bg-slate-950 border border-white/20 rounded-lg px-2 py-1 text-center font-bold text-amber-300 font-mono"
                  />
                  <span className="text-slate-500">of 1,500</span>
                </div>

                <button
                  onClick={() => setPreviewPassNumber((p) => Math.min(1500, p + 1))}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                  title="Next pass"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-emerald-400 font-bold">
                  {`NUV-KHL-${String(previewPassNumber).padStart(4, '0')}`}
                </span>
                <button
                  onClick={downloadSampleTicket}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Save PNG
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Position & Styling Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Controls Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-white/5 border border-white/10 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('qr')}
              className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'qr'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" /> QR Spot
            </button>

            <button
              onClick={() => setActiveTab('text')}
              className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'text'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Type className="w-3.5 h-3.5" /> Pass Text
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'export'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <FileArchive className="w-3.5 h-3.5" /> Bulk Export
            </button>
          </div>

          {/* TAB 1: QR CODE PLACEMENT */}
          {activeTab === 'qr' && (
            <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-5 shadow-xl space-y-5 animate-in fade-in">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-amber-400" /> Position & Size QR Code
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Adjust where the QR code stamps onto your ticket design.
                </p>
              </div>

              {/* Position X Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-semibold">Horizontal Position (X)</span>
                  <span className="font-mono text-amber-400 font-bold">{config.qrX}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.qrX}
                  onChange={(e) => updateConfig({ qrX: Number(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Position Y Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-semibold">Vertical Position (Y)</span>
                  <span className="font-mono text-amber-400 font-bold">{config.qrY}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.qrY}
                  onChange={(e) => updateConfig({ qrY: Number(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* QR Size Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-semibold">QR Code Size</span>
                  <span className="font-mono text-amber-400 font-bold">{config.qrSize}% of width</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="45"
                  value={config.qrSize}
                  onChange={(e) => updateConfig({ qrSize: Number(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* White Background Pad Toggle */}
              <div className="pt-2 border-t border-white/10 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      White QR Background Pad
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Recommended: adds solid white pad behind QR so dark artwork doesn&apos;t interfere with scanners.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.qrBgPad}
                    onChange={(e) => updateConfig({ qrBgPad: e.target.checked })}
                    className="w-5 h-5 accent-amber-400 rounded cursor-pointer"
                  />
                </label>

                {config.qrBgPad && (
                  <div className="space-y-1.5 pl-2 border-l-2 border-amber-400/30">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Pad Thickness</span>
                      <span className="font-mono text-amber-400">{config.qrPadSize} px</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="20"
                      value={config.qrPadSize}
                      onChange={(e) => updateConfig({ qrPadSize: Number(e.target.value) })}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PASS NUMBER TEXT */}
          {activeTab === 'text' && (
            <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-5 shadow-xl space-y-5 animate-in fade-in">
              <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                    <Type className="w-4 h-4 text-amber-400" /> Print Pass Number
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Overlay unique &quot;PASS #0001&quot; text onto ticket.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={config.showPassText}
                  onChange={(e) => updateConfig({ showPassText: e.target.checked })}
                  className="w-5 h-5 accent-amber-400 rounded cursor-pointer"
                />
              </div>

              {config.showPassText ? (
                <>
                  {/* Format Selector */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Text Format
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          ['PASS_HASH', 'PASS #0001'],
                          ['HASH_ONLY', '#0001'],
                          ['PASS_SPACE', 'Pass 1'],
                          ['NUMBER_ONLY', '0001'],
                        ] as const
                      ).map(([fmt, label]) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => updateConfig({ passTextFormat: fmt })}
                          className={`py-2 px-2.5 rounded-xl text-xs font-mono font-bold transition border ${
                            config.passTextFormat === fmt
                              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Position X */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-semibold">Text Horizontal (X)</span>
                      <span className="font-mono text-amber-400 font-bold">{config.passTextX}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={config.passTextX}
                      onChange={(e) => updateConfig({ passTextX: Number(e.target.value) })}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  {/* Text Position Y */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-semibold">Text Vertical (Y)</span>
                      <span className="font-mono text-amber-400 font-bold">{config.passTextY}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={config.passTextY}
                      onChange={(e) => updateConfig({ passTextY: Number(e.target.value) })}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  {/* Font Size */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-semibold">Font Size</span>
                      <span className="font-mono text-amber-400 font-bold">{config.passFontSize} px</span>
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="64"
                      value={config.passFontSize}
                      onChange={(e) => updateConfig({ passFontSize: Number(e.target.value) })}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  {/* Font Color */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Font Color
                    </label>
                    <div className="flex items-center gap-2">
                      {(['#fbbf24', '#ffffff', '#000000', '#f43f5e', '#38bdf8'] as const).map(
                        (col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => updateConfig({ passFontColor: col })}
                            style={{ backgroundColor: col }}
                            className={`w-7 h-7 rounded-full border-2 transition ${
                              config.passFontColor === col
                                ? 'border-amber-400 scale-110 shadow-lg'
                                : 'border-white/30 hover:scale-105'
                            }`}
                          />
                        )
                      )}
                      <input
                        type="color"
                        value={config.passFontColor}
                        onChange={(e) => updateConfig({ passFontColor: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-white/20"
                        title="Pick custom hex color"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center">
                  Pass number text overlay is turned off. Only the QR code will be stamped.
                </p>
              )}
            </div>
          )}

          {/* TAB 3: BULK BATCH EXPORT (1 to 1500) */}
          {activeTab === 'export' && (
            <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-5 shadow-xl space-y-5 animate-in fade-in">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <FileArchive className="w-4 h-4 text-amber-400" /> Export Print-Ready Tickets
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Package all 1,500 composite ticket images into high-resolution ZIP archives.
                </p>
              </div>

              {/* Range Presets */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Batch Presets
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setExportStart(1);
                      setExportEnd(100);
                    }}
                    className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-bold transition text-amber-300"
                  >
                    1 to 100 (Quick Sample)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportStart(1);
                      setExportEnd(500);
                    }}
                    className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-bold transition text-amber-300"
                  >
                    Batch 1 (1 to 500)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportStart(501);
                      setExportEnd(1000);
                    }}
                    className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-bold transition text-amber-300"
                  >
                    Batch 2 (501 to 1000)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportStart(1);
                      setExportEnd(1500);
                    }}
                    className="py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 font-black transition text-amber-300"
                  >
                    ⭐ All 1,500 Passes
                  </button>
                </div>
              </div>

              {/* Custom Range */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Start Pass #
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1500}
                    value={exportStart}
                    onChange={(e) => setExportStart(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    End Pass #
                  </label>
                  <input
                    type="number"
                    min={exportStart}
                    max={1500}
                    value={exportEnd}
                    onChange={(e) => setExportEnd(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* Progress Bar during Export */}
              {isExporting && (
                <div className="space-y-2 p-3 bg-black/40 border border-amber-500/30 rounded-2xl animate-pulse">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-amber-300">{exportProgress.status}</span>
                    <span className="font-mono text-white">
                      {exportProgress.current} / {exportProgress.total} (
                      {Math.round((exportProgress.current / exportProgress.total) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-400 to-amber-500 h-2.5 rounded-full transition-all duration-150"
                      style={{
                        width: `${Math.round((exportProgress.current / exportProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Big Action Button */}
              <button
                type="button"
                onClick={handleBulkExport}
                disabled={isExporting}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-slate-950 font-black rounded-xl text-sm transition shadow-xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                {isExporting
                  ? 'Generating Tickets...'
                  : `Export ${exportEnd - exportStart + 1} Tickets (ZIP)`}
              </button>

              <p className="text-[11px] text-slate-400 text-center">
                Runs securely in your browser at full native resolution ({imageDimensions.width} ×{' '}
                {imageDimensions.height} px). Zero server bandwidth limits.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
