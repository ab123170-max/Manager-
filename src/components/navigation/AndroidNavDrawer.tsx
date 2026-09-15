/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Camera,
  FileSpreadsheet,
  Barcode,
  QrCode,
  Layers,
  History,
  PlusCircle,
  Boxes,
  BookOpen,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Clock,
  Skull,
  Tag,
  BarChart3,
  TrendingUp,
  ShoppingBag,
  CircleDollarSign,
  TrendingDown,
  Receipt,
  Wallet,
  PieChart,
  FileText,
  X,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Zap,
  Store,
  Share2,
  Sparkles,
  SlidersHorizontal,
  ScrollText,
} from 'lucide-react';
import { MenuSection, AppSubView } from '../../types';

interface NavItem {
  id: AppSubView;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
  description?: string;
}

interface NavSection {
  id: MenuSection;
  title: string;
  emoji: string;
  icon: React.ElementType;
  items: NavItem[];
}

interface AndroidNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: MenuSection;
  activeSubView: string;
  onNavigate: (section: MenuSection, subView: any) => void;
  badges?: {
    lowStock?: number;
    expiringSoon?: number;
    expired?: number;
    totalProducts?: number;
  };
  counts?: {
    products?: number;
    lowStock?: number;
    expiring?: number;
    expired?: number;
    scanHistory?: number;
  };
}

export const AndroidNavDrawer: React.FC<AndroidNavDrawerProps> = ({
  isOpen,
  onClose,
  activeSection,
  activeSubView,
  onNavigate,
  badges,
  counts,
}) => {
  // Merge badges with counts
  const effectiveBadges = {
    totalProducts: badges?.totalProducts ?? counts?.products,
    lowStock: badges?.lowStock ?? counts?.lowStock,
    expiringSoon: badges?.expiringSoon ?? counts?.expiring,
    expired: badges?.expired ?? counts?.expired,
  };
  // Only one section expanded at a time as requested in Section 10
  const [expandedSection, setExpandedSection] = useState<MenuSection>(activeSection);

  const toggleSection = (section: MenuSection) => {
    setExpandedSection((prev) => (prev === section ? section : section));
  };

  const menuSections: NavSection[] = [
    {
      id: 'scanner',
      title: 'SCANNER',
      emoji: '📷',
      icon: Camera,
      items: [
        { id: 'scan_product', label: 'Scan Product', icon: Camera, description: 'AI Packaging Label Vision & MFD/EXP' },
        { id: 'manual_entry', label: 'Add Product Manually', icon: PlusCircle, description: 'Direct form input with auto date calculations' },
        { id: 'scan_invoice', label: 'Scan Invoice', icon: FileSpreadsheet, description: 'Multi-image invoice OCR & stock auto-entry' },
        { id: 'barcode_scanner', label: 'Barcode Scanner', icon: Barcode, description: 'Real-time 1D EAN/UPC hardware detection' },
        { id: 'qr_scanner', label: 'QR Scanner', icon: QrCode, description: 'Instant QR code & matrix parser' },
        { id: 'multi_scan', label: 'Multiple Image Scan', icon: Layers, description: 'Multi-angle batch package capture' },
        { id: 'scan_history', label: 'Scan History', icon: History, description: 'Recent scans & detection log' },
      ],
    },
    {
      id: 'inventory',
      title: 'INVENTORY',
      emoji: '📦',
      icon: Boxes,
      items: [
        { id: 'inventory', label: 'Inventory', icon: Boxes, badge: effectiveBadges.totalProducts },
        { id: 'accounting', label: 'Inventory Accounting', icon: BookOpen, description: 'Transaction ledger & stock balance' },
        { id: 'products', label: 'Products', icon: Package },
        { id: 'stock_in', label: 'Stock In', icon: ArrowDownLeft },
        { id: 'stock_out', label: 'Stock Out', icon: ArrowUpRight },
        { id: 'stock_ledger', label: 'Stock Movement Ledger', icon: ScrollText, description: 'Audit trail of every stock change' },
        {
          id: 'low_stock',
          label: 'Low Stock',
          icon: AlertTriangle,
          badge: effectiveBadges.lowStock ? effectiveBadges.lowStock : undefined,
          badgeColor: 'bg-amber-500 text-white',
        },
        {
          id: 'expiring_soon',
          label: 'Expiring Soon',
          icon: Clock,
          badge: effectiveBadges.expiringSoon ? effectiveBadges.expiringSoon : undefined,
          badgeColor: 'bg-orange-500 text-white',
        },
        {
          id: 'expired',
          label: 'Expired Products',
          icon: Skull,
          badge: effectiveBadges.expired ? effectiveBadges.expired : undefined,
          badgeColor: 'bg-rose-500 text-white',
        },
        { id: 'categories', label: 'Categories', icon: Tag },
        { id: 'reports', label: 'Inventory Reports', icon: BarChart3 },
      ],
    },
    {
      id: 'marketplace',
      title: 'MARKETPLACE',
      emoji: '🏪',
      icon: Store,
      items: [
        { id: 'marketplace_dashboard', label: 'Marketplace Dashboard', icon: Store, description: 'Overview & channel revenue' },
        { id: 'marketplace_listings', label: 'Live Listings', icon: Share2, description: 'Active product listings across channels' },
        { id: 'marketplace_create_listing', label: 'Create Listing', icon: PlusCircle, description: 'Publish inventory items to social channels' },
        { id: 'marketplace_orders', label: 'Orders & Fulfillment', icon: ShoppingBag, description: 'Order state machine & stock reservation' },
        { id: 'marketplace_social_hub', label: 'Social Selling Hub', icon: Sparkles, description: 'Facebook, WhatsApp, and TikTok copy generators' },
        { id: 'marketplace_settings', label: 'Marketplace Settings', icon: SlidersHorizontal, description: 'Configure rules & store info' },
      ],
    },
    {
      id: 'account',
      title: 'ACCOUNT',
      emoji: '💰',
      icon: CircleDollarSign,
      items: [
        { id: 'sales', label: 'Sales', icon: TrendingUp },
        { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
        { id: 'profit', label: 'Profit', icon: CircleDollarSign },
        { id: 'loss', label: 'Loss', icon: TrendingDown },
        { id: 'expenses', label: 'Expenses', icon: Receipt },
        { id: 'income', label: 'Income', icon: Wallet },
        { id: 'summary', label: 'Account Summary', icon: PieChart },
        { id: 'reports', label: 'Financial Reports', icon: FileText },
      ],
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <aside className="relative w-80 max-w-[85vw] bg-white h-full flex flex-col shadow-2xl border-r border-slate-200 z-10 animate-in slide-in-from-left duration-250">
        {/* Android Material Header */}
        <div className="bg-slate-900 text-white p-5 pt-6 pb-5 flex flex-col justify-between border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
                <Zap className="w-5 h-5 text-indigo-200" />
              </div>
              <div>
                <h2 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                  SmartStock AI
                </h2>
                <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> Android Inventory &amp; ERP
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close Navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-2">
          {menuSections.map((section) => {
            const isExpanded = expandedSection === section.id;
            const isCurrentSection = activeSection === section.id;

            return (
              <div
                key={section.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isCurrentSection
                    ? 'border-slate-300/80 bg-slate-50/50 shadow-2xs'
                    : 'border-slate-200/60 bg-white'
                }`}
              >
                {/* Section Accordion Trigger */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 text-left font-bold text-xs uppercase tracking-wider transition-colors ${
                    isCurrentSection ? 'text-indigo-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{section.emoji}</span>
                    <span className="text-xs font-extrabold">{section.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {/* Sub-menu items (only expanded section shows) */}
                {isExpanded && (
                  <div className="px-2 pb-2.5 pt-1 space-y-1">
                    {section.items.map((item) => {
                      const isActive =
                        activeSection === section.id && activeSubView === item.id;
                      const IconComponent = item.icon;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onNavigate(section.id, item.id);
                            onClose();
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 font-bold'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <IconComponent
                              className={`w-4 h-4 shrink-0 ${
                                isActive ? 'text-white' : 'text-slate-500'
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>

                          {item.badge !== undefined && (
                            <span
                              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                                item.badgeColor
                                  ? item.badgeColor
                                  : isActive
                                  ? 'bg-indigo-700 text-white'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Drawer Bottom Quick Action */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold text-[11px]">AI Vision &amp; Accounting v2.4</span>
          <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">
            Real DB Sync
          </span>
        </div>
      </aside>
    </div>
  );
};
