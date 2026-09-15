/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Facebook,
  MessageCircle,
  Sparkles,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Package,
  DollarSign,
  MapPin,
  Phone,
  Tag,
  Store,
  Layers,
  ShoppingBag,
  Send,
  Video,
  ArrowRight,
} from 'lucide-react';
import { SavedInventoryItem } from '../../types';
import { getProducts, getAppSettings, subscribeToStore } from '../../utils/unifiedDataStore';

interface SocialChannelsViewProps {
  initialChannel?: 'facebook' | 'whatsapp' | 'tiktok';
  initialProductId?: string;
  onRecordOrder?: (productId: string, channel: string) => void;
}

export const SocialChannelsView: React.FC<SocialChannelsViewProps> = ({
  initialChannel = 'facebook',
  initialProductId,
  onRecordOrder,
}) => {
  const [activeTab, setActiveTab] = useState<'facebook' | 'whatsapp' | 'tiktok'>(initialChannel);
  const [products, setProducts] = useState<SavedInventoryItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || '');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Settings
  const [phone, setPhone] = useState('+1 (555) 234-5678');
  const [location, setLocation] = useState('Metro City Main Branch, Shelf 2');
  const [storeName, setStoreName] = useState('Metro Express Mart');

  useEffect(() => {
    const load = () => {
      const prods = getProducts();
      setProducts(prods);
      const settings = getAppSettings();
      if (settings.contactPhone) setPhone(settings.contactPhone);
      if (settings.pickupLocation) setLocation(settings.pickupLocation);
      if (settings.storeName) setStoreName(settings.storeName);

      if (!selectedProductId && prods.length > 0) {
        setSelectedProductId(prods[0].id);
      }
    };
    load();
    return subscribeToStore(load);
  }, []);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || products[0];
  }, [products, selectedProductId]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 1. FACEBOOK GENERATED CONTENT
  const fbContent = useMemo(() => {
    if (!selectedProduct) return { title: '', price: 0, description: '', tags: '' };

    const priceNum = parseFloat(selectedProduct.sellingPrice?.replace(/[^0-9.]/g, '') || selectedProduct.mrp?.replace(/[^0-9.]/g, '') || '0') || 0;
    const title = `${selectedProduct.brand ? `${selectedProduct.brand} ` : ''}${selectedProduct.productName} (In Stock)`;

    const description = `🔥 ${selectedProduct.productName} — Available for Local Pickup & Fast Delivery!\n\n` +
      `📌 Condition: 100% Brand New, Authentic Stock\n` +
      `🏷️ Category: ${selectedProduct.category || 'General'}\n` +
      `📦 In Stock Quantity: ${selectedProduct.stockQuantity} ${selectedProduct.unit || 'units'}\n` +
      (selectedProduct.expiryDate ? `📅 Expiry Date / Best Before: ${selectedProduct.expiryDate}\n` : '') +
      (selectedProduct.rackLocation ? `📍 Store Shelf: ${selectedProduct.rackLocation}\n` : '') +
      `\n💵 Price: $${priceNum.toFixed(2)}\n` +
      `🏪 Pickup at: ${location}\n` +
      `📞 Contact via Messenger or Call: ${phone}\n\n` +
      `Send a direct message right now to confirm your order or arrange same-day delivery!`;

    const tags = `#${(selectedProduct.category || 'goods').toLowerCase().replace(/\s+/g, '')} #marketplace #sale #instock #localpickup`;

    return { title, price: priceNum, description, tags };
  }, [selectedProduct, location, phone]);

  // 2. WHATSAPP GENERATED CONTENT
  const waContent = useMemo(() => {
    if (!selectedProduct) return { broadcast: '', direct: '', shareUrl: '' };

    const priceNum = parseFloat(selectedProduct.sellingPrice?.replace(/[^0-9.]/g, '') || selectedProduct.mrp?.replace(/[^0-9.]/g, '') || '0') || 0;

    const broadcast = `*🌟 NEW ARRIVAL AT ${storeName.toUpperCase()} 🌟*\n\n` +
      `*Product:* ${selectedProduct.productName}\n` +
      (selectedProduct.brand ? `*Brand:* ${selectedProduct.brand}\n` : '') +
      `*Price:* *$${priceNum.toFixed(2)}*\n` +
      `*Stock Available:* ${selectedProduct.stockQuantity} ${selectedProduct.unit || 'units'}\n` +
      (selectedProduct.expiryDate ? `*Expiry Date:* ${selectedProduct.expiryDate}\n` : '') +
      `*Pickup Location:* ${location}\n\n` +
      `_Reply to this message with your quantity to place an order instantly!_ 🛍️`;

    const encoded = encodeURIComponent(broadcast);
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const shareUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;

    return { broadcast, direct: broadcast, shareUrl };
  }, [selectedProduct, storeName, location, phone]);

  // 3. TIKTOK GENERATED CONTENT
  const ttContent = useMemo(() => {
    if (!selectedProduct) return { hook: '', script: '', hashtags: '', caption: '' };

    const priceNum = parseFloat(selectedProduct.sellingPrice?.replace(/[^0-9.]/g, '') || selectedProduct.mrp?.replace(/[^0-9.]/g, '') || '0') || 0;

    const hook = `🔥 Stop scrolling! You won't believe we just restocked the ${selectedProduct.productName} for only $${priceNum.toFixed(2)}!`;

    const script = `🎬 [0:00 - 0:03] HOOK: Show close-up of ${selectedProduct.productName} packaging while speaking the hook line!\n\n` +
      `🎥 [0:03 - 0:08] DEMO: "Look at the quality on this ${selectedProduct.brand || 'authentic batch'}. It's freshly stocked in ${selectedProduct.category || 'our inventory'}."\n\n` +
      `💰 [0:08 - 0:12] VALUE OFFER: "Grab yours today for just $${priceNum.toFixed(2)}. Only ${selectedProduct.stockQuantity} left in stock at our local store!"\n\n` +
      `🚀 [0:12 - 0:15] CALL TO ACTION: "Tap the link in bio or DM us to claim yours before it sells out!"`;

    const hashtags = `#${selectedProduct.productName.toLowerCase().replace(/[^a-z0-9]/g, '')} #tiktokshop #deals #musthave #smallbusiness #fyp #viral`;

    const caption = `${hook}\n\nGrab yours now for only $${priceNum.toFixed(2)}! 🛒 Link in bio or DM to order.\n\n${hashtags}`;

    return { hook, script, hashtags, caption };
  }, [selectedProduct]);

  return (
    <div id="social-channels-hub-container" className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-pink-50 text-pink-600 rounded-lg">
              <Share2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Social Selling Hub</h2>
              <p className="text-xs text-slate-500">
                Generate formatted listings, viral scripts, and one-tap order shares for Facebook, WhatsApp & TikTok
              </p>
            </div>
          </div>
        </div>

        {/* Product selector in header */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Active Product:</label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-xs"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.productName} ({p.stockQuantity} {p.unit || 'units'} @ {p.sellingPrice || p.mrp || '$0'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* CHANNEL TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('facebook')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'facebook'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Facebook className="w-4 h-4" />
          Facebook Marketplace
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'whatsapp'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp Catalog & Chat
        </button>

        <button
          onClick={() => setActiveTab('tiktok')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'tiktok'
              ? 'bg-slate-900 text-pink-400 shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          TikTok Script & Shop
        </button>
      </div>

      {/* TAB CONTENT: 1. FACEBOOK */}
      {activeTab === 'facebook' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: FB Marketplace Mockup Preview */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Facebook className="w-4 h-4" />
                <span className="font-bold text-xs">Facebook Marketplace Listing Preview</span>
              </div>
              <span className="text-[11px] bg-blue-700 px-2 py-0.5 rounded font-medium">Ready to Publish</span>
            </div>

            <div className="p-5 space-y-4 flex-1">
              <div className="bg-slate-100 rounded-xl p-6 text-center border border-dashed border-slate-300">
                <Package className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                <div className="font-bold text-slate-800 text-sm">{selectedProduct?.productName}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Category: {selectedProduct?.category} • Stock: {selectedProduct?.stockQuantity} {selectedProduct?.unit || 'units'}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900">${fbContent.price.toFixed(2)}</h3>
                <h4 className="text-base font-bold text-slate-900 mt-1">{fbContent.title}</h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{location}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description Preview
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans max-h-52 overflow-y-auto">
                  {fbContent.description}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                onClick={() => copyToClipboard(fbContent.description, 'fb_desc')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
              >
                {copiedKey === 'fb_desc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'fb_desc' ? 'Copied Description!' : 'Copy Description'}
              </button>

              <button
                onClick={() => {
                  copyToClipboard(`${fbContent.title}\n\n${fbContent.description}`, 'fb_full');
                  window.open('https://www.facebook.com/marketplace/create', '_blank');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Copy & Open FB Marketplace
              </button>
            </div>
          </div>

          {/* Right: FB Formatted Fields for Fast Copy-Pasting */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Facebook Listing Fields for Quick Entry</h3>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Listing Title</label>
                  <button
                    onClick={() => copyToClipboard(fbContent.title, 'fb_title')}
                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {copiedKey === 'fb_title' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={fbContent.title}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">Price</label>
                    <button
                      onClick={() => copyToClipboard(String(fbContent.price), 'fb_price')}
                      className="text-[11px] font-bold text-blue-600 hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={`$${fbContent.price.toFixed(2)}`}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Condition</label>
                  <input
                    type="text"
                    readOnly
                    value="New / Authentic"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Tags / Hashtags</label>
                  <button
                    onClick={() => copyToClipboard(fbContent.tags, 'fb_tags')}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={fbContent.tags}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-mono"
                />
              </div>

              <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-100 text-xs text-blue-900 leading-relaxed">
                <span className="font-bold">Pro Tip:</span> When a buyer messages you on Facebook, use the <strong>"Record Marketplace Order"</strong> button to reserve their stock so you never oversell your inventory!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. WHATSAPP */}
      {activeTab === 'whatsapp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: WhatsApp Chat Bubble Mockup */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-emerald-700 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                <span className="font-bold text-xs">WhatsApp Direct Catalog Message</span>
              </div>
              <span className="text-[11px] bg-emerald-800 px-2 py-0.5 rounded font-medium">Auto-Formatted</span>
            </div>

            <div className="p-5 bg-emerald-50/40 flex-1 space-y-4">
              {/* Chat bubble */}
              <div className="bg-white rounded-2xl rounded-tl-xs p-4 shadow-xs border border-emerald-100 max-w-md text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                {waContent.broadcast}
                <div className="text-[10px] text-slate-400 text-right mt-2 font-mono">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                onClick={() => copyToClipboard(waContent.broadcast, 'wa_msg')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                {copiedKey === 'wa_msg' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'wa_msg' ? 'Copied Message!' : 'Copy Text'}
              </button>

              <a
                href={waContent.shareUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                Share Directly on WhatsApp
              </a>
            </div>
          </div>

          {/* Right: WhatsApp Selling Helper */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">WhatsApp Selling Strategy</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Send this formatted broadcast to your customer groups, VIP broadcast list, or WhatsApp Status. Customers can tap reply to instantly confirm their order.
              </p>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Configured Store WhatsApp</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{phone}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Pickup & Delivery Info</div>
                  <div className="text-xs text-slate-800 font-medium mt-0.5">{location}</div>
                </div>
              </div>

              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-xs text-emerald-950 leading-relaxed">
                <span className="font-bold">Instant Reservation:</span> Once the customer sends their address and quantity, record their order under the <strong>Orders</strong> tab to deduct stock automatically and log revenue to your accounting ledger.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 3. TIKTOK */}
      {activeTab === 'tiktok' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: TikTok Video Script */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span className="font-bold text-xs">TikTok Viral Video & Live Selling Script</span>
              </div>
              <span className="text-[11px] bg-pink-600 text-white px-2 py-0.5 rounded font-medium">High Engagement</span>
            </div>

            <div className="p-5 space-y-4 flex-1">
              <div>
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  1. Hook Line (First 3 Seconds)
                </div>
                <div className="bg-pink-50/70 p-3 rounded-xl border border-pink-100 text-xs font-bold text-pink-950">
                  {ttContent.hook}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  2. Video Demo & Selling Script
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-line leading-relaxed font-sans">
                  {ttContent.script}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  3. Post Caption & Hashtags
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 font-mono">
                  {ttContent.caption}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                onClick={() => copyToClipboard(ttContent.script, 'tt_script')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
              >
                {copiedKey === 'tt_script' ? <Check className="w-3.5 h-3.5 text-pink-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'tt_script' ? 'Copied Script!' : 'Copy Script'}
              </button>

              <button
                onClick={() => {
                  copyToClipboard(ttContent.caption, 'tt_cap');
                  window.open('https://www.tiktok.com/upload', '_blank');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-pink-400 rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Copy Caption & Open TikTok
              </button>
            </div>
          </div>

          {/* Right: TikTok Shop Creator Guidance */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">TikTok Live & Video Tips</h3>

              <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-800">1. Hold product to camera</div>
                  <p className="mt-0.5 text-slate-500">Show texture, brand label, and expiry seal in the first 2 seconds.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-800">2. Highlight Scarcity</div>
                  <p className="mt-0.5 text-slate-500">Mention that only {selectedProduct?.stockQuantity} units are in stock.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-800">3. Clear Call to Action</div>
                  <p className="mt-0.5 text-slate-500">Tell viewers to click your profile link or DM for instant order fulfillment.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
