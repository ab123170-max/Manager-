/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import {
  Camera,
  UploadCloud,
  RotateCcw,
  Sparkles,
  SwitchCamera,
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Image as ImageIcon,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useCamera } from '../../hooks/useCamera';
import { captureFrameFromVideo, fileToBase64 } from '../../utils/imageEncoder';
import { SAMPLE_DOCUMENTS } from '../../data/sampleDocuments';

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
  const { videoRef, cameraState, startCamera, stopCamera, toggleFacingMode } = useCamera();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'samples'>('camera');
  const [cameraStarted, setCameraStarted] = useState(true);
  const [isFlashActive, setIsFlashActive] = useState(false);

  // Initialize camera lifecycle
  useEffect(() => {
    if (activeTab === 'camera' && cameraStarted && !disabled) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, cameraStarted, disabled, startCamera, stopCamera]);

  const handleStartCamera = () => {
    setCameraStarted(true);
    startCamera();
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current || capturedPhotos.length >= MAX_PHOTOS) return;
    try {
      // Visual flash effect
      setIsFlashActive(true);
      setTimeout(() => setIsFlashActive(false), 150);

      const base64Data = captureFrameFromVideo(videoRef.current, 0.80);
      setCapturedPhotos((prev) => [...prev, base64Data]);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Failed to capture photo:', error);
      alert(`Could not capture photo: ${error.message}`);
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
    stopCamera();
    onAnalyze(capturedPhotos);
  };

  const currentHint = RECOMMENDED_SHOT_HINTS[Math.min(capturedPhotos.length, MAX_PHOTOS - 1)];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Top Header & Tab Controls */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 uppercase tracking-wider">
              <Sparkles className="w-3 h-3" /> Multi-Shot Scan Mode
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Photos: <span className="font-bold text-slate-900">{capturedPhotos.length}</span> / {MAX_PHOTOS}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Capture 1 to {MAX_PHOTOS} photos of product labels (Front, Dates, Best Before) for combined AI extraction.
          </p>
        </div>

        {/* Source Mode Selector */}
        <div className="flex bg-slate-200/60 p-1 rounded-xl gap-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'camera'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" /> Camera
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" /> Upload
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'samples'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> Samples
          </button>
        </div>
      </div>

      {/* Main Viewport Content */}
      <div className="p-4 sm:p-6 space-y-4">
        {/* Recommended Shot Suggestion Pill */}
        {capturedPhotos.length < MAX_PHOTOS && (
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-indigo-50/80 border border-indigo-100 text-indigo-900 text-xs">
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

        {/* 1. Camera Mode */}
        {activeTab === 'camera' && (
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] sm:aspect-[16/10] max-h-[420px] flex items-center justify-center border border-slate-800 shadow-inner">
            {/* Live Video Element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraState.isStreaming ? 'block' : 'hidden'}`}
            />

            {/* Flash Overlay Effect */}
            {isFlashActive && (
              <div className="absolute inset-0 bg-white pointer-events-none transition-opacity duration-150" />
            )}

            {/* Viewfinder Target Guidelines */}
            {cameraState.isStreaming && (
              <div className="absolute inset-6 sm:inset-10 border border-white/30 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
                  <div className="w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
                </div>
                <div className="text-center">
                  <span className="text-[11px] bg-slate-900/80 text-white/90 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10 font-medium">
                    Align label or dates in frame
                  </span>
                </div>
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
                  <div className="w-6 h-6 border-b-2 border-r-2 border-emerald-400" />
                </div>
              </div>
            )}

            {/* Initial Camera Start Overlay */}
            {!cameraStarted && (
              <div className="text-center p-6 space-y-4 max-w-sm">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Camera className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Start Rear Camera</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Opens your device's high-resolution rear camera to snap product label photos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartCamera}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" /> Open Camera Viewfinder
                </button>
              </div>
            )}

            {/* Camera Error / Permission Block */}
            {cameraStarted && cameraState.error && (
              <div className="text-center p-6 space-y-3 max-w-sm">
                <div className="w-12 h-12 mx-auto rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">Camera Access Notice</h3>
                <p className="text-xs text-slate-300">{cameraState.error}</p>
                <div className="flex gap-2 justify-center pt-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="py-2 px-3.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Try Again
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="py-2 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <UploadCloud className="w-3.5 h-3.5" /> Use File Upload
                  </button>
                </div>
              </div>
            )}

            {/* Camera Controls Overlay (Top Right) */}
            {cameraState.isStreaming && (
              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  title="Switch Camera (Front/Rear)"
                  className="p-2.5 rounded-xl bg-slate-900/70 hover:bg-slate-900 text-white border border-white/20 backdrop-blur-sm transition-all"
                >
                  <SwitchCamera className="w-4 h-4" />
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
                Click or drag & drop product photos
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Select 1 to {MAX_PHOTOS} photos (JPEG, PNG, WEBP)
              </p>
            </div>
            <button
              type="button"
              className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              Browse Files
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
              {SAMPLE_DOCUMENTS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleSelectSample(sample.dataUrl)}
                  disabled={capturedPhotos.length >= MAX_PHOTOS}
                  className="group relative rounded-xl overflow-hidden border border-slate-200 hover:border-emerald-500 transition-all text-left bg-slate-50"
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

        {/* Shutter / Capture Button for Live Camera */}
        {activeTab === 'camera' && cameraState.isStreaming && (
          <div className="flex items-center justify-center pt-1 pb-2">
            <button
              type="button"
              onClick={handleCapturePhoto}
              disabled={capturedPhotos.length >= MAX_PHOTOS}
              className={`relative group flex items-center justify-center rounded-full p-2 border-4 transition-all ${
                capturedPhotos.length >= MAX_PHOTOS
                  ? 'border-slate-300 opacity-50 cursor-not-allowed'
                  : 'border-emerald-500/40 hover:border-emerald-500 shadow-xl shadow-emerald-500/20 active:scale-95'
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white transition-all">
                <Camera className="w-6 h-6" />
              </div>
            </button>
          </div>
        )}

        {/* Synchronized Multi-Shot Thumbnail Tray */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" /> Captured Product Photos
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                {capturedPhotos.length} / {MAX_PHOTOS}
              </span>
            </div>

            {capturedPhotos.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllPhotos}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Clear All
              </button>
            )}
          </div>

          {/* Thumbnails Grid */}
          {capturedPhotos.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-500">
              No photos captured yet. Snap 1 to {MAX_PHOTOS} shots of the product packaging.
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
                    className="absolute top-1.5 right-1.5 bg-rose-600 hover:bg-rose-500 text-white p-1 rounded-md shadow-md transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* Add More Slot Placeholder */}
              {capturedPhotos.length < MAX_PHOTOS && (
                <div
                  onClick={() => {
                    if (activeTab === 'camera' && cameraState.isStreaming) {
                      handleCapturePhoto();
                    } else if (activeTab === 'upload') {
                      fileInputRef.current?.click();
                    } else {
                      setActiveTab('camera');
                      if (!cameraStarted) handleStartCamera();
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
            className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
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
