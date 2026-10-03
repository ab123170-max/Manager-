/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExtractedFormData, LocalOcrHypothesis, ProductScanResult } from '../types';
import { parseDataUrl } from '../utils/imageEncoder';
import { GEMINI_MODEL } from '../config/model';
import { reconcileProductDates } from '../utils/productDateCalculator';
import { getAppSettings } from '../utils/unifiedDataStore';
import { autoCropAndOptimizeBatch, tempImageManager } from '../utils/smartLabelCropper';
import { getApiUrl, formatUserFriendlyError } from '../config/apiConfig';

/**
 * ============================================================================
 * SECURE SERVER-SIDE ARCHITECTURE & GEMINI 3.7 VISION SUPERVISOR
 * ============================================================================
 * The Gemini API key is securely managed exclusively server-side via Express
 * using `process.env.GEMINI_API_KEY`.
 * 
 * The client communicates with `/api/extract-form` and passes:
 * - Base64 image data (supports multi-shot synchronous capture up to 5 photos)
 * - Local OCR pre-extraction cues
 * 
 * The server invokes Gemini to extract and calculate ONLY the 5 required fields:
 * 1. Product Name
 * 2. Price
 * 3. Date of Manufacture (MFD)
 * 4. Date of Expiry (EXP)
 * 5. Best Before (Months)
 */
export const API_KEY_PLACEHOLDER = 'YOUR_API_KEY';

export interface ExtractionRequestOptions {
  localOcrCues?: LocalOcrHypothesis;
  optionalUserApiKey?: string;
  autoDeleteImages?: boolean;
}

export interface ExtractionErrorDetails {
  code: string;
  message: string;
  remediation?: string;
}

export interface ImageInputItem {
  dataUrl: string;
  mimeType?: string;
}

/**
 * Strict 5-Field Multi-Shot Product Extraction
 * Dispatches multiple images (up to 5) to the server-side vision engine
 * Returns only the 5 required fields with confidence and date calculation
 */
export async function extractProduct5FieldsFromImages(
  images: (string | ImageInputItem)[],
  options?: ExtractionRequestOptions
): Promise<ProductScanResult> {
  if (!images || images.length === 0) {
    throw new Error('No images provided for product scan.');
  }

  // 1. Extract raw image data URLs
  const rawUrls = images.map((item) => (typeof item === 'string' ? item : item.dataUrl));

  // 2. Automatically detect label boundaries, crop out empty background, and optimize resolution/compression
  let processedUrls: string[] = rawUrls;
  try {
    const { optimizedImages } = await autoCropAndOptimizeBatch(rawUrls, {
      maxDimension: 1200,
      quality: 0.85,
      paddingRatio: 0.10,
    });
    if (optimizedImages && optimizedImages.length > 0) {
      processedUrls = optimizedImages;
    }
  } catch (cropErr) {
    console.warn('Smart crop fell back to original images:', cropErr);
  }

  // 3. Register temporary images into the lifecycle manager for cleanup after save/cancel
  const tempSessionId = `scan-${Date.now()}`;
  tempImageManager.register(tempSessionId, processedUrls);

  // 4. Parse optimized images into clean base64 data payloads
  const parsedImages = processedUrls.map((rawUrl, idx) => {
    const { mimeType, base64Data } = parseDataUrl(rawUrl);
    const originalItem = images[idx];
    return {
      imageBase64: base64Data,
      mimeType: typeof originalItem !== 'string' && originalItem.mimeType ? originalItem.mimeType : mimeType,
    };
  });

  let response: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const endpoint = getApiUrl('/api/extract-form');
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        images: parsedImages,
        localOcrCues: options?.localOcrCues,
        apiKey:
          options?.optionalUserApiKey ||
          (API_KEY_PLACEHOLDER !== 'YOUR_API_KEY' ? API_KEY_PLACEHOLDER : undefined),
      }),
    });
  } catch (netErr: unknown) {
    const err = netErr as Error;
    console.warn('[AI Analysis] Network request failed:', err?.message || err);
    if (err?.name === 'AbortError') {
      const timeoutErr = new Error('Analysis timed out. Please check your internet connection and try again.');
      (timeoutErr as any).code = 'TIMEOUT';
      throw timeoutErr;
    }
    const connectionErr = new Error('Network unavailable. Please check your internet connection and try again.');
    (connectionErr as any).code = 'NETWORK_ERROR';
    throw connectionErr;
  } finally {
    clearTimeout(timeoutId);
  }

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    const errorCode = result.code || (response.status === 429 ? 'RATE_LIMIT_EXCEEDED' : response.status === 401 ? 'API_KEY_INVALID' : 'EXTRACTION_FAILED');
    console.warn(`[AI Analysis] Server returned ${response.status}:`, result?.error || errorCode);
    const friendlyMsg = formatUserFriendlyError({ code: errorCode, message: result?.error });
    const customErr = new Error(friendlyMsg);
    (customErr as unknown as { code: string }).code = errorCode;
    throw customErr;
  }

  const raw = result.data || {};
  const photosCount = result.photosAnalyzedCount || images.length;

  // Run client-side reconciliation as an additional precision guarantee
  const reconciled = reconcileProductDates(
    raw.manufactureDate,
    raw.expiryDate,
    typeof raw.bestBeforeMonths === 'number' ? raw.bestBeforeMonths : null
  );

  let finalPrice: number | null = null;
  if (typeof raw.price === 'number' && !isNaN(raw.price)) {
    finalPrice = raw.price;
  } else if (typeof raw.price === 'string') {
    const num = parseFloat(raw.price.replace(/[^0-9.]/g, ''));
    if (!isNaN(num)) finalPrice = num;
  } else if (typeof raw.mrp === 'string') {
    const num = parseFloat(raw.mrp.replace(/[^0-9.]/g, ''));
    if (!isNaN(num)) finalPrice = num;
  }

  const appSettings = getAppSettings();
  const defaultCurrencyCode = (appSettings.currency === '$' ? 'USD' : appSettings.currency === '₹' ? 'INR' : appSettings.currency === 'रु' || appSettings.currency === 'Rs' ? 'NPR' : appSettings.currency || 'USD').toUpperCase();

  const detectedCurrency = raw.currency ? String(raw.currency).trim().toUpperCase() : defaultCurrencyCode;
  const detectedQuantity = typeof raw.quantity === 'number' && raw.quantity > 0 ? raw.quantity : 1;
  const detectedUnit = raw.unit ? String(raw.unit).trim() : 'pcs';
  const detectedLanguage = raw.detectedLanguage ? String(raw.detectedLanguage).trim() : 'English';

  const warningsList: string[] = Array.isArray(raw.warnings) ? [...raw.warnings] : [];

  const conf = raw.confidence || {};
  if (!raw.currency || (conf.currency !== undefined && conf.currency < 0.7)) {
    if (!warningsList.some(w => w.toLowerCase().includes('currency'))) {
      warningsList.push('Please confirm currency');
    }
  }
  if (!raw.unit || (conf.unit !== undefined && conf.unit < 0.7)) {
    if (!warningsList.some(w => w.toLowerCase().includes('unit'))) {
      warningsList.push('Please confirm unit');
    }
  }
  if (!raw.detectedLanguage || (conf.detectedLanguage !== undefined && conf.detectedLanguage < 0.7)) {
    if (!warningsList.some(w => w.toLowerCase().includes('language'))) {
      warningsList.push('Please confirm language');
    }
  }

  return {
    productName: (raw.productName || '').trim(),
    price: finalPrice,
    currency: detectedCurrency,
    manufactureDate: reconciled.manufactureDate,
    expiryDate: reconciled.expiryDate,
    bestBeforeMonths: reconciled.bestBeforeMonths,
    quantity: detectedQuantity,
    unit: detectedUnit,
    detectedLanguage,
    isCalculatedExpiry: reconciled.isCalculatedExpiry || Boolean(raw.isCalculatedExpiry),
    confidence: {
      productName: conf.productName ?? (raw.productName ? 0.95 : 0.0),
      price: conf.price ?? (finalPrice !== null ? 0.90 : 0.0),
      currency: conf.currency ?? (raw.currency ? 0.90 : 0.4),
      manufactureDate: conf.manufactureDate ?? (reconciled.manufactureDate ? 0.95 : 0.0),
      expiryDate: conf.expiryDate ?? (reconciled.expiryDate ? 0.95 : 0.0),
      bestBeforeMonths: conf.bestBeforeMonths ?? (reconciled.bestBeforeMonths !== null ? 0.90 : 0.0),
      quantity: conf.quantity ?? 0.90,
      unit: conf.unit ?? (raw.unit ? 0.90 : 0.4),
      detectedLanguage: conf.detectedLanguage ?? (raw.detectedLanguage ? 0.95 : 0.5),
      overall: conf.overall ?? 0.92,
    },
    photosCount,
    capturedImages: processedUrls,
    warnings: warningsList,
  };
}

/**
 * Dispatches multiple images (or a single image) and local OCR cues to the server-side Gemini 3.7 Vision supervisor.
 * Synthesizes required information across all provided photos into a unified structured record.
 */
export async function extractFormDataFromImages(
  images: (string | ImageInputItem)[],
  options?: ExtractionRequestOptions
): Promise<ExtractedFormData> {
  if (!images || images.length === 0) {
    throw new Error('No images provided for extraction.');
  }

  // 1. Extract raw image data URLs
  const rawUrls = images.map((item) => (typeof item === 'string' ? item : item.dataUrl));

  // 2. Automatically crop background and optimize compression
  let processedUrls: string[] = rawUrls;
  try {
    const { optimizedImages } = await autoCropAndOptimizeBatch(rawUrls, {
      maxDimension: 1200,
      quality: 0.85,
      paddingRatio: 0.10,
    });
    if (optimizedImages && optimizedImages.length > 0) {
      processedUrls = optimizedImages;
    }
  } catch (cropErr) {
    console.warn('Smart crop fell back to raw images:', cropErr);
  }

  // 3. Register temporary session images
  const tempSessionId = `form-${Date.now()}`;
  tempImageManager.register(tempSessionId, processedUrls);

  // 4. Parse optimized images into base64
  const parsedImages = processedUrls.map((rawUrl, idx) => {
    const { mimeType, base64Data } = parseDataUrl(rawUrl);
    const originalItem = images[idx];
    return {
      imageBase64: base64Data,
      mimeType: (typeof originalItem !== 'string' && originalItem.mimeType) ? originalItem.mimeType : mimeType,
    };
  });

  let response: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const endpoint = getApiUrl('/api/extract-form');
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        images: parsedImages,
        localOcrCues: options?.localOcrCues,
        // Optional override key if specified in settings UI
        apiKey:
          options?.optionalUserApiKey ||
          (API_KEY_PLACEHOLDER !== 'YOUR_API_KEY' ? API_KEY_PLACEHOLDER : undefined),
      }),
    });
  } catch (netErr: unknown) {
    const err = netErr as Error;
    console.warn('[AI Analysis] Network request failed:', err?.message || err);
    if (err?.name === 'AbortError') {
      const timeoutErr = new Error('Analysis timed out. Please check your internet connection and try again.');
      (timeoutErr as any).code = 'TIMEOUT';
      throw timeoutErr;
    }
    const connectionErr = new Error('Network unavailable. Please check your internet connection and try again.');
    (connectionErr as any).code = 'NETWORK_ERROR';
    throw connectionErr;
  } finally {
    clearTimeout(timeoutId);
  }

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    const errorCode = result.code || (response.status === 429 ? 'RATE_LIMIT_EXCEEDED' : response.status === 401 ? 'API_KEY_INVALID' : 'EXTRACTION_FAILED');
    console.warn(`[AI Analysis] Server returned ${response.status}:`, result?.error || errorCode);
    const friendlyMsg = formatUserFriendlyError({ code: errorCode, message: result?.error });
    const customErr = new Error(friendlyMsg);
    (customErr as unknown as { code: string }).code = errorCode;
    throw customErr;
  }

  const raw = result.data || {};
  const photosCount = result.photosAnalyzedCount || images.length;

  // Strict structured mapping adhering to Requirements 5, 7, and 8
  const formattedData: ExtractedFormData = {
    // Classification
    isProductOrPackage: Boolean(raw.isProductOrPackage),
    documentType: raw.documentType || (raw.isProductOrPackage ? 'Product Package / Label' : 'Official Document'),

    // Product fields (Requirement 7)
    productName: raw.productName || '',
    brand: raw.brand || '',
    category: raw.category || '',
    sku: raw.sku || '',
    barcode: raw.barcode || '',
    batchNumber: raw.batchNumber || '',
    manufacturingDate: raw.manufacturingDate || '',
    expiryDate: raw.expiryDate || '',
    bestBefore: raw.bestBefore || '',
    quantity: raw.quantity || '',
    unit: raw.unit || '',
    mrp: raw.mrp || '',

    // Confidence mapping per field
    confidence: raw.confidence && typeof raw.confidence === 'object' ? raw.confidence : {},
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
    missingFields: Array.isArray(raw.missingFields) ? raw.missingFields : [],

    // Document / Identity fields
    fullName: raw.fullName || raw.productName || '',
    documentNumber: raw.documentNumber || raw.sku || raw.barcode || '',
    dateOfBirth: raw.dateOfBirth || '',
    issueDate: raw.issueDate || raw.manufacturingDate || '',
    email: raw.email || '',
    phone: raw.phone || '',
    address: raw.address || '',
    organization: raw.organization || raw.brand || '',
    nationality: raw.nationality || '',
    notesOrAdditional: raw.notesOrAdditional || '',

    confidenceScore:
      typeof raw.confidenceScore === 'number'
        ? raw.confidenceScore
        : 0.95,

    customFields: Array.isArray(raw.customFields)
      ? raw.customFields.map(
          (f: { key?: string; value?: string; confidence?: number }, idx: number) => ({
            id: `custom_${idx}_${Date.now()}`,
            key: f.key || `Attribute ${idx + 1}`,
            value: f.value || '',
            confidence: f.confidence,
          })
        )
      : [],

    photosCount,
    photosAutoDeleted: options?.autoDeleteImages ?? true,
    localOcrAssisted: Boolean(options?.localOcrCues),
    rawOcrCuesDetected: options?.localOcrCues?.extractedKeywords,
  };

  return formattedData;
}

/**
 * Dispatches a single image and local OCR cues to the server-side Gemini 3.7 Vision supervisor.
 * (Preserved for backwards compatibility, delegating to extractFormDataFromImages).
 */
export async function extractFormDataFromImage(
  imageBase64: string,
  options?: ExtractionRequestOptions
): Promise<ExtractedFormData> {
  return extractFormDataFromImages([imageBase64], options);
}

/**
 * Supervised validation for Barcode-to-Product pipeline using Gemini Vision supervisor.
 */
export async function superviseBarcodePipeline(params: {
  barcode: string;
  databaseProduct: unknown;
  ocrTextLines?: string[];
  images?: (string | ImageInputItem)[];
  optionalUserApiKey?: string;
}): Promise<any> {
  const { barcode, databaseProduct, ocrTextLines = [], images = [], optionalUserApiKey } = params;

  const parsedImages = images.map((item) => {
    const rawUrl = typeof item === 'string' ? item : item.dataUrl;
    const { mimeType, base64Data } = parseDataUrl(rawUrl);
    return {
      imageBase64: base64Data,
      mimeType: typeof item !== 'string' && item.mimeType ? item.mimeType : mimeType,
    };
  });

  try {
    const response = await fetch(getApiUrl('/api/supervise-barcode-pipeline'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        barcode,
        databaseProduct,
        ocrTextLines,
        images: parsedImages,
        apiKey:
          optionalUserApiKey ||
          (API_KEY_PLACEHOLDER !== 'YOUR_API_KEY' ? API_KEY_PLACEHOLDER : undefined),
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (result && result.success && result.data) {
      return result.data;
    }
  } catch (err) {
    console.debug('superviseBarcodePipeline error fallback:', err);
  }
  return null;
}


