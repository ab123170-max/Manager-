/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedInventoryItem, CatalogProduct, ExtractedFormData } from '../types';

const STORAGE_KEY = 'ais_inventory_products_v1';

/**
 * Calculates stock and expiry status for a product.
 */
export function calculateProductStatus(
  item: Partial<SavedInventoryItem>
): 'in_stock' | 'low_stock' | 'out_of_stock' | 'expiring_soon' | 'expired' {
  const stock = item.stockQuantity ?? (parseInt(item.quantity || '1', 10) || 1);
  const minStock = item.minStockAlert ?? 5;

  // Check expiry
  if (item.expiryDate) {
    const expTime = new Date(item.expiryDate).getTime();
    if (!isNaN(expTime)) {
      const now = Date.now();
      const daysUntilExpiry = (expTime - now) / (1000 * 60 * 60 * 24);
      if (daysUntilExpiry < 0) return 'expired';
      if (daysUntilExpiry <= 45) return 'expiring_soon';
    }
  }

  if (stock <= 0) return 'out_of_stock';
  if (stock <= minStock) return 'low_stock';
  return 'in_stock';
}

export function getSavedInventory(): SavedInventoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed with initial curated items if storage is empty
      const initialSeed = getInitialCatalogSeed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialSeed));
      return initialSeed;
    }
    const parsed: SavedInventoryItem[] = JSON.parse(raw);
    return parsed.map((item) => ({
      ...item,
      status: calculateProductStatus(item),
    }));
  } catch (err) {
    console.error('Failed to load saved inventory:', err);
    return [];
  }
}

// Alias for convenience
export const loadSavedInventory = getSavedInventory;
export const getCatalogProducts = getSavedInventory;

export function saveProductToInventory(
  formData: ExtractedFormData,
  imageThumbnail?: string
): SavedInventoryItem {
  const items = getSavedInventory();

  const numQty = parseInt(formData.quantity?.replace(/[^0-9]/g, '') || '1', 10) || 1;

  const newItem: SavedInventoryItem = {
    id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    savedAt: new Date().toISOString(),
    productName: formData.productName || formData.fullName || 'Untitled Product',
    brand: formData.brand || formData.organization || '',
    category: formData.category || formData.documentType || 'General Goods',
    sku: formData.sku || formData.documentNumber || (formData.barcode ? `SKU-${formData.barcode.slice(-6)}` : ''),
    barcode: formData.barcode || '',
    batchNumber: formData.batchNumber || '',
    manufacturingDate: formData.manufacturingDate || formData.issueDate || '',
    expiryDate: formData.expiryDate || '',
    bestBefore: formData.bestBefore || '',
    quantity: formData.quantity || String(numQty),
    unit: formData.unit || 'units',
    mrp: formData.mrp || '',
    sellingPrice: formData.mrp || '',
    purchasePrice: '',
    stockQuantity: numQty,
    minStockAlert: 5,
    supplier: formData.organization || formData.brand || '',
    rackLocation: 'Section A-1',
    ingredients: formData.notesOrAdditional || '',
    notes: `Scanned & validated via Gemini 3.7 Vision supervisor.`,
    warnings: formData.warnings || [],
    missingFields: formData.missingFields || [],
    imageThumbnail: imageThumbnail || undefined,
    additionalPhotos: [],
    status: 'in_stock',
  };

  newItem.status = calculateProductStatus(newItem);

  const updated = [newItem, ...items];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to persist to localStorage:', err);
  }

  return newItem;
}

export function saveManualCatalogProduct(productData: Partial<CatalogProduct>): CatalogProduct {
  const items = getSavedInventory();

  const numQty = productData.stockQuantity ?? (parseInt(productData.quantity || '1', 10) || 1);

  const newItem: CatalogProduct = {
    id: productData.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    savedAt: productData.savedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    productName: productData.productName?.trim() || 'Untitled Product',
    brand: productData.brand?.trim() || '',
    category: productData.category?.trim() || 'General Goods',
    sku: productData.sku?.trim() || '',
    barcode: productData.barcode?.trim() || '',
    qrCode: productData.qrCode?.trim() || '',
    batchNumber: productData.batchNumber?.trim() || '',
    manufacturingDate: productData.manufacturingDate?.trim() || '',
    expiryDate: productData.expiryDate?.trim() || '',
    bestBefore: productData.bestBefore?.trim() || '',
    quantity: productData.quantity || String(numQty),
    unit: productData.unit || 'units',
    mrp: productData.mrp || '',
    sellingPrice: productData.sellingPrice || productData.mrp || '',
    purchasePrice: productData.purchasePrice || '',
    stockQuantity: numQty,
    minStockAlert: productData.minStockAlert ?? 5,
    supplier: productData.supplier || '',
    rackLocation: productData.rackLocation || '',
    ingredients: productData.ingredients || '',
    notes: productData.notes || '',
    warnings: productData.warnings || [],
    missingFields: productData.missingFields || [],
    imageThumbnail: productData.imageThumbnail,
    additionalPhotos: productData.additionalPhotos || [],
    status: 'in_stock',
  };

  newItem.status = calculateProductStatus(newItem);

  const updated = [newItem, ...items];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to persist to localStorage:', err);
  }

  return newItem;
}

export function updateCatalogProduct(id: string, updates: Partial<CatalogProduct>): SavedInventoryItem[] {
  const items = getSavedInventory();
  const updated = items.map((item) => {
    if (item.id === id) {
      const merged: SavedInventoryItem = {
        ...item,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      if (updates.stockQuantity !== undefined) {
        merged.quantity = String(updates.stockQuantity);
      }
      merged.status = calculateProductStatus(merged);
      return merged;
    }
    return item;
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to update product in localStorage:', err);
  }
  return updated;
}

export function adjustProductStock(id: string, delta: number): SavedInventoryItem[] {
  const items = getSavedInventory();
  const updated = items.map((item) => {
    if (item.id === id) {
      const currentStock = item.stockQuantity ?? (parseInt(item.quantity || '0', 10) || 0);
      const newStock = Math.max(0, currentStock + delta);
      const merged: SavedInventoryItem = {
        ...item,
        stockQuantity: newStock,
        quantity: String(newStock),
        updatedAt: new Date().toISOString(),
      };
      merged.status = calculateProductStatus(merged);
      return merged;
    }
    return item;
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to adjust stock in localStorage:', err);
  }
  return updated;
}

export function deleteProductFromInventory(id: string): SavedInventoryItem[] {
  const items = getSavedInventory().filter((i) => i.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to delete from localStorage:', err);
  }
  return items;
}

export const deleteCatalogProduct = deleteProductFromInventory;

export function exportInventoryJson(): void {
  const items = getSavedInventory();
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(items, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `smartstock-catalog-${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function exportCatalogCsv(): void {
  const items = getSavedInventory();
  if (items.length === 0) return;

  const headers = [
    'Product Name',
    'Brand',
    'Category',
    'SKU',
    'Barcode',
    'Batch No',
    'Manufacturing Date',
    'Expiry Date',
    'Stock Qty',
    'Unit',
    'MRP',
    'Selling Price',
    'Purchase Price',
    'Supplier',
    'Location',
    'Status',
    'Saved At',
  ];

  const escapeCsv = (val: unknown) => {
    const s = String(val ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = items.map((i) => [
    escapeCsv(i.productName),
    escapeCsv(i.brand),
    escapeCsv(i.category),
    escapeCsv(i.sku),
    escapeCsv(i.barcode),
    escapeCsv(i.batchNumber),
    escapeCsv(i.manufacturingDate),
    escapeCsv(i.expiryDate),
    escapeCsv(i.stockQuantity ?? i.quantity),
    escapeCsv(i.unit),
    escapeCsv(i.mrp),
    escapeCsv(i.sellingPrice),
    escapeCsv(i.purchasePrice),
    escapeCsv(i.supplier),
    escapeCsv(i.rackLocation),
    escapeCsv(i.status),
    escapeCsv(i.savedAt),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', url);
  downloadAnchor.setAttribute('download', `smartstock-catalog-${Date.now()}.csv`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  URL.revokeObjectURL(url);
}

export function importCatalogJson(jsonString: string): SavedInventoryItem[] {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      throw new Error('Import file must contain an array of product items.');
    }
    const current = getSavedInventory();
    const existingIds = new Set(current.map((i) => i.id));
    const newItems: SavedInventoryItem[] = [];

    for (const item of parsed) {
      if (item && item.productName) {
        const id = item.id && !existingIds.has(item.id)
          ? item.id
          : `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        existingIds.add(id);

        const normalized: SavedInventoryItem = {
          id,
          savedAt: item.savedAt || new Date().toISOString(),
          updatedAt: item.updatedAt,
          productName: item.productName,
          brand: item.brand || '',
          category: item.category || 'General Goods',
          sku: item.sku || '',
          barcode: item.barcode || '',
          qrCode: item.qrCode || '',
          batchNumber: item.batchNumber || '',
          manufacturingDate: item.manufacturingDate || '',
          expiryDate: item.expiryDate || '',
          bestBefore: item.bestBefore || '',
          quantity: item.quantity || '1',
          unit: item.unit || 'units',
          mrp: item.mrp || '',
          sellingPrice: item.sellingPrice || item.mrp || '',
          purchasePrice: item.purchasePrice || '',
          stockQuantity: item.stockQuantity ?? (parseInt(item.quantity || '1', 10) || 1),
          minStockAlert: item.minStockAlert ?? 5,
          supplier: item.supplier || '',
          rackLocation: item.rackLocation || '',
          ingredients: item.ingredients || '',
          notes: item.notes || '',
          warnings: Array.isArray(item.warnings) ? item.warnings : [],
          missingFields: Array.isArray(item.missingFields) ? item.missingFields : [],
          imageThumbnail: item.imageThumbnail,
          additionalPhotos: item.additionalPhotos || [],
        };
        normalized.status = calculateProductStatus(normalized);
        newItems.push(normalized);
      }
    }

    const merged = [...newItems, ...current];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.error('Failed to import JSON catalog:', err);
    throw err;
  }
}

function getInitialCatalogSeed(): SavedInventoryItem[] {
  return [
    {
      id: 'prod_seed_001',
      savedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      productName: 'Highland Reserve Organic Dark Roast',
      brand: 'Highland Artisan Roasters',
      category: 'Beverages & Coffee',
      sku: 'HAC-SUMATRA-340',
      barcode: '084729103958',
      batchNumber: 'LOT-SC2025-R4',
      manufacturingDate: '2025-02-10',
      expiryDate: '2026-02-10',
      bestBefore: '2026-02-10',
      quantity: '24',
      stockQuantity: 24,
      minStockAlert: 8,
      unit: 'bags (340g)',
      mrp: '$18.99',
      sellingPrice: '$18.99',
      purchasePrice: '$11.50',
      supplier: 'Highland Roasters Direct LLC',
      rackLocation: 'Aisle 3 • Bay B',
      notes: 'Verified via Multi-Angle Front & Back packaging capture.',
      warnings: [],
      missingFields: [],
      status: 'in_stock',
    },
    {
      id: 'prod_seed_002',
      savedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      productName: 'Estate Cold Pressed Extra Virgin Olive Oil',
      brand: 'Villa Solara',
      category: 'Gourmet Pantry',
      sku: 'VSO-EVOO-500ML',
      barcode: '739201948201',
      batchNumber: 'LOT-EV2024-B8',
      manufacturingDate: '2024-11-15',
      expiryDate: '2025-11-15',
      bestBefore: '2025-11-15',
      quantity: '4',
      stockQuantity: 4,
      minStockAlert: 6,
      unit: 'bottles (500ml)',
      mrp: '$24.50',
      sellingPrice: '$24.50',
      purchasePrice: '$15.00',
      supplier: 'Solara Mediterranean Imports',
      rackLocation: 'Aisle 2 • Shelf 1',
      notes: 'Low stock notification active (4 remaining, min alert 6).',
      warnings: [],
      missingFields: [],
      status: 'low_stock',
    },
  ];
}

