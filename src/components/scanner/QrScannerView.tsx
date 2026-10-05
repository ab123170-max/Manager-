/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, ChangeEvent } from 'react';
import {
  QrCode,
  Volume2,
  VolumeX,
  Copy,
  ExternalLink,
  Check,
  Package,
  Plus,
  FileCode,
  UploadCloud,
  Loader2,
  AlertTriangle,
  Search,
  RotateCcw,
} from 'lucide-react';
import { DetectedCode, SavedInventoryItem } from '../../types';
import {
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [manualQrInput, setManualQrInput] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  const [detectedCode, setDetectedCode] = useState<DetectedCode | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<SavedInventoryItem | null>(null);

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

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = manualQrInput.trim();
    if (!clean) return;

    const isUrl = /^https?:\/\//i.test(clean);
    let isJson = false;
    let parsedJson: Record<string, unknown> | null = null;
    if (clean.startsWith('{') && clean.endsWith('}')) {
      try {
        parsedJson = JSON.parse(clean);
        isJson = true;
      } catch {}
    }

    const code: DetectedCode = {
      type: 'qr',
      format: 'QR_CODE',
      value: clean,
      raw_value: clean,
      confidence: 1.0,
      timestamp: Date.now(),
      isUrl,
      isJson,
      parsedJson,
    };
    handleDetectedCode(code);
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

  const handleClear = () => {
    setDetectedCode(null);
    setMatchedProduct(null);
    setManualQrInput('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      {/* Notice Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-2.5 text-amber-900 text-xs">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>Camera scanner temporarily unavailable. You can upload an image or enter QR code data manually.</span>
      </div>

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
            QR Code Lookup &amp; Image Decode
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-lg">
            Decode QR codes from images or parse serialized batch data, URLs, and product payloads manually.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/20 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Upload QR Image"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Image</span>
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className="p-2.5 rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/20 transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Manual Form + Image Upload */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-indigo-600" />
              <span>Enter QR Code / URL Text</span>
            </h2>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <textarea
                value={manualQrInput}
                onChange={(e) => setManualQrInput(e.target.value)}
                placeholder="Paste QR payload, URL, or JSON..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />

              <button
                type="submit"
                disabled={!manualQrInput.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Process QR Data</span>
              </button>
            </form>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="bg-white rounded-3xl p-6 border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20 transition-all text-center cursor-pointer space-y-2.5 shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Upload QR Image</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Drop QR code screenshot or photo (JPEG, PNG)
              </p>
            </div>
            {isUploadingImage && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-indigo-600 font-semibold pt-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Decoding QR image...</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Decoded QR Output */}
        <div className="lg:col-span-7 space-y-4">
          {!detectedCode ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-500 space-y-2 shadow-sm">
              <QrCode className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No QR Code Decoded Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Paste QR text or upload a QR image to view decoded payload, links, and matched inventory items.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-indigo-200 shadow-md space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                    <QrCode className="w-5 h-5" />
                  </span>
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-md">
                      {detectedCode.format || 'QR Code'}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">
                      Decoded Content
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(detectedCode.value)}
                    className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* Raw Value Display */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs font-mono text-slate-800 break-all max-h-36 overflow-y-auto">
                {detectedCode.value}
              </div>

              {/* Action for Web URL */}
              {detectedCode.isUrl && (
                <a
                  href={detectedCode.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-indigo-200 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open URL Link</span>
                </a>
              )}

              {/* JSON Structure view */}
              {detectedCode.isJson && detectedCode.parsedJson && (
                <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-40">
                  <div className="flex items-center gap-1 text-slate-400 text-[10px] mb-1">
                    <FileCode className="w-3 h-3" />
                    <span>Structured JSON Payload</span>
                  </div>
                  <pre>{JSON.stringify(detectedCode.parsedJson, null, 2)}</pre>
                </div>
              )}

              {/* Matched Product in Inventory */}
              {matchedProduct ? (
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        Matched Inventory Product
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-900">{matchedProduct.productName}</h4>
                    </div>
                    <span className="text-xs font-bold bg-white px-2.5 py-1 rounded-lg border border-emerald-300 text-emerald-800">
                      Stock: {matchedProduct.stockQuantity}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = adjustProductStock(matchedProduct.id, 1);
                        const fresh = updated.find((p) => p.id === matchedProduct.id);
                        if (fresh) setMatchedProduct(fresh);
                      }}
                      className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add 1 Stock
                    </button>

                    {onRecordSale && (
                      <button
                        type="button"
                        onClick={() => onRecordSale(matchedProduct)}
                        className="py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Package className="w-3 h-3" /> Record Sale
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                onRegisterProduct && (
                  <button
                    type="button"
                    onClick={() => onRegisterProduct(detectedCode.value)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Register as New Product</span>
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
