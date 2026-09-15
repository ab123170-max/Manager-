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
 * 3. Queries Open Food Facts API: https://world.openfoodfacts.org/api/v2/product/{BARCODE}.json
 * 4. Maps API response into clean inventory form schema (leaving quantity, purchase_price, selling_price for manual entry)
 * 5. Returns standardized status messages: "Product found", "Product not found", "Network error", "Invalid barcode"
 */
export async function lookupBarcodeProduct(rawBarcode: string): Promise<BarcodeLookupResult> {
  const normalized = normalizeBarcode(rawBarcode);
  pipelineLogger.log('barcodeLookupStarted', { rawBarcode, normalized });

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

  // 2. Duplicate Protection Check
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

  // 4. Query Open Food Facts API
  const endpoint = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(normalized)}.json`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second timeout

    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SmartStock-Inventory-Scanner/2.0',
      },
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && (data.status === 1 || data.product)) {
        const prod = data.product || {};

        // Extract product name (never assume barcode is the product name!)
        const rawName =
          prod.product_name ||
          prod.product_name_en ||
          prod.generic_name ||
          prod.product_name_fr ||
          prod.product_name_es ||
          '';

        if (rawName && rawName.trim() !== normalized) {
          const brandName = prod.brands || prod.brand || '';
          const categoryName =
            (prod.categories_tags && prod.categories_tags[0]?.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ')) ||
            prod.categories ||
            'Food & Groceries';
          const imgUrl = prod.image_front_url || prod.image_url || prod.image_small_url || undefined;
          const desc = prod.generic_name || prod.ingredients_text || '';

          const mappedProduct: BarcodeLookupProduct = {
            product_name: rawName.trim(),
            brand: brandName.trim(),
            barcode: normalized,
            category: categoryName.trim(),
            image_url: imgUrl,
            quantity: '', // Leave for manual entry per requirement 3
            purchase_price: '', // Leave for manual entry per requirement 3
            selling_price: '', // Leave for manual entry per requirement 3
            mfd: '', // Leave for manual entry unless reliably available
            exp: '', // Leave for manual entry unless reliably available
            description: desc.trim(),
            package_size: prod.quantity ? prod.quantity.replace(/[^0-9.]/g, '') : '1',
            unit: prod.quantity ? prod.quantity.replace(/[0-9.\s]/g, '') || 'units' : 'units',
            mrp: '',
            supplier: prod.manufacturing_places || brandName.trim(),
            // Legacy compatibility fields
            productName: rawName.trim(),
            packageSize: prod.quantity ? prod.quantity.replace(/[^0-9.]/g, '') : '1',
            manufacturer: prod.manufacturing_places || brandName.trim(),
            imageUrl: imgUrl,
            source: 'api',
            rawResponse: prod,
          };

          pipelineLogger.log('barcodeLookupResult', { found: true, source: 'api', mappedProduct });

          return {
            found: true,
            status: 'product_found',
            statusMessage: 'Product found',
            product: mappedProduct,
            existingInventoryItem: null,
            source: 'api',
            normalizedBarcode: normalized,
            isDuplicate: false,
          };
        }
      }
    }
  } catch (apiErr: unknown) {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    const isTimeout = (apiErr as Error)?.name === 'AbortError';

    console.debug('Open Food Facts API lookup non-blocking catch:', apiErr);

    if (isOffline || isTimeout) {
      return {
        found: false,
        status: 'network_error',
        statusMessage: 'Network error',
        product: null,
        existingInventoryItem: null,
        source: 'none',
        normalizedBarcode: normalized,
        isDuplicate: false,
      };
    }
  }

  // 5. Product Not Found in Database
  return {
    found: false,
    status: 'product_not_found',
    statusMessage: 'Product not found',
    product: null,
    existingInventoryItem: null,
    source: 'none',
    normalizedBarcode: normalized,
    isDuplicate: false,
  };
}

