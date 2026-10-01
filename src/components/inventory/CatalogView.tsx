/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Search, Package, Plus, ChevronRight } from 'lucide-react';
import { SavedInventoryItem } from '../../types';
import { getProducts, subscribeToStore } from '../../utils/unifiedDataStore';

interface CatalogViewProps {
  onAddProduct?: () => void;
  onSelectProduct?: (product: SavedInventoryItem) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({ onAddProduct, onSelectProduct }) => {
  const [products, setProducts] = useState<SavedInventoryItem[]>(getProducts());
  const [search, setSearch] = useState('');

  useEffect(() => subscribeToStore(() => setProducts(getProducts())), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.productName, p.brand, p.category, p.barcode, p.sku].some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [products, search]);

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-24">
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#1473EA]/10 text-[#1473EA] flex items-center justify-center"><BookOpen className="w-5 h-5" /></div>
            <div><h1 className="text-xl font-black text-slate-900">Product Catalog</h1><p className="text-xs text-slate-500">Your saved products in one place</p></div>
          </div>
          {onAddProduct && <button type="button" onClick={onAddProduct} className="h-10 px-3 rounded-xl bg-[#1473EA] text-white text-xs font-bold flex items-center gap-1.5"><Plus className="w-4 h-4" />Add</button>}
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search saved products..." className="w-full h-11 pl-9 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:bg-white focus:border-[#1473EA]" />
        </div>
      </div>

      <div className="flex items-center justify-between px-1"><p className="text-xs font-bold text-slate-500">{filtered.length} saved product{filtered.length === 1 ? '' : 's'}</p>{search && <button type="button" onClick={() => setSearch('')} className="text-xs font-bold text-[#1473EA]">Clear</button>}</div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-10 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center"><Package className="w-7 h-7 text-slate-400" /></div>
          <h2 className="mt-4 font-black text-slate-800">No saved products</h2>
          <p className="mt-1 text-xs text-slate-500">Scan or add a product and it will appear here automatically.</p>
          {onAddProduct && <button type="button" onClick={onAddProduct} className="mt-4 h-10 px-4 rounded-xl bg-[#1473EA] text-white text-xs font-bold">+ Add Product</button>}
        </div>
      ) : (
        <div className="grid gap-2.5">
          {filtered.map((p) => (
            <button key={p.id} type="button" onClick={() => onSelectProduct?.(p)} className="w-full text-left bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm active:scale-[.99] transition-transform">
              <div className="w-14 h-14 shrink-0 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center">
                {p.imageThumbnail ? <img src={p.imageThumbnail} alt="" className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-slate-400" />}
              </div>
              <div className="min-w-0 flex-1"><h3 className="text-sm font-black text-slate-800 truncate">{p.productName || 'Unnamed product'}</h3><p className="text-[11px] text-slate-500 truncate">{[p.brand, p.category].filter(Boolean).join(' · ') || 'Saved product'}</p><div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-semibold"><span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Stock: {p.stockQuantity ?? 0}</span>{p.expiryDate && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">EXD: {p.expiryDate}</span>}{p.sellingPrice && <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{p.currency || 'NPR'} {p.sellingPrice}</span>}</div></div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
