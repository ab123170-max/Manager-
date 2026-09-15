/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  PlusCircle,
  Share2,
  Package,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  MessageCircle,
  Facebook,
  DollarSign,
  AlertTriangle,
  Layers,
  Store,
  ExternalLink,
} from 'lucide-react';
import {
  MarketplaceMetrics,
  MarketplaceListing,
  MarketplaceOrder,
  SavedInventoryItem,
  MarketplaceSubView,
} from '../../types';
import {
  getMarketplaceMetrics,
  getMarketplaceListings,
  getMarketplaceOrders,
  getProducts,
  subscribeToStore,
} from '../../utils/unifiedDataStore';

interface MarketplaceDashboardViewProps {
  onNavigateSubView: (view: MarketplaceSubView) => void;
  onSelectProductForListing?: (productId: string) => void;
}

export const MarketplaceDashboardView: React.FC<MarketplaceDashboardViewProps> = ({
  onNavigateSubView,
  onSelectProductForListing,
}) => {
  const [metrics, setMetrics] = useState<MarketplaceMetrics>(getMarketplaceMetrics());
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [products, setProducts] = useState<SavedInventoryItem[]>([]);

  useEffect(() => {
    const load = () => {
      setMetrics(getMarketplaceMetrics());
      setListings(getMarketplaceListings());
      setOrders(getMarketplaceOrders());
      setProducts(getProducts());
    };
    load();
    return subscribeToStore(load);
  }, []);

  // Channel breakdown
  const channelStats = useMemo(() => {
    let fbOrders = 0;
    let waOrders = 0;
    let ttOrders = 0;
    let otherOrders = 0;

    for (const o of orders) {
      if (o.channel === 'facebook') fbOrders++;
      else if (o.channel === 'whatsapp') waOrders++;
      else if (o.channel === 'tiktok') ttOrders++;
      else otherOrders++;
    }

    return { fbOrders, waOrders, ttOrders, otherOrders };
  }, [orders]);

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  return (
    <div id="marketplace-dashboard-container" className="space-y-6">
      {/* Hero Action Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-700/60 text-indigo-200 text-xs font-semibold mb-3 border border-indigo-500/30">
            <Store className="w-3.5 h-3.5" />
            Social Commerce & Multi-Channel Selling
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Connect Inventory to Social Marketplaces
          </h2>
          <p className="text-indigo-200 text-sm mt-2 leading-relaxed">
            Publish products to Facebook Marketplace, WhatsApp Catalogs, and TikTok without creating duplicate inventory. Manage reservations, fulfill orders, and track revenue seamlessly.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              id="btn-dash-create-listing"
              onClick={() => onNavigateSubView('create_listing')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm shadow-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Create Product Listing
            </button>
            <button
              id="btn-dash-social-channels"
              onClick={() => onNavigateSubView('social_channels')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-sm backdrop-blur-xs transition-colors border border-white/15"
            >
              <Share2 className="w-4 h-4" />
              Social Selling Hub (FB / WA / TT)
            </button>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Ready to Sell */}
        <div
          onClick={() => onNavigateSubView('listings')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Ready to Sell</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{metrics.readyToSellCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Products with available stock</p>
        </div>

        {/* Metric 2: Published Listings */}
        <div
          onClick={() => onNavigateSubView('listings')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Live Listings</span>
            <Share2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{metrics.publishedCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">{metrics.draftCount} draft listings</p>
        </div>

        {/* Metric 3: Pending Orders */}
        <div
          onClick={() => onNavigateSubView('orders')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-amber-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Orders</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-2">{metrics.pendingOrdersCount}</div>
          <p className="text-[11px] text-amber-700 mt-1">{metrics.totalReservedStock} items reserved</p>
        </div>

        {/* Metric 4: Completed Marketplace Revenue */}
        <div
          onClick={() => onNavigateSubView('orders')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Marketplace Sales</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-950 mt-2">
            ${metrics.totalMarketplaceSales.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{metrics.confirmedOrdersCount} orders fulfilled</p>
        </div>
      </div>

      {/* QUICK CHANNELS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Facebook Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-blue-300 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Facebook className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                {channelStats.fbOrders} Orders
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-3">Facebook Marketplace</h3>
            <p className="text-xs text-slate-500 mt-1">
              Optimized listing copy, tags, pricing, and pickup details for Facebook buy-and-sell groups.
            </p>
          </div>
          <button
            onClick={() => onNavigateSubView('social_channels')}
            className="mt-4 inline-flex items-center justify-between w-full text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 py-2 px-3 rounded-lg transition-colors"
          >
            <span>Open Facebook Tool</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* WhatsApp Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-emerald-300 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <MessageCircle className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                {channelStats.waOrders} Orders
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-3">WhatsApp Selling</h3>
            <p className="text-xs text-slate-500 mt-1">
              Generate formatted catalog messages, instant chat order links, and broadcast copy.
            </p>
          </div>
          <button
            onClick={() => onNavigateSubView('social_channels')}
            className="mt-4 inline-flex items-center justify-between w-full text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-2 px-3 rounded-lg transition-colors"
          >
            <span>Open WhatsApp Tool</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* TikTok Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-pink-300 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="p-2 bg-slate-900 text-pink-500 rounded-lg">
                <Sparkles className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">
                {channelStats.ttOrders} Orders
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-3">TikTok Shop & Video</h3>
            <p className="text-xs text-slate-500 mt-1">
              AI-generated video hook scripts, trending hashtags, visual cues, and live selling scripts.
            </p>
          </div>
          <button
            onClick={() => onNavigateSubView('social_channels')}
            className="mt-4 inline-flex items-center justify-between w-full text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 py-2 px-3 rounded-lg transition-colors"
          >
            <span>Open TikTok Tool</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* RECENT ORDERS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Recent Marketplace Orders</h3>
          </div>
          <button
            onClick={() => onNavigateSubView('orders')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>View All ({orders.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No marketplace orders recorded yet.
                  </td>
                </tr>
              ) : (
                recentOrders.map((ord) => {
                  const statusColors: Record<string, string> = {
                    pending: 'bg-amber-50 text-amber-700 border-amber-200',
                    confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
                    packed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    shipped: 'bg-purple-50 text-purple-700 border-purple-200',
                    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
                    returned: 'bg-slate-100 text-slate-700 border-slate-200',
                  };

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs font-bold text-slate-900">
                        {ord.orderNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 text-xs">{ord.customerName}</div>
                        {ord.customerPhone && (
                          <div className="text-[11px] text-slate-400">{ord.customerPhone}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="capitalize text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {ord.channel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {ord.items.map((it) => `${it.quantity}x ${it.productName}`).join(', ')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 text-xs">
                        ${ord.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            statusColors[ord.status] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
