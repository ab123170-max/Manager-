/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  Trash2,
  Edit3,
  Calendar,
  DollarSign,
  Barcode,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowUpDown,
  FileText,
  Boxes,
  Eye,
  X,
  ChevronRight,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  Tag,
  MapPin,
  Truck,
} from 'lucide-react';
import { SavedInventoryItem, CatalogProduct, ExtractedFormData } from '../types';
import {
  saveManualCatalogProduct,
  updateCatalogProduct,
  adjustProductStock,
  deleteCatalogProduct,
  exportCatalogCsv,
  exportInventoryJson,
  importCatalogJson,
} from '../utils/inventoryStore';

interface ProductCatalogProps {
  products: SavedInventoryItem[];
  onRefresh: () => void;
  onOpenScanner?: () => void;
  onLoadIntoForm?: (item: SavedInventoryItem) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  onRefresh,
  onOpenScanner,
  onLoadIntoForm,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'in_stock' | 'low_stock' | 'expiring_soon' | 'out_of_stock'>('all');
  const [sortBy, setSortBy] = useState<'savedAt_desc' | 'savedAt_asc' | 'name_asc' | 'name_desc' | 'expiry_asc' | 'stock_asc'>('savedAt_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SavedInventoryItem | null>(null);
  const [viewingProduct, setViewingProduct] = useState<SavedInventoryItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Derive categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  // Metrics
  const metrics = useMemo(() => {
    let totalItems = products.length;
    let totalStockUnits = 0;
    let lowStockCount = 0;
    let expiringCount = 0;
    let outOfStockCount = 0;
    let totalEstimatedValue = 0;

    products.forEach((p) => {
      const stock = p.stockQuantity ?? (parseInt(p.quantity || '0', 10) || 0);
      totalStockUnits += stock;

      if (p.status === 'low_stock') lowStockCount++;
      if (p.status === 'expiring_soon' || p.status === 'expired') expiringCount++;
      if (p.status === 'out_of_stock' || stock <= 0) outOfStockCount++;

      // Price parse
      const priceNum = parseFloat((p.sellingPrice || p.mrp || '0').replace(/[^0-9.]/g, '')) || 0;
      totalEstimatedValue += priceNum * stock;
    });

    return {
      totalItems,
      totalStockUnits,
      lowStockCount,
      expiringCount,
      outOfStockCount,
      totalEstimatedValue,
    };
  }, [products]);

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((item) => {
        // Search
        const term = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !term ||
          item.productName.toLowerCase().includes(term) ||
          item.brand.toLowerCase().includes(term) ||
          item.sku.toLowerCase().includes(term) ||
          item.barcode.toLowerCase().includes(term) ||
          item.batchNumber.toLowerCase().includes(term) ||
          item.category.toLowerCase().includes(term);

        // Category
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;

        // Status
        let matchesStatus = true;
        if (selectedStatus !== 'all') {
          matchesStatus = item.status === selectedStatus;
        }

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'savedAt_desc') {
          return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
        }
        if (sortBy === 'savedAt_asc') {
          return new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime();
        }
        if (sortBy === 'name_asc') {
          return a.productName.localeCompare(b.productName);
        }
        if (sortBy === 'name_desc') {
          return b.productName.localeCompare(a.productName);
        }
        if (sortBy === 'expiry_asc') {
          const tA = a.expiryDate ? new Date(a.expiryDate).getTime() : 9999999999999;
          const tB = b.expiryDate ? new Date(b.expiryDate).getTime() : 9999999999999;
          return tA - tB;
        }
        if (sortBy === 'stock_asc') {
          const sA = a.stockQuantity ?? (parseInt(a.quantity || '0', 10) || 0);
          const sB = b.stockQuantity ?? (parseInt(b.quantity || '0', 10) || 0);
          return sA - sB;
        }
        return 0;
      });
  }, [products, searchTerm, selectedCategory, selectedStatus, sortBy]);

  const handleStockDelta = (id: string, delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    adjustProductStock(id, delta);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    deleteCatalogProduct(id);
    setDeleteConfirmId(null);
    if (viewingProduct?.id === id) setViewingProduct(null);
    if (editingProduct?.id === id) setEditingProduct(null);
    onRefresh();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        importCatalogJson(text);
        setImportStatus('Catalog imported successfully!');
        onRefresh();
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err) {
        setImportStatus('Import failed. Invalid JSON format.');
        setTimeout(() => setImportStatus(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Catalog Items */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Products</span>
            <Boxes className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{metrics.totalItems}</div>
          <div className="text-[11px] text-slate-500">
            {metrics.totalStockUnits} units in stock
          </div>
        </div>

        {/* Total Valuation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Inventory Value</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            ${metrics.totalEstimatedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">Estimated Retail</div>
        </div>

        {/* Low Stock Alert */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'low_stock' ? 'all' : 'low_stock')}
          className={`border rounded-2xl p-4 shadow-2xs space-y-1 cursor-pointer transition-colors ${
            metrics.lowStockCount > 0
              ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/70'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-semibold">Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-900">{metrics.lowStockCount}</div>
          <div className="text-[11px] text-amber-700 font-medium">
            {selectedStatus === 'low_stock' ? 'Filtering low stock' : 'Tap to filter'}
          </div>
        </div>

        {/* Expiring Soon Alert */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'expiring_soon' ? 'all' : 'expiring_soon')}
          className={`border rounded-2xl p-4 shadow-2xs space-y-1 cursor-pointer transition-colors ${
            metrics.expiringCount > 0
              ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-100/70'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-semibold">Expiring Soon</span>
            <Clock className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-900">{metrics.expiringCount}</div>
          <div className="text-[11px] text-rose-700 font-medium">
            {selectedStatus === 'expiring_soon' ? 'Filtering expiring' : 'Within 45 days'}
          </div>
        </div>

        {/* Quick Action Button */}
        <div className="col-span-2 sm:col-span-1 bg-slate-900 rounded-2xl p-4 text-white shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-semibold">Quick Add</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
            {onOpenScanner && (
              <button
                type="button"
                onClick={onOpenScanner}
                className="inline-flex items-center justify-center p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
                title="Scan new product with camera"
              >
                <Barcode className="w-4 h-4 text-slate-300" />
              </button>
            )}
          </div>
        </div>
      </div>

      {importStatus && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-800 flex items-center justify-between">
          <span>{importStatus}</span>
          <button type="button" onClick={() => setImportStatus(null)} className="text-indigo-600 hover:text-indigo-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Catalog Header & Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search catalog by name, brand, SKU, barcode, batch..."
              className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Tools (Export, Import, Sort, View Mode) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort Select */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border-none text-xs text-slate-800 font-medium focus:outline-none cursor-pointer"
              >
                <option value="savedAt_desc">Newest First</option>
                <option value="savedAt_asc">Oldest First</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
                <option value="expiry_asc">Expiry (Soonest)</option>
                <option value="stock_asc">Stock (Lowest)</option>
              </select>
            </div>

            {/* Export Actions */}
            <button
              type="button"
              onClick={exportCatalogCsv}
              disabled={products.length === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40 transition-colors shadow-2xs"
              title="Export product catalog as CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={exportInventoryJson}
              disabled={products.length === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40 transition-colors shadow-2xs"
              title="Export complete database backup as JSON"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>JSON</span>
            </button>

            {/* Import Input */}
            <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer transition-colors shadow-2xs">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Import</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>

            {/* Refresh */}
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
              title="Refresh inventory"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Category & Status Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Category:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Status:
            </span>
            {(['all', 'in_stock', 'low_stock', 'expiring_soon', 'out_of_stock'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize transition-colors ${
                  selectedStatus === st
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Catalog Grid / List */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {products.length === 0 ? 'No products in your catalog yet' : 'No matching products found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {products.length === 0
                ? 'Scan product packaging or barcodes with the AI camera, or add products manually to build your catalog.'
                : 'Try adjusting your search keywords, category, or status filter.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product Manually</span>
            </button>
            {onOpenScanner && (
              <button
                type="button"
                onClick={onOpenScanner}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-2xs"
              >
                <Barcode className="w-3.5 h-3.5 text-indigo-400" />
                <span>Open AI Scanner</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((item) => {
            const stock = item.stockQuantity ?? (parseInt(item.quantity || '1', 10) || 1);
            const isLow = item.status === 'low_stock';
            const isExpiring = item.status === 'expiring_soon' || item.status === 'expired';
            const isOut = item.status === 'out_of_stock' || stock <= 0;

            return (
              <div
                key={item.id}
                onClick={() => setViewingProduct(item)}
                className="bg-white border border-slate-200 rounded-2xl p-4.5 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative"
              >
                {/* Card Top: Brand, Category, Status Badge */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.brand && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {item.brand}
                        </span>
                      )}
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-200/60">
                        {item.category || 'General Goods'}
                      </span>
                    </div>

                    {/* Status Badge */}
                    {isOut ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        Out of Stock
                      </span>
                    ) : isExpiring ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <Clock className="w-3 h-3" />
                        {item.status === 'expired' ? 'Expired' : 'Expiring Soon'}
                      </span>
                    ) : isLow ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle className="w-3 h-3" />
                        Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        In Stock
                      </span>
                    )}
                  </div>

                  {/* Thumbnail & Title */}
                  <div className="flex items-start gap-3 my-2">
                    {item.imageThumbnail ? (
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        <img
                          src={item.imageThumbnail}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
                        {item.productName}
                      </h4>
                      {item.sku && (
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          SKU: {item.sku}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Barcode & Batch Pills */}
                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600 mt-2">
                    {item.barcode && (
                      <span className="inline-flex items-center gap-1 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80">
                        <Barcode className="w-3 h-3 text-slate-400" />
                        {item.barcode}
                      </span>
                    )}
                    {item.batchNumber && (
                      <span className="inline-flex items-center gap-1 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80">
                        Batch: {item.batchNumber}
                      </span>
                    )}
                  </div>

                  {/* Dates & Location */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Expiry / Best Before:</span>
                      <span className={`font-semibold ${isExpiring ? 'text-rose-600' : 'text-slate-700'}`}>
                        {item.expiryDate || item.bestBefore || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Location / Aisle:</span>
                      <span className="font-semibold text-slate-700 truncate block">
                        {item.rackLocation || 'General Floor'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Price, Stock Counter & Quick Controls */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Price / MRP
                    </div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {item.sellingPrice || item.mrp || '—'}
                    </div>
                  </div>

                  {/* Quick Stock Adjust Buttons */}
                  <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={(e) => handleStockDelta(item.id, -1, e)}
                      disabled={stock <= 0}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-white hover:bg-slate-200 text-slate-700 disabled:opacity-30 transition-colors shadow-2xs font-bold text-xs"
                      title="Decrease stock count by 1"
                    >
                      -
                    </button>
                    <div className="px-2 font-bold text-xs text-slate-900 min-w-[2.5rem] text-center">
                      {stock} <span className="text-[10px] font-normal text-slate-500">{item.unit || 'units'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleStockDelta(item.id, 1, e)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-white hover:bg-slate-200 text-slate-700 transition-colors shadow-2xs font-bold text-xs"
                      title="Increase stock count by 1"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          MODAL: ADD MANUAL PRODUCT
         ===================================================================== */}
      {isAddModalOpen && (
        <AddProductModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSaved={() => {
            setIsAddModalOpen(false);
            onRefresh();
          }}
        />
      )}

      {/* =====================================================================
          MODAL: EDIT CATALOG PRODUCT
         ===================================================================== */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          isOpen={Boolean(editingProduct)}
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            setEditingProduct(null);
            onRefresh();
          }}
        />
      )}

      {/* =====================================================================
          MODAL: VIEW PRODUCT DETAILS DRAWER
         ===================================================================== */}
      {viewingProduct && (
        <ViewProductDetailsModal
          product={viewingProduct}
          isOpen={Boolean(viewingProduct)}
          onClose={() => setViewingProduct(null)}
          onEdit={() => {
            setEditingProduct(viewingProduct);
            setViewingProduct(null);
          }}
          onDelete={() => handleDelete(viewingProduct.id)}
          onLoadIntoForm={() => {
            if (onLoadIntoForm) onLoadIntoForm(viewingProduct);
            setViewingProduct(null);
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// SUB-COMPONENT: ADD PRODUCT MODAL
// ============================================================================
interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [formData, setFormData] = useState<Partial<CatalogProduct>>({
    productName: '',
    brand: '',
    category: 'Beverages & Coffee',
    sku: '',
    barcode: '',
    batchNumber: '',
    manufacturingDate: '',
    expiryDate: '',
    bestBefore: '',
    stockQuantity: 10,
    unit: 'units',
    mrp: '$',
    sellingPrice: '$',
    purchasePrice: '$',
    minStockAlert: 5,
    supplier: '',
    rackLocation: '',
    notes: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName?.trim()) return;
    saveManualCatalogProduct(formData);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Add Product to Catalog</h3>
              <p className="text-xs text-slate-500">Enter product details, pricing, and stock specifications</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Product Name */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.productName}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              placeholder="e.g. Organic Arabica Whole Bean Coffee 500g"
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Brand */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Brand / Manufacturer</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g. Highland Artisan Roasters"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Beverages & Coffee"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* SKU */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">SKU / Item Code</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="SKU-COF-001"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>

            {/* Barcode */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Barcode (UPC / EAN)</label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="084729103958"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>

            {/* Batch / LOT */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Batch / LOT No.</label>
              <input
                type="text"
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                placeholder="LOT-2025-01"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>
          </div>

          {/* Pricing & Stock Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Initial Stock Qty</label>
              <input
                type="number"
                min="0"
                value={formData.stockQuantity}
                onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Unit</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="pcs, bags, kg"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Selling Price / MRP</label>
              <input
                type="text"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value, mrp: e.target.value })}
                placeholder="$19.99"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Min Stock Alert</label>
              <input
                type="number"
                min="1"
                value={formData.minStockAlert}
                onChange={(e) => setFormData({ ...formData, minStockAlert: parseInt(e.target.value, 10) || 5 })}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>
          </div>

          {/* Dates & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Manufacturing Date</label>
              <input
                type="date"
                value={formData.manufacturingDate}
                onChange={(e) => setFormData({ ...formData, manufacturingDate: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Rack / Shelf Location</label>
              <input
                type="text"
                value={formData.rackLocation}
                onChange={(e) => setFormData({ ...formData, rackLocation: e.target.value })}
                placeholder="Aisle 4, Shelf B"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Notes / Description</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add internal warehouse notes, supplier contact, or handling instructions..."
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs"
            >
              Save to Catalog
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENT: EDIT PRODUCT MODAL
// ============================================================================
interface EditProductModalProps {
  product: SavedInventoryItem;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [formData, setFormData] = useState<SavedInventoryItem>({ ...product });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCatalogProduct(product.id, formData);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Edit Catalog Product</h3>
              <p className="text-xs text-slate-500">Update specifications and stock counts</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Product Name</label>
            <input
              type="text"
              required
              value={formData.productName}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Brand</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">SKU</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Barcode</label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Batch Number</label>
              <input
                type="text"
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
              />
            </div>
          </div>

          {/* Pricing & Stock */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Stock Qty</label>
              <input
                type="number"
                min="0"
                value={formData.stockQuantity ?? (parseInt(formData.quantity || '0', 10) || 0)}
                onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Unit</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Price / MRP</label>
              <input
                type="text"
                value={formData.sellingPrice || formData.mrp}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value, mrp: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Min Stock Alert</label>
              <input
                type="number"
                min="1"
                value={formData.minStockAlert ?? 5}
                onChange={(e) => setFormData({ ...formData, minStockAlert: parseInt(e.target.value, 10) || 5 })}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">MFG Date</label>
              <input
                type="date"
                value={formData.manufacturingDate}
                onChange={(e) => setFormData({ ...formData, manufacturingDate: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Rack Location</label>
              <input
                type="text"
                value={formData.rackLocation || ''}
                onChange={(e) => setFormData({ ...formData, rackLocation: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENT: VIEW PRODUCT DETAILS DRAWER
// ============================================================================
interface ViewProductDetailsModalProps {
  product: SavedInventoryItem;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLoadIntoForm: () => void;
}

const ViewProductDetailsModal: React.FC<ViewProductDetailsModalProps> = ({
  product,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onLoadIntoForm,
}) => {
  if (!isOpen) return null;

  const stock = product.stockQuantity ?? (parseInt(product.quantity || '1', 10) || 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Product Specifications</h3>
              <p className="text-xs text-slate-500">ID: {product.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* Top Banner */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            {product.imageThumbnail ? (
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-200">
                <img
                  src={product.imageThumbnail}
                  alt={product.productName}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                <Package className="w-8 h-8" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {product.brand && (
                  <span className="font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 text-[11px]">
                    {product.brand}
                  </span>
                )}
                <span className="font-medium px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 text-[11px]">
                  {product.category}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">{product.productName}</h3>
              <div className="flex items-center gap-3 text-slate-500 text-[11px] mt-1">
                <span>SKU: <strong className="font-mono text-slate-700">{product.sku || 'N/A'}</strong></span>
                <span>•</span>
                <span>Barcode: <strong className="font-mono text-slate-700">{product.barcode || 'N/A'}</strong></span>
              </div>
            </div>
          </div>

          {/* Pricing & Stock Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-400 block font-semibold">Current Stock</span>
              <span className="text-lg font-bold text-slate-900">{stock} {product.unit || 'units'}</span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-400 block font-semibold">Selling Price / MRP</span>
              <span className="text-lg font-bold text-emerald-700">{product.sellingPrice || product.mrp || '—'}</span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-400 block font-semibold">Min Stock Alert</span>
              <span className="text-lg font-bold text-slate-900">{product.minStockAlert ?? 5} units</span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-400 block font-semibold">Location</span>
              <span className="text-lg font-bold text-slate-900 truncate block">{product.rackLocation || 'Floor'}</span>
            </div>
          </div>

          {/* Manufacturing & Expiry Specs */}
          <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Batch &amp; Lifecycle Timeline
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <span className="text-slate-400 text-[11px] block">Batch / LOT No:</span>
                <span className="font-mono font-bold text-slate-800">{product.batchNumber || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Manufacturing Date:</span>
                <span className="font-semibold text-slate-800">{product.manufacturingDate || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Expiry / Best Before:</span>
                <span className="font-semibold text-slate-800">{product.expiryDate || product.bestBefore || '—'}</span>
              </div>
            </div>
          </div>

          {/* Notes or Additional Metadata */}
          {product.notes && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-700 block">Internal Notes:</span>
              <p className="text-slate-600 leading-relaxed">{product.notes}</p>
            </div>
          )}

          {/* Audit Timestamp */}
          <div className="text-[11px] text-slate-400 text-right">
            Added to catalog: {new Date(product.savedAt).toLocaleString()}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Product
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLoadIntoForm}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Load into Scanner
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
