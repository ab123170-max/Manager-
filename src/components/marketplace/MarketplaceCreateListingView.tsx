/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Share2,
  Package,
  Sparkles,
  Facebook,
  MessageCircle,
  Tag,
  MapPin,
  Phone,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Store,
} from 'lucide-react';
import {
  MarketplaceListing,
  SavedInventoryItem,
  MarketplaceSubView,
} from '../../types';
import {
  getProducts,
  saveMarketplaceListing,
  getAppSettings,
  subscribeToStore,
} from '../../utils/unifiedDataStore';

interface MarketplaceCreateListingViewProps {
  onNavigateSubView: (view: MarketplaceSubView) => void;
  preselectedProductId?: string;
}

export const MarketplaceCreateListingView: React.FC<MarketplaceCreateListingViewProps> = ({
  onNavigateSubView,
  preselectedProductId,
}) => {
  const [products, setProducts] = useState<SavedInventoryItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState(preselectedProductId || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [discountPrice, setDiscountPrice] = useState<number | undefined>(undefined);
  const [category, setCategory] = useState('General Goods');
  const [listingQty, setListingQty] = useState<number>(1);
  const [tags, setTags] = useState<string>('deal, authentic, instock');
  const [contactNumber, setContactNumber] = useState('');
  const [shopLocation, setShopLocation] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState('Store pickup or local delivery available within 24 hours.');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['facebook', 'whatsapp', 'tiktok']);
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const load = () => {
      const prods = getProducts();
      setProducts(prods);
      const settings = getAppSettings();
      if (settings.contactPhone) setContactNumber(settings.contactPhone);
      if (settings.pickupLocation) setShopLocation(settings.pickupLocation);

      if (preselectedProductId) {
        const match = prods.find((p) => p.id === preselectedProductId);
        if (match) {
          populateFromProduct(match);
        }
      }
    };
    load();
    return subscribeToStore(load);
  }, [preselectedProductId]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId);
  }, [products, selectedProductId]);

  const populateFromProduct = (prod: SavedInventoryItem) => {
    setSelectedProductId(prod.id);
    setTitle(`${prod.brand ? `${prod.brand} ` : ''}${prod.productName}`);
    const priceNum = parseFloat(prod.sellingPrice?.replace(/[^0-9.]/g, '') || prod.mrp?.replace(/[^0-9.]/g, '') || '0') || 0;
    setSellingPrice(priceNum);
    setCategory(prod.category || 'General Goods');
    const available = Math.max(1, (prod.stockQuantity || 0) - (prod.reservedStock || 0));
    setListingQty(available);

    const desc = `🔥 ${prod.productName}${prod.brand ? ` by ${prod.brand}` : ''}\n\n` +
      `✅ Condition: Brand New, Authentic Stock\n` +
      `📦 Category: ${prod.category || 'General'}\n` +
      (prod.expiryDate ? `📅 Best Before / Expiry: ${prod.expiryDate}\n` : '') +
      (prod.rackLocation ? `📍 Store Rack / Loc: ${prod.rackLocation}\n` : '') +
      `\n💬 Message or call to reserve your order for local store pickup or rapid delivery!`;

    setDescription(desc);

    const generatedTags = [
      prod.brand?.toLowerCase().replace(/\s+/g, ''),
      prod.category?.toLowerCase().replace(/\s+/g, ''),
      'instock',
      'specialdeal',
      'authentic',
    ].filter(Boolean) as string[];

    setTags(generatedTags.join(', '));
  };

  const handleProductSelectChange = (id: string) => {
    const prod = products.find((p) => p.id === id);
    if (prod) {
      populateFromProduct(prod);
    } else {
      setSelectedProductId('');
    }
  };

  const toggleChannel = (channel: string) => {
    if (selectedChannels.includes(channel)) {
      if (selectedChannels.length > 1) {
        setSelectedChannels(selectedChannels.filter((c) => c !== channel));
      }
    } else {
      setSelectedChannels([...selectedChannels, channel]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedProductId) {
      setErrorMsg('Please select an existing inventory product.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Listing title is required.');
      return;
    }
    if (sellingPrice <= 0) {
      setErrorMsg('Selling price must be greater than 0.');
      return;
    }

    const tagArray = tags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter((t) => t.length > 0);

    const newListing = saveMarketplaceListing({
      productId: selectedProductId,
      title: title.trim(),
      description: description.trim(),
      sellingPrice,
      discountPrice: discountPrice && discountPrice > 0 ? discountPrice : undefined,
      availableQuantity: listingQty,
      category,
      tags: tagArray,
      contactNumber: contactNumber.trim(),
      shopLocation: shopLocation.trim(),
      deliveryInfo: deliveryInfo.trim(),
      channels: selectedChannels,
      status,
      productImages: selectedProduct?.imageThumbnail ? [selectedProduct.imageThumbnail] : [],
    });

    setSuccessMsg(`Marketplace listing for "${newListing.title}" created successfully!`);
    setTimeout(() => {
      onNavigateSubView('listings');
    }, 1200);
  };

  return (
    <div id="marketplace-create-listing-container" className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateSubView('listings')}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Create Marketplace Listing</h2>
            <p className="text-xs text-slate-500">
              Select an existing inventory product to sell across Facebook, WhatsApp, and TikTok
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Product Selection from Inventory */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              1. Select Inventory Product *
            </label>
            <p className="text-xs text-slate-500 mb-2">
              The marketplace connects directly to your inventory database. Choose a product to auto-fill details:
            </p>
            <select
              id="select-listing-product"
              value={selectedProductId}
              onChange={(e) => handleProductSelectChange(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Choose from Catalog --</option>
              {products.map((p) => {
                const avail = (p.stockQuantity || 0) - (p.reservedStock || 0);
                return (
                  <option key={p.id} value={p.id}>
                    {p.productName} — Available Stock: {avail} {p.unit || 'units'} (Physical: {p.stockQuantity}, Reserved: {p.reservedStock || 0}) • Price: {p.sellingPrice || p.mrp || '$0.00'}
                  </option>
                );
              })}
            </select>
          </div>

          {selectedProduct && (
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs text-indigo-700 font-semibold">Selected Product Status</div>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{selectedProduct.productName}</div>
                <div className="text-xs text-slate-500">
                  Physical Stock: {selectedProduct.stockQuantity} • Reserved: {selectedProduct.reservedStock || 0} • Available to Sell: <span className="font-bold text-emerald-700">{Math.max(0, (selectedProduct.stockQuantity || 0) - (selectedProduct.reservedStock || 0))}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-slate-500">
                  {selectedProduct.sku ? `SKU: ${selectedProduct.sku}` : `Barcode: ${selectedProduct.barcode || 'N/A'}`}
                </span>
              </div>
            </div>
          )}

          {/* Section 2: Listing Information */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              2. Listing Title & Pricing
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Listing Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Catchy product title for social media posts..."
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Selling Price ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={sellingPrice || ''}
                  onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Discounted / Promo Price ($) (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountPrice ?? ''}
                  onChange={(e) => setDiscountPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="e.g. 19.99"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity Offered for Listing *
                </label>
                <input
                  type="number"
                  min="1"
                  value={listingQty}
                  onChange={(e) => setListingQty(parseInt(e.target.value, 10) || 1)}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description & Social Copy *
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Product highlights, benefits, expiry dates, pickup details..."
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hashtags / Search Tags (Comma separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="deal, authentic, instock, coffee"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Section 3: Channels & Store Contact */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              3. Selling Channels & Store Info
            </h3>

            {/* Channels toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Active Channels
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => toggleChannel('facebook')}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                    selectedChannels.includes('facebook')
                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  <Facebook className="w-4 h-4" />
                  Facebook Marketplace
                </button>

                <button
                  type="button"
                  onClick={() => toggleChannel('whatsapp')}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                    selectedChannels.includes('whatsapp')
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp Selling
                </button>

                <button
                  type="button"
                  onClick={() => toggleChannel('tiktok')}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                    selectedChannels.includes('tiktok')
                      ? 'bg-slate-900 text-pink-400 border-slate-900'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  TikTok Shop
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact / WhatsApp Number
                </label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+1 (555) 234-5678"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Shop Pickup Location
                </label>
                <input
                  type="text"
                  value={shopLocation}
                  onChange={(e) => setShopLocation(e.target.value)}
                  placeholder="Main Store, Aisle 2 • Downtown"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Delivery & Pickup Terms
              </label>
              <input
                type="text"
                value={deliveryInfo}
                onChange={(e) => setDeliveryInfo(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Publication Status
              </label>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="published"
                    checked={status === 'published'}
                    onChange={() => setStatus('published')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Published (Live & Ready to Share)</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="draft"
                    checked={status === 'draft'}
                    onChange={() => setStatus('draft')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Draft Only</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onNavigateSubView('listings')}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
              Save & Publish Listing
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
