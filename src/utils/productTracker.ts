/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DetectedRegion, NormalizedRect, cropNormalizedRegion } from './realtimeProductDetector';
import { ProductScanResult, SavedInventoryItem } from '../types';

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
  image: string;
  timestamp: number;
  label: string;
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
    dominantColor: '#ffffff',
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
 * Adds a new shot to the tracked product and extracts targeted crops for missing priority fields
 */
export async function addShotToTrackedProduct(
  tracked: TrackedProduct,
  photoDataUrl: string,
  regions: DetectedRegion[] = []
): Promise<TrackedProduct> {
  const shotNum = tracked.shots.length + 1;
  const shotId = `shot-${shotNum}`;

  // Automatically generate targeted crops for detected regions
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
      const cropped = await cropNormalizedRegion(photoDataUrl, reg.box, 0.12);
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
    timestamp: Date.now(),
    label: `Shot ${shotNum}`,
    cropRegions,
  };

  return {
    ...tracked,
    lastUpdated: Date.now(),
    shots: [...tracked.shots, newShot],
  };
}

/**
 * Removes the most recent shot (Retake Last)
 */
export function removeLastShotFromTrackedProduct(tracked: TrackedProduct): TrackedProduct {
  if (tracked.shots.length === 0) return tracked;
  return {
    ...tracked,
    lastUpdated: Date.now(),
    shots: tracked.shots.slice(0, -1),
  };
}

/**
 * Merges extracted fields into the single tracked product record
 */
export function mergeExtractedFields(
  tracked: TrackedProduct,
  result: Partial<ProductScanResult>
): TrackedProduct {
  const fields = { ...tracked.fields };

  if (result.productName && !fields.productName.value) {
    fields.productName = {
      value: result.productName,
      status: 'complete',
      confidence: result.confidence?.productName || 0.92,
    };
  }

  if (result.brand && !fields.brand.value) {
    fields.brand = {
      value: result.brand,
      status: 'complete',
      confidence: 0.90,
    };
  }

  if (result.price !== null && result.price !== undefined && fields.price.value === null) {
    fields.price = {
      value: result.price,
      status: 'complete',
      confidence: result.confidence?.price || 0.90,
    };
  }

  if (result.currency) {
    fields.currency = {
      value: result.currency,
      status: 'complete',
      confidence: result.confidence?.currency || 0.90,
    };
  }

  if (result.manufactureDate && !fields.manufactureDate.value) {
    fields.manufactureDate = {
      value: result.manufactureDate,
      status: 'complete',
      confidence: result.confidence?.manufactureDate || 0.90,
    };
  }

  if (result.expiryDate && !fields.expiryDate.value) {
    fields.expiryDate = {
      value: result.expiryDate,
      status: 'complete',
      confidence: result.confidence?.expiryDate || 0.94,
    };
  }

  if (result.bestBeforeMonths !== null && result.bestBeforeMonths !== undefined && fields.bestBeforeMonths.value === null) {
    fields.bestBeforeMonths = {
      value: result.bestBeforeMonths,
      status: 'complete',
      confidence: result.confidence?.bestBeforeMonths || 0.88,
    };
  }

  if (result.barcode && !fields.barcode.value) {
    fields.barcode = {
      value: result.barcode,
      status: 'complete',
      confidence: 0.98,
    };
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
