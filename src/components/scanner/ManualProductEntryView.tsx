/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  PackagePlus,
  Calendar,
  DollarSign,
  Boxes,
  Tag,
  Barcode,
  QrCode,
  MapPin,
  Truck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Camera,
  Upload,
  RotateCcw,
  Layers,
  FileText,
  Percent,
  Plus,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { SavedInventoryItem } from '../../types';
import {
  saveProduct,
  getProducts,
  subscribeToStore,
} from '../../utils/unifiedDataStore';
import { codeDetector } from '../../utils/barcodeDetector';
import { playScanBeep, triggerHapticFeedback } from '../../utils/barcodeDetector';

interface ManualProductEntryViewProps {
  existingProduct?: SavedInventoryItem | null;
  initialBarcode?: string | null;
  onSaveSuccess?: (product: SavedInventoryItem) => void;
  onCancel?: () => void;
}

const CATEGORY_OPTIONS = [
  'Food & Beverages',
  'Dairy & Chilled',
  'Packaged Snacks',
  'Personal Care & Cosmetics',
  'Pharmaceuticals & Health',
  'Household & Cleaning',
  'Electronics & Accessories',
  'Apparel & Fashion',
  'Office & Stationery',
  'General Goods',
  'Other',
];

const UNIT_OPTIONS = [
  'pcs',
  'kg',
  'g',
  'litre',
  'ml',
  'box',
  'packet',
  'dozen',
  'units',
  'bottles',
  'cans',
];

type ShelfLifeUnit = 'days' | 'months' | 'years';

export const ManualProductEntryView: React.FC<ManualProductEntryViewProps> = ({
  existingProduct,
  initialBarcode,
  onSaveSuccess,
  onCancel,
}) => {
  // Collapsible section visibility states
  const [sectionsOpen, setSectionsOpen] = useState({
    basic: true,
    dates: true,
    stock: true,
    pricing: true,
    additional: false,
  });

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Form Field States
  const [productName, setProductName] = useState(existingProduct?.productName || '');
  const [brand, setBrand] = useState(existingProduct?.brand || '');
  const [category, setCategory] = useState(
    existingProduct?.category || 'Food & Beverages'
  );
  const [customCategory, setCustomCategory] = useState('');
  const [sku, setSku] = useState(existingProduct?.sku || '');
  const [barcode, setBarcode] = useState(
    existingProduct?.barcode || initialBarcode || ''
  );
  const [qrCode, setQrCode] = useState(existingProduct?.qrCode || '');

  // Dates & Shelf Life
  const [manufacturingDate, setManufacturingDate] = useState(
    existingProduct?.manufacturingDate || ''
  );
  const [expiryDate, setExpiryDate] = useState(
    existingProduct?.expiryDate || ''
  );
  const [shelfLifeValue, setShelfLifeValue] = useState<string>(
    existingProduct?.bestBeforeMonths ? String(existingProduct.bestBeforeMonths) : ''
  );
  const [shelfLifeUnit, setShelfLifeUnit] = useState<ShelfLifeUnit>('months');
  const [isCalculatedExpiry, setIsCalculatedExpiry] = useState(false);
  const [isCalculatedShelfLife, setIsCalculatedShelfLife] = useState(false);

  // Stock Details
  const [quantity, setQuantity] = useState<string>(
    existingProduct?.stockQuantity !== undefined
      ? String(existingProduct.stockQuantity)
      : '10'
  );
  const [unit, setUnit] = useState(existingProduct?.unit || 'pcs');
  const [minStockAlert, setMinStockAlert] = useState<string>(
    existingProduct?.minStockAlert !== undefined
      ? String(existingProduct.minStockAlert)
      : '5'
  );
  const [rackLocation, setRackLocation] = useState(
    existingProduct?.rackLocation || ''
  );

  // Pricing & Supplier
  const [purchasePrice, setPurchasePrice] = useState<string>(
    existingProduct?.purchasePrice
      ? existingProduct.purchasePrice.replace(/[^0-9.]/g, '')
      : ''
  );
  const [sellingPrice, setSellingPrice] = useState<string>(
    existingProduct?.sellingPrice
      ? existingProduct.sellingPrice.replace(/[^0-9.]/g, '')
      : existingProduct?.mrp
      ? existingProduct.mrp.replace(/[^0-9.]/g, '')
      : ''
  );
  const [supplier, setSupplier] = useState(existingProduct?.supplier || '');
  const [purchaseDate, setPurchaseDate] = useState(
    existingProduct?.lastPurchaseDate || new Date().toISOString().split('T')[0]
  );

  // Additional Info
  const [imageThumbnail, setImageThumbnail] = useState<string | null>(
    existingProduct?.imageThumbnail || null
  );
  const [notes, setNotes] = useState(existingProduct?.notes || '');
  const [batchNumber, setBatchNumber] = useState(
    existingProduct?.batchNumber || ''
  );

  // Validation & UI State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedProduct, setSavedProduct] = useState<SavedInventoryItem | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Camera Scanner Modal
  const [scannerField, setScannerField] = useState<'barcode' | 'qr' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto calculate Expiry from MFD + Shelf Life
  const calculateExpiryFromMfd = (
    mfdStr: string,
    val: number,
    unitType: ShelfLifeUnit
  ): string => {
    if (!mfdStr || !val || isNaN(val) || val <= 0) return '';
    try {
      const date = new Date(mfdStr);
      if (isNaN(date.getTime())) return '';

      if (unitType === 'days') {
        date.setDate(date.getDate() + val);
      } else if (unitType === 'months') {
        date.setMonth(date.getMonth() + val);
      } else if (unitType === 'years') {
        date.setFullYear(date.getFullYear() + val);
      }
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // Auto calculate Shelf Life from MFD + EXP
  const calculateShelfLifeFromDates = (
    mfdStr: string,
    expStr: string
  ): { value: string; unit: ShelfLifeUnit } => {
    if (!mfdStr || !expStr) return { value: '', unit: 'months' };
    try {
      const mfd = new Date(mfdStr);
      const exp = new Date(expStr);
      if (isNaN(mfd.getTime()) || isNaN(exp.getTime()) || exp < mfd) {
        return { value: '', unit: 'months' };
      }

      const diffMs = exp.getTime() - mfd.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays >= 365 && diffDays % 365 === 0) {
        return { value: String(Math.round(diffDays / 365)), unit: 'years' };
      }
      if (diffDays >= 30) {
        const months = Math.round(diffDays / 30.4375);
        return { value: String(months), unit: 'months' };
      }
      return { value: String(diffDays), unit: 'days' };
    } catch {
      return { value: '', unit: 'months' };
    }
  };

  // Handle MFD Change
  const handleMfdChange = (val: string) => {
    setManufacturingDate(val);
    if (errors.manufacturingDate) {
      setErrors((prev) => ({ ...prev, manufacturingDate: '' }));
    }

    // If shelf life is already set and user hasn't explicitly locked custom expiry, auto-calc expiry
    const shelfNum = parseFloat(shelfLifeValue);
    if (val && !isNaN(shelfNum) && shelfNum > 0) {
      const calculatedExp = calculateExpiryFromMfd(val, shelfNum, shelfLifeUnit);
      if (calculatedExp) {
        setExpiryDate(calculatedExp);
        setIsCalculatedExpiry(true);
      }
    } else if (val && expiryDate) {
      const shelf = calculateShelfLifeFromDates(val, expiryDate);
      if (shelf.value) {
        setShelfLifeValue(shelf.value);
        setShelfLifeUnit(shelf.unit);
        setIsCalculatedShelfLife(true);
      }
    }
  };

  // Handle Shelf Life Value or Unit Change
  const handleShelfLifeChange = (val: string, unitType: ShelfLifeUnit) => {
    setShelfLifeValue(val);
    setShelfLifeUnit(unitType);
    setIsCalculatedShelfLife(false);

    const num = parseFloat(val);
    if (manufacturingDate && !isNaN(num) && num > 0) {
      const calculatedExp = calculateExpiryFromMfd(manufacturingDate, num, unitType);
      if (calculatedExp) {
        setExpiryDate(calculatedExp);
        setIsCalculatedExpiry(true);
      }
    }
  };

  // Handle Expiry Date Change
  const handleExpiryDateChange = (val: string) => {
    setExpiryDate(val);
    setIsCalculatedExpiry(false);
    if (errors.expiryDate) {
      setErrors((prev) => ({ ...prev, expiryDate: '' }));
    }

    if (manufacturingDate && val) {
      const shelf = calculateShelfLifeFromDates(manufacturingDate, val);
      if (shelf.value) {
        setShelfLifeValue(shelf.value);
        setShelfLifeUnit(shelf.unit);
        setIsCalculatedShelfLife(true);
      }
    }
  };

  // Force Recalculate
  const handleRecalculateDates = () => {
    const shelfNum = parseFloat(shelfLifeValue);
    if (manufacturingDate && !isNaN(shelfNum) && shelfNum > 0) {
      const calculatedExp = calculateExpiryFromMfd(manufacturingDate, shelfNum, shelfLifeUnit);
      if (calculatedExp) {
        setExpiryDate(calculatedExp);
        setIsCalculatedExpiry(true);
      }
    } else if (manufacturingDate && expiryDate) {
      const shelf = calculateShelfLifeFromDates(manufacturingDate, expiryDate);
      if (shelf.value) {
        setShelfLifeValue(shelf.value);
        setShelfLifeUnit(shelf.unit);
        setIsCalculatedShelfLife(true);
      }
    }
  };

  // Generate SKU helper
  const handleGenerateSku = () => {
    const prefix = (brand || productName || 'SKU')
      .replace(/[^a-zA-Z]/g, '')
      .substring(0, 3)
      .toUpperCase() || 'ITM';
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const generated = `${prefix}-${randNum}`;
    setSku(generated);
  };

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageThumbnail(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Camera Quick Scan for Barcode or QR
  const startCameraScanner = async (field: 'barcode' | 'qr') => {
    setScannerField(field);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Loop detection
      scanIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        const detected = await codeDetector.detectFromVideo(videoRef.current);
        if (detected) {
          playScanBeep();
          triggerHapticFeedback();
          if (field === 'barcode') {
            setBarcode(detected.value);
          } else {
            setQrCode(detected.value);
          }
          stopCameraScanner();
        }
      }, 250);
    } catch (err) {
      console.error('Failed to start camera for quick scan:', err);
      alert('Unable to access camera. Please enter the code manually.');
      stopCameraScanner();
    }
  };

  const stopCameraScanner = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScannerField(null);
  };

  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!productName.trim()) {
      newErrors.productName = 'Product Name is required.';
    }

    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      newErrors.quantity = 'Quantity must be a valid positive number (e.g. 1, 10).';
    }

    if (purchasePrice) {
      const pPrice = parseFloat(purchasePrice);
      if (isNaN(pPrice) || pPrice < 0) {
        newErrors.purchasePrice = 'Purchase price must be a valid non-negative number.';
      }
    }

    if (sellingPrice) {
      const sPrice = parseFloat(sellingPrice);
      if (isNaN(sPrice) || sPrice < 0) {
        newErrors.sellingPrice = 'Selling price must be a valid non-negative number.';
      }
    }

    if (manufacturingDate && expiryDate) {
      const mDate = new Date(manufacturingDate);
      const eDate = new Date(expiryDate);
      if (eDate < mDate) {
        newErrors.expiryDate = 'Expiry Date cannot be earlier than Manufacture Date (MFD).';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      // Open section with errors
      if (errors.productName) setSectionsOpen((prev) => ({ ...prev, basic: true }));
      if (errors.expiryDate) setSectionsOpen((prev) => ({ ...prev, dates: true }));
      if (errors.quantity) setSectionsOpen((prev) => ({ ...prev, stock: true }));
      return;
    }

    setIsSubmitting(true);

    const effectiveCategory =
      category === 'Other' && customCategory.trim()
        ? customCategory.trim()
        : category;

    const numQty = Math.max(1, parseFloat(quantity) || 1);
    const pPriceNum = parseFloat(purchasePrice) || 0;
    const sPriceNum = parseFloat(sellingPrice) || pPriceNum;

    const productPayload: Partial<SavedInventoryItem> = {
      ...(existingProduct?.id ? { id: existingProduct.id } : {}),
      productName: productName.trim(),
      brand: brand.trim(),
      category: effectiveCategory,
      sku: sku.trim() || (barcode ? `SKU-${barcode.slice(-6)}` : `SKU-${Date.now().toString().slice(-5)}`),
      barcode: barcode.trim(),
      qrCode: qrCode.trim(),
      batchNumber: batchNumber.trim(),
      manufacturingDate,
      expiryDate,
      bestBefore: shelfLifeValue ? `${shelfLifeValue} ${shelfLifeUnit}` : expiryDate,
      bestBeforeMonths:
        shelfLifeUnit === 'months'
          ? parseInt(shelfLifeValue, 10) || null
          : shelfLifeUnit === 'years'
          ? (parseInt(shelfLifeValue, 10) || 1) * 12
          : null,
      quantity: String(numQty),
      unit,
      stockQuantity: numQty,
      minStockAlert: parseInt(minStockAlert, 10) || 5,
      rackLocation: rackLocation.trim(),
      purchasePrice: pPriceNum > 0 ? `$${pPriceNum.toFixed(2)}` : '',
      sellingPrice: sPriceNum > 0 ? `$${sPriceNum.toFixed(2)}` : '',
      mrp: sPriceNum > 0 ? `$${sPriceNum.toFixed(2)}` : '',
      supplier: supplier.trim(),
      lastPurchaseDate: purchaseDate,
      notes: notes.trim(),
      imageThumbnail: imageThumbnail || undefined,
      savedAt: existingProduct?.savedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = saveProduct(productPayload);
    setSavedProduct(saved);
    setIsSubmitting(false);
    setSuccessMessage(
      existingProduct
        ? `Product "${saved.productName}" updated successfully.`
        : `Product "${saved.productName}" added successfully to Inventory.`
    );

    if (onSaveSuccess) {
      onSaveSuccess(saved);
    }
  };

  // Realtime Margins Preview
  const pPriceVal = parseFloat(purchasePrice) || 0;
  const sPriceVal = parseFloat(sellingPrice) || 0;
  const unitProfit = sPriceVal > 0 && pPriceVal > 0 ? sPriceVal - pPriceVal : null;
  const marginPercent =
    unitProfit !== null && sPriceVal > 0
      ? Math.round((unitProfit / sPriceVal) * 100)
      : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-0.5">
              <PackagePlus className="w-4 h-4" />
              <span>{existingProduct ? 'Catalog Editor' : 'Manual Inventory Entry'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {existingProduct ? `Edit: ${existingProduct.productName}` : 'Add Product Manually'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct form registration with automated MFD/Expiry math, stock control, and ledger sync.
            </p>
          </div>
        </div>

        {/* Quick Reset */}
        {!existingProduct && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset all fields to default?')) {
                setProductName('');
                setBrand('');
                setCategory('Food & Beverages');
                setSku('');
                setBarcode('');
                setQrCode('');
                setManufacturingDate('');
                setExpiryDate('');
                setShelfLifeValue('');
                setQuantity('10');
                setPurchasePrice('');
                setSellingPrice('');
                setSupplier('');
                setNotes('');
                setImageThumbnail(null);
                setErrors({});
              }
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Form</span>
          </button>
        )}
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-black">{successMessage}</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Saved into unified inventory and accounting ledger.
              </p>
            </div>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ================================================================= */}
        {/* SECTION 1: BASIC PRODUCT DETAILS                                  */}
        {/* ================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('basic')}
            className="w-full p-5 sm:p-6 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">
                1
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  Basic Product Details
                </h2>
                <p className="text-xs text-slate-500">
                  Product name, brand, category, SKU, and barcode identifiers
                </p>
              </div>
            </div>
            <div className="text-slate-400">
              {sectionsOpen.basic ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </div>
          </button>

          {sectionsOpen.basic && (
            <div className="p-5 sm:p-6 border-t border-slate-100 space-y-4">
              {/* Product Name * */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => {
                    setProductName(e.target.value);
                    if (errors.productName) setErrors((prev) => ({ ...prev, productName: '' }));
                  }}
                  placeholder="e.g. Organic Almond Milk 1L"
                  required
                  className={`w-full px-4 py-3 bg-slate-50 rounded-2xl border text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 transition-all ${
                    errors.productName
                      ? 'border-rose-300 bg-rose-50/40 focus:border-rose-500'
                      : 'border-slate-200 focus:border-indigo-500 focus:bg-white'
                  }`}
                />
                {errors.productName && (
                  <p className="text-xs font-bold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{errors.productName}</span>
                  </p>
                )}
              </div>

              {/* Brand & Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Silk / Nestle / Amul"
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom category input if 'Other' selected */}
              {category === 'Other' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Specify Custom Category
                  </label>
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter custom category name"
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              )}

              {/* SKU, Barcode, QR Code Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {/* SKU */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      SKU / Code
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateSku}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. BEV-4921"
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all font-mono"
                  />
                </div>

                {/* Barcode (1D) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                      <Barcode className="w-3.5 h-3.5 text-slate-500" />
                      <span>Barcode (1D)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => startCameraScanner('barcode')}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Scan</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="e.g. 8901030865421"
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all font-mono"
                  />
                </div>

                {/* QR Code (2D) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-slate-500" />
                      <span>QR Code (2D)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => startCameraScanner('qr')}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Scan</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                    placeholder="URL or QR payload"
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* SECTION 2: DATES & AUTOMATED SHELF LIFE CALCULATION               */}
        {/* ================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('dates')}
            className="w-full p-5 sm:p-6 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">
                2
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black text-slate-900">
                    Dates &amp; Shelf Life
                  </h2>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Auto Math
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Manufacture Date, Best Before duration, and Expiry Date calculations
                </p>
              </div>
            </div>
            <div className="text-slate-400">
              {sectionsOpen.dates ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </div>
          </button>

          {sectionsOpen.dates && (
            <div className="p-5 sm:p-6 border-t border-slate-100 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Manufacture Date (MFD) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Manufacture Date (MFD)</span>
                  </label>
                  <input
                    type="date"
                    value={manufacturingDate}
                    onChange={(e) => handleMfdChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Production or packaging date
                  </p>
                </div>

                {/* Best Before / Shelf Life */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Best Before / Shelf Life
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={shelfLifeValue}
                      onChange={(e) => handleShelfLifeChange(e.target.value, shelfLifeUnit)}
                      placeholder="e.g. 12"
                      className="w-24 px-3 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all text-center"
                    />
                    <select
                      value={shelfLifeUnit}
                      onChange={(e) => handleShelfLifeChange(shelfLifeValue, e.target.value as ShelfLifeUnit)}
                      className="flex-1 px-3 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all"
                    >
                      <option value="days">Days</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                  {isCalculatedShelfLife && (
                    <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Auto-calculated from dates
                    </p>
                  )}
                </div>

                {/* Expiry Date (EXP/EXD) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Expiry Date (EXP)</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleRecalculateDates}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                      title="Recalculate Expiry based on MFD and Shelf Life"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Recalculate</span>
                    </button>
                  </div>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => handleExpiryDateChange(e.target.value)}
                    className={`w-full px-4 py-2.5 bg-slate-50 rounded-2xl border text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 transition-all ${
                      errors.expiryDate
                        ? 'border-rose-300 bg-rose-50/40 focus:border-rose-500'
                        : 'border-slate-200 focus:border-emerald-500 focus:bg-white'
                    }`}
                  />
                  {errors.expiryDate ? (
                    <p className="text-xs font-bold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{errors.expiryDate}</span>
                    </p>
                  ) : isCalculatedExpiry ? (
                    <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Auto-computed from MFD + Shelf Life
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">
                      End of consumable shelf life
                    </p>
                  )}
                </div>
              </div>

              {/* Batch Number */}
              <div className="pt-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Batch / Lot Number (Optional)
                </label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. BATCH-2026-X8"
                  className="w-full sm:w-1/2 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* SECTION 3: STOCK & INVENTORY DETAILS                              */}
        {/* ================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('stock')}
            className="w-full p-5 sm:p-6 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-sm">
                3
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  Stock &amp; Location Details
                </h2>
                <p className="text-xs text-slate-500">
                  Initial stock quantity, units, reorder threshold, and warehouse rack
                </p>
              </div>
            </div>
            <div className="text-slate-400">
              {sectionsOpen.stock ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </div>
          </button>

          {sectionsOpen.stock && (
            <div className="p-5 sm:p-6 border-t border-slate-100 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Quantity * */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Initial Stock Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => {
                      setQuantity(e.target.value);
                      if (errors.quantity) setErrors((prev) => ({ ...prev, quantity: '' }));
                    }}
                    required
                    placeholder="10"
                    className={`w-full px-4 py-2.5 bg-slate-50 rounded-2xl border text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 transition-all ${
                      errors.quantity
                        ? 'border-rose-300 bg-rose-50/40 focus:border-rose-500'
                        : 'border-slate-200 focus:border-amber-500 focus:bg-white'
                    }`}
                  />
                  {errors.quantity && (
                    <p className="text-xs font-bold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{errors.quantity}</span>
                    </p>
                  )}
                </div>

                {/* Stock Unit */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Measurement Unit
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:bg-white transition-all"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Min Stock Alert */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Low Stock Alert Level
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(e.target.value)}
                    placeholder="5"
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:bg-white transition-all"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Triggers low stock badge if inventory drops to or below this count
                  </p>
                </div>
              </div>

              {/* Rack Location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>Rack / Shelf / Aisle Location</span>
                </label>
                <input
                  type="text"
                  value={rackLocation}
                  onChange={(e) => setRackLocation(e.target.value)}
                  placeholder="e.g. Aisle 3, Rack B-2, Top Shelf"
                  className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* SECTION 4: PURCHASE & SELLING PRICING                             */}
        {/* ================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('pricing')}
            className="w-full p-5 sm:p-6 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
                4
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  Purchase &amp; Selling Pricing
                </h2>
                <p className="text-xs text-slate-500">
                  Cost basis, retail price, supplier name, and purchase date
                </p>
              </div>
            </div>
            <div className="text-slate-400">
              {sectionsOpen.pricing ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </div>
          </button>

          {sectionsOpen.pricing && (
            <div className="p-5 sm:p-6 border-t border-slate-100 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Purchase Price */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                    <span>Purchase Cost ($ / Unit)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={purchasePrice}
                    onChange={(e) => {
                      setPurchasePrice(e.target.value);
                      if (errors.purchasePrice) setErrors((prev) => ({ ...prev, purchasePrice: '' }));
                    }}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white transition-all font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Inventory valuation cost basis (COGS)
                  </p>
                </div>

                {/* Selling Price / MRP */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                    <span>Selling Price / MRP ($)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={sellingPrice}
                    onChange={(e) => {
                      setSellingPrice(e.target.value);
                      if (errors.sellingPrice) setErrors((prev) => ({ ...prev, sellingPrice: '' }));
                    }}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white transition-all font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Retail checkout price per unit
                  </p>
                </div>
              </div>

              {/* Profit & Margin Live Insight */}
              {unitProfit !== null && (
                <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                    <Percent className="w-4 h-4 text-blue-600" />
                    <span>Unit Gross Profit:</span>
                    <span className="font-black text-emerald-600">
                      {unitProfit >= 0 ? `+$${unitProfit.toFixed(2)}` : `-$${Math.abs(unitProfit).toFixed(2)}`}
                    </span>
                  </div>
                  {marginPercent !== null && (
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      Margin: {marginPercent}%
                    </span>
                  )}
                </div>
              )}

              {/* Supplier & Purchase Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-slate-500" />
                    <span>Supplier / Vendor</span>
                  </label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="e.g. Apex Wholesale Dist."
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Purchase / Procurement Date</span>
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* SECTION 5: ADDITIONAL INFORMATION & PRODUCT PHOTO                 */}
        {/* ================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('additional')}
            className="w-full p-5 sm:p-6 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-sm">
                5
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  Additional Information &amp; Photo
                </h2>
                <p className="text-xs text-slate-500">
                  Product photo thumbnail and internal operational notes
                </p>
              </div>
            </div>
            <div className="text-slate-400">
              {sectionsOpen.additional ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </div>
          </button>

          {sectionsOpen.additional && (
            <div className="p-5 sm:p-6 border-t border-slate-100 space-y-4">
              {/* Product Photo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  <span>Product Photo Thumbnail</span>
                </label>

                {imageThumbnail ? (
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 relative group">
                      <img
                        src={imageThumbnail}
                        alt="Product Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setImageThumbnail(null)}
                        className="absolute top-1 right-1 p-1 rounded-lg bg-rose-600 text-white shadow-sm hover:bg-rose-700 transition-colors"
                        title="Remove photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <label className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer transition-colors inline-block">
                        <span>Change Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[11px] text-slate-400 mt-1">
                        JPG, PNG, WebP supported
                      </p>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 hover:border-indigo-300 bg-slate-50/50 hover:bg-indigo-50/20 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all">
                    <Upload className="w-6 h-6 text-slate-400 mb-2" />
                    <span className="text-xs font-bold text-slate-700">
                      Upload or Snap Product Photo
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      Supports direct camera snap or image file
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Internal Notes</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Special storage requirements, handle with care notes, or vendor agreements..."
                  className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Global Error Banner */}
        {Object.keys(errors).length > 0 && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Please correct highlighted validation errors before saving.</span>
          </div>
        )}

        {/* Bottom Action Bar */}
        <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Saves into Unified Inventory + Accounting Ledger</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors text-center"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-7 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{existingProduct ? 'Update Product' : 'Save Product'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Quick Camera Scanner Modal */}
      {scannerField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2 text-indigo-600">
                {scannerField === 'barcode' ? (
                  <Barcode className="w-5 h-5" />
                ) : (
                  <QrCode className="w-5 h-5" />
                )}
                <h3 className="text-sm font-black text-slate-900 uppercase">
                  Scan {scannerField === 'barcode' ? 'Barcode' : 'QR Code'}
                </h3>
              </div>
              <button
                type="button"
                onClick={stopCameraScanner}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video bg-black rounded-2xl overflow-hidden relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-1/2 border-2 border-dashed border-emerald-400 rounded-xl" />
              </div>
            </div>

            <p className="text-xs text-center text-slate-500">
              Point camera directly at the code on the package.
            </p>

            <button
              type="button"
              onClick={stopCameraScanner}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
            >
              Cancel &amp; Enter Manually
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
