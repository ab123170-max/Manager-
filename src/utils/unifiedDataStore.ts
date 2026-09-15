/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SavedInventoryItem,
  InvoiceData,
  InvoiceLineItem,
  InventoryAccountingEntry,
  SaleRecord,
  PurchaseRecord,
  LossRecord,
  ExpenseRecord,
  IncomeRecord,
  AccountSummary,
  ScanHistoryItem,
  ExtractedFormData,
  StockTransaction,
  StockTransactionType,
  StockSubtype,
  TransactionSource,
  MarketplaceListing,
  MarketplaceOrder,
  MarketplaceOrderItem,
  MarketplaceOrderStatus,
  MarketplaceMetrics,
  AppSettings,
} from '../types';

/**
 * ============================================================================
 * UNIFIED DATA STORE (SINGLE SOURCE OF TRUTH)
 * ============================================================================
 * Manages all relational workflows across:
 * Scan Product → Product Database → Inventory
 * Scan Invoice → Purchase → Inventory Accounting → Inventory → Account/Purchases
 * Sale → Sales Record → Inventory Stock Decrease → Profit/Loss
 * Purchase → Purchases Record → Inventory Stock Increase → Inventory Accounting
 * Expiry/Damage → Inventory Loss → Loss Account
 * Marketplace (FB, WhatsApp, TikTok) → Reserved/Sold Stock → Orders → Sales Ledger
 * Location Transfers → Inter-Rack Movement (Net Zero Inventory Change)
 */

const STORAGE_KEYS = {
  PRODUCTS: 'ais_inventory_products_v1',
  INVOICES: 'ais_invoices_v1',
  ACCOUNTING: 'ais_inventory_accounting_v1',
  SALES: 'ais_sales_v1',
  PURCHASES: 'ais_purchases_v1',
  LOSSES: 'ais_losses_v1',
  EXPENSES: 'ais_expenses_v1',
  INCOME: 'ais_income_v1',
  SCAN_HISTORY: 'ais_scan_history_v1',
  STOCK_TRANSACTIONS: 'ais_stock_transactions_v1',
  MARKETPLACE_LISTINGS: 'ais_marketplace_listings_v1',
  MARKETPLACE_ORDERS: 'ais_marketplace_orders_v1',
  SETTINGS: 'ais_app_settings_v1',
};

// Simple event-emitter listener for reactive updates
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeToStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach((l) => {
    try {
      l();
    } catch (err) {
      console.error('Store listener error:', err);
    }
  });
}

function getStoredArray<T>(key: string, defaultVal: T[] = []): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultVal;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read from localStorage (${key}):`, err);
    return defaultVal;
  }
}

function setStoredArray<T>(key: string, data: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to write to localStorage (${key}):`, err);
  }
}

/**
 * Default App Settings
 */
const DEFAULT_APP_SETTINGS: AppSettings = {
  allowNegativeStock: false,
  shopName: 'Metro Express Retail & Mart',
  contactPhone: '+1 (555) 234-5678',
  shopLocation: 'Main Store - Block A, Floor 1',
  currency: '$',
  defaultDeliveryInfo: 'Standard 24-48 hr delivery / Instant Store Pickup',
  facebookHandle: 'MetroExpressShop',
  whatsappNumber: '+15552345678',
  tiktokHandle: '@MetroExpressMart',
};

export function getAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_APP_SETTINGS));
      return DEFAULT_APP_SETTINGS;
    }
    return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function updateAppSettings(updates: Partial<AppSettings>): AppSettings {
  const current = getAppSettings();
  const merged = { ...current, ...updates };
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
  notifyListeners();
  return merged;
}

export const saveAppSettings = updateAppSettings;

/**
 * Helper to calculate product status
 * Available Stock = Physical Stock - Reserved Stock
 */
export function calculateProductStatus(
  item: Partial<SavedInventoryItem>
): 'in_stock' | 'low_stock' | 'out_of_stock' | 'expiring_soon' | 'expired' | 'reserved' | 'negative_stock' {
  const physicalStock = item.stockQuantity ?? (parseInt(item.quantity || '0', 10) || 0);
  const reserved = item.reservedStock || 0;
  const availableStock = physicalStock - reserved;
  const minStock = item.minStockAlert ?? 5;

  if (physicalStock < 0 || availableStock < 0) {
    return 'negative_stock';
  }

  if (item.expiryDate) {
    const expTime = new Date(item.expiryDate).getTime();
    if (!isNaN(expTime)) {
      const now = Date.now();
      const daysUntilExpiry = (expTime - now) / (1000 * 60 * 60 * 24);
      if (daysUntilExpiry < 0) return 'expired';
      if (daysUntilExpiry <= 45) return 'expiring_soon';
    }
  }

  if (availableStock <= 0) {
    if (reserved > 0 && physicalStock > 0) return 'reserved';
    return 'out_of_stock';
  }
  if (availableStock <= minStock) return 'low_stock';
  if (reserved > 0) return 'reserved';
  return 'in_stock';
}

/**
 * ============================================================================
 * 1. INVENTORY & PRODUCTS MANAGEMENT
 * ============================================================================
 */

export function getProducts(): SavedInventoryItem[] {
  const items = getStoredArray<SavedInventoryItem>(STORAGE_KEYS.PRODUCTS);
  if (items.length === 0) {
    const initialSeed = getInitialCatalogSeed();
    setStoredArray(STORAGE_KEYS.PRODUCTS, initialSeed);
    return initialSeed.map((i) => ({ ...i, status: calculateProductStatus(i) }));
  }
  return items.map((i) => ({ ...i, status: calculateProductStatus(i) }));
}

export function saveProduct(productData: Partial<SavedInventoryItem>): SavedInventoryItem {
  const products = getProducts();
  const numQty = productData.stockQuantity ?? (parseInt(productData.quantity || '1', 10) || 1);

  const existingIdx = products.findIndex((p) => p.id === productData.id || (productData.barcode && p.barcode && p.barcode === productData.barcode));

  if (existingIdx !== -1) {
    const existing = products[existingIdx];
    const updated: SavedInventoryItem = {
      ...existing,
      ...productData,
      stockQuantity: numQty,
      quantity: String(numQty),
      updatedAt: new Date().toISOString(),
    };
    updated.status = calculateProductStatus(updated);
    products[existingIdx] = updated;
    setStoredArray(STORAGE_KEYS.PRODUCTS, products);
    notifyListeners();
    return updated;
  }

  const newItem: SavedInventoryItem = {
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
    quantity: String(numQty),
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
  const updated = [newItem, ...products];
  setStoredArray(STORAGE_KEYS.PRODUCTS, updated);

  // If new product has initial positive stock, create initial inventory accounting entry
  if (numQty > 0) {
    const purchasePriceNum = parseFloat(newItem.purchasePrice?.replace(/[^0-9.]/g, '') || '0') || 0;
    const sellingPriceNum = parseFloat(newItem.sellingPrice?.replace(/[^0-9.]/g, '') || newItem.mrp?.replace(/[^0-9.]/g, '') || '0') || 0;
    const accountingEntries = getAccountingEntries();
    const accEntry: InventoryAccountingEntry = {
      id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      transactionId: `TXN-INIT-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      supplier: newItem.supplier || '',
      productId: newItem.id,
      productName: newItem.productName,
      barcode: newItem.barcode,
      quantity: numQty,
      purchasePrice: purchasePriceNum,
      totalPurchaseValue: numQty * purchasePriceNum,
      sellingPrice: sellingPriceNum,
      stockAdded: numQty,
      previousStock: 0,
      newStock: numQty,
      paymentStatus: 'paid',
      type: 'initial_stock',
      notes: 'Initial Product Inventory Registration',
      createdAt: new Date().toISOString(),
    };
    setStoredArray(STORAGE_KEYS.ACCOUNTING, [accEntry, ...accountingEntries]);
  }

  notifyListeners();
  return newItem;
}

export function updateProduct(id: string, updates: Partial<SavedInventoryItem>): SavedInventoryItem[] {
  const products = getProducts();
  const updated = products.map((item) => {
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

  setStoredArray(STORAGE_KEYS.PRODUCTS, updated);
  notifyListeners();
  return updated;
}

export function deleteProduct(id: string): SavedInventoryItem[] {
  const products = getProducts().filter((p) => p.id !== id);
  setStoredArray(STORAGE_KEYS.PRODUCTS, products);
  notifyListeners();
  return products;
}

/**
 * ============================================================================
 * 1.1 STANDARDIZED STOCK TRANSACTION ENGINE
 * ============================================================================
 * Handles all inventory mutations across:
 * - STOCK IN (Purchase, Manual Add, Opening Stock, Return, Transfer In, Adj Increase)
 * - STOCK OUT (Sale, Marketplace Order, Damaged, Expired, Lost, Transfer Out, Adj Decrease)
 * - STOCK TRANSFER (Location movements with Net Zero Total Change)
 * - STOCK ADJUSTMENT (Direct reconciled balance adjustments)
 */

export function getStockTransactions(): StockTransaction[] {
  const txns = getStoredArray<StockTransaction>(STORAGE_KEYS.STOCK_TRANSACTIONS);
  if (txns.length === 0) {
    const initialSeed = getInitialStockTransactionSeed();
    setStoredArray(STORAGE_KEYS.STOCK_TRANSACTIONS, initialSeed);
    return initialSeed;
  }
  return txns;
}

export function executeStockTransaction(params: {
  productId: string;
  transactionType: StockTransactionType;
  subType: StockSubtype;
  quantity: number;
  unit?: string;
  source: TransactionSource;
  referenceId?: string;
  notes?: string;
  fromLocation?: string;
  toLocation?: string;
  idempotencyKey?: string;
  operator?: string;
  unitPrice?: number;
  supplier?: string;
  allowNegativeOverride?: boolean;
}): {
  success: boolean;
  message: string;
  transaction?: StockTransaction;
  updatedProduct?: SavedInventoryItem;
} {
  const existingTransactions = getStockTransactions();

  // Idempotency check: prevent duplicate stock deductions on retries
  if (params.idempotencyKey) {
    const existing = existingTransactions.find((t) => t.idempotencyKey === params.idempotencyKey);
    if (existing) {
      const products = getProducts();
      const currentProd = products.find((p) => p.id === params.productId);
      return {
        success: true,
        message: `Transaction already processed (Idempotency Key: ${params.idempotencyKey}).`,
        transaction: existing,
        updatedProduct: currentProd,
      };
    }
  }

  const products = getProducts();
  const prodIndex = products.findIndex((p) => p.id === params.productId);
  if (prodIndex === -1) {
    return { success: false, message: `Product with ID '${params.productId}' was not found.` };
  }

  const prod = products[prodIndex];
  const settings = getAppSettings();
  const previousStock = prod.stockQuantity || 0;
  const previousReserved = prod.reservedStock || 0;
  let newStock = previousStock;
  let newReserved = previousReserved;
  const changeQty = Math.abs(params.quantity);

  if (params.transactionType === 'stock_in') {
    // Rule: New Stock = Previous Stock + Stock In
    newStock = previousStock + changeQty;
  } else if (params.transactionType === 'stock_out') {
    // Rule: New Stock = Previous Stock - Stock Out
    newStock = previousStock - changeQty;

    // Check negative stock constraints
    if (newStock < 0 && !settings.allowNegativeStock && !params.allowNegativeOverride) {
      return {
        success: false,
        message: `Insufficient stock for "${prod.productName}". Available: ${previousStock}, Requested: ${changeQty}. Negative stock is disabled in settings.`,
      };
    }
  } else if (params.transactionType === 'stock_transfer') {
    // Rule: Moving stock between locations must NOT change total inventory.
    // Total Stock Before = Total Stock After
    newStock = previousStock;
  } else if (params.transactionType === 'stock_adjustment') {
    if (params.quantity >= 0) {
      newStock = previousStock + params.quantity;
    } else {
      newStock = Math.max(0, previousStock + params.quantity);
    }
  }

  // Update product model
  const updatedProduct: SavedInventoryItem = {
    ...prod,
    stockQuantity: newStock,
    quantity: String(newStock),
    reservedStock: newReserved,
    rackLocation: params.toLocation || prod.rackLocation || params.fromLocation || '',
    updatedAt: new Date().toISOString(),
    ...(params.transactionType === 'stock_in' && {
      lastPurchaseDate: new Date().toISOString().split('T')[0],
      ...(params.supplier ? { supplier: params.supplier } : {}),
    }),
    ...(params.transactionType === 'stock_out' && {
      lastSaleDate: new Date().toISOString().split('T')[0],
    }),
  };
  updatedProduct.status = calculateProductStatus(updatedProduct);

  products[prodIndex] = updatedProduct;
  setStoredArray(STORAGE_KEYS.PRODUCTS, products);

  // Create standardized stock transaction record
  const transactionRecord: StockTransaction = {
    id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    transactionId: `STK-${Date.now().toString().slice(-7)}`,
    productId: prod.id,
    productName: prod.productName,
    barcode: prod.barcode,
    sku: prod.sku,
    transactionType: params.transactionType,
    subType: params.subType,
    quantity: changeQty,
    unit: params.unit || prod.unit || 'units',
    previousStock,
    newStock,
    previousReservedStock: previousReserved,
    newReservedStock: newReserved,
    source: params.source,
    referenceId: params.referenceId,
    dateTime: new Date().toISOString(),
    timestamp: Date.now(),
    operator: params.operator || 'Store Manager',
    notes: params.notes || `${params.transactionType.toUpperCase()} via ${params.source}`,
    fromLocation: params.fromLocation,
    toLocation: params.toLocation,
    idempotencyKey: params.idempotencyKey,
  };

  setStoredArray(STORAGE_KEYS.STOCK_TRANSACTIONS, [transactionRecord, ...existingTransactions]);

  // Sync to Accounting Ledger for financial transparency
  const purchasePrice = params.unitPrice ?? (parseFloat(prod.purchasePrice?.replace(/[^0-9.]/g, '') || '0') || 0);
  const sellingPrice = parseFloat(prod.sellingPrice?.replace(/[^0-9.]/g, '') || prod.mrp?.replace(/[^0-9.]/g, '') || '0') || 0;
  const stockAdded = params.transactionType === 'stock_in' ? changeQty : params.transactionType === 'stock_out' ? -changeQty : 0;

  const accountingEntries = getAccountingEntries();
  const accEntry: InventoryAccountingEntry = {
    id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    transactionId: transactionRecord.transactionId,
    date: new Date().toISOString(),
    supplier: params.supplier || prod.supplier || '',
    productId: prod.id,
    productName: prod.productName,
    barcode: prod.barcode,
    quantity: changeQty,
    purchasePrice,
    totalPurchaseValue: changeQty * purchasePrice,
    sellingPrice,
    stockAdded,
    previousStock,
    newStock,
    paymentStatus: 'paid',
    type: params.transactionType === 'stock_in' ? 'stock_in' : params.transactionType === 'stock_out' ? 'stock_out' : 'manual_entry',
    notes: params.notes || `${params.subType} (${params.source})`,
    createdAt: new Date().toISOString(),
  };
  setStoredArray(STORAGE_KEYS.ACCOUNTING, [accEntry, ...accountingEntries]);

  notifyListeners();
  return {
    success: true,
    message: `Stock updated successfully: ${previousStock} → ${newStock} ${prod.unit || 'units'}.`,
    transaction: transactionRecord,
    updatedProduct,
  };
}

/**
 * Direct stock adjustment (Stock In / Stock Out) using standardized engine
 */
export function recordStockAdjustment(params: {
  productId: string;
  quantityChange: number; // positive for in, negative for out
  type: 'stock_in' | 'stock_out' | 'manual_adjustment';
  reason?: string;
  unitPrice?: number;
  supplier?: string;
  notes?: string;
}): { success: boolean; product?: SavedInventoryItem; entry?: InventoryAccountingEntry } {
  const isIncrease = params.quantityChange >= 0;
  const qty = Math.abs(params.quantityChange);

  const res = executeStockTransaction({
    productId: params.productId,
    transactionType: isIncrease ? 'stock_in' : 'stock_out',
    subType: isIncrease ? 'adjustment_increase' : 'adjustment_decrease',
    quantity: qty,
    source: 'Manual Entry',
    notes: params.notes || params.reason || (isIncrease ? 'Manual stock increase (+)' : 'Manual stock decrease (-)'),
    unitPrice: params.unitPrice,
    supplier: params.supplier,
  });

  const accounting = getAccountingEntries();
  return {
    success: res.success,
    product: res.updatedProduct,
    entry: accounting[0],
  };
}

/**
 * STOCK TRANSFER RULE:
 * Moving stock between locations must NOT change total inventory.
 * Example: Rack A → Rack B
 * Record: Transfer Out from Rack A, Transfer In to Rack B
 * Total Stock Before = Total Stock After
 */
export function transferStock(params: {
  productId: string;
  fromLocation: string;
  toLocation: string;
  quantity: number;
  notes?: string;
  operator?: string;
}): { success: boolean; message: string; transaction?: StockTransaction; updatedProduct?: SavedInventoryItem } {
  if (!params.fromLocation.trim() || !params.toLocation.trim()) {
    return { success: false, message: 'Both Source Location and Destination Location are required.' };
  }

  if (params.fromLocation.trim().toLowerCase() === params.toLocation.trim().toLowerCase()) {
    return { success: false, message: 'Source and Destination locations must be different.' };
  }

  return executeStockTransaction({
    productId: params.productId,
    transactionType: 'stock_transfer',
    subType: 'transfer_out',
    quantity: params.quantity,
    source: 'Location Transfer',
    fromLocation: params.fromLocation.trim(),
    toLocation: params.toLocation.trim(),
    notes: params.notes || `Stock transfer of ${params.quantity} units from [${params.fromLocation}] to [${params.toLocation}]. Total inventory unchanged.`,
    operator: params.operator || 'Warehouse Transfer Agent',
  });
}

/**
 * ============================================================================
 * 2. INVOICE WORKFLOW & INVENTORY ACCOUNTING CONFIRMATION
 * ============================================================================
 */

export function getInvoices(): InvoiceData[] {
  return getStoredArray<InvoiceData>(STORAGE_KEYS.INVOICES);
}

export function saveDraftInvoice(invoice: Omit<InvoiceData, 'id' | 'createdAt'>): InvoiceData {
  const invoices = getInvoices();
  const newInvoice: InvoiceData = {
    ...invoice,
    id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    isProcessed: false,
  };
  setStoredArray(STORAGE_KEYS.INVOICES, [newInvoice, ...invoices]);
  notifyListeners();
  return newInvoice;
}

/**
 * Confirms an invoice and triggers all downstream automated workflows:
 * PURCHASE INVOICE → Purchase Record → Inventory Stock Increase → Inventory Accounting Entry → Account/Purchases
 * (Prevents double counting if already confirmed)
 */
export function confirmPurchaseInvoice(invoice: InvoiceData): {
  success: boolean;
  message: string;
  purchaseRecord?: PurchaseRecord;
  entriesCreated?: number;
} {
  const invoices = getInvoices();
  const existingInv = invoices.find((i) => i.id === invoice.id || (i.invoiceNumber && i.invoiceNumber === invoice.invoiceNumber && i.isProcessed));

  if (existingInv && existingInv.isProcessed) {
    return {
      success: false,
      message: `Invoice #${invoice.invoiceNumber || invoice.id} has already been processed and confirmed. Duplicate prevented.`,
    };
  }

  const products = getProducts();
  const accountingEntries = getAccountingEntries();
  const purchases = getPurchases();

  const newAccountingEntries: InventoryAccountingEntry[] = [];
  const updatedProductsMap = new Map<string, SavedInventoryItem>();
  products.forEach((p) => updatedProductsMap.set(p.id, { ...p }));

  let totalQty = 0;

  for (const item of invoice.items) {
    const qty = Number(item.quantity) || 1;
    totalQty += qty;
    const unitPrice = Number(item.unitPrice) || 0;
    const itemTotal = Number(item.totalPrice) || qty * unitPrice;
    const sellingPrice = Number(item.sellingPrice || item.mrp) || Math.round(unitPrice * 1.35 * 100) / 100;

    // Match product in inventory by barcode, SKU, or productName
    let targetProduct = products.find((p) => {
      if (item.barcode && p.barcode && p.barcode === item.barcode) return true;
      if (item.sku && p.sku && p.sku === item.sku) return true;
      if (p.productName.toLowerCase().trim() === item.productName.toLowerCase().trim()) return true;
      return false;
    });

    let previousStock = 0;
    let newStock = qty;

    if (targetProduct) {
      const liveProd = updatedProductsMap.get(targetProduct.id) || targetProduct;
      previousStock = liveProd.stockQuantity || 0;
      newStock = previousStock + qty;

      const updated: SavedInventoryItem = {
        ...liveProd,
        stockQuantity: newStock,
        quantity: String(newStock),
        purchasePrice: `$${unitPrice.toFixed(2)}`,
        sellingPrice: `$${sellingPrice.toFixed(2)}`,
        mrp: item.mrp ? `$${Number(item.mrp).toFixed(2)}` : liveProd.mrp,
        supplier: invoice.supplier || liveProd.supplier,
        manufacturingDate: item.mfd || liveProd.manufacturingDate,
        expiryDate: item.exp || liveProd.expiryDate,
        batchNumber: item.batchNumber || liveProd.batchNumber,
        lastPurchaseDate: invoice.invoiceDate || new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString(),
      };
      updated.status = calculateProductStatus(updated);
      updatedProductsMap.set(targetProduct.id, updated);
      targetProduct = updated;
    } else {
      // Create new product in catalog
      const newProd: SavedInventoryItem = {
        id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        savedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        productName: item.productName.trim(),
        brand: invoice.supplier || '',
        category: item.category || 'General Goods',
        sku: item.sku || (item.barcode ? `SKU-${item.barcode.slice(-6)}` : `SKU-INV-${Date.now().toString().slice(-4)}`),
        barcode: item.barcode || '',
        batchNumber: item.batchNumber || '',
        manufacturingDate: item.mfd || '',
        expiryDate: item.exp || '',
        bestBefore: item.exp || '',
        quantity: String(qty),
        unit: item.unit || 'units',
        mrp: item.mrp ? `$${Number(item.mrp).toFixed(2)}` : `$${sellingPrice.toFixed(2)}`,
        sellingPrice: `$${sellingPrice.toFixed(2)}`,
        purchasePrice: `$${unitPrice.toFixed(2)}`,
        stockQuantity: qty,
        minStockAlert: 5,
        supplier: invoice.supplier || '',
        rackLocation: 'Warehouse Entry',
        notes: `Imported via Confirmed Invoice #${invoice.invoiceNumber}`,
        warnings: [],
        missingFields: [],
        status: 'in_stock',
        lastPurchaseDate: invoice.invoiceDate || new Date().toISOString().split('T')[0],
      };
      newProd.status = calculateProductStatus(newProd);
      updatedProductsMap.set(newProd.id, newProd);
      targetProduct = newProd;
    }

    // Create Inventory Accounting Record
    const accEntry: InventoryAccountingEntry = {
      id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${Math.floor(Math.random() * 1000)}`,
      transactionId: `TXN-INV-${(invoice.invoiceNumber || Date.now().toString().slice(-6)).replace(/[^a-zA-Z0-9]/g, '')}`,
      date: invoice.invoiceDate || new Date().toISOString(),
      invoiceNumber: invoice.invoiceNumber,
      supplier: invoice.supplier,
      productId: targetProduct.id,
      productName: targetProduct.productName,
      barcode: targetProduct.barcode,
      quantity: qty,
      purchasePrice: unitPrice,
      totalPurchaseValue: itemTotal,
      sellingPrice,
      stockAdded: qty,
      previousStock,
      newStock,
      paymentStatus: invoice.paymentStatus || 'paid',
      type: 'purchase_invoice',
      notes: `Invoice line item: ${qty} x ${item.productName} @ $${unitPrice.toFixed(2)}`,
      createdAt: new Date().toISOString(),
    };
    newAccountingEntries.push(accEntry);
  }

  // Save updated products
  const finalProductsList = Array.from(updatedProductsMap.values());
  setStoredArray(STORAGE_KEYS.PRODUCTS, finalProductsList);

  // Save accounting entries
  setStoredArray(STORAGE_KEYS.ACCOUNTING, [...newAccountingEntries, ...accountingEntries]);

  // Create Purchase Record
  const productSummary = invoice.items.length === 1
    ? `${invoice.items[0].quantity}x ${invoice.items[0].productName}`
    : `${invoice.items.length} products (${invoice.items.slice(0, 2).map((i) => i.productName).join(', ')}${invoice.items.length > 2 ? '...' : ''})`;

  const purchaseRecord: PurchaseRecord = {
    id: `purch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    purchaseId: `PO-${(invoice.invoiceNumber || Date.now().toString().slice(-6)).replace(/[^a-zA-Z0-9]/g, '')}`,
    invoiceNumber: invoice.invoiceNumber,
    date: invoice.invoiceDate || new Date().toISOString().split('T')[0],
    supplier: invoice.supplier,
    items: invoice.items,
    productSummary,
    totalQuantity: totalQty,
    totalPurchase: invoice.grandTotal || invoice.subtotal,
    discount: invoice.discountAmount || 0,
    tax: invoice.taxAmount || 0,
    paymentStatus: invoice.paymentStatus || 'paid',
    paymentMethod: invoice.paymentMethod || 'bank_transfer',
    notes: invoice.notes,
    createdAt: new Date().toISOString(),
  };

  setStoredArray(STORAGE_KEYS.PURCHASES, [purchaseRecord, ...purchases]);

  // Mark invoice as processed
  const finalInvoice: InvoiceData = {
    ...invoice,
    isProcessed: true,
    confirmedAt: new Date().toISOString(),
  };
  const updatedInvoices = invoices.filter((i) => i.id !== invoice.id);
  setStoredArray(STORAGE_KEYS.INVOICES, [finalInvoice, ...updatedInvoices]);

  notifyListeners();
  return {
    success: true,
    message: `Invoice #${invoice.invoiceNumber || 'INV'} confirmed: Stock increased, inventory accounting updated, and purchase record created.`,
    purchaseRecord,
    entriesCreated: newAccountingEntries.length,
  };
}

export function getAccountingEntries(): InventoryAccountingEntry[] {
  return getStoredArray<InventoryAccountingEntry>(STORAGE_KEYS.ACCOUNTING);
}

/**
 * ============================================================================
 * 3. SALES TRACKING (ACCOUNT → SALES)
 * ============================================================================
 */

export function getSales(): SaleRecord[] {
  return getStoredArray<SaleRecord>(STORAGE_KEYS.SALES);
}

export function recordSale(saleData: {
  productId: string;
  quantity: number;
  sellingPrice: number;
  discount?: number;
  tax?: number;
  paymentMethod: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'credit';
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  source?: TransactionSource;
  orderNumber?: string;
}): { success: boolean; message: string; sale?: SaleRecord } {
  const products = getProducts();
  const prod = products.find((p) => p.id === saleData.productId);

  if (!prod) {
    return { success: false, message: 'Product not found in inventory.' };
  }

  const stockTxnRes = executeStockTransaction({
    productId: prod.id,
    transactionType: 'stock_out',
    subType: 'sale',
    quantity: saleData.quantity,
    source: saleData.source || 'POS',
    referenceId: saleData.orderNumber,
    notes: saleData.notes || `Sale of ${saleData.quantity} units to ${saleData.customerName || 'Walk-in Customer'}`,
  });

  if (!stockTxnRes.success) {
    return { success: false, message: stockTxnRes.message };
  }

  const purchasePrice = parseFloat(prod.purchasePrice?.replace(/[^0-9.]/g, '') || '0') || 0;
  const discount = saleData.discount || 0;
  const tax = saleData.tax || 0;
  const totalSale = Math.max(0, saleData.quantity * saleData.sellingPrice - discount + tax);

  // Create Sale Record
  const newSale: SaleRecord = {
    id: `sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    saleId: saleData.orderNumber || `SALE-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString(),
    productId: prod.id,
    productName: prod.productName,
    barcode: prod.barcode,
    category: prod.category,
    quantity: saleData.quantity,
    sellingPrice: saleData.sellingPrice,
    purchasePrice,
    discount,
    tax,
    totalSale,
    paymentMethod: saleData.paymentMethod,
    customerName: saleData.customerName,
    customerPhone: saleData.customerPhone,
    notes: saleData.notes,
    createdAt: new Date().toISOString(),
  };

  const sales = getSales();
  setStoredArray(STORAGE_KEYS.SALES, [newSale, ...sales]);

  notifyListeners();
  return {
    success: true,
    message: `Sale ${newSale.saleId} recorded. Stock updated to ${stockTxnRes.updatedProduct?.stockQuantity || 0}.`,
    sale: newSale,
  };
}

/**
 * ============================================================================
 * 3.1 MARKETPLACE MODULE & STATE MACHINE
 * ============================================================================
 * Manages Listings, Multi-channel Social Selling (FB, WhatsApp, TikTok),
 * and Order State Machine (Draft → Pending → Confirmed → Packed → Shipped → Delivered).
 */

export function getMarketplaceListings(): MarketplaceListing[] {
  const listings = getStoredArray<MarketplaceListing>(STORAGE_KEYS.MARKETPLACE_LISTINGS);
  if (listings.length === 0) {
    const initialSeed = getInitialMarketplaceListingsSeed();
    setStoredArray(STORAGE_KEYS.MARKETPLACE_LISTINGS, initialSeed);
    return initialSeed;
  }
  return listings;
}

export function saveMarketplaceListing(data: Omit<MarketplaceListing, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): MarketplaceListing {
  const listings = getMarketplaceListings();
  const existingIdx = listings.findIndex((l) => l.id === data.id);

  if (existingIdx !== -1) {
    const existing = listings[existingIdx];
    const updated: MarketplaceListing = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    listings[existingIdx] = updated;
    setStoredArray(STORAGE_KEYS.MARKETPLACE_LISTINGS, listings);
    notifyListeners();
    return updated;
  }

  const newListing: MarketplaceListing = {
    ...data,
    id: data.id || `mkt_list_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    viewsCount: 0,
    inquiriesCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  setStoredArray(STORAGE_KEYS.MARKETPLACE_LISTINGS, [newListing, ...listings]);
  notifyListeners();
  return newListing;
}

export function updateMarketplaceListing(id: string, updates: Partial<MarketplaceListing>): MarketplaceListing[] {
  const listings = getMarketplaceListings();
  const updated = listings.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    }
    return item;
  });
  setStoredArray(STORAGE_KEYS.MARKETPLACE_LISTINGS, updated);
  notifyListeners();
  return updated;
}

export function deleteMarketplaceListing(id: string): MarketplaceListing[] {
  const listings = getMarketplaceListings().filter((l) => l.id !== id);
  setStoredArray(STORAGE_KEYS.MARKETPLACE_LISTINGS, listings);
  notifyListeners();
  return listings;
}

export function getMarketplaceOrders(): MarketplaceOrder[] {
  const orders = getStoredArray<MarketplaceOrder>(STORAGE_KEYS.MARKETPLACE_ORDERS);
  if (orders.length === 0) {
    const initialSeed = getInitialMarketplaceOrdersSeed();
    setStoredArray(STORAGE_KEYS.MARKETPLACE_ORDERS, initialSeed);
    return initialSeed;
  }
  return orders;
}

/**
 * MARKETPLACE ORDER CREATION & STOCK RESERVATION
 * Rule: When an order is created in 'pending' or 'draft':
 * Reserved Stock += Order Quantity
 * Physical stock is NOT yet reduced.
 */
export function createMarketplaceOrder(orderInput: {
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  channel: 'facebook' | 'whatsapp' | 'tiktok' | 'pos' | 'marketplace' | 'other';
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice?: number;
  }>;
  shippingFee?: number;
  discount?: number;
  tax?: number;
  paymentMethod?: string;
  paymentStatus?: 'pending' | 'paid' | 'cod';
  notes?: string;
  initialStatus?: MarketplaceOrderStatus;
}): { success: boolean; message: string; order?: MarketplaceOrder } {
  const products = getProducts();
  const resolvedItems: MarketplaceOrderItem[] = [];
  let subtotal = 0;

  // Validate products and check stock availability
  for (const it of orderInput.items) {
    const prod = products.find((p) => p.id === it.productId);
    if (!prod) {
      return { success: false, message: `Product ID "${it.productId}" not found in inventory.` };
    }
    const sellPrice = it.unitPrice ?? (parseFloat(prod.sellingPrice?.replace(/[^0-9.]/g, '') || prod.mrp?.replace(/[^0-9.]/g, '') || '0') || 0);
    const purchasePrice = parseFloat(prod.purchasePrice?.replace(/[^0-9.]/g, '') || '0') || 0;
    const itemTotal = it.quantity * sellPrice;
    subtotal += itemTotal;

    resolvedItems.push({
      productId: prod.id,
      productName: prod.productName,
      barcode: prod.barcode,
      sku: prod.sku,
      image: prod.imageThumbnail,
      quantity: it.quantity,
      unit: prod.unit || 'units',
      unitPrice: sellPrice,
      purchasePrice,
      totalPrice: itemTotal,
    });
  }

  const shippingFee = orderInput.shippingFee || 0;
  const discount = orderInput.discount || 0;
  const tax = orderInput.tax || 0;
  const totalAmount = Math.max(0, subtotal - discount + tax + shippingFee);
  const status: MarketplaceOrderStatus = orderInput.initialStatus || 'pending';

  const newOrder: MarketplaceOrder = {
    id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    orderNumber: `ORD-${orderInput.channel.toUpperCase().slice(0, 2)}-${Date.now().toString().slice(-6)}`,
    customerName: orderInput.customerName.trim(),
    customerPhone: orderInput.customerPhone?.trim(),
    customerAddress: orderInput.customerAddress?.trim(),
    customerCity: orderInput.customerCity?.trim(),
    channel: orderInput.channel,
    items: resolvedItems,
    subtotal,
    discount,
    tax,
    shippingFee,
    totalAmount,
    status,
    statusHistory: [
      {
        status,
        timestamp: new Date().toISOString(),
        notes: `Order created via ${orderInput.channel.toUpperCase()}`,
      },
    ],
    isStockReserved: status === 'pending' || status === 'draft',
    isStockDeducted: false,
    paymentStatus: orderInput.paymentStatus || (orderInput.channel === 'pos' ? 'paid' : 'cod'),
    paymentMethod: orderInput.paymentMethod || 'cash_on_delivery',
    notes: orderInput.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // If pending or draft, reserve the stock on all items
  if (newOrder.isStockReserved) {
    const updatedProducts = products.map((p) => {
      const match = resolvedItems.find((ri) => ri.productId === p.id);
      if (match) {
        const currentReserved = p.reservedStock || 0;
        const newReserved = currentReserved + match.quantity;
        const updated = {
          ...p,
          reservedStock: newReserved,
          updatedAt: new Date().toISOString(),
        };
        updated.status = calculateProductStatus(updated);
        return updated;
      }
      return p;
    });
    setStoredArray(STORAGE_KEYS.PRODUCTS, updatedProducts);
  }

  // If initial status is confirmed, packed, shipped, or delivered right away (e.g. POS direct checkout)
  if (['confirmed', 'packed', 'shipped', 'delivered'].includes(status)) {
    newOrder.isStockReserved = false;
    newOrder.isStockDeducted = true;

    for (const item of resolvedItems) {
      executeStockTransaction({
        productId: item.productId,
        transactionType: 'stock_out',
        subType: 'marketplace_order',
        quantity: item.quantity,
        source: getTransactionSourceFromChannel(orderInput.channel),
        referenceId: newOrder.orderNumber,
        notes: `Direct fulfillment of order ${newOrder.orderNumber} (${orderInput.customerName})`,
      });
    }

    // Automatically create accounting sale record
    recordOrderAccountingSale(newOrder);
  }

  const orders = getMarketplaceOrders();
  setStoredArray(STORAGE_KEYS.MARKETPLACE_ORDERS, [newOrder, ...orders]);
  notifyListeners();

  return {
    success: true,
    message: `Order #${newOrder.orderNumber} created successfully (${newOrder.status.toUpperCase()}).`,
    order: newOrder,
  };
}

function getTransactionSourceFromChannel(channel: MarketplaceOrder['channel']): TransactionSource {
  switch (channel) {
    case 'facebook':
      return 'Facebook';
    case 'whatsapp':
      return 'WhatsApp';
    case 'tiktok':
      return 'TikTok';
    case 'pos':
      return 'POS';
    default:
      return 'Marketplace';
  }
}

/**
 * Sync completed/fulfilled order to Account -> Sales ledger
 */
function recordOrderAccountingSale(order: MarketplaceOrder) {
  if (order.accountingSaleId) return; // Prevent duplicate accounting entries

  const sales = getSales();
  const newSales: SaleRecord[] = [];

  for (const item of order.items) {
    const saleRec: SaleRecord = {
      id: `sale_ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      saleId: order.orderNumber,
      date: order.createdAt,
      productId: item.productId,
      productName: item.productName,
      barcode: item.barcode,
      quantity: item.quantity,
      sellingPrice: item.unitPrice,
      purchasePrice: item.purchasePrice || 0,
      discount: (order.discount / order.items.length) || 0,
      tax: (order.tax / order.items.length) || 0,
      totalSale: item.totalPrice,
      paymentMethod: order.paymentMethod === 'card' ? 'card' : order.paymentMethod === 'upi' ? 'upi' : 'cash',
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      notes: `Marketplace Order via ${order.channel.toUpperCase()} (${order.status.toUpperCase()})`,
      createdAt: new Date().toISOString(),
    };
    newSales.push(saleRec);
  }

  order.accountingSaleId = order.orderNumber;
  setStoredArray(STORAGE_KEYS.SALES, [...newSales, ...sales]);
}

/**
 * MARKETPLACE ORDER STATE MACHINE TRANSITIONS
 * Transitions:
 * draft → pending → confirmed → packed → shipped → delivered
 * or → cancelled, returned, refunded
 */
export function updateMarketplaceOrderStatus(
  orderId: string,
  nextStatus: MarketplaceOrderStatus,
  notes?: string
): { success: boolean; message: string; order?: MarketplaceOrder } {
  const orders = getMarketplaceOrders();
  const orderIdx = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);

  if (orderIdx === -1) {
    return { success: false, message: `Order '${orderId}' not found.` };
  }

  const order = orders[orderIdx];
  const previousStatus = order.status;

  if (previousStatus === nextStatus) {
    return { success: true, message: `Order is already in status ${nextStatus}.`, order };
  }

  const products = getProducts();

  // RULE A: Transition from Draft/Pending → Confirmed / Packed / Shipped / Delivered
  // Release reservation, Deduct Physical Stock, Record Stock Out, and sync Accounting Sale!
  if (
    ['draft', 'pending'].includes(previousStatus) &&
    ['confirmed', 'packed', 'shipped', 'delivered'].includes(nextStatus)
  ) {
    if (!order.isStockDeducted) {
      // 1. Release reserved stock & deduct physical stock
      const updatedProducts = products.map((p) => {
        const itemMatch = order.items.find((it) => it.productId === p.id);
        if (itemMatch) {
          const currentReserved = p.reservedStock || 0;
          const newReserved = Math.max(0, currentReserved - itemMatch.quantity);
          const currentPhysical = p.stockQuantity || 0;
          const newPhysical = Math.max(0, currentPhysical - itemMatch.quantity);

          const updated = {
            ...p,
            stockQuantity: newPhysical,
            quantity: String(newPhysical),
            reservedStock: newReserved,
            lastSaleDate: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString(),
          };
          updated.status = calculateProductStatus(updated);
          return updated;
        }
        return p;
      });
      setStoredArray(STORAGE_KEYS.PRODUCTS, updatedProducts);

      // 2. Record Stock Out Transactions
      for (const item of order.items) {
        executeStockTransaction({
          productId: item.productId,
          transactionType: 'stock_out',
          subType: 'marketplace_order',
          quantity: item.quantity,
          source: getTransactionSourceFromChannel(order.channel),
          referenceId: order.orderNumber,
          notes: `Order ${order.orderNumber} confirmed & fulfilled via ${order.channel.toUpperCase()}`,
        });
      }

      order.isStockDeducted = true;
      order.isStockReserved = false;

      // 3. Sync to Accounting Sales Ledger
      recordOrderAccountingSale(order);
    }
  }

  // RULE B: Transition to Cancelled
  // If stock was reserved but not deducted: release reservation.
  // If stock was already deducted: revert physical stock (restock).
  // Do NOT count cancelled orders as completed revenue.
  if (nextStatus === 'cancelled') {
    if (order.isStockReserved && !order.isStockDeducted) {
      // Release reserved stock
      const updatedProducts = products.map((p) => {
        const itemMatch = order.items.find((it) => it.productId === p.id);
        if (itemMatch) {
          const currentReserved = p.reservedStock || 0;
          const newReserved = Math.max(0, currentReserved - itemMatch.quantity);
          const updated = {
            ...p,
            reservedStock: newReserved,
            updatedAt: new Date().toISOString(),
          };
          updated.status = calculateProductStatus(updated);
          return updated;
        }
        return p;
      });
      setStoredArray(STORAGE_KEYS.PRODUCTS, updatedProducts);
      order.isStockReserved = false;
    } else if (order.isStockDeducted) {
      // Revert physical stock via Stock In return
      for (const item of order.items) {
        executeStockTransaction({
          productId: item.productId,
          transactionType: 'stock_in',
          subType: 'customer_return',
          quantity: item.quantity,
          source: getTransactionSourceFromChannel(order.channel),
          referenceId: order.orderNumber,
          notes: `Order ${order.orderNumber} cancelled. Restocking items.`,
        });
      }
      order.isStockDeducted = false;
    }
  }

  // RULE C: Transition to Returned / Refunded
  // If stock was deducted, return items to inventory and log customer_return transaction.
  if (nextStatus === 'returned' || nextStatus === 'refunded') {
    if (order.isStockDeducted) {
      for (const item of order.items) {
        executeStockTransaction({
          productId: item.productId,
          transactionType: 'stock_in',
          subType: 'customer_return',
          quantity: item.quantity,
          source: getTransactionSourceFromChannel(order.channel),
          referenceId: order.orderNumber,
          notes: `Customer return accepted for Order ${order.orderNumber}. Restocked to inventory.`,
        });
      }
      order.isStockDeducted = false;
    }
    if (nextStatus === 'refunded') {
      order.paymentStatus = 'refunded';
    }
  }

  // Update order record
  order.status = nextStatus;
  order.updatedAt = new Date().toISOString();
  order.statusHistory = [
    ...order.statusHistory,
    {
      status: nextStatus,
      timestamp: new Date().toISOString(),
      notes: notes || `Status changed from ${previousStatus.toUpperCase()} to ${nextStatus.toUpperCase()}`,
    },
  ];

  orders[orderIdx] = order;
  setStoredArray(STORAGE_KEYS.MARKETPLACE_ORDERS, orders);
  notifyListeners();

  return {
    success: true,
    message: `Order #${order.orderNumber} status changed to ${nextStatus.toUpperCase()}.`,
    order,
  };
}

export function cancelMarketplaceOrder(orderId: string, reason?: string) {
  return updateMarketplaceOrderStatus(orderId, 'cancelled', reason || 'Cancelled by customer/manager');
}

export function processMarketplaceReturn(orderId: string, reason?: string) {
  return updateMarketplaceOrderStatus(orderId, 'returned', reason || 'Returned by customer');
}

/**
 * Marketplace Summary Metrics
 */
export function getMarketplaceMetrics(): MarketplaceMetrics {
  const listings = getMarketplaceListings();
  const orders = getMarketplaceOrders();
  const products = getProducts();

  const publishedCount = listings.filter((l) => l.status === 'published').length;
  const draftCount = listings.filter((l) => l.status === 'draft').length;
  const readyToSellCount = products.filter((p) => (p.stockQuantity || 0) > (p.reservedStock || 0)).length;

  const pendingOrdersCount = orders.filter((o) => o.status === 'pending' || o.status === 'draft').length;
  const confirmedOrdersCount = orders.filter((o) => ['confirmed', 'packed', 'shipped', 'delivered'].includes(o.status)).length;
  const cancelledOrdersCount = orders.filter((o) => o.status === 'cancelled').length;
  const returnedOrdersCount = orders.filter((o) => o.status === 'returned' || o.status === 'refunded').length;

  const totalMarketplaceSales = orders
    .filter((o) => ['confirmed', 'packed', 'shipped', 'delivered'].includes(o.status))
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const totalReservedStock = products.reduce((sum, p) => sum + (p.reservedStock || 0), 0);

  return {
    readyToSellCount,
    publishedCount,
    draftCount,
    pendingOrdersCount,
    confirmedOrdersCount,
    cancelledOrdersCount,
    returnedOrdersCount,
    totalMarketplaceSales,
    totalReservedStock,
  };
}

/**
 * ============================================================================
 * 4. PURCHASES TRACKING (ACCOUNT → PURCHASES)
 * ============================================================================
 */

export function getPurchases(): PurchaseRecord[] {
  return getStoredArray<PurchaseRecord>(STORAGE_KEYS.PURCHASES);
}

export function recordManualPurchase(purchaseData: {
  supplier: string;
  invoiceNumber?: string;
  date: string;
  items: InvoiceLineItem[];
  paymentStatus: 'paid' | 'pending' | 'partial';
  paymentMethod?: string;
  notes?: string;
}): PurchaseRecord {
  const invoiceDraft: InvoiceData = {
    id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    invoiceNumber: purchaseData.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
    invoiceDate: purchaseData.date,
    supplier: purchaseData.supplier,
    items: purchaseData.items,
    subtotal: purchaseData.items.reduce((sum, i) => sum + i.totalPrice, 0),
    taxAmount: purchaseData.items.reduce((sum, i) => sum + (i.taxAmount || 0), 0),
    discountAmount: purchaseData.items.reduce((sum, i) => sum + (i.discount || 0), 0),
    grandTotal: purchaseData.items.reduce((sum, i) => sum + i.totalPrice, 0),
    paymentStatus: purchaseData.paymentStatus,
    paymentMethod: purchaseData.paymentMethod as any,
    notes: purchaseData.notes,
    createdAt: new Date().toISOString(),
  };

  const res = confirmPurchaseInvoice(invoiceDraft);
  return res.purchaseRecord!;
}

/**
 * ============================================================================
 * 5. LOSS TRACKING (ACCOUNT → LOSS)
 * ============================================================================
 */

export function getLosses(): LossRecord[] {
  return getStoredArray<LossRecord>(STORAGE_KEYS.LOSSES);
}

export function recordLoss(lossData: {
  productId: string;
  quantity: number;
  reason: 'expired' | 'damaged' | 'missing' | 'returned' | 'discount_loss' | 'spoilage' | 'other';
  unitPrice?: number;
  notes?: string;
  date?: string;
  adjustStock?: boolean;
}): LossRecord {
  const products = getProducts();
  const prod = products.find((p) => p.id === lossData.productId);

  const price = lossData.unitPrice ?? (prod ? parseFloat(prod.purchasePrice?.replace(/[^0-9.]/g, '') || '0') : 0);
  const totalLossValue = lossData.quantity * price;

  const newLoss: LossRecord = {
    id: `loss_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    date: lossData.date || new Date().toISOString(),
    productId: lossData.productId,
    productName: prod ? prod.productName : 'Product Loss',
    category: prod?.category || 'General',
    quantity: lossData.quantity,
    unitPrice: price,
    value: totalLossValue,
    reason: lossData.reason,
    notes: lossData.notes || `Loss recorded due to ${lossData.reason}`,
    createdAt: new Date().toISOString(),
  };

  const losses = getLosses();
  setStoredArray(STORAGE_KEYS.LOSSES, [newLoss, ...losses]);

  // Adjust stock if product exists and deduction requested
  if (prod && (lossData.adjustStock !== false)) {
    const previousStock = prod.stockQuantity || 0;
    const newStock = Math.max(0, previousStock - lossData.quantity);

    const updatedProd: SavedInventoryItem = {
      ...prod,
      stockQuantity: newStock,
      quantity: String(newStock),
      updatedAt: new Date().toISOString(),
    };
    updatedProd.status = calculateProductStatus(updatedProd);

    const updatedProducts = products.map((p) => (p.id === prod.id ? updatedProd : p));
    setStoredArray(STORAGE_KEYS.PRODUCTS, updatedProducts);

    // Accounting Entry
    const accEntry: InventoryAccountingEntry = {
      id: `acc_loss_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      transactionId: `TXN-LOSS-${Date.now().toString().slice(-6)}`,
      date: newLoss.date,
      supplier: prod.supplier,
      productId: prod.id,
      productName: prod.productName,
      barcode: prod.barcode,
      quantity: lossData.quantity,
      purchasePrice: price,
      totalPurchaseValue: totalLossValue,
      sellingPrice: 0,
      stockAdded: -lossData.quantity,
      previousStock,
      newStock,
      paymentStatus: 'loss_writeoff',
      type: 'loss_adjustment',
      notes: `Inventory write-off: ${lossData.quantity}x ${prod.productName} (${lossData.reason})`,
      createdAt: new Date().toISOString(),
    };

    const accounting = getAccountingEntries();
    setStoredArray(STORAGE_KEYS.ACCOUNTING, [accEntry, ...accounting]);
  }

  notifyListeners();
  return newLoss;
}

/**
 * ============================================================================
 * 6. EXPENSES & OTHER INCOME
 * ============================================================================
 */

export function getExpenses(): ExpenseRecord[] {
  return getStoredArray<ExpenseRecord>(STORAGE_KEYS.EXPENSES);
}

export function saveExpense(expense: Omit<ExpenseRecord, 'id' | 'createdAt'>): ExpenseRecord {
  const expenses = getExpenses();
  const newExp: ExpenseRecord = {
    ...expense,
    id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  setStoredArray(STORAGE_KEYS.EXPENSES, [newExp, ...expenses]);
  notifyListeners();
  return newExp;
}

export function deleteExpense(id: string): ExpenseRecord[] {
  const expenses = getExpenses().filter((e) => e.id !== id);
  setStoredArray(STORAGE_KEYS.EXPENSES, expenses);
  notifyListeners();
  return expenses;
}

export function getIncome(): IncomeRecord[] {
  return getStoredArray<IncomeRecord>(STORAGE_KEYS.INCOME);
}

export function saveIncome(income: Omit<IncomeRecord, 'id' | 'createdAt'>): IncomeRecord {
  const incomes = getIncome();
  const newInc: IncomeRecord = {
    ...income,
    id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  setStoredArray(STORAGE_KEYS.INCOME, [newInc, ...incomes]);
  notifyListeners();
  return newInc;
}

export function deleteIncome(id: string): IncomeRecord[] {
  const incomes = getIncome().filter((i) => i.id !== id);
  setStoredArray(STORAGE_KEYS.INCOME, incomes);
  notifyListeners();
  return incomes;
}

/**
 * ============================================================================
 * 7. SCAN HISTORY
 * ============================================================================
 */

export function getScanHistory(): ScanHistoryItem[] {
  return getStoredArray<ScanHistoryItem>(STORAGE_KEYS.SCAN_HISTORY);
}

export function addScanHistoryItem(item: Omit<ScanHistoryItem, 'id'>): ScanHistoryItem {
  const history = getScanHistory();
  const newItem: ScanHistoryItem = {
    ...item,
    id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  };
  const updated = [newItem, ...history].slice(0, 100);
  setStoredArray(STORAGE_KEYS.SCAN_HISTORY, updated);
  notifyListeners();
  return newItem;
}

export function clearScanHistory() {
  setStoredArray(STORAGE_KEYS.SCAN_HISTORY, []);
  notifyListeners();
}

/**
 * ============================================================================
 * 8. REAL FINANCIAL CALCULATIONS (PROFIT, LOSS, SUMMARY)
 * ============================================================================
 */

export function filterRecordsByPeriod<T extends { date?: string; createdAt?: string }>(
  records: T[],
  period: 'today' | 'week' | 'month' | 'all' = 'all'
): T[] {
  if (period === 'all') return records;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  return records.filter((r) => {
    const rawDate = r.date || r.createdAt || '';
    const itemDateStr = rawDate.split('T')[0];
    const itemTime = new Date(rawDate).getTime();

    if (period === 'today') {
      return itemDateStr === todayStr;
    }

    if (period === 'week') {
      const oneWeekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      return itemTime >= oneWeekAgo;
    }

    if (period === 'month') {
      const oneMonthAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      return itemTime >= oneMonthAgo;
    }

    return true;
  });
}

export function getAccountSummary(period: 'today' | 'week' | 'month' | 'all' = 'all'): AccountSummary {
  const allSales = filterRecordsByPeriod(getSales(), period);
  const allPurchases = filterRecordsByPeriod(getPurchases(), period);
  const allExpenses = filterRecordsByPeriod(getExpenses(), period);
  const allIncome = filterRecordsByPeriod(getIncome(), period);
  const allLosses = filterRecordsByPeriod(getLosses(), period);

  const totalRevenue = allSales.reduce((sum, s) => sum + (Number(s.totalSale) || 0), 0);
  const totalPurchases = allPurchases.reduce((sum, p) => sum + (Number(p.totalPurchase) || 0), 0);
  const totalExpenses = allExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalIncome = allIncome.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const totalLoss = allLosses.reduce((sum, l) => sum + (Number(l.value) || 0), 0);

  // Cost of Goods Sold on sales = quantity sold * purchasePrice
  const cogs = allSales.reduce((sum, s) => sum + (s.quantity * (s.purchasePrice || 0)), 0);

  // Profit = Sales Revenue - Cost of Goods Sold - Operating Expenses + Other Income
  const grossProfit = totalRevenue - cogs;
  const netProfit = grossProfit - totalExpenses + totalIncome;
  const netPosition = netProfit - totalLoss;

  return {
    totalRevenue,
    totalPurchases,
    totalExpenses,
    totalIncome,
    cogs,
    grossProfit,
    netProfit,
    totalLoss,
    netPosition,
    salesCount: allSales.length,
    purchaseCount: allPurchases.length,
  };
}

export function getInventoryValuation() {
  const products = getProducts();
  let totalStockQuantity = 0;
  let totalPurchaseValue = 0;
  let estimatedSellingValue = 0;
  let lowStockCount = 0;
  let expiringSoonCount = 0;
  let expiredCount = 0;

  for (const p of products) {
    const qty = p.stockQuantity || 0;
    totalStockQuantity += qty;

    const pPrice = parseFloat(p.purchasePrice?.replace(/[^0-9.]/g, '') || '0') || 0;
    const sPrice = parseFloat(p.sellingPrice?.replace(/[^0-9.]/g, '') || p.mrp?.replace(/[^0-9.]/g, '') || '0') || 0;

    totalPurchaseValue += qty * pPrice;
    estimatedSellingValue += qty * sPrice;

    if (p.status === 'low_stock') lowStockCount++;
    if (p.status === 'expiring_soon') expiringSoonCount++;
    if (p.status === 'expired') expiredCount++;
  }

  return {
    totalProducts: products.length,
    totalStockQuantity,
    totalPurchaseValue,
    estimatedSellingValue,
    expectedProfit: Math.max(0, estimatedSellingValue - totalPurchaseValue),
    lowStockCount,
    expiringSoonCount,
    expiredCount,
  };
}

/**
 * Initial curated inventory seed for first time launch
 */
function getInitialCatalogSeed(): SavedInventoryItem[] {
  return [
    {
      id: 'prod_seed_001',
      savedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      productName: 'Highland Reserve Organic Dark Roast',
      brand: 'Highland Artisan Roasters',
      category: 'Beverages & Coffee',
      sku: 'HAC-SUMATRA-340',
      barcode: '084729103958',
      batchNumber: 'LOT-SC2025-R4',
      manufacturingDate: '2025-02-10',
      expiryDate: '2026-06-15',
      bestBefore: '2026-06-15',
      quantity: '24',
      stockQuantity: 24,
      minStockAlert: 8,
      unit: 'bags (340g)',
      mrp: '$18.99',
      sellingPrice: '$18.99',
      purchasePrice: '$11.50',
      supplier: 'Highland Roasters Direct LLC',
      rackLocation: 'Aisle 3 • Bay B',
      notes: 'Premium single-origin roast.',
      warnings: [],
      missingFields: [],
      status: 'in_stock',
      lastPurchaseDate: '2025-02-15',
    },
    {
      id: 'prod_seed_002',
      savedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      productName: 'Estate Extra Virgin Olive Oil 500ml',
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
      notes: 'Low stock notification active.',
      warnings: [],
      missingFields: [],
      status: 'low_stock',
      lastPurchaseDate: '2024-11-20',
    },
    {
      id: 'prod_seed_003',
      savedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      productName: 'Artisan Whole Wheat Sourdough',
      brand: 'Golden Grain Bakery',
      category: 'Bakery & Fresh',
      sku: 'GGB-SOUR-750G',
      barcode: '049102847291',
      batchNumber: 'LOT-BRD-891',
      manufacturingDate: '2025-01-05',
      expiryDate: '2025-01-20',
      bestBefore: '2025-01-20',
      quantity: '2',
      stockQuantity: 2,
      minStockAlert: 4,
      unit: 'loaves',
      mrp: '$7.50',
      sellingPrice: '$7.50',
      purchasePrice: '$3.80',
      supplier: 'Golden Grain Bakery Hub',
      rackLocation: 'Fresh Rack 1',
      notes: 'Expired item write-off candidate.',
      warnings: ['Product reached expiration date.'],
      missingFields: [],
      status: 'expired',
      lastPurchaseDate: '2025-01-05',
    },
  ];
}

function getInitialStockTransactionSeed(): StockTransaction[] {
  return [
    {
      id: 'txn_seed_001',
      transactionId: 'STK-TXN-009101',
      productId: 'prod_seed_001',
      productName: 'Highland Reserve Organic Dark Roast',
      barcode: '084729103958',
      sku: 'HAC-SUMATRA-340',
      transactionType: 'stock_in',
      subType: 'purchase',
      quantity: 30,
      unit: 'bags (340g)',
      previousStock: 0,
      newStock: 30,
      previousReservedStock: 0,
      newReservedStock: 0,
      source: 'Purchase',
      referenceId: 'PO-88192',
      dateTime: new Date(Date.now() - 86400000 * 3).toISOString(),
      timestamp: Date.now() - 86400000 * 3,
      operator: 'Receiving Manager',
      notes: 'Received shipment from Highland Roasters Direct LLC',
      toLocation: 'Aisle 3 • Bay B',
    },
    {
      id: 'txn_seed_002',
      transactionId: 'STK-TXN-009102',
      productId: 'prod_seed_001',
      productName: 'Highland Reserve Organic Dark Roast',
      barcode: '084729103958',
      sku: 'HAC-SUMATRA-340',
      transactionType: 'stock_out',
      subType: 'sale',
      quantity: 6,
      unit: 'bags (340g)',
      previousStock: 30,
      newStock: 24,
      previousReservedStock: 0,
      newReservedStock: 0,
      source: 'POS',
      referenceId: 'SALE-88201',
      dateTime: new Date(Date.now() - 86400000 * 1).toISOString(),
      timestamp: Date.now() - 86400000 * 1,
      operator: 'Cashier Stand 1',
      notes: 'Storefront sale - Customer receipt #88201',
    },
    {
      id: 'txn_seed_003',
      transactionId: 'STK-TXN-009103',
      productId: 'prod_seed_002',
      productName: 'Estate Extra Virgin Olive Oil 500ml',
      barcode: '739201948201',
      sku: 'VSO-EVOO-500ML',
      transactionType: 'stock_transfer',
      subType: 'transfer_out',
      quantity: 4,
      unit: 'bottles (500ml)',
      previousStock: 4,
      newStock: 4,
      previousReservedStock: 0,
      newReservedStock: 0,
      source: 'Location Transfer',
      dateTime: new Date(Date.now() - 86400000 * 2).toISOString(),
      timestamp: Date.now() - 86400000 * 2,
      operator: 'Inventory Clerk',
      notes: 'Moved inventory from Backroom Storage to Aisle 2 • Shelf 1 (Total stock unchanged)',
      fromLocation: 'Backroom Storage',
      toLocation: 'Aisle 2 • Shelf 1',
    },
  ];
}

function getInitialMarketplaceListingsSeed(): MarketplaceListing[] {
  return [
    {
      id: 'mkt_seed_001',
      productId: 'prod_seed_001',
      title: 'Highland Reserve Organic Dark Roast Coffee (340g Whole Bean)',
      description:
        '🔥 Freshly roasted organic single-origin dark roast with tasting notes of dark cocoa and toasted hazelnut. Perfect for espresso, drip, and French press. Available for local pickup or direct delivery!',
      sellingPrice: 18.99,
      discountPrice: 16.99,
      availableQuantity: 15,
      productImages: [],
      category: 'Beverages & Coffee',
      tags: ['coffee', 'organic', 'darkroast', 'specialtycoffee', 'espresso', 'fresh'],
      contactNumber: '+1 (555) 234-5678',
      shopLocation: 'Metro Express Mart - Main Branch, Block A',
      deliveryInfo: 'Same-day store pickup or standard 24-hr local delivery.',
      status: 'published',
      channels: ['facebook', 'whatsapp', 'tiktok', 'general'],
      viewsCount: 142,
      inquiriesCount: 18,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
      id: 'mkt_seed_002',
      productId: 'prod_seed_002',
      title: 'Villa Solara Estate Extra Virgin Olive Oil 500ml Cold Pressed',
      description:
        '🌿 100% First Cold-Pressed Mediterranean Extra Virgin Olive Oil. Single-estate harvest with rich polyphenol antioxidant content. Limited stock available!',
      sellingPrice: 24.5,
      discountPrice: 22.0,
      availableQuantity: 4,
      productImages: [],
      category: 'Gourmet Pantry',
      tags: ['oliveoil', 'evoo', 'gourmet', 'mediterranean', 'healthyfood', 'cooking'],
      contactNumber: '+1 (555) 234-5678',
      shopLocation: 'Metro Express Mart - Main Branch, Block A',
      deliveryInfo: 'Pickup or door delivery available within 48 hours.',
      status: 'published',
      channels: ['facebook', 'whatsapp', 'tiktok'],
      viewsCount: 89,
      inquiriesCount: 7,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ];
}

function getInitialMarketplaceOrdersSeed(): MarketplaceOrder[] {
  return [
    {
      id: 'ord_seed_001',
      orderNumber: 'ORD-FB-810921',
      customerName: 'Marcus Vance',
      customerPhone: '+1 (555) 392-1084',
      customerAddress: '742 Evergreen Terrace, Apt 4B',
      customerCity: 'Metro City',
      channel: 'facebook',
      items: [
        {
          productId: 'prod_seed_001',
          productName: 'Highland Reserve Organic Dark Roast',
          quantity: 2,
          unit: 'bags (340g)',
          unitPrice: 18.99,
          purchasePrice: 11.5,
          totalPrice: 37.98,
        },
      ],
      subtotal: 37.98,
      discount: 2.0,
      tax: 0,
      shippingFee: 4.5,
      totalAmount: 40.48,
      status: 'pending',
      statusHistory: [
        {
          status: 'pending',
          timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
          notes: 'Customer inquired and confirmed order via Facebook Marketplace Messenger.',
        },
      ],
      isStockReserved: true,
      isStockDeducted: false,
      paymentStatus: 'pending',
      paymentMethod: 'cash_on_delivery',
      notes: 'Customer requested afternoon delivery after 3 PM.',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 'ord_seed_002',
      orderNumber: 'ORD-WA-810922',
      customerName: 'Elena Rostova',
      customerPhone: '+1 (555) 749-2910',
      customerAddress: '124 Blossom Hill Road',
      customerCity: 'Metro City',
      channel: 'whatsapp',
      items: [
        {
          productId: 'prod_seed_001',
          productName: 'Highland Reserve Organic Dark Roast',
          quantity: 1,
          unit: 'bags (340g)',
          unitPrice: 18.99,
          purchasePrice: 11.5,
          totalPrice: 18.99,
        },
      ],
      subtotal: 18.99,
      discount: 0,
      tax: 0,
      shippingFee: 0,
      totalAmount: 18.99,
      status: 'delivered',
      statusHistory: [
        {
          status: 'pending',
          timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
          notes: 'Order received via WhatsApp direct catalog link',
        },
        {
          status: 'confirmed',
          timestamp: new Date(Date.now() - 86400000 * 1 + 1800000).toISOString(),
          notes: 'Payment confirmed via UPI/Card',
        },
        {
          status: 'delivered',
          timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
          notes: 'Customer picked up package at store counter',
        },
      ],
      isStockReserved: false,
      isStockDeducted: true,
      accountingSaleId: 'ORD-WA-810922',
      paymentStatus: 'paid',
      paymentMethod: 'card',
      notes: 'Store counter pickup completed.',
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    },
  ];
}

// Re-export compatibility aliases for existing store functions
export const getSavedInventory = getProducts;
export const loadSavedInventory = getProducts;
export const getCatalogProducts = getProducts;
export const saveProductToInventory = (formData: ExtractedFormData, thumb?: string) => {
  return saveProduct({
    productName: formData.productName || formData.fullName,
    brand: formData.brand || formData.organization,
    category: formData.category || formData.documentType,
    sku: formData.sku || (formData.barcode ? `SKU-${formData.barcode.slice(-6)}` : ''),
    barcode: formData.barcode,
    batchNumber: formData.batchNumber,
    manufacturingDate: formData.manufacturingDate,
    expiryDate: formData.expiryDate,
    bestBefore: formData.bestBefore,
    quantity: formData.quantity,
    unit: formData.unit,
    mrp: formData.mrp,
    sellingPrice: formData.mrp,
    stockQuantity: parseInt(formData.quantity?.replace(/[^0-9]/g, '') || '1', 10) || 1,
    imageThumbnail: thumb,
    notes: formData.notesOrAdditional,
    warnings: formData.warnings,
    missingFields: formData.missingFields,
  });
};
export const saveManualCatalogProduct = saveProduct;
export const updateCatalogProduct = updateProduct;
export const adjustProductStock = (id: string, delta: number) => {
  const res = recordStockAdjustment({
    productId: id,
    quantityChange: delta,
    type: delta > 0 ? 'stock_in' : 'stock_out',
    notes: delta > 0 ? 'Quick stock increase (+)' : 'Quick stock decrease (-)',
  });
  return getProducts();
};
export const deleteProductFromInventory = deleteProduct;
export const deleteCatalogProduct = deleteProduct;

// Accounting & Ledger Aliases
export const getSalesRecords = getSales;
export const getPurchaseRecords = getPurchases;
export const getLossRecords = getLosses;
export const getExpenseRecords = getExpenses;
export const recordExpense = saveExpense;
export const recordIncome = saveIncome;
export const getProfitAndLossSummary = getAccountSummary;

