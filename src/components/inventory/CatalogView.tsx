/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Search, Package, Plus, ChevronRight, ShoppingCart, Share2, Users, Store, Megaphone, Facebook, Send } from 'lucide-react';
import { SavedInventoryItem } from '../../types';
import { getProducts, subscribeToStore } from '../../utils/unifiedDataStore';

interface CatalogViewProps {
  onAddProduct?: () => void;
  onSelectProduct?: (product: SavedInventoryItem) => void;
  onSellProduct?: (product: SavedInventoryItem) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({ onAddProduct, onSelectProduct, onSellProduct }) => {
  const [products, setProducts] = useState<SavedInventoryItem[]>(getProducts());
  const [search, setSearch] = useState('');

  useEffect(() => subscribeToStore(() => setProducts(getProducts())), []);

  const shareProduct = async (p: SavedInventoryItem) => {
    const text = [p.productName, p.brand, p.category, p.sellingPrice ? `Price: ${p.currency || 'NPR'} ${p.sellingPrice}` : '', p.stockQuantity != null ? `Stock: ${p.stockQuantity}` : '', p.expiryDate ? `Expiry: ${p.expiryDate}` : ''].filter(Boolean).join(' | ');
    if (navigator.share) await navigator.share({ title: p.productName || 'Product', text });
    else await navigator.clipboard?.writeText(text);
  };

  const openWhatsApp = (message: string) => window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');

  const socialShare = (platform: 'facebook' | 'tiktok' | 'whatsapp', p: SavedInventoryItem) => {
    const text = [p.productName, p.brand, p.category, p.sellingPrice ? `Price: ${p.currency || 'NPR'} ${p.sellingPrice}` : '', p.expiryDate ? `Expiry: ${p.expiryDate}` : ''].filter(Boolean).join(' | ');
    const url = window.location.href;
    if (platform === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    else if (platform === 'tiktok') navigator.share ? navigator.share({ title: p.productName || 'Product', text, url }) : navigator.clipboard?.writeText(text + ' ' + url);
    else openWhatsApp(text);
  };

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
            <div key={p.id} className="w-full bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 shrink-0 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center">
                  {p.imageThumbnail ? <img src={p.imageThumbnail} alt="" className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-slate-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-black text-slate-800 truncate">{p.productName || 'Unnamed product'}</h3>
                  <p className="text-[11px] text-slate-500 truncate">{[p.brand, p.category].filter(Boolean).join(' · ') || 'Saved product'}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Stock: {p.stockQuantity ?? 0}</span>
                    {p.expiryDate && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">EXD: {p.expiryDate}</span>}
                    {p.sellingPrice && <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{p.currency || 'NPR'} {p.sellingPrice}</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button type="button" onClick={() => onSellProduct?.(p)} className="h-9 rounded-xl bg-[#1473EA] text-white text-[10px] font-bold flex items-center justify-center gap-1"><ShoppingCart className="w-3.5 h-3.5" />Sell</button>
                <button type="button" onClick={() => shareProduct(p)} className="h-9 rounded-xl bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center gap-1"><Share2 className="w-3.5 h-3.5" />Share</button>
                <button type="button" onClick={() => socialShare('facebook', p)} className="h-9 rounded-xl bg-blue-50 text-blue-700 text-[10px] font-bold flex items-center justify-center gap-1"><Facebook className="w-3.5 h-3.5" />Facebook</button>
                <button type="button" onClick={() => socialShare('tiktok', p)} className="h-9 rounded-xl bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center gap-1"><Send className="w-3.5 h-3.5" />TikTok</button>
                <button type="button" onClick={() => socialShare('whatsapp', p)} className="h-9 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center justify-center gap-1"><Users className="w-3.5 h-3.5" />WhatsApp</button>
                <button type="button" onClick={() => openWhatsApp("Hello, please see our product: " + (p.productName || "Product") + (p.sellingPrice ? " - " + (p.currency || "NPR") + " " + p.sellingPrice : ""))} className="h-9 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center justify-center gap-1"><Users className="w-3.5 h-3.5" />Contact</button>
                <button type="button" onClick={() => openWhatsApp("Store information: Please contact our store for products, stock and prices.")} className="h-9 rounded-xl bg-amber-50 text-amber-700 text-[10px] font-bold flex items-center justify-center gap-1"><Store className="w-3.5 h-3.5" />Store Info</button>
                <button type="button" onClick={() => openWhatsApp("🔥 New offer! " + (p.productName || "Product") + (p.sellingPrice ? " now at " + (p.currency || "NPR") + " " + p.sellingPrice : "") + ". Contact our store for details.")} className="h-9 rounded-xl bg-rose-50 text-rose-700 text-[10px] font-bold flex items-center justify-center gap-1"><Megaphone className="w-3.5 h-3.5" />Offer</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
