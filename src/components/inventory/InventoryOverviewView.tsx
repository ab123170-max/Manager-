/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Package,
  Camera,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  Skull,
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Eye,
  Trash2,
  Edit,
  Tag,
  Barcode,
  ShoppingBag,
  Star,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { SavedInventoryItem, CatalogFilterOptions, MenuSection } from '../../types';
import {
  getProducts,
  getInventoryValuation,
  adjustProductStock,
  deleteProduct,
  subscribeToStore,
  getInventoryTurnoverSummary,
  getProductReputationSummary,
} from '../../utils/unifiedDataStore';

interface InventoryOverviewViewProps {
  onAddProduct?: () => void;
  onEditProduct?: (product: SavedInventoryItem) => void;
  onStockIn?: (productId?: string) => void;
  onStockOut?: (productId?: string) => void;
  onRecordSale?: (product: SavedInventoryItem) => void;
  onSelectProduct?: (product: SavedInventoryItem) => void;
  onNavigateSection?: (section: MenuSection, subView: string) => void;
}

export const InventoryOverviewView: React.FC<InventoryOverviewViewProps> = ({
  onAddProduct,
  onEditProduct,
  onStockIn,
  onStockOut,
  onRecordSale,
  onSelectProduct,
  onNavigateSection,
}) => {
  const [products, setProducts] = useState<SavedInventoryItem[]>(getProducts());
  const [metrics, setMetrics] = useState(getInventoryValuation());
  const [turnoverSummary, setTurnoverSummary] = useState(getInventoryTurnoverSummary());
  const [reputationSummary, setReputationSummary] = useState(getProductReputationSummary());

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<CatalogFilterOptions['status']>('all');
  const [sortBy, setSortBy] = useState<string>('savedAt_desc');

  useEffect(() => {
    return subscribeToStore(() => {
      setProducts(getProducts());
      setMetrics(getInventoryValuation());
      setTurnoverSummary(getInventoryTurnoverSummary());
      setReputationSummary(getProductReputationSummary());
    });
  }, []);

  // Unique categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = p.productName.toLowerCase().includes(q);
        const matchesBarcode = p.barcode?.toLowerCase().includes(q);
        const matchesBrand = p.brand?.toLowerCase().includes(q);
        const matchesSku = p.sku?.toLowerCase().includes(q);
        if (!matchesName && !matchesBarcode && !matchesBrand && !matchesSku) return false;
      }

      // Category
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }

      // Status
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'name_asc') return a.productName.localeCompare(b.productName);
      if (sortBy === 'name_desc') return b.productName.localeCompare(a.productName);
      if (sortBy === 'stock_asc') return (a.stockQuantity || 0) - (b.stockQuantity || 0);
      if (sortBy === 'stock_desc') return (b.stockQuantity || 0) - (a.stockQuantity || 0);
      return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
    });
  }, [products, searchTerm, selectedCategory, statusFilter, sortBy]);

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name} from inventory?`)) {
      deleteProduct(id);
    }
  };

  const handleQuickStock = (id: string, delta: number) => {
    adjustProductStock(id, delta);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Boxes className="w-4 h-4" />
            <span>Real-time Stock Management</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Inventory Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Unified stock control, purchase valuations, profit projections, and inventory alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onStockIn && (
            <button
              type="button"
              onClick={() => onStockIn()}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              <span>Stock In</span>
            </button>
          )}

          {onStockOut && (
            <button
              type="button"
              onClick={() => onStockOut()}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
              <span>Stock Out</span>
            </button>
          )}

          {onNavigateSection && (
            <>
              <button
                type="button"
                onClick={() => onNavigateSection('inventory', 'turnover')}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Turnover</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateSection('inventory', 'reputation')}
                className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Reputation</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateSection('scanner', 'scan_product')}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Scan</span>
              </button>
            </>
          )}

          {onAddProduct && (
            <button
              type="button"
              onClick={onAddProduct}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Products */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            Total Products
          </span>
          <div className="text-xl font-black text-slate-900 mt-1">{metrics.totalProducts}</div>
          <span className="text-[10px] text-slate-400 font-medium">Unique SKUs in catalog</span>
        </div>

        {/* Total Stock Qty */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            Stock Units
          </span>
          <div className="text-xl font-black text-indigo-600 mt-1">{metrics.totalStockQuantity}</div>
          <span className="text-[10px] text-indigo-600/70 font-semibold">Total physical units</span>
        </div>

        {/* Total Purchase Value */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            Purchase Value
          </span>
          <div className="text-xl font-black text-slate-900 mt-1">
            ${metrics.totalPurchaseValue.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Cost of goods invested</span>
        </div>

        {/* Estimated Selling Value */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            Selling Value
          </span>
          <div className="text-xl font-black text-emerald-600 mt-1">
            ${metrics.estimatedSellingValue.toFixed(2)}
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold">
            Profit: +${metrics.expectedProfit.toFixed(2)}
          </span>
        </div>

        {/* Low Stock Alert */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'low_stock' ? 'all' : 'low_stock')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'low_stock'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/30'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-tight flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Low Stock
          </span>
          <div className="text-xl font-black text-amber-600 mt-1">{metrics.lowStockCount}</div>
          <span className="text-[10px] text-amber-700/80 font-semibold">Under min alert</span>
        </button>

        {/* Expiring / Expired */}
        <button
          type="button"
          onClick={() =>
            setStatusFilter(statusFilter === 'expiring_soon' ? 'all' : 'expiring_soon')
          }
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'expiring_soon'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/30'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-tight flex items-center gap-1">
            <Clock className="w-3 h-3" /> Expiry Alerts
          </span>
          <div className="text-xl font-black text-rose-600 mt-1">
            {metrics.expiringSoonCount + metrics.expiredCount}
          </div>
          <span className="text-[10px] text-rose-700/80 font-semibold">
            {metrics.expiredCount} expired / {metrics.expiringSoonCount} soon
          </span>
        </button>
      </div>

      {/* Turnover & Reputation Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Turnover Highlight */}
        <div className="bg-gradient-to-br from-indigo-50/60 to-white p-4 rounded-2xl border border-indigo-100 shadow-2xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-tight flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              Stock Turnover &amp; Velocity
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900">{turnoverSummary.averageTurnoverRatio}x</span>
              <span className="text-xs text-slate-500 font-medium">({turnoverSummary.averageDSI} days avg DSI)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {turnoverSummary.fastMovingCount} fast-moving items &bull; {turnoverSummary.stagnantCount} slow/dead stock
            </p>
          </div>
          {onNavigateSection && (
            <button
              type="button"
              onClick={() => onNavigateSection('inventory', 'turnover')}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-600 hover:text-white text-indigo-600 border border-indigo-200 text-xs font-bold transition-all shrink-0 shadow-2xs"
            >
              Analyze Turnover &rarr;
            </button>
          )}
        </div>

        {/* Reputation Highlight */}
        <div className="bg-gradient-to-br from-amber-50/50 to-white p-4 rounded-2xl border border-amber-100 shadow-2xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-tight flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              Product Reputation &amp; Ratings
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900">{reputationSummary.averageRating} ★</span>
              <span className="text-xs text-emerald-700 font-bold">({reputationSummary.averageScore}% satisfaction)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {reputationSummary.topRatedCount} top rated products &bull; {reputationSummary.averageReturnRate}% return rate
            </p>
          </div>
          {onNavigateSection && (
            <button
              type="button"
              onClick={() => onNavigateSection('inventory', 'reputation')}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-600 hover:text-white text-amber-800 border border-amber-200 text-xs font-bold transition-all shrink-0 shadow-2xs"
            >
              Review Ratings &rarr;
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by product name, barcode, brand, or SKU..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            >
              <option value="savedAt_desc">Latest Added</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="stock_asc">Stock (Lowest First)</option>
              <option value="stock_desc">Stock (Highest First)</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Status Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {[
            { id: 'all', label: 'All Items' },
            { id: 'in_stock', label: 'In Stock' },
            { id: 'low_stock', label: 'Low Stock' },
            { id: 'expiring_soon', label: 'Expiring Soon (<45d)' },
            { id: 'expired', label: 'Expired' },
            { id: 'out_of_stock', label: 'Out of Stock' },
          ].map((chip) => {
            const isSelected = statusFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setStatusFilter(chip.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Barcode / SKU</th>
                <th className="py-3 px-4 text-center">Stock</th>
                <th className="py-3 px-4">Purchase Price</th>
                <th className="py-3 px-4">Selling Price</th>
                <th className="py-3 px-4">Total Value</th>
                <th className="py-3 px-4">EXP Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((prod) => {
                  const pPrice = parseFloat(prod.purchasePrice?.replace(/[^0-9.]/g, '') || '0') || 0;
                  const sPrice = parseFloat(prod.sellingPrice?.replace(/[^0-9.]/g, '') || prod.mrp?.replace(/[^0-9.]/g, '') || '0') || 0;
                  const totalVal = (prod.stockQuantity || 0) * pPrice;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/90 transition-colors">
                      {/* Product Name & Brand */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 text-xs">
                          {prod.productName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
                          <span>{prod.brand || prod.supplier || 'General'}</span>
                          {prod.turnoverVelocity === 'fast' && (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                              ⚡ Fast
                            </span>
                          )}
                          {prod.reputationRating && (
                            <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                              ★ {prod.reputationRating}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold text-[10px]">
                          {prod.category}
                        </span>
                      </td>

                      {/* Barcode */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {prod.barcode || prod.sku || '-'}
                      </td>

                      {/* Stock Quantity */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-black text-xs px-2.5 py-1 rounded-lg ${
                            prod.stockQuantity <= 0
                              ? 'bg-rose-100 text-rose-800'
                              : prod.stockQuantity <= (prod.minStockAlert || 5)
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {prod.stockQuantity} {prod.unit || 'units'}
                        </span>
                      </td>

                      {/* Purchase Price */}
                      <td className="py-3 px-4 text-slate-600 font-bold">
                        ${pPrice.toFixed(2)}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 font-black text-emerald-700">
                        ${sPrice.toFixed(2)}
                      </td>

                      {/* Total Value */}
                      <td className="py-3 px-4 font-bold text-slate-900">
                        ${totalVal.toFixed(2)}
                      </td>

                      {/* Expiry Date */}
                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {prod.expiryDate ? (
                          <span className={prod.status === 'expired' ? 'text-rose-600 font-bold' : ''}>
                            {prod.expiryDate}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            prod.status === 'expired'
                              ? 'bg-rose-600 text-white'
                              : prod.status === 'expiring_soon'
                              ? 'bg-orange-500 text-white'
                              : prod.status === 'low_stock'
                              ? 'bg-amber-500 text-white'
                              : prod.status === 'out_of_stock'
                              ? 'bg-slate-800 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {prod.status?.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleQuickStock(prod.id, 1)}
                            className="p-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[10px]"
                            title="Quick +1 Stock"
                          >
                            +1
                          </button>
                          {onStockIn && (
                            <button
                              type="button"
                              onClick={() => onStockIn(prod.id)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              title="Stock In (+)"
                            >
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onStockOut && (
                            <button
                              type="button"
                              onClick={() => onStockOut(prod.id)}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100"
                              title="Stock Out (-)"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onRecordSale && (
                            <button
                              type="button"
                              onClick={() => onRecordSale(prod)}
                              className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                              title="Sell Product"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onEditProduct && (
                            <button
                              type="button"
                              onClick={() => onEditProduct(prod)}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                              title="Edit Product"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(prod.id, prod.productName)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-700">No matching products found</p>
                    <p className="text-[11px] text-slate-500">
                      Try clearing filters or add a new product to your inventory.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
