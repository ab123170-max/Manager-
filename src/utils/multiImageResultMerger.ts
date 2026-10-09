/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductScanResult } from '../types';
import { reconcileProductDates, addMonthsToDate } from './productDateCalculator';
import { getAppSettings } from './unifiedDataStore';

export interface FieldConflictNotice {
  field: string;
  label: string;
  valueA: string | number;
  valueB: string | number;
  chosenValue: string | number;
  reason: string;
}

export interface MultiImageMergeSummary {
  mergedResult: ProductScanResult;
  conflicts: FieldConflictNotice[];
  shotsUsedCount: number;
  isComplete: boolean;
  needsFallback: boolean;
}

/**
 * Validates whether a parsed date string represents a plausible calendar date.
 */
function isValidDateString(dateStr: string | null | undefined): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const s = dateStr.trim();
  if (!s || s.length < 4) return false;

  // Accept YYYY-MM-DD, DD/MM/YYYY, MM/YYYY, YYYY/MM, etc.
  const hasDigits = /\d{2,4}/.test(s);
  return hasDigits && !/^(\?|N\/A|none|null|undefined)$/i.test(s);
}

/**
 * Normalizes price number or string to float.
 */
function normalizePrice(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Compares two strings using simple character similarity.
 */
function stringSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;
  return 0.0;
}

/**
 * Layer 6: Intelligent Multi-Image Merging Engine
 * Merges extraction results from multiple progressive camera shots into a single coherent product record.
 */
export function mergeMultiShotResults(
  shotResults: ProductScanResult[],
  hardwareBarcode?: string,
  initialCapturedImages: string[] = []
): MultiImageMergeSummary {
  const validShots = shotResults.filter((s) => Boolean(s));
  const conflicts: FieldConflictNotice[] = [];

  // Default app settings currency fallback
  const appSettings = getAppSettings();
  const defaultCurrency = (
    appSettings.currency === '$'
      ? 'USD'
      : appSettings.currency === '₹'
      ? 'INR'
      : appSettings.currency === 'रु' || appSettings.currency === 'Rs'
      ? 'NPR'
      : appSettings.currency || 'USD'
  ).toUpperCase();

  // Aggregate captured images in order
  const allImagesSet = new Set<string>(initialCapturedImages);
  for (const shot of validShots) {
    if (shot.capturedImages) {
      shot.capturedImages.forEach((img) => allImagesSet.add(img));
    }
  }
  const mergedImages = Array.from(allImagesSet);

  if (validShots.length === 0) {
    const emptyResult: ProductScanResult = {
      productName: '',
      brand: '',
      barcode: hardwareBarcode || '',
      batchNumber: '',
      price: null,
      currency: defaultCurrency,
      manufactureDate: '',
      expiryDate: '',
      bestBeforeMonths: null,
      isCalculatedExpiry: false,
      quantity: 1,
      unit: 'pcs',
      detectedLanguage: 'English',
      confidence: {},
      warnings: [],
      photosCount: mergedImages.length,
      capturedImages: mergedImages,
    };
    return {
      mergedResult: emptyResult,
      conflicts: [],
      shotsUsedCount: 0,
      isComplete: false,
      needsFallback: true,
    };
  }

  // 1. BARCODE: Hardware Barcode Detector is absolute highest priority (confidence 1.0)
  let finalBarcode = hardwareBarcode ? hardwareBarcode.trim() : '';
  let barcodeConf = finalBarcode ? 1.0 : 0.0;

  if (!finalBarcode) {
    for (const shot of validShots) {
      if (shot.barcode && shot.barcode.trim()) {
        finalBarcode = shot.barcode.trim();
        barcodeConf = shot.confidence?.productName || 0.90;
        break;
      }
    }
  }

  // 2. PRODUCT NAME: Prefer the most specific and highest confidence name
  let finalProductName = '';
  let nameConf = 0;

  for (const shot of validShots) {
    const candidate = (shot.productName || '').trim();
    if (!candidate) continue;

    const conf = shot.confidence?.productName ?? 0.85;

    if (!finalProductName) {
      finalProductName = candidate;
      nameConf = conf;
    } else {
      // Check for conflict if completely different
      const sim = stringSimilarity(finalProductName, candidate);
      if (sim < 0.4 && candidate.length > 3 && finalProductName.length > 3) {
        conflicts.push({
          field: 'productName',
          label: 'Product Name',
          valueA: finalProductName,
          valueB: candidate,
          chosenValue: conf > nameConf ? candidate : finalProductName,
          reason: 'Different product names detected across shots',
        });
      }

      // If candidate is a more descriptive/longer version of current name or higher confidence
      if (conf > nameConf || (candidate.length > finalProductName.length && conf >= nameConf - 0.1)) {
        finalProductName = candidate;
        nameConf = Math.max(nameConf, conf);
      }
    }
  }

  // 3. BRAND: Select the most confident non-empty brand
  let finalBrand = '';
  let brandConf = 0;
  for (const shot of validShots) {
    const candidate = (shot.brand || '').trim();
    if (!candidate) continue;
    const conf = shot.confidence?.productName ?? 0.85;
    if (!finalBrand || conf > brandConf || candidate.length > finalBrand.length) {
      finalBrand = candidate;
      brandConf = conf;
    }
  }

  // 4. PRICE & CURRENCY: Compare and detect conflicting values
  let finalPrice: number | null = null;
  let priceConf = 0;
  let finalCurrency = defaultCurrency;

  for (const shot of validShots) {
    const p = normalizePrice(shot.price);
    const curr = (shot.currency || '').trim().toUpperCase();
    if (curr) finalCurrency = curr;

    if (p !== null) {
      const conf = shot.confidence?.price ?? 0.85;
      if (finalPrice === null) {
        finalPrice = p;
        priceConf = conf;
      } else if (Math.abs(finalPrice - p) > 0.05) {
        // Conflicting price detected
        const chosen = conf > priceConf ? p : finalPrice;
        conflicts.push({
          field: 'price',
          label: 'Price',
          valueA: finalPrice,
          valueB: p,
          chosenValue: chosen,
          reason: 'Different prices detected across shots',
        });
        if (conf > priceConf) {
          finalPrice = p;
          priceConf = conf;
        }
      } else {
        // Corroborated price across multiple shots!
        priceConf = Math.min(0.99, priceConf + 0.10);
      }
    }
  }

  // 5. MANUFACTURING DATE (MFD), EXPIRY DATE (EXP), AND BEST BEFORE MONTHS
  let finalMfd = '';
  let mfdConf = 0;
  let finalExp = '';
  let expConf = 0;
  let finalBbMonths: number | null = null;
  let isCalculatedExpiry = false;

  for (const shot of validShots) {
    if (shot.manufactureDate && isValidDateString(shot.manufactureDate)) {
      const c = shot.confidence?.manufactureDate ?? 0.85;
      if (!finalMfd || c > mfdConf) {
        finalMfd = shot.manufactureDate.trim();
        mfdConf = c;
      }
    }

    if (shot.expiryDate && isValidDateString(shot.expiryDate)) {
      const c = shot.confidence?.expiryDate ?? 0.85;
      if (!finalExp || c > expConf) {
        finalExp = shot.expiryDate.trim();
        expConf = c;
      }
    }

    if (typeof shot.bestBeforeMonths === 'number' && shot.bestBeforeMonths > 0) {
      if (finalBbMonths === null || shot.bestBeforeMonths > finalBbMonths) {
        finalBbMonths = shot.bestBeforeMonths;
      }
    }

    if (shot.isCalculatedExpiry) {
      isCalculatedExpiry = true;
    }
  }

  // Cross-reconcile dates:
  // If one shot provided MFD and another provided Best Before Months, compute EXP!
  const reconciled = reconcileProductDates(finalMfd, finalExp, finalBbMonths);
  finalMfd = reconciled.manufactureDate;
  finalExp = reconciled.expiryDate;
  finalBbMonths = reconciled.bestBeforeMonths;
  if (reconciled.isCalculatedExpiry) {
    isCalculatedExpiry = true;
  }

  // 6. BATCH NUMBER
  let finalBatch = '';
  for (const shot of validShots) {
    if (shot.batchNumber && shot.batchNumber.trim()) {
      finalBatch = shot.batchNumber.trim();
      break;
    }
  }

  // 7. QUANTITY & UNIT
  let finalQuantity = 1;
  let finalUnit = 'pcs';
  for (const shot of validShots) {
    if (typeof shot.quantity === 'number' && shot.quantity > 0) {
      finalQuantity = shot.quantity;
    }
    if (shot.unit && shot.unit.trim()) {
      finalUnit = shot.unit.trim();
    }
  }

  // 8. COMBINE WARNINGS
  const allWarnings = new Set<string>();
  for (const shot of validShots) {
    if (Array.isArray(shot.warnings)) {
      shot.warnings.forEach((w) => allWarnings.add(w));
    }
  }
  for (const c of conflicts) {
    allWarnings.add(`${c.label} conflict: ${c.valueA} vs ${c.valueB}. Used: ${c.chosenValue}`);
  }

  const warningsList = Array.from(allWarnings);

  const mergedResult: ProductScanResult = {
    productName: finalProductName,
    brand: finalBrand,
    barcode: finalBarcode,
    batchNumber: finalBatch,
    price: finalPrice,
    currency: finalCurrency,
    manufactureDate: finalMfd,
    expiryDate: finalExp,
    bestBeforeMonths: finalBbMonths,
    isCalculatedExpiry,
    quantity: finalQuantity,
    unit: finalUnit,
    detectedLanguage: validShots[0]?.detectedLanguage || 'English',
    confidence: {
      productName: nameConf,
      price: priceConf,
      currency: finalCurrency ? 0.90 : 0.40,
      manufactureDate: mfdConf,
      expiryDate: expConf,
      bestBeforeMonths: finalBbMonths !== null ? 0.90 : 0.0,
      quantity: 0.90,
      unit: 0.90,
      overall: Math.min(
        0.98,
        ((nameConf || 0.5) + (expConf || 0.5) + (mfdConf || 0.5) + (priceConf || 0.5)) / 4
      ),
    },
    photosCount: mergedImages.length,
    capturedImages: mergedImages,
    warnings: warningsList,
  };

  // Determine if the product record is essentially complete
  const hasName = Boolean(finalProductName);
  const hasDates = Boolean(finalExp || finalMfd);
  const hasPrice = finalPrice !== null;
  const isComplete = hasName && (hasDates || Boolean(finalBarcode));

  // Determine if progressive single-shot extraction left major gaps that might benefit
  // from a multi-image combined extraction fallback (e.g. 2+ photos taken, but name still empty)
  const needsFallback = validShots.length >= 2 && (!hasName || (!finalExp && !finalMfd && !finalBarcode));

  return {
    mergedResult,
    conflicts,
    shotsUsedCount: validShots.length,
    isComplete,
    needsFallback,
  };
}
