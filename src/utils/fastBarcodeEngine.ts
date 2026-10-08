/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fast barcode/QR path for the live scanner.
 * Uses the browser's native BarcodeDetector when available and falls back
 * to the existing ZXing engine only on a throttled cadence.
 */

import { DetectedCode } from '../types';
import { detectCodesInImage } from './barcodeDetector';

type BarcodeDetectorLike = {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue?: string; format?: string }>>;
};

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

const detectorFormats = [
  'aztec',
  'code_128',
  'code_39',
  'code_93',
  'codabar',
  'data_matrix',
  'ean_13',
  'ean_8',
  'itf',
  'pdf417',
  'qr_code',
  'upc_a',
  'upc_e',
];

let nativeDetector: BarcodeDetectorLike | null = null;
let nativeInitAttempted = false;
let lastFallbackAt = 0;
let lastValue = '';
let lastValueAt = 0;

function getNativeDetector(): BarcodeDetectorLike | null {
  if (nativeInitAttempted) return nativeDetector;
  nativeInitAttempted = true;

  try {
    const Ctor = (globalThis as any).BarcodeDetector as BarcodeDetectorCtor | undefined;
    if (!Ctor) return null;
    nativeDetector = new Ctor({ formats: detectorFormats });
  } catch {
    nativeDetector = null;
  }

  return nativeDetector;
}

function normalizeFormat(format?: string): string {
  return String(format || 'barcode')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function buildCode(rawValue: string, format?: string): DetectedCode {
  const isQr = String(format || '').toLowerCase().includes('qr');
  const isUrl = /^https?:\/\//i.test(rawValue);
  let isJson = false;
  let parsedJson: Record<string, unknown> | null = null;

  if (rawValue.startsWith('{') && rawValue.endsWith('}')) {
    try {
      const parsed = JSON.parse(rawValue);
      if (parsed && typeof parsed === 'object') {
        isJson = true;
        parsedJson = parsed as Record<string, unknown>;
      }
    } catch {}
  }

  return {
    type: isQr ? 'qr' : 'barcode',
    format: normalizeFormat(format),
    value: rawValue,
    raw_value: rawValue,
    confidence: 1,
    timestamp: Date.now(),
    isUrl,
    isJson,
    parsedJson,
  };
}

/**
 * Returns a code immediately when the platform can decode it.
 * ZXing fallback is throttled so it never blocks every live frame.
 */
export async function detectFastCode(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  forceFallback = false
): Promise<DetectedCode | null> {
  const now = performance.now();

  const native = getNativeDetector();
  if (native && !forceFallback) {
    try {
      const results = await native.detect(source);
      const first = results.find((r) => !!r.rawValue);
      if (first?.rawValue) {
        const value = first.rawValue.trim();
        if (value !== lastValue || now - lastValueAt > 1200) {
          lastValue = value;
          lastValueAt = now;
          return buildCode(value, first.format);
        }
        return null;
      }
    } catch {
      // Fall through to throttled ZXing.
    }
  }

  // Never run the heavier fallback more than once every 450ms.
  if (now - lastFallbackAt < 450) return null;
  lastFallbackAt = now;

  try {
    const codes = await detectCodesInImage(source, 'all');
    const code = codes[0];
    if (!code?.value) return null;

    if (code.value === lastValue && now - lastValueAt < 1200) return null;
    lastValue = code.value;
    lastValueAt = now;
    return code;
  } catch {
    return null;
  }
}

export function resetFastBarcodeState() {
  lastValue = '';
  lastValueAt = 0;
  lastFallbackAt = 0;
}
