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
  RefreshCw,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import {
  isScanMeCameraNative,
  openScanMeCamera,
  closeScanMeCamera,
  captureScanMePhoto,
  switchScanMeCamera,
  setScanMeFlashMode,
  getCameraPermissionStatus,
  requestCameraPermission,
  openCameraAppSettings,
} from '../../plugins/scanmeCamera';

export type CameraModalMode =
  | 'initializing'
  | 'permission_explanation'
  | 'permission_denied'
  | 'permission_permanently_denied'
  | 'live_camera'
  | 'photo_preview';

interface ScanMeCameraModalProps {
  isOpen: boolean;
  onPhotoCaptured: (photoDataUrl: string) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export const ScanMeCameraModal: React.FC<ScanMeCameraModalProps> = ({
  isOpen,
  onPhotoCaptured,
  onClose,
  title = 'Scan with Camera',
  subtitle = 'Position product packaging and labels within the frame',
}) => {
  const [mode, setMode] = useState<CameraModalMode>('initializing');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Camera settings
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flashMode, setFlashMode] = useState<'auto' | 'on' | 'off' | 'torch'>('auto');

  // Web fallback refs (for browser testing / dev preview only)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isNative = isScanMeCameraNative();

  /**
   * Stops live camera stream & restores DOM background
   */
  const stopLiveCamera = useCallback(async () => {
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
   * Starts the live camera view inside the app
   */
  const startLiveCamera = useCallback(async () => {
    setCapturedPhoto(null);
    setMode('live_camera');

    if (isNative) {
      try {
        document.documentElement.classList.add('camera-preview-active');
        document.body.classList.add('camera-preview-active');
        const res = await openScanMeCamera({ facingMode, toBack: true });
        console.log('[ScanMeCameraModal] Native CameraX preview opened:', res);
      } catch (err) {
        console.error('[ScanMeCameraModal] Failed to open native CameraX:', err);
        document.documentElement.classList.remove('camera-preview-active');
        document.body.classList.remove('camera-preview-active');
        alert('Could not start camera preview. Please check camera permissions.');
        onClose();
      }
    } else {
      // Web browser preview fallback for desktop testing
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
      } catch (err) {
        console.warn('[ScanMeCameraModal] Browser getUserMedia error:', err);
      }
    }
  }, [facingMode, isNative, onClose]);

  /**
   * Initializes and checks camera permissions whenever modal opens
   */
  const checkAndInitCamera = useCallback(async () => {
    setCapturedPhoto(null);

    if (isNative) {
      try {
        const status = await getCameraPermissionStatus();
        console.log('[ScanMeCameraModal] Initial permission status:', status);

        if (status === 'granted') {
          // Permission already granted: immediately open camera
          await startLiveCamera();
        } else if (status === 'prompt') {
          // First time camera use: show clear in-app permission explanation
          setMode('permission_explanation');
        } else if (status === 'prompt-with-rationale') {
          // Previously denied once: show in-app retry dialog
          setMode('permission_denied');
        } else {
          // Permanently denied: show in-app explanation with Open Settings
          setMode('permission_permanently_denied');
        }
      } catch (err) {
        console.error('[ScanMeCameraModal] Permission check failed:', err);
        setMode('permission_explanation');
      }
    } else {
      // In web/desktop preview: launch directly
      await startLiveCamera();
    }
  }, [isNative, startLiveCamera]);

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
   * Auto-detect permission change when app regains focus
   * (e.g. user toggled camera in Android Settings and returned to ScanMe AI)
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleAppResume = async () => {
      if (isNative && mode === 'permission_permanently_denied') {
        try {
          const status = await getCameraPermissionStatus();
          console.log('[ScanMeCameraModal] Resumed from settings, status:', status);
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
   * Handles user tapping "Allow Camera" or "Try Again"
   */
  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    try {
      const status = await requestCameraPermission();
      console.log('[ScanMeCameraModal] Permission response:', status);

      if (status === 'granted') {
        // Automatically open camera immediately inside the app!
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

  /**
   * Opens Android Settings
   */
  const handleOpenSettings = async () => {
    await openCameraAppSettings();
  };

  /**
   * Shutter capture
   */
  const handleCapturePhoto = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      let photoDataUrl = '';

      if (isNative) {
        const result = await captureScanMePhoto();
        if (result && result.dataUrl) {
          photoDataUrl = result.dataUrl;
        } else {
          throw new Error('No photo returned from native camera');
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
        // Stop the live camera and transition to review mode
        await stopLiveCamera();
        setCapturedPhoto(photoDataUrl);
        setMode('photo_preview');
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
   * Switch front / back camera
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
   * Toggle Flash mode
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

  /**
   * User confirms the photo
   */
  const handleConfirmPhoto = () => {
    if (!capturedPhoto) return;
    onPhotoCaptured(capturedPhoto);
    onClose();
  };

  /**
   * User retakes the photo
   */
  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    startLiveCamera();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Hidden canvas for browser preview snapshot */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ========================================================================= */}
      {/* 1. PERMISSION EXPLANATION (Requirement 2: On first camera use)            */}
      {/* ========================================================================= */}
      {mode === 'permission_explanation' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-4">
            <button
              type="button"
              onClick={onClose}
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
                ScanMe AI needs camera access to scan and capture products.
              </p>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Take high-resolution photos of product labels, packaging, expiry dates, and barcodes directly inside the app.
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
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PERMISSION DENIED ONCE (Requirement 3: Denied once retry)               */}
      {/* ========================================================================= */}
      {mode === 'permission_denied' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-4">
            <button
              type="button"
              onClick={onClose}
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
                Camera access is required to take product photos and scan barcodes.
              </p>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Please allow camera access to use the in-app scanner.
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
                onClick={onClose}
                className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PERMISSION PERMANENTLY DENIED (Requirement 3: Settings prompt)         */}
      {/* ========================================================================= */}
      {mode === 'permission_permanently_denied' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-4">
            <button
              type="button"
              onClick={onClose}
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
                Tap the button below to open ScanMe AI App Info, select Permissions, and allow Camera. When you return, the camera will automatically open.
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
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. LIVE CAMERA PREVIEW (Requirement 4: Full-Screen Mobile Camera UI)      */}
      {/* ========================================================================= */}
      {mode === 'live_camera' && (
        <div className="absolute inset-0 z-50 flex flex-col justify-between bg-transparent">
          {/* Web browser fallback video (only rendered when NOT on native Android) */}
          {!isNative && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover -z-10"
            />
          )}

          {/* Top Bar with controls */}
          <div className="w-full bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4 sm:p-6 flex items-center justify-between z-20">
            {/* Cancel / Back Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md border border-white/15 transition-transform active:scale-95 cursor-pointer"
              title="Cancel & Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Live Camera Pill */}
            <div className="bg-black/60 text-white px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border border-white/15 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live In-App Camera</span>
            </div>

            {/* Camera Options: Flash & Lens Switch */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleFlash}
                className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md border border-white/15 transition-transform active:scale-95 cursor-pointer"
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
                className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md border border-white/15 transition-transform active:scale-95 cursor-pointer"
                title="Switch Camera (Front / Rear)"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Viewfinder Framing Guidelines */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 pointer-events-none z-10">
            <div className="relative w-full max-w-sm aspect-[3/4] sm:aspect-square border-2 border-dashed border-emerald-400/70 rounded-3xl flex flex-col items-center justify-between p-4 shadow-2xl">
              {/* Corner brackets decoration */}
              <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
              <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
              <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
              <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

              <span className="text-[11px] font-bold text-white bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                {title}
              </span>

              <span className="text-[11px] font-medium text-white/90 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-center max-w-[260px]">
                {subtitle}
              </span>
            </div>
          </div>

          {/* Bottom Shutter Controls */}
          <div className="w-full bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 pb-8 flex items-center justify-around z-20">
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white text-xs font-semibold px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all cursor-pointer"
            >
              Cancel
            </button>

            {/* Large Mobile Capture Button */}
            <button
              type="button"
              onClick={handleCapturePhoto}
              disabled={isCapturing}
              className="w-20 h-20 rounded-full bg-white hover:bg-slate-100 border-4 border-emerald-500 flex items-center justify-center shadow-2xl transition-transform active:scale-90 cursor-pointer disabled:opacity-50"
              title="Take Photo"
            >
              {isCapturing ? (
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-inner">
                  <Camera className="w-7 h-7" />
                </div>
              )}
            </button>

            <div className="w-16" />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. REVIEW CAPTURED PHOTO (Requirement 4: Use Photo / Retake Photo)        */}
      {/* ========================================================================= */}
      {mode === 'photo_preview' && capturedPhoto && (
        <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-150">
          {/* Top Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-sm font-bold text-white">Review Captured Photo</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Discard & Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Photo Display Viewport */}
          <div className="flex-1 flex items-center justify-center py-4 overflow-hidden">
            <div className="relative max-h-[68vh] w-full flex items-center justify-center">
              <img
                src={capturedPhoto}
                alt="Captured product shot"
                className="max-h-[68vh] w-auto max-w-full object-contain rounded-2xl border-2 border-slate-700 shadow-2xl"
              />
              <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 border border-white/10">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ready for AI Extraction</span>
              </div>
            </div>
          </div>

          {/* Bottom Review Action Buttons: "Use Photo" and "Retake Photo" */}
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRetakePhoto}
              className="w-full sm:w-auto flex-1 min-h-[48px] py-3 px-5 rounded-2xl border border-slate-700 hover:bg-slate-800 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-4 h-4 text-slate-300" />
              <span>Retake Photo</span>
            </button>

            <button
              type="button"
              onClick={handleConfirmPhoto}
              className="w-full sm:w-auto flex-1 min-h-[48px] py-3 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-black shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Use Photo</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanMeCameraModal;
