/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Tag,
  Boxes,
  DollarSign,
  TrendingUp,
  Package,
} from 'lucide-react';
import { SavedInventoryItem } from '../../types';
import { getProducts, subscribeToStore } from '../../utils/unifiedDataStore';

export const CategoriesView: React.FC = () => {
  const [products, setProducts] = useState<SavedInventoryItem[]>(getProducts());

  useEffect(() => {
    return subscribeToStore(() => {
      setProducts(getProducts());
    });
  }, []);

  const categoryStats = useMemo(() => {
    const map = new Map<
      string,
      { count: number; totalStock: number; totalCost: number; totalSelling: number }
    >();

    products.forEach((p) => {
      const cat = p.category || 'Uncategorized';
      const pCost = parseFloat(p.purchasePrice?.replace(/[^0-9.]/g, '') || '0') || 0;
      const sPrice = parseFloat(p.sellingPrice?.replace(/[^0-9.]/g, '') || p.mrp?.replace(/[^0-9.]/g, '') || '0') || 0;
      const stock = p.stockQuantity || 0;

      const current = map.get(cat) || { count: 0, totalStock: 0, totalCost: 0, totalSelling: 0 };
      map.set(cat, {
        count: current.count + 1,
        totalStock: current.totalStock + stock,
        totalCost: current.totalCost + stock * pCost,
        totalSelling: current.totalSelling + stock * sPrice,
      });
    });

    return Array.from(map.entries()).map(([category, data]) => ({
      category,
      ...data,
      expectedProfit: data.totalSelling - data.totalCost,
    }));
  }, [products]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
          <Tag className="w-4 h-4" />
          <span>Catalog Structure</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Product Categories ({categoryStats.length})
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Valuation, unit density, and expected profit breakdowns partitioned across product lines.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoryStats.map((c) => (
          <div
            key={c.category}
            className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 hover:border-indigo-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <Tag className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">{c.category}</h3>
              </div>
              <span className="text-xs font-black px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                {c.count} SKUs
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl">
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Units</span>
                <span className="font-extrabold text-slate-900">{c.totalStock} units</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Invested Cost</span>
                <span className="font-extrabold text-slate-900">${c.totalCost.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Selling Val</span>
                <span className="font-black text-emerald-700">${c.totalSelling.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Expected Gain</span>
                <span className="font-black text-indigo-600">+${c.expectedProfit.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
