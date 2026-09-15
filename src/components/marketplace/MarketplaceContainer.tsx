/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Store,
  LayoutDashboard,
  Share2,
  PlusCircle,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  ArrowLeft,
  Facebook,
  MessageCircle,
} from 'lucide-react';
import { MarketplaceSubView } from '../../types';
import { MarketplaceDashboardView } from './MarketplaceDashboardView';
import { MarketplaceListingsView } from './MarketplaceListingsView';
import { MarketplaceCreateListingView } from './MarketplaceCreateListingView';
import { MarketplaceOrdersView } from './MarketplaceOrdersView';
import { SocialChannelsView } from './SocialChannelsView';
import { MarketplaceSettingsView } from './MarketplaceSettingsView';

interface MarketplaceContainerProps {
  initialSubView?: MarketplaceSubView;
  onBackToMain?: () => void;
}

export const MarketplaceContainer: React.FC<MarketplaceContainerProps> = ({
  initialSubView = 'dashboard',
  onBackToMain,
}) => {
  const [subView, setSubView] = useState<MarketplaceSubView>(initialSubView);
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const [socialInitialChannel, setSocialInitialChannel] = useState<'facebook' | 'whatsapp' | 'tiktok'>('facebook');

  const handleOpenSocialHubForProduct = (productId: string, channel: 'facebook' | 'whatsapp' | 'tiktok') => {
    setSelectedProductId(productId);
    setSocialInitialChannel(channel);
    setSubView('social_channels');
  };

  return (
    <div id="marketplace-master-container" className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Sub-Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-3 overflow-x-auto gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <span className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                <Store className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-base font-black text-slate-900 leading-tight">Marketplace & Social Sales</h1>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Connected inventory selling across Facebook, WhatsApp & TikTok
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                id="tab-mkt-dashboard"
                onClick={() => setSubView('dashboard')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  subView === 'dashboard'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              <button
                id="tab-mkt-listings"
                onClick={() => setSubView('listings')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  subView === 'listings'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Share2 className="w-4 h-4" />
                <span>Listings</span>
              </button>

              <button
                id="tab-mkt-create"
                onClick={() => setSubView('create_listing')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  subView === 'create_listing'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span>+ Create</span>
              </button>

              <button
                id="tab-mkt-orders"
                onClick={() => setSubView('orders')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  subView === 'orders'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Orders</span>
              </button>

              <button
                id="tab-mkt-social"
                onClick={() => setSubView('social_channels')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  subView === 'social_channels'
                    ? 'bg-pink-50 text-pink-700 border border-pink-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-4 h-4 text-pink-500" />
                <span>Social Hub</span>
              </button>

              <button
                id="tab-mkt-settings"
                onClick={() => setSubView('settings')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  subView === 'settings'
                    ? 'bg-slate-100 text-slate-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {subView === 'dashboard' && (
          <MarketplaceDashboardView
            onNavigateSubView={(v) => setSubView(v)}
            onSelectProductForListing={(pId) => {
              setSelectedProductId(pId);
              setSubView('create_listing');
            }}
          />
        )}

        {subView === 'listings' && (
          <MarketplaceListingsView
            onNavigateSubView={(v) => setSubView(v)}
            onOpenSocialHubForProduct={handleOpenSocialHubForProduct}
          />
        )}

        {subView === 'create_listing' && (
          <MarketplaceCreateListingView
            onNavigateSubView={(v) => setSubView(v)}
            preselectedProductId={selectedProductId}
          />
        )}

        {subView === 'orders' && (
          <MarketplaceOrdersView onNavigateSubView={(v) => setSubView(v)} />
        )}

        {subView === 'social_channels' && (
          <SocialChannelsView
            initialChannel={socialInitialChannel}
            initialProductId={selectedProductId}
          />
        )}

        {subView === 'settings' && <MarketplaceSettingsView />}
      </div>
    </div>
  );
};
