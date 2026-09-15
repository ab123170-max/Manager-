/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  PackagePlus,
  Sparkles,
  Edit3,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Tag,
  Calendar,
  DollarSign,
  Box,
  Layers,
  Barcode as BarcodeIcon,
  QrCode as QrCodeIcon,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { LookupResult, SavedInventoryItem } from '../../types';

interface ProductLookupModalProps {
  lookupResult: LookupResult | null;
  isOpen: boolean;
  onClose: () => void;
  onScanNext: () => void;
  onAddStock: (productId: string, quantityToAdd: number) => void;
  onOpenProductFormWithData: (productData: Partial<SavedInventoryItem>) => void;
  onScanLabelWithAi: (detectedBarcode: string) => void;
  onNavigateToCatalog?: () => void;
}

export const ProductLookupModal: React.FC<ProductLookupModalProps> = ({
  lookupResult,
  isOpen,
  onClose,
  onScanNext,
  onAddStock,
  onOpenProductFormWithData,
  onScanLabelWithAi,
  onNavigateToCatalog,
}) => {
  const [copied, setCopied] = useState(false);
  const [customStockAdd, setCustomStockAdd] = useState(1);
  const [stockAddedSuccess, setStockAddedSuccess] = useState(false);

  if (!isOpen || !lookupResult) return null;

  const { code, found, item, source } = lookupResult;
  const isQr = code.type === 'qr';

  const handleCopyValue = () => {
    navigator.clipboard.writeText(code.value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleQuickAddStock = (amount: number) => {
    if (!item) return;
    onAddStock(item.id, amount);
    setStockAddedSuccess(true);
    setTimeout(() => {
      setStockAddedSuccess(false);
      onScanNext();
    }, 900);
  };

  const handleSafeUrlOpen = (url: string) => {
    if (confirm(`Do you want to safely navigate to external link:\n${url}?`)) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      id="product-lookup-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="product-lookup-modal-card"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
      >
        {/* Header Bar */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${
          found
            ? 'bg-emerald-500/10 border-emerald-100'
            : isQr
            ? 'bg-indigo-500/10 border-indigo-100'
            : 'bg-amber-500/10 border-amber-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
              found
                ? 'bg-emerald-600 text-white'
                : isQr
                ? 'bg-indigo-600 text-white'
                : 'bg-amber-600 text-white'
            }`}>
              {found ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : isQr ? (
                <QrCodeIcon className="w-5 h-5" />
              ) : (
                <BarcodeIcon className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {found
                  ? source === 'inventory'
                    ? 'Product Found in Inventory'
                    : 'Recognized Catalog Item'
                  : isQr
                  ? 'QR Code Detected'
                  : 'New Product Detected'}
              </h3>
              <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">
                  {code.format}
                </span>
                <span>•</span>
                <span className="truncate max-w-[200px] font-mono">{code.value}</span>
              </p>
            </div>
          </div>

          <button
            id="btn-close-lookup-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* ============================================================= */}
          {/* CASE 1: PRODUCT FOUND IN INVENTORY OR CATALOG                */}
          {/* ============================================================= */}
          {found && item && (
            <div className="space-y-4">
              {/* Main Product Info Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {item.category || 'General Product'}
                      </span>
                      {item.brand && (
                        <span className="text-xs font-semibold text-slate-600">
                          {item.brand}
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mt-1">
                      {item.productName}
                    </h4>
                  </div>

                  {/* Stock Quantity Badge */}
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-slate-900 font-mono">
                      {item.stockQuantity ?? item.quantity ?? 1}
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 uppercase">
                      Current Units
                    </span>
                  </div>
                </div>

                {/* Key Attributes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/80 text-xs">
                  <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                    <span className="text-[10px] font-medium text-slate-400 block">SKU / Code</span>
                    <span className="font-mono font-bold text-slate-800 truncate block">
                      {item.sku || 'N/A'}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                    <span className="text-[10px] font-medium text-slate-400 block">Retail Price</span>
                    <span className="font-bold text-emerald-700 truncate block">
                      {item.sellingPrice || item.mrp || 'N/A'}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                    <span className="text-[10px] font-medium text-slate-400 block">Expiry Date</span>
                    <span className="font-semibold text-rose-700 truncate block">
                      {item.expiryDate || 'Not set'}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                    <span className="text-[10px] font-medium text-slate-400 block">Batch / Lot</span>
                    <span className="font-mono font-medium text-slate-700 truncate block">
                      {item.batchNumber || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Stock Increment Bar */}
              <div className="bg-emerald-50/80 border border-emerald-200/70 p-3.5 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <PackagePlus className="w-4 h-4 text-emerald-600" />
                    <span>Quick Add Stock</span>
                  </span>
                  {stockAddedSuccess && (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1 animate-pulse">
                      <Check className="w-3.5 h-3.5" /> Stock Updated!
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="btn-quick-add-1"
                    onClick={() => handleQuickAddStock(1)}
                    className="flex-1 py-2 px-3 bg-white hover:bg-emerald-600 hover:text-white text-slate-800 text-xs font-bold rounded-lg border border-emerald-200 shadow-sm transition-all active:scale-95"
                  >
                    +1 Unit
                  </button>
                  <button
                    id="btn-quick-add-5"
                    onClick={() => handleQuickAddStock(5)}
                    className="flex-1 py-2 px-3 bg-white hover:bg-emerald-600 hover:text-white text-slate-800 text-xs font-bold rounded-lg border border-emerald-200 shadow-sm transition-all active:scale-95"
                  >
                    +5 Units
                  </button>
                  <button
                    id="btn-quick-add-10"
                    onClick={() => handleQuickAddStock(10)}
                    className="flex-1 py-2 px-3 bg-white hover:bg-emerald-600 hover:text-white text-slate-800 text-xs font-bold rounded-lg border border-emerald-200 shadow-sm transition-all active:scale-95"
                  >
                    +10 Units
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* CASE 2: QR CODE DETECTED WITH SPECIAL PAYLOAD (URL / JSON / TEXT) */}
          {/* ============================================================= */}
          {isQr && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Decoded QR Content</span>
                  </span>
                  <button
                    id="btn-copy-qr-val"
                    onClick={handleCopyValue}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-200 shadow-2xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Safe URL View */}
                {code.isUrl ? (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 break-all font-mono text-xs text-indigo-700">
                      {code.value}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Safe preview: URL will NOT open automatically. Click below to open in a new tab safely.
                    </p>
                    <button
                      id="btn-open-safe-url"
                      onClick={() => handleSafeUrlOpen(code.value)}
                      className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Link Safely</span>
                    </button>
                  </div>
                ) : code.isJson && code.parsedJson ? (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-slate-900 text-emerald-400 rounded-lg font-mono text-xs max-h-40 overflow-auto whitespace-pre">
                      {JSON.stringify(code.parsedJson, null, 2)}
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 break-all font-mono text-xs text-slate-800 max-h-36 overflow-auto">
                    {code.value}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* CASE 3: NEW UNKNOWN PRODUCT (NOT IN LOCAL INVENTORY)          */}
          {/* ============================================================= */}
          {!found && !isQr && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>No matching product in local database</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Barcode <span className="font-mono font-bold text-slate-900">{code.value}</span> is valid, but has not yet been registered in your inventory.
                </p>
                <div className="pt-2">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Recommended Next Action
                  </div>
                  <p className="text-xs text-slate-700">
                    Use <strong>AI Label Vision</strong> to automatically extract the product title, brand, MFD, and Expiry date directly from the product packaging photos!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2">
          {found && item ? (
            <>
              <button
                id="btn-edit-found-product"
                onClick={() => {
                  onOpenProductFormWithData(item);
                  onClose();
                }}
                className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Edit3 className="w-4 h-4" />
                <span>View / Edit in Form</span>
              </button>
              <button
                id="btn-scan-next-item"
                onClick={onScanNext}
                className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Scan Next Item</span>
              </button>
            </>
          ) : (
            <>
              <button
                id="btn-scan-with-gemini"
                onClick={() => {
                  onScanLabelWithAi(code.value);
                  onClose();
                }}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-500/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>Scan Label with AI Vision</span>
              </button>
              <button
                id="btn-fill-manually"
                onClick={() => {
                  onOpenProductFormWithData({
                    barcode: code.value,
                    qrCode: isQr ? code.value : undefined,
                    productName: '',
                  });
                  onClose();
                }}
                className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                <span>Enter Manually</span>
              </button>
              <button
                id="btn-scan-again-notfound"
                onClick={onScanNext}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl flex items-center justify-center transition-colors"
                title="Scan Again"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
