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
  CheckCircle2,
} from 'lucide-react';
import { ScanMeCameraModal } from '../camera/ScanMeCameraModal';
import { fileToBase64 } from '../../utils/imageEncoder';
import { SampleDoc } from '../../types';

interface MultiShotProductScannerProps {
  onAnalyze: (images: string[], session?: any) => void;
  disabled?: boolean;
  initialAutoOpen?: boolean;
  onCameraOpened?: () => void;
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
  initialAutoOpen = false,
  onCameraOpened,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'samples'>('camera');
  const [sampleDocs, setSampleDocs] = useState<SampleDoc[]>([]);
  const [showTips, setShowTips] = useState(false);

  // Full-Screen In-App Native Camera Modal State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Auto-open camera if requested by initial navigation
  useEffect(() => {
    if (initialAutoOpen) {
      setIsCameraModalOpen(true);
      onCameraOpened?.();
    }
  }, [initialAutoOpen, onCameraOpened]);

  // Dynamically load sample packaged products on-demand
  useEffect(() => {
    if (activeTab === 'samples' && sampleDocs.length === 0) {
      import('../../data/sampleDocuments').then((mod) => {
        setSampleDocs(mod.SAMPLE_DOCUMENTS);
      });
    }
  }, [activeTab, sampleDocs.length]);

  const handleOpenCamera = useCallback(() => {
    if (capturedPhotos.length >= MAX_PHOTOS) {
      alert(`Maximum ${MAX_PHOTOS} photos reached. You can now analyze the product.`);
      return;
    }
    setIsCameraModalOpen(true);
  }, [capturedPhotos.length]);

  const handleFinishAndExtractFromCamera = useCallback(
    (shots: string[], session?: any) => {
      setCapturedPhotos(shots);
      setIsCameraModalOpen(false);
      if (shots.length > 0) {
        onAnalyze(shots, session);
      }
    },
    [onAnalyze]
  );

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
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
      {/* Unified Full-Screen In-App Continuous Multi-Shot Camera Modal */}
      <ScanMeCameraModal
        isOpen={isCameraModalOpen}
        onFinishAndExtract={handleFinishAndExtractFromCamera}
        onClose={() => setIsCameraModalOpen(false)}
        initialShots={capturedPhotos}
        maxShots={MAX_PHOTOS}
        title="Multi-Shot Camera"
        subtitle={currentHint.desc}
      />

      {/* Top Header & Mode Navigation */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-emerald-600" /> Multi-Shot Scanner
            </span>
            <span className="text-xs font-bold text-slate-600">
              Photos: <strong className="text-slate-900">{capturedPhotos.length}</strong> / {MAX_PHOTOS}
            </span>
            <button
              type="button"
              onClick={() => setShowTips((prev) => !prev)}
              className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1 ml-1 cursor-pointer"
              title="Show guide & tips"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{showTips ? 'Hide tips' : 'Tips'}</span>
            </button>
          </div>
          {showTips && (
            <p className="text-xs text-slate-600 mt-2 leading-relaxed animate-in fade-in duration-150">
              Take 1 to {MAX_PHOTOS} photos of product packaging (Front label, MFD/EXP dates, MRP price). Multimodal AI synthesizes all shots for 100% extraction accuracy.
            </p>
          )}
        </div>

        {/* Source Mode Selector */}
        <div className="flex bg-slate-200/60 p-1 rounded-2xl gap-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-600" /> Camera
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5 text-indigo-600" /> Upload
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'samples'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-amber-600" /> Samples
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 space-y-5">
        {/* Recommended Shot Suggestion Pill */}
        {capturedPhotos.length < MAX_PHOTOS && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-indigo-50/90 border border-indigo-100 text-indigo-950 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="font-black bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[11px] shrink-0">
                {capturedPhotos.length + 1}
              </span>
              <span>
                <strong>Next Recommended Shot:</strong> {currentHint.title} — {currentHint.desc}
              </span>
            </div>
            <span className="text-[11px] text-indigo-700 font-bold hidden sm:inline">
              Up to {MAX_PHOTOS} photos
            </span>
          </div>
        )}

        {/* 1. Camera Trigger Hero View */}
        {activeTab === 'camera' && (
          <div className="p-6 sm:p-8 rounded-3xl border border-slate-200/90 bg-gradient-to-b from-slate-50 to-white text-center space-y-4 shadow-2xs">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <Camera className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                {capturedPhotos.length === 0
                  ? 'In-App Camera Scanner'
                  : `Add Shot #${capturedPhotos.length + 1} with Camera`}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Scan product labels, barcodes, manufacturing dates, and pricing directly inside the app.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenCamera}
              disabled={disabled || capturedPhotos.length >= MAX_PHOTOS}
              className="min-h-[52px] py-3.5 px-8 rounded-2xl bg-[#092B4C] hover:bg-slate-900 text-white text-sm font-extrabold shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2.5 cursor-pointer active:scale-95 disabled:opacity-60"
              id="btn-scan-with-camera"
            >
              <Camera className="w-5 h-5 text-emerald-400" />
              <span>Scan with Camera</span>
            </button>
          </div>
        )}

        {/* 2. File Upload View */}
        {activeTab === 'upload' && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="rounded-3xl border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 transition-all p-8 text-center cursor-pointer space-y-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleInputChange}
              className="hidden"
            />
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">
                Click or drag & drop product packaging photos
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Select 1 to {MAX_PHOTOS} photos (JPEG, PNG, WEBP)
              </p>
            </div>
            <button
              type="button"
              className="py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
            >
              Browse Gallery / Files
            </button>
          </div>
        )}

        {/* 3. Sample Packaged Products */}
        {activeTab === 'samples' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 font-medium">
              Select one or multiple sample packaged items to test multi-shot extraction pipeline:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {sampleDocs.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleSelectSample(sample.dataUrl)}
                  disabled={capturedPhotos.length >= MAX_PHOTOS}
                  className="group relative rounded-2xl overflow-hidden border border-slate-200 hover:border-emerald-500 transition-all text-left bg-slate-50 cursor-pointer shadow-2xs"
                >
                  <img
                    src={sample.dataUrl}
                    alt={sample.name}
                    className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="p-2.5 bg-white border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">{sample.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{sample.description}</p>
                  </div>
                  <div className="absolute top-2 right-2 bg-slate-900/80 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Photos Tray */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-500" /> Captured Product Photos
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                {capturedPhotos.length} / {MAX_PHOTOS}
              </span>
            </div>

            {capturedPhotos.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllPhotos}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            )}
          </div>

          {/* Thumbnails Grid */}
          {capturedPhotos.length === 0 ? (
            <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-center text-xs text-slate-500 font-medium">
              No photos captured yet. Tap &ldquo;Scan with Camera&rdquo; above to start capturing product shots.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {capturedPhotos.map((photoUrl, idx) => (
                <div
                  key={idx}
                  className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-sm group aspect-square bg-slate-950"
                >
                  <img
                    src={photoUrl}
                    alt={`Product shot ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Shot Index Pill */}
                  <div className="absolute top-2 left-2 bg-slate-900/85 text-white text-[10px] font-black px-2 py-0.5 rounded-md backdrop-blur-sm border border-white/10">
                    Shot #{idx + 1}
                  </div>
                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    title="Remove photo"
                    className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-500 text-white p-1.5 rounded-lg shadow-md transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Add More Slot Placeholder */}
              {capturedPhotos.length < MAX_PHOTOS && (
                <div
                  onClick={handleOpenCamera}
                  className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex flex-col items-center justify-center p-3 text-center cursor-pointer aspect-square text-slate-500 hover:text-emerald-700"
                >
                  <Plus className="w-6 h-6 mb-1 text-slate-400" />
                  <span className="text-xs font-bold">
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
            className={`w-full min-h-[52px] py-3.5 px-6 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2.5 shadow-lg cursor-pointer ${
              capturedPhotos.length > 0 && !disabled
                ? 'bg-[#1473EA] hover:bg-blue-600 text-white shadow-blue-500/20 active:scale-[0.99]'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            <Sparkles className="w-4 h-4 text-white" />
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

export default MultiShotProductScanner;
