/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createWorker, Worker } from 'tesseract.js';
import { mapLabelOcrText, NormalizedLabelResult } from './labelMappingEngine';

/**
 * ============================================================================
 * TESSERACT.JS OCR ENGINE
 * ============================================================================
 * Runs client-side optical character recognition on captured product label frames.
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

let workerInstance: Worker | null = null;
let isInitializingWorker = false;

/**
 * Lazy loads or reuses the Tesseract worker instance.
 */
async function getTesseractWorker(): Promise<Worker> {
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
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

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
        const response = await fetch('/api/ocr', {
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

/**
 * Captures a single still snapshot from a live HTMLVideoElement into base64 JPEG.
 */
export function captureStillFrameFromVideo(video: HTMLVideoElement): {
  dataUrl: string;
  canvas: HTMLCanvasElement;
} | null {
  if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  const canvas = document.createElement('canvas');
  // Cap resolution to 1280px max dimension for optimal OCR speed & accuracy
  const maxDim = 1280;
  let w = video.videoWidth;
  let h = video.videoHeight;
  if (w > maxDim || h > maxDim) {
    if (w > h) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    } else {
      w = Math.round((w * maxDim) / h);
      h = maxDim;
    }
  }

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
  return { dataUrl, canvas };
}
