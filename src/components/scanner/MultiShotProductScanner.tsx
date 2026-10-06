/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, ChangeEvent, useCallback } from 'react';
import {
  Camera,
  UploadCloud,
  Sparkles,
  Trash2,
  Plus,
  Layers,
  Image as ImageIcon,
  ArrowRight,
  Info,
  RotateCcw,
  Zap,
  ZapOff,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  isScanMeCameraNative,
  openScanMeCamera,
  closeScanMeCamera,
  captureScanMePhoto,
  switchScanMeCamera,
  setScanMeFlashMode,
  requestCameraPermission,
} from '../../plugins/scanmeCamera';
import { fileToBase64 } from '../../utils/imageEncoder';
import { SampleDoc } from '../../types';

interface MultiShotProductScannerProps {
  onAnalyze: (images: string[]) => void;
  disabled?: boolean;
}

const MAX_PHOTOS = 5;

const RECOMMENDED_SHOT_HINTS = [
  { step: 1, title: 'Front Label', desc: 'Product Name & Retail Price' },
  { step: 2, title: 'Date Markings', desc: 'MFD / EXP stamped dates' },
  { step: 3, title: 'Back / Side Label', desc: 'Best Before duration & details' },
  { step: 4, title: 'Additional Angle', desc: 'Alternative price or date text' },
  { step: 5, title: 'Fine Print', desc: 'Additional label clarification' },
];

export const MultiShotProductScanner: React.FC<MultiShotProductScannerProps> = ({
  onAnalyze,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'samples'>('camera');
  const [sampleDocs, setSampleDocs] = useState<SampleDoc[]>([]);
  const [showTips, setShowTips] = useState(false);

  // Native CameraX state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [flashMode, setFlashMode] = useState<'auto' | 'on' | 'off' | 'torch'>('auto');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastCapturedToast, setLastCapturedToast] = useState(false);

  const isNative = isScanMeCameraNative();

  // Clean shutdown of native camera when unmounting
  useEffect(() => {
    return () => {
      if (isScanMeCameraNative()) {
        closeScanMeCamera().catch(() => {});
      }
    };
  }, []);

  // Dynamically load sample packaged products on-demand
  useEffect(() => {
    if (activeTab === 'samples' && sampleDocs.length === 0) {
      import('../../data/sampleDocuments').then((mod) => {
        setSampleDocs(mod.SAMPLE_DOCUMENTS);
      });
    }
  }, [activeTab, sampleDocs.length]);

  const handleStartNativeCamera = useCallback(async () => {
    if (!isNative) {
      setActiveTab('upload');
      return;
    }

    if (capturedPhotos.length >= MAX_PHOTOS) {
      alert(`Maximum ${MAX_PHOTOS} photos reached. You can now analyze the product.`);
      return;
    }

    setCameraError(null);
    setCameraLoading(true);

    try {
      const granted = await requestCameraPermission();
      if (!granted) {
        setCameraError('Camera permission is required to take a photo. Please allow camera access in Android settings.');
        setCameraLoading(false);
        return;
      }

      const result = await openScanMeCamera({ facingMode, toBack: true });
      if (result.success) {
        setIsCameraActive(true);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('[MultiShotProductScanner] open camera error:', error);
      setCameraError(error.message || 'Failed to initialize CameraX.');
    } finally {
      setCameraLoading(false);
    }
  }, [isNative, capturedPhotos.length, facingMode]);

  const handleCloseNativeCamera = useCallback(async () => {
    try {
      await closeScanMeCamera();
    } catch (err) {
      console.warn('[MultiShotProductScanner] close camera error:', err);
    } finally {
      setIsCameraActive(false);
    }
  }, []);

  const handleCapturePhoto = async () => {
    if (isCapturing || !isCameraActive) return;
    setIsCapturing(true);
    try {
      const result = await captureScanMePhoto();
      if (result && result.dataUrl) {
        setCapturedPhotos((prev) => {
          const next = [...prev, result.dataUrl];
          if (next.length >= MAX_PHOTOS) {
            handleCloseNativeCamera();
          }
          return next;
        });

        // Show brief success toast
        setLastCapturedToast(true);
        setTimeout(() => setLastCapturedToast(false), 1500);
      }
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Capture failed: ${error.message || 'Please try again'}`);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSwitchCamera = async () => {
    try {
      const result = await switchScanMeCamera();
      if (result.success) {
        setFacingMode(result.facingMode === 'user' ? 'user' : 'environment');
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.warn('[MultiShotProductScanner] switch camera error:', error);
    }
  };

  const handleToggleFlash = async () => {
    const modes: ('auto' | 'on' | 'off' | 'torch')[] = ['auto', 'on', 'torch', 'off'];
    const nextMode = modes[(modes.indexOf(flashMode) + 1) % modes.length];
    try {
      const result = await setScanMeFlashMode(nextMode);
      if (result.success) {
        setFlashMode(nextMode);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.warn('[MultiShotProductScanner] toggle flash error:', error);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setCapturedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAllPhotos = () => {
    setCapturedPhotos([]);
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPEG, PNG, WEBP).');
      return;
    }
    if (capturedPhotos.length >= MAX_PHOTOS) {
      alert(`Maximum ${MAX_PHOTOS} photos reached.`);
      return;
    }
    try {
      const base64Data = await fileToBase64(file);
      setCapturedPhotos((prev) => [...prev, base64Data]);
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Failed to load file: ${error.message}`);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = (Array.from(e.target.files) as File[]).slice(0, MAX_PHOTOS - capturedPhotos.length);
      files.forEach((f) => handleFileUpload(f));
    }
  };

  const handleSelectSample = (dataUrl: string) => {
    if (capturedPhotos.length >= MAX_PHOTOS) return;
    setCapturedPhotos((prev) => [...prev, dataUrl]);
  };

  const handleStartAnalysis = () => {
    if (capturedPhotos.length === 0) return;
    if (isCameraActive) {
      handleCloseNativeCamera();
    }
    onAnalyze(capturedPhotos);
  };

  const currentHint = RECOMMENDED_SHOT_HINTS[Math.min(capturedPhotos.length, MAX_PHOTOS - 1)];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Top Header & Tab Controls */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 uppercase tracking-wider">
              <Sparkles className="w-3 h-3" /> Multi-Shot Mode
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Photos: <span className="font-bold text-slate-900">{capturedPhotos.length}</span> / {MAX_PHOTOS}
            </span>
            <button
              type="button"
              onClick={() => setShowTips((prev) => !prev)}
              className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1 ml-1 cursor-pointer"
              title="Show guide & tips"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{showTips ? 'Hide tips' : 'Tips'}</span>
            </button>
          </div>
          {showTips && (
            <p className="text-xs text-slate-600 mt-1.5 animate-in fade-in duration-150">
              Take or upload 1 to {MAX_PHOTOS} photos of product packaging (Front label, dates, best before) for AI extraction.
            </p>
          )}
        </div>

        {/* Source Mode Selector */}
        <div className="flex bg-slate-200/60 p-1 rounded-xl gap-1 self-start sm:self-auto">
          {isNative && (
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" /> Camera
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (isCameraActive) handleCloseNativeCamera();
              setActiveTab('upload');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" /> Upload
          </button>
          <button
            type="button"
            onClick={() => {
              if (isCameraActive) handleCloseNativeCamera();
              setActiveTab('samples');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'samples'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> Samples
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 space-y-4">
        {/* Recommended Shot Suggestion Pill */}
        {showTips && capturedPhotos.length < MAX_PHOTOS && (
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-indigo-50/80 border border-indigo-100 text-indigo-900 text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="font-bold bg-indigo-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                {capturedPhotos.length + 1}
              </span>
              <span>
                <strong className="font-semibold">Recommended Shot:</strong> {currentHint.title} ({currentHint.desc})
              </span>
            </div>
            <span className="text-[11px] text-indigo-600 font-medium hidden sm:inline">
              Up to {MAX_PHOTOS} photos
            </span>
          </div>
        )}

        {/* 1. Android Native Camera Mode */}
        {activeTab === 'camera' && (
          <div className="space-y-3">
            {isCameraActive ? (
              <div className="relative aspect-[4/3] sm:aspect-[16/10] max-h-[440px] w-full bg-transparent rounded-2xl overflow-hidden border-2 border-emerald-500 flex flex-col justify-between p-4 shadow-xl">
                {/* Top Controls Overlay */}
                <div className="flex items-center justify-between z-10">
                  <div className="bg-slate-950/70 text-white px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Shot #{capturedPhotos.length + 1} of {MAX_PHOTOS}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Toggle Flash */}
                    <button
                      type="button"
                      onClick={handleToggleFlash}
                      className="p-2 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white backdrop-blur-md border border-white/10 transition-transform active:scale-95 cursor-pointer"
                      title={`Flash: ${flashMode.toUpperCase()}`}
                    >
                      {flashMode === 'off' ? (
                        <ZapOff className="w-4 h-4 text-slate-400" />
                      ) : (
                        <Zap className={`w-4 h-4 ${flashMode === 'torch' ? 'text-amber-400' : 'text-emerald-400'}`} />
                      )}
                    </button>

                    {/* Switch Camera */}
                    <button
                      type="button"
                      onClick={handleSwitchCamera}
                      className="p-2 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white backdrop-blur-md border border-white/10 transition-transform active:scale-95 cursor-pointer"
                      title="Switch Camera (Front / Rear)"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    {/* Close Camera */}
                    <button
                      type="button"
                      onClick={handleCloseNativeCamera}
                      className="p-2 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white backdrop-blur-md border border-white/10 transition-transform active:scale-95 cursor-pointer"
                      title="Close Camera"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Viewfinder Boundary Guides */}
                <div className="absolute inset-x-8 inset-y-16 border-2 border-dashed border-emerald-400/60 rounded-2xl pointer-events-none flex items-center justify-center">
                  <div className="text-center px-4 py-1.5 rounded-lg bg-slate-950/60 text-white text-[11px] font-medium backdrop-blur-sm">
                    Center product packaging label & dates
                  </div>
                </div>

                {/* Shutter Capture Button Overlay */}
                <div className="flex items-center justify-center z-10 pt-2">
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    disabled={isCapturing}
                    className="w-16 h-16 rounded-full bg-white hover:bg-slate-100 border-4 border-emerald-500 flex items-center justify-center shadow-2xl transition-transform active:scale-90 cursor-pointer disabled:opacity-50"
                    title="Capture Photo"
                  >
                    {isCapturing ? (
                      <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                        <Camera className="w-5 h-5" />
                      </div>
                    )}
                  </button>
                </div>

                {/* Toast feedback when photo taken */}
                {lastCapturedToast && (
                  <div className="absolute top-16 inset-x-0 mx-auto w-max bg-emerald-600 text-white px-3.5 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Photo captured!</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-sm">
                  <Camera className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Native In-App CameraX</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Take high-resolution photos of product packaging directly inside the app for AI product recognition and date extraction.
                  </p>
                </div>

                {cameraError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 text-left max-w-md mx-auto">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold">{cameraError}</p>
                      <button
                        type="button"
                        onClick={handleStartNativeCamera}
                        className="mt-1.5 text-xs font-bold text-rose-700 underline hover:text-rose-900 cursor-pointer"
                      >
                        Retry Camera Permission
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleStartNativeCamera}
                  disabled={cameraLoading || disabled}
                  className="py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
                >
                  {cameraLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Opening Camera...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span>Open Camera & Take Photo</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. File Upload Mode */}
        {activeTab === 'upload' && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 transition-all p-8 text-center cursor-pointer space-y-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleInputChange}
              className="hidden"
            />
            <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                Click or drag & drop product packaging photos
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Select 1 to {MAX_PHOTOS} photos (JPEG, PNG, WEBP)
              </p>
            </div>
            <button
              type="button"
              className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
            >
              Browse Gallery / Files
            </button>
          </div>
        )}

        {/* 3. Sample Packaged Products */}
        {activeTab === 'samples' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Select one or multiple sample product packaging photos to test multi-shot extraction:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {sampleDocs.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleSelectSample(sample.dataUrl)}
                  disabled={capturedPhotos.length >= MAX_PHOTOS}
                  className="group relative rounded-xl overflow-hidden border border-slate-200 hover:border-emerald-500 transition-all text-left bg-slate-50 cursor-pointer"
                >
                  <img
                    src={sample.dataUrl}
                    alt={sample.name}
                    className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="p-2 bg-white border-t border-slate-100">
                    <p className="text-[11px] font-bold text-slate-800 truncate">{sample.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{sample.description}</p>
                  </div>
                  <div className="absolute top-1.5 right-1.5 bg-slate-900/80 text-white rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Synchronized Multi-Shot Thumbnail Tray */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" /> Selected Product Photos
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                {capturedPhotos.length} / {MAX_PHOTOS}
              </span>
            </div>

            {capturedPhotos.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllPhotos}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Clear All
              </button>
            )}
          </div>

          {/* Thumbnails Grid */}
          {capturedPhotos.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-500">
              No photos captured yet. Take or upload 1 to {MAX_PHOTOS} shots of the product packaging.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {capturedPhotos.map((photoUrl, idx) => (
                <div
                  key={idx}
                  className="relative rounded-xl overflow-hidden border-2 border-emerald-500 shadow-sm group aspect-square bg-slate-900"
                >
                  <img
                    src={photoUrl}
                    alt={`Product shot ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Shot Index Pill */}
                  <div className="absolute top-1.5 left-1.5 bg-slate-900/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                    Shot #{idx + 1}
                  </div>
                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    title="Remove photo"
                    className="absolute top-1.5 right-1.5 bg-rose-600 hover:bg-rose-500 text-white p-1 rounded-md shadow-md transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* Add More Slot Placeholder */}
              {capturedPhotos.length < MAX_PHOTOS && (
                <div
                  onClick={() => {
                    if (isNative) {
                      setActiveTab('camera');
                      handleStartNativeCamera();
                    } else {
                      fileInputRef.current?.click();
                    }
                  }}
                  className="rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex flex-col items-center justify-center p-2 text-center cursor-pointer aspect-square text-slate-500 hover:text-emerald-700"
                >
                  <Plus className="w-5 h-5 mb-1 text-slate-400" />
                  <span className="text-[11px] font-semibold">
                    Add Shot #{capturedPhotos.length + 1}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Primary Action Button: Analyze Product */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={capturedPhotos.length === 0 || disabled}
            className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
              capturedPhotos.length > 0 && !disabled
                ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20 active:scale-[0.99]'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>
              Analyze Product ({capturedPhotos.length} {capturedPhotos.length === 1 ? 'Photo' : 'Photos'})
            </span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};
