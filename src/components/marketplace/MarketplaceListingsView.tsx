/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Share2,
  PlusCircle,
  Search,
  Filter,
  Trash2,
  Edit,
  ExternalLink,
  MessageCircle,
  Facebook,
  Sparkles,
  Package,
  Layers,
  Copy,
  Check,
  Tag,
  MapPin,
  Phone,
  Eye,
  ShoppingBag,
} from 'lucide-react';
import {
  MarketplaceListing,
  SavedInventoryItem,
  MarketplaceSubView,
} from '../../types';
import {
  getMarketplaceListings,
  getProducts,
  deleteMarketplaceListing,
  updateMarketplaceListing,
  subscribeToStore,
} from '../../utils/unifiedDataStore';

interface MarketplaceListingsViewProps {
  onNavigateSubView: (view: MarketplaceSubView) => void;
  onEditListing?: (listing: MarketplaceListing) => void;
  onSelectProductForListing?: (productId: string) => void;
  onOpenSocialHubForProduct?: (productId: string, channel: 'facebook' | 'whatsapp' | 'tiktok') => void;
}

export const MarketplaceListingsView: React.FC<MarketplaceListingsViewProps> = ({
  onNavigateSubView,
  onEditListing,
  onOpenSocialHubForProduct,
}) => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [products, setProducts] = useState<SavedInventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      setListings(getMarketplaceListings());
      setProducts(getProducts());
    };
    load();
    return subscribeToStore(load);
  }, []);

  const productMap = useMemo(() => {
    const map = new Map<string, SavedInventoryItem>();
    for (const p of products) {
      map.set(p.id, p);
    }
    return map;
  }, [products]);

  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = l.title.toLowerCase().includes(q);
        const matchDesc = l.description.toLowerCase().includes(q);
        const matchTag = l.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchTag) return false;
      }
      return true;
    });
  }, [listings, statusFilter, searchTerm]);

  const handleCopyText = (listing: MarketplaceListing) => {
    const text = `🔥 ${listing.title}\n💰 Price: $${listing.sellingPrice.toFixed(2)}${listing.discountPrice ? ` (Special offer: $${listing.discountPrice.toFixed(2)})` : ''}\n📍 Location: ${listing.shopLocation || 'Storefront Pickup'}\n📞 Contact: ${listing.contactNumber || 'Message directly'}\n\n${listing.description}\n\n${listing.tags ? listing.tags.map((t) => `#${t}`).join(' ') : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedId(listing.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleStatus = (listing: MarketplaceListing) => {
    const newStatus = listing.status === 'published' ? 'draft' : 'published';
    updateMarketplaceListing(listing.id, { status: newStatus });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to remove this marketplace listing? (Your physical inventory will remain intact)')) {
      deleteMarketplaceListing(id);
    }
  };

  return (
    <div id="marketplace-listings-container" className="space-y-6">
      {/* Top Header & Actions */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Product Marketplace Listings</h2>
          <p className="text-xs text-slate-500">
            Publish products to Facebook Marketplace, WhatsApp catalogs, and TikTok channels with real-time stock sync
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-create-new-listing"
            onClick={() => onNavigateSubView('create_listing')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            + New Listing
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-listings"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search listings by title, tags, or description..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses ({listings.length})</option>
              <option value="published">Published Live</option>
              <option value="draft">Draft Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredListings.length === 0 ? (
          <div className="col-span-full py-12 bg-white rounded-xl border border-slate-200 text-center p-6">
            <Share2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Marketplace Listings Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Select existing inventory items to create optimized listings for Facebook Marketplace, WhatsApp, and TikTok.
            </p>
            <button
              onClick={() => onNavigateSubView('create_listing')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Create First Listing
            </button>
          </div>
        ) : (
          filteredListings.map((listing) => {
            const product = productMap.get(listing.productId);
            const physicalStock = product?.stockQuantity || 0;
            const reservedStock = product?.reservedStock || 0;
            const availableStock = Math.max(0, physicalStock - reservedStock);

            return (
              <div
                key={listing.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          listing.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {listing.status}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        {listing.category || 'General'}
                      </span>
                    </div>

                    {/* Stock indicator badge */}
                    <div className="text-right">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          availableStock > 5
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : availableStock > 0
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {availableStock} Available
                      </span>
                      {reservedStock > 0 && (
                        <div className="text-[10px] text-amber-600 font-medium mt-0.5">
                          ({reservedStock} reserved in orders)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title & Price */}
                  <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
                    {listing.title}
                  </h3>

                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-xl font-black text-slate-900">
                      ${listing.sellingPrice.toFixed(2)}
                    </span>
                    {listing.discountPrice && (
                      <span className="text-xs font-medium text-slate-400 line-through">
                        ${listing.discountPrice.toFixed(2)}
                      </span>
                    )}
                    {product?.sku && (
                      <span className="text-xs text-slate-400 font-mono ml-auto">
                        SKU: {product.sku}
                      </span>
                    )}
                  </div>

                  {/* Description preview */}
                  <p className="text-xs text-slate-600 mt-3 line-clamp-3 leading-relaxed">
                    {listing.description}
                  </p>

                  {/* Tags */}
                  {listing.tags && listing.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {listing.tags.slice(0, 4).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                      {listing.tags.length > 4 && (
                        <span className="text-[10px] text-slate-400 self-center">
                          +{listing.tags.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Location & Contact Ribbon */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 truncate max-w-[200px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{listing.shopLocation || 'Store Pickup'}</span>
                    </span>
                    {listing.viewsCount !== undefined && (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>{listing.viewsCount} views</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Social Quick-Share Action Bar */}
                <div className="bg-slate-50 p-3 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {/* Share to FB */}
                    <button
                      onClick={() =>
                        onOpenSocialHubForProduct?.(listing.productId, 'facebook') ||
                        onNavigateSubView('social_channels')
                      }
                      title="Generate Facebook Marketplace Copy"
                      className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors border border-blue-200"
                    >
                      <Facebook className="w-4 h-4" />
                    </button>

                    {/* Share to WhatsApp */}
                    <button
                      onClick={() =>
                        onOpenSocialHubForProduct?.(listing.productId, 'whatsapp') ||
                        onNavigateSubView('social_channels')
                      }
                      title="Share to WhatsApp Catalog"
                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors border border-emerald-200"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>

                    {/* Share to TikTok */}
                    <button
                      onClick={() =>
                        onOpenSocialHubForProduct?.(listing.productId, 'tiktok') ||
                        onNavigateSubView('social_channels')
                      }
                      title="Generate TikTok Video Script"
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 text-pink-400 rounded-lg transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>

                    {/* Copy Text */}
                    <button
                      onClick={() => handleCopyText(listing)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors"
                    >
                      {copiedId === listing.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy Post</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleStatus(listing)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1"
                    >
                      {listing.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => handleDelete(listing.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Delete Listing"
                    >
                      <Trash2 className="w-4 h-4" />
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
