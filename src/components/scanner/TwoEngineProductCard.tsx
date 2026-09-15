/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Barcode as BarcodeIcon,
  Calendar,
  Layers,
  DollarSign,
  Package,
  Sparkles,
  Edit3,
  Plus,
  RotateCcw,
  Tag,
  Copy,
  Check,
  ShieldCheck,
  FileText,
  Clock,
} from 'lucide-react';
import { ScannedProductMapping, ValueConflict } from '../../types';

interface TwoEngineProductCardProps {
  product: ScannedProductMapping;
  conflicts: ValueConflict[];
  rawOcrText?: string;
  onEdit: (product: ScannedProductMapping) => void;
  onAddToInventory: (product: ScannedProductMapping) => void;
  onScanAgain: () => void;
  isSaving?: boolean;
}

export const TwoEngineProductCard: React.FC<TwoEngineProductCardProps> = ({
  product: initialProduct,
  conflicts: initialConflicts,
  rawOcrText,
  onEdit,
  onAddToInventory,
  onScanAgain,
  isSaving = false,
}) => {
  const [product, setProduct] = useState<ScannedProductMapping>(initialProduct);
  const [conflicts, setConflicts] = useState<ValueConflict[]>(initialConflicts);
  const [copiedBarcode, setCopiedBarcode] = useState(false);
  const [showRawOcr, setShowRawOcr] = useState(false);

  // Handle conflict resolution choice: [Use DB value] vs [Use OCR value]
  const handleResolveConflict = (conflictIndex: number, chosenValue: string) => {
    const updatedConflicts = [...conflicts];
    const item = updatedConflicts[conflictIndex];
    item.selectedValue = chosenValue;
    setConflicts(updatedConflicts);

    // Apply chosen value to active product representation
    setProduct((prev) => ({
      ...prev,
      [item.key]: chosenValue,
    }));
  };

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(product.barcode).then(() => {
      setCopiedBarcode(true);
      setTimeout(() => setCopiedBarcode(false), 2000);
    });
  };

  const overallConfidence =
    product.confidence?.overall ||
    Math.round(
      ((product.confidence?.productName || 80) +
        (product.confidence?.mrp || 80) +
        (product.confidence?.manufactureDate || 80)) /
        3
    );

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-4 sm:p-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-black tracking-widest text-emerald-100">
              Two-Engine Recognition
            </div>
            <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              PRODUCT FOUND
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-right">
            <span className="text-[10px] text-emerald-100 uppercase tracking-wider block font-bold">
              OCR Confidence
            </span>
            <span className="text-sm font-black font-mono text-white">
              {overallConfidence}%
            </span>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Core Product Summary */}
        <div className="flex flex-col sm:flex-row gap-4 items-start pb-4 border-b border-slate-100">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.productName}
              className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shrink-0 bg-slate-50"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Package className="w-10 h-10 text-indigo-500" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {product.category || 'General'}
              </span>
              {product.brand && (
                <span className="text-[11px] font-bold text-indigo-600">
                  {product.brand}
                </span>
              )}
            </div>

            <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
              {product.productName}
            </h3>

            {/* Barcode & Format Pills */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-mono font-bold text-slate-800">
                <BarcodeIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>{product.barcode}</span>
                <button
                  type="button"
                  onClick={handleCopyBarcode}
                  className="text-slate-400 hover:text-slate-700 ml-0.5"
                  title="Copy Barcode"
                >
                  {copiedBarcode ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>

              <span className="px-2 py-1 bg-indigo-50 border border-indigo-200 rounded-xl text-[11px] font-mono font-extrabold text-indigo-700">
                Format: {product.barcodeFormat || 'EAN-13'}
              </span>
            </div>
          </div>
        </div>

        {/* Structured Spec Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {/* MFD */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                MFD
              </span>
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="font-bold text-slate-900 truncate">
              {product.manufactureDate || 'Not detected'}
            </div>
            {product.datePrecision?.manufactureDate === 'month' && (
              <span className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-semibold mt-0.5 inline-block">
                Month precision
              </span>
            )}
          </div>

          {/* EXP */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                EXP
              </span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="font-bold text-slate-900 truncate">
              {product.expiryDate || product.bestBefore || 'Not detected'}
            </div>
            {product.datePrecision?.expiryDate === 'month' && (
              <span className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-semibold mt-0.5 inline-block">
                Month precision
              </span>
            )}
          </div>

          {/* Batch */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Batch No.
              </span>
              <Layers className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="font-bold font-mono text-slate-900 truncate">
              {product.batchNumber || '—'}
            </div>
          </div>

          {/* MRP */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                MRP (Price)
              </span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="font-extrabold text-emerald-700 text-sm truncate">
              {product.mrp ? `$${product.mrp}` : '—'}
            </div>
          </div>

          {/* Weight */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Net Weight
              </span>
              <Tag className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="font-bold text-slate-900 truncate">
              {product.netWeight || product.quantity || '—'}
            </div>
          </div>

          {/* Brand */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Brand
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="font-bold text-slate-900 truncate">
              {product.brand || 'Generic'}
            </div>
          </div>
        </div>

        {/* CONFLICT RESOLUTION UI (e.g. MRP Database: 115 | Label OCR: 120) */}
        {conflicts.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 text-xs font-black">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Conflict Resolution (Discrepancy Detected)</span>
            </div>

            <div className="space-y-2">
              {conflicts.map((conflict, idx) => (
                <div
                  key={conflict.key}
                  className="bg-white p-3 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-extrabold text-slate-900">
                      {conflict.label}:
                    </span>{' '}
                    <span className="text-slate-600">
                      Database: <strong className="text-slate-900">{conflict.databaseValue}</strong> | Label OCR:{' '}
                      <strong className="text-slate-900">{conflict.ocrValue}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleResolveConflict(idx, conflict.databaseValue)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        conflict.selectedValue === conflict.databaseValue
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Use {conflict.databaseValue}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleResolveConflict(idx, conflict.ocrValue)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        conflict.selectedValue === conflict.ocrValue
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Use {conflict.ocrValue}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible Raw OCR text view for debugging verification */}
        {rawOcrText && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowRawOcr(!showRawOcr)}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{showRawOcr ? 'Hide Raw OCR Text' : 'View Extracted Raw OCR Text'}</span>
            </button>
            {showRawOcr && (
              <div className="mt-2 p-3 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
                {rawOcrText}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons: [EDIT] [ADD TO INVENTORY] [SCAN AGAIN] */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            id="btn-two-engine-edit"
            onClick={() => onEdit(product)}
            className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black flex items-center justify-center gap-2 transition-colors"
          >
            <Edit3 className="w-4 h-4 text-slate-600" />
            <span>EDIT</span>
          </button>

          <button
            type="button"
            id="btn-two-engine-add-to-inventory"
            disabled={isSaving}
            onClick={() => onAddToInventory(product)}
            className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{isSaving ? 'SAVING...' : 'ADD TO INVENTORY'}</span>
          </button>

          <button
            type="button"
            id="btn-two-engine-scan-again"
            onClick={onScanAgain}
            className="py-3 px-4 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs font-black flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-slate-300" />
            <span>SCAN AGAIN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
