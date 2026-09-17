/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedInventoryItem, StockTransaction, ProductScanResult } from '../types';
import { extractProduct5FieldsFromImages } from './geminiService';
import {
  getProducts,
  saveProduct,
  executeStockTransaction,
  getStockTransactions,
} from '../utils/unifiedDataStore';
import { parseProductDate, validateProductDates, calculateExpiryDate } from '../utils/dateService';

/**
 * 1. extractProduct()
 * Reusable function to extract product information from captured images.
 */
export async function extractProduct(images: string[]): Promise<ProductScanResult> {
  if (!images || images.length === 0) {
    throw new Error('No images provided for product extraction.');
  }
  const result = await extractProduct5FieldsFromImages(images);
  return result;
}

/**
 * 2. validateProduct()
 * Reusable function to validate product data (name, quantity, dates).
 */
export function validateProduct(product: Partial<SavedInventoryItem>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!product.productName || product.productName.trim() === '') {
    errors.push('Product name is required.');
  }
  const qty = parseInt(String(product.stockQuantity ?? product.quantity ?? '1'), 10);
  if (isNaN(qty) || qty < 0) {
    errors.push('Invalid quantity. Quantity must be 0 or greater.');
  }

  const mfd = product.manufacturingDate || '';
  const exp = product.expiryDate || '';
  if (mfd || exp) {
    const dateValidation = validateProductDates(mfd, exp);
    if (!dateValidation.isValid) {
      errors.push(...dateValidation.warnings);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 3. findExistingProduct()
 * Searches existing inventory using normalized product name and, when available, barcode.
 */
export function findExistingProduct(productName: string, barcode?: string): SavedInventoryItem | null {
  const products = getProducts();
  const cleanName = productName.trim().toLowerCase();
  const cleanBarcode = barcode ? barcode.replace(/[\s\-_]/g, '').trim() : '';

  if (cleanBarcode) {
    const matchByBarcode = products.find(
      (p) => p.barcode && p.barcode.replace(/[\s\-_]/g, '').trim() === cleanBarcode
    );
    if (matchByBarcode) return matchByBarcode;
  }

  const matchByName = products.find(
    (p) => p.productName.trim().toLowerCase() === cleanName
  );
  if (matchByName) return matchByName;

  return null;
}

/**
 * 5. getInventory()
 * Reusable function to retrieve all inventory items from database (source of truth).
 */
export function getInventory(): SavedInventoryItem[] {
  return getProducts();
}

/**
 * 7. calculateCurrentStock()
 * Calculates current stock from total Inventory In - Total Inventory Out based on transactions.
 */
export function calculateCurrentStock(productId: string): number {
  const transactions = getStockTransactions().filter((t) => t.productId === productId);
  let totalIn = 0;
  let totalOut = 0;

  for (const t of transactions) {
    const qty = Math.abs(t.quantity || 0);
    if (t.transactionType === 'stock_in') {
      totalIn += qty;
    } else if (t.transactionType === 'stock_out') {
      totalOut += qty;
    } else if (t.transactionType === 'stock_adjustment') {
      if (t.quantity >= 0) totalIn += t.quantity;
      else totalOut += Math.abs(t.quantity);
    }
  }

  return Math.max(0, totalIn - totalOut);
}

/**
 * 7. getTransactionHistory()
 * Returns separate transaction records (Inventory In / Out).
 */
export function getTransactionHistory(productId?: string): StockTransaction[] {
  const txns = getStockTransactions();
  if (productId) {
    return txns.filter((t) => t.productId === productId);
  }
  return txns;
}

/**
 * 4. addInventoryIn()
 * Adds or updates inventory, records transaction, updates current stock, and saves to DB.
 */
export function addInventoryIn(
  productData: Partial<SavedInventoryItem>,
  quantityToAdd: number,
  notes?: string
): {
  success: boolean;
  message: string;
  product?: SavedInventoryItem;
} {
  const validation = validateProduct({ ...productData, stockQuantity: quantityToAdd });
  if (!validation.isValid) {
    return {
      success: false,
      message: validation.errors.join(' '),
    };
  }

  const existing = findExistingProduct(productData.productName || '', productData.barcode);

  let targetProduct: SavedInventoryItem;

  if (existing) {
    const newStock = (existing.stockQuantity || 0) + quantityToAdd;
    targetProduct = saveProduct({
      ...existing,
      ...productData,
      stockQuantity: newStock,
      quantity: String(newStock),
    });
  } else {
    targetProduct = saveProduct({
      ...productData,
      stockQuantity: quantityToAdd,
      quantity: String(quantityToAdd),
    });
  }

  const txnResult = executeStockTransaction({
    productId: targetProduct.id,
    transactionType: 'stock_in',
    subType: existing ? 'purchase' : 'manual_addition',
    quantity: quantityToAdd,
    unit: targetProduct.unit || 'units',
    source: existing ? 'Purchase' : 'Scanner',
    notes: notes || (existing ? 'Added stock to existing product' : 'Initial inventory registration via scanner'),
    unitPrice: parseFloat(targetProduct.mrp?.replace(/[^0-9.]/g, '') || '0') || 0,
    supplier: targetProduct.supplier || targetProduct.brand || '',
  });

  if (!txnResult.success) {
    return {
      success: false,
      message: txnResult.message,
    };
  }

  return {
    success: true,
    message: existing
      ? `Stock updated: ${targetProduct.stockQuantity} ${targetProduct.unit || 'units'} remaining.`
      : 'Product added to inventory',
    product: targetProduct,
  };
}

/**
 * 6. addInventoryOut()
 * Deducts stock from existing product, checks available quantity, records transaction, and updates DB.
 */
export function addInventoryOut(
  productId: string,
  quantityToRemove: number,
  notes?: string
): {
  success: boolean;
  message: string;
  updatedProduct?: SavedInventoryItem;
} {
  const qty = Math.abs(quantityToRemove);
  if (qty <= 0) {
    return { success: false, message: 'Quantity to remove must be greater than zero.' };
  }

  const products = getProducts();
  const prod = products.find((p) => p.id === productId);
  if (!prod) {
    return { success: false, message: 'Selected product not found in inventory.' };
  }

  const currentAvailable = prod.stockQuantity || 0;
  if (qty > currentAvailable) {
    return {
      success: false,
      message: `Insufficient stock. Current available: ${currentAvailable} ${prod.unit || 'units'}, requested: ${qty}.`,
    };
  }

  const txnResult = executeStockTransaction({
    productId: prod.id,
    transactionType: 'stock_out',
    subType: 'sale',
    quantity: qty,
    unit: prod.unit || 'units',
    source: 'POS',
    notes: notes || 'Inventory Out / Sale deduction',
  });

  if (!txnResult.success) {
    return {
      success: false,
      message: txnResult.message,
    };
  }

  const updatedProducts = getProducts();
  const finalProd = updatedProducts.find((p) => p.id === productId);

  return {
    success: true,
    message: `Stock updated: ${finalProd?.stockQuantity ?? (currentAvailable - qty)} ${prod.unit || 'units'} remaining.`,
    updatedProduct: finalProd,
  };
}
