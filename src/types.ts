/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CustomField {
  id: string;
  key: string;
  value: string;
  confidence?: number;
}

export interface DateMappingResult {
  manufacture_date: string;
  expiry_date: string;
  best_before: string;
  packed_date: string;
  best_before_months: number | null;
  detected_labels: string[];
  confidence: number;
  needs_review: boolean;
}

/**
 * Core Product Extraction Schema
 * Used by the synchronized multi-shot product scanner with auto-detected currency, unit, and language
 */
export interface Product5Fields {
  productName: string;
  price: number | null;
  currency: string;
  manufactureDate: string;
  expiryDate: string;
  bestBeforeMonths: number | null;
  quantity: number;
  unit: string;
  detectedLanguage: string;
}

export interface ProductScanResult extends Product5Fields {
  isCalculatedExpiry?: boolean;
  packageSize?: string;
  confidence?: {
    productName?: number;
    price?: number;
    currency?: number;
    manufactureDate?: number;
    expiryDate?: number;
    bestBeforeMonths?: number;
    quantity?: number;
    unit?: number;
    detectedLanguage?: number;
    overall?: number;
  };
  photosCount?: number;
  capturedImages?: string[];
  warnings?: string[];
}

/**
 * Product-specific label and packaging attributes
 */
export interface ProductLabelData {
  productName: string;
  price?: number | null;
  sku: string;
  barcode: string;
  batchNumber: string;
  manufacturingDate: string;
  packedDate?: string;
  expiryDate: string;
  bestBefore: string;
  bestBeforeMonths?: number | null;
  isCalculatedExpiry?: boolean;
  quantity: string;
  unit: string;
  brand: string;
  category: string;
  mrp: string;
  sellingPrice?: string;
  purchasePrice?: string;
  confidence: Record<string, number>;
  warnings: string[];
  missingFields: string[];
  dateMapping?: DateMappingResult;
}

export interface CapturedPhotoItem {
  id: string;
  dataUrl: string;
  label?: string;
  source: 'camera' | 'upload' | 'sample';
  timestamp: number;
}

/**
 * Complete structured data returned by the Gemini Vision supervisor
 */
export interface ExtractedFormData extends ProductLabelData {
  // Classification
  isProductOrPackage: boolean;
  documentType: string;

  // Identity / Document specific fields
  fullName: string;
  documentNumber: string;
  dateOfBirth: string;
  issueDate: string;
  email: string;
  phone: string;
  address: string;
  organization: string;
  nationality: string;
  notesOrAdditional: string;

  // Multi-photo extraction
  photosCount?: number;
  photosAutoDeleted?: boolean;

  // Overall confidence & custom fields
  confidenceScore: number;
  customFields: CustomField[];

  // Local OCR supervisor reconciliation
  localOcrAssisted?: boolean;
  rawOcrCuesDetected?: string[];
}

export type ExtractionStage =
  | 'idle'
  | 'capturing'
  | 'preprocessing'
  | 'processing'
  | 'ready'
  | 'error';

export interface CameraState {
  isStreaming: boolean;
  hasPermission: boolean | null;
  error: string | null;
  facingMode: 'user' | 'environment';
  deviceId?: string;
  availableDevices: MediaDeviceInfo[];
}

export interface SampleDoc {
  id: string;
  name: string;
  category: 'product' | 'document';
  type: string;
  description: string;
  dataUrl: string;
  additionalPhotos?: string[];
}

export interface PreprocessingOptions {
  grayscale?: boolean;
  contrastEnhance?: boolean;
  adaptiveThreshold?: boolean;
  invert?: boolean;
  contrast?: number;
  sharpen?: boolean;
}

export interface PreprocessedImageResult {
  dataUrl: string;
  enhancedDataUrl: string;
  cues: LocalOcrHypothesis;
  width: number;
  height: number;
  stats: {
    meanLuminance: number;
    contrastRatio: number;
    edgeDensity: number;
  };
}

export interface LocalOcrHypothesis {
  possibleBarcodes: string[];
  possibleBatchNumbers: string[];
  possibleDates: string[];
  possiblePrices: string[];
  possibleQuantities: string[];
  extractedKeywords: string[];
  rawTextLines: string[];
}

/**
 * Saved Inventory Item definition
 */
export interface SavedInventoryItem {
  id: string;
  savedAt: string;
  updatedAt?: string;
  productName: string;
  brand: string;
  category: string;
  sku: string;
  barcode: string;
  qrCode?: string;
  batchNumber: string;
  manufacturingDate: string;
  packedDate?: string;
  expiryDate: string;
  bestBefore: string;
  bestBeforeMonths?: number | null;
  isCalculatedExpiry?: boolean;
  quantity: string;
  unit: string;
  packageSize?: string;
  currency?: string;
  detectedLanguage?: string;
  mrp: string;
  sellingPrice: string;
  purchasePrice: string;
  stockQuantity: number;
  reservedStock?: number;
  minStockAlert: number;
  supplier?: string;
  rackLocation?: string;
  ingredients?: string;
  notes?: string;
  warnings: string[];
  missingFields: string[];
  dateMapping?: DateMappingResult;
  imageThumbnail?: string;
  additionalPhotos?: string[];
  status?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'expiring_soon' | 'expired' | 'reserved' | 'negative_stock';
  lastPurchaseDate?: string;
  lastSaleDate?: string;
  turnoverRate?: number;
  turnoverVelocity?: 'fast' | 'medium' | 'slow' | 'stagnant';
  daysSalesOfInventory?: number;
  reputationScore?: number;
  reputationRating?: number;
  reputationReviewsCount?: number;
  reputationBadge?: 'Top Rated' | 'Customer Favorite' | 'Quality Verified' | 'Needs Attention';
  returnRate?: number;
  customerFeedbackSummary?: string;
}

export type CatalogProduct = SavedInventoryItem;

export interface CatalogFilterOptions {
  searchTerm: string;
  category: string;
  status: 'all' | 'in_stock' | 'low_stock' | 'expiring_soon' | 'expired' | 'out_of_stock' | 'reserved' | 'negative_stock';
  sortBy: 'savedAt_desc' | 'savedAt_asc' | 'name_asc' | 'name_desc' | 'expiry_asc' | 'stock_asc' | 'stock_desc';
}

/**
 * ============================================================================
 * STANDARDIZED STOCK TRANSACTION ENGINE TYPES
 * ============================================================================
 */

export type StockTransactionType = 'stock_in' | 'stock_out' | 'stock_transfer' | 'stock_adjustment';

export type StockSubtype =
  | 'purchase'
  | 'manual_addition'
  | 'opening_stock'
  | 'customer_return'
  | 'adjustment_increase'
  | 'transfer_in'
  | 'sale'
  | 'damaged'
  | 'expired'
  | 'lost_missing'
  | 'adjustment_decrease'
  | 'transfer_out';

export type TransactionSource =
  | 'POS'
  | 'Purchase'
  | 'Manual Entry'
  | 'Scanner'
  | 'Invoice'
  | 'Location Transfer'
  | 'Damage / Loss';

export interface StockTransaction {
  id: string;
  transactionId: string;
  productId: string;
  productName: string;
  barcode?: string;
  sku?: string;
  transactionType: StockTransactionType;
  subType: StockSubtype;
  quantity: number;
  unit: string;
  previousStock: number;
  newStock: number;
  previousReservedStock: number;
  newReservedStock: number;
  source: TransactionSource;
  referenceId?: string; // Order #, Invoice #, Sale #
  dateTime: string;
  timestamp: number;
  userId?: string;
  operator?: string;
  notes?: string;
  fromLocation?: string;
  toLocation?: string;
  idempotencyKey?: string;
}

export interface AppSettings {
  allowNegativeStock: boolean;
  autoLanguage?: boolean;
  language?: string;
  storeName?: string;
  shopName: string;
  contactPhone: string;
  pickupLocation?: string;
  shopLocation: string;
  currency: string;
  currencySymbol?: string;
  defaultDeliveryInfo: string;
  defaultDeliveryTerms?: string;
  lowStockThreshold?: number;
  facebookHandle?: string;
  whatsappNumber?: string;
  tiktokHandle?: string;
}

/**
 * Real-time Barcode & QR Code Scanning Types
 */
export interface DetectedCode {
  type: 'barcode' | 'qr';
  format: string;
  value: string;
  raw_value: string;
  confidence: number;
  timestamp: number;
  isUrl?: boolean;
  isJson?: boolean;
  parsedJson?: Record<string, unknown> | null;
}

/**
 * Two-Engine Product Recognition Mapping & Conflict Resolution
 */
export interface ScannedProductMapping {
  barcode: string;
  barcodeFormat: string;
  productName: string;
  brand: string;
  category: string;
  manufactureDate: string;
  expiryDate: string;
  bestBefore: string;
  batchNumber: string;
  mrp: string;
  netWeight: string;
  quantity: string;
  rawOcrText: string;
  confidence: Record<string, number>;
  datePrecision?: {
    manufactureDate?: 'day' | 'month' | 'year' | 'unknown';
    expiryDate?: 'day' | 'month' | 'year' | 'unknown';
  };
  imageUrl?: string;
  description?: string;
}

export interface ValueConflict {
  key: keyof ScannedProductMapping;
  label: string;
  databaseValue: string;
  ocrValue: string;
  selectedValue: string;
}

export interface MergedRecognitionResult {
  product: ScannedProductMapping;
  conflicts: ValueConflict[];
  hasConflicts: boolean;
  databaseProduct: any | null;
  ocrResult: any | null;
}

export interface LookupResult {
  found: boolean;
  item: SavedInventoryItem | null;
  source: 'inventory' | 'known_catalog' | 'none';
  code: DetectedCode;
}

export interface ScannerSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  continuousScan: boolean;
  preferredMode: 'all' | 'barcode' | 'qr';
}

export interface ScanHistoryItem {
  id: string;
  code: DetectedCode;
  matchedProduct?: SavedInventoryItem | null;
  timestamp: number;
}

/**
 * ============================================================================
 * INVOICE & ACCOUNTING DATA TYPES
 * ============================================================================
 */

export interface InvoiceLineItem {
  id: string;
  productName: string;
  barcode?: string;
  sku?: string;
  category?: string;
  quantity: number;
  unit?: string;
  unitPrice: number; // Purchase rate
  totalPrice: number; // Qty * UnitPrice - Discount + Tax
  mrp?: number;
  sellingPrice?: number;
  mfd?: string;
  exp?: string;
  batchNumber?: string;
  taxRate?: number; // %
  taxAmount?: number;
  discount?: number;
  notes?: string;
  detectedLanguage?: string;
  currency?: string;
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  supplier: string;
  customerName?: string;
  items: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  paymentStatus: 'paid' | 'pending' | 'partial';
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'upi' | 'credit';
  notes?: string;
  images?: string[];
  createdAt: string;
  confirmedAt?: string;
  isProcessed?: boolean;
  detectedLanguage?: string;
  currency?: string;
  currencySymbol?: string;
  defaultUnit?: string;
}

/**
 * Dedicated Inventory Accounting Ledger Entry
 */
export interface InventoryAccountingEntry {
  id: string;
  transactionId: string;
  date: string;
  invoiceNumber?: string;
  supplier?: string;
  productId: string;
  productName: string;
  barcode?: string;
  quantity: number;
  purchasePrice: number;
  totalPurchaseValue: number;
  sellingPrice: number;
  stockAdded: number; // positive for addition, negative for deduction
  previousStock: number;
  newStock: number;
  paymentStatus: string;
  type: 'purchase_invoice' | 'stock_in' | 'stock_out' | 'sale' | 'loss_adjustment' | 'manual_entry' | 'initial_stock';
  notes?: string;
  createdAt: string;
}

/**
 * Sales Record
 */
export interface SaleRecord {
  id: string;
  saleId: string;
  date: string;
  productId: string;
  productName: string;
  barcode?: string;
  category?: string;
  quantity: number;
  sellingPrice: number;
  purchasePrice: number; // for COGS calculation
  discount: number;
  tax: number;
  totalSale: number;
  paymentMethod: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'credit';
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  createdAt: string;
}

/**
 * Purchases Record
 */
export interface PurchaseRecord {
  id: string;
  purchaseId: string;
  invoiceNumber: string;
  date: string;
  supplier: string;
  items: InvoiceLineItem[];
  productSummary: string;
  totalQuantity: number;
  totalPurchase: number;
  discount: number;
  tax: number;
  paymentStatus: 'paid' | 'pending' | 'partial';
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
}

/**
 * Loss Record
 */
export interface LossRecord {
  id: string;
  date: string;
  productId: string;
  productName: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  value: number; // quantity * unitPrice
  reason: 'expired' | 'damaged' | 'missing' | 'returned' | 'discount_loss' | 'spoilage' | 'other';
  notes?: string;
  createdAt: string;
}

/**
 * Operating Expenses
 */
export interface ExpenseRecord {
  id: string;
  date: string;
  category: 'Rent' | 'Utilities' | 'Salaries' | 'Logistics' | 'Packaging' | 'Maintenance' | 'Marketing' | 'Other' | string;
  title: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
}

/**
 * Other Income
 */
export interface IncomeRecord {
  id: string;
  date: string;
  category: 'Interest' | 'Service' | 'Cashback' | 'Scrap' | 'Delivery Fee' | 'Other' | string;
  title: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
}

/**
 * Financial Summary
 */
export interface AccountSummary {
  totalRevenue: number;
  totalPurchases: number;
  totalExpenses: number;
  totalIncome: number;
  cogs: number;
  grossProfit: number;
  netProfit: number;
  totalLoss: number;
  netPosition: number; // NetProfit - Loss
  salesCount: number;
  purchaseCount: number;
}

/**
 * Navigation Types
 */
export type MenuSection = 'scanner' | 'inventory' | 'inventory_in' | 'inventory_out';

export type ScannerSubView =
  | 'scan_product'
  | 'manual_entry'
  | 'barcode_scanner'
  | 'qr_scanner'
  | 'multi_scan'
  | 'scan_history';

export type InventorySubView =
  | 'inventory'
  | 'products'
  | 'turnover'
  | 'reputation'
  | 'stock_in'
  | 'stock_out'
  | 'stock_ledger'
  | 'low_stock'
  | 'expiring_soon'
  | 'expired'
  | 'categories'
  | 'reports'
  | 'accounting';

export type InventoryInSubView =
  | 'stock_in'
  | 'receiving'
  | 'in_ledger'
  | 'scan_product'
  | 'manual_entry'
  | 'barcode_scanner'
  | 'qr_scanner'
  | 'multi_scan'
  | 'multiple_image_scan'
  | 'scan_history';
export type InventoryOutSubView = 'stock_out' | 'dispatch' | 'out_ledger';

export type AccountSubView =
  | 'sales'
  | 'purchases'
  | 'profit'
  | 'loss'
  | 'expenses'
  | 'income'
  | 'summary'
  | 'reports';

export type AppSubView = ScannerSubView | InventorySubView | InventoryInSubView | InventoryOutSubView | AccountSubView | string;

export type SalesRecord = SaleRecord;

export interface AppNavigationState {
  section?: MenuSection;
  subView?: string;
  activeSection: MenuSection;
  activeSubView: string;
  params?: Record<string, unknown>;
}

