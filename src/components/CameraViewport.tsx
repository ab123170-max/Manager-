/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, ChangeEvent, useCallback } from 'react';
import {
  Camera,
  UploadCloud,
  RefreshCw,
  FileText,
  Check,
  Layers,
  RotateCcw,
  Zap,
  ZapOff,
  X,
  Loader2,
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
} from '../plugins/scanmeCamera';
import {
  NativeCameraPermissionModal,
  PermissionModalState,
} from './camera/NativeCameraPermissionModal';
import { fileToBase64 } from '../utils/imageEncoder';
import { SampleDoc } from '../types';

interface CameraViewportProps {
  onImageSelected: (imageBase64: string, source: 'upload' | 'sample' | 'camera') => void;
  disabled?: boolean;
}

export const CameraViewport: React.FC<CameraViewportProps> = ({
  onImageSelected,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'samples'>('camera');
  const [dragActive, setDragActive] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [selectedSample, setSelectedSample] = useState<SampleDoc | null>(null);
  const [sampleDocs, setSampleDocs] = useState<SampleDoc[]>([]);

  // Native camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [flashMode, setFlashMode] = useState<'auto' | 'on' | 'off' | 'torch'>('auto');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCapturing, setIsCapturing] = useState(false);

  // Permission modal states
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [permissionModalInitialState, setPermissionModalInitialState] = useState<PermissionModalState>('denied');

  const isNative = isScanMeCameraNative();

  useEffect(() => {
    return () => {
      if (isScanMeCameraNative()) {
        closeScanMeCamera().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'samples' && sampleDocs.length === 0) {
      import('../data/sampleDocuments').then((mod) => {
        setSampleDocs(mod.SAMPLE_DOCUMENTS);
      });
    }
  }, [activeTab, sampleDocs.length]);

  const launchCameraDirect = useCallback(async () => {
    setIsPermissionModalOpen(false);
    setCameraLoading(true);
    try {
      const result = await openScanMeCamera({ facingMode, toBack: true });
      if (result.success) {
        setIsCameraActive(true);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('[CameraViewport] open camera error:', error);
      alert(`Failed to open camera: ${error.message || 'Please try again.'}`);
    } finally {
      setCameraLoading(false);
    }
  }, [facingMode]);

  const handleStartNativeCamera = useCallback(async () => {
    if (!isNative) {
      setActiveTab('upload');
      return;
    }
    setCameraLoading(true);

    try {
      const status = await getCameraPermissionStatus();
      console.log('[CameraViewport] initial permission status:', status);

      if (status === 'granted') {
        await launchCameraDirect();
      } else if (status === 'prompt' || status === 'prompt-with-rationale') {
        const requestedStatus = await requestCameraPermission();
        console.log('[CameraViewport] requested permission result:', requestedStatus);
        if (requestedStatus === 'granted') {
          await launchCameraDirect();
        } else if (requestedStatus === 'prompt-with-rationale') {
          setPermissionModalInitialState('denied');
          setIsPermissionModalOpen(true);
        } else {
          setPermissionModalInitialState('permanently_denied');
          setIsPermissionModalOpen(true);
        }
      } else {
        setPermissionModalInitialState('permanently_denied');
        setIsPermissionModalOpen(true);
      }
    } catch (err) {
      console.error('[CameraViewport] permission flow error:', err);
      setPermissionModalInitialState('denied');
      setIsPermissionModalOpen(true);
    } finally {
      setCameraLoading(false);
    }
  }, [isNative, launchCameraDirect]);

  const handleCloseNativeCamera = useCallback(async () => {
    try {
      await closeScanMeCamera();
    } catch (err) {
      console.warn('[CameraViewport] close camera error:', err);
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
        setCapturedPreview(result.dataUrl);
        await handleCloseNativeCamera();
        onImageSelected(result.dataUrl, 'camera');
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
      console.warn('[CameraViewport] switch camera error:', err);
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
      console.warn('[CameraViewport] toggle flash error:', err);
    }
  };

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
      {/* Native Camera Permission Flow Modal */}
      <NativeCameraPermissionModal
        isOpen={isPermissionModalOpen}
        initialState={permissionModalInitialState}
        onPermissionGranted={launchCameraDirect}
        onClose={() => setIsPermissionModalOpen(false)}
      />

      {/* Top Tab Bar */}
      <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1.5">
        {isNative && (
          <button
            type="button"
            onClick={() => {
              setActiveTab('camera');
              handleRetake();
            }}
            disabled={disabled}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Live Camera</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            if (isCameraActive) handleCloseNativeCamera();
            setActiveTab('upload');
            handleRetake();
          }}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
            if (isCameraActive) handleCloseNativeCamera();
            setActiveTab('samples');
            handleRetake();
          }}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
            {activeTab === 'camera' && (
              <div className="space-y-4">
                {isCameraActive ? (
                  <div className="relative aspect-[4/3] sm:aspect-[16/10] max-h-[420px] w-full bg-transparent rounded-2xl overflow-hidden border-2 border-emerald-500 flex flex-col justify-between p-4 shadow-xl">
                    <div className="flex items-center justify-between z-10">
                      <div className="bg-slate-950/70 text-white px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        CameraX Viewfinder
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleToggleFlash}
                          className="p-2 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white backdrop-blur-md border border-white/10"
                        >
                          {flashMode === 'off' ? (
                            <ZapOff className="w-4 h-4 text-slate-400" />
                          ) : (
                            <Zap className={`w-4 h-4 ${flashMode === 'torch' ? 'text-amber-400' : 'text-emerald-400'}`} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleSwitchCamera}
                          className="p-2 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white backdrop-blur-md border border-white/10"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCloseNativeCamera}
                          className="p-2 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white backdrop-blur-md border border-white/10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-center z-10 pt-4">
                      <button
                        type="button"
                        onClick={handleCapturePhoto}
                        disabled={isCapturing}
                        className="w-16 h-16 rounded-full bg-white hover:bg-slate-100 border-4 border-emerald-500 flex items-center justify-center shadow-2xl transition-transform active:scale-90 cursor-pointer"
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
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50 text-center space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-sm">
                      <Camera className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Native In-App CameraX</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        Take high-resolution photos of invoices, IDs, or forms directly inside the app.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleStartNativeCamera}
                      disabled={cameraLoading || disabled}
                      className="py-3.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
                    >
                      {cameraLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Checking Permissions...</span>
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
