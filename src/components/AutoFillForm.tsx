/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Calendar,
  DollarSign,
  Tag,
  Clock,
  Save,
  Check,
  Calculator,
  Globe,
  Package,
  Layers,
  HelpCircle,
  Loader2,
  Edit3,
} from 'lucide-react';
import { ExtractedFormData, ProductScanResult, SavedInventoryItem } from '../types';
import { getAppSettings } from '../utils/unifiedDataStore';
import { addInventoryIn } from '../services/productPipelineService';
import { addMonthsToDate, calculateMonthDifference } from '../utils/productDateCalculator';
import { parseProductDate } from '../utils/dateService';
import { tempImageManager } from '../utils/smartLabelCropper';

interface AutoFillFormProps {
  initialData: ExtractedFormData | ProductScanResult;
  imageThumbnail: string | null;
  capturedImages?: string[];
  isExtracting?: boolean;
  onSubmit: (formData: ExtractedFormData) => void;
  onRetake: () => void;
  onInventoryUpdated?: () => void;
  onCleanupImages?: () => void;
}

const SUPPORTED_CURRENCIES = [
  { code: 'NPR', label: 'NPR (Rs / रू - Nepalese Rupee)', symbol: 'Rs. ' },
  { code: 'INR', label: 'INR (₹ - Indian Rupee)', symbol: '₹' },
  { code: 'USD', label: 'USD ($ - US Dollar)', symbol: '$' },
  { code: 'EUR', label: 'EUR (€ - Euro)', symbol: '€' },
  { code: 'GBP', label: 'GBP (£ - British Pound)', symbol: '£' },
  { code: 'CAD', label: 'CAD (C$ - Canadian Dollar)', symbol: 'C$' },
  { code: 'AUD', label: 'AUD (A$ - Australian Dollar)', symbol: 'A$' },
  { code: 'JPY', label: 'JPY (¥ - Japanese Yen)', symbol: '¥' },
  { code: 'CNY', label: 'CNY (¥ - Chinese Yuan)', symbol: '¥' },
];

const SUPPORTED_UNITS = [
  { group: 'Weight', options: ['g', 'kg', 'mg', 'tonne'] },
  { group: 'Volume', options: ['mL', 'L'] },
  { group: 'Count / Packaging', options: ['pcs', 'bottles', 'cans', 'packets', 'boxes', 'cartons', 'packs', 'bags', 'pieces'] },
];

const SUPPORTED_LANGUAGES = [
  { code: 'English', label: 'English' },
  { code: 'Nepali', label: 'Nepali (नेपाली)' },
  { code: 'Hindi', label: 'Hindi (हिन्दी)' },
  { code: 'Spanish', label: 'Spanish (Español)' },
  { code: 'French', label: 'French (Français)' },
  { code: 'German', label: 'German (Deutsch)' },
  { code: 'Chinese', label: 'Chinese (中文)' },
  { code: 'Japanese', label: 'Japanese (日本語)' },
  { code: 'Bengali', label: 'Bengali (বাংলা)' },
  { code: 'Other', label: 'Other Language' },
];

export const AutoFillForm: React.FC<AutoFillFormProps> = ({
  initialData,
  imageThumbnail,
  capturedImages = [],
  isExtracting = false,
  onSubmit,
  onRetake,
  onInventoryUpdated,
  onCleanupImages,
}) => {
  const appSettings = getAppSettings();
  const defaultAppCurrency = (appSettings.currency === '$' ? 'USD' : appSettings.currency === '₹' ? 'INR' : appSettings.currency === 'रु' || appSettings.currency === 'Rs' ? 'NPR' : appSettings.currency || 'USD').toUpperCase();
  const [persistPhotoWithRecord, setPersistPhotoWithRecord] = useState<boolean>(false);

  // Track which fields the user has manually edited (NEVER overwrite these)
  const userEditedFields = useRef<Set<string>>(new Set());

  // Track newly auto-filled fields for visual feedback
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());

  // Non-blocking debounced field validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Extract initial values cleanly
  const rawPrice =
    'price' in initialData && initialData.price !== null && initialData.price !== undefined
      ? String(initialData.price)
      : 'mrp' in initialData && initialData.mrp
      ? initialData.mrp.replace(/[^0-9.]/g, '')
      : '';

  const rawMfd =
    'manufactureDate' in initialData && initialData.manufactureDate
      ? initialData.manufactureDate
      : 'manufacturingDate' in initialData
      ? initialData.manufacturingDate || ''
      : '';

  const rawExp = initialData.expiryDate || '';

  const rawBb =
    'bestBeforeMonths' in initialData && initialData.bestBeforeMonths !== null && initialData.bestBeforeMonths !== undefined
      ? String(initialData.bestBeforeMonths)
      : 'bestBefore' in initialData && initialData.bestBefore
      ? initialData.bestBefore.replace(/[^0-9]/g, '')
      : '';

  const rawCurrency =
    'currency' in initialData && initialData.currency
      ? initialData.currency
      : defaultAppCurrency;

  const rawUnit =
    'unit' in initialData && initialData.unit
      ? initialData.unit
      : 'pcs';

  const rawQuantity =
    'quantity' in initialData && initialData.quantity !== undefined
      ? String(initialData.quantity)
      : '1';

  const rawLanguage =
    'detectedLanguage' in initialData && initialData.detectedLanguage
      ? initialData.detectedLanguage
      : 'English';

  // Initial calculation check: If MFD & Best Before months exist, compute expiry if empty or calculated
  const initialComputedExpiry = (() => {
    if (rawExp && !('isCalculatedExpiry' in initialData && initialData.isCalculatedExpiry)) {
      return rawExp;
    }
    const monthsNum = parseInt(rawBb, 10);
    if (rawMfd && !isNaN(monthsNum) && monthsNum > 0) {
      const calc = addMonthsToDate(rawMfd, monthsNum);
      if (calc) return calc;
    }
    return rawExp;
  })();

  const initialIsCalculated = Boolean(
    ('isCalculatedExpiry' in initialData && initialData.isCalculatedExpiry) ||
    (!rawExp && rawMfd && parseInt(rawBb, 10) > 0 && initialComputedExpiry)
  );

  // State
  const [productName, setProductName] = useState(initialData.productName || '');
  const [price, setPrice] = useState(rawPrice);
  const [currency, setCurrency] = useState(rawCurrency);
  const [manufactureDate, setManufactureDate] = useState(rawMfd);
  const [expiryDate, setExpiryDate] = useState(initialComputedExpiry);
  const [bestBeforeMonths, setBestBeforeMonths] = useState(rawBb);
  const [quantity, setQuantity] = useState(rawQuantity);
  const [unit, setUnit] = useState(rawUnit);
  const [detectedLanguage, setDetectedLanguage] = useState(rawLanguage);

  const [isCalculatedExpiry, setIsCalculatedExpiry] = useState(initialIsCalculated);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Progressive auto-fill syncing: when initialData updates (e.g. from AI extraction resolving),
  // update only fields that the user has not manually modified
  useEffect(() => {
    const updated = new Set<string>();

    if (!userEditedFields.current.has('productName') && initialData.productName && initialData.productName !== productName) {
      setProductName(initialData.productName);
      updated.add('productName');
    }

    const newPrice = 'price' in initialData && initialData.price !== null && initialData.price !== undefined
      ? String(initialData.price)
      : 'mrp' in initialData && initialData.mrp
      ? initialData.mrp.replace(/[^0-9.]/g, '')
      : '';
    if (!userEditedFields.current.has('price') && newPrice && newPrice !== price) {
      setPrice(newPrice);
      updated.add('price');
    }

    const newMfd = 'manufactureDate' in initialData && initialData.manufactureDate
      ? initialData.manufactureDate
      : 'manufacturingDate' in initialData
      ? initialData.manufacturingDate || ''
      : '';
    if (!userEditedFields.current.has('manufactureDate') && newMfd && newMfd !== manufactureDate) {
      setManufactureDate(newMfd);
      updated.add('manufactureDate');
    }

    const newBb = 'bestBeforeMonths' in initialData && initialData.bestBeforeMonths !== null && initialData.bestBeforeMonths !== undefined
      ? String(initialData.bestBeforeMonths)
      : 'bestBefore' in initialData && initialData.bestBefore
      ? initialData.bestBefore.replace(/[^0-9]/g, '')
      : '';
    if (!userEditedFields.current.has('bestBeforeMonths') && newBb && newBb !== bestBeforeMonths) {
      setBestBeforeMonths(newBb);
      updated.add('bestBeforeMonths');
    }

    if (!userEditedFields.current.has('expiryDate')) {
      const newExp = initialData.expiryDate || '';
      let calculatedExp = newExp;
      const bNum = parseInt(newBb, 10);
      if (newMfd && !isNaN(bNum) && bNum > 0) {
        const c = addMonthsToDate(newMfd, bNum);
        if (c) calculatedExp = c;
      }
      if (calculatedExp && calculatedExp !== expiryDate) {
        setExpiryDate(calculatedExp);
        if ('isCalculatedExpiry' in initialData) {
          setIsCalculatedExpiry(Boolean(initialData.isCalculatedExpiry));
        }
        updated.add('expiryDate');
      }
    }

    if (!userEditedFields.current.has('currency') && initialData.currency && initialData.currency !== currency) {
      setCurrency(initialData.currency);
      updated.add('currency');
    }

    if (!userEditedFields.current.has('unit') && initialData.unit && initialData.unit !== unit) {
      setUnit(initialData.unit);
      updated.add('unit');
    }

    if (!userEditedFields.current.has('detectedLanguage') && initialData.detectedLanguage && initialData.detectedLanguage !== detectedLanguage) {
      setDetectedLanguage(initialData.detectedLanguage);
      updated.add('detectedLanguage');
    }

    if (updated.size > 0) {
      setHighlightedFields(updated);
      const timer = setTimeout(() => {
        setHighlightedFields(new Set());
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [initialData]);

  // Debounced non-blocking field validation
  const validateFieldDebounced = useCallback((fieldName: string, value: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (fieldName === 'productName') {
        if (!value.trim()) next.productName = 'Product name is required';
        else delete next.productName;
      } else if (fieldName === 'price') {
        const num = parseFloat(value);
        if (value && (isNaN(num) || num < 0)) next.price = 'Enter a valid price';
        else delete next.price;
      } else if (fieldName === 'manufactureDate' || fieldName === 'expiryDate') {
        if (value.trim()) {
          const parsed = parseProductDate(value);
          if (!parsed.isValid) next[fieldName] = 'Check date format (e.g. DD/MM/YYYY)';
          else delete next[fieldName];
        } else {
          delete next[fieldName];
        }
      }
      return next;
    });
  }, []);

  const handleFieldChange = (fieldName: string, value: string, setter: (val: string) => void) => {
    userEditedFields.current.add(fieldName);
    setter(value);

    // Debounce validation so keystrokes remain instantaneous
    if (debounceTimers.current[fieldName]) {
      clearTimeout(debounceTimers.current[fieldName]);
    }
    debounceTimers.current[fieldName] = setTimeout(() => {
      validateFieldDebounced(fieldName, value);
    }, 300);
  };

  const confidence = initialData.confidence || {};
  const allImages = capturedImages.length > 0 ? capturedImages : imageThumbnail ? [imageThumbnail] : [];

  // Currency symbol lookup
  const currentCurrencySymbol = SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol || (currency + ' ');

  // Interactive date calculation
  const handleMfdChange = (val: string) => {
    handleFieldChange('manufactureDate', val, setManufactureDate);
    const monthsNum = parseInt(bestBeforeMonths, 10);
    if (val.trim() && !isNaN(monthsNum) && monthsNum > 0) {
      const calcExp = addMonthsToDate(val.trim(), monthsNum);
      if (calcExp) {
        setExpiryDate(calcExp);
        setIsCalculatedExpiry(true);
      }
    } else if (val.trim() && expiryDate.trim()) {
      const diff = calculateMonthDifference(val.trim(), expiryDate.trim());
      if (diff) {
        setBestBeforeMonths(String(diff));
      }
    }
  };

  const handleBestBeforeChange = (val: string) => {
    handleFieldChange('bestBeforeMonths', val, setBestBeforeMonths);
    const monthsNum = parseInt(val, 10);
    if (manufactureDate.trim() && !isNaN(monthsNum) && monthsNum > 0) {
      const calcExp = addMonthsToDate(manufactureDate.trim(), monthsNum);
      if (calcExp) {
        setExpiryDate(calcExp);
        setIsCalculatedExpiry(true);
      }
    }
  };

  const handleRecalculateExpiry = () => {
    const monthsNum = parseInt(bestBeforeMonths, 10);
    if (manufactureDate.trim() && !isNaN(monthsNum) && monthsNum > 0) {
      const calcExp = addMonthsToDate(manufactureDate.trim(), monthsNum);
      if (calcExp) {
        setExpiryDate(calcExp);
        setIsCalculatedExpiry(true);
      }
    }
  };

  const handleExpiryDateChange = (val: string) => {
    handleFieldChange('expiryDate', val, setExpiryDate);
    setIsCalculatedExpiry(false);
    if (manufactureDate.trim() && val.trim()) {
      const diff = calculateMonthDifference(manufactureDate.trim(), val.trim());
      if (diff) {
        setBestBeforeMonths(String(diff));
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const priceNum = parseFloat(price.replace(/[^0-9.]/g, '')) || null;
    const monthsNum = parseInt(bestBeforeMonths, 10) || null;
    const qtyNum = parseInt(quantity, 10) || 1;

    const formattedPrice = priceNum !== null ? `${currentCurrencySymbol}${priceNum.toFixed(2)}` : '';

    // Use centralized product pipeline service (addInventoryIn) for unified DB & transaction ledger
    addInventoryIn(
      {
        productName: productName.trim() || 'Untitled Product',
        mrp: formattedPrice,
        sellingPrice: formattedPrice,
        currency,
        quantity: String(qtyNum),
        stockQuantity: qtyNum,
        unit,
        detectedLanguage,
        manufacturingDate: manufactureDate.trim(),
        expiryDate: expiryDate.trim(),
        bestBefore: monthsNum ? `${monthsNum} months` : '',
        bestBeforeMonths: monthsNum,
        imageThumbnail: persistPhotoWithRecord ? (allImages[0] || undefined) : undefined,
        additionalPhotos: persistPhotoWithRecord ? allImages.slice(1) : undefined,
        warnings: initialData.warnings || [],
      },
      qtyNum,
      'Product added via Scanner pipeline'
    );

    // Explicitly clear temporary processing images from memory
    tempImageManager.clearAll();
    if (!persistPhotoWithRecord && onCleanupImages) {
      onCleanupImages();
    }

    setSavedSuccess(true);
    if (onInventoryUpdated) {
      onInventoryUpdated();
    }

    // Call parent submit
    const completeFormData: ExtractedFormData = {
      isProductOrPackage: true,
      documentType: 'Product Package',
      productName: productName.trim(),
      brand: '',
      category: '',
      sku: '',
      barcode: '',
      batchNumber: '',
      manufacturingDate: manufactureDate.trim(),
      expiryDate: expiryDate.trim(),
      bestBefore: monthsNum ? `${monthsNum} months` : '',
      bestBeforeMonths: monthsNum,
      quantity: String(qtyNum),
      unit,
      mrp: formattedPrice,
      confidence: initialData.confidence || {},
      warnings: initialData.warnings || [],
      missingFields: [],
      fullName: productName.trim(),
      documentNumber: '',
      dateOfBirth: '',
      issueDate: manufactureDate.trim(),
      email: '',
      phone: '',
      address: '',
      organization: '',
      nationality: '',
      notesOrAdditional: '',
      confidenceScore: 0.95,
      customFields: [],
    };

    setTimeout(() => {
      onSubmit(completeFormData);
    }, 500);
  };

  // Confidence indicators
  const isNameConfident = (confidence.productName ?? 1) >= 0.7 && Boolean(productName.trim());
  const isPriceConfident = (confidence.price ?? 1) >= 0.7 && Boolean(price.trim());
  const isCurrencyConfident = (confidence.currency ?? 1) >= 0.7 && Boolean(currency);
  const isUnitConfident = (confidence.unit ?? 1) >= 0.7 && Boolean(unit);
  const isLanguageConfident = (confidence.detectedLanguage ?? 1) >= 0.7 && Boolean(detectedLanguage);
  const isMfdConfident = (confidence.manufactureDate ?? 1) >= 0.7 && Boolean(manufactureDate.trim());
  const isExpConfident = (confidence.expiryDate ?? 1) >= 0.7 && Boolean(expiryDate.trim());

  const hasUncertainFields =
    !isNameConfident ||
    !isPriceConfident ||
    !isCurrencyConfident ||
    !isUnitConfident ||
    !isLanguageConfident ||
    !isMfdConfident ||
    !isExpConfident;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header Info & Auto-Detection Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Auto-Detected Product
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                <Globe className="w-3 h-3 text-slate-500" /> {detectedLanguage}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-slate-500" /> {currency}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                <Package className="w-3 h-3 text-slate-500" /> Unit: {unit}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              PRODUCT VERIFICATION & AUTO-FILL
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Language, Currency, Unit, and Dates have been automatically detected. You can review or adjust any field.
            </p>
          </div>

          <button
            type="button"
            onClick={onRetake}
            className="self-start sm:self-auto py-2 px-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Retake Photos
          </button>
        </div>

        {/* Thumbnail Preview Strip */}
        {allImages.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase whitespace-nowrap mr-1">
              Captured Shots ({allImages.length}):
            </span>
            {allImages.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActivePhotoIdx(i)}
                className={`relative rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 w-12 h-12 cursor-pointer ${
                  activePhotoIdx === i
                    ? 'border-emerald-500 scale-105 shadow-sm'
                    : 'border-slate-200 opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`Shot ${i + 1}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 right-0 bg-slate-900/80 text-[9px] text-white font-bold px-1 rounded-tl">
                  #{i + 1}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Live AI Extraction Status Banner */}
      {isExtracting && (
        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-indigo-900 animate-pulse">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
            <span className="text-xs font-bold">
              Extracting product details from photos... fields will auto-fill live as detected.
            </span>
          </div>
          <span className="text-[11px] font-semibold text-indigo-600 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
            Streaming
          </span>
        </div>
      )}

      {/* Warnings & Low Confidence Notice */}
      {hasUncertainFields && !isExtracting && (
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 flex items-start gap-3 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">Please confirm highlighted fields</p>
            <p className="text-amber-800">
              Some values (such as currency, unit, or language) could not be identified with maximum confidence. Please review them before saving.
            </p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Field 1: Product Name (Original Printed Language preserved) */}
          <div className="md:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="field-product-name" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                1. Product Name <span className="text-rose-500">*</span>
              </label>
              {userEditedFields.current.has('productName') ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                  <Edit3 className="w-2.5 h-2.5" /> User Edited
                </span>
              ) : isNameConfident ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Auto-Detected ({detectedLanguage})
                </span>
              ) : isExtracting ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> Detecting...
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" /> Confirm Name
                </span>
              )}
            </div>
            <input
              id="field-product-name"
              type="text"
              required
              value={productName}
              onChange={(e) => handleFieldChange('productName', e.target.value, setProductName)}
              placeholder={isExtracting && !productName ? "Extracting product name..." : "e.g. दालमोठ / Organic Almond Milk / अमूल मक्खन"}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-2 ${
                highlightedFields.has('productName')
                  ? 'ring-2 ring-emerald-400 bg-emerald-50/30 border-emerald-400'
                  : fieldErrors.productName
                  ? 'border-rose-300 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-200'
                  : !isNameConfident && productName
                  ? 'border-amber-300 bg-amber-50/30 focus:border-amber-500 focus:ring-amber-200'
                  : 'border-slate-300 bg-white focus:border-emerald-500 focus:ring-emerald-100'
              }`}
            />
            {fieldErrors.productName && (
              <p className="text-[11px] text-rose-600 font-semibold">{fieldErrors.productName}</p>
            )}
            <p className="text-[11px] text-slate-400">
              Original label name preserved in printed script without translation.
            </p>
          </div>

          {/* Field 2: Detected Language */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="field-language" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                2. Label Language
              </label>
              {userEditedFields.current.has('detectedLanguage') ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                  <Edit3 className="w-2.5 h-2.5" /> User Edited
                </span>
              ) : isLanguageConfident ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Auto-Selected
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  Please confirm language
                </span>
              )}
            </div>
            <select
              id="field-language"
              value={detectedLanguage}
              onChange={(e) => handleFieldChange('detectedLanguage', e.target.value, setDetectedLanguage)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:border-emerald-500 focus:ring-emerald-100 cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Field 3: Price & Currency */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="field-price" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                3. Price & Currency
              </label>
              {userEditedFields.current.has('price') ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                  <Edit3 className="w-2.5 h-2.5" /> User Edited
                </span>
              ) : isPriceConfident && isCurrencyConfident ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Detected ({currency})
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  {!isCurrencyConfident ? 'Please confirm currency' : 'Verify Price'}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <div className="w-1/3">
                <select
                  id="field-currency"
                  value={currency}
                  onChange={(e) => handleFieldChange('currency', e.target.value, setCurrency)}
                  className="w-full px-2.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold focus:outline-none focus:ring-2 focus:border-emerald-500 focus:ring-emerald-100 cursor-pointer"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol.trim()})
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-2/3 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  {currentCurrencySymbol.trim()}
                </span>
                <input
                  id="field-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => handleFieldChange('price', e.target.value, setPrice)}
                  placeholder={isExtracting && !price ? "Extracting..." : "0.00"}
                  className={`w-full pl-8 pr-4 py-2.5 rounded-xl border text-sm font-semibold transition-all focus:outline-none focus:ring-2 ${
                    highlightedFields.has('price')
                      ? 'ring-2 ring-emerald-400 bg-emerald-50/30 border-emerald-400'
                      : fieldErrors.price
                      ? 'border-rose-300 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-200'
                      : !isPriceConfident && price
                      ? 'border-amber-300 bg-amber-50/30 focus:border-amber-500 focus:ring-amber-200'
                      : 'border-slate-300 bg-white focus:border-emerald-500 focus:ring-emerald-100'
                  }`}
                />
              </div>
            </div>
            {fieldErrors.price && (
              <p className="text-[11px] text-rose-600 font-semibold">{fieldErrors.price}</p>
            )}
          </div>

          {/* Field 4: Inventory Quantity & Unit (Package size vs Inventory Qty) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="field-quantity" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                4. Quantity & Unit
              </label>
              {userEditedFields.current.has('unit') || userEditedFields.current.has('quantity') ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                  <Edit3 className="w-2.5 h-2.5" /> User Edited
                </span>
              ) : isUnitConfident ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Auto-Selected ({unit})
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  Please confirm unit
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <div className="w-1/3">
                <input
                  id="field-quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => handleFieldChange('quantity', e.target.value, setQuantity)}
                  placeholder="Qty"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:border-emerald-500 focus:ring-emerald-100"
                />
              </div>
              <div className="w-2/3">
                <select
                  id="field-unit"
                  value={unit}
                  onChange={(e) => handleFieldChange('unit', e.target.value, setUnit)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:border-emerald-500 focus:ring-emerald-100 cursor-pointer"
                >
                  {SUPPORTED_UNITS.map((grp) => (
                    <optgroup key={grp.group} label={grp.group}>
                      {grp.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Package size (e.g. 500g, 1L) is mapped to unit; inventory quantity defaults to 1.
            </p>
          </div>

          {/* Field 5: Date of Manufacture (MFD) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="field-mfd" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                5. Date of Manufacture (MFD)
              </label>
              {userEditedFields.current.has('manufactureDate') ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                  <Edit3 className="w-2.5 h-2.5" /> User Edited
                </span>
              ) : isMfdConfident ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Detected
                </span>
              ) : isExtracting ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> Detecting...
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  Verify MFD
                </span>
              )}
            </div>
            <input
              id="field-mfd"
              type="text"
              value={manufactureDate}
              onChange={(e) => handleMfdChange(e.target.value)}
              placeholder={isExtracting && !manufactureDate ? "Extracting MFD..." : "DD/MM/YYYY or MM/YYYY"}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-2 ${
                highlightedFields.has('manufactureDate')
                  ? 'ring-2 ring-emerald-400 bg-emerald-50/30 border-emerald-400'
                  : fieldErrors.manufactureDate
                  ? 'border-rose-300 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-200'
                  : !isMfdConfident && manufactureDate
                  ? 'border-amber-300 bg-amber-50/30 focus:border-amber-500 focus:ring-amber-200'
                  : 'border-slate-300 bg-white focus:border-emerald-500 focus:ring-emerald-100'
              }`}
            />
            {fieldErrors.manufactureDate && (
              <p className="text-[11px] text-rose-600 font-semibold">{fieldErrors.manufactureDate}</p>
            )}
          </div>

          {/* Field 6: Date of Expiry (EXP) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="field-exp" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                6. Date of Expiry (EXP)
              </label>
              <div className="flex items-center gap-1.5">
                {manufactureDate && bestBeforeMonths && (
                  <button
                    type="button"
                    onClick={handleRecalculateExpiry}
                    title="Recalculate Expiry Date from MFD + Best Before Months"
                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Calculator className="w-2.5 h-2.5 text-indigo-600" />
                    {isCalculatedExpiry ? 'Auto-calculated' : 'Auto Calculate'}
                  </button>
                )}
                {userEditedFields.current.has('expiryDate') ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                    <Edit3 className="w-2.5 h-2.5" /> User Edited
                  </span>
                ) : isExpConfident ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Detected
                  </span>
                ) : isExtracting ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Detecting...
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    Verify EXP
                  </span>
                )}
              </div>
            </div>
            <input
              id="field-exp"
              type="text"
              value={expiryDate}
              onChange={(e) => handleExpiryDateChange(e.target.value)}
              placeholder={isExtracting && !expiryDate ? "Extracting EXP..." : "DD/MM/YYYY or MM/YYYY"}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-2 ${
                highlightedFields.has('expiryDate')
                  ? 'ring-2 ring-emerald-400 bg-emerald-50/30 border-emerald-400'
                  : fieldErrors.expiryDate
                  ? 'border-rose-300 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-200'
                  : !isExpConfident && expiryDate
                  ? 'border-amber-300 bg-amber-50/30 focus:border-amber-500 focus:ring-amber-200'
                  : 'border-slate-300 bg-white focus:border-emerald-500 focus:ring-emerald-100'
              }`}
            />
            {fieldErrors.expiryDate && (
              <p className="text-[11px] text-rose-600 font-semibold">{fieldErrors.expiryDate}</p>
            )}
          </div>

          {/* Field 7: Best Before (Months) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="field-bb" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                7. Best Before (Duration in Months)
              </label>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                Duration
              </span>
            </div>
            <div className="relative">
              <input
                id="field-bb"
                type="number"
                min="1"
                max="120"
                value={bestBeforeMonths}
                onChange={(e) => handleBestBeforeChange(e.target.value)}
                placeholder="e.g. 12"
                className="w-full pr-16 pl-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:border-emerald-500 focus:ring-emerald-100"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                Months
              </span>
            </div>
          </div>
        </div>

        {/* Date Calculation Status Note */}
        {isCalculatedExpiry && (
          <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>
                Expiry Date <strong>{expiryDate}</strong> was automatically calculated from MFD + {bestBeforeMonths} months.
              </span>
            </div>
          </div>
        )}

        {/* Image Persistence Option (Privacy & Storage Protection) */}
        {allImages.length > 0 && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between gap-3 text-xs text-slate-700">
            <div className="flex items-center gap-2.5">
              <input
                id="field-persist-photo"
                type="checkbox"
                checked={persistPhotoWithRecord}
                onChange={(e) => setPersistPhotoWithRecord(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="field-persist-photo" className="cursor-pointer font-medium select-none text-slate-800">
                Save photo with inventory record
              </label>
            </div>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              {persistPhotoWithRecord ? 'Photo will be stored' : 'Temporary photos deleted automatically upon save'}
            </span>
          </div>
        )}

        {/* Save & Confirm Button */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            Click <strong>Save Product</strong> to commit this item directly to your inventory.
          </div>

          <button
            type="submit"
            disabled={savedSuccess}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
              savedSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md'
            }`}
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" /> Saved to Inventory!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Product
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
