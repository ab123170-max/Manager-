/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Clock,
  AlertTriangle,
  Package,
  Calendar,
  DollarSign,
  Tag,
  ArrowRight,
  ShoppingBag,
} from 'lucide-react';
import { SavedInventoryItem } from '../../types';
import { getProducts, subscribeToStore } from '../../utils/unifiedDataStore';

interface ExpiringSoonViewProps {
  onRecordSale?: (product: SavedInventoryItem) => void;
}

export const ExpiringSoonView: React.FC<ExpiringSoonViewProps> = ({ onRecordSale }) => {
  const [products, setProducts] = useState<SavedInventoryItem[]>(getProducts());

  useEffect(() => {
    return subscribeToStore(() => {
      setProducts(getProducts());
    });
  }, []);

  const expiringItems = products.filter((p) => p.status === 'expiring_soon');

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 text-orange-600 text-xs font-bold uppercase tracking-wider mb-1">
          <Clock className="w-4 h-4" />
          <span>Shelf Life &amp; Expiry Risk</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Expiring Soon ({expiringItems.length} Products)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Items reaching their expiration date within 45 days. Prioritize clearance discounts and promotional bundling to prevent inventory write-offs.
        </p>
      </div>

      {expiringItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {expiringItems.map((p) => (
            <div
              key={p.id}
              className="bg-white p-5 rounded-3xl border border-orange-200 shadow-xs space-y-3 relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                    {p.category}
                  </span>
                  <h3 className="font-black text-slate-900 text-sm mt-1.5">{p.productName}</h3>
                  <p className="text-xs text-slate-500 font-medium">{p.brand || 'General'}</p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black px-2 py-1 bg-orange-500 text-white rounded-lg">
                    EXP: {p.expiryDate}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-orange-50/50 rounded-xl grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Stock at Risk:</span>
                  <span className="font-black text-slate-900">{p.stockQuantity} {p.unit || 'units'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Current Price:</span>
                  <span className="font-bold text-slate-800">{p.sellingPrice || p.mrp || '$0.00'}</span>
                </div>
              </div>

              {onRecordSale && (
                <button
                  type="button"
                  onClick={() => onRecordSale(p)}
                  className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Sell on Clearance</span>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
          <Clock className="w-12 h-12 mx-auto text-emerald-400" />
          <p className="text-sm font-bold text-slate-700">No Imminent Expirations</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All active inventory items have comfortable shelf life margins (&gt;45 days).
          </p>
        </div>
      )}
    </div>
  );
};
