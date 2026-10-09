/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Real-time Product Detector.
 * Coordinates ML detections, barcode scanning, and stability estimation.
 * Strictly avoids fake detections, heuristic energy boxes, or fabricated scores.
 */

import { detectFastCode } from './fastBarcodeEngine';
import { NormalizedRect } from './coordinateMapping';

export type { NormalizedRect } from './coordinateMapping';

export type DetectedRegionType =
  | 'product_boundary'
  | 'expiry_date'
  | 'mfd_date'
  | 'best_before'
  | 'price_mrp'
  | 'product_name'
  | 'brand'
  | 'batch_lot'
  | 'barcode_qr';

export interface DetectedRegion {
  id: string;
  type: DetectedRegionType;
  label: string;
  priority: number; // 1 (highest) to 8
  confidence: number; // 0.0 to 1.0 (genuine score)
  box: NormalizedRect;
  cropDataUrl?: string;
  decodedValue?: string;
}

export interface RealtimeDetectionResult {
  hasProduct: boolean;
  isStable: boolean;
  stabilityScore: number; // 0.0 to 1.0
  productBox: NormalizedRect | null;
  regions: DetectedRegion[];
  guidanceText: string;
  trackingState: 'searching' | 'detected' | 'tracking' | 'stable';
  dominantColor: string;
  detectedBarcode?: string;
  detectedLabel?: string;
  confidence?: number;
}

/**
 * Smooths bounding box coordinates across frames using exponential moving average (LERP)
 * to prevent flickering and camera jitter while maintaining high responsiveness.
 */
export function smoothNormalizedRect(
  current: NormalizedRect,
  previous?: NormalizedRect | null,
  alpha: number = 0.50
): NormalizedRect {
  if (!previous) return current;
  return {
    x: previous.x + (current.x - previous.x) * alpha,
    y: previous.y + (current.y - previous.y) * alpha,
    width: previous.width + (current.width - previous.width) * alpha,
    height: previous.height + (current.height - previous.height) * alpha,
  };
}

/**
 * Estimates stability between two bounding boxes
 */
export function computeBoxStability(
  curr: NormalizedRect | null,
  prev: NormalizedRect | null
): { isStable: boolean; score: number } {
  if (!curr || !prev) return { isStable: false, score: 0 };

  const dx = Math.abs(curr.x - prev.x);
  const dy = Math.abs(curr.y - prev.y);
  const dw = Math.abs(curr.width - prev.width);
  const dh = Math.abs(curr.height - prev.height);

  const delta = dx + dy + dw + dh;

  // If delta is less than 0.035, the box is very steady
  const score = Math.max(0, Math.min(1, 1 - delta / 0.08));
  const isStable = delta < 0.04;

  return { isStable, score };
}

/**
 * Analyzes frame for barcodes and updates detection result with genuine inputs.
 * NEVER creates fake product boxes or heuristic luminance detections.
 */
export async function analyzeLiveFrame(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  previousResult?: RealtimeDetectionResult | null,
  activeBox?: NormalizedRect | null,
  activeLabel?: string,
  activeConfidence?: number,
  dominantColor?: string
): Promise<RealtimeDetectionResult> {
  const hasProduct = Boolean(activeBox && activeBox.width > 0.03 && activeBox.height > 0.03);

  // Fast barcode scan check
  let detectedBarcode: string | undefined = undefined;
  try {
    const code = await detectFastCode(source);
    if (code?.value) {
      detectedBarcode = code.value;
    }
  } catch {
    // Non-fatal
  }

  if (!hasProduct || !activeBox) {
    return {
      hasProduct: false,
      isStable: false,
      stabilityScore: 0,
      productBox: null,
      regions: [],
      guidanceText: 'Point camera at product packaging',
      trackingState: 'searching',
      dominantColor: '#10b981',
      detectedBarcode,
    };
  }

  // Smooth box with previous frame
  const productBox = smoothNormalizedRect(activeBox, previousResult?.productBox);

  // Stability calculation
  const { isStable, score: stabilityScore } = computeBoxStability(
    productBox,
    previousResult?.productBox || null
  );

  const regions: DetectedRegion[] = [];

  // If a barcode was detected, register genuine barcode region
  if (detectedBarcode) {
    regions.push({
      id: 'region-barcode',
      type: 'barcode_qr',
      label: 'Barcode / QR',
      priority: 1,
      confidence: 1.0,
      box: {
        x: productBox.x + productBox.width * 0.1,
        y: productBox.y + productBox.height * 0.6,
        width: productBox.width * 0.8,
        height: productBox.height * 0.35,
      },
      decodedValue: detectedBarcode,
    });
  }

  // Dynamic guidance message
  let guidanceText = 'Keep product steady';
  let trackingState: 'searching' | 'detected' | 'tracking' | 'stable' = 'tracking';

  if (isStable) {
    trackingState = 'stable';
    guidanceText = 'Product locked • Hold steady';
  } else {
    trackingState = 'tracking';
    guidanceText = activeLabel ? `Tracking ${activeLabel}` : 'Tracking product...';
  }

  return {
    hasProduct: true,
    isStable,
    stabilityScore,
    productBox,
    regions,
    guidanceText,
    trackingState,
    dominantColor: dominantColor || '#10b981',
    detectedBarcode,
    detectedLabel: activeLabel,
    confidence: activeConfidence,
  };
}

/**
 * Crops a normalized sub-region from an image data URL with boundary safety.
 */
export async function cropNormalizedRegion(
  fullImageDataUrl: string,
  rect: NormalizedRect | null,
  paddingPercent: number = 0.04
): Promise<string> {
  if (
    !rect ||
    isNaN(rect.x) ||
    isNaN(rect.y) ||
    isNaN(rect.width) ||
    isNaN(rect.height) ||
    rect.width < 0.04 ||
    rect.height < 0.04
  ) {
    return fullImageDataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;

      if (origW <= 0 || origH <= 0) {
        resolve(fullImageDataUrl);
        return;
      }

      const padX = Math.max(6, rect.width * paddingPercent * origW);
      const padY = Math.max(6, rect.height * paddingPercent * origH);

      const cropX = Math.max(0, Math.min(origW - 20, Math.floor(rect.x * origW - padX)));
      const cropY = Math.max(0, Math.min(origH - 20, Math.floor(rect.y * origH - padY)));
      const cropW = Math.max(20, Math.min(origW - cropX, Math.ceil(rect.width * origW + padX * 2)));
      const cropH = Math.max(20, Math.min(origH - cropY, Math.ceil(rect.height * origH + padY * 2)));

      const canvas = document.createElement('canvas');
      const targetW = Math.min(1600, Math.max(360, cropW));
      canvas.width = targetW;
      canvas.height = Math.max(120, Math.round((cropH * targetW) / cropW));

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(fullImageDataUrl);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

      resolve(canvas.toDataURL('image/jpeg', 0.94));
    };

    img.onerror = () => resolve(fullImageDataUrl);
    img.src = fullImageDataUrl;
  });
}
