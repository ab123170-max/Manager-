/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductScanResult } from '../../types';
import { parseProductDate, validateProductDates } from '../../utils/dateService';
import { ConfidenceEvaluator } from './ConfidenceEvaluator';

export interface ValidationReport {
  isValid: boolean;
  score: number;
  errors: string[];
  warnings: string[];
  fieldValidity: {
    productName: boolean;
    price: boolean;
    manufactureDate: boolean;
    expiryDate: boolean;
    datesChronology: boolean;
    barcode: boolean;
  };
}

export class ExtractionValidator {
  /**
   * Validates an extracted product scan result against strict domain rules.
   */
  public static validate(result: Partial<ProductScanResult> | null | undefined): ValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];

    const fieldValidity = {
      productName: false,
      price: false,
      manufactureDate: false,
      expiryDate: false,
      datesChronology: true,
      barcode: false,
    };

    if (!result) {
      return {
        isValid: false,
        score: 0,
        errors: ['No extraction result provided to validator.'],
        warnings: [],
        fieldValidity,
      };
    }

    // 1. Meaningful Product Name Check
    const name = (result.productName || '').trim();
    if (!name) {
      errors.push('Product name is empty.');
    } else if (name.length < 2) {
      errors.push('Product name is too short (less than 2 characters).');
    } else if (/^unknown product$/i.test(name) || /^product item$/i.test(name)) {
      warnings.push('Product name is generic default placeholder.');
    } else if (/^[0-9\W_]+$/.test(name)) {
      errors.push('Product name contains only numbers or symbols.');
    } else {
      fieldValidity.productName = true;
    }

    // 2. Price Validation
    if (typeof result.price === 'number' && !isNaN(result.price)) {
      if (result.price < 0) {
        errors.push('Price cannot be negative.');
      } else if (result.price > 1000000) {
        warnings.push('Price is unusually high (> 1,000,000).');
        fieldValidity.price = true;
      } else {
        fieldValidity.price = true;
      }
    } else if (result.price === null || result.price === undefined) {
      warnings.push('Price was not detected.');
    }

    // 3. Manufacture Date (MFD) Validation
    const mfdStr = (result.manufactureDate || '').trim();
    let mfdParsed = null;
    if (mfdStr) {
      mfdParsed = parseProductDate(mfdStr);
      if (mfdParsed.isValid) {
        fieldValidity.manufactureDate = true;
      } else {
        warnings.push(`Manufacture date '${mfdStr}' could not be parsed into a valid date.`);
      }
    }

    // 4. Expiry Date (EXD) Validation
    const expStr = (result.expiryDate || '').trim();
    let expParsed = null;
    if (expStr) {
      expParsed = parseProductDate(expStr);
      if (expParsed.isValid) {
        fieldValidity.expiryDate = true;
      } else {
        warnings.push(`Expiry date '${expStr}' could not be parsed into a valid date.`);
      }
    }

    // 5. Strict Chronology Check: EXD < MFD -> Invalid Result!
    if (mfdStr && expStr) {
      const dateVal = validateProductDates(mfdStr, expStr);
      if (!dateVal.isValid) {
        for (const w of dateVal.warnings) {
          if (w.toLowerCase().includes('earlier than manufacture')) {
            errors.push('Expiry date is earlier than manufacture date (EXD < MFD).');
            fieldValidity.datesChronology = false;
          } else {
            warnings.push(w);
          }
        }
      }
    }

    // 6. Barcode / QR Format Check
    const barcode = (result.barcode || '').trim();
    if (barcode) {
      if (/^[A-Z0-9\-_]{5,24}$/i.test(barcode)) {
        fieldValidity.barcode = true;
      } else {
        warnings.push('Barcode format appears irregular.');
      }
    }

    // 7. Compute overall evaluation score
    const evalResult = ConfidenceEvaluator.evaluate(result);

    const isValid = errors.length === 0 && fieldValidity.productName && fieldValidity.datesChronology;

    return {
      isValid,
      score: evalResult.score,
      errors,
      warnings,
      fieldValidity,
    };
  }

  /**
   * Compares multiple extraction candidate results and selects the best candidate.
   */
  public static selectBestCandidate(
    candidates: Array<Partial<ProductScanResult> | null | undefined>
  ): Partial<ProductScanResult> | null {
    const validCandidates = candidates.filter(Boolean) as Array<Partial<ProductScanResult>>;
    if (validCandidates.length === 0) return null;
    if (validCandidates.length === 1) return validCandidates[0];

    let bestCandidate: Partial<ProductScanResult> | null = null;
    let highestScore = -1;

    for (const candidate of validCandidates) {
      const report = this.validate(candidate);
      let candidateScore = report.score;

      // Penalize invalid candidates
      if (!report.isValid) {
        candidateScore -= 30;
      }

      // Bonus for candidates with price & dates
      if (report.fieldValidity.price) candidateScore += 10;
      if (report.fieldValidity.manufactureDate) candidateScore += 10;
      if (report.fieldValidity.expiryDate) candidateScore += 10;

      if (candidateScore > highestScore) {
        highestScore = candidateScore;
        bestCandidate = candidate;
      }
    }

    return bestCandidate || validCandidates[0];
  }
}
