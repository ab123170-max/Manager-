/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fast barcode/QR path for live scanning.
 * Prefers the platform BarcodeDetector and throttles the ZXing fallback.
 * A single-flight guard prevents slow mobile devices from processing several
 * camera frames concurrently, which can otherwise increase latency and jank.
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
let detectionInFlight = false;

function getNativeDetector(): BarcodeDetectorLike | null {
  if (nativeInitAttempted) return nativeDetector;
  nativeInitAttempted = true;

  try {
    const Ctor = (globalThis as any).BarcodeDetector as BarcodeDetectorCtor | undefined;
    if (Ctor) nativeDetector = new Ctor({ formats: detectorFormats });
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
    } catch {
      // Plain text QR codes are valid too.
    }
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
 * Fast path for a live camera frame.
 * - Skips overlapping work instead of queuing stale frames.
 * - Uses native decoding where supported.
 * - Runs the heavier ZXing fallback at most once per 300ms.
 * - Suppresses repeated results briefly to avoid duplicate inventory actions.
 */
export async function detectFastCode(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  forceFallback = false
): Promise<DetectedCode | null> {
  if (detectionInFlight) return null;

  if (source instanceof HTMLVideoElement) {
    if (source.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        source.videoWidth <= 0 || source.videoHeight <= 0) {
      return null;
    }
  } else if (source instanceof HTMLImageElement) {
    if (!source.complete || source.naturalWidth <= 0 || source.naturalHeight <= 0) {
      return null;
    }
  } else if (source.width <= 0 || source.height <= 0) {
    return null;
  }

  detectionInFlight = true;
  try {
    const now = performance.now();
    const native = getNativeDetector();

    if (native && !forceFallback) {
      try {
        const results = await native.detect(source);
        const first = results.find((r) => !!r.rawValue?.trim());
        if (first?.rawValue) {
          const value = first.rawValue.trim();
          if (value === lastValue && now - lastValueAt < 900) return null;
          lastValue = value;
          lastValueAt = now;
          return buildCode(value, first.format);
        }
        // Native detector ran successfully but found no code. Do not spend
        // CPU on ZXing for every frame; fallback is reserved for throttled checks.
        if (now - lastFallbackAt < 300) return null;
      } catch {
        // Native decoder may exist but fail on a specific device/frame.
      }
    }

    if (now - lastFallbackAt < 300) return null;
    lastFallbackAt = now;

    try {
      const codes = await detectCodesInImage(source, 'all');
      const code = codes[0];
      if (!code?.value) return null;

      const value = code.value.trim();
      const completedAt = performance.now();
      if (value === lastValue && completedAt - lastValueAt < 900) return null;
      lastValue = value;
      lastValueAt = completedAt;
      return code;
    } catch {
      return null;
    }
  } finally {
    detectionInFlight = false;
  }
}

export function resetFastBarcodeState() {
  lastValue = '';
  lastValueAt = 0;
  lastFallbackAt = 0;
  detectionInFlight = false;
}
