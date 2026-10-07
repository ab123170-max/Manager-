/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CropBox, autoCropAndOptimizeImage, detectExpiryOrBarcodeRegion } from '../../utils/smartLabelCropper';

export interface MultiCropCandidatesResult {
  expandedCrop: string;
  contractedCrop: string;
  textRegionCrop: string | null;
  candidates: string[];
}

export class CropManager {
  /**
   * Generates smart recrop candidates for Attempt 3:
   * 1. Expanded crop (+20% padding)
   * 2. Tight contracted crop (-10% padding)
   * 3. Specific text/date region crop (if detected)
   */
  public static async generateSmartRecropCandidates(
    fullFrameUrl: string
  ): Promise<MultiCropCandidatesResult> {
    try {
      const [expanded, contracted] = await Promise.all([
        autoCropAndOptimizeImage(fullFrameUrl, {
          paddingRatio: 0.22, // Expand bounding box
          maxDimension: 1400,
          quality: 0.90,
        }),
        autoCropAndOptimizeImage(fullFrameUrl, {
          paddingRatio: 0.04, // Contract tightly to label center
          maxDimension: 1200,
          quality: 0.88,
        }),
      ]);

      let textRegionCrop: string | null = null;
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((r, e) => {
          img.onload = r;
          img.onerror = e;
          img.src = fullFrameUrl;
        });

        const regionBox = detectExpiryOrBarcodeRegion(img);
        if (regionBox) {
          textRegionCrop = await this.cropSpecificRegion(fullFrameUrl, regionBox);
        }
      } catch (err) {
        console.debug('[CropManager] Text region sub-crop skipped:', err);
      }

      const candidates: string[] = [
        expanded.optimizedDataUrl,
        contracted.optimizedDataUrl,
      ];

      if (textRegionCrop) {
        candidates.push(textRegionCrop);
      }

      return {
        expandedCrop: expanded.optimizedDataUrl,
        contractedCrop: contracted.optimizedDataUrl,
        textRegionCrop,
        candidates,
      };
    } catch (err) {
      console.warn('[CropManager] Recrop candidates generation failed, using original full frame:', err);
      return {
        expandedCrop: fullFrameUrl,
        contractedCrop: fullFrameUrl,
        textRegionCrop: null,
        candidates: [fullFrameUrl],
      };
    }
  }

  /**
   * Helper to crop a specific Bounding Box region on Canvas
   */
  public static cropSpecificRegion(dataUrl: string, box: CropBox): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, box.width);
          canvas.height = Math.max(1, box.height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
          resolve(canvas.toDataURL('image/jpeg', 0.90));
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  /**
   * Full-frame fallback for Attempt 4: returns raw uncropped full camera frame(s)
   */
  public static getFullFrameFallback(originalFullFrames: string[]): string[] {
    return originalFullFrames && originalFullFrames.length > 0
      ? originalFullFrames
      : [];
  }
}
