/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BarcodeLookupProduct } from '../services/barcodeLookup';
import { NormalizedLabelResult } from './labelMappingEngine';
import { DatePrecision } from './dateParser';

/**
 * ============================================================================
 * PRODUCT DATA MERGER & CONFLICT RESOLUTION ENGINE
 * ============================================================================
 * Priority:
 * Barcode Database -> OCR -> AI Normalization -> User Confirmation
 *
 * Checks for conflicts between Barcode Database results and Label OCR.
 * E.g. If Database MRP = 115 and OCR MRP = 120, creates an explicit conflict
 * allowing the user to select [Use 115] or [Use 120].
 */

export interface ScannedProductMapping {
  barcode: string;
  barcodeFormat: string;
  productName: string;
  brand: string;
  category: string;
  manufactureDate: string;
  expiryDate: string;
  bestBefore: string;
  batchNumber: string;
  mrp: string;
  netWeight: string;
  quantity: string;
  rawOcrText: string;
  confidence: Record<string, number>;
  datePrecision?: {
    manufactureDate?: DatePrecision;
    expiryDate?: DatePrecision;
  };
  imageUrl?: string;
  description?: string;
}

export interface ValueConflict {
  key: keyof ScannedProductMapping;
  label: string;
  databaseValue: string;
  ocrValue: string;
  selectedValue: string;
}

export interface MergedRecognitionResult {
  product: ScannedProductMapping;
  conflicts: ValueConflict[];
  hasConflicts: boolean;
  databaseProduct: BarcodeLookupProduct | null;
  ocrResult: NormalizedLabelResult | null;
}

/**
 * Normalizes price values for accurate comparison (e.g. "$120.00", "120", "120.0" -> "120")
 */
function normalizePriceForComparison(val: string | number | undefined | null): string {
  if (!val) return '';
  const str = String(val).replace(/[^0-9.]/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? '' : num.toFixed(2).replace(/\.00$/, '');
}

/**
 * Merges Barcode Database results and OCR results with strict priority & conflict detection.
 */
export function mergeProductRecognition(
  barcode: string,
  barcodeFormat: string,
  dbProduct: BarcodeLookupProduct | null,
  ocrResult: NormalizedLabelResult | null,
  rawOcrText = ''
): MergedRecognitionResult {
  const conflicts: ValueConflict[] = [];

  // 1. Barcode is strictly preserved from the decoder
  const finalBarcode = barcode.trim();
  const finalFormat = barcodeFormat || 'EAN-13';

  // 2. Product Name
  let productName = dbProduct?.product_name || dbProduct?.productName || '';
  if (!productName && ocrResult?.product_name) {
    productName = ocrResult.product_name;
  } else if (
    productName &&
    ocrResult?.product_name &&
    productName.toLowerCase() !== ocrResult.product_name.toLowerCase() &&
    ocrResult.product_name.length > 4
  ) {
    // Conflict detected
    conflicts.push({
      key: 'productName',
      label: 'Product Name',
      databaseValue: productName,
      ocrValue: ocrResult.product_name,
      selectedValue: productName, // Default to DB
    });
  }

  // 3. Brand
  let brand = dbProduct?.brand || '';
  if (!brand && ocrResult?.brand) {
    brand = ocrResult.brand;
  } else if (
    brand &&
    ocrResult?.brand &&
    brand.toLowerCase() !== ocrResult.brand.toLowerCase() &&
    ocrResult.brand.length > 2
  ) {
    conflicts.push({
      key: 'brand',
      label: 'Brand',
      databaseValue: brand,
      ocrValue: ocrResult.brand,
      selectedValue: brand, // Default to DB
    });
  }

  // 4. MRP / Price
  const dbMrp = dbProduct?.mrp ? String(dbProduct.mrp) : '';
  const ocrMrp = ocrResult?.mrp ? String(ocrResult.mrp) : '';
  let mrp = dbMrp || ocrMrp;

  if (dbMrp && ocrMrp) {
    const normDb = normalizePriceForComparison(dbMrp);
    const normOcr = normalizePriceForComparison(ocrMrp);
    if (normDb && normOcr && normDb !== normOcr) {
      conflicts.push({
        key: 'mrp',
        label: 'MRP (Price)',
        databaseValue: dbMrp,
        ocrValue: ocrMrp,
        selectedValue: ocrMrp, // Label OCR often has actual printed sticker price
      });
      mrp = ocrMrp;
    }
  }

  // 5. Dates & Batch (Prioritize physical printed label OCR as databases rarely hold lot-specific dates)
  const manufactureDate =
    ocrResult?.manufacture_date || dbProduct?.mfd || '';
  const expiryDate =
    ocrResult?.expiry_date || dbProduct?.exp || '';
  const bestBefore =
    ocrResult?.best_before || '';
  const batchNumber =
    ocrResult?.batch_number || '';

  // 6. Weight & Quantity
  const dbWeight = dbProduct?.package_size
    ? `${dbProduct.package_size} ${dbProduct.unit || ''}`.trim()
    : '';
  const ocrWeight = ocrResult?.net_weight || '';
  let netWeight = dbWeight || ocrWeight;

  if (dbWeight && ocrWeight && dbWeight.toLowerCase() !== ocrWeight.toLowerCase()) {
    conflicts.push({
      key: 'netWeight',
      label: 'Net Weight',
      databaseValue: dbWeight,
      ocrValue: ocrWeight,
      selectedValue: dbWeight,
    });
  }

  const quantity = ocrResult?.quantity || dbProduct?.package_size || '1';
  const category = dbProduct?.category || ocrResult?.category || 'General Merchandise';

  // 7. Calculate Field Confidence
  const confidence: Record<string, number> = {
    barcode: 100,
    productName: dbProduct ? 95 : ocrResult?.confidence.productName ? Math.round(ocrResult.confidence.productName * 100) : 70,
    brand: dbProduct ? 95 : ocrResult?.confidence.brand ? Math.round(ocrResult.confidence.brand * 100) : 60,
    mrp: ocrResult?.confidence.mrp ? Math.round(ocrResult.confidence.mrp * 100) : dbProduct?.mrp ? 90 : 50,
    manufactureDate: ocrResult?.confidence.manufactureDate ? Math.round(ocrResult.confidence.manufactureDate * 100) : 0,
    expiryDate: ocrResult?.confidence.expiryDate ? Math.round(ocrResult.confidence.expiryDate * 100) : 0,
    batchNumber: ocrResult?.confidence.batchNumber ? Math.round(ocrResult.confidence.batchNumber * 100) : 0,
    overall: dbProduct && ocrResult ? 94 : dbProduct ? 88 : ocrResult ? 78 : 50,
  };

  const product: ScannedProductMapping = {
    barcode: finalBarcode,
    barcodeFormat: finalFormat,
    productName: productName || 'Unknown Product',
    brand: brand || 'Generic',
    category,
    manufactureDate,
    expiryDate,
    bestBefore,
    batchNumber,
    mrp,
    netWeight,
    quantity,
    rawOcrText,
    confidence,
    datePrecision: {
      manufactureDate: ocrResult?.manufacture_date_precision,
      expiryDate: ocrResult?.expiry_date_precision,
    },
    imageUrl: dbProduct?.image_url || dbProduct?.imageUrl,
    description: dbProduct?.description,
  };

  return {
    product,
    conflicts,
    hasConflicts: conflicts.length > 0,
    databaseProduct: dbProduct,
    ocrResult,
  };
}
