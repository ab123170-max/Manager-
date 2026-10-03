/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  Boxes,
  Clock,
  AlertTriangle,
  ChevronRight,
  Edit,
  ArrowDownLeft,
  ArrowUpRight,
  FileSpreadsheet,
  Tag,
  Barcode,
} from 'lucide-react';
import { SavedInventoryItem } from '../../types';

interface InventoryPageProps {
  products: SavedInventoryItem[];
  userCurrency?: string;
  onAddProduct: () => void;
  onEditProduct: (product: SavedInventoryItem) => void;
  onStockIn: (productId?: string) => void;
  onStockOut: (productId?: string) => void;
  onOpenGoogleSheets?: () => void;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({
  products,
  userCurrency = 'NPR',
  onAddProduct,
  onEditProduct,
  onStockIn,
  onStockOut,
  onOpenGoogleSheets,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'expiring' | 'expired' | 'low_stock'>('all');

  const currencySymbol = userCurrency === 'NPR' ? 'Rs. ' : '$';

  // Filter products based on search term & active filter chip
  const filteredProducts = products.filter((prod) => {
    // 1. Search filter
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      const matchName = prod.product_name?.toLowerCase().includes(term);
      const matchBarcode = prod.barcode?.toLowerCase().includes(term);
      const matchCategory = prod.category?.toLowerCase().includes(term);
      const matchBrand = prod.brand?.toLowerCase().includes(term);
      if (!matchName && !matchBarcode && !matchCategory && !matchBrand) return false;
    }

    // 2. Status filter
    if (filterMode === 'expiring') {
      if (!prod.expiry_date) return false;
      const days = Math.ceil(
        (new Date(prod.expiry_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
      );
      return days >= 0 && days <= 30;
    }

    if (filterMode === 'expired') {
      if (!prod.expiry_date) return false;
      return new Date(prod.expiry_date).getTime() < new Date().getTime();
    }

    if (filterMode === 'low_stock') {
      const currentQty = Number(prod.quantity) || prod.stockQuantity || 0;
      const alertLevel = Number(prod.minStockAlert) || prod.min_reorder_level || 5;
      return currentQty <= alertLevel;
    }

    return true;
  });

  return (
    <div className="space-y-4 font-sans text-slate-900 pb-2">
      {/* 1. Search Bar & Add Button */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, barcode, category…"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#1473EA]/30 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                Clear
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onAddProduct}
            className="px-3.5 py-2.5 rounded-xl bg-[#1473EA] hover:bg-blue-600 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-98 transition-all"
            id="inventory-add-product-btn"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Product</span>
          </button>
        </div>

        {/* 2. Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-[#092B4C] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All ({products.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('expiring')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              filterMode === 'expiring'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-900 border border-amber-200'
            }`}
          >
            Expiring Soon
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('expired')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              filterMode === 'expired'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            Expired
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('low_stock')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              filterMode === 'low_stock'
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-800 border border-slate-200'
            }`}
          >
            Low Stock
          </button>

          {onOpenGoogleSheets && (
            <button
              type="button"
              onClick={onOpenGoogleSheets}
              className="ml-auto px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sheets</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Product List */}
      <div className="space-y-2">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
            <Boxes className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-slate-800">No products found</h3>
              <p className="text-xs text-slate-500">
                {searchTerm
                  ? `No matching items for "${searchTerm}"`
                  : 'Your inventory catalog is currently empty.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onAddProduct}
              className="px-4 py-2 rounded-xl bg-[#1473EA] text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Product</span>
            </button>
          </div>
        ) : (
          filteredProducts.map((prod) => {
            const isExpired = prod.expiry_date
              ? new Date(prod.expiry_date).getTime() < new Date().getTime()
              : false;

            const daysRemaining = prod.expiry_date
              ? Math.ceil(
                  (new Date(prod.expiry_date).getTime() - new Date().getTime()) /
                    (1000 * 3600 * 24)
                )
              : null;

            return (
              <div
                key={prod.id}
                onClick={() => onEditProduct(prod)}
                className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs hover:border-[#1473EA] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-400">
                    {prod.image_url ? (
                      <img
                        src={prod.image_url}
                        alt={prod.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Boxes className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate group-hover:text-[#1473EA]">
                        {prod.product_name}
                      </h3>
                      {prod.barcode && (
                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                          {prod.barcode}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-600">
                      Stock: <strong className="font-bold text-slate-900">{prod.quantity || 1} {prod.unit || 'pcs'}</strong>
                      {prod.price && (
                        <span>
                          {' · Price: '}
                          <strong className="font-bold text-[#1473EA]">{currencySymbol}{prod.price}</strong>
                        </span>
                      )}
                    </p>

                    {prod.manufacturing_date && (
                      <p className="text-[10px] text-slate-400 truncate">
                        MFD: {prod.manufacturing_date}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right side actions & status badge */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* Status Badge */}
                  {isExpired ? (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                      EXPIRED
                    </span>
                  ) : daysRemaining !== null && daysRemaining <= 30 ? (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      {daysRemaining === 0 ? 'EXPIRES TODAY' : `${daysRemaining} days left`}
                    </span>
                  ) : prod.expiry_date ? (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      EXD: {prod.expiry_date}
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      No EXD
                    </span>
                  )}

                  {/* Stock In / Stock Out Quick Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStockIn(prod.id);
                      }}
                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                      title="Stock In"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStockOut(prod.id);
                      }}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                      title="Stock Out"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditProduct(prod);
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="Edit Product Details"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default InventoryPage;
