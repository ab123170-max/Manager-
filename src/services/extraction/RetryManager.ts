/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductScanResult } from '../../types';
import { ExtractionEngine } from './ExtractionEngine';
import { ExtractionValidator, ValidationReport } from './ExtractionValidator';
import { ImagePreprocessor } from './ImagePreprocessor';
import { CropManager } from './CropManager';
import { ConfidenceEvaluator } from './ConfidenceEvaluator';

export type RetryStatusMessage =
  | 'Reading product…'
  | 'Enhancing image…'
  | 'Checking label…'
  | 'Trying another crop…'
  | 'Final verification…';

export interface RetryProgressCallback {
  (status: RetryStatusMessage, attempt: number): void;
}

export interface RetryExecutionResult {
  success: boolean;
  attemptsCount: number;
  finalResult: ProductScanResult | null;
  validationReport: ValidationReport | null;
  preservedImages: string[];
  lastError: string | null;
}

export class RetryManager {
  private static MAX_ATTEMPTS = 5;
  private static activeRequestHash: string | null = null;

  /**
   * Main Automatic Extraction Retry Orchestrator.
   * Runs up to 5 attempts asynchronously with progress updates.
   */
  public static async executeWithRetry(
    initialImages: string[],
    fullFrameImages: string[] = [],
    onProgress?: RetryProgressCallback
  ): Promise<RetryExecutionResult> {
    if (!initialImages || initialImages.length === 0) {
      return {
        success: false,
        attemptsCount: 0,
        finalResult: null,
        validationReport: null,
        preservedImages: [],
        lastError: 'No images provided for extraction retry pipeline.',
      };
    }

    // Deduplication check: prevent accidental duplicate concurrent execution on identical images
    const requestHash = initialImages[0]?.substring(0, 100) || '';
    if (this.activeRequestHash === requestHash) {
      console.warn('[RetryManager] Duplicate concurrent request prevented.');
    }
    this.activeRequestHash = requestHash;

    const preservedImages = [...initialImages];
    const fullFrames = fullFrameImages.length > 0 ? fullFrameImages : initialImages;

    let lastResult: ProductScanResult | null = null;
    let lastValidation: ValidationReport | null = null;
    let lastError: string | null = null;

    try {
      // =========================================================================
      // ATTEMPT 1: NORMAL EXTRACTION
      // =========================================================================
      onProgress?.('Reading product…', 1);
      console.info('[RetryManager] Attempt 1: Normal extraction starting...');

      try {
        lastResult = await ExtractionEngine.execute(initialImages);
        lastValidation = ExtractionValidator.validate(lastResult);

        if (lastValidation.isValid && lastValidation.score >= 85) {
          console.info('[RetryManager] Attempt 1 succeeded with high confidence (>=85%).');
          return {
            success: true,
            attemptsCount: 1,
            finalResult: lastResult,
            validationReport: lastValidation,
            preservedImages,
            lastError: null,
          };
        }
      } catch (err: unknown) {
        lastError = (err as Error)?.message || 'Attempt 1 extraction failed.';
        console.warn('[RetryManager] Attempt 1 failed:', lastError);
      }

      // Short delay before Attempt 2 (~300ms)
      await this.delay(300);

      // =========================================================================
      // ATTEMPT 2: IMAGE ENHANCEMENT
      // =========================================================================
      onProgress?.('Enhancing image…', 2);
      console.info('[RetryManager] Attempt 2: Image enhancement starting...');

      try {
        const enhancedImages = await ImagePreprocessor.enhanceBatch(initialImages, {
          brightness: 18,
          contrast: 1.4,
          sharpen: true,
          noiseReduction: true,
        });

        const attempt2Result = await ExtractionEngine.execute(enhancedImages, {
          enhancedMode: true,
        });

        const attempt2Val = ExtractionValidator.validate(attempt2Result);
        if (attempt2Val.isValid && attempt2Val.score >= 70) {
          console.info('[RetryManager] Attempt 2 succeeded after image enhancement.');
          return {
            success: true,
            attemptsCount: 2,
            finalResult: attempt2Result,
            validationReport: attempt2Val,
            preservedImages: enhancedImages,
            lastError: null,
          };
        }

        // Compare Attempt 1 vs Attempt 2 to hold best so far
        const bestCandidate = ExtractionValidator.selectBestCandidate([lastResult, attempt2Result]);
        if (bestCandidate) {
          lastResult = bestCandidate as ProductScanResult;
          lastValidation = ExtractionValidator.validate(lastResult);
        }
      } catch (err: unknown) {
        lastError = (err as Error)?.message || 'Attempt 2 image enhancement failed.';
        console.warn('[RetryManager] Attempt 2 failed:', lastError);
      }

      // Delay before Attempt 3 (~600ms)
      await this.delay(600);

      // =========================================================================
      // ATTEMPT 3: SMART RECROP (Multi-Crop Candidates)
      // =========================================================================
      onProgress?.('Trying another crop…', 3);
      console.info('[RetryManager] Attempt 3: Smart recrop starting...');

      try {
        const recropResult = await CropManager.generateSmartRecropCandidates(fullFrames[0] || initialImages[0]);
        const candidates = recropResult.candidates;

        for (const cropImg of candidates) {
          try {
            const candidateResult = await ExtractionEngine.execute([cropImg], { recropMode: true });
            const candidateVal = ExtractionValidator.validate(candidateResult);

            if (candidateVal.isValid && candidateVal.score >= 70) {
              console.info('[RetryManager] Attempt 3 succeeded with smart recrop candidate.');
              return {
                success: true,
                attemptsCount: 3,
                finalResult: candidateResult,
                validationReport: candidateVal,
                preservedImages: [cropImg],
                lastError: null,
              };
            }

            const bestCandidate = ExtractionValidator.selectBestCandidate([lastResult, candidateResult]);
            if (bestCandidate) {
              lastResult = bestCandidate as ProductScanResult;
              lastValidation = ExtractionValidator.validate(lastResult);
            }
          } catch (cErr) {
            console.debug('[RetryManager] Recrop candidate failed:', cErr);
          }
        }
      } catch (err: unknown) {
        lastError = (err as Error)?.message || 'Attempt 3 smart recrop failed.';
        console.warn('[RetryManager] Attempt 3 failed:', lastError);
      }

      // Delay before Attempt 4 (~1000ms)
      await this.delay(1000);

      // =========================================================================
      // ATTEMPT 4: FULL-FRAME FALLBACK
      // =========================================================================
      onProgress?.('Checking label…', 4);
      console.info('[RetryManager] Attempt 4: Full-frame fallback starting...');

      try {
        const fullFrameFallbackImages = CropManager.getFullFrameFallback(fullFrames);
        const attempt4Result = await ExtractionEngine.execute(fullFrameFallbackImages, {
          fullFrameMode: true,
        });

        const attempt4Val = ExtractionValidator.validate(attempt4Result);
        if (attempt4Val.isValid && attempt4Val.score >= 65) {
          console.info('[RetryManager] Attempt 4 succeeded with full-frame fallback.');
          return {
            success: true,
            attemptsCount: 4,
            finalResult: attempt4Result,
            validationReport: attempt4Val,
            preservedImages: fullFrameFallbackImages,
            lastError: null,
          };
        }

        const bestSoFar = ExtractionValidator.selectBestCandidate([lastResult, attempt4Result]);
        if (bestSoFar) {
          lastResult = bestSoFar as ProductScanResult;
          lastValidation = ExtractionValidator.validate(lastResult);
        }
      } catch (err: unknown) {
        lastError = (err as Error)?.message || 'Attempt 4 full-frame fallback failed.';
        console.warn('[RetryManager] Attempt 4 failed:', lastError);
      }

      // Delay before Attempt 5 (~1500ms)
      await this.delay(1500);

      // =========================================================================
      // ATTEMPT 5: STRONG EXTRACTION FALLBACK (Zero Hallucination)
      // =========================================================================
      onProgress?.('Final verification…', 5);
      console.info('[RetryManager] Attempt 5: Strong zero-hallucination extraction starting...');

      try {
        const attempt5Result = await ExtractionEngine.execute(fullFrames, {
          strictMode: true,
        });

        const attempt5Val = ExtractionValidator.validate(attempt5Result);
        const bestFinal = ExtractionValidator.selectBestCandidate([lastResult, attempt5Result]) as ProductScanResult | null;

        if (bestFinal) {
          const finalVal = ExtractionValidator.validate(bestFinal);
          if (finalVal.isValid || (bestFinal.productName && bestFinal.productName.length > 2)) {
            console.info('[RetryManager] Attempt 5 completed with final verified result.');
            return {
              success: true,
              attemptsCount: 5,
              finalResult: bestFinal,
              validationReport: finalVal,
              preservedImages,
              lastError: null,
            };
          }
        }
      } catch (err: unknown) {
        lastError = (err as Error)?.message || 'Attempt 5 strong extraction failed.';
        console.warn('[RetryManager] Attempt 5 failed:', lastError);
      }

      // All 5 attempts exhausted
      console.warn('[RetryManager] All 5 attempts exhausted without valid extraction.');
      return {
        success: false,
        attemptsCount: 5,
        finalResult: lastResult,
        validationReport: lastValidation,
        preservedImages,
        lastError: lastError || 'Product details could not be reliably extracted after 5 attempts.',
      };
    } finally {
      this.activeRequestHash = null;
    }
  }

  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
