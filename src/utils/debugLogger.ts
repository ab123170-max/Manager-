/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================================
 * PIPELINE DEBUG LOGGER
 * ============================================================================
 * Structured logging for each step of the Barcode-to-Product pipeline in development.
 * Never logs sensitive credentials or API keys.
 */

type PipelineStage =
  | 'barcodeDetected'
  | 'normalizedBarcode'
  | 'barcodeLookupStarted'
  | 'barcodeLookupResult'
  | 'labelCapture'
  | 'ocrExtraction'
  | 'geminiSupervisionStarted'
  | 'geminiSupervisionResult'
  | 'mergeResults'
  | 'inventoryMatch'
  | 'formAutoFill'
  | 'productSaved'
  | 'cameraError';

class PipelineLogger {
  private isDev: boolean;

  constructor() {
    this.isDev = typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.DEV);
  }

  public log(stage: PipelineStage, data: unknown, note?: string) {
    if (!this.isDev && typeof window !== 'undefined' && !(window as any).__SMARTSTOCK_DEBUG__) {
      return;
    }

    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    const prefix = `[Pipeline:${stage} @ ${timestamp}]`;

    if (stage === 'cameraError') {
      console.error(prefix, note || '', data);
    } else {
      console.log(prefix, note || '', data);
    }
  }
}

export const pipelineLogger = new PipelineLogger();
