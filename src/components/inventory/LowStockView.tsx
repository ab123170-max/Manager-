/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Package,
  Plus,
  ArrowDownLeft,
  DollarSign,
  Building,
} from 'lucide-react';
import { SavedInventoryItem } from '../../types';
import {
  getProducts,
  adjustProductStock,
  subscribeToStore,
} from '../../utils/unifiedDataStore';

interface LowStockViewProps {
  onStockIn?: (productId: string) => void;
}

export const LowStockView: React.FC<LowStockViewProps> = ({ onStockIn }) => {
  const [products, setProducts] = useState<SavedInventoryItem[]>(getProducts());

  useEffect(() => {
    return subscribeToStore(() => {
      setProducts(getProducts());
    });
  }, []);

  const lowStockItems = products.filter(
    (p) => (p.stockQuantity || 0) <= (p.minStockAlert || 5)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-600 text-xs font-bold uppercase tracking-wider mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>Replenishment Alerts</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Low Stock Products ({lowStockItems.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Products that have fallen below their configured minimum threshold and require immediate re-ordering.
          </p>
        </div>
      </div>

      {lowStockItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lowStockItems.map((p) => (
            <div
              key={p.id}
              className="bg-white p-5 rounded-3xl border border-amber-200/80 shadow-xs space-y-3 relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    {p.category}
                  </span>
                  <h3 className="font-black text-slate-900 text-sm mt-1.5">{p.productName}</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {p.brand || p.supplier || 'Standard SKU'}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-rose-600">
                    {p.stockQuantity} <span className="text-xs text-slate-400 font-normal">/ {p.minStockAlert || 5} min</span>
                  </div>
                  <span className="text-[10px] text-rose-700 font-bold">
                    {p.stockQuantity <= 0 ? 'OUT OF STOCK' : 'CRITICAL'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 text-slate-600">
                <div>
                  <span className="text-[10px] text-slate-400 block">Purchase Cost:</span>
                  <span className="font-bold text-slate-800">
                    {p.purchasePrice || '$0.00'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Supplier:</span>
                  <span className="font-bold text-slate-800 truncate block">
                    {p.supplier || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => adjustProductStock(p.id, 10)}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+10 Quick Stock</span>
                </button>

                {onStockIn && (
                  <button
                    type="button"
                    onClick={() => onStockIn(p.id)}
                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                  >
                    Custom
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
          <Package className="w-12 h-12 mx-auto text-emerald-400" />
          <p className="text-sm font-bold text-slate-700">Healthy Stock Levels</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All products currently have sufficient inventory above their minimum safety thresholds.
          </p>
        </div>
      )}
    </div>
  );
};
