/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Menu,
  Camera,
  Boxes,
  CircleDollarSign,
  Zap,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { MenuSection, AppSubView } from '../../types';

interface AppHeaderProps {
  activeSection: MenuSection;
  activeSubView: AppSubView;
  onNavigate: (section: MenuSection, subView: AppSubView) => void;
  onOpenDrawer: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeSection,
  activeSubView,
  onNavigate,
  onOpenDrawer,
}) => {
  const getSubViewTitle = (sub: string): string => {
    const map: Record<string, string> = {
      scan_product: 'Scan Product',
      manual_entry: 'Add Product Manually',
      scan_invoice: 'Scan Invoice',
      barcode_scanner: 'Barcode Scanner',
      qr_scanner: 'QR Scanner',
      multi_scan: 'Multiple Image Scan',
      scan_history: 'Scan History',
      inventory: 'Inventory Overview',
      accounting: 'Inventory Accounting',
      products: 'Products Catalog',
      stock_in: 'Stock In',
      stock_out: 'Stock Out',
      stock_ledger: 'Stock Movement Ledger',
      low_stock: 'Low Stock Alerts',
      expiring_soon: 'Expiring Soon',
      expired: 'Expired Products',
      categories: 'Categories',
      reports: 'Reports',
      dashboard: 'Marketplace Dashboard',
      listings: 'Marketplace Listings',
      create_listing: 'Create Listing',
      orders: 'Marketplace Orders',
      social_channels: 'Social Selling Hub',
      settings: 'Marketplace Settings',
      marketplace_dashboard: 'Marketplace Dashboard',
      marketplace_listings: 'Marketplace Listings',
      marketplace_create_listing: 'Create Listing',
      marketplace_orders: 'Marketplace Orders',
      marketplace_social_hub: 'Social Selling Hub',
      marketplace_settings: 'Marketplace Settings',
      sales: 'Sales Ledger',
      purchases: 'Purchases Ledger',
      profit: 'Profit Analytics',
      loss: 'Loss Tracking',
      expenses: 'Operating Expenses',
      income: 'Other Income',
      summary: 'Account Summary',
    };
    return map[sub] || sub;
  };

  const getSectionEmoji = (sec: MenuSection): string => {
    if (sec === 'scanner') return '📷';
    if (sec === 'inventory') return '📦';
    if (sec === 'marketplace') return '🏪';
    return '💰';
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Menu trigger & App Title */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 transition-colors flex items-center gap-1.5 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
            title="Open Menu"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
            <span className="text-xs font-bold hidden sm:inline text-slate-700">Menu</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm shadow-indigo-600/30">
              <Zap className="w-4 h-4 text-indigo-100" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                  SmartStock AI
                </span>
                <span className="hidden md:inline-flex text-[10px] uppercase font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200/60">
                  Inventory &amp; ERP
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Breadcrumb (Desktop) */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-slate-100/90 rounded-full border border-slate-200/80 text-xs font-medium text-slate-600">
          <span className="font-bold text-slate-900 flex items-center gap-1">
            <span>{getSectionEmoji(activeSection)}</span>
            <span className="uppercase">{activeSection}</span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-indigo-600">{getSubViewTitle(activeSubView)}</span>
        </div>

        {/* Right Action Quick Links */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Desktop Nav Switchers */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => onNavigate('scanner', 'scan_product')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSection === 'scanner'
                  ? 'bg-white text-indigo-600 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scanner</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('inventory', 'inventory')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSection === 'inventory'
                  ? 'bg-white text-indigo-600 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Inventory</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('marketplace', 'marketplace_dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSection === 'marketplace'
                  ? 'bg-white text-indigo-600 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Marketplace</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('account', 'summary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSection === 'account'
                  ? 'bg-white text-indigo-600 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CircleDollarSign className="w-3.5 h-3.5" />
              <span>Account</span>
            </button>
          </div>

          {/* Quick Scan Invoice CTA */}
          <button
            type="button"
            onClick={() => onNavigate('scanner', 'scan_invoice')}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Scan Invoice</span>
            <span className="xs:hidden">Invoice</span>
          </button>
        </div>
      </div>
    </header>
  );
};
