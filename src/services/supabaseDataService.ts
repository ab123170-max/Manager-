/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { SavedInventoryItem, StockTransaction } from '../types';

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
  /**
   * Fetches all products owned by the authenticated user with RLS enforcement.
   */
  async fetchProducts(userId: string): Promise<SavedInventoryItem[]> {
    if (!isSupabaseConfigured() || !userId) return [];

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[supabaseDataService] fetchProducts error:', error.message);
        return [];
      }

      return (data || []).map((row: DbProductRow) => mapDbRowToProduct(row));
    } catch (e) {
      console.error('[supabaseDataService] Network error in fetchProducts:', e);
      return [];
    }
  }

  /**
   * Upserts a product into the Supabase PostgreSQL database.
   */
  async upsertProduct(item: Partial<SavedInventoryItem>, userId: string): Promise<SavedInventoryItem | null> {
    if (!isSupabaseConfigured() || !userId) return null;

    try {
      const dbRow = mapProductToDbRow(item, userId);
      const { data, error } = await supabase
        .from('products')
        .upsert(dbRow)
        .select()
        .single();

      if (error) {
        console.error('[supabaseDataService] upsertProduct error:', error.message);
        return null;
      }

      return mapDbRowToProduct(data as DbProductRow);
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
   * Fetches user's inventory transactions.
   */
  async fetchTransactions(userId: string): Promise<StockTransaction[]> {
    if (!isSupabaseConfigured() || !userId) return [];

    try {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[supabaseDataService] fetchTransactions error:', error.message);
        return [];
      }

      return (data || []).map((row: DbTransactionRow) => {
        const isOut = row.transaction_type === 'OUT';
        const qty = Number(row.quantity);
        return {
          id: row.id,
          transactionId: `STK-${row.id.substring(0, 8).toUpperCase()}`,
          productId: row.product_id || '',
          productName: row.product_name || 'Inventory Item',
          transactionType: isOut ? 'stock_out' : 'stock_in',
          subType: (row.subtype as any) || (isOut ? 'sale' : 'purchase'),
          quantity: qty,
          unit: 'pcs',
          previousStock: 0,
          newStock: qty,
          previousReservedStock: 0,
          newReservedStock: 0,
          source: isOut ? 'POS' : 'Purchase',
          referenceId: row.reference_invoice || undefined,
          dateTime: row.created_at,
          timestamp: new Date(row.created_at).getTime() || Date.now(),
          notes: row.notes || '',
        };
      });
    } catch (e) {
      console.error('[supabaseDataService] Network error in fetchTransactions:', e);
      return [];
    }
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

      const dbRow: Partial<DbTransactionRow> = {
        id: ensureValidUuid(txn.id),
        user_id: userId,
        product_id: validProductId || null,
        product_name: txn.productName || null,
        transaction_type: txnType,
        subtype: subTypeVal,
        quantity: qty,
        price: unitPrice,
        total_amount: totalAmount,
        notes: txn.notes || null,
        reference_invoice: txn.referenceId || txn.referenceInvoice || null,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('inventory_transactions')
        .insert(dbRow)
        .select()
        .single();

      if (error) {
        console.error('[supabaseDataService] recordTransaction error:', error.message);
        return null;
      }

      // Update the product's quantity in Supabase if valid product ID provided
      if (validProductId && typeof currentStock === 'number') {
        const newStock = txnType === 'OUT' ? currentStock - qty : currentStock + qty;
        await supabase
          .from('products')
          .update({ quantity: Math.max(0, newStock), updated_at: new Date().toISOString() })
          .eq('id', validProductId)
          .eq('user_id', userId);
      }

      const isOut = data.transaction_type === 'OUT';
      return {
        id: data.id,
        transactionId: txn.transactionId || `STK-${data.id.substring(0, 8).toUpperCase()}`,
        productId: data.product_id || '',
        productName: data.product_name || '',
        transactionType: isOut ? 'stock_out' : 'stock_in',
        subType: (data.subtype as any) || (isOut ? 'sale' : 'purchase'),
        quantity: Number(data.quantity),
        unit: txn.unit || 'pcs',
        previousStock: currentStock ?? 0,
        newStock: isOut ? (currentStock ? currentStock - qty : 0) : ((currentStock ?? 0) + qty),
        previousReservedStock: 0,
        newReservedStock: 0,
        source: txn.source || 'Manual Entry',
        referenceId: data.reference_invoice || undefined,
        dateTime: data.created_at,
        timestamp: new Date(data.created_at).getTime() || Date.now(),
        notes: data.notes || '',
      };
    } catch (e) {
      console.error('[supabaseDataService] Network error in recordTransaction:', e);
      return null;
    }
  }
}

export const supabaseDataService = new SupabaseDataService();
