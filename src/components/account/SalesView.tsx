/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  Receipt,
  User,
  CreditCard,
  CheckCircle2,
  Calendar,
  Download,
  AlertCircle,
} from 'lucide-react';
import { SavedInventoryItem, SalesRecord } from '../../types';
import {
  getProducts,
  getSalesRecords,
  recordSale,
  subscribeToStore,
} from '../../utils/unifiedDataStore';

interface SalesViewProps {
  initialProduct?: SavedInventoryItem | null;
}

export const SalesView: React.FC<SalesViewProps> = ({ initialProduct }) => {
  const [products, setProducts] = useState<SavedInventoryItem[]>(getProducts());
  const [sales, setSales] = useState<SalesRecord[]>(getSalesRecords());

  // POS Form State
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProduct?.id || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'credit' | 'other'>('cash');
  const [notes, setNotes] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToStore(() => {
      setProducts(getProducts());
      setSales(getSalesRecords());
    });
  }, []);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Autofill unit price when product is chosen
  useEffect(() => {
    if (selectedProduct) {
      const price = parseFloat(
        selectedProduct.sellingPrice?.replace(/[^0-9.]/g, '') ||
        selectedProduct.mrp?.replace(/[^0-9.]/g, '') ||
        '0'
      ) || 0;
      setSellingPrice(price);
    }
  }, [selectedProduct]);

  // Aggregate Metrics
  const totalRevenue = useMemo(() => {
    return sales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  }, [sales]);

  const totalProfit = useMemo(() => {
    return sales.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);
  }, [sales]);

  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !selectedProduct) {
      alert('Please select a product.');
      return;
    }
    if (quantity <= 0) {
      alert('Please enter a quantity greater than 0.');
      return;
    }
    if (quantity > selectedProduct.stockQuantity) {
      if (!confirm(`Warning: Requested quantity (${quantity}) exceeds available stock (${selectedProduct.stockQuantity}). Proceed with sale?`)) {
        return;
      }
    }

    const unitCost = parseFloat(selectedProduct.purchasePrice?.replace(/[^0-9.]/g, '') || '0') || 0;
    const totalAmt = quantity * sellingPrice - discount;
    const costOfGoods = quantity * unitCost;
    const grossProfit = totalAmt - costOfGoods;

    const res = recordSale({
      productId: selectedProduct.id,
      quantity,
      sellingPrice,
      discount,
      customerName: customerName.trim() || 'Walk-in Customer',
      paymentMethod,
      notes,
    });

    if (res.success) {
      setFeedback(`Sale recorded successfully! Revenue: $${totalAmt.toFixed(2)} • Gross Profit: +$${grossProfit.toFixed(2)}`);
      setQuantity(1);
      setDiscount(0);
      setCustomerName('');
      setNotes('');
      setTimeout(() => setFeedback(null), 4500);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <ShoppingBag className="w-4 h-4" />
            <span>Revenue &amp; Point of Sale</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Sales &amp; Orders ({sales.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Record customer checkouts, compute real-time profit margins, and automatically decrease on-hand inventory.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            Total Sales Revenue
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">${totalRevenue.toFixed(2)}</div>
          <span className="text-[10px] text-slate-400 font-medium">Gross income from sales</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            Total Gross Profit
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">+${totalProfit.toFixed(2)}</div>
          <span className="text-[10px] text-emerald-700 font-medium">Revenue minus product costs</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            Average Profit Margin
          </span>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            {totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}%` : '0.0%'}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Weighted gross margin</span>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* POS Checkout Form & History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Point of Sale Terminal */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleSubmitSale}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4"
          >
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-600" />
              <span>Record New Sale (POS)</span>
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Select Product *
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">-- Choose Item from Inventory --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.productName} (In Stock: {p.stockQuantity}) {p.barcode ? `• ${p.barcode}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Qty Sold *
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Unit Price ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Discount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card / POS</option>
                  <option value="upi">UPI / Online Transfer</option>
                  <option value="credit">Customer Credit</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in Customer"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
              />
            </div>

            {/* Price & Profit Preview */}
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-700">
                <span>Net Total Amount:</span>
                <span className="text-slate-950 font-black text-sm">
                  ${Math.max(0, quantity * sellingPrice - discount).toFixed(2)}
                </span>
              </div>
              {selectedProduct && (
                <div className="flex justify-between text-[11px] text-emerald-800 font-bold pt-1 border-t border-indigo-200/60">
                  <span>Projected Gross Profit:</span>
                  <span>
                    +$
                    {Math.max(
                      0,
                      quantity * sellingPrice -
                        discount -
                        quantity *
                          (parseFloat(
                            selectedProduct.purchasePrice?.replace(/[^0-9.]/g, '') || '0'
                          ) || 0)
                    ).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Complete Sale &amp; Deduct Stock</span>
            </button>
          </form>
        </div>

        {/* Right: Sales History Table */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recent Sales Transactions
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Date / ID</th>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3">Revenue</th>
                    <th className="py-2.5 px-3">Gross Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {sales.length > 0 ? (
                    sales.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold text-slate-800 text-[11px]">
                            {s.invoiceNumber || s.id.slice(0, 8)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(s.date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{s.productName}</td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {s.customerName || 'Walk-in'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-slate-900">
                          {s.quantity}
                        </td>
                        <td className="py-2.5 px-3 font-black text-slate-900">
                          ${Number(s.totalAmount).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-700">
                          +${Number(s.profit).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        No sales recorded yet. Use the POS form to record your first checkout.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
