/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { SavedInventoryItem, StockTransaction, TransactionSource } from '../types';
import { encryptUserData, decryptUserData } from './encryptionService';

/**
 * UUID helper: Ensures ID is a valid RFC-4122 UUID for PostgreSQL uuid columns.
 */
function ensureValidUuid(id?: string | null): string {
  if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Safe fallback RFC4122 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface DbProductRow {
  id: string;
  user_id: string;
  name: string;
  barcode: string | null;
  price: number;
  purchase_price: number;
  quantity: number;
  manufacture_date: string | null;
  expiry_date: string | null;
  best_before_months: number | null;
  unit: string;
  description: string | null;
  category: string | null;
  batch_number: string | null;
  rack_location: string | null;
  supplier: string | null;
  mrp: number;
  min_stock_alert: number;
  created_at: string;
  updated_at: string;
  encrypted_payload?: string | null;
}

export interface DbTransactionRow {
  id: string;
  user_id: string;
  product_id: string | null;
  product_name: string | null;
  transaction_type: 'IN' | 'OUT';
  subtype: string | null;
  quantity: number;
  price: number;
  total_amount: number;
  notes: string | null;
  reference_invoice: string | null;
  created_at: string;
  encrypted_payload?: string | null;
}

/**
 * Maps a Supabase PostgreSQL row to the frontend SavedInventoryItem format.
 */
export function mapDbRowToProduct(row: DbProductRow): SavedInventoryItem {
  const qty = Number(row.quantity) || 0;
  const sellingPrice = row.price ? String(row.price) : '0';
  const mrp = row.mrp ? String(row.mrp) : sellingPrice;

  return {
    id: row.id,
    productName: row.name || 'Unnamed Product',
    brand: '',
    category: row.category || 'General',
    sku: row.id.substring(0, 8).toUpperCase(),
    barcode: row.barcode || '',
    batchNumber: row.batch_number || '',
    manufacturingDate: row.manufacture_date || '',
    expiryDate: row.expiry_date || '',
    bestBefore: row.best_before_months ? `${row.best_before_months} months` : '',
    bestBeforeMonths: row.best_before_months,
    quantity: String(qty),
    stockQuantity: qty,
    unit: row.unit || 'pcs',
    mrp,
    sellingPrice,
    purchasePrice: row.purchase_price ? String(row.purchase_price) : '0',
    minStockAlert: Number(row.min_stock_alert) || 5,
    supplier: row.supplier || '',
    rackLocation: row.rack_location || '',
    notes: row.description || '',
    warnings: [],
    missingFields: [],
    savedAt: row.created_at,
    updatedAt: row.updated_at,
    user_id: row.user_id,
  } as SavedInventoryItem;
}

/**
 * Maps a frontend SavedInventoryItem to the Supabase database schema.
 */
export function mapProductToDbRow(item: Partial<SavedInventoryItem>, userId: string): Partial<DbProductRow> {
  const stockQty = item.stockQuantity ?? (parseInt(item.quantity || '0', 10) || 0);
  const priceNum = parseFloat(String(item.sellingPrice || item.mrp || '0')) || 0;
  const purchasePriceNum = parseFloat(String(item.purchasePrice || '0')) || 0;
  const mrpNum = parseFloat(String(item.mrp || item.sellingPrice || '0')) || priceNum;

  return {
    id: ensureValidUuid(item.id),
    user_id: userId,
    name: (item.productName || 'Unnamed Product').trim(),
    barcode: item.barcode?.trim() || null,
    price: priceNum,
    purchase_price: purchasePriceNum,
    quantity: stockQty,
    manufacture_date: item.manufacturingDate?.trim() || null,
    expiry_date: item.expiryDate?.trim() || null,
    best_before_months: item.bestBeforeMonths ?? null,
    unit: item.unit?.trim() || 'pcs',
    description: item.notes?.trim() || null,
    category: item.category?.trim() || 'General',
    batch_number: item.batchNumber?.trim() || null,
    rack_location: item.rackLocation?.trim() || null,
    supplier: item.supplier?.trim() || null,
    mrp: mrpNum,
    min_stock_alert: item.minStockAlert ?? 5,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Database Data Service for Supabase PostgreSQL.
 */
class SupabaseDataService {
  private inFlightProducts = new Map<string, Promise<SavedInventoryItem[]>>();
  private inFlightTransactions = new Map<string, Promise<StockTransaction[]>>();

  /**
   * Fetches products owned by the authenticated user with RLS enforcement and explicit column selection.
   */
  async fetchProducts(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<SavedInventoryItem[]> {
    if (!isSupabaseConfigured() || !userId) return [];

    const cacheKey = `${userId}_${options?.limit || 100}_${options?.offset || 0}`;
    if (this.inFlightProducts.has(cacheKey)) {
      return this.inFlightProducts.get(cacheKey)!;
    }

    const fetchPromise = (async () => {
      try {
        const limit = options?.limit ?? 100;
        const offset = options?.offset ?? 0;

        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user || authData.user.id !== userId) {
          console.warn('[supabaseDataService] Refusing product read for non-authenticated user.');
          return [];
        }

        const { data: queryRows, error: queryError } = await supabase
          .from('products')
          .select('id, user_id, encrypted_payload, created_at, updated_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (queryError) {
          console.error('[supabaseDataService] fetchProducts error:', queryError.message);
          return [];
        }

        const result: SavedInventoryItem[] = [];
        for (const row of (queryRows || []) as DbProductRow[]) {
          if (!row.encrypted_payload) {
            console.warn('[supabaseDataService] Skipping product without encrypted payload:', row.id);
            continue;
          }
          try {
            result.push(await decryptUserData<SavedInventoryItem>(userId, row.encrypted_payload));
          } catch (e) {
            console.warn('[supabaseDataService] encrypted product could not be decrypted; skipping row:', e);
          }
        }
        return result;
      } catch (e) {
        console.error('[supabaseDataService] Network error in fetchProducts:', e);
        return [];
      } finally {
        this.inFlightProducts.delete(cacheKey);
      }
    })();

    this.inFlightProducts.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  /**
   * Upserts a product into the Supabase PostgreSQL database.
   */
  async upsertProduct(item: Partial<SavedInventoryItem>, userId: string): Promise<SavedInventoryItem | null> {
    if (!isSupabaseConfigured() || !userId) return null;

    try {
      const dbRow = mapProductToDbRow(item, userId);
      const encrypted_payload = await encryptUserData(userId, {
        ...item,
        id: dbRow.id,
        user_id: userId,
        updatedAt: dbRow.updated_at,
      });
      const secureRow = {
        id: dbRow.id,
        user_id: userId,
        encrypted_payload,
        updated_at: dbRow.updated_at,
      };
      const { data, error } = await supabase
        .from('products')
        .upsert(secureRow)
        .select('id, user_id, encrypted_payload, created_at, updated_at')
        .single();

      if (error) {
        console.error('[supabaseDataService] upsertProduct error:', error.message);
        return null;
      }

      const decrypted = await decryptUserData<SavedInventoryItem>(userId, (data as DbProductRow).encrypted_payload!);
      return { ...decrypted, id: data.id, user_id: userId, savedAt: data.created_at, updatedAt: data.updated_at } as SavedInventoryItem;
    } catch (e) {
      console.error('[supabaseDataService] Network error in upsertProduct:', e);
      return null;
    }
  }

  /**
   * Deletes a product owned by the authenticated user.
   */
  async deleteProduct(productId: string, userId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return false;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('user_id', userId);

      if (error) {
        console.error('[supabaseDataService] deleteProduct error:', error.message);
        return false;
      }

      return true;
    } catch (e) {
      console.error('[supabaseDataService] Network error in deleteProduct:', e);
      return false;
    }
  }

  /**
   * Fetches user's inventory transactions with explicit columns and batch limit.
   */
  async fetchTransactions(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<StockTransaction[]> {
    if (!isSupabaseConfigured() || !userId) return [];

    const cacheKey = `${userId}_${options?.limit || 100}_${options?.offset || 0}`;
    if (this.inFlightTransactions.has(cacheKey)) {
      return this.inFlightTransactions.get(cacheKey)!;
    }

    const fetchPromise = (async () => {
      try {
        const limit = options?.limit ?? 100;
        const offset = options?.offset ?? 0;

        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user || authData.user.id !== userId) {
          console.warn('[supabaseDataService] Refusing transaction read for non-authenticated user.');
          return [];
        }

        const { data, error } = await supabase
          .from('inventory_transactions')
          .select('id, user_id, product_id, encrypted_payload, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          console.error('[supabaseDataService] fetchTransactions error:', error.message);
          return [];
        }

        const secureTransactions: StockTransaction[] = [];
        for (const row of (data || []) as DbTransactionRow[]) {
          if (!row.encrypted_payload) {
            console.warn('[supabaseDataService] Skipping transaction without encrypted payload:', row.id);
            continue;
          }
          try {
            secureTransactions.push(await decryptUserData<StockTransaction>(userId, row.encrypted_payload));
          } catch (e) {
            console.warn('[supabaseDataService] encrypted transaction could not be decrypted; skipping row:', e);
          }
          continue;
          const qty = Number(row.quantity);
          secureTransactions.push({
            id: row.id,
            transactionId: `STK-${row.id.substring(0, 8).toUpperCase()}`,
            productId: row.product_id || '',
            productName: row.product_name || 'Inventory Item',
            transactionType: (isOut ? 'stock_out' : 'stock_in') as StockTransaction['transactionType'],
            subType: (row.subtype as any) || (isOut ? 'sale' : 'purchase'),
            quantity: qty,
            unit: 'pcs',
            previousStock: 0,
            newStock: qty,
            previousReservedStock: 0,
            newReservedStock: 0,
            source: (isOut ? 'POS' : 'Purchase') as TransactionSource,
            referenceId: row.reference_invoice || undefined,
            dateTime: row.created_at,
            timestamp: new Date(row.created_at).getTime() || Date.now(),
            notes: row.notes || '',
          });
        }        return secureTransactions;
      } catch (e) {
        console.error('[supabaseDataService] Network error in fetchTransactions:', e);
        return [];
      } finally {
        this.inFlightTransactions.delete(cacheKey);
      }
    })();

    this.inFlightTransactions.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  /**
   * Records an inventory transaction (IN/OUT) and updates product stock in database.
   */
  async recordTransaction(
    txn: Partial<StockTransaction> & { unitPrice?: number; totalAmount?: number; subtype?: string; referenceInvoice?: string },
    userId: string,
    currentStock?: number
  ): Promise<StockTransaction | null> {
    if (!isSupabaseConfigured() || !userId) return null;

    try {
      const txnType = txn.transactionType === 'stock_out' ? 'OUT' : 'IN';
      const qty = Math.abs(txn.quantity || 1);
      const unitPrice = txn.unitPrice ?? 0;
      const totalAmount = txn.totalAmount ?? (qty * unitPrice);
      const validProductId = txn.productId && ensureValidUuid(txn.productId);
      const subTypeVal = txn.subType || txn.subtype || (txnType === 'OUT' ? 'sale' : 'purchase');

      const id = ensureValidUuid(txn.id);
      const createdAt = new Date().toISOString();
      const transactionPayload = {
        ...txn,
        id,
        user_id: userId,
        transactionType: txnType === 'OUT' ? 'stock_out' : 'stock_in',
        quantity: qty,
        unitPrice,
        totalAmount,
        subtype: subTypeVal,
        referenceInvoice: txn.referenceId || txn.referenceInvoice,
        dateTime: createdAt,
      };
      const encrypted_payload = await encryptUserData(userId, transactionPayload);
      const dbRow = {
        id,
        user_id: userId,
        product_id: validProductId || null,
        encrypted_payload,
        created_at: createdAt,
      };

      const { data, error } = await supabase
        .from('inventory_transactions')
        .insert(dbRow)
        .select('id, user_id, product_id, encrypted_payload, created_at')
        .single();

      if (error) {
        console.error('[supabaseDataService] recordTransaction error:', error.message);
        return null;
      }

      // Update stock inside the encrypted product payload as well.
      if (validProductId && typeof currentStock === 'number') {
        const newStock = Math.max(0, txnType === 'OUT' ? currentStock - qty : currentStock + qty);
        const { data: productRow } = await supabase
          .from('products')
          .select('id, user_id, encrypted_payload, created_at, updated_at')
          .eq('id', validProductId)
          .eq('user_id', userId)
          .maybeSingle();

        if (productRow?.encrypted_payload) {
          const product = await decryptUserData<any>(userId, productRow.encrypted_payload);
          product.stockQuantity = newStock;
          product.quantity = String(newStock);
          product.updatedAt = new Date().toISOString();
          const encryptedProduct = await encryptUserData(userId, product);
          await supabase
            .from('products')
            .update({ encrypted_payload: encryptedProduct, updated_at: new Date().toISOString() })
            .eq('id', validProductId)
            .eq('user_id', userId);
        }
      }

      const decrypted = await decryptUserData<any>(userId, data.encrypted_payload);
      return {
        ...decrypted,
        id: data.id,
        productId: data.product_id || decrypted.productId || '',
        previousStock: currentStock ?? 0,
        newStock: txnType === 'OUT' ? Math.max(0, (currentStock ?? 0) - qty) : ((currentStock ?? 0) + qty),
        dateTime: data.created_at,
        timestamp: new Date(data.created_at).getTime() || Date.now(),
      } as StockTransaction;
    } catch (e) {
      console.error('[supabaseDataService] Network error in recordTransaction:', e);
      return null;
    }
  }
}

export const supabaseDataService = new SupabaseDataService();
