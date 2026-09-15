/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Barcode as BarcodeIcon,
  RefreshCw,
  Zap,
  ZapOff,
  Volume2,
  VolumeX,
  AlertCircle,
  Plus,
  ShoppingBag,
  Tag,
  CheckCircle2,
  Layers,
  Package,
  Edit3,
  Loader2,
  WifiOff,
  PlusCircle,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  detectCodesInFrame,
  playScanBeep,
  triggerHapticFeedback,
} from '../../utils/barcodeDetector';
import {
  DetectedCode,
  SavedInventoryItem,
  ScannedProductMapping,
  ValueConflict,
  MergedRecognitionResult,
} from '../../types';
import {
  getProducts,
  adjustProductStock,
  saveProduct,
} from '../../utils/unifiedDataStore';
import {
  lookupBarcodeProduct,
  normalizeBarcode,
  BarcodeLookupResult,
  BarcodeLookupProduct,
  LookupStatusType,
} from '../../services/barcodeLookup';
import {
  runProductOcr,
  captureStillFrameFromVideo,
  OcrEngineResult,
} from '../../utils/tesseractOcrEngine';
import { mergeProductRecognition } from '../../utils/productMerger';
import { TwoEngineProductCard } from './TwoEngineProductCard';
import { BarcodeToProductPipelineModal } from './BarcodeToProductPipelineModal';

interface BarcodeScannerViewProps {
  onRegisterProduct?: (barcode: string) => void;
  onRecordSale?: (product: SavedInventoryItem) => void;
  onOpenManualEntry?: (barcode?: string, prefill?: Partial<SavedInventoryItem>) => void;
}

export const BarcodeScannerView: React.FC<BarcodeScannerViewProps> = ({
  onRegisterProduct,
  onRecordSale,
  onOpenManualEntry,
}) => {
  // Video & Stream references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);

  // Camera & Scanner State
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [vibrateEnabled, setVibrateEnabled] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Two-Engine Pipeline States
  const [pipelineStage, setPipelineStage] = useState<
    'idle' | 'barcode_detected' | 'running_ocr' | 'looking_up_db' | 'completed' | 'error'
  >('idle');
  const [statusMessage, setStatusMessage] = useState<string>('Align barcode in viewfinder...');
  const [detectedCode, setDetectedCode] = useState<DetectedCode | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [mergedResult, setMergedResult] = useState<MergedRecognitionResult | null>(null);
  const [matchedInventoryItem, setMatchedInventoryItem] = useState<SavedInventoryItem | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [copiedBarcode, setCopiedBarcode] = useState<boolean>(false);

  // Fallback modal
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState<boolean>(false);

  // Start Camera
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
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
      setCameraActive(true);
      setIsScanning(true);
      setPipelineStage('idle');
      setStatusMessage('Align barcode in viewfinder...');
    } catch (err) {
      console.error('Camera stream initialization failed:', err);
      setCameraError('Unable to access device camera. Please check browser permissions.');
      setCameraActive(false);
    }
  }, [facingMode]);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Torch control
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities = track.getCapabilities?.() as any;
      if (capabilities && capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !torchOn } as any],
        });
        setTorchOn(!torchOn);
      } else {
        alert('Flashlight is not supported on this device camera.');
      }
    } catch {
      alert('Could not toggle flashlight.');
    }
  };

  /**
   * TWO-ENGINE PIPELINE EXECUTION:
   * 1. Barcode Engine (ZXing) detected
   * 2. Capture still frame snapshot (Single-run OCR)
   * 3. Run OCR once (Tesseract.js) + Database lookup in parallel
   * 4. Merge results & detect conflicts
   * 5. Display Product Card
   */
  const handleTwoEnginePipeline = useCallback(
    async (code: DetectedCode) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      setIsScanning(false);

      const normalized = normalizeBarcode(code.value);
      if (!normalized) {
        isProcessingRef.current = false;
        setIsScanning(true);
        return;
      }

      if (soundEnabled) playScanBeep();
      if (vibrateEnabled) triggerHapticFeedback();

      setDetectedCode(code);
      setPipelineStage('barcode_detected');
      setStatusMessage(`Barcode detected: ${normalized}`);

      // 1. Capture still frame for OCR (Single snapshot)
      let stillDataUrl = '';
      if (videoRef.current) {
        const snap = captureStillFrameFromVideo(videoRef.current);
        if (snap) {
          stillDataUrl = snap.dataUrl;
          setCapturedImage(snap.dataUrl);
        }
      }

      // Check if item already exists in local inventory first (Duplicate Protection)
      const existingInventory = getProducts();
      const existingItem = existingInventory.find(
        (p) => p.barcode && normalizeBarcode(p.barcode) === normalized
      );

      if (existingItem) {
        setMatchedInventoryItem(existingItem);
        setPipelineStage('completed');
        setStatusMessage('Product already exists in inventory');
        isProcessingRef.current = false;
        return;
      }

      setPipelineStage('running_ocr');
      setStatusMessage('Extracting label details & querying database...');

      try {
        // Run OCR and Database lookup in parallel
        const [ocrRes, dbLookupRes] = await Promise.all([
          stillDataUrl ? runProductOcr(stillDataUrl) : Promise.resolve(null),
          lookupBarcodeProduct(normalized),
        ]);

        const dbProduct = dbLookupRes.product || null;
        const ocrMapping = ocrRes?.mapping || null;
        const rawOcrText = ocrRes?.rawText || '';

        // Merge results and find conflicts
        const merged = mergeProductRecognition(
          normalized,
          code.format || 'EAN-13',
          dbProduct,
          ocrMapping,
          rawOcrText
        );

        setMergedResult(merged);
        setPipelineStage('completed');
        setStatusMessage(
          dbProduct
            ? 'Product recognized successfully!'
            : 'Label details mapped via OCR'
        );
      } catch (pipelineErr) {
        console.error('Two-engine pipeline execution failed:', pipelineErr);
        // Fallback gracefully to basic barcode result
        const fallbackMerged = mergeProductRecognition(
          normalized,
          code.format || 'EAN-13',
          null,
          null,
          ''
        );
        setMergedResult(fallbackMerged);
        setPipelineStage('completed');
        setStatusMessage('Barcode captured (OCR fallback)');
      } finally {
        isProcessingRef.current = false;
      }
    },
    [soundEnabled, vibrateEnabled]
  );

  // Fast continuous video frame loop for Barcode decoding ONLY (ZXing)
  const processVideoFrame = useCallback(async () => {
    if (!videoRef.current || !isScanning || videoRef.current.readyState < 2 || isProcessingRef.current) {
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
      return;
    }

    const now = Date.now();
    // Scan frame for barcode every 160ms
    if (now - lastScanTimeRef.current > 160) {
      lastScanTimeRef.current = now;

      try {
        const codes = await detectCodesInFrame(videoRef.current, 'barcode');
        if (codes.length > 0) {
          const code = codes[0];
          if (!detectedCode || normalizeBarcode(detectedCode.value) !== normalizeBarcode(code.value)) {
            handleTwoEnginePipeline(code);
            return;
          }
        }
      } catch {
        // Silent frame skip
      }
    }

    animationFrameRef.current = requestAnimationFrame(processVideoFrame);
  }, [isScanning, detectedCode, handleTwoEnginePipeline]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (cameraActive && isScanning) {
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraActive, isScanning, processVideoFrame]);

  // Reset scanner to scan again
  const handleScanAgain = () => {
    setDetectedCode(null);
    setCapturedImage(null);
    setMergedResult(null);
    setMatchedInventoryItem(null);
    setPipelineStage('idle');
    setStatusMessage('Align barcode in viewfinder...');
    setIsScanning(true);
    isProcessingRef.current = false;
  };

  // Quick Stock Increment for Duplicate / Existing Item
  const handleQuickAddStock = (delta = 1) => {
    if (!matchedInventoryItem) return;
    const updated = adjustProductStock(matchedInventoryItem.id, delta);
    const fresh = updated.find((p) => p.id === matchedInventoryItem.id);
    if (fresh) {
      setMatchedInventoryItem(fresh);
      setFeedbackMessage(`Updated stock: +${delta} unit(s). Total: ${fresh.stockQuantity}`);
      setTimeout(() => setFeedbackMessage(null), 3500);
    }
  };

  // Add recognized product directly to inventory
  const handleSaveToInventory = (product: ScannedProductMapping) => {
    setIsSaving(true);
    try {
      const newItem: SavedInventoryItem = {
        id: `prod_${Date.now()}_${product.barcode.slice(-4) || 'item'}`,
        savedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        productName: product.productName,
        brand: product.brand,
        category: product.category || 'General Merchandise',
        barcode: product.barcode,
        sku: `SKU-${product.barcode.slice(-6)}`,
        quantity: product.quantity || '1',
        unit: 'pcs',
        purchasePrice: '',
        sellingPrice: product.mrp || '',
        mrp: product.mrp || '',
        stockQuantity: 1,
        minStockAlert: 5,
        manufacturingDate: product.manufactureDate || '',
        expiryDate: product.expiryDate || '',
        bestBefore: product.bestBefore || '',
        batchNumber: product.batchNumber || '',
        supplier: product.brand || '',
        rackLocation: 'Main Shelf',
        notes: `Recognized via Two-Engine System (ZXing + OCR). ${product.description || ''}`,
        imageThumbnail: product.imageUrl,
        status: 'in_stock',
        warnings: [],
        missingFields: [],
      };

      saveProduct(newItem);
      setMatchedInventoryItem(newItem);
      setMergedResult(null);
      setFeedbackMessage(`"${newItem.productName}" added to inventory successfully!`);
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (err) {
      console.error('Failed to save product to inventory:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Edit in manual form
  const handleEditProduct = (product: ScannedProductMapping) => {
    if (onOpenManualEntry) {
      onOpenManualEntry(product.barcode, {
        productName: product.productName,
        brand: product.brand,
        category: product.category,
        barcode: product.barcode,
        mrp: product.mrp,
        sellingPrice: product.mrp,
        manufacturingDate: product.manufactureDate,
        expiryDate: product.expiryDate,
        batchNumber: product.batchNumber,
        bestBefore: product.bestBefore,
        imageThumbnail: product.imageUrl,
      });
    } else {
      setIsPipelineModalOpen(true);
    }
  };

  const handleCopyBarcode = () => {
    if (!detectedCode) return;
    const clean = normalizeBarcode(detectedCode.value);
    navigator.clipboard.writeText(clean).then(() => {
      setCopiedBarcode(true);
      setTimeout(() => setCopiedBarcode(false), 2000);
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Two-Engine Recognition System</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Barcode + OCR Product Pipeline
          </h1>
          <p className="text-xs text-slate-300 mt-0.5 max-w-lg">
            ZXing Barcode Engine + Tesseract.js Label OCR with automated Open Food Facts lookup &amp; conflict resolution.
          </p>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTorch}
            className={`p-2.5 rounded-xl border transition-colors ${
              torchOn
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
            }`}
            title="Toggle Flashlight"
          >
            {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-colors ${
              soundEnabled
                ? 'bg-white/20 text-white border-white/20'
                : 'bg-white/5 text-slate-400 border-white/10'
            }`}
            title="Toggle Beep Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() =>
              setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
            }
            className="p-2.5 rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/20 transition-colors"
            title="Switch Camera"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Viewport & Two-Engine Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Viewfinder */}
        <div className="lg:col-span-6 space-y-3">
          <div className="relative bg-slate-950 rounded-3xl overflow-hidden aspect-4/3 sm:aspect-16/10 border border-slate-800 shadow-xl flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-full object-cover"
            />

            {/* Red laser scanning line animation when active */}
            {isScanning && (
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-rose-500 shadow-[0_0_14px_#f43f5e] animate-pulse pointer-events-none" />
            )}

            {/* Viewfinder Target Reticle */}
            <div className="absolute inset-8 sm:inset-10 border-2 border-dashed border-indigo-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-white bg-slate-900/80 px-2 py-0.5 rounded-md">
                  ZXing Scanner
                </span>
                <span className="text-[10px] text-emerald-400 font-mono bg-slate-900/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live
                </span>
              </div>
              <div className="text-center text-[10px] text-slate-300 bg-slate-900/80 py-0.5 px-2 rounded-md self-center">
                EAN-13 • EAN-8 • UPC-A • UPC-E • Code 128 • QR
              </div>
            </div>

            {/* Live Status Pill at Bottom of Viewfinder */}
            <div className="absolute bottom-3 inset-x-3 flex items-center justify-between px-3 py-2 bg-slate-900/90 backdrop-blur-md rounded-xl text-xs text-white">
              <div className="flex items-center gap-2">
                {pipelineStage === 'running_ocr' || pipelineStage === 'looking_up_db' ? (
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                ) : pipelineStage === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                )}
                <span className="text-[11px] font-bold tracking-tight">
                  {statusMessage}
                </span>
              </div>

              {!isScanning && (
                <button
                  type="button"
                  onClick={handleScanAgain}
                  className="text-[11px] font-bold text-indigo-300 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Resume</span>
                </button>
              )}
            </div>
          </div>

          {cameraError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}
        </div>

        {/* Right Column: Result Card & Conflict Resolution */}
        <div className="lg:col-span-6 space-y-3">
          {feedbackMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
          )}

          {/* 1. MATCHED EXISTING ITEM (DUPLICATE PROTECTION) */}
          {matchedInventoryItem && (
            <div className="p-5 rounded-3xl bg-emerald-50/90 border border-emerald-200 shadow-md space-y-4 animate-in fade-in">
              <div className="flex items-start gap-3">
                {matchedInventoryItem.imageThumbnail ? (
                  <img
                    src={matchedInventoryItem.imageThumbnail}
                    alt={matchedInventoryItem.productName}
                    className="w-16 h-16 rounded-2xl object-cover border border-emerald-200 shrink-0 bg-white"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Package className="w-8 h-8" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 tracking-wider">
                    Product already exists in inventory
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-base mt-1 truncate">
                    {matchedInventoryItem.productName}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    {matchedInventoryItem.brand} • {matchedInventoryItem.category}
                  </p>
                  <p className="text-xs font-mono font-bold text-slate-700 mt-0.5">
                    Barcode: {matchedInventoryItem.barcode}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-emerald-200 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-500 block">Selling Price:</span>
                  <span className="font-black text-emerald-800 text-sm">
                    ${matchedInventoryItem.sellingPrice || matchedInventoryItem.mrp || '0.00'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Current Stock:</span>
                  <span className="font-black text-slate-900 text-sm">
                    {matchedInventoryItem.stockQuantity} units
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleQuickAddStock(1)}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Update Stock (+1)</span>
                </button>

                {onRecordSale ? (
                  <button
                    type="button"
                    onClick={() => onRecordSale(matchedInventoryItem)}
                    className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Sell Item</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleScanAgain}
                    className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Scan Next</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 2. RECOGNIZED PRODUCT CARD (WITH OCR & CONFLICT RESOLUTION) */}
          {!matchedInventoryItem && mergedResult && (
            <TwoEngineProductCard
              product={mergedResult.product}
              conflicts={mergedResult.conflicts}
              rawOcrText={mergedResult.product.rawOcrText}
              onEdit={handleEditProduct}
              onAddToInventory={handleSaveToInventory}
              onScanAgain={handleScanAgain}
              isSaving={isSaving}
            />
          )}

          {/* 3. LOADING RECOGNITION SPINNER */}
          {!matchedInventoryItem && !mergedResult && pipelineStage === 'running_ocr' && (
            <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto text-indigo-600">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Running Two-Engine Analysis...
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Decoding barcode, extracting printed label details via Tesseract OCR, and normalizing fields.
                </p>
              </div>
            </div>
          )}

          {/* 4. IDLE STATE */}
          {!matchedInventoryItem && !mergedResult && pipelineStage === 'idle' && (
            <div className="p-8 rounded-3xl bg-white border border-slate-200/80 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <BarcodeIcon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Ready for Scanner Input
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Hold product steady in front of the camera. The scanner decodes the barcode and runs OCR on the printed label in a single seamless pass.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (onOpenManualEntry) onOpenManualEntry();
                  else setIsPipelineModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 pt-2"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Or Enter Barcode Manually</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Barcode-to-Product Pipeline Modal */}
      {isPipelineModalOpen && (
        <BarcodeToProductPipelineModal
          isOpen={isPipelineModalOpen}
          detectedCode={detectedCode}
          onClose={() => setIsPipelineModalOpen(false)}
          onScanNext={handleScanAgain}
          onProductSaved={(prod) => {
            setMatchedInventoryItem(prod);
            setIsPipelineModalOpen(false);
          }}
          onOpenManualEntryWithBarcode={(barcode) => {
            setIsPipelineModalOpen(false);
            if (onOpenManualEntry) {
              onOpenManualEntry(barcode);
            }
          }}
        />
      )}
    </div>
  );
};
