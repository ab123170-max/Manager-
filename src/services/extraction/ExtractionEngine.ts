/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductScanResult } from '../../types';
import { extractProduct5FieldsFromImages, ExtractionRequestOptions } from '../geminiService';
import { runProductOcr } from '../../utils/tesseractOcrEngine';
import { preprocessMultipleImages } from '../../utils/imagePreprocessing';

export interface ExtractionEngineModeOptions extends ExtractionRequestOptions {
  strictMode?: boolean; // Attempt 5: stronger prompt, zero hallucination
  enhancedMode?: boolean; // Attempt 2: image enhancement
  recropMode?: boolean; // Attempt 3: smart recrop
  fullFrameMode?: boolean; // Attempt 4: full frame
}

export class ExtractionEngine {
  /**
   * Runs single extraction run using current OCR + Gemini Vision pipeline.
   */
  public static async execute(
    images: string[],
    options?: ExtractionEngineModeOptions
  ): Promise<ProductScanResult> {
    if (!images || images.length === 0) {
      throw new Error('No images provided for extraction engine execution.');
    }

    // Step 1: Run client-side pre-processing & OCR cues extraction
    let localCues = options?.localOcrCues;
    if (!localCues) {
      try {
        const { combinedCues } = await preprocessMultipleImages(images);
        localCues = combinedCues;
      } catch (ocrErr) {
        console.debug('[ExtractionEngine] Prepass local OCR cues skipped:', ocrErr);
      }
    }

    // Step 2: Pass options to main extract function
    const scanResult = await extractProduct5FieldsFromImages(images, {
      ...options,
      localOcrCues: localCues,
    });

    // Step 3: If strict mode (Attempt 5), enforce zero-hallucination rules client-side as well
    if (options?.strictMode) {
      return this.applyStrictZeroHallucinationFilter(scanResult);
    }

    return scanResult;
  }

  /**
   * Strict Zero-Hallucination Filter (Attempt 5 Requirement):
   * - Does NOT allow AI to guess data.
   * - Removes suspicious or ungrounded values.
   * - Sets uncertain fields to null/unknown.
   */
  private static applyStrictZeroHallucinationFilter(result: ProductScanResult): ProductScanResult {
    const conf = result.confidence || {};

    let name = (result.productName || '').trim();
    if (conf.productName !== undefined && conf.productName < 0.45) {
      name = ''; // Reset uncertain hallucinated name
    }

    let price = result.price;
    if (conf.price !== undefined && conf.price < 0.45) {
      price = null;
    }

    let mfd = result.manufactureDate;
    if (conf.manufactureDate !== undefined && conf.manufactureDate < 0.45) {
      mfd = null;
    }

    let exp = result.expiryDate;
    if (conf.expiryDate !== undefined && conf.expiryDate < 0.45) {
      exp = null;
    }

    let barcode = result.barcode;
    if (conf.barcode !== undefined && conf.barcode < 0.45) {
      barcode = '';
    }

    return {
      ...result,
      productName: name,
      price,
      manufactureDate: mfd,
      expiryDate: exp,
      barcode,
      warnings: [...(result.warnings || []), 'Processed via strict zero-hallucination filter.'],
    };
  }
}
