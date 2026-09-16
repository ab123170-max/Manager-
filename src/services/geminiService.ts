/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExtractedFormData, LocalOcrHypothesis, ExtractedInvoiceData } from '../types';
import { parseDataUrl } from '../utils/imageEncoder';
import { GEMINI_MODEL } from '../config/model';

/**
 * ============================================================================
 * SECURE SERVER-SIDE ARCHITECTURE & GEMINI 3.7 VISION SUPERVISOR
 * ============================================================================
 * The Gemini API key is securely managed exclusively server-side via Express
 * using `process.env.GEMINI_API_KEY`.
 * 
 * The client communicates with `/api/extract-form` and passes:
 * - Base64 image data
 * - Local OCR pre-extraction cues (from OpenCV-style canvas preprocessing)
 * 
 * The server invokes Gemini 3.7 (model: GEMINI_MODEL = 'gemini-3.7-flash')
 * as the vision supervisor to validate OCR, interpret product labels,
 * extract barcodes, batch numbers, expiry dates, and return strict structured JSON.
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

  // Parse all incoming images
  const parsedImages = images.map((item) => {
    const rawUrl = typeof item === 'string' ? item : item.dataUrl;
    const { mimeType, base64Data } = parseDataUrl(rawUrl);
    return {
      imageBase64: base64Data,
      mimeType: (typeof item !== 'string' && item.mimeType) ? item.mimeType : mimeType,
    };
  });

  let response: Response;
  try {
    response = await fetch('/api/extract-form', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: parsedImages,
        localOcrCues: options?.localOcrCues,
        // Optional override key if specified in settings UI
        apiKey:
          options?.optionalUserApiKey ||
          (API_KEY_PLACEHOLDER !== 'YOUR_API_KEY' ? API_KEY_PLACEHOLDER : undefined),
      }),
    });
  } catch (netErr) {
    throw new Error(
      'Network failure: Could not reach the server API. Check your internet connection.'
    );
  }

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    const errorCode = result.code || 'UNKNOWN_ERROR';
    let userFriendlyMsg = result.error || 'Extraction failed.';

    if (errorCode === 'API_KEY_INVALID' || response.status === 401) {
      userFriendlyMsg =
        'Gemini API Key Error: Your GEMINI_API_KEY is missing or invalid. Please verify it in Settings or the environment.';
    } else if (errorCode === 'MODEL_NOT_FOUND') {
      userFriendlyMsg = `Model Error: Model '${GEMINI_MODEL}' was not found. Please verify your API access or update the model in Settings.`;
    } else if (response.status === 404) {
      userFriendlyMsg =
        'Backend Route 404: The server endpoint (/api/extract-form) was not found on this deployment. If deployed on Vercel as a static SPA, configure serverless routes or deploy to a container platform (Cloud Run / Render).';
    } else if (errorCode === 'INVALID_MODEL_NAME') {
      userFriendlyMsg = `Model Identifier Error: ${result.error || `Invalid model format. System reverted to ${GEMINI_MODEL}.`}`;
    } else if (errorCode === 'MODEL_HIGH_DEMAND' || response.status === 503) {
      userFriendlyMsg =
        'High Demand: Gemini is temporarily experiencing high traffic. Please retry in a few moments.';
    } else if (errorCode === 'RATE_LIMIT_EXCEEDED' || response.status === 429) {
      userFriendlyMsg =
        'Rate Limit Reached: Gemini API quota exceeded. Please wait a few seconds and retry.';
    } else if (errorCode === 'JSON_PARSE_ERROR') {
      userFriendlyMsg =
        'AI Parse Error: Gemini returned an unparseable response. Retrying with a clearer image usually resolves this.';
    } else if (errorCode === 'IMAGE_PROCESSING_FAILED') {
      userFriendlyMsg =
        'Image Error: Could not decode the captured images. Please retake the photos.';
    }

    const customErr = new Error(userFriendlyMsg);
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
 * Extracts structured invoice data from one or multiple invoice images using Gemini Vision.
 */
export async function extractInvoiceFromImages(
  images: (string | ImageInputItem)[],
  options?: ExtractionRequestOptions
): Promise<ExtractedInvoiceData> {
  if (!images || images.length === 0) {
    throw new Error('No invoice images provided.');
  }

  const parsedImages = images.map((item) => {
    const rawUrl = typeof item === 'string' ? item : item.dataUrl;
    const { mimeType, base64Data } = parseDataUrl(rawUrl);
    return {
      imageBase64: base64Data,
      mimeType: (typeof item !== 'string' && item.mimeType) ? item.mimeType : mimeType,
    };
  });

  let response: Response;
  try {
    response = await fetch('/api/extract-invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: parsedImages,
        apiKey:
          options?.optionalUserApiKey ||
          (API_KEY_PLACEHOLDER !== 'YOUR_API_KEY' ? API_KEY_PLACEHOLDER : undefined),
      }),
    });
  } catch {
    throw new Error(
      'Network failure: Could not reach invoice extraction service.'
    );
  }

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to extract invoice data.');
  }

  const raw = result.data || {};

  return {
    invoiceNumber: raw.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
    invoiceDate: raw.invoiceDate || new Date().toISOString().split('T')[0],
    supplier: raw.supplier || 'Vendor / Supplier',
    customerName: raw.customerName || '',
    items: Array.isArray(raw.items)
      ? raw.items.map((item: any) => ({
          productName: item.productName || 'Line Item',
          barcode: item.barcode || '',
          quantity: Number(item.quantity) || 1,
          unit: item.unit || 'units',
          unitPrice: Number(item.unitPrice) || 0,
          totalPrice: Number(item.totalPrice) || (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
          taxRate: item.taxRate ? Number(item.taxRate) : undefined,
          discount: item.discount ? Number(item.discount) : undefined,
          mfd: item.mfd || '',
          exp: item.exp || '',
          batchNumber: item.batchNumber || '',
        }))
      : [],
    subtotal: Number(raw.subtotal) || 0,
    taxAmount: Number(raw.taxAmount) || 0,
    discountAmount: Number(raw.discountAmount) || 0,
    grandTotal: Number(raw.grandTotal) || 0,
    confidence: raw.confidence || {},
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
  };
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
    const response = await fetch('/api/supervise-barcode-pipeline', {
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


