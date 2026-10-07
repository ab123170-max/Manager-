/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductScanResult } from '../../types';

export interface ConfidenceEvaluationResult {
  score: number; // 0 to 100 percentage
  status: 'accept' | 'verify' | 'retry';
  fieldScores: Record<string, number>;
  reasons: string[];
}

/**
 * Evaluates the extraction result and computes a non-fabricated confidence score.
 * Rules:
 * - 85% to 100% -> Accept immediately
 * - 65% to 84% -> Verification needed / conditional retry if key fields missing
 * - Below 65% -> Automatic retry
 */
export class ConfidenceEvaluator {
  public static evaluate(result: Partial<ProductScanResult> | null | undefined): ConfidenceEvaluationResult {
    if (!result) {
      return {
        score: 0,
        status: 'retry',
        fieldScores: {},
        reasons: ['Extraction result is empty or null.'],
      };
    }

    const fieldScores: Record<string, number> = {};
    const reasons: string[] = [];

    // 1. Product Name Evaluation (Weight: 35%)
    let nameScore = 0;
    const name = (result.productName || '').trim();
    if (name.length > 2 && !/^unknown product$/i.test(name) && !/^\d+$/.test(name)) {
      if (name.length >= 4) {
        nameScore = 100;
      } else {
        nameScore = 70;
      }
    } else if (name.length > 0) {
      nameScore = 40;
      reasons.push('Product name is very short or generic.');
    } else {
      reasons.push('Product name is missing.');
    }
    fieldScores.productName = nameScore;

    // 2. Price Evaluation (Weight: 20%)
    let priceScore = 0;
    if (typeof result.price === 'number' && !isNaN(result.price) && result.price > 0) {
      priceScore = 100;
    } else if (result.price === 0) {
      priceScore = 50;
      reasons.push('Price is zero.');
    } else {
      priceScore = 0;
      reasons.push('Price is missing.');
    }
    fieldScores.price = priceScore;

    // 3. Dates Evaluation (MFD & EXP) (Weight: 25%)
    let dateScore = 0;
    const hasMfd = Boolean(result.manufactureDate && result.manufactureDate.trim().length >= 4);
    const hasExp = Boolean(result.expiryDate && result.expiryDate.trim().length >= 4);
    const hasBb = typeof result.bestBeforeMonths === 'number' && result.bestBeforeMonths > 0;

    if (hasExp && (hasMfd || result.isCalculatedExpiry)) {
      dateScore = 100;
    } else if (hasExp || hasMfd || hasBb) {
      dateScore = 70;
      reasons.push('Partial date information found.');
    } else {
      dateScore = 20;
      reasons.push('Manufacturing and expiry dates are missing.');
    }
    fieldScores.dates = dateScore;

    // 4. Barcode / Identifiers (Weight: 10%)
    let barcodeScore = 0;
    const barcode = (result.barcode || '').trim();
    if (barcode && /^[A-Z0-9\-_]{6,18}$/i.test(barcode)) {
      barcodeScore = 100;
    } else if (barcode) {
      barcodeScore = 50;
    } else {
      barcodeScore = 30; // missing barcode is common for local products
    }
    fieldScores.barcode = barcodeScore;

    // 5. Quantity & Unit (Weight: 10%)
    let unitScore = 0;
    if (result.unit && result.unit !== 'pcs') {
      unitScore = 100;
    } else {
      unitScore = 80;
    }
    fieldScores.unit = unitScore;

    // Weighted Overall Score Calculation
    // Total weight = 0.35 + 0.20 + 0.25 + 0.10 + 0.10 = 1.0
    const rawScore =
      nameScore * 0.35 +
      priceScore * 0.20 +
      dateScore * 0.25 +
      barcodeScore * 0.10 +
      unitScore * 0.10;

    // If confidence provided by backend AI Vision supervisor, blend it naturally (50% rule, no artificial inflation)
    let finalScore = rawScore;
    if (result.confidence && typeof result.confidence.overall === 'number') {
      const aiScore = result.confidence.overall > 1 ? result.confidence.overall : result.confidence.overall * 100;
      // Cap blend so missing critical fields like product name don't get inflated by high AI overall score
      if (nameScore === 0) {
        finalScore = Math.min(rawScore, 50);
      } else {
        finalScore = Math.round(rawScore * 0.6 + aiScore * 0.4);
      }
    } else {
      finalScore = Math.round(rawScore);
    }

    let status: 'accept' | 'verify' | 'retry' = 'retry';
    if (finalScore >= 85 && nameScore >= 70) {
      status = 'accept';
    } else if (finalScore >= 65 && nameScore >= 40) {
      status = 'verify';
    } else {
      status = 'retry';
    }

    return {
      score: Math.min(100, Math.max(0, finalScore)),
      status,
      fieldScores,
      reasons,
    };
  }
}
