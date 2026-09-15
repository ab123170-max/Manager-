/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pipelineLogger } from './debugLogger';

export interface ExtractedLabelFields {
  manufactureDate: string;
  packedDate: string;
  expiryDate: string;
  bestBefore: string;
  bestBeforeMonths: number | null;
  batchNumber: string;
  mrp: string | number | null;
  confidence: {
    manufactureDate: number;
    expiryDate: number;
    batchNumber: number;
    mrp: number;
  };
  rawMatches: Record<string, string>;
  warnings: string[];
}

/**
 * Standardizes extracted date strings into YYYY-MM-DD or MM/YYYY.
 */
function standardizeDateString(raw: string): string {
  if (!raw) return '';
  const clean = raw.trim().replace(/[,\s]+/g, ' ');

  // Month words mapping
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    january: '01', february: '02', march: '03', april: '04', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
  };

  // Match "OCT 2026" or "15 OCT 2026"
  const wordMatch = clean.match(/(?:(\d{1,2})[\/\s\-\.])?([a-zA-Z]{3,9})[\/\s\-\.](\d{2,4})/i);
  if (wordMatch) {
    const day = wordMatch[1] ? wordMatch[1].padStart(2, '0') : '';
    const mStr = wordMatch[2].toLowerCase();
    const month = monthMap[mStr];
    let year = wordMatch[3];
    if (year.length === 2) year = `20${year}`;
    if (month) {
      return day ? `${year}-${month}-${day}` : `${month}/${year}`;
    }
  }

  // Match DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // Match MM/YYYY or MM-YYYY
  const myMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{2,4})$/);
  if (myMatch) {
    const month = myMatch[1].padStart(2, '0');
    let year = myMatch[2];
    if (year.length === 2) year = `20${year}`;
    return `${month}/${year}`;
  }

  // Match YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  return clean;
}

/**
 * Extracts printed label metadata (MFD, EXP, BATCH, MRP) from text lines.
 */
export function extractLabelFieldsFromText(textLines: string[]): ExtractedLabelFields {
  const fullText = textLines.join('\n');
  const result: ExtractedLabelFields = {
    manufactureDate: '',
    packedDate: '',
    expiryDate: '',
    bestBefore: '',
    bestBeforeMonths: null,
    batchNumber: '',
    mrp: null,
    confidence: {
      manufactureDate: 0,
      expiryDate: 0,
      batchNumber: 0,
      mrp: 0,
    },
    rawMatches: {},
    warnings: [],
  };

  // 1. Manufacturing Date Regex
  // Matches MFD, MFG, MF, MFR, DOM, DATE OF MANUFACTURE, MANUFACTURED
  const mfdRegex = /(?:MFD|MFG|MFR|MANF|DOM|MANUFACTURED|DATE\s*OF\s*MFG|MFG\s*DATE|MFD\s*DATE)[\s:\.\-]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4}|[0-9]{1,2}[\/\-\.][0-9]{2,4}|[a-zA-Z]{3,9}\s*[0-9]{2,4}|[0-9]{1,2}\s+[a-zA-Z]{3,9}\s+[0-9]{2,4})/i;
  const mfdMatch = fullText.match(mfdRegex);
  if (mfdMatch && mfdMatch[1]) {
    result.manufactureDate = standardizeDateString(mfdMatch[1]);
    result.confidence.manufactureDate = 0.92;
    result.rawMatches['manufactureDate'] = mfdMatch[0];
  }

  // 2. Packed Date Regex
  // Matches PKD, PKG, PACKED ON
  const pkdRegex = /(?:PKD|PKG|PACKED|PACKED\s*ON|PACK\s*DATE)[\s:\.\-]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4}|[0-9]{1,2}[\/\-\.][0-9]{2,4}|[a-zA-Z]{3,9}\s*[0-9]{2,4})/i;
  const pkdMatch = fullText.match(pkdRegex);
  if (pkdMatch && pkdMatch[1]) {
    result.packedDate = standardizeDateString(pkdMatch[1]);
    result.rawMatches['packedDate'] = pkdMatch[0];
  }

  // 3. Expiry Date Regex
  // Matches EXP, EXD, EXPD, EXPIRY, EXP DATE, USE BY, VALID UP TO
  const expRegex = /(?:EXP|EXD|EXPD|EXPIRY|EXP\s*DATE|EXPIRY\s*DATE|USE\s*BY|USE\s*BEFORE|VALID\s*(?:UP\s*TO|UNTIL))[\s:\.\-]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4}|[0-9]{1,2}[\/\-\.][0-9]{2,4}|[a-zA-Z]{3,9}\s*[0-9]{2,4}|[0-9]{1,2}\s+[a-zA-Z]{3,9}\s+[0-9]{2,4})/i;
  const expMatch = fullText.match(expRegex);
  if (expMatch && expMatch[1]) {
    result.expiryDate = standardizeDateString(expMatch[1]);
    result.confidence.expiryDate = 0.94;
    result.rawMatches['expiryDate'] = expMatch[0];
  }

  // 4. Best Before Regex (Duration or Date)
  const bbDurationRegex = /(?:BEST\s*BEFORE|USE\s*WITHIN|SHELF\s*LIFE)[\s:\.\-]*(\d+)\s*(?:MONTHS|MTHS|DAYS|YEARS)/i;
  const bbDurationMatch = fullText.match(bbDurationRegex);
  if (bbDurationMatch && bbDurationMatch[1]) {
    const num = parseInt(bbDurationMatch[1], 10);
    result.bestBeforeMonths = num;
    result.bestBefore = `${num} Months from MFD`;
    result.rawMatches['bestBefore'] = bbDurationMatch[0];
  } else {
    const bbDateRegex = /(?:BEST\s*BEFORE|BBE|BEST\s*BY)[\s:\.\-]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4}|[0-9]{1,2}[\/\-\.][0-9]{2,4}|[a-zA-Z]{3,9}\s*[0-9]{2,4})/i;
    const bbDateMatch = fullText.match(bbDateRegex);
    if (bbDateMatch && bbDateMatch[1]) {
      result.bestBefore = standardizeDateString(bbDateMatch[1]);
      result.rawMatches['bestBefore'] = bbDateMatch[0];
    }
  }

  // 5. Batch / Lot Number Regex
  // Matches BATCH NO, LOT NO, B.NO, LOT, B/N
  const batchRegex = /(?:BATCH\s*NO|LOT\s*NO|B\.?\s*NO|LOT|B\/N)[\s:\.\-#]*([A-Z0-9\-_]{3,16})/i;
  const batchMatch = fullText.match(batchRegex);
  if (batchMatch && batchMatch[1]) {
    // Exclude accidental barcode capture
    if (!/^\d{12,14}$/.test(batchMatch[1])) {
      result.batchNumber = batchMatch[1].trim();
      result.confidence.batchNumber = 0.90;
      result.rawMatches['batchNumber'] = batchMatch[0];
    }
  }

  // 6. MRP / Price Regex
  // Matches MRP, M.R.P, RS., $, ₹
  const mrpRegex = /(?:M\.?R\.?P\.?|MAX\s*RETAIL\s*PRICE|PRICE)[\s:\.\-]*([₹$€£]?\s*[0-9]+(?:\.[0-9]{2})?)/i;
  const mrpMatch = fullText.match(mrpRegex);
  if (mrpMatch && mrpMatch[1]) {
    const cleanPrice = mrpMatch[1].replace(/[^0-9.]/g, '');
    if (cleanPrice && !isNaN(parseFloat(cleanPrice))) {
      result.mrp = parseFloat(cleanPrice);
      result.confidence.mrp = 0.91;
      result.rawMatches['mrp'] = mrpMatch[0];
    }
  }

  pipelineLogger.log('ocrExtraction', result);
  return result;
}
