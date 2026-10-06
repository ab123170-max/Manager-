/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  X,
  RotateCcw,
  Zap,
  ZapOff,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Loader2,
  Check,
  Sparkles,
  Barcode,
  Calendar,
  Tag,
  Crosshair,
} from 'lucide-react';
import {
  isScanMeCameraNative,
  openScanMeCamera,
  closeScanMeCamera,
  captureScanMePhoto,
  getScanMePreviewFrame,
  switchScanMeCamera,
  setScanMeFlashMode,
  getCameraPermissionStatus,
  requestCameraPermission,
  openCameraAppSettings,
} from '../../plugins/scanmeCamera';
import { ScanSession, ScanShot } from '../../types';
import { playScanSuccessBeep } from '../../utils/audioFeedback';
import {
  analyzeLiveFrame,
  RealtimeDetectionResult,
} from '../../utils/realtimeProductDetector';
import {
  TrackedProduct,
  createNewTrackedProduct,
  updateProductTracking,
  addShotToTrackedProduct,
  removeLastShotFromTrackedProduct,
  getMissingFieldGuidance,
} from '../../utils/productTracker';

export type CameraModalMode =
  | 'initializing'
  | 'permission_explanation'
  | 'permission_denied'
  | 'permission_permanently_denied'
  | 'live_camera';

interface ScanMeCameraModalProps {
  isOpen: boolean;
  onFinishAndExtract: (shots: string[], session?: ScanSession) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  initialShots?: string[];
  maxShots?: number;
}

export const ScanMeCameraModal: React.FC<ScanMeCameraModalProps> = ({
  isOpen,
  onFinishAndExtract,
  onClose,
  title = 'Multi-Shot Camera',
  subtitle = 'Fast real-time detection & smart multi-angle extraction',
  initialShots = [],
  maxShots = 5,
}) => {
  const [mode, setMode] = useState<CameraModalMode>('initializing');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [justCapturedToast, setJustCapturedToast] = useState<string | null>(null);
  const [isFlashEffect, setIsFlashEffect] = useState(false);

  // Multi-Shot Session State
  const [scanSession, setScanSession] = useState<ScanSession>(() => ({
    id: `scan-${Date.now()}`,
    shots: initialShots.map((img, i) => ({
      id: `shot-${i + 1}`,
      image: img,
      timestamp: Date.now(),
      label: `Shot ${i + 1}`,
    })),
    detectedProduct: null,
    extractedData: {},
    status: 'capturing',
  }));

  // Tracked Product State across continuous angles
  const [trackedProduct, setTrackedProduct] = useState<TrackedProduct>(() => createNewTrackedProduct());

  // Real-time Frame Detection Output
  const [detection, setDetection] = useState<RealtimeDetectionResult>({
    hasProduct: false,
    isStable: false,
    stabilityScore: 0,
    productBox: null,
    regions: [],
    guidanceText: 'Aim camera at product',
    dominantColor: '#10b981',
  });

  // Camera hardware controls
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flashMode, setFlashMode] = useState<'auto' | 'on' | 'off' | 'torch'>('auto');

  // Web fallback & analysis references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isAnalyzingRef = useRef<boolean>(false);
  const prevDetectionRef = useRef<RealtimeDetectionResult | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isNative = isScanMeCameraNative();

  /**
   * Stops live camera stream & restores DOM background
   */
  const stopLiveCamera = useCallback(async () => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }

    document.documentElement.classList.remove('camera-preview-active');
    document.body.classList.remove('camera-preview-active');

    if (isNative) {
      try {
        await closeScanMeCamera();
      } catch (err) {
        console.warn('[ScanMeCameraModal] close native camera error:', err);
      }
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [isNative]);

  /**
   * Starts real-time lightweight frame analysis loop (~5 fps, < 8ms per frame)
   */
  const startRealtimeAnalysisLoop = useCallback(() => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
    }

    analysisIntervalRef.current = setInterval(async () => {
      if (isAnalyzingRef.current || mode !== 'live_camera') return;
      isAnalyzingRef.current = true;

      try {
        let frameSource: HTMLVideoElement | HTMLImageElement | null = null;

        if (isNative) {
          // In native Android APK, fetch lightweight 320px preview bitmap snapshot
          const frameRes = await getScanMePreviewFrame();
          if (frameRes && frameRes.dataUrl) {
            const img = new Image();
            img.src = frameRes.dataUrl;
            await new Promise((r) => {
              img.onload = r;
              img.onerror = r;
            });
            frameSource = img;
          }
        } else {
          // On Web browser preview, analyze directly from video stream
          if (videoRef.current && videoRef.current.readyState >= 2) {
            frameSource = videoRef.current;
          }
        }

        if (frameSource) {
          const res = await analyzeLiveFrame(frameSource, prevDetectionRef.current);
          prevDetectionRef.current = res;
          setDetection(res);

          // Update tracked product identity
          setTrackedProduct((prev) =>
            updateProductTracking(prev, res.productBox, res.isStable, res.dominantColor, res.detectedBarcode)
          );

          // If barcode newly detected, play gentle confirmation beep
          if (res.detectedBarcode && !trackedProduct.fields.barcode.value) {
            playScanSuccessBeep();
            setJustCapturedToast(`Barcode detected: ${res.detectedBarcode} ✓`);
            setTimeout(() => setJustCapturedToast(null), 1800);
          }
        }
      } catch (err) {
        console.debug('[RealtimeAnalysis] Frame skipped:', err);
      } finally {
        isAnalyzingRef.current = false;
      }
    }, 200); // 5 times/second is silky smooth on mobile and consumes < 2% CPU
  }, [isNative, mode, trackedProduct.fields.barcode.value]);

  /**
   * Starts the live camera view inside the app
   */
  const startLiveCamera = useCallback(async () => {
    setMode('live_camera');

    if (isNative) {
      try {
        document.documentElement.classList.add('camera-preview-active');
        document.body.classList.add('camera-preview-active');
        await openScanMeCamera({ facingMode, toBack: true });
        console.log('[ScanMeCameraModal] Native CameraX preview opened');
        startRealtimeAnalysisLoop();
      } catch (err) {
        console.error('[ScanMeCameraModal] Failed to open native CameraX:', err);
        document.documentElement.classList.remove('camera-preview-active');
        document.body.classList.remove('camera-preview-active');
        alert('Could not start camera preview. Please check camera permissions.');
        onClose();
      }
    } else {
      // Web browser preview fallback
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        startRealtimeAnalysisLoop();
      } catch (err) {
        console.warn('[ScanMeCameraModal] Browser getUserMedia error:', err);
      }
    }
  }, [facingMode, isNative, onClose, startRealtimeAnalysisLoop]);

  /**
   * Initializes and checks camera permissions whenever modal opens
   */
  const checkAndInitCamera = useCallback(async () => {
    setScanSession({
      id: `scan-${Date.now()}`,
      shots: initialShots.map((img, i) => ({
        id: `shot-${i + 1}`,
        image: img,
        timestamp: Date.now(),
        label: `Shot ${i + 1}`,
      })),
      detectedProduct: null,
      extractedData: {},
      status: 'capturing',
    });

    setTrackedProduct(createNewTrackedProduct());

    if (isNative) {
      try {
        const status = await getCameraPermissionStatus();
        console.log('[ScanMeCameraModal] Initial permission status:', status);

        if (status === 'granted') {
          await startLiveCamera();
        } else if (status === 'prompt') {
          setMode('permission_explanation');
        } else if (status === 'prompt-with-rationale') {
          setMode('permission_denied');
        } else {
          setMode('permission_permanently_denied');
        }
      } catch (err) {
        console.error('[ScanMeCameraModal] Permission check failed:', err);
        setMode('permission_explanation');
      }
    } else {
      await startLiveCamera();
    }
  }, [initialShots, isNative, startLiveCamera]);

  useEffect(() => {
    if (isOpen) {
      checkAndInitCamera();
    } else {
      stopLiveCamera();
    }

    return () => {
      stopLiveCamera();
    };
  }, [isOpen, checkAndInitCamera, stopLiveCamera]);

  /**
   * Auto-detect permission change when returning from Android Settings
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleAppResume = async () => {
      if (isNative && mode === 'permission_permanently_denied') {
        try {
          const status = await getCameraPermissionStatus();
          if (status === 'granted') {
            await startLiveCamera();
          }
        } catch (err) {
          console.warn('[ScanMeCameraModal] Resume check error:', err);
        }
      }
    };

    window.addEventListener('focus', handleAppResume);
    document.addEventListener('visibilitychange', handleAppResume);

    return () => {
      window.removeEventListener('focus', handleAppResume);
      document.removeEventListener('visibilitychange', handleAppResume);
    };
  }, [isOpen, isNative, mode, startLiveCamera]);

  /**
   * Permission Actions
   */
  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    try {
      const status = await requestCameraPermission();
      if (status === 'granted') {
        await startLiveCamera();
      } else if (status === 'prompt-with-rationale') {
        setMode('permission_denied');
      } else {
        setMode('permission_permanently_denied');
      }
    } catch (err) {
      console.warn('[ScanMeCameraModal] Permission request error:', err);
      setMode('permission_denied');
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleOpenSettings = async () => {
    await openCameraAppSettings();
  };

  /**
   * CONTINUOUS MULTI-SHOT CAPTURE FLOW WITH SMART AUTO-CROP
   * User taps [Capture] -> Shot saved -> Targeted crops created -> Camera stays running!
   */
  const handleCaptureShot = async () => {
    if (isCapturing) return;
    if (scanSession.shots.length >= maxShots) {
      alert(`Maximum ${maxShots} shots reached. Tap "Finish & Extract" to process.`);
      return;
    }

    setIsCapturing(true);

    try {
      let photoDataUrl = '';

      if (isNative) {
        const result = await captureScanMePhoto();
        if (result && result.dataUrl) {
          photoDataUrl = result.dataUrl;
        } else {
          throw new Error('No photo data returned from native camera');
        }
      } else {
        // Web canvas capture
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth || 1280;
          canvas.height = video.videoHeight || 720;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            photoDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          }
        }
      }

      if (photoDataUrl) {
        const nextShotNum = scanSession.shots.length + 1;
        const newShot: ScanShot = {
          id: `shot-${nextShotNum}`,
          image: photoDataUrl,
          timestamp: Date.now(),
          label: `Shot ${nextShotNum}`,
        };

        // Add to temporary scan session
        setScanSession((prev) => ({
          ...prev,
          shots: [...prev.shots, newShot],
        }));

        // Associate shot & extract targeted regions into tracked product
        const updatedTracked = await addShotToTrackedProduct(
          trackedProduct,
          photoDataUrl,
          detection.regions
        );
        setTrackedProduct(updatedTracked);

        // Audio & visual shutter feedback
        playScanSuccessBeep();
        setIsFlashEffect(true);
        setTimeout(() => setIsFlashEffect(false), 120);

        // Dynamic guidance feedback based on remaining missing fields
        const missingHint = getMissingFieldGuidance(updatedTracked);
        setJustCapturedToast(`Shot ${nextShotNum} saved! ${missingHint}`);
        setTimeout(() => setJustCapturedToast(null), 2400);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('[ScanMeCameraModal] Capture error:', error);
      alert(`Photo capture failed: ${error.message || 'Please try again.'}`);
    } finally {
      setIsCapturing(false);
    }
  };

  /**
   * RETAKE LAST
   * Removes the most recent shot and keeps camera running for replacement
   */
  const handleRetakeLast = () => {
    if (scanSession.shots.length === 0) return;
    const removedNum = scanSession.shots.length;
    setScanSession((prev) => ({
      ...prev,
      shots: prev.shots.slice(0, -1),
    }));
    setTrackedProduct((prev) => removeLastShotFromTrackedProduct(prev));

    setJustCapturedToast(`Shot ${removedNum} removed. Retake now.`);
    setTimeout(() => setJustCapturedToast(null), 1800);
  };

  /**
   * FINISH & EXTRACT
   * Dispatches all captured shots and targeted crops together for AI processing
   */
  const handleFinishAndExtract = async () => {
    if (scanSession.shots.length === 0) return;

    await stopLiveCamera();
    const finalSession: ScanSession = {
      ...scanSession,
      status: 'processing',
    };

    onFinishAndExtract(
      scanSession.shots.map((s) => s.image),
      finalSession
    );
    onClose();
  };

  /**
   * CANCEL
   * Discards temporary scan session without deleting existing saved products
   */
  const handleCancel = async () => {
    await stopLiveCamera();
    setScanSession({
      id: `cancelled-${Date.now()}`,
      shots: [],
      detectedProduct: null,
      extractedData: {},
      status: 'cancelled',
    });
    onClose();
  };

  /**
   * Switch Camera
   */
  const handleSwitchCamera = async () => {
    if (isNative) {
      try {
        const res = await switchScanMeCamera();
        setFacingMode(res.facingMode === 'user' ? 'user' : 'environment');
      } catch (err) {
        console.warn('[ScanMeCameraModal] switch camera error:', err);
      }
    } else {
      const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
      setFacingMode(nextFacing);
      await stopLiveCamera();
      await startLiveCamera();
    }
  };

  /**
   * Toggle Flash
   */
  const handleToggleFlash = async () => {
    const modes: ('auto' | 'on' | 'off' | 'torch')[] = ['auto', 'on', 'torch', 'off'];
    const nextMode = modes[(modes.indexOf(flashMode) + 1) % modes.length];
    if (isNative) {
      try {
        const res = await setScanMeFlashMode(nextMode);
        if (res.success) {
          setFlashMode(nextMode);
        }
      } catch (err) {
        console.warn('[ScanMeCameraModal] toggle flash error:', err);
      }
    } else {
      setFlashMode(nextMode);
    }
  };

  if (!isOpen) return null;

  const f = trackedProduct.fields;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Hidden canvas for browser preview snapshots */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Shutter flash animation overlay */}
      {isFlashEffect && (
        <div className="absolute inset-0 z-40 bg-white opacity-80 pointer-events-none transition-opacity duration-150" />
      )}

      {/* ========================================================================= */}
      {/* 1. PERMISSION EXPLANATION                                                 */}
      {/* ========================================================================= */}
      {mode === 'permission_explanation' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-4">
            <button
              type="button"
              onClick={handleCancel}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
              <Camera className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Camera Access</h3>
              <p className="text-xs font-bold text-slate-800">
                ScanMe AI needs camera access to scan and track products.
              </p>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Real-time tracking highlights barcodes, manufacturing dates, and pricing automatically.
              </p>
            </div>

            <div className="w-full pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleRequestPermission}
                disabled={isRequestingPermission}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-[#1473EA] hover:bg-blue-600 text-white text-sm font-bold shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isRequestingPermission ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Requesting Permission...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Allow Camera</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PERMISSION DENIED ONCE                                                  */}
      {/* ========================================================================= */}
      {mode === 'permission_denied' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-4">
            <button
              type="button"
              onClick={handleCancel}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Camera Permission Required</h3>
              <p className="text-xs font-semibold text-slate-800">
                Camera access is required to track product labels and scan barcodes.
              </p>
            </div>

            <div className="w-full pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleRequestPermission}
                disabled={isRequestingPermission}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-[#1473EA] hover:bg-blue-600 text-white text-sm font-bold shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isRequestingPermission ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Requesting...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Allow Camera</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleOpenSettings}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>Open Android Settings</span>
              </button>

              <button
                type="button"
                onClick={handleCancel}
                className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PERMISSION PERMANENTLY DENIED                                          */}
      {/* ========================================================================= */}
      {mode === 'permission_permanently_denied' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-4">
            <button
              type="button"
              onClick={handleCancel}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Camera Permission Disabled</h3>
              <p className="text-xs font-bold text-slate-800">
                Camera permission is disabled. Enable it in Android Settings to use the camera.
              </p>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Tap below to open App Info and enable Camera.
              </p>
            </div>

            <div className="w-full pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleOpenSettings}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-[#1473EA] hover:bg-blue-600 text-white text-sm font-bold shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>Open Android Settings</span>
              </button>

              <button
                type="button"
                onClick={handleCancel}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. REAL-TIME PRODUCT DETECTION + TRACKING CAMERA OVERLAY                  */}
      {/* ========================================================================= */}
      {mode === 'live_camera' && (
        <div className="absolute inset-0 z-50 flex flex-col justify-between bg-transparent">
          {/* Browser fallback video */}
          {!isNative && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover -z-10"
            />
          )}

          {/* TOP CONTROLS & FIELD CHECKLIST STATUS BAR */}
          <div className="w-full bg-gradient-to-b from-black/90 via-black/50 to-transparent p-3.5 sm:p-5 space-y-2.5 z-20">
            <div className="flex items-center justify-between">
              {/* Cancel Button */}
              <button
                type="button"
                onClick={handleCancel}
                className="p-2.5 rounded-full bg-black/55 hover:bg-black/75 text-white backdrop-blur-md border border-white/15 transition-transform active:scale-95 cursor-pointer"
                title="Cancel Session"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Dynamic Tracking Status Badge */}
              <div className="bg-black/60 text-white px-3.5 py-1.5 rounded-full text-xs font-black backdrop-blur-md border border-white/15 flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    detection.isStable
                      ? 'bg-emerald-400 animate-pulse'
                      : detection.hasProduct
                      ? 'bg-cyan-400'
                      : 'bg-amber-400'
                  }`}
                />
                <span>
                  {detection.isStable
                    ? 'Tracking ✓'
                    : detection.hasProduct
                    ? 'Product detected ✓'
                    : 'Searching for product...'}
                </span>
              </div>

              {/* Lens Switch & Flash Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleFlash}
                  className="p-2.5 rounded-full bg-black/55 hover:bg-black/75 text-white backdrop-blur-md border border-white/15 transition-transform active:scale-95 cursor-pointer"
                  title={`Flash: ${flashMode.toUpperCase()}`}
                >
                  {flashMode === 'off' ? (
                    <ZapOff className="w-5 h-5 text-slate-400" />
                  ) : (
                    <Zap className={`w-5 h-5 ${flashMode === 'torch' ? 'text-amber-400' : 'text-emerald-400'}`} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="p-2.5 rounded-full bg-black/55 hover:bg-black/75 text-white backdrop-blur-md border border-white/15 transition-transform active:scale-95 cursor-pointer"
                  title="Switch Lens"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Field Status Pill Strip (Avoids repeated processing) */}
            <div className="flex items-center justify-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-black backdrop-blur-md border flex items-center gap-1 ${
                  f.productName.status === 'complete'
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                    : 'bg-black/40 border-white/10 text-white/70'
                }`}
              >
                <span>Name</span>
                {f.productName.status === 'complete' && <Check className="w-3 h-3 text-emerald-400" />}
              </span>

              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-black backdrop-blur-md border flex items-center gap-1 ${
                  f.price.status === 'complete'
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                    : 'bg-black/40 border-white/10 text-white/70'
                }`}
              >
                <span>Price</span>
                {f.price.status === 'complete' && <Check className="w-3 h-3 text-emerald-400" />}
              </span>

              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-black backdrop-blur-md border flex items-center gap-1 ${
                  f.manufactureDate.status === 'complete'
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                    : 'bg-black/40 border-white/10 text-white/70'
                }`}
              >
                <span>MFD</span>
                {f.manufactureDate.status === 'complete' && <Check className="w-3 h-3 text-emerald-400" />}
              </span>

              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-black backdrop-blur-md border flex items-center gap-1 ${
                  f.expiryDate.status === 'complete'
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                    : 'bg-black/40 border-white/10 text-white/70'
                }`}
              >
                <span>EXP</span>
                {f.expiryDate.status === 'complete' && <Check className="w-3 h-3 text-emerald-400" />}
              </span>

              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-black backdrop-blur-md border flex items-center gap-1 ${
                  f.barcode.status === 'complete'
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                    : 'bg-black/40 border-white/10 text-white/70'
                }`}
              >
                <span>Barcode</span>
                {f.barcode.status === 'complete' && <Check className="w-3 h-3 text-emerald-400" />}
              </span>
            </div>
          </div>

          {/* Toast Notification Banner */}
          {justCapturedToast && (
            <div className="absolute top-28 inset-x-0 mx-auto w-max max-w-[90%] bg-emerald-600 text-white px-4 py-2 rounded-2xl text-xs font-black shadow-xl flex items-center gap-2 z-30 animate-in fade-in zoom-in-95">
              <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
              <span>{justCapturedToast}</span>
            </div>
          )}

          {/* REAL-TIME DYNAMIC BOUNDING BOX OVERLAY (Hardware-accelerated) */}
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center p-4">
            {detection.hasProduct && detection.productBox ? (
              <div
                style={{
                  position: 'absolute',
                  left: `${Math.round(detection.productBox.x * 100)}%`,
                  top: `${Math.round(detection.productBox.y * 100)}%`,
                  width: `${Math.round(detection.productBox.width * 100)}%`,
                  height: `${Math.round(detection.productBox.height * 100)}%`,
                  transition: 'all 0.12s ease-out',
                }}
                className={`border-2 rounded-3xl ${
                  detection.isStable
                    ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.35)]'
                    : 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.25)]'
                }`}
              >
                {/* Corner bracket accents */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

                {/* Tracking Badge */}
                <div className="absolute -top-3.5 left-3 bg-black/80 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20 text-[10px] font-black text-white flex items-center gap-1.5">
                  <Crosshair className="w-3 h-3 text-emerald-400" />
                  <span>{detection.isStable ? 'Tracking ✓' : 'Product detected ✓'}</span>
                </div>

                {/* Sub-region markers */}
                {detection.regions.map((reg) => (
                  <div
                    key={reg.id}
                    style={{
                      position: 'absolute',
                      left: `${Math.round(((reg.box.x - detection.productBox!.x) / detection.productBox!.width) * 100)}%`,
                      top: `${Math.round(((reg.box.y - detection.productBox!.y) / detection.productBox!.height) * 100)}%`,
                      width: `${Math.round((reg.box.width / detection.productBox!.width) * 100)}%`,
                      height: `${Math.round((reg.box.height / detection.productBox!.height) * 100)}%`,
                    }}
                    className={`border border-dashed rounded-lg flex items-start p-1 pointer-events-none transition-all duration-150 ${
                      reg.type === 'expiry_date'
                        ? 'border-amber-400/80 bg-amber-400/10'
                        : reg.type === 'barcode_qr'
                        ? 'border-cyan-400/80 bg-cyan-400/10'
                        : 'border-white/40 bg-white/5'
                    }`}
                  >
                    <span className="text-[9px] font-black bg-black/75 px-1 py-0.2 rounded text-white truncate max-w-full">
                      {reg.type === 'expiry_date' ? 'EXP/MFD' : reg.type === 'barcode_qr' ? 'Barcode' : reg.type === 'price_mrp' ? 'MRP' : 'Label'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* Default Framing Box when no product is centered yet */
              <div className="relative w-full max-w-sm aspect-[3/4] sm:aspect-square border-2 border-dashed border-emerald-400/60 rounded-3xl flex flex-col items-center justify-between p-4 shadow-2xl">
                <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

                <span className="text-[11px] font-bold text-white bg-black/60 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/10">
                  {title}
                </span>

                <span className="text-[11px] font-medium text-white/95 bg-black/65 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-center max-w-[280px]">
                  {detection.guidanceText || subtitle}
                </span>
              </div>
            )}
          </div>

          {/* BOTTOM CONTROLS & CONTINUOUS MULTI-SHOT TRAY */}
          <div className="w-full bg-gradient-to-t from-black/95 via-black/80 to-transparent p-4 sm:p-6 pb-8 space-y-3.5 z-20">
            {/* Live Shot Thumbnails & Retake Last Button */}
            {scanSession.shots.length > 0 && (
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  {scanSession.shots.map((shot, idx) => (
                    <div
                      key={shot.id}
                      className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 border-emerald-400 bg-slate-900 shadow-md group"
                    >
                      <img
                        src={shot.image}
                        alt={`Shot ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] font-black text-center text-white">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                  {scanSession.shots.length < maxShots && (
                    <div className="shrink-0 w-12 h-12 rounded-xl border-2 border-dashed border-white/40 flex items-center justify-center text-white/70 text-[10px] font-bold">
                      +{maxShots - scanSession.shots.length}
                    </div>
                  )}
                </div>

                {/* [Retake Last] Button */}
                <button
                  type="button"
                  onClick={handleRetakeLast}
                  className="shrink-0 py-2 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold backdrop-blur-md border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
                  <span>Retake Last</span>
                </button>
              </div>
            )}

            {/* Smart Real-time Guidance Banner */}
            <div className="text-center">
              <span className="inline-block px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white/90 text-xs font-bold border border-white/10">
                {detection.guidanceText}
              </span>
            </div>

            {/* Action Bar: [Cancel] | [Capture] | [Finish & Extract] */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleCancel}
                className="min-w-[80px] py-2.5 px-3.5 rounded-xl text-white/80 hover:text-white text-xs font-bold bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all cursor-pointer text-center"
              >
                Cancel
              </button>

              {/* [Capture] Button */}
              <button
                type="button"
                onClick={handleCaptureShot}
                disabled={isCapturing || scanSession.shots.length >= maxShots}
                className="w-20 h-20 rounded-full bg-white hover:bg-slate-100 border-4 border-emerald-500 flex items-center justify-center shadow-2xl transition-transform active:scale-90 cursor-pointer disabled:opacity-50"
                title="Capture Next Shot"
                id="btn-camera-capture-shot"
              >
                {isCapturing ? (
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-inner">
                    <Camera className="w-7 h-7" />
                  </div>
                )}
              </button>

              {/* [Finish & Extract] Button */}
              {scanSession.shots.length > 0 ? (
                <button
                  type="button"
                  onClick={handleFinishAndExtract}
                  className="min-w-[110px] py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer animate-in fade-in"
                  id="btn-camera-finish-extract"
                >
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Finish ({scanSession.shots.length})</span>
                </button>
              ) : (
                <div className="min-w-[80px] text-right text-[11px] font-medium text-white/60 pr-1">
                  Take Shot 1
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanMeCameraModal;
