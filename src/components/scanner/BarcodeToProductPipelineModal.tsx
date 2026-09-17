/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Camera,
  RefreshCw,
  Package,
  Layers,
  Calendar,
  DollarSign,
  Barcode as BarcodeIcon,
  Check,
  Edit3,
  Plus,
  ArrowRight,
  ShieldCheck,
  Info,
  SlidersHorizontal,
  ChevronRight,
  Upload,
  AlertCircle,
  Tag,
  Loader2,
  WifiOff,
  ExternalLink,
  Copy,
  PlusCircle,
} from 'lucide-react';
import { DetectedCode, SavedInventoryItem } from '../../types';
import {
  lookupBarcodeProduct,
  BarcodeLookupResult,
  BarcodeLookupProduct,
  normalizeBarcode,
  validateBarcodeChecksum,
  LookupStatusType,
} from '../../services/barcodeLookup';
import { saveProduct, adjustProductStock, getProducts } from '../../utils/unifiedDataStore';
import { saveProductToInventory } from '../../utils/inventoryStore';
import { pipelineLogger } from '../../utils/debugLogger';

interface BarcodeToProductPipelineModalProps {
  isOpen: boolean;
  detectedCode: DetectedCode | null;
  onClose: () => void;
  onScanNext: () => void;
  onProductSaved?: (product: SavedInventoryItem) => void;
  onSwitchToFullAiVision?: (barcode?: string) => void;
  onOpenManualEntryWithBarcode?: (barcode: string) => void;
}

type ModalViewMode =
  | 'lookup_in_progress'
  | 'product_found_card'
  | 'product_not_found_card'
  | 'duplicate_exists_card'
  | 'network_error_card'
  | 'invalid_barcode_card'
  | 'edit_form'
  | 'label_camera_scan';

export const BarcodeToProductPipelineModal: React.FC<BarcodeToProductPipelineModalProps> = ({
  isOpen,
  detectedCode,
  onClose,
  onScanNext,
  onProductSaved,
  onSwitchToFullAiVision,
  onOpenManualEntryWithBarcode,
}) => {
  // Current pipeline view state
  const [viewMode, setViewMode] = useState<ModalViewMode>('lookup_in_progress');
  const [statusMessage, setStatusMessage] = useState<string>('Scanning barcode...');
  const [normalizedBarcode, setNormalizedBarcode] = useState<string>('');

  // Lookup results & matched product
  const [lookupResult, setLookupResult] = useState<BarcodeLookupResult | null>(null);
  const [existingItem, setExistingItem] = useState<SavedInventoryItem | null>(null);

  // Form Fields for Confirmation / Editing (Mapped from Open Food Facts / Database)
  const [formFields, setFormFields] = useState<{
    productName: string;
    brand: string;
    barcode: string;
    category: string;
    imageUrl: string;
    quantity: string;
    unit: string;
    purchasePrice: string;
    sellingPrice: string;
    mrp: string;
    manufacturingDate: string;
    expiryDate: string;
    batchNumber: string;
    description: string;
    supplier: string;
    rackLocation: string;
    stockQuantity: number;
    minStockAlert: number;
  }>({
    productName: '',
    brand: '',
    barcode: '',
    category: 'Food & Groceries',
    imageUrl: '',
    quantity: '1',
    unit: 'pcs',
    purchasePrice: '',
    sellingPrice: '',
    mrp: '',
    manufacturingDate: '',
    expiryDate: '',
    batchNumber: '',
    description: '',
    supplier: '',
    rackLocation: 'Main Shelf',
    stockQuantity: 1,
    minStockAlert: 5,
  });

  // Stock update state for duplicate items
  const [customAddAmount, setCustomAddAmount] = useState<number>(1);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [copiedBarcode, setCopiedBarcode] = useState<boolean>(false);

  // Label capture camera (optional photo capture)
  const labelVideoRef = useRef<HTMLVideoElement | null>(null);
  const labelStreamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // Execute Lookup Pipeline on open
  useEffect(() => {
    if (!isOpen || !detectedCode) return;

    const raw = detectedCode.value;
    const clean = normalizeBarcode(raw);
    setNormalizedBarcode(clean);
    setSaveSuccess(false);

    // Initial state progression: "Scanning barcode..." -> "Barcode detected" -> "Searching product database..."
    setStatusMessage('Barcode detected');
    setViewMode('lookup_in_progress');

    const lookupTimeout = setTimeout(async () => {
      setStatusMessage('Searching product database...');

      const result = await lookupBarcodeProduct(clean);
      setLookupResult(result);

      if (result.status === 'invalid_barcode') {
        setStatusMessage('Invalid barcode');
        setViewMode('invalid_barcode_card');
      } else if (result.status === 'network_error') {
        setStatusMessage('Network error');
        setViewMode('network_error_card');
      } else if (result.status === 'product_exists' && result.existingInventoryItem) {
        setStatusMessage('Product already exists');
        setExistingItem(result.existingInventoryItem);
        setViewMode('duplicate_exists_card');
      } else if (result.status === 'product_found' && result.product) {
        setStatusMessage('Product found');
        populateFormFromProduct(result.product);
        setViewMode('product_found_card');
      } else {
        setStatusMessage('Product not found');
        // Pre-fill manual form fields with only the barcode ID
        setFormFields((prev) => ({
          ...prev,
          productName: '',
          brand: '',
          barcode: clean,
          category: 'General Goods',
          imageUrl: '',
          quantity: '1',
          unit: 'pcs',
          purchasePrice: '',
          sellingPrice: '',
          mrp: '',
          manufacturingDate: '',
          expiryDate: '',
          batchNumber: '',
          description: '',
          supplier: '',
          rackLocation: 'Main Shelf',
          stockQuantity: 1,
          minStockAlert: 5,
        }));
        setViewMode('product_not_found_card');
      }
    }, 250);

    return () => clearTimeout(lookupTimeout);
  }, [isOpen, detectedCode]);

  // Map API response to Inventory Form fields
  const populateFormFromProduct = (prod: BarcodeLookupProduct) => {
    setFormFields({
      productName: prod.product_name || prod.productName || '',
      brand: prod.brand || '',
      barcode: prod.barcode || normalizedBarcode,
      category: prod.category || 'Food & Groceries',
      imageUrl: prod.image_url || prod.imageUrl || '',
      quantity: prod.quantity || prod.packageSize || '1',
      unit: prod.unit || 'pcs',
      purchasePrice: prod.purchase_price || '',
      sellingPrice: prod.selling_price ? String(prod.selling_price) : prod.mrp ? String(prod.mrp) : '',
      mrp: prod.mrp ? String(prod.mrp) : '',
      manufacturingDate: prod.mfd || '',
      expiryDate: prod.exp || '',
      batchNumber: '',
      description: prod.description || '',
      supplier: prod.supplier || prod.brand || '',
      rackLocation: 'Main Shelf',
      stockQuantity: 1,
      minStockAlert: 5,
    });
  };

  // Copy Barcode handler
  const handleCopyBarcode = () => {
    if (!normalizedBarcode) return;
    navigator.clipboard.writeText(normalizedBarcode).then(() => {
      setCopiedBarcode(true);
      setTimeout(() => setCopiedBarcode(false), 2000);
    });
  };

  // Stock Adjustment for Existing Item
  const handleUpdateStock = (amountToAdd: number) => {
    if (!existingItem) return;
    adjustProductStock(existingItem.id, amountToAdd);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onScanNext();
    }, 1000);
  };

  // Save new Product after User Confirmation
  const handleConfirmAndSave = () => {
    if (!formFields.productName.trim()) {
      alert('Please enter a product name before saving to inventory.');
      return;
    }

    const newItem: SavedInventoryItem = {
      id: `prod_${Date.now()}_${normalizedBarcode.slice(-4) || 'item'}`,
      savedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      productName: formFields.productName.trim(),
      brand: formFields.brand.trim(),
      category: formFields.category.trim() || 'General Goods',
      barcode: normalizedBarcode,
      sku: `SKU-${normalizedBarcode.slice(-6) || Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      quantity: formFields.quantity.trim() || '1',
      unit: formFields.unit.trim() || 'pcs',
      purchasePrice: formFields.purchasePrice.trim(),
      sellingPrice: formFields.sellingPrice.trim() || formFields.mrp.trim(),
      mrp: formFields.mrp.trim(),
      stockQuantity: Number(formFields.stockQuantity) || 1,
      minStockAlert: Number(formFields.minStockAlert) || 5,
      manufacturingDate: formFields.manufacturingDate.trim(),
      expiryDate: formFields.expiryDate.trim(),
      batchNumber: formFields.batchNumber.trim(),
      supplier: formFields.supplier.trim(),
      rackLocation: formFields.rackLocation.trim(),
      notes: formFields.description.trim() || `Scanned barcode (${normalizedBarcode})`,
      imageThumbnail: formFields.imageUrl || undefined,
      status: 'in_stock',
      warnings: [],
      missingFields: [],
      bestBefore: '',
    };

    // Save to unified store and local database
    saveProduct(newItem);
    saveProductToInventory(
      {
        productName: newItem.productName,
        brand: newItem.brand,
        category: newItem.category,
        sku: newItem.sku,
        barcode: newItem.barcode,
        batchNumber: newItem.batchNumber,
        manufacturingDate: newItem.manufacturingDate,
        expiryDate: newItem.expiryDate,
        bestBefore: newItem.bestBefore,
        quantity: newItem.quantity,
        unit: newItem.unit,
        mrp: newItem.mrp,
        confidence: {},
        warnings: [],
        missingFields: [],
        isProductOrPackage: true,
        documentType: 'Barcode Product',
        fullName: newItem.productName,
        documentNumber: newItem.barcode,
        dateOfBirth: '',
        issueDate: '',
        email: '',
        phone: '',
        address: '',
        organization: newItem.brand,
        nationality: '',
        notesOrAdditional: newItem.notes || '',
        confidenceScore: 0.98,
        customFields: [],
      },
      newItem.imageThumbnail
    );

    pipelineLogger.log('productSaved', newItem);
    if (onProductSaved) {
      onProductSaved(newItem);
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onScanNext();
    }, 1100);
  };

  if (!isOpen || !detectedCode) return null;

  return (
    <div
      id="barcode-product-lookup-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="barcode-product-lookup-card"
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
      >
        {/* ================================================================= */}
        {/* 1. STATUS HEADER                                                 */}
        {/* ================================================================= */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 border-b border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
                <BarcodeIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-white leading-tight">
                  Barcode Product Lookup
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-indigo-300 font-mono">
                  <span>{detectedCode.format}</span>
                  <span>•</span>
                  <span>{normalizedBarcode}</span>
                  <button
                    onClick={handleCopyBarcode}
                    className="p-1 hover:text-white transition-colors"
                    title="Copy Barcode"
                  >
                    {copiedBarcode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              id="btn-close-barcode-pipeline"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Status Message Pill */}
          <div className="flex items-center gap-2 pt-1">
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                statusMessage === 'Product found'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : statusMessage === 'Searching product database...' || statusMessage === 'Barcode detected' || statusMessage === 'Scanning barcode...'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse'
                  : statusMessage === 'Product already exists'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : statusMessage === 'Product not found'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {statusMessage === 'Searching product database...' ? (
                <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              ) : statusMessage === 'Product found' || statusMessage === 'Product already exists' ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              ) : statusMessage === 'Product not found' ? (
                <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
              )}
              <span>{statusMessage}</span>
            </span>

            <span className="text-[10px] text-slate-400 font-medium">
              Barcode Intake
            </span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. BODY CONTENT ACCORDING TO VIEW MODE                            */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* ------------------------------------------------------------- */}
          {/* STATE A: SEARCHING PRODUCT DATABASE                           */}
          {/* ------------------------------------------------------------- */}
          {viewMode === 'lookup_in_progress' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-9 h-9 text-indigo-600 animate-spin" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">Searching inventory &amp; catalog...</h4>
                <p className="text-xs text-slate-500">Checking barcode {normalizedBarcode}</p>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STATE B: DUPLICATE PROTECTION ("Product already exists")      */}
          {/* ------------------------------------------------------------- */}
          {viewMode === 'duplicate_exists_card' && existingItem && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                <div className="flex items-start gap-3">
                  {existingItem.imageThumbnail ? (
                    <img
                      src={existingItem.imageThumbnail}
                      alt={existingItem.productName}
                      className="w-16 h-16 rounded-xl object-cover border border-emerald-200 shrink-0 bg-white"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                      <Package className="w-8 h-8" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-600 text-white">
                      Product already exists
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900 mt-1 truncate">
                      {existingItem.productName}
                    </h4>
                    <p className="text-xs text-slate-600 font-medium">
                      {existingItem.brand || 'No brand'} • {existingItem.category}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                      Barcode: {existingItem.barcode || normalizedBarcode}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xl font-black text-slate-900 font-mono">
                      {existingItem.stockQuantity}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 block uppercase">
                      In Stock
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-emerald-200 text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Selling Price:</span>
                    <span className="font-bold text-emerald-800">
                      {existingItem.sellingPrice || existingItem.mrp || '$0.00'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Location:</span>
                    <span className="font-medium text-slate-800">
                      {existingItem.rackLocation || 'Main Shelf'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Duplicate Action Buttons: Update stock / View Product / Cancel */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>Update Stock Quantity</span>
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateStock(1)}
                    className="py-2.5 px-3 bg-white hover:bg-emerald-600 hover:text-white border border-slate-200 text-slate-800 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+1 Unit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStock(5)}
                    className="py-2.5 px-3 bg-white hover:bg-emerald-600 hover:text-white border border-slate-200 text-slate-800 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+5 Units</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      populateFormFromProduct({
                        product_name: existingItem.productName,
                        brand: existingItem.brand,
                        barcode: existingItem.barcode,
                        category: existingItem.category,
                        image_url: existingItem.imageThumbnail,
                        productName: existingItem.productName,
                        packageSize: existingItem.quantity || '1',
                        manufacturer: existingItem.supplier || '',
                        source: 'inventory',
                      });
                      setViewMode('edit_form');
                    }}
                    className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Details</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STATE C: PRODUCT FOUND (Compact Android-Optimized Card)        */}
          {/* ------------------------------------------------------------- */}
          {viewMode === 'product_found_card' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Compact Product Card */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-start gap-3.5">
                  {/* Product Image with Fallback */}
                  {formFields.imageUrl ? (
                    <img
                      src={formFields.imageUrl}
                      alt={formFields.productName}
                      className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shrink-0 bg-slate-50"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <Tag className="w-8 h-8" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Product found
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900 mt-1 leading-snug">
                      {formFields.productName}
                    </h4>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      {formFields.brand ? `Brand: ${formFields.brand}` : 'Brand: Standard'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Category: {formFields.category}
                    </p>
                    <p className="text-[11px] font-mono text-indigo-600 font-bold mt-1">
                      Barcode: {formFields.barcode}
                    </p>
                  </div>
                </div>

                {formFields.description && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2">
                    {formFields.description}
                  </p>
                )}

                {/* Initial Stock Input for Fast Entry */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                  <label className="text-xs font-bold text-slate-700">Initial Stock Units:</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormFields((f) => ({ ...f, stockQuantity: Math.max(1, f.stockQuantity - 1) }))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={formFields.stockQuantity}
                      onChange={(e) => setFormFields({ ...formFields, stockQuantity: parseInt(e.target.value, 10) || 1 })}
                      className="w-14 text-center px-2 py-1 rounded-lg border border-slate-200 font-bold text-xs text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setFormFields((f) => ({ ...f, stockQuantity: f.stockQuantity + 1 }))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STATE D: PRODUCT NOT FOUND ("Product not found")               */}
          {/* ------------------------------------------------------------- */}
          {viewMode === 'product_not_found_card' && (
            <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-4 animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">
                    Product not in inventory
                  </h4>
                  <p className="text-xs text-amber-900/90 mt-0.5">
                    The barcode <strong className="font-mono text-slate-900">{normalizedBarcode}</strong> was recognized, but is not yet registered in your inventory or catalog.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-xs text-slate-700 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Info className="w-4 h-4 text-indigo-600" />
                  <span>Important Barcode Rule</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  A barcode is an identifier, not a product name. You can now add the product name and details manually; the barcode is already pre-filled.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  id="btn-add-product-manually-from-pipeline"
                  onClick={() => {
                    if (onOpenManualEntryWithBarcode) {
                      onOpenManualEntryWithBarcode(normalizedBarcode);
                      onClose();
                    } else {
                      setViewMode('edit_form');
                    }
                  }}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Product Manually</span>
                </button>

                <button
                  type="button"
                  onClick={onScanNext}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scan Next Barcode</span>
                </button>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STATE E: NETWORK ERROR ("Network error")                       */}
          {/* ------------------------------------------------------------- */}
          {viewMode === 'network_error_card' && (
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-3 text-center animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <WifiOff className="w-6 h-6" />
              </div>
              <h4 className="text-base font-extrabold text-slate-900">Offline Mode</h4>
              <p className="text-xs text-rose-900/90 max-w-sm mx-auto">
                Unable to complete lookup. You can register the product offline manually below.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setViewMode('edit_form')}
                  className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
                >
                  Add Offline Manually
                </button>
                <button
                  type="button"
                  onClick={onScanNext}
                  className="flex-1 py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold rounded-xl"
                >
                  Scan Next
                </button>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STATE F: INVALID BARCODE ("Invalid barcode")                   */}
          {/* ------------------------------------------------------------- */}
          {viewMode === 'invalid_barcode_card' && (
            <div className="p-5 rounded-2xl bg-slate-100 border border-slate-200 space-y-3 text-center animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-700 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-extrabold text-slate-900">Invalid barcode</h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                The detected barcode format could not be verified with standard checksums.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setViewMode('edit_form')}
                  className="flex-1 py-2.5 px-3 bg-indigo-600 text-white text-xs font-bold rounded-xl"
                >
                  Enter Manually
                </button>
                <button
                  type="button"
                  onClick={onScanNext}
                  className="flex-1 py-2.5 px-3 bg-white text-slate-800 border border-slate-200 text-xs font-bold rounded-xl"
                >
                  Scan Again
                </button>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STATE G: EDIT / CONFIRM FORM (Manual & Attribute Review)      */}
          {/* ------------------------------------------------------------- */}
          {viewMode === 'edit_form' && (
            <div className="space-y-3 text-xs animate-in fade-in">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900 font-medium">
                Verify auto-filled fields and enter purchase/selling prices or stock quantity before saving.
              </div>

              {/* Product Name */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Product Name *</label>
                <input
                  type="text"
                  value={formFields.productName}
                  onChange={(e) => setFormFields({ ...formFields, productName: e.target.value })}
                  placeholder="e.g. Coca-Cola Original 355ml"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Brand & Category */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Brand</label>
                  <input
                    type="text"
                    value={formFields.brand}
                    onChange={(e) => setFormFields({ ...formFields, brand: e.target.value })}
                    placeholder="e.g. The Coca-Cola Company"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Category</label>
                  <input
                    type="text"
                    value={formFields.category}
                    onChange={(e) => setFormFields({ ...formFields, category: e.target.value })}
                    placeholder="e.g. Beverages"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>
              </div>

              {/* Barcode (Readonly identifier) */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Barcode (Identifier)</label>
                <input
                  type="text"
                  value={formFields.barcode}
                  readOnly
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 font-mono text-slate-700 cursor-not-allowed"
                />
              </div>

              {/* Pricing Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Purchase Price ($)</label>
                  <input
                    type="text"
                    value={formFields.purchasePrice}
                    onChange={(e) => setFormFields({ ...formFields, purchasePrice: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Selling Price ($)</label>
                  <input
                    type="text"
                    value={formFields.sellingPrice}
                    onChange={(e) => setFormFields({ ...formFields, sellingPrice: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-emerald-700"
                  />
                </div>
              </div>

              {/* Dates Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Mfg Date (MFD)</label>
                  <input
                    type="date"
                    value={formFields.manufacturingDate}
                    onChange={(e) => setFormFields({ ...formFields, manufacturingDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Expiry Date (EXP)</label>
                  <input
                    type="date"
                    value={formFields.expiryDate}
                    onChange={(e) => setFormFields({ ...formFields, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-rose-700 font-semibold"
                  />
                </div>
              </div>

              {/* Stock Quantity & Location */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Stock Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={formFields.stockQuantity}
                    onChange={(e) => setFormFields({ ...formFields, stockQuantity: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Shelf Location</label>
                  <input
                    type="text"
                    value={formFields.rackLocation}
                    onChange={(e) => setFormFields({ ...formFields, rackLocation: e.target.value })}
                    placeholder="Shelf A-1"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* 3. FOOTER ACTIONS                                                */}
        {/* ================================================================= */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          {viewMode === 'product_found_card' ? (
            <>
              <button
                type="button"
                id="btn-edit-details-from-card"
                onClick={() => setViewMode('edit_form')}
                className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-4 h-4 text-slate-600" />
                <span>Edit Details</span>
              </button>

              <button
                type="button"
                id="btn-add-to-inventory-direct"
                onClick={handleConfirmAndSave}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Product Saved!</span>
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4" />
                    <span>Add to Inventory</span>
                  </>
                )}
              </button>
            </>
          ) : viewMode === 'edit_form' ? (
            <>
              <button
                type="button"
                onClick={onScanNext}
                className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-and-save-product"
                onClick={handleConfirmAndSave}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm &amp; Save to Inventory</span>
                  </>
                )}
              </button>
            </>
          ) : viewMode === 'duplicate_exists_card' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onScanNext}
                className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Scan Next</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onScanNext}
                className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Scan Next Barcode</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
