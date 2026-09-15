/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PreprocessedImageResult, LocalOcrHypothesis, PreprocessingOptions } from '../types';

/**
 * ============================================================================
 * OPENCV-INSPIRED IMAGE PREPROCESSING VIA HTML5 CANVAS
 * ============================================================================
 * Simulates OpenCV pipeline operations:
 * 1. Grayscale luminance conversion (cv2.cvtColor(img, cv2.COLOR_BGR2GRAY))
 * 2. Contrast stretching & histogram normalization (cv2.equalizeHist)
 * 3. Adaptive binarization & thresholding for text edge enhancement (cv2.adaptiveThreshold)
 */
export async function preprocessImageCanvas(
  imageSource: string,
  options: PreprocessingOptions = {
    grayscale: false,
    contrastEnhance: true,
    adaptiveThreshold: false,
    invert: false,
    contrast: 1.25,
    sharpen: true,
  }
): Promise<PreprocessedImageResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          throw new Error('Canvas 2D context unavailable');
        }

        // Cap dimensions for performant client-side processing while maintaining high readability
        const maxDim = 1600;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const totalPixels = width * height;

        // Step 1: Calculate luminance and histogram stats
        let totalLum = 0;
        let minLum = 255;
        let maxLum = 0;

        for (let i = 0; i < data.length; i += 4) {
          const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          totalLum += lum;
          if (lum < minLum) minLum = lum;
          if (lum > maxLum) maxLum = lum;
        }

        const meanLuminance = totalPixels > 0 ? totalLum / totalPixels : 128;
        const lumRange = Math.max(maxLum - minLum, 1);

        // Step 2: Apply OpenCV-like transformations (contrast boost & gamma calibration)
        let edgeCount = 0;
        const contrastFactor = options.contrast || 1.2;

        for (let i = 0; i < data.length; i += 4) {
          let lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

          if (options.contrastEnhance) {
            lum = ((lum - minLum) / lumRange) * 255;
            lum = 255 * Math.pow(Math.max(0, Math.min(255, lum)) / 255, 0.9);
          }

          if (options.adaptiveThreshold) {
            const threshold = meanLuminance * 0.95;
            lum = lum > threshold ? 255 : 0;
          }

          if (options.invert) {
            lum = 255 - lum;
          }

          const clamped = Math.max(0, Math.min(255, Math.round(lum)));

          if (options.grayscale || options.adaptiveThreshold) {
            data[i] = clamped;
            data[i + 1] = clamped;
            data[i + 2] = clamped;
          } else {
            // Apply contrast factor directly
            const factor = (259 * (contrastFactor * 255 + 255)) / (255 * (259 - contrastFactor * 255));
            data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
            data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
            data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
          }

          if (clamped < 80 || clamped > 200) {
            edgeCount++;
          }
        }

        ctx.putImageData(imgData, 0, 0);

        const edgeDensity = totalPixels > 0 ? (edgeCount / totalPixels) * 100 : 0;
        const contrastRatio = lumRange / 255;
        const processedUrl = canvas.toDataURL('image/jpeg', 0.92);

        // Attempt extracting text cues if decoded from SVG or data string
        let rawText = '';
        if (imageSource.includes('data:image/svg+xml')) {
          try {
            rawText = decodeURIComponent(imageSource.split(',')[1] || '');
          } catch {
            rawText = '';
          }
        }
        const cues = extractLocalOcrCues(rawText);

        resolve({
          dataUrl: processedUrl,
          enhancedDataUrl: processedUrl,
          cues,
          width,
          height,
          stats: {
            meanLuminance: Math.round(meanLuminance),
            contrastRatio: Number(contrastRatio.toFixed(2)),
            edgeDensity: Number(edgeDensity.toFixed(1)),
          },
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for OpenCV preprocessing'));
    };

    img.src = imageSource;
  });
}

/**
 * ============================================================================
 * LOCAL OCR ASSIST & HEURISTIC PATTERN RECOGNITION
 * ============================================================================
 * Acts as the first extraction layer before the Gemini 3.8 supervisor.
 * Scans candidate text patterns (or SVG strings / local OCR hints) to extract
 * candidate tokens for barcodes, lot/batch numbers, manufacturing/expiry dates,
 * quantities, and MRPs.
 */
export function extractLocalOcrCues(rawTextOrSvg: string): LocalOcrHypothesis {
  const text = rawTextOrSvg || '';

  // Barcode / UPC heuristics (10-14 digits)
  const barcodeMatches = text.match(/\b\d{10,14}\b/g) || [];

  // Batch / Lot patterns (e.g. BATCH: B894, LOT: 2024-X, BN: 9942, B.NO.)
  const batchMatches = text.match(/(?:BATCH|LOT|B\.NO|BN|LOT NO)[\s.:#-]*([A-Z0-9\-_/]{3,15})/gi) || [];

  // Date patterns (YYYY-MM-DD, DD/MM/YYYY, MM/YYYY, Month YYYY)
  const dateMatches = text.match(
    /\b(?:\d{4}[-/.]\d{2}[-/.]\d{2}|\d{2}[-/.]\d{2}[-/.]\d{4}|\d{2}[-/.]\d{4})\b/g
  ) || [];

  // Prices / MRP patterns ($XX.XX, MRP: XX, Rs. XX, €XX)
  const priceMatches = text.match(
    /(?:MRP|PRICE|TOTAL|BALANCE DUE|AMOUNT)[\s.:$₹€£]*([0-9,]+(?:\.[0-9]{2})?)/gi
  ) || text.match(/[\$₹€£]\s*[0-9,]+(?:\.[0-9]{2})?/g) || [];

  // Quantities & Units (e.g., 500ml, 1kg, 250ml, 12 fl oz, 30 tablets)
  const quantityMatches = text.match(
    /\b\d+(?:\.\d+)?\s*(?:g|kg|mg|ml|l|oz|fl\s*oz|lbs|tablets|capsules|pack|pcs|count)\b/gi
  ) || [];

  // Key keywords detected
  const keywords: string[] = [];
  const keywordCandidates = [
    'EXPIRE', 'EXP', 'BEST BEFORE', 'USE BY', 'MFG', 'MFD', 'MANUFACTURED',
    'BATCH', 'LOT', 'SKU', 'BARCODE', 'NET WT', 'NET WEIGHT', 'MRP', 'INGREDIENTS',
    'DRIVER LICENSE', 'INVOICE', 'PASSPORT', 'IDENTIFICATION'
  ];

  for (const kw of keywordCandidates) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(text)) {
      keywords.push(kw);
    }
  }

  // Clean lines from text
  const lines = text
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && !l.startsWith('<') && !l.endsWith('>'))
    .slice(0, 30);

  return {
    possibleBarcodes: Array.from(new Set(barcodeMatches)),
    possibleBatchNumbers: Array.from(new Set(batchMatches)),
    possibleDates: Array.from(new Set(dateMatches)),
    possiblePrices: Array.from(new Set(priceMatches)),
    possibleQuantities: Array.from(new Set(quantityMatches)),
    extractedKeywords: keywords,
    rawTextLines: lines,
  };
}

/**
 * Runs canvas preprocessing and OCR cue extraction across multiple captured images,
 * merging the detected cues into a single combined hypothesis for the AI supervisor.
 */
export async function preprocessMultipleImages(
  imageSources: string[],
  options?: PreprocessingOptions
): Promise<{
  enhancedDataUrls: string[];
  combinedCues: LocalOcrHypothesis;
}> {
  if (imageSources.length === 0) {
    return {
      enhancedDataUrls: [],
      combinedCues: {
        possibleBarcodes: [],
        possibleBatchNumbers: [],
        possibleDates: [],
        possiblePrices: [],
        possibleQuantities: [],
        extractedKeywords: [],
        rawTextLines: [],
      },
    };
  }

  const results = await Promise.all(
    imageSources.map((src) => preprocessImageCanvas(src, options))
  );

  const enhancedDataUrls = results.map((r) => r.enhancedDataUrl);

  const combinedCues: LocalOcrHypothesis = {
    possibleBarcodes: Array.from(new Set(results.flatMap((r) => r.cues.possibleBarcodes))),
    possibleBatchNumbers: Array.from(new Set(results.flatMap((r) => r.cues.possibleBatchNumbers))),
    possibleDates: Array.from(new Set(results.flatMap((r) => r.cues.possibleDates))),
    possiblePrices: Array.from(new Set(results.flatMap((r) => r.cues.possiblePrices))),
    possibleQuantities: Array.from(new Set(results.flatMap((r) => r.cues.possibleQuantities))),
    extractedKeywords: Array.from(new Set(results.flatMap((r) => r.cues.extractedKeywords))),
    rawTextLines: Array.from(new Set(results.flatMap((r) => r.cues.rawTextLines))).slice(0, 40),
  };

  return {
    enhancedDataUrls,
    combinedCues,
  };
}
