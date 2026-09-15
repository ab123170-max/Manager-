/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Package,
  Search,
  Download,
  Trash2,
  X,
  AlertTriangle,
  Calendar,
  DollarSign,
  Layers,
  Hash,
  Barcode,
} from 'lucide-react';
import { SavedInventoryItem } from '../types';
import {
  deleteProductFromInventory,
  exportInventoryJson,
} from '../utils/inventoryStore';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: SavedInventoryItem[];
  onRefresh: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  items,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredItems = items.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.productName.toLowerCase().includes(term) ||
      item.brand.toLowerCase().includes(term) ||
      item.sku.toLowerCase().includes(term) ||
      item.barcode.toLowerCase().includes(term) ||
      item.batchNumber.toLowerCase().includes(term)
    );
  });

  const handleDelete = (id: string) => {
    deleteProductFromInventory(id);
    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Product Inventory ({items.length} {items.length === 1 ? 'item' : 'items'})
              </h3>
              <p className="text-xs text-slate-500">
                Saved products extracted and verified via Gemini 3.8 Vision Supervisor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportInventoryJson}
              disabled={items.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Product Name, SKU, Barcode, Batch Number, or Brand..."
              className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-500 hover:text-slate-900 font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Inventory Item List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Package className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">
                {items.length === 0
                  ? 'No saved products in inventory yet.'
                  : 'No items match your search filter.'}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {items.length === 0
                  ? 'Scan a product label or box with the camera, review the auto-filled fields, and click "Save Product to Inventory".'
                  : 'Try searching with a different SKU, name, or barcode.'}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">
                        {item.productName}
                      </h4>
                      {item.brand && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {item.brand}
                        </span>
                      )}
                      {item.category && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Saved {new Date(item.savedAt).toLocaleString()}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold flex items-center gap-1">
                      <Hash className="w-3 h-3" /> SKU
                    </span>
                    <span className="font-mono font-semibold text-slate-800 truncate block">
                      {item.sku || 'N/A'}
                    </span>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold flex items-center gap-1">
                      <Barcode className="w-3 h-3" /> Barcode
                    </span>
                    <span className="font-mono font-semibold text-slate-800 truncate block">
                      {item.barcode || 'N/A'}
                    </span>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Batch / Lot
                    </span>
                    <span className="font-mono font-semibold text-slate-800 truncate block">
                      {item.batchNumber || 'N/A'}
                    </span>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Expiry / Best Before
                    </span>
                    <span className="font-semibold text-rose-700 truncate block">
                      {item.expiryDate || item.bestBefore || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Additional row */}
                <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2">
                  <div className="flex items-center gap-4">
                    {item.quantity && (
                      <span>
                        <strong className="text-slate-900">Qty:</strong>{' '}
                        {item.quantity} {item.unit}
                      </span>
                    )}
                    {item.mrp && (
                      <span className="flex items-center gap-0.5 text-emerald-700 font-bold">
                        <DollarSign className="w-3 h-3" />
                        {item.mrp}
                      </span>
                    )}
                  </div>

                  {item.warnings.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-md">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      {item.warnings.length} warning(s)
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
