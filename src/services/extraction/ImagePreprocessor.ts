/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EnhancementOptions {
  brightness?: number; // -100 to 100 (default +15)
  contrast?: number;   // 0.5 to 3.0 (default 1.35)
  sharpen?: boolean;   // true
  noiseReduction?: boolean; // true
  upscaleMinDimension?: number; // min width/height (default 1200)
}

/**
 * Perform Canvas-based image enhancement for Attempt 2 retry pipeline:
 * - Brightness boost
 * - Contrast boost
 * - Sharpening filter convolution
 * - Noise reduction / Bilateral smoothing approximation
 * - Image resize/upscale
 */
export class ImagePreprocessor {
  public static async enhanceImage(
    dataUrl: string,
    options: EnhancementOptions = {}
  ): Promise<string> {
    const {
      brightness = 15,
      contrast = 1.35,
      sharpen = true,
      noiseReduction = true,
      upscaleMinDimension = 1200,
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const origW = img.naturalWidth || img.width;
          const origH = img.naturalHeight || img.height;

          // Upscale low-resolution crops or keep optimal size
          let targetW = origW;
          let targetH = origH;

          if (origW < upscaleMinDimension || origH < upscaleMinDimension) {
            const scale = Math.max(
              upscaleMinDimension / Math.max(origW, 1),
              upscaleMinDimension / Math.max(origH, 1)
            );
            targetW = Math.round(origW * Math.min(scale, 2.5)); // Cap max 2.5x upscale
            targetH = Math.round(origH * Math.min(scale, 2.5));
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (!ctx) {
            throw new Error('Canvas context unavailable for image enhancement.');
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetW, targetH);

          const imgData = ctx.getImageData(0, 0, targetW, targetH);
          const data = imgData.data;

          // 1. Noise Reduction / Soft Box Blur pre-pass if enabled
          if (noiseReduction && targetW > 300 && targetH > 300) {
            this.applySimpleNoiseReduction(data, targetW, targetH);
          }

          // 2. Brightness & Contrast Adjustment
          const contrastFactor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

          for (let i = 0; i < data.length; i += 4) {
            let r = data[i] + brightness;
            let g = data[i + 1] + brightness;
            let b = data[i + 2] + brightness;

            r = contrastFactor * (r - 128) + 128;
            g = contrastFactor * (g - 128) + 128;
            b = contrastFactor * (b - 128) + 128;

            data[i] = Math.max(0, Math.min(255, Math.round(r)));
            data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
            data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
          }

          ctx.putImageData(imgData, 0, 0);

          // 3. Sharpening Filter Kernel Pass
          if (sharpen) {
            const sharpenedData = ctx.getImageData(0, 0, targetW, targetH);
            this.applySharpenKernel(sharpenedData.data, targetW, targetH);
            ctx.putImageData(sharpenedData, 0, 0);
          }

          const enhancedUrl = canvas.toDataURL('image/jpeg', 0.90);
          resolve(enhancedUrl);
        } catch (err) {
          console.warn('[ImagePreprocessor] Enhancement failed, returning original:', err);
          resolve(dataUrl);
        }
      };

      img.onerror = () => {
        console.warn('[ImagePreprocessor] Failed to load image for enhancement');
        resolve(dataUrl);
      };

      img.src = dataUrl;
    });
  }

  /**
   * Enhances a batch of image data URLs in parallel
   */
  public static async enhanceBatch(
    dataUrls: string[],
    options?: EnhancementOptions
  ): Promise<string[]> {
    if (!dataUrls || dataUrls.length === 0) return [];
    return Promise.all(dataUrls.map((url) => this.enhanceImage(url, options)));
  }

  private static applySimpleNoiseReduction(data: Uint8ClampedArray, width: number, height: number) {
    const copy = new Uint8ClampedArray(data);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) {
          const sum =
            copy[((y - 1) * width + (x - 1)) * 4 + c] +
            copy[((y - 1) * width + x) * 4 + c] +
            copy[((y - 1) * width + (x + 1)) * 4 + c] +
            copy[(y * width + (x - 1)) * 4 + c] +
            copy[idx + c] +
            copy[(y * width + (x + 1)) * 4 + c] +
            copy[((y + 1) * width + (x - 1)) * 4 + c] +
            copy[((y + 1) * width + x) * 4 + c] +
            copy[((y + 1) * width + (x + 1)) * 4 + c];
          data[idx + c] = Math.round(sum / 9);
        }
      }
    }
  }

  private static applySharpenKernel(data: Uint8ClampedArray, width: number, height: number) {
    const copy = new Uint8ClampedArray(data);
    // 3x3 Sharpen Kernel:
    //  0 -1  0
    // -1  5 -1
    //  0 -1  0
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) {
          const top = copy[((y - 1) * width + x) * 4 + c];
          const bottom = copy[((y + 1) * width + x) * 4 + c];
          const left = copy[(y * width + (x - 1)) * 4 + c];
          const right = copy[(y * width + (x + 1)) * 4 + c];
          const center = copy[idx + c];

          const val = center * 5 - (top + bottom + left + right);
          data[idx + c] = Math.max(0, Math.min(255, val));
        }
      }
    }
  }
}
