/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { mapLabelOcrText, NormalizedLabelResult } from './labelMappingEngine';
import { getApiUrl } from '../config/apiConfig';

/**
 * ============================================================================
 * TESSERACT.JS OCR ENGINE (LAZY LOADED)
 * ============================================================================
 * Runs client-side optical character recognition on captured product label frames.
 * - Dynamically loads tesseract.js on-demand only when OCR is actually invoked.
 * - Single-shot execution upon barcode detection or snapshot.
 * - Graceful fallback to server /api/ocr if client worker is blocked.
 * - Normalizes extracted text lines via labelMappingEngine.
 */

export interface OcrEngineResult {
  rawText: string;
  lines: string[];
  confidence: number;
  mapping: NormalizedLabelResult;
  processingTimeMs: number;
  source: 'client_tesseract' | 'server_ocr';
}

let workerInstance: any = null;
let isInitializingWorker = false;

/**
 * Lazy loads or reuses the Tesseract worker instance.
 */
async function getTesseractWorker(): Promise<any> {
  if (workerInstance) {
    return workerInstance;
  }
  if (isInitializingWorker) {
    // Wait for existing initialization to resolve
    await new Promise((r) => setTimeout(r, 250));
    if (workerInstance) return workerInstance;
  }

  isInitializingWorker = true;
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    workerInstance = worker;
    return workerInstance;
  } finally {
    isInitializingWorker = false;
  }
}

/**
 * Executes single-run OCR on image source (Canvas, data URL, ImageBitmap, or Blob).
 */
export async function runProductOcr(
  imageSource: string | HTMLCanvasElement | Blob,
  fallbackToServer = true
): Promise<OcrEngineResult> {
  const startTime = Date.now();

  try {
    const worker = await getTesseractWorker();
    const ret = await worker.recognize(imageSource);
    const rawText = ret.data.text || '';
    const confidence = ret.data.confidence ? Math.round(ret.data.confidence) : 85;

    const lines = rawText
      .split(/[\r\n]+/)
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    const mapping = mapLabelOcrText(lines);

    return {
      rawText,
      lines,
      confidence,
      mapping,
      processingTimeMs: Date.now() - startTime,
      source: 'client_tesseract',
    };
  } catch (clientErr) {
    console.warn('[OCR Engine] Client Tesseract.js failed or worker blocked. Trying server fallback...', clientErr);

    if (fallbackToServer && typeof imageSource === 'string') {
      try {
        const response = await fetch(getApiUrl('/api/ocr'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: imageSource }),
        });

        if (response.ok) {
          const resJson = await response.json();
          if (resJson.success && resJson.data) {
            const rawText = resJson.data.rawText || '';
            const lines = resJson.data.lines || rawText.split('\n').filter(Boolean);
            const mapping = resJson.data.mapping || mapLabelOcrText(lines);
            return {
              rawText,
              lines,
              confidence: resJson.data.confidence || 80,
              mapping,
              processingTimeMs: Date.now() - startTime,
              source: 'server_ocr',
            };
          }
        }
      } catch (serverErr) {
        console.error('[OCR Engine] Server fallback also failed:', serverErr);
      }
    }

    // Return empty structured mapping on failure without throwing
    return {
      rawText: '',
      lines: [],
      confidence: 0,
      mapping: mapLabelOcrText([]),
      processingTimeMs: Date.now() - startTime,
      source: 'client_tesseract',
    };
  }
}

