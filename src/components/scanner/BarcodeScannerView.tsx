/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, ChangeEvent } from 'react';
import {
  Barcode as BarcodeIcon,
  Volume2,
  VolumeX,
  ShoppingBag,
  Tag,
  CheckCircle2,
  Layers,
  Package,
  Loader2,
  PlusCircle,
  RotateCcw,
  Sparkles,
  UploadCloud,
  Search,
  AlertTriangle,
} from 'lucide-react';
import {
  detectCodesInImage,
  playScanBeep,
  triggerHapticFeedback,
} from '../../utils/barcodeDetector';
import {
  DetectedCode,
  SavedInventoryItem,
  ScannedProductMapping,
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
} from '../../services/barcodeLookup';
import {
  runProductOcr,
} from '../../utils/tesseractOcrEngine';
import { mergeProductRecognition } from '../../utils/productMerger';
import { TwoEngineProductCard } from './TwoEngineProductCard';
import { BarcodeToProductPipelineModal } from './BarcodeToProductPipelineModal';

interface BarcodeScannerViewProps {
  onRegisterProduct?: (barcode: string) => void;
  onRecordSale?: (product: SavedInventoryItem) => void;
  onViewProduct?: () => void;
  onOpenManualEntry?: (barcode?: string, prefill?: Partial<SavedInventoryItem>) => void;
}

export const BarcodeScannerView: React.FC<BarcodeScannerViewProps> = ({
  onRegisterProduct,
  onRecordSale,
  onViewProduct,
  onOpenManualEntry,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrateEnabled, setVibrateEnabled] = useState(true);
  const [manualBarcodeInput, setManualBarcodeInput] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Two-Engine Pipeline States
  const [pipelineStage, setPipelineStage] = useState<
    'idle' | 'barcode_detected' | 'running_ocr' | 'looking_up_db' | 'completed' | 'error'
  >('idle');
  const [statusMessage, setStatusMessage] = useState<string>('Upload a barcode photo or enter barcode manually');
  const [detectedCode, setDetectedCode] = useState<DetectedCode | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [mergedResult, setMergedResult] = useState<MergedRecognitionResult | null>(null);
  const [matchedInventoryItem, setMatchedInventoryItem] = useState<SavedInventoryItem | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Fallback modal
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState<boolean>(false);

  /**
   * TWO-ENGINE PIPELINE EXECUTION
   */
  const handleTwoEnginePipeline = useCallback(
    async (code: DetectedCode, customImageDataUrl?: string) => {
      const normalized = normalizeBarcode(code.value);
      if (!normalized) return;

      if (soundEnabled) playScanBeep();
      if (vibrateEnabled) triggerHapticFeedback();

      setDetectedCode(code);
      setPipelineStage('barcode_detected');
      setStatusMessage(`Barcode: ${normalized}`);

      if (customImageDataUrl) {
        setCapturedImage(customImageDataUrl);
      }

      // Check if item already exists in local inventory first
      const existingInventory = getProducts();
      const existingItem = existingInventory.find(
        (p) => p.barcode && normalizeBarcode(p.barcode) === normalized
      );

      if (existingItem) {
        setMatchedInventoryItem(existingItem);
        setPipelineStage('completed');
        setStatusMessage('Product found in inventory');
        return;
      }

      setPipelineStage('running_ocr');
      setStatusMessage('Extracting label details & querying database...');

      try {
        const [ocrRes, dbLookupRes] = await Promise.all([
          customImageDataUrl ? runProductOcr(customImageDataUrl) : Promise.resolve(null),
          lookupBarcodeProduct(normalized),
        ]);

        const dbProduct = dbLookupRes.product || null;
        const ocrMapping = ocrRes?.mapping || null;
        const rawOcrText = ocrRes?.rawText || '';

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
        const fallbackMerged = mergeProductRecognition(
          normalized,
          code.format || 'EAN-13',
          null,
          null,
          ''
        );
        setMergedResult(fallbackMerged);
        setPipelineStage('completed');
        setStatusMessage('Barcode captured');
      }
    },
    [soundEnabled, vibrateEnabled]
  );

  const handleManualSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = manualBarcodeInput.trim();
    if (!clean) return;

    setIsSearching(true);
    const code: DetectedCode = {
      type: 'barcode',
      format: 'Barcode',
      value: clean,
      raw_value: clean,
      confidence: 1.0,
      timestamp: Date.now(),
    };
    void handleTwoEnginePipeline(code).finally(() => setIsSearching(false));
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        try {
          const codes = await detectCodesInImage(dataUrl, 'barcode');
          if (codes.length > 0) {
            handleTwoEnginePipeline(codes[0], dataUrl);
          } else {
            const ocrRes = await runProductOcr(dataUrl);
            const digitMatches = ocrRes.rawText.match(/\b\d{8,14}\b/g) || [];
            const possibleBarcode = digitMatches[0] || '';
            if (possibleBarcode) {
              const syntheticCode: DetectedCode = {
                type: 'barcode',
                format: 'EAN-13',
                value: possibleBarcode,
                raw_value: possibleBarcode,
                confidence: 0.9,
                timestamp: Date.now(),
              };
              handleTwoEnginePipeline(syntheticCode, dataUrl);
            } else {
              alert('Could not find a clear barcode in the uploaded image. Please try another photo or enter manually.');
            }
          }
        } catch (detectErr) {
          console.error('Image barcode decode failed:', detectErr);
          alert('Failed to decode barcode from image. Please enter manually.');
        } finally {
          setIsUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploadingImage(false);
    }
  };

  const handleScanAgain = () => {
    setDetectedCode(null);
    setCapturedImage(null);
    setMergedResult(null);
    setMatchedInventoryItem(null);
    setManualBarcodeInput('');
    setPipelineStage('idle');
    setStatusMessage('Upload a barcode photo or enter barcode manually');
  };

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

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      {/* Notice Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-2.5 text-amber-900 text-xs">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>Camera scanner temporarily unavailable. You can upload an image or enter a barcode manually.</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Barcode Product Lookup</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Barcode Search &amp; Image Decode
          </h1>
          <p className="text-xs text-slate-300 mt-0.5 max-w-lg">
            Lookup any barcode from image or number with instant Open Food Facts &amp; local inventory lookup.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/20 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Upload Barcode Photo"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Photo</span>
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className="p-2.5 rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/20 transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute Beep' : 'Enable Beep'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Main Grid: Left Column Manual Entry & Upload / Right Column Product Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Manual Barcode Entry + Upload Dropzone */}
        <div className="lg:col-span-5 space-y-4">
          {/* Manual Barcode Search Form */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <BarcodeIcon className="w-4 h-4 text-indigo-600" />
              <span>Enter Barcode Number</span>
            </h2>

            <form onSubmit={handleManualSearch} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={manualBarcodeInput}
                  onChange={(e) => setManualBarcodeInput(e.target.value)}
                  placeholder="e.g. 8901030383749"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={!manualBarcodeInput.trim() || isSearching}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Lookup Barcode</span>
              </button>
            </form>
          </div>

          {/* Upload Image Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="bg-white rounded-3xl p-6 border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20 transition-all text-center cursor-pointer space-y-2.5 shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Upload Barcode Image</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Drop barcode photo or browse files (JPEG, PNG)
              </p>
            </div>
            {isUploadingImage && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-indigo-600 font-semibold pt-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Decoding barcode...</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Two-Engine Result Output */}
        <div className="lg:col-span-7 space-y-4">
          {pipelineStage === 'idle' && !matchedInventoryItem && !mergedResult && (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-500 space-y-2 shadow-sm">
              <BarcodeIcon className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Product Scanned Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Enter a barcode number or upload an image of a barcode label to see product information and stock controls.
              </p>
            </div>
          )}

          {pipelineStage === 'running_ocr' && (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3 shadow-sm">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">{statusMessage}</h3>
              <p className="text-xs text-slate-500">Querying Open Food Facts database and running text OCR...</p>
            </div>
          )}

          {/* Existing Inventory Item Match */}
          {matchedInventoryItem && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-300 shadow-md space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                  <div>
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                      Already in Inventory
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {matchedInventoryItem.productName}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleScanAgain}
                  className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Current Stock</span>
                  <span className="font-bold text-slate-900 text-sm">{matchedInventoryItem.stockQuantity}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Selling Price</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {matchedInventoryItem.sellingPrice ? `₹${matchedInventoryItem.sellingPrice}` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Barcode</span>
                  <span className="font-bold font-mono text-slate-900 text-xs">{matchedInventoryItem.barcode || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Expiry Date</span>
                  <span className="font-bold text-slate-900 text-xs">{matchedInventoryItem.expiryDate || '-'}</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleQuickAddStock(1)}
                  className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> +1 Stock
                </button>

                {onRecordSale && (
                  <button
                    type="button"
                    onClick={() => onRecordSale(matchedInventoryItem)}
                    className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" /> Record Sale
                  </button>
                )}

                {onViewProduct && (
                  <button
                    type="button"
                    onClick={onViewProduct}
                    className="py-2 px-3 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5" /> View Inventory
                  </button>
                )}
              </div>
            </div>
          )}

          {/* New Product Recognition Result Card */}
          {mergedResult && !matchedInventoryItem && (
            <TwoEngineProductCard
              product={mergedResult.product}
              conflicts={mergedResult.conflicts}
              rawOcrText={mergedResult.ocrResult?.rawText}
              isSaving={isSaving}
              onAddToInventory={handleSaveToInventory}
              onEdit={handleEditProduct}
              onScanAgain={handleScanAgain}
            />
          )}
        </div>
      </div>

      {isPipelineModalOpen && (
        <BarcodeToProductPipelineModal
          isOpen={isPipelineModalOpen}
          detectedCode={detectedCode}
          onClose={() => setIsPipelineModalOpen(false)}
          onScanNext={handleScanAgain}
          onProductSaved={(saved) => {
            setMatchedInventoryItem(saved);
            setIsPipelineModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
