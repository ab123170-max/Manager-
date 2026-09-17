/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Zap,
  Clock,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  CheckCircle2,
  HelpCircle,
  BarChart2,
} from 'lucide-react';
import { SavedInventoryItem } from '../../types';
import {
  getProducts,
  getInventoryTurnoverSummary,
  subscribeToStore,
  InventoryTurnoverSummary,
} from '../../utils/unifiedDataStore';

interface InventoryTurnoverViewProps {
  onStockIn?: (productId: string) => void;
  onStockOut?: (productId: string) => void;
}

export const InventoryTurnoverView: React.FC<InventoryTurnoverViewProps> = ({
  onStockIn,
  onStockOut,
}) => {
  const [products, setProducts] = useState<SavedInventoryItem[]>(getProducts());
  const [summary, setSummary] = useState<InventoryTurnoverSummary>(getInventoryTurnoverSummary());
  const [search, setSearch] = useState('');
  const [velocityFilter, setVelocityFilter] = useState<'all' | 'fast' | 'medium' | 'slow' | 'stagnant'>('all');
  const [sortBy, setSortBy] = useState<'turnover_desc' | 'turnover_asc' | 'dsi_asc' | 'stock_desc'>('turnover_desc');

  useEffect(() => {
    return subscribeToStore(() => {
      setProducts(getProducts());
      setSummary(getInventoryTurnoverSummary());
    });
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !search ||
        p.productName.toLowerCase().includes(search.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(search.toLowerCase())) ||
        (p.barcode && p.barcode.includes(search));

      const matchVelocity =
        velocityFilter === 'all' || p.turnoverVelocity === velocityFilter;

      return matchSearch && matchVelocity;
    }).sort((a, b) => {
      const aTurn = a.turnoverRate || 0;
      const bTurn = b.turnoverRate || 0;
      const aDsi = a.daysSalesOfInventory || 999;
      const bDsi = b.daysSalesOfInventory || 999;
      const aStock = a.stockQuantity || 0;
      const bStock = b.stockQuantity || 0;

      if (sortBy === 'turnover_desc') return bTurn - aTurn;
      if (sortBy === 'turnover_asc') return aTurn - bTurn;
      if (sortBy === 'dsi_asc') return aDsi - bDsi;
      if (sortBy === 'stock_desc') return bStock - aStock;
      return 0;
    });
  }, [products, search, velocityFilter, sortBy]);

  const getVelocityBadge = (velocity?: string) => {
    switch (velocity) {
      case 'fast':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Zap className="w-3 h-3 text-emerald-600" />
            Fast Moving
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <TrendingUp className="w-3 h-3 text-blue-600" />
            Moderate
          </span>
        );
      case 'slow':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Slow Moving
          </span>
        );
      case 'stagnant':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Dead Stock
          </span>
        );
    }
  };

  const getRecommendation = (velocity?: string, stockQty: number = 0) => {
    if (velocity === 'fast') {
      return stockQty <= 10 ? 'High stock-out risk. Reorder immediately.' : 'High velocity. Maintain buffer stock.';
    }
    if (velocity === 'medium') {
      return 'Healthy movement. Reorder on standard cadence.';
    }
    if (velocity === 'slow') {
      return 'Low velocity. Avoid bulk reordering.';
    }
    return 'Stagnant capital. Run promotional discount or clearance.';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Stock Velocity &amp; Cash Flow Efficiency</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Inventory Turnover &amp; Velocity
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track annual inventory turns, Days Sales of Inventory (DSI), and identify fast-moving staples versus stagnant dead stock.
          </p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            Avg Turnover Ratio
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-indigo-600">
              {summary.averageTurnoverRatio}x
            </span>
            <span className="text-[11px] text-slate-400 font-medium">/ year</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Stock turnaround frequency
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            Days of Inventory (DSI)
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">
              {summary.averageDSI}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">days</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Average days to clear stock
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            Fast-Moving Items
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-600">
              {summary.fastMovingCount}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">products</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
            ⚡ High sales velocity
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            Stagnant / Dead Stock
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-rose-600">
              {summary.stagnantCount}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">products</span>
          </div>
          <span className="text-[11px] text-rose-600 font-medium mt-1 block">
            ⚠️ Capital tied up
          </span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products or categories..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/50"
          />
        </div>

        {/* Velocity Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {(['all', 'fast', 'medium', 'slow', 'stagnant'] as const).map((vel) => (
            <button
              key={vel}
              type="button"
              onClick={() => setVelocityFilter(vel)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize ${
                velocityFilter === vel
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {vel === 'all' ? 'All Velocity' : vel}
            </button>
          ))}

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer"
          >
            <option value="turnover_desc">Turnover (Highest First)</option>
            <option value="turnover_asc">Turnover (Lowest First)</option>
            <option value="dsi_asc">Fastest DSI Days</option>
            <option value="stock_desc">Highest Stock Level</option>
          </select>
        </div>
      </div>

      {/* Turnover Products Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-600" />
            <span>Product Velocity Breakdown ({filteredProducts.length})</span>
          </h2>
          <span className="text-xs text-slate-500">
            Click Stock In/Out to quickly adjust inventory levels
          </span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Package className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No products match the selected criteria.</p>
            <p className="text-xs text-slate-400">Try changing your search term or velocity filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4">Turnover Ratio</th>
                  <th className="py-3 px-4">Est. DSI</th>
                  <th className="py-3 px-4">Velocity</th>
                  <th className="py-3 px-4">Recommendation</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        {prod.imageThumbnail ? (
                          <img
                            src={prod.imageThumbnail}
                            alt=""
                            className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-400 font-bold text-xs">
                            {prod.productName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="truncate max-w-[200px] font-semibold">{prod.productName}</div>
                          {prod.barcode && (
                            <span className="text-[10px] text-slate-400 font-mono">{prod.barcode}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {prod.category || 'General'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900">{prod.stockQuantity}</span>{' '}
                      <span className="text-slate-400 text-[11px]">{prod.unit || 'pcs'}</span>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-indigo-600 text-sm">
                      {prod.turnoverRate}x
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">
                      {prod.daysSalesOfInventory} days
                    </td>
                    <td className="py-3 px-4">
                      {getVelocityBadge(prod.turnoverVelocity)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs text-[11px]">
                      {getRecommendation(prod.turnoverVelocity, prod.stockQuantity)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {onStockIn && (
                          <button
                            type="button"
                            onClick={() => onStockIn(prod.id)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs transition-colors"
                            title="Stock In (+)"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onStockOut && (
                          <button
                            type="button"
                            onClick={() => onStockOut(prod.id)}
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs transition-colors"
                            title="Stock Out (-)"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
