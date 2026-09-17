/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedInventoryItem } from '../types';
import { getSavedInventory } from '../utils/inventoryStore';
import { getProducts } from '../utils/unifiedDataStore';
import { pipelineLogger } from '../utils/debugLogger';

export type LookupStatusType =
  | 'scanning'
  | 'detected'
  | 'searching'
  | 'product_found'
  | 'product_not_found'
  | 'network_error'
  | 'invalid_barcode'
  | 'product_exists';

export interface BarcodeProductMapping {
  product_name: string;
  brand: string;
  barcode: string;
  category: string;
  image_url?: string;
  quantity?: string;
  purchase_price?: string;
  selling_price?: string;
  mfd?: string;
  exp?: string;
  description?: string;
  package_size?: string;
  unit?: string;
  mrp?: string;
  supplier?: string;
}

export interface BarcodeLookupProduct extends BarcodeProductMapping {
  // Legacy aliases for backward compatibility across components
  productName: string;
  imageUrl?: string;
  packageSize: string;
  manufacturer: string;
  sellingPrice?: string | number | null;
  ingredients?: string;
  source: 'database' | 'inventory' | 'catalog' | 'api' | 'none';
  rawResponse?: unknown;
}

export interface BarcodeLookupResult {
  found: boolean;
  status: LookupStatusType;
  statusMessage: string;
  product: BarcodeLookupProduct | null;
  existingInventoryItem: SavedInventoryItem | null;
  source: 'database' | 'inventory' | 'catalog' | 'api' | 'none';
  normalizedBarcode: string;
  isDuplicate: boolean;
  fromCache?: boolean;
}

export interface BarcodeCacheEntry {
  barcode: string;
  result: BarcodeLookupResult;
  timestamp: number;
  expiresAt: number;
  hits: number;
}

export interface BarcodeLookupOptions {
  forceRefresh?: boolean;
  bypassCache?: boolean;
}

/**
 * ============================================================================
 * SESSION CACHE LAYER FOR BARCODE LOOKUP
 * ============================================================================
 * Prevents redundant external HTTP calls to Open Food Facts for identical barcodes
 * during the same session. Features:
 * - Dual-layer storage: Fast In-Memory Map + SessionStorage hydration
 * - In-flight request deduplication (collapses multiple simultaneous scans into 1 call)
 * - Intelligent TTLs (long TTL for found products, short TTL for not found, none for network errors)
 * - Automatic LRU/size-capped eviction (up to 300 cached entries)
 */
class BarcodeSessionCache {
  private memoryCache: Map<string, BarcodeCacheEntry> = new Map();
  private inFlightRequests: Map<string, Promise<BarcodeLookupResult>> = new Map();
  private hitsCount = 0;
  private missesCount = 0;
  private readonly storageKey = 'smartstock_barcode_session_cache_v1';
  private readonly MAX_CACHE_ENTRIES = 300;
  private readonly SUCCESS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours within session
  private readonly NOT_FOUND_TTL_MS = 15 * 60 * 1000; // 15 mins for unknown barcodes

  constructor() {
    this.hydrateFromSessionStorage();
  }

  private hydrateFromSessionStorage() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const raw = window.sessionStorage.getItem(this.storageKey);
        if (raw) {
          const parsed: BarcodeCacheEntry[] = JSON.parse(raw);
          const now = Date.now();
          if (Array.isArray(parsed)) {
            parsed.forEach((entry) => {
              if (entry && entry.barcode && entry.expiresAt > now) {
                this.memoryCache.set(entry.barcode, entry);
              }
            });
          }
        }
      }
    } catch {
      // Ignore sessionStorage parsing or quota errors
    }
  }

  private persistToSessionStorage() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const entries = Array.from(this.memoryCache.values());
        window.sessionStorage.setItem(this.storageKey, JSON.stringify(entries));
      }
    } catch {
      // Ignore quota exceptions safely
    }
  }

  public get(barcode: string): BarcodeLookupResult | null {
    const entry = this.memoryCache.get(barcode);
    if (!entry) {
      this.missesCount++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(barcode);
      this.persistToSessionStorage();
      this.missesCount++;
      return null;
    }

    entry.hits++;
    this.hitsCount++;
    return {
      ...entry.result,
      fromCache: true,
    };
  }

  public set(barcode: string, result: BarcodeLookupResult) {
    // Do not cache transient network failures to permit rapid retries upon reconnection
    if (result.status === 'network_error' || result.status === 'invalid_barcode') {
      return;
    }

    const ttl = result.found ? this.SUCCESS_TTL_MS : this.NOT_FOUND_TTL_MS;
    const now = Date.now();

    // Capacity cap eviction
    if (this.memoryCache.size >= this.MAX_CACHE_ENTRIES) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    const cacheEntry: BarcodeCacheEntry = {
      barcode,
      result: { ...result, fromCache: true },
      timestamp: now,
      expiresAt: now + ttl,
      hits: 0,
    };

    this.memoryCache.set(barcode, cacheEntry);
    this.persistToSessionStorage();
  }

  public getInFlight(barcode: string): Promise<BarcodeLookupResult> | null {
    return this.inFlightRequests.get(barcode) || null;
  }

  public setInFlight(barcode: string, promise: Promise<BarcodeLookupResult>) {
    this.inFlightRequests.set(barcode, promise);
  }

  public clearInFlight(barcode: string) {
    this.inFlightRequests.delete(barcode);
  }

  public invalidate(barcode: string) {
    this.memoryCache.delete(barcode);
    this.persistToSessionStorage();
  }

  public clear() {
    this.memoryCache.clear();
    this.inFlightRequests.clear();
    this.hitsCount = 0;
    this.missesCount = 0;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(this.storageKey);
      }
    } catch {
      // Ignore
    }
  }

  public getStats() {
    return {
      size: this.memoryCache.size,
      inFlight: this.inFlightRequests.size,
      hits: this.hitsCount,
      misses: this.missesCount,
    };
  }
}

export const barcodeCache = new BarcodeSessionCache();

/**
 * Access cache statistics and utilities
 */
export function getBarcodeCacheStats() {
  return barcodeCache.getStats();
}

export function clearBarcodeLookupCache() {
  barcodeCache.clear();
}

export function invalidateBarcodeCache(barcode: string) {
  const normalized = normalizeBarcode(barcode);
  if (normalized) {
    barcodeCache.invalidate(normalized);
  }
}

export function getCachedBarcodeLookup(barcode: string): BarcodeLookupResult | null {
  const normalized = normalizeBarcode(barcode);
  return normalized ? barcodeCache.get(normalized) : null;
}

/**
 * 1. Barcode normalization:
 * Strips whitespace, hyphens, underscores, and extracts the core barcode number.
 * Ensures the barcode number is treated purely as an identifier, never as the product name.
 */
export function normalizeBarcode(rawInput: string): string {
  if (!rawInput) return '';
  // Remove spaces, hyphens, and non-printable noise
  let cleaned = rawInput.replace(/[\s\-_]/g, '').trim();

  // If mostly numeric, extract contiguous digit block (e.g., EAN-13, EAN-8, UPC-A, UPC-E)
  if (/^\D*(\d{6,14})\D*$/.test(cleaned)) {
    const match = cleaned.match(/\d{6,14}/);
    if (match) {
      cleaned = match[0];
    }
  }
  return cleaned;
}

/**
 * Validates standard modulo-10 checksum for EAN-13, EAN-8, and UPC-A.
 */
export function validateBarcodeChecksum(barcode: string): boolean {
  if (!barcode) return false;
  if (!/^\d+$/.test(barcode)) {
    // Alphanumeric barcodes (e.g. Code 128, Code 39, QR) are accepted
    return barcode.length >= 3;
  }

  const len = barcode.length;
  if (len === 13) {
    // EAN-13 Checksum
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(barcode[i], 10);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(barcode[12], 10);
  }

  if (len === 8) {
    // EAN-8 Checksum
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const digit = parseInt(barcode[i], 10);
      sum += i % 2 === 0 ? digit * 3 : digit;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(barcode[7], 10);
  }

  if (len === 12) {
    // UPC-A Checksum
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      const digit = parseInt(barcode[i], 10);
      sum += i % 2 === 0 ? digit * 3 : digit;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(barcode[11], 10);
  }

  // UPC-E / 6-14 digit codes are considered valid length
  return len >= 6 && len <= 14;
}

// Built-in offline curated catalog for instant resolution of high-frequency barcodes
const OFFLINE_CATALOG: Record<string, Partial<BarcodeProductMapping>> = {
  '8906088860029': {
    product_name: 'Raw Pressery Cold Pressed Valencia Orange Juice',
    brand: 'Raw Pressery',
    category: 'Beverages',
    package_size: '250',
    unit: 'ml',
    mrp: '100.00',
    description: '100% Cold Pressed Valencia Oranges with natural vitamin C.',
    image_url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=300&auto=format&fit=crop&q=80',
  },
  '8901030829871': {
    product_name: 'Himalaya Purifying Neem Face Wash',
    brand: 'Himalaya Herbals',
    category: 'Personal Care',
    package_size: '150',
    unit: 'ml',
    mrp: '195.00',
    description: 'Purifying neem face wash with turmeric for clear skin.',
    image_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&auto=format&fit=crop&q=80',
  },
  '012000000133': {
    product_name: 'Pepsi Cola Original Refreshment',
    brand: 'PepsiCo',
    category: 'Beverages',
    package_size: '355',
    unit: 'ml',
    mrp: '1.99',
    description: 'Classic carbonated cola soda refreshment.',
    image_url: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=300&auto=format&fit=crop&q=80',
  },
  '049000050116': {
    product_name: 'Coca-Cola Classic Sparkling Soda',
    brand: 'The Coca-Cola Company',
    category: 'Beverages',
    package_size: '355',
    unit: 'ml',
    mrp: '2.19',
    description: 'Original classic taste Coca-Cola canned beverage.',
    image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=300&auto=format&fit=crop&q=80',
  },
  '028400040112': {
    product_name: "Lay's Classic Potato Chips",
    brand: "Lay's",
    category: 'Packaged Snacks',
    package_size: '226',
    unit: 'g',
    mrp: '4.49',
    description: 'Crispy salted potato chips.',
    image_url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&auto=format&fit=crop&q=80',
  },
  '037000123456': {
    product_name: 'Tide Ultra OXI Liquid Laundry Detergent',
    brand: 'Tide',
    category: 'Household & Cleaning',
    package_size: '2720',
    unit: 'ml',
    mrp: '19.99',
    description: 'High efficiency heavy duty liquid laundry detergent.',
    image_url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&auto=format&fit=crop&q=80',
  },
  '051500055110': {
    product_name: 'Jif Extra Crunchy Peanut Butter',
    brand: 'Jif',
    category: 'Food & Groceries',
    package_size: '454',
    unit: 'g',
    mrp: '3.89',
    description: 'Crunchy peanut butter with freshly roasted peanuts.',
    image_url: 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=300&auto=format&fit=crop&q=80',
  },
};

/**
 * Checks if a product with the given barcode already exists in the user's inventory.
 */
export function checkDuplicateBarcode(barcode: string): SavedInventoryItem | null {
  const normalized = normalizeBarcode(barcode);
  if (!normalized) return null;

  const inventory = [...getProducts(), ...getSavedInventory()];
  const uniqueItems = Array.from(new Map(inventory.map((item) => [item.id, item])).values());

  return (
    uniqueItems.find(
      (item) =>
        normalizeBarcode(item.barcode || '') === normalized ||
        (item.sku && normalizeBarcode(item.sku) === normalized) ||
        (item.qrCode && normalizeBarcode(item.qrCode) === normalized)
    ) || null
  );
}

/**
 * Main Product Database Lookup Pipeline
 * 1. Validates barcode format
 * 2. Checks user inventory for duplicate protection
 * 3. Resolves known items from local catalog database
 * 4. Returns standardized status messages: "Product found", "Product not found", "Invalid barcode"
 */
export async function lookupBarcodeProduct(
  rawBarcode: string,
  options?: BarcodeLookupOptions
): Promise<BarcodeLookupResult> {
  const normalized = normalizeBarcode(rawBarcode);
  pipelineLogger.log('barcodeLookupStarted', { rawBarcode, normalized, options });

  // 1. Validate Barcode
  if (!normalized || !validateBarcodeChecksum(normalized)) {
    return {
      found: false,
      status: 'invalid_barcode',
      statusMessage: 'Invalid barcode',
      product: null,
      existingInventoryItem: null,
      source: 'none',
      normalizedBarcode: normalized,
      isDuplicate: false,
    };
  }

  // 2. Duplicate Protection Check in User Inventory (Always dynamic & fresh)
  const existingItem = checkDuplicateBarcode(normalized);
  if (existingItem) {
    const product: BarcodeLookupProduct = {
      product_name: existingItem.productName,
      brand: existingItem.brand,
      barcode: normalized,
      category: existingItem.category,
      image_url: existingItem.imageThumbnail,
      quantity: String(existingItem.stockQuantity || ''),
      purchase_price: existingItem.purchasePrice || '',
      selling_price: existingItem.sellingPrice || existingItem.mrp || '',
      mfd: existingItem.manufacturingDate || '',
      exp: existingItem.expiryDate || '',
      description: existingItem.notes || '',
      package_size: existingItem.quantity || '',
      unit: existingItem.unit || 'units',
      mrp: existingItem.mrp || '',
      supplier: existingItem.supplier || '',
      // Legacy fields
      productName: existingItem.productName,
      packageSize: existingItem.quantity || '',
      manufacturer: existingItem.supplier || '',
      sellingPrice: existingItem.sellingPrice,
      imageUrl: existingItem.imageThumbnail,
      source: 'inventory',
    };

    return {
      found: true,
      status: 'product_exists',
      statusMessage: 'Product already exists',
      product,
      existingInventoryItem: existingItem,
      source: 'inventory',
      normalizedBarcode: normalized,
      isDuplicate: true,
    };
  }

  // 3. Check Curated Catalog for immediate resolution
  if (OFFLINE_CATALOG[normalized]) {
    const cat = OFFLINE_CATALOG[normalized];
    const product: BarcodeLookupProduct = {
      product_name: cat.product_name || 'Known Product',
      brand: cat.brand || '',
      barcode: normalized,
      category: cat.category || 'Food & Groceries',
      image_url: cat.image_url,
      quantity: '', // Leave for manual entry
      purchase_price: '', // Leave for manual entry
      selling_price: cat.mrp || '', // Leave for manual entry
      mfd: '', // Leave for manual entry
      exp: '', // Leave for manual entry
      description: cat.description || '',
      package_size: cat.package_size || '1',
      unit: cat.unit || 'units',
      mrp: cat.mrp || '',
      supplier: '',
      // Legacy fields
      productName: cat.product_name || 'Known Product',
      packageSize: cat.package_size || '1',
      manufacturer: cat.brand || '',
      sellingPrice: cat.mrp || '',
      imageUrl: cat.image_url,
      source: 'catalog',
    };

    return {
      found: true,
      status: 'product_found',
      statusMessage: 'Product found',
      product,
      existingInventoryItem: null,
      source: 'catalog',
      normalizedBarcode: normalized,
      isDuplicate: false,
    };
  }

  // 4. Product Not in Local Inventory or Catalog (No external barcode API lookup)
  const notFoundResult: BarcodeLookupResult = {
    found: false,
    status: 'product_not_found',
    statusMessage: 'Product not found',
    product: null,
    existingInventoryItem: null,
    source: 'none',
    normalizedBarcode: normalized,
    isDuplicate: false,
  };

  pipelineLogger.log('barcodeLookupResult', {
    found: false,
    source: 'none',
    barcode: normalized,
  });

  return notFoundResult;
}

