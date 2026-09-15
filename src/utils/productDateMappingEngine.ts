/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================================
 * PRODUCT LABEL DATE MAPPING ENGINE
 * ============================================================================
 * Strictly examines OCR / text tokens to determine what each date label means,
 * mapping it to the exact standardized fields:
 * - "manufacture_date"
 * - "expiry_date"
 * - "best_before"
 * - "packed_date"
 * - "unknown_date"
 *
 * CRITICAL DIRECTIVE:
 * - NEVER fabricate, guess, extrapolate, or invent missing dates.
 * - NEVER modify the extracted characters/digits of a date merely to make it look standard.
 * - MFD != EXP != PKD != BEST_BEFORE
 * - PKD must NOT be converted to manufacture_date.
 * - If a duration (e.g., "BEST BEFORE 24 MONTHS FROM MFD", "USE WITHIN 6 MONTHS") is found,
 *   extract the numeric duration as best_before_months and/or descriptive text without inventing an expiry date.
 * - If the label is uncertain, incomplete, or corrupted, set needs_review = true.
 */

export interface DateMappingResult {
  manufacture_date: string;
  expiry_date: string;
  best_before: string;
  packed_date: string;
  best_before_months: number | null;
  detected_labels: string[];
  confidence: number;
  needs_review: boolean;
}

// Normalized Label Definitions & Regexes
const MFD_LABEL_REGEX =
  /(?:\b(?:DATE\s+OF\s+MANUFACTURE|MANUFACTURED\s+DATE|MANUFACTURED|MFG\s+DATE|MFD\s+DATE|MF\s+DATE|MANF\s+DATE|DATE\s+MFG|MADE\s+ON|DATE\s+MADE|D\.O\.M|DOM|MFD|MFG|MFR|MANF|MAN|MF|MFO|M\.F\.D|M\.F\.G)\b)/i;

const PKD_LABEL_REGEX =
  /(?:\b(?:PACKAGING\s+DATE|PACKED\s+DATE|PACKED\s+ON|PACK\s+DATE|DATE\s+PACKED|PACKED|P\.K\.D|PKD|PKG|PKO)\b)/i;

const EXP_LABEL_REGEX =
  /(?:\b(?:EXPIRATION\s+DATE|EXPIRY\s+DATE|EXP\s+DATE|EXPIRATION|EXPIRY|USE\s+BY|USE\s+BEFORE|VALID\s+UNTIL|VALID\s+UP\s+TO|BEST\s+BEFORE\s+END\s+DATE|BEST\s+BEFORE\s+END|EXPD|EXD|EXP|EXR)\b)/i;

const BEST_BEFORE_LABEL_REGEX =
  /(?:\b(?:BEST\s+BEFORE\s+DATE|BEST\s+BEFORE|BEST\s+BY\s+DATE|BEST\s+BY|BBE|BBD|B8E|B\.B\.E|BB)\b)/i;

const DURATION_REGEX =
  /(?:(?:BEST\s+BEFORE|USE\s+WITHIN|SHELF\s+LIFE|VALID\s+FOR|EXPIRY\s+AFTER)[\s:]*(\d{1,2})\s*(?:MONTHS?|MTHS?|MOS?|YEARS?|YRS?))/i;

// Standard Date Token Regex: YYYY-MM-DD, DD/MM/YYYY, MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, Month YYYY, etc.
const DATE_TOKEN_REGEX =
  /(?:(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2})|(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})|(?:\d{1,2}[-/.]\d{2,4})|(?:(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[a-z]*[\s,.-]+\d{2,4})|(?:\d{1,2}[\s,.-]+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[a-z]*[\s,.-]+\d{2,4}))/i;

/**
 * Strict Rule-Based Label Mapping Engine for OCR & raw text lines.
 */
export function mapProductDateLabels(rawTextOrLines: string | string[]): DateMappingResult {
  const lines: string[] = Array.isArray(rawTextOrLines)
    ? rawTextOrLines
    : rawTextOrLines.split(/[\r\n]+/);

  const result: DateMappingResult = {
    manufacture_date: '',
    expiry_date: '',
    best_before: '',
    packed_date: '',
    best_before_months: null,
    detected_labels: [],
    confidence: 1.0,
    needs_review: false,
  };

  const detectedLabelsSet = new Set<string>();
  let hasLowConfidenceOrCorrupted = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.length < 2) continue;

    // 1. Check Duration Phrases (e.g., "BEST BEFORE 12 MONTHS FROM MFD", "SHELF LIFE 24 MONTHS")
    const durationMatch = line.match(DURATION_REGEX);
    if (durationMatch) {
      const months = parseInt(durationMatch[1], 10);
      if (!isNaN(months)) {
        result.best_before_months = months;
        detectedLabelsSet.add('BEST_BEFORE_DURATION');
        if (!result.best_before) {
          result.best_before = `${months} months from manufacture`;
        }
      }
    }

    // 2. Tokenize or find key label:date pairs on this line
    // Pattern: [LABEL] [separators: : - . = ] [DATE]
    // A single line might have "MFD: 08/2025  EXP: 08/2027"
    const segments = line.split(/(?=[A-Z]{2,}\b)/g); // split before uppercase label headers if adjacent

    const partsToExamine = segments.length > 1 ? segments : [line];

    for (const part of partsToExamine) {
      const cleanPart = part.trim();
      if (!cleanPart) continue;

      // Extract date token in this part if present
      const dateMatch = cleanPart.match(DATE_TOKEN_REGEX);
      const extractedDate = dateMatch ? dateMatch[0].trim() : '';

      // Check MFD / MFG
      if (MFD_LABEL_REGEX.test(cleanPart)) {
        detectedLabelsSet.add('MFD');
        if (extractedDate && !result.manufacture_date) {
          result.manufacture_date = extractedDate;
        } else if (!extractedDate && !result.manufacture_date) {
          // Label present without clear date on same token -> needs review
          hasLowConfidenceOrCorrupted = true;
        }
      }

      // Check PKD / PKG (Strict: NEVER convert to manufacture_date)
      if (PKD_LABEL_REGEX.test(cleanPart)) {
        detectedLabelsSet.add('PKD');
        if (extractedDate && !result.packed_date) {
          result.packed_date = extractedDate;
        } else if (!extractedDate && !result.packed_date) {
          hasLowConfidenceOrCorrupted = true;
        }
      }

      // Check EXP / USE BY
      if (EXP_LABEL_REGEX.test(cleanPart)) {
        detectedLabelsSet.add('EXP');
        if (extractedDate && !result.expiry_date) {
          result.expiry_date = extractedDate;
        } else if (!extractedDate && !result.expiry_date) {
          hasLowConfidenceOrCorrupted = true;
        }
      }

      // Check BEST BEFORE / BB (Calendar date vs Duration)
      if (BEST_BEFORE_LABEL_REGEX.test(cleanPart)) {
        detectedLabelsSet.add('BEST_BEFORE');
        if (extractedDate && !result.best_before) {
          result.best_before = extractedDate;
        }
      }
    }
  }

  result.detected_labels = Array.from(detectedLabelsSet);

  // Confidence Calculation
  let confidence = 0.95;
  if (result.detected_labels.length === 0) {
    confidence = 0.5;
    result.needs_review = true;
  } else if (hasLowConfidenceOrCorrupted) {
    confidence = 0.75;
    result.needs_review = true;
  } else if (!result.manufacture_date && !result.expiry_date && !result.packed_date && !result.best_before) {
    confidence = 0.65;
    result.needs_review = true;
  } else {
    confidence = 0.98;
    result.needs_review = false;
  }

  result.confidence = Number(confidence.toFixed(2));
  return result;
}
