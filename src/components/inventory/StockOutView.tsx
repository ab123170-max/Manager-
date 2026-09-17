/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  Package,
  CheckCircle2,
  AlertCircle,
  History,
} from 'lucide-react';
import { SavedInventoryItem } from '../../types';
import {
  getProducts,
  recordStockAdjustment,
  getAccountingEntries,
  subscribeToStore,
} from '../../utils/unifiedDataStore';

interface StockOutViewProps {
  initialProductId?: string;
  initialProduct?: SavedInventoryItem | null;
}

export const StockOutView: React.FC<StockOutViewProps> = ({ initialProductId, initialProduct }) => {
  const [products, setProducts] = useState<SavedInventoryItem[]>(getProducts());
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProductId || initialProduct?.id || ''
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('order_dispatch');
  const [notes, setNotes] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToStore(() => {
      setProducts(getProducts());
    });
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleConfirmStockOut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      alert('Please select a product.');
      return;
    }
    if (quantity <= 0) {
      alert('Please enter a quantity greater than 0.');
      return;
    }
    if (selectedProduct && quantity > selectedProduct.stockQuantity) {
      if (!confirm(`Warning: Quantity (${quantity}) exceeds current available stock (${selectedProduct.stockQuantity}). Proceed anyway?`)) {
        return;
      }
    }

    const res = recordStockAdjustment({
      productId: selectedProductId,
      quantityChange: -quantity,
      type: 'stock_out',
      reason,
      notes: notes || `Stock Out: -${quantity} units (${reason})`,
    });

    if (res.success) {
      setStatusMessage(`Dispatched ${quantity} unit(s) of ${res.product?.productName}. Remaining Stock: ${res.product?.stockQuantity}`);
      setQuantity(1);
      setNotes('');
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const recentStockOuts = getAccountingEntries().filter((e) => e.type === 'stock_out' || e.type === 'sale').slice(0, 8);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider mb-1">
          <ArrowUpRight className="w-4 h-4" />
          <span>Outflow &amp; Dispatch</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Stock Out (Inventory Dispatch)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Record outgoing stock for order fulfillments, internal department transfers, or warehouse scrap.
        </p>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleConfirmStockOut} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Select Product *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="">-- Choose Product --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.productName} (In Stock: {p.stockQuantity} {p.unit || 'units'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Quantity to Remove *
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Outflow Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="order_dispatch">Order Fulfillment / Customer Dispatch</option>
              <option value="store_transfer">Internal Branch / Store Transfer</option>
              <option value="sample">Marketing Sample / Tasting</option>
              <option value="damage">Damaged Goods Disposal</option>
              <option value="other">Other Adjustment</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Dispatch Notes / Ref
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Order #7819 dispatched via courier"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-rose-500/20"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-md flex items-center justify-center gap-2 transition-all"
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Confirm Stock Out &amp; Deduct Inventory</span>
        </button>
      </form>

      {/* Recent Dispatches */}
      {recentStockOuts.length > 0 && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" /> Recent Stock Out Activity
          </h3>
          <div className="divide-y divide-slate-100 text-xs">
            {recentStockOuts.map((e) => (
              <div key={e.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">{e.productName}</span>
                  <span className="text-slate-400 block text-[11px]">
                    {new Date(e.date).toLocaleDateString()} • {e.notes || e.type}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-black text-rose-700">{e.stockAdded} units</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
