'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, RefreshCw, AlertCircle, Zap, ShieldCheck } from 'lucide-react';

interface ScannerProps {
  onScan: (decodedText: string) => Promise<void>;
  isProcessing: boolean;
  disabled?: boolean;
}

export default function ScannerComponent({ onScan, isProcessing, disabled }: ScannerProps) {
  const [scannerStarted, setScannerStarted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isLockedRef = useRef(false);
  const containerId = 'qr-reader-container';

  // Keep lock ref synchronized
  useEffect(() => {
    isLockedRef.current = isProcessing || !!disabled;
  }, [isProcessing, disabled]);

  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      // Prevent rapid duplicate firings while processing
      if (isLockedRef.current) return;
      isLockedRef.current = true;

      try {
        await onScan(decodedText.trim());
      } catch (err) {
        console.error('Scan handling failed:', err);
      }
    },
    [onScan]
  );

  const startScanner = useCallback(
    async (cameraId?: string) => {
      try {
        setCameraError(null);

        if (!html5QrCodeRef.current) {
          html5QrCodeRef.current = new Html5Qrcode(containerId, {
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            verbose: false,
          });
        }

        const scanner = html5QrCodeRef.current;
        if (scanner.isScanning) {
          await scanner.stop();
        }

        const cameraConfig = cameraId
          ? { deviceId: { exact: cameraId } }
          : { facingMode: 'environment' };

        await scanner.start(
          cameraConfig,
          {
            fps: 15,
            qrbox: { width: 260, height: 260 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          () => {
            // Frame scanned without QR, ignore silently
          }
        );

        setScannerStarted(true);

        // Check if torch is supported
        try {
          const capabilities = scanner.getRunningTrackCapabilities();
          if (capabilities && 'torch' in capabilities) {
            setHasTorch(true);
          }
        } catch {
          setHasTorch(false);
        }
      } catch (err: unknown) {
        console.error('Error starting camera:', err);
        const errMsg = (err as Error)?.message || 'Failed to start camera.';
        if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission')) {
          setCameraError('Camera access denied. Please allow camera permissions in your browser.');
        } else {
          setCameraError(`Camera error: ${errMsg}. Make sure you are using HTTPS or localhost.`);
        }
        setScannerStarted(false);
      }
    },
    [handleScanSuccess]
  );

  const stopScanner = useCallback(async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
      setScannerStarted(false);
    } catch (e) {
      console.warn('Error stopping scanner:', e);
    }
  }, []);

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as MediaTrackConstraintSet],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Could not toggle torch:', err);
    }
  };

  // Initialize camera list on mount
  useEffect(() => {
    let mounted = true;

    async function initCameras() {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (mounted && devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back/environment camera
          const backCam = devices.find((d) =>
            d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')
          );
          const defaultId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(defaultId);
          startScanner(defaultId);
        } else if (mounted) {
          startScanner();
        }
      } catch {
        if (mounted) startScanner();
      }
    }

    initCameras();

    return () => {
      mounted = false;
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [startScanner]);

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Viewport Card */}
      <div className="relative w-full max-w-md aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-500/30">
        {/* Html5Qrcode target element */}
        <div id={containerId} className="w-full h-full object-cover" />

        {/* Target Frame Overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative w-64 h-64 border-2 border-amber-400/40 rounded-2xl">
            {/* Corner accents */}
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-amber-400 rounded-tl-xl" />
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-amber-400 rounded-tr-xl" />
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-amber-400 rounded-bl-xl" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-amber-400 rounded-br-xl" />

            {/* Scanning line animation */}
            {scannerStarted && !isProcessing && (
              <div className="absolute inset-x-2 top-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#febf4a] animate-bounce" />
            )}
          </div>
        </div>

        {/* Processing Spinner Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-20">
            <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-amber-200 font-bold text-lg tracking-wider uppercase">
              Verifying Ticket...
            </p>
          </div>
        )}

        {/* Camera Error Message */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-30">
            <AlertCircle className="w-14 h-14 text-rose-500 mb-3" />
            <h4 className="text-white font-bold text-lg mb-1">Camera Access Issue</h4>
            <p className="text-rose-200 text-sm mb-4">{cameraError}</p>
            <button
              onClick={() => startScanner(selectedCameraId)}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
          </div>
        )}
      </div>

      {/* Controls under scanner */}
      <div className="w-full max-w-md mt-4 flex items-center justify-between gap-3 px-2">
        {hasTorch && (
          <button
            onClick={toggleTorch}
            className={`p-3 rounded-2xl flex items-center gap-2 text-sm font-semibold transition ${
              torchOn
                ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Zap className="w-5 h-5" />
            {torchOn ? 'Torch On' : 'Torch'}
          </button>
        )}

        {cameras.length > 1 && (
          <button
            onClick={() => {
              const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
              const nextId = cameras[(currentIndex + 1) % cameras.length].id;
              setSelectedCameraId(nextId);
              startScanner(nextId);
            }}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl flex items-center gap-2 text-sm font-semibold transition"
          >
            <Camera className="w-5 h-5 text-amber-400" /> Switch Camera
          </button>
        )}

        <button
          onClick={() => (scannerStarted ? stopScanner() : startScanner(selectedCameraId))}
          className={`ml-auto p-3 rounded-2xl text-sm font-semibold transition flex items-center gap-2 ${
            scannerStarted
              ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
              : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          {scannerStarted ? 'Pause Camera' : 'Resume Camera'}
        </button>
      </div>
    </div>
  );
}
