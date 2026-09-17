/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback, ChangeEvent } from 'react';
import {
  QrCode,
  Volume2,
  VolumeX,
  Zap,
  ZapOff,
  RefreshCw,
  Copy,
  ExternalLink,
  Check,
  Package,
  Plus,
  AlertCircle,
  FileCode,
  UploadCloud,
  FileImage,
  Loader2,
} from 'lucide-react';
import { DetectedCode, SavedInventoryItem } from '../../types';
import {
  detectCodesInFrame,
  detectCodesInImage,
  playScanBeep,
  triggerHapticFeedback,
} from '../../utils/barcodeDetector';
import {
  getProducts,
  adjustProductStock,
  addScanHistoryItem,
} from '../../utils/unifiedDataStore';

interface QrScannerViewProps {
  onRegisterProduct?: (qrValue: string) => void;
  onRecordSale?: (product: SavedInventoryItem) => void;
}

export const QrScannerView: React.FC<QrScannerViewProps> = ({
  onRegisterProduct,
  onRecordSale,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  const [detectedCode, setDetectedCode] = useState<DetectedCode | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<SavedInventoryItem | null>(null);

  const startCamera = useCallback(async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
    }

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraError('Camera is not supported in this browser context. Please use photo upload.');
      setCameraActive(false);
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (firstErr: any) {
        if (firstErr?.name === 'NotAllowedError' || firstErr?.name === 'PermissionDeniedError') {
          throw firstErr;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video element play was deferred:', playErr);
        }
      }
      setCameraActive(true);
      setIsScanning(true);
    } catch (err: any) {
      console.warn('QR camera initialization notice:', err?.message || err);
      const isPermissionDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.toLowerCase().includes('permission') ||
        err?.message?.toLowerCase().includes('denied');

      setCameraError(
        isPermissionDenied
          ? 'Camera permission is denied or blocked. You can upload a QR image below or retry.'
          : 'Unable to access device camera. Please upload an image containing a QR code.'
      );
      setCameraActive(false);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities = track.getCapabilities?.() as any;
      if (capabilities?.torch) {
        await track.applyConstraints({ advanced: [{ torch: !torchOn } as any] });
        setTorchOn(!torchOn);
      } else {
        alert('Flashlight is not supported on this camera.');
      }
    } catch {
      alert('Could not toggle flashlight.');
    }
  };

  const handleDetectedCode = useCallback((code: DetectedCode) => {
    if (soundEnabled) playScanBeep();
    triggerHapticFeedback();

    setDetectedCode(code);

    const products = getProducts();
    const match = products.find(
      (p) =>
        p.qrCode === code.value ||
        p.barcode === code.value ||
        (p.sku && p.sku === code.value)
    );
    setMatchedProduct(match || null);

    addScanHistoryItem({
      code,
      matchedProduct: match || null,
      timestamp: Date.now(),
    });
  }, [soundEnabled]);

  const processVideoFrame = useCallback(async () => {
    if (!videoRef.current || !isScanning || videoRef.current.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
      return;
    }

    const now = Date.now();
    if (now - lastScanTimeRef.current > 180) {
      lastScanTimeRef.current = now;

      try {
        const codes = await detectCodesInFrame(videoRef.current, 'qr');
        if (codes.length > 0) {
          const code = codes[0];
          handleDetectedCode(code);
        }
      } catch {
        // Skip frame
      }
    }

    animationFrameRef.current = requestAnimationFrame(processVideoFrame);
  }, [isScanning, handleDetectedCode]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (cameraActive && isScanning) {
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [cameraActive, isScanning, processVideoFrame]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        try {
          const codes = await detectCodesInImage(dataUrl, 'all');
          if (codes.length > 0) {
            handleDetectedCode(codes[0]);
          } else {
            alert('No QR or barcode found in the uploaded image.');
          }
        } catch {
          alert('Failed to process uploaded image.');
        } finally {
          setIsUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploadingImage(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Hidden File Input for QR Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
            <QrCode className="w-4 h-4 text-indigo-400" />
            <span>2D QR &amp; Matrix Scanner</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            High Precision QR Code Scanner
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-lg">
            Scan 2D QR codes, product matrix codes, serialized batches, and encrypted URLs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/20 transition-colors flex items-center gap-1.5 text-xs font-bold"
            title="Upload QR Image"
          >
            <UploadCloud className="w-4 h-4" />
            <span className="hidden sm:inline">Upload Photo</span>
          </button>

          <button
            type="button"
            onClick={toggleTorch}
            className={`p-2.5 rounded-xl border transition-colors ${
              torchOn
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
            }`}
          >
            {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/20 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
            className="p-2.5 rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/20 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Viewport & Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="relative bg-slate-950 rounded-3xl overflow-hidden aspect-square sm:aspect-4/3 border border-slate-800 shadow-xl flex items-center justify-center">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Square QR Target Zone */}
                <div className="absolute w-56 h-56 sm:w-64 sm:h-64 border-2 border-indigo-400 rounded-3xl pointer-events-none flex flex-col justify-between p-3">
                  <div className="flex justify-between">
                    <div className="w-4 h-4 border-t-2 border-l-2 border-indigo-300 rounded-tl-md" />
                    <div className="w-4 h-4 border-t-2 border-r-2 border-indigo-300 rounded-tr-md" />
                  </div>
                  <div className="text-center text-[10px] font-bold text-white bg-slate-900/80 py-0.5 px-2 rounded-md self-center">
                    Center QR Code
                  </div>
                  <div className="flex justify-between">
                    <div className="w-4 h-4 border-b-2 border-l-2 border-indigo-300 rounded-bl-md" />
                    <div className="w-4 h-4 border-b-2 border-r-2 border-indigo-300 rounded-br-md" />
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6 text-center space-y-3 max-w-xs">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 text-indigo-400 flex items-center justify-center mx-auto">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Camera Standby</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {cameraError || 'Camera stream paused.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Retry Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload QR Photo</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Upload helper card */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileImage className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-xs font-medium text-slate-700">Have an image with a QR code?</span>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 transition-colors"
            >
              {isUploadingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3" />}
              <span>Upload File</span>
            </button>
          </div>
        </div>

        {/* Right Result Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-indigo-600" />
                <span>QR Payload</span>
              </span>
              {detectedCode && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(detectedCode.value)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </h2>

            {detectedCode ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 break-all text-xs font-mono text-slate-800 select-all max-h-40 overflow-y-auto">
                  {detectedCode.value}
                </div>

                {detectedCode.isJson && detectedCode.parsedJson && (
                  <div className="p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto space-y-1">
                    <span className="text-indigo-400 font-bold block mb-1">Parsed JSON Structure:</span>
                    <pre>{JSON.stringify(detectedCode.parsedJson, null, 2)}</pre>
                  </div>
                )}

                {matchedProduct ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase">
                      Linked Inventory Item
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      {matchedProduct.productName}
                    </h3>
                    <p className="text-xs text-slate-600">
                      Stock: <strong>{matchedProduct.stockQuantity}</strong> • Price: <strong>{matchedProduct.sellingPrice || matchedProduct.mrp}</strong>
                    </p>
                  </div>
                ) : (
                  onRegisterProduct && (
                    <button
                      type="button"
                      onClick={() => onRegisterProduct(detectedCode.value)}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Link to New Product</span>
                    </button>
                  )
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 space-y-2">
                <QrCode className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-medium">Position a QR code within the frame or upload an image</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
