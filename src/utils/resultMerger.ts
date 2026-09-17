/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BarcodeLookupProduct } from '../services/barcodeLookup';
import { ExtractedLabelFields } from './labelOcrExtractor';
import { ExtractedFormData, SavedInventoryItem } from '../types';
import { pipelineLogger } from './debugLogger';
import { addMonthsToDate } from './productDateCalculator';

export type FieldProvenance = 'AUTO-DETECTED' | 'DATABASE' | 'OCR' | 'GEMINI' | 'MANUAL';

export interface MergedProductField<T> {
  value: T;
  provenance: FieldProvenance;
  confidence: number; // 0 - 100
}

export interface MergedProductPipelineResult {
  productName: MergedProductField<string>;
  brand: MergedProductField<string>;
  category: MergedProductField<string>;
  manufacturer: MergedProductField<string>;
  packageSize: MergedProductField<string>;
  unit: MergedProductField<string>;
  barcode: MergedProductField<string>;
  batchNumber: MergedProductField<string>;
  mrp: MergedProductField<string>;
  sellingPrice: MergedProductField<string>;
  purchasePrice: MergedProductField<string>;
  manufactureDate: MergedProductField<string>;
  expiryDate: MergedProductField<string>;
  bestBefore: MergedProductField<string>;
  bestBeforeMonths: number | null;
  isCalculatedExpiry: boolean;
  calculatedExpiryNote?: string;
  ingredients: MergedProductField<string>;
  description: MergedProductField<string>;
  overallConfidence: number; // 0 - 100
  warnings: string[];
  missingFields: string[];
  imageUrl?: string;
}

/**
 * Calculates estimated expiry date if manufacture date and shelf-life months are provided.
 */
export function calculateExpiryFromMfdAndMonths(
  mfd: string,
  months: number
): { calculatedDate: string; note: string } | null {
  if (!mfd || !months || months <= 0) return null;

  try {
    const calculatedDate = addMonthsToDate(mfd, months);
    if (!calculatedDate) return null;

    return {
      calculatedDate,
      note: `Calculated as ${months} months from MFD (${mfd})`,
    };
  } catch {
    return null;
  }
}

/**
 * Merges inputs across Barcode Detector, Database Lookup, Label OCR, and Gemini Vision.
 * Strict priority order:
 * 1. Explicit Barcode from Hardware / Video Detector (100% confidence)
 * 2. Clearly printed label fields from OCR / Vision (Batch, MFD, EXP, MRP)
 * 3. Product Database identity (Name, Brand, Category, Packaging Size, Ingredients)
 * 4. Gemini AI Contextual Supervisor
 */
export function mergePipelineResults(params: {
  detectedBarcode: string;
  databaseProduct: BarcodeLookupProduct | null;
  ocrFields: ExtractedLabelFields | null;
  geminiFields: ExtractedFormData | null;
}): MergedProductPipelineResult {
  const { detectedBarcode, databaseProduct, ocrFields, geminiFields } = params;

  const warnings: string[] = [];
  const missingFields: string[] = [];

  // 1. Barcode (Priority: Detected Barcode -> Gemini -> Database)
  const finalBarcode =
    detectedBarcode ||
    geminiFields?.barcode ||
    databaseProduct?.barcode ||
    '';
  const barcodeProvenance: FieldProvenance = detectedBarcode
    ? 'AUTO-DETECTED'
    : databaseProduct?.barcode
    ? 'DATABASE'
    : geminiFields?.barcode
    ? 'GEMINI'
    : 'MANUAL';

  // 2. Product Name (Priority: Database -> Gemini -> Label keywords)
  let productNameVal = '';
  let productNameProv: FieldProvenance = 'MANUAL';
  let productNameConf = 0;

  if (databaseProduct?.productName) {
    productNameVal = databaseProduct.productName;
    productNameProv = 'DATABASE';
    productNameConf = 98;
  } else if (geminiFields?.productName) {
    productNameVal = geminiFields.productName;
    productNameProv = 'GEMINI';
    productNameConf = Math.round((geminiFields.confidence?.productName || 0.85) * 100);
  } else {
    missingFields.push('productName');
  }

  // 3. Brand
  let brandVal = '';
  let brandProv: FieldProvenance = 'MANUAL';
  let brandConf = 0;

  if (databaseProduct?.brand) {
    brandVal = databaseProduct.brand;
    brandProv = 'DATABASE';
    brandConf = 98;
  } else if (geminiFields?.brand) {
    brandVal = geminiFields.brand;
    brandProv = 'GEMINI';
    brandConf = Math.round((geminiFields.confidence?.brand || 0.8) * 100);
  }

  // 4. Category
  let categoryVal = 'General Merchandise';
  let categoryProv: FieldProvenance = 'MANUAL';
  let categoryConf = 50;

  if (databaseProduct?.category) {
    categoryVal = databaseProduct.category;
    categoryProv = 'DATABASE';
    categoryConf = 95;
  } else if (geminiFields?.category) {
    categoryVal = geminiFields.category;
    categoryProv = 'GEMINI';
    categoryConf = Math.round((geminiFields.confidence?.category || 0.8) * 100);
  }

  // 5. Package Size & Unit
  let packageSizeVal = databaseProduct?.packageSize || geminiFields?.quantity || '1';
  let packageSizeProv: FieldProvenance = databaseProduct?.packageSize
    ? 'DATABASE'
    : geminiFields?.quantity
    ? 'GEMINI'
    : 'MANUAL';
  let unitVal = databaseProduct?.unit || geminiFields?.unit || 'units';

  // 6. Batch / Lot Number (Label OCR / Gemini have highest priority)
  let batchVal = '';
  let batchProv: FieldProvenance = 'MANUAL';
  let batchConf = 0;

  if (ocrFields?.batchNumber) {
    batchVal = ocrFields.batchNumber;
    batchProv = 'OCR';
    batchConf = Math.round((ocrFields.confidence.batchNumber || 0.9) * 100);
  } else if (geminiFields?.batchNumber) {
    batchVal = geminiFields.batchNumber;
    batchProv = 'GEMINI';
    batchConf = Math.round((geminiFields.confidence?.batchNumber || 0.85) * 100);
  }

  // 7. Manufacture Date (Label OCR / Gemini)
  let mfdVal = '';
  let mfdProv: FieldProvenance = 'MANUAL';
  let mfdConf = 0;

  if (ocrFields?.manufactureDate) {
    mfdVal = ocrFields.manufactureDate;
    mfdProv = 'OCR';
    mfdConf = Math.round((ocrFields.confidence.manufactureDate || 0.9) * 100);
  } else if (geminiFields?.manufacturingDate) {
    mfdVal = geminiFields.manufacturingDate;
    mfdProv = 'GEMINI';
    mfdConf = Math.round((geminiFields.confidence?.manufacturingDate || 0.85) * 100);
  }

  // 8. Expiry Date (Label OCR / Gemini)
  let expVal = '';
  let expProv: FieldProvenance = 'MANUAL';
  let expConf = 0;

  if (ocrFields?.expiryDate) {
    expVal = ocrFields.expiryDate;
    expProv = 'OCR';
    expConf = Math.round((ocrFields.confidence.expiryDate || 0.92) * 100);
  } else if (geminiFields?.expiryDate) {
    expVal = geminiFields.expiryDate;
    expProv = 'GEMINI';
    expConf = Math.round((geminiFields.confidence?.expiryDate || 0.85) * 100);
  }

  // 9. Best Before & Expiry Calculation
  let bestBeforeVal = ocrFields?.bestBefore || geminiFields?.bestBefore || '';
  let bestBeforeMonths = ocrFields?.bestBeforeMonths ?? (geminiFields?.bestBeforeMonths || null);
  let isCalculatedExpiry = false;
  let calculatedExpiryNote: string | undefined;

  // If no printed expiry date, but MFD + Best Before Months are available -> Calculate
  if (!expVal && mfdVal && bestBeforeMonths) {
    const calc = calculateExpiryFromMfdAndMonths(mfdVal, bestBeforeMonths);
    if (calc) {
      expVal = calc.calculatedDate;
      expProv = 'AUTO-DETECTED';
      expConf = 85;
      isCalculatedExpiry = true;
      calculatedExpiryNote = calc.note;
      warnings.push(`Expiry date calculated as ${bestBeforeMonths} months from MFD.`);
    }
  }

  if (!expVal) {
    missingFields.push('expiryDate');
  }

  // 10. MRP / Price (Label OCR -> Gemini -> Database)
  let mrpVal = '';
  let mrpProv: FieldProvenance = 'MANUAL';
  let mrpConf = 0;

  if (ocrFields?.mrp != null) {
    mrpVal = String(ocrFields.mrp);
    mrpProv = 'OCR';
    mrpConf = Math.round((ocrFields.confidence.mrp || 0.9) * 100);
  } else if (geminiFields?.mrp) {
    mrpVal = String(geminiFields.mrp);
    mrpProv = 'GEMINI';
    mrpConf = Math.round((geminiFields.confidence?.mrp || 0.85) * 100);
  } else if (databaseProduct?.mrp != null) {
    mrpVal = String(databaseProduct.mrp);
    mrpProv = 'DATABASE';
    mrpConf = 90;
  }

  // 11. Selling Price
  const sellingPriceVal = databaseProduct?.sellingPrice
    ? String(databaseProduct.sellingPrice)
    : mrpVal;

  // 12. Ingredients & Description
  const ingredientsVal = databaseProduct?.ingredients || geminiFields?.notesOrAdditional || '';
  const descriptionVal = databaseProduct?.description || '';

  // Calculate overall confidence
  const confScores = [
    finalBarcode ? 100 : 0,
    productNameConf,
    brandConf,
    categoryConf,
    batchConf || 50,
    mfdConf || 50,
    expConf || 50,
    mrpConf || 50,
  ].filter((s) => s > 0);

  const overallConfidence =
    confScores.length > 0
      ? Math.round(confScores.reduce((a, b) => a + b, 0) / confScores.length)
      : 80;

  const result: MergedProductPipelineResult = {
    productName: { value: productNameVal, provenance: productNameProv, confidence: productNameConf },
    brand: { value: brandVal, provenance: brandProv, confidence: brandConf },
    category: { value: categoryVal, provenance: categoryProv, confidence: categoryConf },
    manufacturer: {
      value: databaseProduct?.manufacturer || brandVal,
      provenance: databaseProduct?.manufacturer ? 'DATABASE' : 'MANUAL',
      confidence: 80,
    },
    packageSize: { value: packageSizeVal, provenance: packageSizeProv, confidence: 90 },
    unit: { value: unitVal, provenance: packageSizeProv, confidence: 90 },
    barcode: { value: finalBarcode, provenance: barcodeProvenance, confidence: 100 },
    batchNumber: { value: batchVal, provenance: batchProv, confidence: batchConf },
    mrp: { value: mrpVal, provenance: mrpProv, confidence: mrpConf },
    sellingPrice: { value: sellingPriceVal, provenance: 'DATABASE', confidence: 90 },
    purchasePrice: { value: '', provenance: 'MANUAL', confidence: 0 },
    manufactureDate: { value: mfdVal, provenance: mfdProv, confidence: mfdConf },
    expiryDate: { value: expVal, provenance: expProv, confidence: expConf },
    bestBefore: { value: bestBeforeVal, provenance: 'OCR', confidence: 85 },
    bestBeforeMonths,
    isCalculatedExpiry,
    calculatedExpiryNote,
    ingredients: { value: ingredientsVal, provenance: 'DATABASE', confidence: 85 },
    description: { value: descriptionVal, provenance: 'DATABASE', confidence: 85 },
    overallConfidence,
    warnings: [...warnings, ...(geminiFields?.warnings || [])],
    missingFields,
    imageUrl: databaseProduct?.imageUrl,
  };

  pipelineLogger.log('mergeResults', result);
  return result;
}

/**
 * Converts MergedProductPipelineResult into SavedInventoryItem ready for storage.
 */
export function convertPipelineResultToInventoryItem(
  merged: MergedProductPipelineResult,
  stockQuantity = 1,
  rackLocation = 'Main Shelf',
  supplier = ''
): SavedInventoryItem {
  const now = new Date().toISOString();
  const cleanBarcode = merged.barcode.value.trim();

  return {
    id: `prod_${Date.now()}_${cleanBarcode.slice(-4) || Math.random().toString(36).substring(2, 6)}`,
    savedAt: now,
    updatedAt: now,
    productName: merged.productName.value || 'Scanned Product',
    brand: merged.brand.value || '',
    category: merged.category.value || 'General Merchandise',
    sku: cleanBarcode ? `SKU-${cleanBarcode.slice(-6)}` : `SKU-${Date.now().toString().slice(-6)}`,
    barcode: cleanBarcode,
    batchNumber: merged.batchNumber.value || '',
    manufacturingDate: merged.manufactureDate.value || '',
    expiryDate: merged.expiryDate.value || '',
    bestBefore: merged.bestBefore.value || '',
    bestBeforeMonths: merged.bestBeforeMonths,
    isCalculatedExpiry: merged.isCalculatedExpiry,
    quantity: merged.packageSize.value || '1',
    unit: merged.unit.value || 'units',
    mrp: merged.mrp.value || '',
    sellingPrice: merged.sellingPrice.value || merged.mrp.value || '',
    purchasePrice: merged.purchasePrice.value || '',
    stockQuantity: stockQuantity,
    minStockAlert: 5,
    supplier: supplier || merged.manufacturer.value || '',
    rackLocation: rackLocation,
    ingredients: merged.ingredients.value || '',
    notes: merged.description.value || `Processed by Barcode-to-Product pipeline (Confidence: ${merged.overallConfidence}%)`,
    warnings: merged.warnings,
    missingFields: merged.missingFields,
    status: 'in_stock',
    imageThumbnail: merged.imageUrl,
  };
}
