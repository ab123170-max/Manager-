/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import {
  Camera,
  UploadCloud,
  RefreshCw,
  VideoOff,
  AlertTriangle,
  FileText,
  Check,
  SwitchCamera,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { captureFrameFromVideo, fileToBase64 } from '../utils/imageEncoder';
import { SampleDoc } from '../types';

interface CameraViewportProps {
  onImageSelected: (imageBase64: string, source: 'camera' | 'upload' | 'sample') => void;
  disabled?: boolean;
}

export const CameraViewport: React.FC<CameraViewportProps> = ({
  onImageSelected,
  disabled = false,
}) => {
  const { videoRef, cameraState, startCamera, stopCamera, toggleFacingMode } = useCamera();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'samples'>('camera');
  const [dragActive, setDragActive] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [selectedSample, setSelectedSample] = useState<SampleDoc | null>(null);
  const [cameraInitiated, setCameraInitiated] = useState(false);
  const [sampleDocs, setSampleDocs] = useState<SampleDoc[]>([]);

  // Dynamically load sample documents on-demand
  useEffect(() => {
    if (activeTab === 'samples' && sampleDocs.length === 0) {
      import('../data/sampleDocuments').then((mod) => {
        setSampleDocs(mod.SAMPLE_DOCUMENTS);
      });
    }
  }, [activeTab, sampleDocs.length]);

  // Manage camera hardware lifecycle
  useEffect(() => {
    if (activeTab === 'camera' && cameraInitiated && !capturedPreview && !disabled) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, cameraInitiated, capturedPreview, disabled, startCamera, stopCamera]);

  /**
   * ==========================================================================
   * CAMERA FRAME CAPTURE HANDLER
   * ==========================================================================
   * Captures the live frame from videoRef, encodes it to Base64 via Canvas,
   * stops the stream to free camera resources, and passes it forward.
   */
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const base64Data = captureFrameFromVideo(videoRef.current, 0.95);
      setCapturedPreview(base64Data);
      stopCamera();
      onImageSelected(base64Data, 'camera');
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Could not capture camera frame: ${error.message}`);
    }
  };

  /**
   * ==========================================================================
   * FILE UPLOAD HANDLER (FALLBACK)
   * ==========================================================================
   * Reads user's local image file and converts it to a standard Base64 string.
   */
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
    if (activeTab === 'camera' && cameraInitiated) {
      startCamera();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top Tab Bar */}
      <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1.5">
        <button
          type="button"
          onClick={() => {
            setActiveTab('camera');
            handleRetake();
          }}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'camera'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Live Camera</span>
        </button>

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
        {/* If image is already captured / chosen, show preview with option to retake */}
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
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
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
            {/* TAB 1: LIVE CAMERA VIEWPORT */}
            {activeTab === 'camera' && (
              <div className="space-y-4">
                <div className="relative aspect-[4/3] sm:aspect-[16/10] max-h-[420px] w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                  {/* HTML5 Video Element rendering live stream */}
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      cameraState.isStreaming ? 'opacity-100' : 'opacity-0'
                    }`}
                  />

                  {/* Document Viewfinder Boundary Guides (Overlay) */}
                  {cameraState.isStreaming && (
                    <div className="absolute inset-8 sm:inset-12 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                      <div className="flex justify-between">
                        <div className="w-4 h-4 border-t-2 border-l-2 border-white" />
                        <div className="w-4 h-4 border-t-2 border-r-2 border-white" />
                      </div>
                      <div className="text-center">
                        <span className="bg-black/60 backdrop-blur text-white text-[11px] px-2.5 py-1 rounded-full font-medium tracking-wide">
                          Align document within viewfinder
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <div className="w-4 h-4 border-b-2 border-l-2 border-white" />
                        <div className="w-4 h-4 border-b-2 border-r-2 border-white" />
                      </div>
                    </div>
                  )}

                  {/* Camera Not Streaming Placeholder / Start Action / Error state */}
                  {!cameraState.isStreaming && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-300">
                      {cameraState.error ? (
                        <div className="max-w-md space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6" />
                          </div>
                          <h3 className="text-sm font-semibold text-white">
                            Camera Access Issue
                          </h3>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {cameraState.error}
                          </p>
                          <div className="pt-2 flex flex-wrap gap-2 justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                setCameraInitiated(true);
                                startCamera();
                              }}
                              className="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors"
                            >
                              Retry Camera
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab('upload')}
                              className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700 transition-colors"
                            >
                              Use File Upload Instead
                            </button>
                          </div>
                        </div>
                      ) : !cameraInitiated ? (
                        <div className="space-y-3 max-w-xs">
                          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 text-indigo-400 mx-auto flex items-center justify-center shadow-lg">
                            <Camera className="w-7 h-7" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white">Live Camera Scanner</h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Tap below to launch camera feed and capture packaging labels.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCameraInitiated(true);
                              startCamera();
                            }}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 mx-auto"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Launch Live Camera</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                            <VideoOff className="w-6 h-6" />
                          </div>
                          <p className="text-xs text-slate-400">
                            Initializing device camera feed...
                          </p>
                          <button
                            type="button"
                            onClick={() => startCamera()}
                            className="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors"
                          >
                            Grant Camera Access
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Camera Controls Bar */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      disabled={!cameraState.isStreaming || disabled}
                      className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40"
                      title="Flip camera (Front / Back)"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (cameraState.isStreaming) {
                          stopCamera();
                          setCameraInitiated(false);
                        } else {
                          setCameraInitiated(true);
                          startCamera();
                        }
                      }}
                      disabled={disabled}
                      className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                      title={cameraState.isStreaming ? 'Pause Camera' : 'Start Camera'}
                    >
                      {cameraState.isStreaming ? (
                        <VideoOff className="w-4 h-4 text-rose-500" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Primary Trigger: Capture Button */}
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    disabled={!cameraState.isStreaming || disabled}
                    className="flex-1 max-w-xs flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
                  >
                    <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                    <span>Capture Snapshot</span>
                  </button>

                  <div className="w-16 text-right">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                      {cameraState.facingMode === 'environment' ? 'Rear' : 'Front'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: FALLBACK DRAG & DROP FILE UPLOAD */}
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

            {/* TAB 3: SAMPLE DEMO CARDS FOR TESTING */}
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
                      className={`text-left p-3.5 rounded-xl border transition-all ${
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
