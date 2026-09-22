/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  RotateCcw,
  LayoutGrid,
  List,
  Sparkles,
  Smartphone,
  ChevronLeft,
} from 'lucide-react';
import { SavedInventoryItem, CatalogFilterOptions, MenuSection } from '../../types';
import {
  getProducts,
  getInventoryValuation,
  adjustProductStock,
  deleteProduct,
  saveProduct,
  subscribeToStore,
  getInventoryTurnoverSummary,
  getProductReputationSummary,
} from '../../utils/unifiedDataStore';
import { SwipeableInventoryItem } from './SwipeableInventoryItem';
import { useLanguage } from '../../context/LanguageContext';

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
  const { t, formatCurrency, formatNumber } = useLanguage();
  const [products, setProducts] = useState<SavedInventoryItem[]>(getProducts());
  const [metrics, setMetrics] = useState(getInventoryValuation());
  const [turnoverSummary, setTurnoverSummary] = useState(getInventoryTurnoverSummary());
  const [reputationSummary, setReputationSummary] = useState(getProductReputationSummary());

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<CatalogFilterOptions['status']>('all');
  const [sortBy, setSortBy] = useState<string>('savedAt_desc');
  const [viewMode, setViewMode] = useState<'auto' | 'cards' | 'table'>('auto');

  // Undo Toast & Deletion Confirmation State
  const [undoItem, setUndoItem] = useState<SavedInventoryItem | null>(null);
  const [confirmModalItem, setConfirmModalItem] = useState<SavedInventoryItem | null>(null);
  const undoTimeoutRef = useRef<any>(null);

  useEffect(() => {
    return subscribeToStore(() => {
      setProducts(getProducts());
      setMetrics(getInventoryValuation());
      setTurnoverSummary(getInventoryTurnoverSummary());
      setReputationSummary(getProductReputationSummary());
    });
  }, []);

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
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

  const handleDeleteProduct = (product: SavedInventoryItem) => {
    deleteProduct(product.id);
    setUndoItem(product);
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    undoTimeoutRef.current = setTimeout(() => {
      setUndoItem(null);
    }, 5500);
  };

  const handleUndoDelete = () => {
    if (undoItem) {
      saveProduct(undoItem);
      setUndoItem(null);
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    }
  };

  const handleQuickStock = (id: string, delta: number) => {
    adjustProductStock(id, delta);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 relative">
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
            {t('inventory.totalProducts')}
          </span>
          <div className="text-xl font-black text-slate-900 mt-1 flex items-baseline gap-1.5">
            <span>{formatNumber(metrics.totalProducts)}</span>
            <span className="text-xs text-slate-400 font-semibold">SKUs</span>
          </div>
        </div>

        {/* Total Stock Units */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            Stock On Hand
          </span>
          <div className="text-xl font-black text-indigo-600 mt-1 flex items-baseline gap-1.5">
            <span>{formatNumber(metrics.totalStockQuantity)}</span>
            <span className="text-xs text-slate-400 font-semibold">units</span>
          </div>
        </div>

        {/* Total Inventory Cost */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            {t('inventory.totalValue')}
          </span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {formatCurrency(metrics.totalPurchaseValue)}
          </div>
        </div>

        {/* Potential Retail Value */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            Retail Value
          </span>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {formatCurrency(metrics.totalRetailValue)}
          </div>
        </div>

        {/* Projected Profit */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            Projected Profit
          </span>
          <div className="text-xl font-black text-emerald-600 mt-1">
            +{formatCurrency(metrics.potentialProfit)}
          </div>
        </div>

        {/* Low / Critical Stock */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            {t('inventory.lowStock')} &amp; Expiry
          </span>
          <div className="text-xl font-black text-rose-600 mt-1 flex items-baseline gap-2">
            <span>{formatNumber(metrics.lowStockProducts + metrics.expiredProducts)}</span>
            <span className="text-[11px] font-semibold text-slate-400">
              ({formatNumber(metrics.lowStockProducts)} low / {formatNumber(metrics.expiredProducts)} exp)
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('inventory.searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            >
              <option value="all">All Categories</option>
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

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('auto')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'auto' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Responsive View (Cards on mobile, Table on desktop)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="text-[11px]">Auto</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'cards' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Card List View with Swipe-to-Delete"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="text-[11px]">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'table' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
                <span className="text-[11px]">Table</span>
              </button>
            </div>
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

      {/* ========================================================================= */}
      {/* 1. MOBILE-FIRST SWIPEABLE CARDS LIST (Visible on mobile, or when cards selected) */}
      {/* ========================================================================= */}
      {(viewMode === 'cards' || viewMode === 'auto') && (
        <div className={viewMode === 'auto' ? 'block md:hidden space-y-3' : 'space-y-3'}>
          {/* Mobile Gestures Discovery Hint */}
          <div className="flex items-center justify-between px-2 py-1 bg-indigo-50/70 border border-indigo-100/80 rounded-xl text-[11px] text-indigo-900 font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Swipe any card left to delete item</span>
            </span>
            <span className="text-slate-500 font-normal">{filteredProducts.length} items</span>
          </div>

          {filteredProducts.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((prod) => (
                <motion.div
                  key={prod.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <SwipeableInventoryItem
                    product={prod}
                    onDelete={handleDeleteProduct}
                    onQuickStock={handleQuickStock}
                    onStockIn={onStockIn}
                    onStockOut={onStockOut}
                    onRecordSale={onRecordSale}
                    onEditProduct={onEditProduct}
                    onSelectProduct={onSelectProduct}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-slate-400">
              <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">No matching products</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Try adjusting your search terms or filters.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DESKTOP PRODUCTS TABLE (Visible on desktop when auto, or when table selected) */}
      {/* ========================================================================= */}
      {(viewMode === 'table' || viewMode === 'auto') && (
        <div className={`${viewMode === 'auto' ? 'hidden md:block' : 'block'} bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs`}>
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
                          <div
                            onClick={() => onSelectProduct?.(prod)}
                            className="font-extrabold text-slate-900 text-xs hover:text-indigo-600 cursor-pointer"
                          >
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
                              onClick={() => setConfirmModalItem(prod)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Delete Product"
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
      )}

      {/* ========================================================================= */}
      {/* 3. NATIVE FLOATING UNDO NOTIFICATION */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {undoItem && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 max-w-md w-[92vw]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-xl bg-rose-500/20 text-rose-400 flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs truncate">Deleted "{undoItem.productName}"</p>
                <p className="text-[10px] text-slate-400">Item removed from inventory</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleUndoDelete}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>
              <button
                type="button"
                onClick={() => setUndoItem(null)}
                className="text-slate-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 4. IN-APP CONFIRMATION MODAL (Replaces window.confirm) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {confirmModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  Delete Product?
                </h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to remove <span className="font-bold text-slate-800">"{confirmModalItem.productName}"</span> from your active inventory?
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModalItem(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteProduct(confirmModalItem);
                    setConfirmModalItem(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/25 transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
