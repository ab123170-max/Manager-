/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import {
  UploadCloud,
  Sparkles,
  Trash2,
  Plus,
  AlertTriangle,
  Layers,
  Image as ImageIcon,
  ArrowRight,
  Info,
  Camera,
  RefreshCw,
} from 'lucide-react';
import { fileToBase64 } from '../../utils/imageEncoder';
import { SampleDoc } from '../../types';
import { ScanMeCamera } from '../../plugins/scanmeCamera';

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
  const [activeTab, setActiveTab] = useState<'upload' | 'samples'>('upload');
  const [sampleDocs, setSampleDocs] = useState<SampleDoc[]>([]);
  const [showTips, setShowTips] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Dynamically load sample packaged products on-demand
  useEffect(() => {
    if (activeTab === 'samples' && sampleDocs.length === 0) {
      import('../../data/sampleDocuments').then((mod) => {
        setSampleDocs(mod.SAMPLE_DOCUMENTS);
      });
    }
  }, [activeTab, sampleDocs.length]);

  const openNativeCamera = async () => {
    if (capturedPhotos.length >= MAX_PHOTOS || cameraBusy) return;
    setCameraBusy(true); setCameraError(null);
    try {
      await ScanMeCamera.requestCameraPermission();
      await ScanMeCamera.openCamera({ facingMode: 'environment' });
      setCameraOpen(true);
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : 'Unable to open the in-app camera.');
    } finally { setCameraBusy(false); }
  };

  const captureNativePhoto = async () => {
    if (cameraBusy) return;
    setCameraBusy(true); setCameraError(null);
    try {
      const result = await ScanMeCamera.capturePhoto();
      if (result?.dataUrl) setCapturedPhotos((prev) => [...prev, result.dataUrl].slice(0, MAX_PHOTOS));
      if (capturedPhotos.length + 1 >= MAX_PHOTOS) {
        await ScanMeCamera.closeCamera(); setCameraOpen(false);
      }
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : 'Photo capture failed.');
    } finally { setCameraBusy(false); }
  };

  const closeNativeCamera = async () => {
    try { await ScanMeCamera.closeCamera(); } catch {}
    setCameraOpen(false);
  };

  const switchNativeCamera = async () => {
    try { await ScanMeCamera.switchCamera(); }
    catch (err) { setCameraError(err instanceof Error ? err.message : 'Could not switch camera.'); }
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
              Upload 1 to {MAX_PHOTOS} photos of product packaging (Front, Dates, Best Before) for combined AI extraction.
            </p>
          )}
        </div>

        {/* Source Mode Selector */}
        <div className="flex bg-slate-200/60 p-1 rounded-xl gap-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" /> Upload Photos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('samples')}
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

        {cameraOpen && (
          <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
            <div className="flex-1 relative min-h-0">
              <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent">
                <button type="button" onClick={closeNativeCamera} className="px-3 py-2 rounded-full bg-black/50 text-white text-xs font-semibold">Close</button>
                <span className="text-white text-xs font-bold">ScanMe AI Camera</span>
                <button type="button" onClick={switchNativeCamera} className="p-2 rounded-full bg-black/50 text-white"><RefreshCw className="w-5 h-5" /></button>
              </div>
              <div className="absolute bottom-7 left-0 right-0 z-10 flex justify-center">
                <button type="button" onClick={captureNativePhoto} disabled={cameraBusy} className="w-20 h-20 rounded-full border-4 border-white bg-white/20 shadow-2xl flex items-center justify-center active:scale-95 disabled:opacity-50">
                  <span className="w-14 h-14 rounded-full bg-white" />
                </button>
              </div>
              {cameraError && <div className="absolute bottom-28 left-4 right-4 z-20 p-3 rounded-xl bg-red-600/90 text-white text-xs text-center">{cameraError}</div>}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <button type="button" onClick={openNativeCamera} disabled={disabled || cameraBusy || capturedPhotos.length >= MAX_PHOTOS} className="w-full py-4 rounded-xl bg-[#1473EA] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            <Camera className="w-5 h-5" /> {cameraBusy ? 'Opening camera…' : 'Open Camera & Take Photo'}
          </button>
          {cameraError && !cameraOpen && <p className="mt-2 text-xs text-red-600 text-center">{cameraError}</p>}
          <p className="mt-2 text-[11px] text-slate-600 text-center">Android APK: camera opens inside ScanMe AI. No browser camera or file picker is used.</p>
        </div>

        {/* 1. File Upload Mode */}
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

        {/* 2. Sample Packaged Products */}
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
              No photos selected yet. Upload 1 to {MAX_PHOTOS} shots of the product packaging.
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
                    fileInputRef.current?.click();
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
