/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================================
 * SMART LABEL CROPPING & IMAGE OPTIMIZATION PIPELINE
 * ============================================================================
 * Automatically detects the minimum usable region containing the product label
 * and text (Product Name, Price, MFD, EXP, Best Before), crops away background,
 * empty space, and surfaces (tables/walls/floors), and optimizes the image
 * resolution and compression before sending it to OCR and Gemini Vision.
 *
 * All cropped and original images in this pipeline are strictly temporary and
 * are discarded after validation, saving, or cancellation.
 */

export interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OptimizedCropResult {
  /** Optimized Base64 data URL ready for OCR/Gemini */
  optimizedDataUrl: string;
  /** Bounding box coordinates on the original image */
  cropBox: CropBox;
  /** Dimensions of original image */
  originalWidth: number;
  originalHeight: number;
  /** Dimensions of optimized cropped image */
  croppedWidth: number;
  croppedHeight: number;
  /** Estimated byte size of original vs optimized */
  originalBytes: number;
  optimizedBytes: number;
  /** Percent payload saved (e.g. 75 = 75% smaller payload) */
  savingsPercent: number;
}

export interface SmartCropOptions {
  /** Max dimension (width or height) for the final optimized cropped image. Default 1200px */
  maxDimension?: number;
  /** JPEG compression quality (0.1 to 1.0). Default 0.85 */
  quality?: number;
  /** Safety padding percentage around detected text bounds (0.05 to 0.20). Default 0.10 (10%) */
  paddingRatio?: number;
  /** Minimum area fraction to consider a valid sub-crop vs full image. Default 0.15 */
  minAreaFraction?: number;
}

/**
 * In-memory temporary image session registry to ensure temporary images
 * are tracked and released immediately after extraction or saving.
 */
class TemporaryImageLifecycleManager {
  private tempSessionImages = new Map<string, string[]>();

  public register(sessionId: string, dataUrls: string[]) {
    this.tempSessionImages.set(sessionId, dataUrls);
  }

  public get(sessionId: string): string[] {
    return this.tempSessionImages.get(sessionId) || [];
  }

  public clear(sessionId: string) {
    const images = this.tempSessionImages.get(sessionId);
    if (images) {
      // Help garbage collector release large base64 strings
      images.length = 0;
      this.tempSessionImages.delete(sessionId);
    }
  }

  public clearAll() {
    this.tempSessionImages.forEach((images) => {
      images.length = 0;
    });
    this.tempSessionImages.clear();
  }
}

export const tempImageManager = new TemporaryImageLifecycleManager();

/**
 * Loads an image from a Data URL into an HTMLImageElement
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for label detection'));
    img.src = dataUrl;
  });
}

/**
 * Detects the minimum usable bounding box containing text and label information
 * using fast client-side luminance variance and high-gradient edge density.
 */
function detectLabelBoundingBox(
  img: HTMLImageElement,
  paddingRatio: number = 0.10,
  minAreaFraction: number = 0.15
): CropBox {
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  // Analysis canvas downscaled for high-speed analysis (<20ms)
  const analysisMax = 360;
  let sampleW = origW;
  let sampleH = origH;

  if (sampleW > analysisMax || sampleH > analysisMax) {
    if (sampleW > sampleH) {
      sampleH = Math.round((sampleH * analysisMax) / sampleW);
      sampleW = analysisMax;
    } else {
      sampleW = Math.round((sampleW * analysisMax) / sampleH);
      sampleH = analysisMax;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = sampleW;
  canvas.height = sampleH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    return { x: 0, y: 0, width: origW, height: origH };
  }

  ctx.drawImage(img, 0, 0, sampleW, sampleH);
  const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
  const data = imgData.data;

  // Divide into grid blocks (e.g. 12x12 pixels)
  const blockSize = 12;
  const cols = Math.floor(sampleW / blockSize);
  const rows = Math.floor(sampleH / blockSize);

  if (cols <= 2 || rows <= 2) {
    return { x: 0, y: 0, width: origW, height: origH };
  }

  // Compute luminance map
  const luminance = new Float32Array(sampleW * sampleH);
  for (let i = 0; i < sampleW * sampleH; i++) {
    const p = i * 4;
    luminance[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }

  // Calculate high-frequency energy (horizontal + vertical Sobel-like gradients)
  // Text regions characteristically exhibit strong bidirectional gradients and variance
  const blockScores: number[] = new Array(cols * rows).fill(0);
  let totalScore = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let blockGrad = 0;
      let minLum = 255;
      let maxLum = 0;

      const startX = c * blockSize;
      const startY = r * blockSize;

      for (let y = startY + 1; y < startY + blockSize - 1 && y < sampleH - 1; y++) {
        for (let x = startX + 1; x < startX + blockSize - 1 && x < sampleW - 1; x++) {
          const idx = y * sampleW + x;
          const lum = luminance[idx];
          if (lum < minLum) minLum = lum;
          if (lum > maxLum) maxLum = lum;

          const dx = Math.abs(luminance[idx + 1] - luminance[idx - 1]);
          const dy = Math.abs(luminance[(y + 1) * sampleW + x] - luminance[(y - 1) * sampleW + x]);
          blockGrad += dx + dy;
        }
      }

      // Contrast range + gradient energy combination
      const contrast = maxLum - minLum;
      const score = (blockGrad / (blockSize * blockSize)) * (contrast / 255);
      const bIdx = r * cols + c;
      blockScores[bIdx] = score;
      totalScore += score;
    }
  }

  const avgScore = totalScore / (cols * rows);
  // Threshold: blocks with significantly above average local contrast and gradient
  const threshold = Math.max(avgScore * 0.85, 4.0);

  // Find bounding box enclosing text blocks
  let minCol = cols;
  let maxCol = -1;
  let minRow = rows;
  let maxRow = -1;
  let activeBlockCount = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const score = blockScores[r * cols + c];
      if (score >= threshold) {
        activeBlockCount++;
        if (c < minCol) minCol = c;
        if (c > maxCol) maxCol = c;
        if (r < minRow) minRow = r;
        if (r > maxRow) maxRow = r;
      }
    }
  }

  // If no clear high-contrast regions detected or too few blocks
  if (activeBlockCount < 4 || minCol > maxCol || minRow > maxRow) {
    return { x: 0, y: 0, width: origW, height: origH };
  }

  // Scale back to original coordinates
  const scaleX = origW / sampleW;
  const scaleY = origH / sampleH;

  let rawX = minCol * blockSize * scaleX;
  let rawY = minRow * blockSize * scaleY;
  let rawW = (maxCol - minCol + 1) * blockSize * scaleX;
  let rawH = (maxRow - minRow + 1) * blockSize * scaleY;

  // Add safe padding so text characters, dates, or prices on edges are not truncated
  const padX = Math.round(rawW * paddingRatio);
  const padY = Math.round(rawH * paddingRatio);

  const cropX = Math.max(0, Math.floor(rawX - padX));
  const cropY = Math.max(0, Math.floor(rawY - padY));
  const cropW = Math.min(origW - cropX, Math.ceil(rawW + padX * 2));
  const cropH = Math.min(origH - cropY, Math.ceil(rawH + padY * 2));

  // Check if detected area is reasonable:
  // If the crop area is too minuscule (e.g. less than minAreaFraction of image), it might be a reflection;
  // If it covers more than 92% of the image, the user has already framed the label well.
  const areaRatio = (cropW * cropH) / (origW * origH);
  if (areaRatio < minAreaFraction) {
    // Expand gently centered around the detected center
    const centerX = cropX + cropW / 2;
    const centerY = cropY + cropH / 2;
    const targetW = Math.min(origW, origW * 0.75);
    const targetH = Math.min(origH, origH * 0.75);
    return {
      x: Math.max(0, Math.round(centerX - targetW / 2)),
      y: Math.max(0, Math.round(centerY - targetH / 2)),
      width: Math.min(origW, Math.round(targetW)),
      height: Math.min(origH, Math.round(targetH)),
    };
  }

  if (areaRatio > 0.92) {
    // Already nicely framed
    return { x: 0, y: 0, width: origW, height: origH };
  }

  return {
    x: cropX,
    y: cropY,
    width: cropW,
    height: cropH,
  };
}

/**
 * Automatically crops the minimum usable label region from an image and
 * produces an optimized, lightweight Base64 image for OCR/Gemini.
 */
export async function autoCropAndOptimizeImage(
  dataUrl: string,
  options: SmartCropOptions = {}
): Promise<OptimizedCropResult> {
  const {
    maxDimension = 1200,
    quality = 0.85,
    paddingRatio = 0.10,
    minAreaFraction = 0.15,
  } = options;

  const originalBytes = Math.round((dataUrl.length * 3) / 4);
  const img = await loadImage(dataUrl);

  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  // 1. Detect minimum usable bounding box for label & text
  const cropBox = detectLabelBoundingBox(img, paddingRatio, minAreaFraction);

  // 2. Determine target output dimensions (scaled down if exceeding maxDimension)
  let targetW = cropBox.width;
  let targetH = cropBox.height;

  if (targetW > maxDimension || targetH > maxDimension) {
    if (targetW > targetH) {
      targetH = Math.round((targetH * maxDimension) / targetW);
      targetW = maxDimension;
    } else {
      targetW = Math.round((targetW * maxDimension) / targetH);
      targetH = maxDimension;
    }
  }

  // 3. Draw cropped region onto destination canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context creation failed.');
  }

  // Enable high quality image scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    img,
    cropBox.x,
    cropBox.y,
    cropBox.width,
    cropBox.height,
    0,
    0,
    targetW,
    targetH
  );

  // 4. Output optimized JPEG
  const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
  const optimizedBytes = Math.round((optimizedDataUrl.length * 3) / 4);
  const savingsPercent = Math.max(
    0,
    Math.round(((originalBytes - optimizedBytes) / originalBytes) * 100)
  );

  return {
    optimizedDataUrl,
    cropBox,
    originalWidth: origW,
    originalHeight: origH,
    croppedWidth: targetW,
    croppedHeight: targetH,
    originalBytes,
    optimizedBytes,
    savingsPercent,
  };
}

/**
 * Optimizes a list of images (1 to 5 photos) by auto-cropping the label
 * in each photo and downscaling/compressing to minimum viable size.
 */
export async function autoCropAndOptimizeBatch(
  images: string[],
  options?: SmartCropOptions
): Promise<{
  optimizedImages: string[];
  stats: {
    totalOriginalBytes: number;
    totalOptimizedBytes: number;
    totalSavingsPercent: number;
    crops: CropBox[];
  };
}> {
  if (!images || images.length === 0) {
    return {
      optimizedImages: [],
      stats: {
        totalOriginalBytes: 0,
        totalOptimizedBytes: 0,
        totalSavingsPercent: 0,
        crops: [],
      },
    };
  }

  const results = await Promise.all(
    images.map((img) => autoCropAndOptimizeImage(img, options))
  );

  let totalOrig = 0;
  let totalOpt = 0;
  const crops: CropBox[] = [];

  for (const r of results) {
    totalOrig += r.originalBytes;
    totalOpt += r.optimizedBytes;
    crops.push(r.cropBox);
  }

  const totalSavingsPercent =
    totalOrig > 0 ? Math.round(((totalOrig - totalOpt) / totalOrig) * 100) : 0;

  return {
    optimizedImages: results.map((r) => r.optimizedDataUrl),
    stats: {
      totalOriginalBytes: totalOrig,
      totalOptimizedBytes: totalOpt,
      totalSavingsPercent,
      crops,
    },
  };
}
