/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DetectedCode, LookupResult, SavedInventoryItem } from '../types';
import { getSavedInventory } from '../utils/inventoryStore';

/**
 * ============================================================================
 * PRODUCT LOOKUP SERVICE
 * ============================================================================
 * 1. Checks the user's live local database/inventory first.
 * 2. Checks global known product catalog database if not in local inventory.
 * 3. Prepares structured data for instant Auto-Fill, Stock Increment, or Gemini AI Vision fallback.
 */

// Curated reference registry of standard products for instant offline resolution
const KNOWN_RETAIL_CATALOG: Array<Partial<SavedInventoryItem> & { barcode: string }> = [
  {
    barcode: '8901030829871',
    productName: 'Himalaya Purifying Neem Face Wash',
    brand: 'Himalaya Herbals',
    category: 'Personal Care',
    sku: 'SKU-HIM-NEEM-150',
    quantity: '150',
    unit: 'ml',
    mrp: '$8.99',
    sellingPrice: '$8.49',
    stockQuantity: 15,
    minStockAlert: 5,
    manufacturingDate: '2025-02-10',
    expiryDate: '2027-01-31',
    bestBefore: '24 Months from MFD',
    batchNumber: 'LOT-HM2025B',
    supplier: 'Himalaya Global Logistics',
    rackLocation: 'Aisle 3 - Shelf B',
  },
  {
    barcode: '012000000133',
    productName: 'Pepsi Cola Original Refreshment',
    brand: 'PepsiCo',
    category: 'Beverages',
    sku: 'SKU-PEP-12OZ-CAN',
    quantity: '355',
    unit: 'ml',
    mrp: '$1.99',
    sellingPrice: '$1.89',
    stockQuantity: 48,
    minStockAlert: 12,
    manufacturingDate: '2025-06-01',
    expiryDate: '2026-06-01',
    bestBefore: '12 Months',
    batchNumber: 'BNO-PEP7891',
    supplier: 'Pepsi Bottling Group',
    rackLocation: 'Beverage Cooler 1',
  },
  {
    barcode: '049000050116',
    productName: 'Coca-Cola Classic Sparkling Soda',
    brand: 'The Coca-Cola Company',
    category: 'Beverages',
    sku: 'SKU-COKE-355',
    quantity: '355',
    unit: 'ml',
    mrp: '$2.19',
    sellingPrice: '$1.99',
    stockQuantity: 60,
    minStockAlert: 15,
    manufacturingDate: '2025-05-15',
    expiryDate: '2026-05-15',
    bestBefore: '12 Months from MFD',
    batchNumber: 'BNO-CC2025X',
    supplier: 'Coca-Cola Beverages Direct',
    rackLocation: 'Beverage Cooler 2',
  },
  {
    barcode: '028400040112',
    productName: "Lay's Classic Potato Chips Crispy",
    brand: "Lay's / Frito-Lay",
    category: 'Gourmet Snacks',
    sku: 'SKU-LAYS-CLS-8OZ',
    quantity: '226',
    unit: 'g',
    mrp: '$4.49',
    sellingPrice: '$3.99',
    stockQuantity: 24,
    minStockAlert: 6,
    manufacturingDate: '2025-07-01',
    expiryDate: '2026-01-01',
    bestBefore: '6 Months from MFD',
    batchNumber: 'BNO-FL9982',
    supplier: 'Frito-Lay Logistics Hub',
    rackLocation: 'Snack Aisle 4',
  },
  {
    barcode: '037000123456',
    productName: 'Tide Ultra OXI Liquid Laundry Detergent',
    brand: 'Procter & Gamble',
    category: 'Household & Cleaning',
    sku: 'SKU-TIDE-OXI-92',
    quantity: '2720',
    unit: 'ml',
    mrp: '$19.99',
    sellingPrice: '$18.49',
    stockQuantity: 10,
    minStockAlert: 3,
    manufacturingDate: '2025-01-15',
    expiryDate: '2028-01-15',
    bestBefore: '36 Months',
    batchNumber: 'PG-TID-884',
    supplier: 'P&G Distribution Direct',
    rackLocation: 'Warehouse Bay 5',
  },
  {
    barcode: '051500055110',
    productName: "Jif Extra Crunchy Peanut Butter",
    brand: 'The J.M. Smucker Company',
    category: 'Gourmet Food',
    sku: 'SKU-JIF-CRN-16',
    quantity: '454',
    unit: 'g',
    mrp: '$3.89',
    sellingPrice: '$3.49',
    stockQuantity: 18,
    minStockAlert: 4,
    manufacturingDate: '2025-03-20',
    expiryDate: '2026-09-20',
    bestBefore: '18 Months',
    batchNumber: 'JIF-LOT-781',
    supplier: 'Smucker Distribution Center',
    rackLocation: 'Spread & Breakfast Aisle',
  },
];

/**
 * Searches local inventory database first by exact barcode, SKU, or QR code.
 */
export function lookupProductByCode(code: DetectedCode): LookupResult {
  const cleanValue = code.value.trim();
  const inventory = getSavedInventory();

  // 1. Search in User's Existing Saved Inventory / Database
  const matchedInInventory = inventory.find((item) => {
    if (item.barcode && item.barcode.trim() === cleanValue) return true;
    if (item.sku && item.sku.trim().toLowerCase() === cleanValue.toLowerCase()) return true;
    if (item.qrCode && item.qrCode.trim() === cleanValue) return true;
    if (item.id === cleanValue) return true;
    return false;
  });

  if (matchedInInventory) {
    return {
      found: true,
      item: matchedInInventory,
      source: 'inventory',
      code,
    };
  }

  // 2. Search in Known Retail Database
  const matchedInKnown = KNOWN_RETAIL_CATALOG.find((catalogItem) => {
    return catalogItem.barcode === cleanValue || catalogItem.sku?.toLowerCase() === cleanValue.toLowerCase();
  });

  if (matchedInKnown) {
    const virtualItem: SavedInventoryItem = {
      id: `ref_${Date.now()}_${cleanValue.slice(-4)}`,
      savedAt: new Date().toISOString(),
      productName: matchedInKnown.productName || 'Known Product',
      brand: matchedInKnown.brand || '',
      category: matchedInKnown.category || 'General Goods',
      sku: matchedInKnown.sku || `SKU-${cleanValue.slice(-6)}`,
      barcode: cleanValue,
      batchNumber: matchedInKnown.batchNumber || '',
      manufacturingDate: matchedInKnown.manufacturingDate || '',
      expiryDate: matchedInKnown.expiryDate || '',
      bestBefore: matchedInKnown.bestBefore || '',
      quantity: matchedInKnown.quantity || '1',
      unit: matchedInKnown.unit || 'units',
      mrp: matchedInKnown.mrp || '',
      sellingPrice: matchedInKnown.sellingPrice || matchedInKnown.mrp || '',
      purchasePrice: matchedInKnown.purchasePrice || '',
      stockQuantity: matchedInKnown.stockQuantity || 10,
      minStockAlert: matchedInKnown.minStockAlert || 5,
      supplier: matchedInKnown.supplier || '',
      rackLocation: matchedInKnown.rackLocation || 'Front Shelf',
      ingredients: matchedInKnown.ingredients || '',
      notes: matchedInKnown.notes || 'Verified against product database.',
      warnings: [],
      missingFields: [],
      status: 'in_stock',
    };

    return {
      found: true,
      item: virtualItem,
      source: 'known_catalog',
      code,
    };
  }

  // 3. Not found
  return {
    found: false,
    item: null,
    source: 'none',
    code,
  };
}
