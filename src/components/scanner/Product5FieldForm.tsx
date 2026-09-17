/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Calendar,
  DollarSign,
  Tag,
  Clock,
  ArrowLeft,
  Check,
  Save,
  HelpCircle,
  Calculator,
  Globe,
  Package,
} from 'lucide-react';
import { ProductScanResult, SavedInventoryItem } from '../../types';
import { saveProduct, getAppSettings } from '../../utils/unifiedDataStore';
import { reconcileProductDates, addMonthsToDate, calculateMonthDifference } from '../../utils/productDateCalculator';

interface Product5FieldFormProps {
  initialData: ProductScanResult;
  capturedImages: string[];
  onSaved: (savedItem: SavedInventoryItem) => void;
  onRetake: () => void;
}

const SUPPORTED_CURRENCIES = [
  { code: 'NPR', label: 'NPR (Rs / रू)', symbol: 'Rs. ' },
  { code: 'INR', label: 'INR (₹)', symbol: '₹' },
  { code: 'USD', label: 'USD ($)', symbol: '$' },
  { code: 'EUR', label: 'EUR (€)', symbol: '€' },
  { code: 'GBP', label: 'GBP (£)', symbol: '£' },
  { code: 'CAD', label: 'CAD (C$)', symbol: 'C$' },
  { code: 'AUD', label: 'AUD (A$)', symbol: 'A$' },
  { code: 'JPY', label: 'JPY (¥)', symbol: '¥' },
  { code: 'CNY', label: 'CNY (¥)', symbol: '¥' },
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

export const Product5FieldForm: React.FC<Product5FieldFormProps> = ({
  initialData,
  capturedImages,
  onSaved,
  onRetake,
}) => {
  const appSettings = getAppSettings();
  const defaultAppCurrency = (appSettings.currency === '$' ? 'USD' : appSettings.currency === '₹' ? 'INR' : appSettings.currency === 'रु' || appSettings.currency === 'Rs' ? 'NPR' : appSettings.currency || 'USD').toUpperCase();

  // Initial calculation check: If MFD & Best Before months exist, compute expiry if empty or calculated
  const rawMfd = initialData.manufactureDate || '';
  const rawExp = initialData.expiryDate || '';
  const rawBb = initialData.bestBeforeMonths !== null && initialData.bestBeforeMonths !== undefined
    ? String(initialData.bestBeforeMonths)
    : '';

  const initialComputedExpiry = (() => {
    if (rawExp && !initialData.isCalculatedExpiry) {
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
    initialData.isCalculatedExpiry ||
    (!rawExp && rawMfd && parseInt(rawBb, 10) > 0 && initialComputedExpiry)
  );

  const [productName, setProductName] = useState(initialData.productName || '');
  const [price, setPrice] = useState<string>(
    initialData.price !== null && initialData.price !== undefined ? String(initialData.price) : ''
  );
  const [currency, setCurrency] = useState(initialData.currency || defaultAppCurrency);
  const [manufactureDate, setManufactureDate] = useState(rawMfd);
  const [expiryDate, setExpiryDate] = useState(initialComputedExpiry);
  const [bestBeforeMonths, setBestBeforeMonths] = useState<string>(rawBb);
  const [quantity, setQuantity] = useState(String(initialData.quantity || 1));
  const [unit, setUnit] = useState(initialData.unit || 'pcs');
  const [detectedLanguage, setDetectedLanguage] = useState(initialData.detectedLanguage || 'English');

  const [isCalculatedExpiry, setIsCalculatedExpiry] = useState<boolean>(initialIsCalculated);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Confidence mapping
  const confidence = initialData.confidence || {};
  const currentCurrencySymbol = SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol || (currency + ' ');

  // Auto-recalculate dates when user modifies fields
  const handleMfdChange = (val: string) => {
    setManufactureDate(val);
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
    setBestBeforeMonths(val);
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
    setExpiryDate(val);
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

    const saved = saveProduct({
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
      isCalculatedExpiry,
      imageThumbnail: capturedImages[0] || undefined,
      additionalPhotos: capturedImages.slice(1),
      warnings: initialData.warnings || [],
    });

    setSavedSuccess(true);
    setTimeout(() => {
      onSaved(saved);
    }, 800);
  };

  // Field status helpers for UI highlighting
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
      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Auto-Configured
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
              PRODUCT REVIEW
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Language, Currency, Unit, and Expiry Dates were automatically detected. You can review or adjust any field.
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
        {capturedImages.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase whitespace-nowrap mr-1">
              Captured Shots ({capturedImages.length}):
            </span>
            {capturedImages.map((img, i) => (
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

      {/* Uncertainty Notice Alert */}
      {hasUncertainFields && (
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 flex items-start gap-3 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">Please confirm highlighted fields</p>
            <p className="text-amber-800">
              One or more fields (such as currency or unit) could not be identified with certainty and require your confirmation.
            </p>
          </div>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Field 1: Product Name */}
          <div className="md:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="p5-product-name" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                1. Product Name <span className="text-rose-500">*</span>
              </label>
              {isNameConfident ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Auto-Detected ({detectedLanguage})
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" /> Confirm Name
                </span>
              )}
            </div>
            <input
              id="p5-product-name"
              type="text"
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. दालमोठ / Organic Almond Milk / अमूल मक्खन"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-2 ${
                !isNameConfident
                  ? 'border-amber-300 bg-amber-50/30 focus:border-amber-500 focus:ring-amber-200'
                  : 'border-slate-300 bg-white focus:border-emerald-500 focus:ring-emerald-100'
              }`}
            />
          </div>

          {/* Field 2: Detected Language */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="p5-language" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                2. Label Language
              </label>
              {isLanguageConfident ? (
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
              id="p5-language"
              value={detectedLanguage}
              onChange={(e) => setDetectedLanguage(e.target.value)}
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
              <label htmlFor="p5-price" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                3. Price & Currency
              </label>
              {isPriceConfident && isCurrencyConfident ? (
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
                  id="p5-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
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
                  id="p5-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className={`w-full pl-8 pr-4 py-2.5 rounded-xl border text-sm font-semibold transition-all focus:outline-none focus:ring-2 ${
                    !isPriceConfident
                      ? 'border-amber-300 bg-amber-50/30 focus:border-amber-500 focus:ring-amber-200'
                      : 'border-slate-300 bg-white focus:border-emerald-500 focus:ring-emerald-100'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Field 4: Quantity & Unit */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="p5-quantity" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                4. Quantity & Unit
              </label>
              {isUnitConfident ? (
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
                  id="p5-quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Qty"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:border-emerald-500 focus:ring-emerald-100"
                />
              </div>
              <div className="w-2/3">
                <select
                  id="p5-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
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
          </div>

          {/* Field 5: Date of Manufacture (MFD) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="p5-mfd" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                5. Date of Manufacture (MFD)
              </label>
              {isMfdConfident ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Detected
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  Verify MFD
                </span>
              )}
            </div>
            <input
              id="p5-mfd"
              type="text"
              value={manufactureDate}
              onChange={(e) => handleMfdChange(e.target.value)}
              placeholder="DD/MM/YYYY or MM/YYYY"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-2 ${
                !isMfdConfident
                  ? 'border-amber-300 bg-amber-50/30 focus:border-amber-500 focus:ring-amber-200'
                  : 'border-slate-300 bg-white focus:border-emerald-500 focus:ring-emerald-100'
              }`}
            />
          </div>

          {/* Field 6: Date of Expiry (EXP) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="p5-exp" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
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
                {isExpConfident ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Detected
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    Verify EXP
                  </span>
                )}
              </div>
            </div>
            <input
              id="p5-exp"
              type="text"
              value={expiryDate}
              onChange={(e) => handleExpiryDateChange(e.target.value)}
              placeholder="DD/MM/YYYY or MM/YYYY"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-2 ${
                !isExpConfident
                  ? 'border-amber-300 bg-amber-50/30 focus:border-amber-500 focus:ring-amber-200'
                  : 'border-slate-300 bg-white focus:border-emerald-500 focus:ring-emerald-100'
              }`}
            />
          </div>

          {/* Field 7: Best Before (Months) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="p5-bb" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                7. Best Before (Months)
              </label>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                Duration
              </span>
            </div>
            <div className="relative">
              <input
                id="p5-bb"
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

        {/* Action Button */}
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
