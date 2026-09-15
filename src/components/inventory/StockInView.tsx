/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowDownLeft,
  Package,
  Plus,
  CheckCircle2,
  DollarSign,
  Building,
  Hash,
  Barcode,
  History,
} from 'lucide-react';
import { SavedInventoryItem } from '../../types';
import {
  getProducts,
  recordStockAdjustment,
  getAccountingEntries,
  subscribeToStore,
} from '../../utils/unifiedDataStore';

export const StockInView: React.FC = () => {
  const [products, setProducts] = useState<SavedInventoryItem[]>(getProducts());
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [supplier, setSupplier] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToStore(() => {
      setProducts(getProducts());
    });
  }, []);

  // When product changes, autofill default unit cost & supplier
  useEffect(() => {
    if (selectedProductId) {
      const p = products.find((prod) => prod.id === selectedProductId);
      if (p) {
        const cost = parseFloat(p.purchasePrice?.replace(/[^0-9.]/g, '') || '0') || 0;
        setUnitCost(cost);
        setSupplier(p.supplier || '');
      }
    }
  }, [selectedProductId, products]);

  const handleConfirmStockIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      alert('Please select a product.');
      return;
    }
    if (quantity <= 0) {
      alert('Please enter a valid stock quantity greater than 0.');
      return;
    }

    const res = recordStockAdjustment({
      productId: selectedProductId,
      quantityChange: quantity,
      type: 'stock_in',
      unitPrice: unitCost,
      supplier,
      notes: notes || `Direct Stock In: +${quantity} units`,
    });

    if (res.success) {
      setStatusMessage(`Successfully added ${quantity} unit(s) to ${res.product?.productName}. New Stock: ${res.product?.stockQuantity}`);
      setQuantity(10);
      setNotes('');
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const recentStockIns = getAccountingEntries().filter((e) => e.type === 'stock_in' || e.type === 'purchase_invoice').slice(0, 8);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
          <ArrowDownLeft className="w-4 h-4" />
          <span>Inflow &amp; Receiving</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Stock In (Goods Receipt)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Receive newly arrived stock, update product quantities, and log inventory purchase accounting.
        </p>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Stock In Form */}
      <form onSubmit={handleConfirmStockIn} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-600" />
          <span>Receive Inventory Items</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Select Product */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Select Product *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">-- Choose Product from Inventory --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.productName} (Current Stock: {p.stockQuantity} {p.unit || 'units'}) {p.barcode ? `• ${p.barcode}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Quantity to Add *
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Unit Cost */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Unit Purchase Cost ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Supplier / Vendor
            </label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="e.g. Acme Wholesalers"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Receiving Notes / PO Ref
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. PO-9921 arrived via shipment"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* Calculated Total Value */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex justify-between items-center text-xs">
          <span className="font-bold text-emerald-950">Total Stock In Value Added:</span>
          <span className="text-sm font-black text-emerald-800">
            ${(quantity * unitCost).toFixed(2)}
          </span>
        </div>

        <button
          type="submit"
          className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>Confirm Stock In &amp; Update Ledger</span>
        </button>
      </form>

      {/* Recent Stock In Activity */}
      {recentStockIns.length > 0 && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" /> Recent Stock Receiving History
          </h3>
          <div className="divide-y divide-slate-100 text-xs">
            {recentStockIns.map((e) => (
              <div key={e.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">{e.productName}</span>
                  <span className="text-slate-400 block text-[11px]">
                    {new Date(e.date).toLocaleDateString()} • {e.supplier || 'Direct'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-black text-emerald-700">+{e.quantity} units</span>
                  <span className="text-[11px] text-slate-500 block">
                    Total: ${Number(e.totalPurchaseValue).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
