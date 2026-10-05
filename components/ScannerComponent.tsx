'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, RefreshCw, AlertCircle, Zap, Image as ImageIcon, Keyboard, Play } from 'lucide-react';

interface ScannerProps {
  onScan: (decodedText: string) => Promise<void>;
  isProcessing: boolean;
  disabled?: boolean;
  dutyMode?: 'entry' | 'distribution';
}

export default function ScannerComponent({
  onScan,
  isProcessing,
  disabled,
  dutyMode = 'entry',
}: ScannerProps) {
  const [scannerStarted, setScannerStarted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
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
  const onScanRef = useRef(onScan);
  const containerId = 'qr-reader-container';

  // Always keep onScanRef up to date to eliminate stale closures
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // Synchronize lock status during processing or disabled state
  useEffect(() => {
    isLockedRef.current = isProcessing || !!disabled;
  }, [isProcessing, disabled]);

  // Scan handler called by html5-qrcode
  const handleScanSuccess = useCallback(async (decodedText: string) => {
    if (isLockedRef.current) return;
    isLockedRef.current = true;

    try {
      await onScanRef.current(decodedText.trim());
    } catch (err) {
      console.error('Scan handling failed:', err);
    }
  }, []);

  // Utility to enforce inline playback on iOS Safari
  const enforceIosVideoAttributes = useCallback(() => {
    try {
      const container = document.getElementById(containerId);
      if (!container) return;
      const videos = container.querySelectorAll('video');
      videos.forEach((video) => {
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.setAttribute('autoplay', 'true');
        video.playsInline = true;
        video.muted = true;
        if (video.paused) {
          video.play().catch(() => {});
        }
      });
    } catch {}
  }, []);

  const stopScanner = useCallback(async () => {
    try {
      const scanner = html5QrCodeRef.current;
      if (scanner && scanner.isScanning) {
        await scanner.stop();
      }
    } catch (e) {
      console.warn('Scanner stop warning:', e);
    } finally {
      if (isMountedRef.current) {
        setScannerStarted(false);
      }
    }
  }, []);

  const getOrCreateScanner = useCallback(() => {
    const container = document.getElementById(containerId);
    if (!container) return null;

    if (!html5QrCodeRef.current) {
      html5QrCodeRef.current = new Html5Qrcode(containerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
    }
    return html5QrCodeRef.current;
  }, []);

  const startScanner = useCallback(
    async (cameraId?: string) => {
      if (isStartingRef.current) return;
      isStartingRef.current = true;
      setIsInitializing(true);
      setCameraError(null);

      try {
        if (!isMountedRef.current) return;

        const scanner = getOrCreateScanner();
        if (!scanner) {
          isStartingRef.current = false;
          setIsInitializing(false);
          return;
        }

        if (scanner.isScanning) {
          try {
            await scanner.stop();
          } catch {}
        }

        // Standard QR box config WITHOUT restrictive hardware aspectRatio constraint
        const qrConfig = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
        };

        const successCallback = (decodedText: string) => {
          handleScanSuccess(decodedText);
        };
        const errorCallback = () => {};

        // Camera start sequence compatible with Android and iOS Safari:
        // 1. If explicit cameraId requested, pass string directly
        // 2. Otherwise use standard { facingMode: 'environment' } (rear camera)
        // 3. Fallback to { facingMode: 'user' } (front/webcam)
        if (cameraId) {
          try {
            await scanner.start(
              cameraId,
              qrConfig,
              successCallback,
              errorCallback
            );
          } catch (camErr) {
            console.warn('Start with explicit camera ID failed, attempting environment:', camErr);
            await scanner.start(
              { facingMode: 'environment' },
              qrConfig,
              successCallback,
              errorCallback
            );
          }
        } else {
          try {
            await scanner.start(
              { facingMode: 'environment' },
              qrConfig,
              successCallback,
              errorCallback
            );
          } catch (envErr) {
            console.warn('Environment rear camera failed, trying user camera:', envErr);
            await scanner.start(
              { facingMode: 'user' },
              qrConfig,
              successCallback,
              errorCallback
            );
          }
        }

        enforceIosVideoAttributes();

        if (isMountedRef.current) {
          setScannerStarted(true);
          setIsInitializing(false);

          // Enumerate cameras once permission is active
          try {
            const devices = await Html5Qrcode.getCameras();
            if (isMountedRef.current && devices && devices.length > 0) {
              setCameras(devices);
              if (!cameraId) {
                const backCam = devices.find(
                  (d) =>
                    d.label.toLowerCase().includes('back') ||
                    d.label.toLowerCase().includes('rear') ||
                    d.label.toLowerCase().includes('environment')
                );
                setSelectedCameraId(backCam ? backCam.id : devices[0].id);
              }
            }
          } catch (enumErr) {
            console.warn('Post-start getCameras enumeration notice:', enumErr);
          }

          // Check torch capability
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
          const errMsg =
            typeof err === 'string'
              ? err
              : (err as Error)?.message || 'Failed to start camera.';

          if (
            errMsg.includes('NotAllowedError') ||
            errMsg.includes('Permission') ||
            errMsg.includes('denied')
          ) {
            setCameraError(
              'Camera access was not granted. Please allow camera permissions in your browser (look for the camera or lock icon in your address bar).'
            );
          } else if (errMsg.includes('NotFoundError') || errMsg.includes('no camera')) {
            setCameraError('No camera detected on this device. You can test by uploading a QR image or typing the Pass code.');
          } else {
            setCameraError(
              `Camera notice: ${errMsg}. Please tap "Retry Camera" or grant permissions.`
            );
          }
          setScannerStarted(false);
          setIsInitializing(false);
        }
      } finally {
        isStartingRef.current = false;
      }
    },
    [getOrCreateScanner, handleScanSuccess, enforceIosVideoAttributes]
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
      const scanner = getOrCreateScanner();
      if (!scanner) return;
      const decodedText = await scanner.scanFile(file, true);
      if (decodedText) {
        handleScanSuccess(decodedText);
      }
    } catch {
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

  // Mount effect: Starts camera once and keeps watching video element
  useEffect(() => {
    isMountedRef.current = true;

    // Start camera on mount
    startScanner();

    // Periodic check to ensure iOS Safari keeps playsinline
    const interval = setInterval(() => {
      enforceIosVideoAttributes();
    }, 1500);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [startScanner, enforceIosVideoAttributes]);

  const isDeskMode = dutyMode === 'distribution';

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Viewport Card */}
      <div
        className={`relative w-full max-w-md aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl border-2 transition-colors duration-300 ${
          isDeskMode ? 'border-purple-500/40 shadow-purple-950/30' : 'border-amber-500/40 shadow-amber-950/30'
        }`}
      >
        {/* Inline CSS to enforce video dimensions across iOS and Android */}
        <style jsx global>{`
          #qr-reader-container {
            width: 100% !important;
            height: 100% !important;
            min-height: 280px !important;
            position: relative !important;
            border: none !important;
          }
          #qr-reader-container video {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            border-radius: 1.5rem !important;
          }
          #qr-reader-container__scan_region {
            min-height: 100% !important;
          }
        `}</style>

        {/* Html5Qrcode target element */}
        <div id={containerId} className="w-full h-full min-h-[280px]" />

        {/* Target Frame Overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className={`relative w-64 h-64 border-2 rounded-2xl transition-colors duration-300 ${
              isDeskMode ? 'border-purple-400/50' : 'border-amber-400/50'
            }`}
          >
            {/* Corner accents */}
            <div
              className={`absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 rounded-tl-xl ${
                isDeskMode ? 'border-purple-400' : 'border-amber-400'
              }`}
            />
            <div
              className={`absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 rounded-tr-xl ${
                isDeskMode ? 'border-purple-400' : 'border-amber-400'
              }`}
            />
            <div
              className={`absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 rounded-bl-xl ${
                isDeskMode ? 'border-purple-400' : 'border-amber-400'
              }`}
            />
            <div
              className={`absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 rounded-br-xl ${
                isDeskMode ? 'border-purple-400' : 'border-amber-400'
              }`}
            />

            {/* Scanning line animation */}
            {scannerStarted && !isProcessing && (
              <div
                className={`absolute inset-x-2 top-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent animate-bounce ${
                  isDeskMode
                    ? 'text-purple-400 shadow-[0_0_12px_#c084fc]'
                    : 'text-amber-400 shadow-[0_0_12px_#febf4a]'
                }`}
              />
            )}
          </div>
        </div>

        {/* Processing Spinner Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
            <div
              className={`w-16 h-16 border-4 border-t-transparent rounded-full animate-spin ${
                isDeskMode ? 'border-purple-400' : 'border-amber-400'
              }`}
            />
            <p className="mt-4 text-white font-bold text-lg tracking-wider uppercase">
              {isDeskMode ? 'Activating Pass...' : 'Verifying Entry...'}
            </p>
          </div>
        )}

        {/* Initializing / Tap to Start Overlay */}
        {!scannerStarted && !cameraError && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10 space-y-3">
            {isInitializing ? (
              <>
                <div
                  className={`w-10 h-10 border-3 border-t-transparent rounded-full animate-spin ${
                    isDeskMode ? 'border-purple-400' : 'border-amber-400'
                  }`}
                />
                <p className="text-slate-300 text-xs font-semibold">Starting camera...</p>
              </>
            ) : null}

            <button
              onClick={() => startScanner(selectedCameraId)}
              className={`px-5 py-3 rounded-2xl font-bold text-xs shadow-xl transition flex items-center gap-2 cursor-pointer ${
                isDeskMode
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/40'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-900/40'
              }`}
            >
              <Play className="w-4 h-4 fill-current" /> Tap to Enable Camera
            </button>
            <p className="text-slate-400 text-[11px] max-w-xs">
              When prompted, tap <strong>Allow</strong> to start scanning passes.
            </p>
          </div>
        )}

        {/* Camera Error Message with Fallbacks */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-30 space-y-4">
            <AlertCircle className="w-14 h-14 text-rose-500" />
            <div>
              <h4 className="text-white font-bold text-lg">Camera Access Needed</h4>
              <p className="text-slate-300 text-xs mt-1 max-w-xs">{cameraError}</p>
            </div>

            <div className="flex flex-col gap-2 w-full max-w-xs">
              <button
                onClick={() => startScanner(selectedCameraId)}
                className={`w-full py-2.5 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                  isDeskMode
                    ? 'bg-purple-600 hover:bg-purple-500 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                <RefreshCw className="w-4 h-4" /> Allow / Retry Camera
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-emerald-400" /> Upload QR Photo
              </button>

              <button
                onClick={() => setShowManualInput(true)}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Keyboard className="w-4 h-4 text-slate-400" /> Type Pass Code
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
            <Camera className="w-4 h-4 text-amber-400" /> Switch Cam
          </button>
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer"
          title="Scan QR from photo"
        >
          <ImageIcon className="w-4 h-4 text-emerald-400" /> Photo
        </button>

        <button
          onClick={() => setShowManualInput((prev) => !prev)}
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer"
          title="Manual code entry"
        >
          <Keyboard className="w-4 h-4 text-amber-300" /> Type ID
        </button>

        <button
          onClick={() => (scannerStarted ? stopScanner() : startScanner(selectedCameraId))}
          className={`ml-auto p-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
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
            placeholder="e.g. NUV-KHL-0012 or 12"
            value={manualTicketId}
            onChange={(e) => setManualTicketId(e.target.value)}
            className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400"
            autoFocus
          />
          <button
            type="submit"
            className={`px-4 py-2 font-bold text-xs rounded-xl transition ${
              isDeskMode
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
            }`}
          >
            Submit
          </button>
        </form>
      )}
    </div>
  );
}
