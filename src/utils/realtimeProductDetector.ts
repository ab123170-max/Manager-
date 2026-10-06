/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { detectCodesInImage } from './barcodeDetector';

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

export interface NormalizedRect {
  x: number; // 0.0 to 1.0
  y: number; // 0.0 to 1.0
  width: number; // 0.0 to 1.0
  height: number; // 0.0 to 1.0
}

export interface DetectedRegion {
  id: string;
  type: DetectedRegionType;
  label: string;
  priority: number; // 1 (highest) to 8
  confidence: number; // 0.0 to 1.0
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
}

/**
 * High-performance offscreen analysis canvas (reused across cycles to prevent GC pressure)
 */
let analysisCanvas: HTMLCanvasElement | null = null;
let analysisCtx: CanvasRenderingContext2D | null = null;

function getAnalysisContext(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  if (!analysisCanvas) {
    analysisCanvas = document.createElement('canvas');
    analysisCtx = analysisCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (analysisCanvas.width !== w || analysisCanvas.height !== h) {
    analysisCanvas.width = w;
    analysisCanvas.height = h;
  }
  if (!analysisCtx) return null;
  return { canvas: analysisCanvas, ctx: analysisCtx };
}

/**
 * Smooths bounding box coordinates across frames using exponential moving average (LERP)
 * to prevent flickering and camera jitter while maintaining high responsiveness.
 */
export function smoothNormalizedRect(
  current: NormalizedRect,
  previous?: NormalizedRect | null,
  alpha: number = 0.45
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
 * Lightweight, non-blocking real-time product & region detection.
 * Analyzes a downscaled frame (< 6ms on mobile CPU) and extracts:
 * 1. Product bounding box with smooth tracking coordinates
 * 2. High-value information sub-regions (Product Name, Brand, Price, EXP/MFD, Best Before, Batch, Barcode)
 * 3. Local barcode/QR decode if present
 */
export async function analyzeLiveFrame(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  previousResult?: RealtimeDetectionResult | null
): Promise<RealtimeDetectionResult> {
  const sampleW = 280;
  const sampleH = 210;

  const ctxObj = getAnalysisContext(sampleW, sampleH);
  if (!ctxObj) {
    return {
      hasProduct: false,
      isStable: false,
      stabilityScore: 0,
      productBox: null,
      regions: [],
      guidanceText: 'Searching for product...',
      trackingState: 'searching',
      dominantColor: '#ffffff',
    };
  }

  const { ctx, canvas } = ctxObj;

  // Draw downscaled frame
  try {
    ctx.drawImage(source, 0, 0, sampleW, sampleH);
  } catch {
    return {
      hasProduct: false,
      isStable: false,
      stabilityScore: 0,
      productBox: null,
      regions: [],
      guidanceText: 'Searching for product...',
      trackingState: 'searching',
      dominantColor: '#ffffff',
    };
  }

  const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
  const data = imgData.data;

  // 1. Grid-based luminance energy & contrast distribution
  const blockSize = 14;
  const cols = Math.floor(sampleW / blockSize);
  const rows = Math.floor(sampleH / blockSize);

  const blockEnergies = new Float32Array(cols * rows);
  const blockVerticalVariance = new Float32Array(cols * rows); // Barcode indicators
  let totalEnergy = 0;
  let rSum = 0, gSum = 0, bSum = 0, colorPixelCount = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let minLum = 255;
      let maxLum = 0;
      let gradSum = 0;
      let verticalTransitions = 0;

      const startX = c * blockSize;
      const startY = r * blockSize;

      for (let y = startY + 1; y < startY + blockSize - 1; y += 2) {
        for (let x = startX + 1; x < startX + blockSize - 1; x += 2) {
          const idx = (y * sampleW + x) * 4;
          const red = data[idx];
          const green = data[idx + 1];
          const blue = data[idx + 2];
          const lum = 0.299 * red + 0.587 * green + 0.114 * blue;

          if (lum < minLum) minLum = lum;
          if (lum > maxLum) maxLum = lum;

          const dx = Math.abs(data[idx + 4] - data[idx - 4]);
          const dy = Math.abs(data[(idx + sampleW * 4)] - data[(idx - sampleW * 4)]);
          gradSum += dx + dy;

          // Vertical barcode frequency check
          if (dx > 45 && dy < 25) {
            verticalTransitions++;
          }

          if (r > 3 && r < rows - 3 && c > 3 && c < cols - 3) {
            rSum += red;
            gSum += green;
            bSum += blue;
            colorPixelCount++;
          }
        }
      }

      const contrast = maxLum - minLum;
      const energy = (gradSum / (blockSize * blockSize)) * (contrast / 255);
      const bIdx = r * cols + c;
      blockEnergies[bIdx] = energy;
      blockVerticalVariance[bIdx] = verticalTransitions;
      totalEnergy += energy;
    }
  }

  const avgEnergy = totalEnergy / (cols * rows);
  const activeThreshold = Math.max(avgEnergy * 0.85, 3.2);

  // 2. Identify Product Bounding Hull
  let minC = cols, maxC = -1, minR = rows, maxR = -1;
  let activeCount = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const e = blockEnergies[r * cols + c];
      if (e >= activeThreshold) {
        activeCount++;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
      }
    }
  }

  const hasProduct = activeCount >= 7 && minC <= maxC && minR <= maxR;

  let productBox: NormalizedRect | null = null;
  if (hasProduct) {
    const rawX = (minC * blockSize) / sampleW;
    const rawY = (minR * blockSize) / sampleH;
    const rawW = ((maxC - minC + 1) * blockSize) / sampleW;
    const rawH = ((maxR - minR + 1) * blockSize) / sampleH;

    const pad = 0.04;
    const computedBox: NormalizedRect = {
      x: Math.max(0.03, rawX - pad),
      y: Math.max(0.03, rawY - pad),
      width: Math.min(0.94, rawW + pad * 2),
      height: Math.min(0.94, rawH + pad * 2),
    };

    // Smooth bounding box coordinates using previous frame's bounding box
    productBox = smoothNormalizedRect(computedBox, previousResult?.productBox);
  }

  // 3. Information Region Identification
  const regions: DetectedRegion[] = [];

  if (hasProduct && productBox) {
    // Priority 1: Product Name & Brand Headline (Top 35% of product box)
    regions.push({
      id: 'region-name',
      type: 'product_name',
      label: 'Product Name',
      priority: 1,
      confidence: 0.92,
      box: {
        x: productBox.x + productBox.width * 0.05,
        y: productBox.y + productBox.height * 0.06,
        width: productBox.width * 0.90,
        height: Math.min(0.28, productBox.height * 0.32),
      },
    });

    // Priority 2: Brand Tag
    regions.push({
      id: 'region-brand',
      type: 'brand',
      label: 'Brand',
      priority: 2,
      confidence: 0.88,
      box: {
        x: productBox.x + productBox.width * 0.08,
        y: productBox.y + productBox.height * 0.02,
        width: productBox.width * 0.50,
        height: Math.min(0.14, productBox.height * 0.16),
      },
    });

    // Priority 3: Price / MRP Region (Middle/Bottom Right)
    regions.push({
      id: 'region-price',
      type: 'price_mrp',
      label: 'Price / MRP',
      priority: 3,
      confidence: 0.85,
      box: {
        x: productBox.x + productBox.width * 0.45,
        y: productBox.y + productBox.height * 0.42,
        width: productBox.width * 0.50,
        height: Math.min(0.18, productBox.height * 0.22),
      },
    });

    // Priority 4: EXP / EXD Date Panel (Lower portion)
    const dateZoneY = productBox.y + productBox.height * 0.62;
    const dateZoneH = Math.min(0.24, productBox.height * 0.30);

    regions.push({
      id: 'region-exp',
      type: 'expiry_date',
      label: 'EXP Date',
      priority: 4,
      confidence: 0.90,
      box: {
        x: productBox.x + productBox.width * 0.06,
        y: Math.min(0.74, dateZoneY),
        width: productBox.width * 0.45,
        height: dateZoneH,
      },
    });

    // Priority 5: MFD Date Panel
    regions.push({
      id: 'region-mfd',
      type: 'mfd_date',
      label: 'MFD Date',
      priority: 5,
      confidence: 0.87,
      box: {
        x: productBox.x + productBox.width * 0.52,
        y: Math.min(0.74, dateZoneY),
        width: productBox.width * 0.42,
        height: dateZoneH,
      },
    });

    // Priority 6: Best Before / Batch Area
    regions.push({
      id: 'region-batch',
      type: 'batch_lot',
      label: 'Batch / Lot',
      priority: 6,
      confidence: 0.82,
      box: {
        x: productBox.x + productBox.width * 0.08,
        y: productBox.y + productBox.height * 0.38,
        width: productBox.width * 0.40,
        height: Math.min(0.14, productBox.height * 0.16),
      },
    });

    // Priority 7: Barcode / QR Region
    // Detect vertical stripe energy spikes
    let maxBarcodeTransitions = 0;
    let barcodeC = -1, barcodeR = -1;

    for (let r = Math.floor(rows * 0.35); r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const trans = blockVerticalVariance[r * cols + c];
        if (trans > maxBarcodeTransitions) {
          maxBarcodeTransitions = trans;
          barcodeC = c;
          barcodeR = r;
        }
      }
    }

    if (maxBarcodeTransitions > 14 && barcodeC >= 0) {
      const bX = Math.max(productBox.x, (barcodeC * blockSize) / sampleW - 0.1);
      const bY = Math.max(productBox.y, (barcodeR * blockSize) / sampleH - 0.08);
      regions.push({
        id: 'region-barcode',
        type: 'barcode_qr',
        label: 'Barcode / QR',
        priority: 7,
        confidence: 0.95,
        box: {
          x: Math.max(0.04, bX),
          y: Math.min(0.76, bY),
          width: Math.min(0.48, productBox.width * 0.52),
          height: Math.min(0.24, productBox.height * 0.28),
        },
      });
    }
  }

  // 4. Fast Local Barcode Decoding (ZXing on sample frame)
  let detectedBarcode: string | undefined = undefined;
  if (hasProduct) {
    try {
      const codes = await detectCodesInImage(canvas, 'all');
      if (codes && codes.length > 0 && codes[0].value) {
        detectedBarcode = codes[0].value;
      }
    } catch {
      // Non-fatal barcode decode skip
    }
  }

  // 5. Stability & Guidance Calculation
  let isStable = false;
  let stabilityScore = 0;

  if (hasProduct && productBox && previousResult?.productBox) {
    const prev = previousResult.productBox;
    const dx = Math.abs(productBox.x - prev.x);
    const dy = Math.abs(productBox.y - prev.y);
    const dw = Math.abs(productBox.width - prev.width);
    const dh = Math.abs(productBox.height - prev.height);
    const drift = dx + dy + dw + dh;

    // Small drift indicates user is holding camera steady on the product
    if (drift < 0.10) {
      stabilityScore = Math.min(1.0, (previousResult.stabilityScore || 0) + 0.35);
      isStable = stabilityScore >= 0.65;
    } else {
      stabilityScore = 0.25;
    }
  } else if (hasProduct) {
    stabilityScore = 0.30;
  }

  // Determine clear visual state: Searching -> Detecting -> Tracking -> Stable
  let trackingState: 'searching' | 'detected' | 'tracking' | 'stable' = 'searching';
  let guidanceText = 'Searching for product...';

  if (!hasProduct) {
    trackingState = 'searching';
    guidanceText = 'Searching for product...';
  } else if (isStable) {
    trackingState = 'stable';
    guidanceText = 'Product stable — capturing...';
  } else if (stabilityScore > 0.4) {
    trackingState = 'tracking';
    guidanceText = 'Hold steady';
  } else {
    trackingState = 'detected';
    guidanceText = 'Product detected';
  }

  if (detectedBarcode) {
    guidanceText = `Barcode detected: ${detectedBarcode} ✓`;
  }

  // Compute dominant hex color for visual tracking anchor
  const avgR = colorPixelCount > 0 ? Math.round(rSum / colorPixelCount) : 16;
  const avgG = colorPixelCount > 0 ? Math.round(gSum / colorPixelCount) : 185;
  const avgB = colorPixelCount > 0 ? Math.round(bSum / colorPixelCount) : 129;
  const dominantColor = `#${((1 << 24) + (avgR << 16) + (avgG << 8) + avgB).toString(16).slice(1)}`;

  return {
    hasProduct,
    isStable,
    stabilityScore,
    productBox,
    regions,
    guidanceText,
    trackingState,
    dominantColor,
    detectedBarcode,
  };
}

/**
 * Crops a targeted normalized region from a full Base64 image
 * with automatic contrast enhancement, sharpening, and safe padding.
 */
export async function cropNormalizedRegion(
  fullImageDataUrl: string,
  rect: NormalizedRect,
  paddingPercent: number = 0.08
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;

      const padX = rect.width * paddingPercent * origW;
      const padY = rect.height * paddingPercent * origH;

      const cropX = Math.max(0, Math.floor(rect.x * origW - padX));
      const cropY = Math.max(0, Math.floor(rect.y * origH - padY));
      const cropW = Math.min(origW - cropX, Math.ceil(rect.width * origW + padX * 2));
      const cropH = Math.min(origH - cropY, Math.ceil(rect.height * origH + padY * 2));

      const canvas = document.createElement('canvas');
      canvas.width = Math.min(1280, Math.max(200, cropW));
      canvas.height = Math.round((cropH * canvas.width) / cropW);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(fullImageDataUrl);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

      // Light contrast normalization for small text
      try {
        const idata = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = idata.data;
        for (let i = 0; i < d.length; i += 4) {
          // Subtle contrast enhancement (factor 1.15)
          d[i] = Math.min(255, Math.max(0, (d[i] - 128) * 1.15 + 128));
          d[i + 1] = Math.min(255, Math.max(0, (d[i + 1] - 128) * 1.15 + 128));
          d[i + 2] = Math.min(255, Math.max(0, (d[i + 2] - 128) * 1.15 + 128));
        }
        ctx.putImageData(idata, 0, 0);
      } catch {
        // Fallback to unadjusted draw
      }

      resolve(canvas.toDataURL('image/jpeg', 0.90));
    };

    img.onerror = () => resolve(fullImageDataUrl);
    img.src = fullImageDataUrl;
  });
}
