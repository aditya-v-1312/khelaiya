'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, RefreshCw, AlertCircle, Zap, Image as ImageIcon, Keyboard } from 'lucide-react';

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
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualTicketId, setManualTicketId] = useState('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isLockedRef = useRef(false);
  const isStartingRef = useRef(false);
  const isMountedRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerId = 'qr-reader-container';

  // Synchronize lock status
  useEffect(() => {
    isLockedRef.current = isProcessing || !!disabled;
  }, [isProcessing, disabled]);

  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
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

  const stopScanner = useCallback(async () => {
    try {
      const scanner = html5QrCodeRef.current;
      if (scanner && scanner.isScanning) {
        await scanner.stop();
      }
    } catch (e) {
      // Ignore transition errors during stop
      console.warn('Scanner stop warning:', e);
    } finally {
      if (isMountedRef.current) {
        setScannerStarted(false);
      }
    }
  }, []);

  const startScanner = useCallback(
    async (cameraId?: string) => {
      // Prevent concurrent start calls
      if (isStartingRef.current) return;
      isStartingRef.current = true;

      try {
        if (!isMountedRef.current) return;
        setCameraError(null);

        // Ensure container DOM exists
        const container = document.getElementById(containerId);
        if (!container) {
          isStartingRef.current = false;
          return;
        }

        // Initialize or reuse Html5Qrcode instance
        if (!html5QrCodeRef.current) {
          html5QrCodeRef.current = new Html5Qrcode(containerId, {
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            verbose: false,
          });
        }

        const scanner = html5QrCodeRef.current;
        if (scanner.isScanning) {
          try {
            await scanner.stop();
          } catch {}
        }

        const qrConfig = {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        };

        const successCallback = (decodedText: string) => {
          handleScanSuccess(decodedText);
        };
        const errorCallback = () => {};

        // Try primary camera configuration
        try {
          if (cameraId) {
            await scanner.start({ deviceId: { exact: cameraId } }, qrConfig, successCallback, errorCallback);
          } else {
            // Prefer rear environment camera on phones
            await scanner.start({ facingMode: 'environment' }, qrConfig, successCallback, errorCallback);
          }
        } catch (firstErr) {
          console.warn('Environment camera start failed, attempting user-facing fallback:', firstErr);
          // Fallback to any available camera (e.g. Mac/laptop webcam)
          await scanner.start({ facingMode: 'user' }, qrConfig, successCallback, errorCallback);
        }

        if (isMountedRef.current) {
          setScannerStarted(true);

          // Check if torch/flashlight is supported
          try {
            const capabilities = scanner.getRunningTrackCapabilities();
            if (capabilities && 'torch' in capabilities) {
              setHasTorch(true);
            }
          } catch {
            setHasTorch(false);
          }
        }
      } catch (err: unknown) {
        console.error('Error starting camera:', err);
        if (isMountedRef.current) {
          const errMsg = (err as Error)?.message || 'Failed to start camera.';
          if (
            errMsg.includes('NotAllowedError') ||
            errMsg.includes('Permission') ||
            errMsg.includes('denied')
          ) {
            setCameraError(
              'Camera permission denied. Please allow camera access in your browser address bar (tap the lock/camera icon).'
            );
          } else if (errMsg.includes('NotFoundError') || errMsg.includes('no camera')) {
            setCameraError('No camera found on this device. You can test by uploading a QR image below.');
          } else {
            setCameraError(`Camera notice: ${errMsg}. Ensure no other app (e.g. Zoom, Meet) is using the camera.`);
          }
          setScannerStarted(false);
        }
      } finally {
        isStartingRef.current = false;
      }
    },
    [handleScanSuccess]
  );

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

  // Scan from uploaded file / photo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }
      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      if (decodedText) {
        handleScanSuccess(decodedText);
      }
    } catch (err) {
      alert('Could not detect a QR code in this image. Try another photo.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Manual ticket ID submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualTicketId.trim()) {
      handleScanSuccess(manualTicketId.trim());
      setManualTicketId('');
      setShowManualInput(false);
    }
  };

  // Mount effect
  useEffect(() => {
    isMountedRef.current = true;

    async function init() {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (isMountedRef.current && devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find(
            (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')
          );
          const defaultId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(defaultId);
          startScanner(defaultId);
          return;
        }
      } catch (err) {
        console.warn('getCameras failed, falling back to default start:', err);
      }

      if (isMountedRef.current) {
        startScanner();
      }
    }

    init();

    return () => {
      isMountedRef.current = false;
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
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
            <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-amber-200 font-bold text-lg tracking-wider uppercase">
              Verifying Ticket...
            </p>
          </div>
        )}

        {/* Camera Error Message with Helpful Fallbacks */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-30 space-y-4">
            <AlertCircle className="w-14 h-14 text-rose-500" />
            <div>
              <h4 className="text-white font-bold text-lg">Camera Access</h4>
              <p className="text-slate-300 text-xs mt-1 max-w-xs">{cameraError}</p>
            </div>

            <div className="flex flex-col gap-2 w-full max-w-xs">
              <button
                onClick={() => startScanner(selectedCameraId)}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Grant / Retry Camera
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-4 h-4 text-amber-400" /> Upload QR Image
              </button>

              <button
                onClick={() => setShowManualInput(true)}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2"
              >
                <Keyboard className="w-4 h-4 text-slate-400" /> Type Ticket ID
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input for QR image upload fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Controls under scanner */}
      <div className="w-full max-w-md mt-4 flex items-center justify-between gap-2 px-1">
        {hasTorch && (
          <button
            onClick={toggleTorch}
            className={`p-2.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition ${
              torchOn
                ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30 font-bold'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Zap className="w-4 h-4" />
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
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center gap-1.5 text-xs font-semibold transition"
          >
            <Camera className="w-4 h-4 text-amber-400" /> Flip
          </button>
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center gap-1.5 text-xs font-semibold transition"
          title="Scan QR from photo"
        >
          <ImageIcon className="w-4 h-4 text-emerald-400" /> Photo
        </button>

        <button
          onClick={() => setShowManualInput((prev) => !prev)}
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center gap-1.5 text-xs font-semibold transition"
          title="Manual code entry"
        >
          <Keyboard className="w-4 h-4 text-amber-300" /> Type ID
        </button>

        <button
          onClick={() => (scannerStarted ? stopScanner() : startScanner(selectedCameraId))}
          className={`ml-auto p-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
            scannerStarted
              ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
              : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {scannerStarted ? 'Pause' : 'Resume'}
        </button>
      </div>

      {/* Manual Ticket Input Dropdown */}
      {showManualInput && (
        <form
          onSubmit={handleManualSubmit}
          className="w-full max-w-md mt-3 flex gap-2 p-3 bg-slate-900 border border-amber-500/30 rounded-2xl animate-in fade-in"
        >
          <input
            type="text"
            placeholder="e.g. NUV-KHL-X7F92KLMQ4"
            value={manualTicketId}
            onChange={(e) => setManualTicketId(e.target.value)}
            className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400"
            autoFocus
          />
          <button
            type="submit"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition"
          >
            Submit
          </button>
        </form>
      )}
    </div>
  );
}
