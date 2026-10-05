/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import {
  UploadCloud,
  RefreshCw,
  AlertTriangle,
  FileText,
  Check,
  Layers,
} from 'lucide-react';
import { fileToBase64 } from '../utils/imageEncoder';
import { SampleDoc } from '../types';

interface CameraViewportProps {
  onImageSelected: (imageBase64: string, source: 'upload' | 'sample') => void;
  disabled?: boolean;
}

export const CameraViewport: React.FC<CameraViewportProps> = ({
  onImageSelected,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'samples'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [selectedSample, setSelectedSample] = useState<SampleDoc | null>(null);
  const [sampleDocs, setSampleDocs] = useState<SampleDoc[]>([]);

  useEffect(() => {
    if (activeTab === 'samples' && sampleDocs.length === 0) {
      import('../data/sampleDocuments').then((mod) => {
        setSampleDocs(mod.SAMPLE_DOCUMENTS);
      });
    }
  }, [activeTab, sampleDocs.length]);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPEG, PNG, WEBP).');
      return;
    }
    try {
      const base64Data = await fileToBase64(file);
      setCapturedPreview(base64Data);
      onImageSelected(base64Data, 'upload');
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Failed to read file: ${error.message}`);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSelectSample = (sample: SampleDoc) => {
    setSelectedSample(sample);
    setCapturedPreview(sample.dataUrl);
    onImageSelected(sample.dataUrl, 'sample');
  };

  const handleRetake = () => {
    setCapturedPreview(null);
    setSelectedSample(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Notice Banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center gap-2.5 text-amber-900 text-xs">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>Camera scanner temporarily unavailable. You can upload an image or enter a barcode manually.</span>
      </div>

      {/* Top Tab Bar */}
      <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1.5">
        <button
          type="button"
          onClick={() => {
            setActiveTab('upload');
            handleRetake();
          }}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'upload'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload File</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('samples');
            handleRetake();
          }}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'samples'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Try Demo Cards</span>
        </button>
      </div>

      {/* Main Viewport Content */}
      <div className="p-4 sm:p-6">
        {capturedPreview ? (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center max-h-[380px]">
              <img
                src={capturedPreview}
                alt="Selected document"
                loading="lazy"
                className="max-h-[380px] w-auto object-contain"
              />
              <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur text-white text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Image Ready for Extraction
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRetake}
                disabled={disabled}
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retake / Change Image
              </button>
              <p className="text-xs text-slate-500">
                Proceeding with multimodal AI extraction...
              </p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'upload' && (
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleInputChange}
                  className="hidden"
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-indigo-500 bg-indigo-50/50'
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-slate-700 mx-auto flex items-center justify-center shadow-xs mb-3">
                    <UploadCloud className="w-7 h-7 text-indigo-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">
                    Click to browse or drag and drop image
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                    Supports high-resolution JPG, PNG, or WebP photos of IDs, driver licenses, invoices, or application forms.
                  </p>
                  <span className="inline-block py-2 px-4 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-xs hover:bg-slate-50">
                    Select Document Photo
                  </span>
                </div>
              </div>
            )}

            {activeTab === 'samples' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Select any pre-configured mock document card to test the multimodal AI auto-fill pipeline instantly:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {sampleDocs.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleSelectSample(doc)}
                      className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                        selectedSample?.id === doc.id
                          ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="w-full aspect-[16/10] rounded-lg overflow-hidden border border-slate-200 bg-slate-100 mb-2.5 flex items-center justify-center">
                        <img
                          src={doc.dataUrl}
                          alt={doc.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {doc.name}
                        </span>
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {doc.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
