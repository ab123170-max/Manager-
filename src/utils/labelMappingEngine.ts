/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { parseProductDate, ParsedDateResult, DatePrecision } from './dateParser';

/**
 * ============================================================================
 * LABEL MAPPING & NORMALIZATION ENGINE
 * ============================================================================
 * Maps variations and abbreviations of product label fields into standard keys:
 * - manufacture_date (MFD, MFG, MFG., MANUFACTURED, MANUFACTURING DATE, DOM)
 * - expiry_date (EXP, EXD, EXPIRY, EXPIRY DATE, USE BY, VALID UNTIL)
 * - best_before (BB, BEST BEFORE, BEST BY, BBE, BBD)
 * - batch_number (BATCH, BATCH NO, LOT, LOT NO, B.NO, LOT#)
 * - mrp (MRP, MAX RETAIL PRICE, M.R.P., MAXIMUM RETAIL PRICE)
 * - net_weight / quantity (NET WT, WEIGHT, NET QTY, QTY)
 * - product_name / brand
 */

export interface NormalizedLabelResult {
  product_name: string;
  brand: string;
  manufacture_date: string;
  manufacture_date_precision: DatePrecision;
  expiry_date: string;
  expiry_date_precision: DatePrecision;
  best_before: string;
  best_before_months: number | null;
  batch_number: string;
  mrp: string;
  net_weight: string;
  quantity: string;
  category?: string;
  confidence: {
    productName: number;
    brand: number;
    manufactureDate: number;
    expiryDate: number;
    batchNumber: number;
    mrp: number;
    netWeight: number;
    overall: number;
  };
  rawMatches: Record<string, string>;
  warnings: string[];
}

// Regex collections for flexible variations
const MFD_PATTERNS = [
  /(?:MANUFACTURING\s*DATE|DATE\s*OF\s*MANUFACTURE|MANUFACTURED\s*DATE|MANUFACTURED|DATE\s*OF\s*MFG|MFG\s*DATE|MFD\s*DATE|MF\s*DATE|MANF\s*DATE|DATE\s*MFG|MADE\s*ON|DATE\s*MADE|D\.?O\.?M\.?|MFD\.?|MFG\.?|MFR\.?|MANF\.?|MAN\.?|MF\.?|MFO\.?|M\.F\.D\.?|M\.F\.G\.?)[\s:\.\-=/]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4}|[0-9]{1,2}[\/\-\.][0-9]{2,4}|[a-zA-Z]{3,9}[\s\/\-\.]+[0-9]{2,4}|[0-9]{1,2}[\s\/\-\.]+[a-zA-Z]{3,9}[\s\/\-\.]+[0-9]{2,4})/i,
];

const EXP_PATTERNS = [
  /(?:EXPIRATION\s*DATE|EXPIRY\s*DATE|EXP\s*DATE|EXPIRATION|EXPIRY|USE\s*BY|USE\s*BEFORE|VALID\s*UNTIL|VALID\s*UP\s*TO|BEST\s*BEFORE\s*END|EXPD\.?|EXD\.?|EXP\.?|EXR\.?)[\s:\.\-=/]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4}|[0-9]{1,2}[\/\-\.][0-9]{2,4}|[a-zA-Z]{3,9}[\s\/\-\.]+[0-9]{2,4}|[0-9]{1,2}[\s\/\-\.]+[a-zA-Z]{3,9}[\s\/\-\.]+[0-9]{2,4})/i,
];

const BEST_BEFORE_DURATION_PATTERN =
  /(?:BEST\s*BEFORE|USE\s*WITHIN|SHELF\s*LIFE|VALID\s*FOR|EXPIRY\s*AFTER)[\s:\.\-=/]*(\d{1,2})\s*(?:MONTHS?|MTHS?|MOS?|YEARS?|YRS?|DAYS?)/i;

const BEST_BEFORE_DATE_PATTERNS = [
  /(?:BEST\s*BEFORE\s*DATE|BEST\s*BEFORE|BEST\s*BY\s*DATE|BEST\s*BY|BBE\.?|BBD\.?|B8E\.?|B\.?B\.?E\.?|BB\.?)[\s:\.\-=/]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4}|[0-9]{1,2}[\/\-\.][0-9]{2,4}|[a-zA-Z]{3,9}[\s\/\-\.]+[0-9]{2,4}|[0-9]{1,2}[\s\/\-\.]+[a-zA-Z]{3,9}[\s\/\-\.]+[0-9]{2,4})/i,
];

const BATCH_PATTERNS = [
  /(?:BATCH\s*NO\.?|BATCH\s*NUMBER|LOT\s*NO\.?|LOT\s*NUMBER|B\.?\s*NO\.?|B\/N|LOT\s*#|LOT)[\s:\.\-=/]*([A-Z0-9\-_]{2,18})/i,
];

const MRP_PATTERNS = [
  /(?:MAX\s*RETAIL\s*PRICE|MAXIMUM\s*RETAIL\s*PRICE|MAX\.\s*RETAIL\s*PRICE|M\.?R\.?P\.?|R\.?P\.?|PRICE|RETAIL\s*PRICE)[\s:\.\-=/]*(?:RS\.?|INR|\$|₹|USD|EUR|£)?[\s]*([0-9]+(?:[\.,][0-9]{1,2})?)/i,
];

const WEIGHT_PATTERNS = [
  /(?:NET\s*WT\.?|NET\s*WEIGHT|NET\s*QTY\.?|NET\s*QUANTITY|WEIGHT|NET\s*VOL\.?|VOLUME)[\s:\.\-=/]*([0-9]+(?:[\.,][0-9]+)?\s*(?:g|kg|ml|l|ltr|oz|lb|fl\.?\s*oz|units|pcs|tablets|capsules|gm))/i,
  /([0-9]+(?:[\.,][0-9]+)?\s*(?:g|kg|ml|l|ltr|oz|lb|fl\.?\s*oz)\b)/i,
];

/**
 * Normalizes label text lines and maps to standardized fields with date parsing.
 */
export function mapLabelOcrText(textLines: string[]): NormalizedLabelResult {
  const fullText = textLines.join('\n');
  const rawMatches: Record<string, string> = {};
  const warnings: string[] = [];

  let manufacture_date = '';
  let manufacture_date_precision: DatePrecision = 'unknown';
  let expiry_date = '';
  let expiry_date_precision: DatePrecision = 'unknown';
  let best_before = '';
  let best_before_months: number | null = null;
  let batch_number = '';
  let mrp = '';
  let net_weight = '';
  let quantity = '';
  let product_name = '';
  let brand = '';

  const confScores = {
    productName: 0,
    brand: 0,
    manufactureDate: 0,
    expiryDate: 0,
    batchNumber: 0,
    mrp: 0,
    netWeight: 0,
    overall: 0,
  };

  // 1. MFD extraction
  for (const pattern of MFD_PATTERNS) {
    const match = fullText.match(pattern);
    if (match && match[1]) {
      const parsed = parseProductDate(match[1]);
      manufacture_date = parsed.formatted;
      manufacture_date_precision = parsed.precision;
      confScores.manufactureDate = parsed.isValid ? 0.95 : 0.7;
      rawMatches['manufacture_date'] = match[0];
      break;
    }
  }

  // 2. EXP extraction
  for (const pattern of EXP_PATTERNS) {
    const match = fullText.match(pattern);
    if (match && match[1]) {
      const parsed = parseProductDate(match[1]);
      expiry_date = parsed.formatted;
      expiry_date_precision = parsed.precision;
      confScores.expiryDate = parsed.isValid ? 0.95 : 0.7;
      rawMatches['expiry_date'] = match[0];
      break;
    }
  }

  // 3. Best Before extraction (duration vs date)
  const durationMatch = fullText.match(BEST_BEFORE_DURATION_PATTERN);
  if (durationMatch && durationMatch[1]) {
    const num = parseInt(durationMatch[1], 10);
    if (!isNaN(num)) {
      best_before_months = num;
      best_before = `${num} Months from MFD`;
      rawMatches['best_before'] = durationMatch[0];
    }
  } else {
    for (const pattern of BEST_BEFORE_DATE_PATTERNS) {
      const match = fullText.match(pattern);
      if (match && match[1]) {
        const parsed = parseProductDate(match[1]);
        best_before = parsed.formatted;
        rawMatches['best_before'] = match[0];
        break;
      }
    }
  }

  // 4. Batch extraction
  for (const pattern of BATCH_PATTERNS) {
    const match = fullText.match(pattern);
    if (match && match[1]) {
      const val = match[1].trim();
      // Exclude pure 12-14 digit barcodes accidentally matched
      if (!/^\d{12,14}$/.test(val)) {
        batch_number = val;
        confScores.batchNumber = 0.90;
        rawMatches['batch_number'] = match[0];
        break;
      }
    }
  }

  // 5. MRP extraction
  for (const pattern of MRP_PATTERNS) {
    const match = fullText.match(pattern);
    if (match && match[1]) {
      const val = match[1].replace(',', '.').trim();
      mrp = val;
      confScores.mrp = 0.92;
      rawMatches['mrp'] = match[0];
      break;
    }
  }

  // 6. Weight / Quantity extraction
  for (const pattern of WEIGHT_PATTERNS) {
    const match = fullText.match(pattern);
    if (match && match[1]) {
      net_weight = match[1].trim();
      quantity = net_weight.replace(/[^0-9.]/g, '') || '1';
      confScores.netWeight = 0.88;
      rawMatches['net_weight'] = match[0];
      break;
    }
  }

  // 7. Extract Potential Product Name & Brand from prominent top lines
  const cleanLines = textLines
    .map((l) => l.trim())
    .filter((l) => {
      if (l.length < 3) return false;
      // Filter out lines that are purely MFD/EXP/MRP/Batch
      if (/(?:MFD|MFG|EXP|BATCH|LOT|MRP|USE\s*BY|PRICE|NET\s*WT)/i.test(l)) return false;
      if (/^\d+$/.test(l)) return false; // purely numbers
      return true;
    });

  if (cleanLines.length > 0) {
    const candidateName = cleanLines[0];
    if (candidateName.length > 3 && candidateName.length < 60) {
      product_name = candidateName;
      confScores.productName = 0.75;
      if (cleanLines.length > 1) {
        brand = cleanLines[1];
        confScores.brand = 0.65;
      }
    }
  }

  // Compute Overall Confidence Score
  const detectedCount = [
    manufacture_date,
    expiry_date,
    best_before,
    batch_number,
    mrp,
    net_weight,
    product_name,
  ].filter(Boolean).length;

  confScores.overall = detectedCount >= 3 ? 0.90 : detectedCount >= 1 ? 0.75 : 0.40;

  if (!expiry_date && !best_before) {
    warnings.push('No explicit expiry or best-before date detected on label.');
  }

  return {
    product_name,
    brand,
    manufacture_date,
    manufacture_date_precision,
    expiry_date,
    expiry_date_precision,
    best_before,
    best_before_months,
    batch_number,
    mrp,
    net_weight,
    quantity: quantity || '1',
    confidence: confScores,
    rawMatches,
    warnings,
  };
}
