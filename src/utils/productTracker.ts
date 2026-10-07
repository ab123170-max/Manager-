/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DetectedRegion, NormalizedRect, cropNormalizedRegion } from './realtimeProductDetector';
import { ProductScanResult } from '../types';

export type FieldStatus = 'missing' | 'detected' | 'complete';

export interface FieldEntry<T = string | number | null> {
  value: T;
  status: FieldStatus;
  confidence: number;
  sourceShotId?: string;
}

export interface TrackedProductFields {
  productName: FieldEntry<string>;
  brand: FieldEntry<string>;
  price: FieldEntry<number | null>;
  currency: FieldEntry<string>;
  manufactureDate: FieldEntry<string>;
  expiryDate: FieldEntry<string>;
  bestBeforeMonths: FieldEntry<number | null>;
  barcode: FieldEntry<string>;
  batchNumber: FieldEntry<string>;
}

export interface TrackedShotRecord {
  id: string;
  image: string; // Full capture image
  croppedProductImage?: string; // Auto-cropped product bounding area
  timestamp: number;
  label: string;
  completedField?: string; // Field ID completed by this shot
  cropRegions?: {
    type: string;
    cropDataUrl: string;
  }[];
}

export interface TrackedProduct {
  id: string;
  createdAt: number;
  lastUpdated: number;
  trackingState: 'searching' | 'detected' | 'tracking' | 'stable';
  productBox: NormalizedRect | null;
  dominantColor: string;
  shots: TrackedShotRecord[];
  fields: TrackedProductFields;
  historyLabels: string[];
}

/**
 * Creates an empty fresh TrackedProduct state
 */
export function createNewTrackedProduct(): TrackedProduct {
  return {
    id: `prod-${Date.now()}`,
    createdAt: Date.now(),
    lastUpdated: Date.now(),
    trackingState: 'searching',
    productBox: null,
    dominantColor: '#10b981',
    shots: [],
    historyLabels: [],
    fields: {
      productName: { value: '', status: 'missing', confidence: 0 },
      brand: { value: '', status: 'missing', confidence: 0 },
      price: { value: null, status: 'missing', confidence: 0 },
      currency: { value: 'USD', status: 'missing', confidence: 0 },
      manufactureDate: { value: '', status: 'missing', confidence: 0 },
      expiryDate: { value: '', status: 'missing', confidence: 0 },
      bestBeforeMonths: { value: null, status: 'missing', confidence: 0 },
      barcode: { value: '', status: 'missing', confidence: 0 },
      batchNumber: { value: '', status: 'missing', confidence: 0 },
    },
  };
}

/**
 * Associates an incoming frame or angle with the SAME tracked product.
 * Maintains continuity across Front -> Side -> Back -> Bottom angles.
 */
export function updateProductTracking(
  tracked: TrackedProduct,
  detectedBox: NormalizedRect | null,
  isStable: boolean,
  color: string,
  detectedBarcode?: string
): TrackedProduct {
  const updated = { ...tracked, lastUpdated: Date.now() };

  if (detectedBox) {
    updated.productBox = detectedBox;
    updated.dominantColor = color;
    updated.trackingState = isStable ? 'stable' : 'tracking';
  } else if (updated.shots.length > 0) {
    // If user is rotating the package between shots, keep existing product identity active
    updated.trackingState = 'tracking';
  } else {
    updated.trackingState = 'searching';
  }

  // If local barcode was decoded from any angle, lock it into the tracked product
  if (detectedBarcode && !updated.fields.barcode.value) {
    updated.fields.barcode = {
      value: detectedBarcode,
      status: 'complete',
      confidence: 0.99,
    };
  }

  return updated;
}

/**
 * Helper to assign descriptive shot labels based on shot index
 */
function getSuggestedShotLabel(shotIndex: number): string {
  switch (shotIndex) {
    case 1:
      return 'Shot 1: Front / Label';
    case 2:
      return 'Shot 2: EXP / MFD Area';
    case 3:
      return 'Shot 3: Price / Barcode';
    default:
      return `Shot ${shotIndex}: Detail Area`;
  }
}

/**
 * Adds a new shot to the tracked product and extracts targeted auto-crops
 * for the main product hull and specific detected information regions.
 */
export async function addShotToTrackedProduct(
  tracked: TrackedProduct,
  photoDataUrl: string,
  regions: DetectedRegion[] = [],
  productBoxOverride?: NormalizedRect | null,
  completedField?: string
): Promise<TrackedProduct> {
  const shotNum = tracked.shots.length + 1;
  const shotId = `shot-${shotNum}`;

  const activeBox = productBoxOverride || tracked.productBox;
  let croppedProductImage: string | undefined = undefined;

  // 1. Auto-crop main product if bounded
  if (activeBox && activeBox.width > 0.15 && activeBox.height > 0.15) {
    try {
      croppedProductImage = await cropNormalizedRegion(photoDataUrl, activeBox, 0.04);
    } catch {
      // Fallback to full photo
      croppedProductImage = photoDataUrl;
    }
  }

  // 2. Automatically generate targeted crops for detected regions
  const cropRegions: { type: string; cropDataUrl: string }[] = [];

  for (const reg of regions) {
    // Prioritize missing fields: do not crop if field is already complete
    if (reg.type === 'expiry_date' && tracked.fields.expiryDate.status === 'complete') {
      continue;
    }
    if (reg.type === 'price_mrp' && tracked.fields.price.status === 'complete') {
      continue;
    }
    if (reg.type === 'barcode_qr' && tracked.fields.barcode.status === 'complete') {
      continue;
    }

    try {
      const cropped = await cropNormalizedRegion(photoDataUrl, reg.box, 0.10);
      cropRegions.push({
        type: reg.type,
        cropDataUrl: cropped,
      });
    } catch {
      // Non-fatal crop fallback
    }
  }

  const newShot: TrackedShotRecord = {
    id: shotId,
    image: photoDataUrl,
    croppedProductImage,
    timestamp: Date.now(),
    label: getSuggestedShotLabel(shotNum),
    completedField,
    cropRegions,
  };

  const fields = { ...tracked.fields };
  if (completedField) {
    if (completedField === 'productName') {
      fields.productName = { ...fields.productName, status: 'complete', confidence: 0.95 };
      fields.brand = { ...fields.brand, status: 'complete', confidence: 0.95 };
    } else if (completedField === 'manufactureDate') {
      fields.manufactureDate = { ...fields.manufactureDate, status: 'complete', confidence: 0.95 };
    } else if (completedField === 'expiryDate') {
      fields.expiryDate = { ...fields.expiryDate, status: 'complete', confidence: 0.95 };
    } else if (completedField === 'price') {
      fields.price = { ...fields.price, status: 'complete', confidence: 0.95 };
    } else if (completedField === 'barcode') {
      fields.barcode = { ...fields.barcode, status: 'complete', confidence: 0.95 };
    }
  }

  return {
    ...tracked,
    lastUpdated: Date.now(),
    shots: [...tracked.shots, newShot],
    fields,
  };
}

/**
 * Removes the most recent shot (Retake Last)
 */
export function removeLastShotFromTrackedProduct(tracked: TrackedProduct): TrackedProduct {
  if (tracked.shots.length === 0) return tracked;
  const lastShot = tracked.shots[tracked.shots.length - 1];
  const fields = { ...tracked.fields };

  if (lastShot.completedField) {
    const fld = lastShot.completedField;
    if (fld === 'productName') {
      fields.productName = { ...fields.productName, status: 'missing', confidence: 0 };
      fields.brand = { ...fields.brand, status: 'missing', confidence: 0 };
    } else if (fld === 'manufactureDate') {
      fields.manufactureDate = { ...fields.manufactureDate, status: 'missing', confidence: 0 };
    } else if (fld === 'expiryDate') {
      fields.expiryDate = { ...fields.expiryDate, status: 'missing', confidence: 0 };
    } else if (fld === 'price') {
      fields.price = { ...fields.price, status: 'missing', confidence: 0 };
    } else if (fld === 'barcode') {
      fields.barcode = { ...fields.barcode, status: 'missing', confidence: 0 };
    }
  }

  return {
    ...tracked,
    lastUpdated: Date.now(),
    shots: tracked.shots.slice(0, -1),
    fields,
  };
}

/**
 * Merges extracted fields from all shots into the single tracked product record
 * using confidence and quality scoring to keep the highest quality result.
 */
export function mergeExtractedFields(
  tracked: TrackedProduct,
  result: Partial<ProductScanResult>
): TrackedProduct {
  const fields = { ...tracked.fields };

  // Helper to safely update field if new confidence is better or if field was empty
  const updateFieldWithConfidence = <T>(
    currentField: FieldEntry<T>,
    newValue: T | undefined | null,
    newConfidence: number
  ): FieldEntry<T> => {
    if (newValue === undefined || newValue === null || newValue === '') {
      return currentField;
    }
    const isEmpty = currentField.value === undefined || currentField.value === null || currentField.value === '';
    const isHigherConfidence = newConfidence > currentField.confidence;
    const isCompleted = currentField.status === 'complete';

    if (isEmpty || !isCompleted || isHigherConfidence) {
      return {
        value: newValue,
        status: 'complete',
        confidence: newConfidence,
      };
    }
    return currentField;
  };

  if (result.productName) {
    fields.productName = updateFieldWithConfidence(
      fields.productName,
      result.productName,
      result.confidence?.productName || 0.92
    );
  }

  if (result.brand) {
    fields.brand = updateFieldWithConfidence(
      fields.brand,
      result.brand,
      (result.confidence as any)?.brand || 0.90
    );
  }

  if (result.price !== null && result.price !== undefined) {
    fields.price = updateFieldWithConfidence(
      fields.price,
      result.price,
      result.confidence?.price || 0.90
    );
  }

  if (result.currency) {
    fields.currency = updateFieldWithConfidence(
      fields.currency,
      result.currency,
      result.confidence?.currency || 0.90
    );
  }

  if (result.manufactureDate) {
    fields.manufactureDate = updateFieldWithConfidence(
      fields.manufactureDate,
      result.manufactureDate,
      result.confidence?.manufactureDate || 0.90
    );
  }

  if (result.expiryDate) {
    fields.expiryDate = updateFieldWithConfidence(
      fields.expiryDate,
      result.expiryDate,
      result.confidence?.expiryDate || 0.94
    );
  }

  if (result.bestBeforeMonths !== null && result.bestBeforeMonths !== undefined) {
    fields.bestBeforeMonths = updateFieldWithConfidence(
      fields.bestBeforeMonths,
      result.bestBeforeMonths,
      result.confidence?.bestBeforeMonths || 0.88
    );
  }

  if (result.barcode) {
    fields.barcode = updateFieldWithConfidence(
      fields.barcode,
      result.barcode,
      (result.confidence as any)?.barcode || 0.98
    );
  }

  return {
    ...tracked,
    lastUpdated: Date.now(),
    fields,
  };
}

/**
 * Computes high-level missing field guidance for the user
 */
export function getMissingFieldGuidance(tracked: TrackedProduct): string {
  const f = tracked.fields;
  if (f.expiryDate.status === 'missing' && f.manufactureDate.status === 'missing') {
    return 'Scan MFD / EXP dates on back or bottom';
  }
  if (f.price.status === 'missing') {
    return 'Scan MRP / Retail price tag';
  }
  if (f.barcode.status === 'missing') {
    return 'Scan Barcode / QR code';
  }
  if (f.productName.status === 'missing') {
    return 'Scan front product label & brand';
  }
  return 'All key fields detected ✓ Ready to finish';
}
