/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Camera,
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  Zap,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  FileText,
  AlertTriangle,
  Barcode,
  QrCode,
  PlusCircle,
  Layers,
  History,
  ShieldCheck,
  X,
  User,
  Settings,
  FileSpreadsheet,
} from 'lucide-react';
import { MenuSection, AppSubView, UserProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSelectorButton } from '../common/LanguageSelectorButton';

interface AppHeaderProps {
  activeSection: MenuSection;
  activeSubView: AppSubView;
  onNavigate: (section: MenuSection, subView: AppSubView) => void;
  onOpenDrawer?: () => void;
  onToggleDrawer?: () => void;
  inventoryCount?: number;
  alertCount?: number;
  userProfile?: UserProfile | null;
  onEditProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenGoogleSheets?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeSection,
  activeSubView,
  onNavigate,
  onOpenDrawer,
  onToggleDrawer,
  inventoryCount,
  alertCount = 0,
  userProfile,
  onEditProfile,
  onOpenSettings,
  onOpenGoogleSheets,
}) => {
  const { t } = useLanguage();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleDrawer = onOpenDrawer || onToggleDrawer || (() => {});

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  const isScannerSubView = (sub: string): boolean => {
    return [
      'scan_product',
      'manual_entry',
      'barcode_scanner',
      'qr_scanner',
      'multi_scan',
      'multiple_image_scan',
      'scan_history',
    ].includes(sub);
  };

  const getSubViewTitle = (sub: string): string => {
    const map: Record<string, string> = {
      scan_product: 'AI Multi-Shot Scan',
      manual_entry: 'Add Product Manually',
      barcode_scanner: 'Barcode Scanner',
      qr_scanner: 'QR Scanner',
      multi_scan: 'Multiple Image Scan',
      multiple_image_scan: 'Multiple Image Scan',
      scan_history: 'Scan History',
      inventory: 'Inventory Overview',
      turnover: 'Inventory Turnover & Velocity',
      reputation: 'Product Reputation & Ratings',
      accounting: 'Inventory Valuation',
      products: 'Products Catalog',
      stock_in: 'Receive Stock (Stock In)',
      stock_out: 'Dispatch Stock (Stock Out)',
      stock_ledger: 'Stock Movement Ledger',
      low_stock: 'Low Stock Alerts',
      expiring_soon: 'Expiring Soon',
      expired: 'Expired Products',
      expiry_alerts: 'Expiry Alerts & Notifications',
      categories: 'Categories',
      reports: 'Reports',
    };
    return map[sub] || sub;
  };

  const getActiveSubMenuLabel = (): string => {
    if (isScannerSubView(activeSubView)) {
      if (activeSubView === 'scan_product') return 'In · Scanner (AI)';
      if (activeSubView === 'barcode_scanner') return 'In · Barcode';
      if (activeSubView === 'qr_scanner') return 'In · QR';
      if (activeSubView === 'manual_entry') return 'In · Manual';
      return 'In · Scanner';
    }
    if (activeSection === 'inventory_in' || activeSubView === 'stock_in') {
      return 'In · Receive';
    }
    if (activeSection === 'inventory_out' || activeSubView === 'stock_out') {
      return 'Out · Dispatch';
    }
    if (activeSubView === 'turnover') return 'Turnover';
    if (activeSubView === 'reputation') return 'Reputation';
    if (activeSubView === 'low_stock') return 'Low Stock';
    if (activeSubView === 'expiring_soon') return 'Expiring';
    return 'Overview';
  };

  const handleSelect = (section: MenuSection, subView: AppSubView) => {
    onNavigate(section, subView);
    setIsDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: All Views drawer trigger & App Brand */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={handleDrawer}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 transition-colors flex items-center gap-1.5 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
            title="Open Full Navigation Drawer"
            aria-label="Open Full Navigation Drawer"
          >
            <Menu className="w-5 h-5" />
            <span className="text-xs font-bold hidden sm:inline text-slate-700">All Views</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm shadow-indigo-600/30">
              <Zap className="w-4 h-4 text-indigo-100" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                  ScanMe AI
                </span>
                <span className="hidden md:inline-flex text-[10px] uppercase font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200/60">
                  AI Product Scanner
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Breadcrumb (Desktop) - Synchronized Hierarchy */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-slate-100/90 rounded-full border border-slate-200/80 text-xs font-medium text-slate-600">
          <span className="font-bold text-slate-900 flex items-center gap-1">
            <span>📦</span>
            <span className="uppercase">INVENTORY</span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />

          {isScannerSubView(activeSubView) ? (
            <>
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <span>📥</span>
                <span className="uppercase">INVENTORY IN</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-indigo-700 flex items-center gap-1">
                <span>📷</span>
                <span className="uppercase">SCANNER</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-indigo-900">{getSubViewTitle(activeSubView)}</span>
            </>
          ) : activeSection === 'inventory_in' || activeSubView === 'stock_in' ? (
            <>
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <span>📥</span>
                <span className="uppercase">INVENTORY IN</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-emerald-900">{getSubViewTitle(activeSubView)}</span>
            </>
          ) : activeSection === 'inventory_out' || activeSubView === 'stock_out' ? (
            <>
              <span className="font-semibold text-rose-700 flex items-center gap-1">
                <span>📤</span>
                <span className="uppercase">INVENTORY OUT</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-rose-900">{getSubViewTitle(activeSubView)}</span>
            </>
          ) : (
            <span className="font-bold text-indigo-600">{getSubViewTitle(activeSubView)}</span>
          )}
        </div>

        {/* Right Corner: Quick Action & Hierarchical Dropdown Menu */}
        <div className="flex items-center gap-2 relative">
          {/* Quick Intake Scanner Primary Action */}
          <button
            type="button"
            onClick={() => onNavigate('inventory_in', 'scan_product')}
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 flex items-center gap-1.5 transition-all focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
            title="Scan Product into Inventory In"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Quick Scan</span>
            <span className="sm:hidden">Scan</span>
          </button>

          {/* Arranged Drop-Down Menu in the Right Corner */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="header-nav-dropdown-trigger"
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 ${
                isDropdownOpen
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200/90 text-slate-800 border-slate-200/80'
              }`}
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
              aria-label="Inventory Navigation Menu"
              title="Inventory Menu"
            >
              <Boxes className={`w-4 h-4 shrink-0 ${isDropdownOpen ? 'text-indigo-300' : 'text-indigo-600'}`} />
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900">Inventory</span>
                <span className="hidden xs:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                  {getActiveSubMenuLabel()}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180 text-white' : 'text-slate-500'
                }`}
              />
              {alertCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
              )}
            </button>

            {/* Dropdown Panel with Synchronized Sub-Menus */}
            {isDropdownOpen && (
              <div
                id="header-nav-dropdown-panel"
                className="fixed right-2 sm:right-4 top-[4.5rem] w-[calc(100vw-1rem)] max-w-[24rem] max-h-[calc(100dvh-5rem)] overflow-hidden bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-3 z-[60] animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-100"
              >
                {/* Dropdown Header */}
                <div className="pb-2.5 px-1 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Boxes className="w-4 h-4 text-indigo-600" />
                      <span>Inventory Menu</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Sub-menus: Inventory In (with Scanner) &amp; Inventory Out
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    aria-label="Close menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sub-Menus List */}
                <div className="py-2.5 space-y-3 max-h-[calc(100dvh-11rem)] overflow-y-auto pr-0.5 overscroll-contain">
                  {/* ========================================================= */}
                  {/* SUB-MENU 1: INVENTORY IN (With Scanner inside!)           */}
                  {/* ========================================================= */}
                  <div
                    className={`rounded-xl border transition-all p-2.5 ${
                      activeSection === 'inventory_in' || isScannerSubView(activeSubView)
                        ? 'border-emerald-300 bg-emerald-50/30 shadow-2xs'
                        : 'border-slate-200/80 bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* Sub-menu header */}
                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-emerald-100/80">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900 uppercase tracking-tight">
                              Inventory In
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                              Sub-Menu
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            Inward stock receiving, restocking &amp; product scanning
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Scanner inside Inventory In */}
                    <div className="mt-2 p-2 rounded-lg bg-indigo-50/60 border border-indigo-200/70">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-indigo-700" />
                          <span className="text-[11px] font-extrabold text-indigo-950 uppercase tracking-wide">
                            Scanner (Intake Suite)
                          </span>
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-600 text-white">
                          Inside Inventory In
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mb-2">
                        Scan packages with AI Vision, hardware barcode/QR, or enter products
                      </p>

                      {/* Scanner sub-actions */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSelect('inventory_in', 'scan_product')}
                          className={`px-2 py-1.5 rounded-md text-[11px] font-semibold text-left flex items-center gap-1.5 transition-colors ${
                            activeSubView === 'scan_product'
                              ? 'bg-indigo-600 text-white font-bold shadow-xs'
                              : 'bg-white hover:bg-indigo-100/60 text-slate-800 border border-indigo-100'
                          }`}
                        >
                          <Camera className="w-3 h-3 text-indigo-500" />
                          <span className="truncate">AI Multi-Shot</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelect('inventory_in', 'barcode_scanner')}
                          className={`px-2 py-1.5 rounded-md text-[11px] font-semibold text-left flex items-center gap-1.5 transition-colors ${
                            activeSubView === 'barcode_scanner'
                              ? 'bg-indigo-600 text-white font-bold shadow-xs'
                              : 'bg-white hover:bg-indigo-100/60 text-slate-800 border border-indigo-100'
                          }`}
                        >
                          <Barcode className="w-3 h-3 text-indigo-500" />
                          <span className="truncate">Barcode Scanner</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelect('inventory_in', 'qr_scanner')}
                          className={`px-2 py-1.5 rounded-md text-[11px] font-semibold text-left flex items-center gap-1.5 transition-colors ${
                            activeSubView === 'qr_scanner'
                              ? 'bg-indigo-600 text-white font-bold shadow-xs'
                              : 'bg-white hover:bg-indigo-100/60 text-slate-800 border border-indigo-100'
                          }`}
                        >
                          <QrCode className="w-3 h-3 text-indigo-500" />
                          <span className="truncate">QR Scanner</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelect('inventory_in', 'manual_entry')}
                          className={`px-2 py-1.5 rounded-md text-[11px] font-semibold text-left flex items-center gap-1.5 transition-colors ${
                            activeSubView === 'manual_entry'
                              ? 'bg-indigo-600 text-white font-bold shadow-xs'
                              : 'bg-white hover:bg-indigo-100/60 text-slate-800 border border-indigo-100'
                          }`}
                        >
                          <PlusCircle className="w-3 h-3 text-indigo-500" />
                          <span className="truncate">Manual Entry</span>
                        </button>
                      </div>

                      <div className="mt-1.5 pt-1.5 border-t border-indigo-100/80 flex items-center justify-between text-[10px]">
                        <button
                          type="button"
                          onClick={() => handleSelect('inventory_in', 'multi_scan')}
                          className="text-indigo-700 hover:text-indigo-900 font-medium flex items-center gap-1"
                        >
                          <Layers className="w-2.5 h-2.5" />
                          <span>Batch Scan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelect('inventory_in', 'scan_history')}
                          className="text-indigo-700 hover:text-indigo-900 font-medium flex items-center gap-1"
                        >
                          <History className="w-2.5 h-2.5" />
                          <span>Scan History</span>
                        </button>
                      </div>
                    </div>

                    {/* Inward Receiving operations */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelect('inventory_in', 'stock_in')}
                        className={`flex-1 min-w-[130px] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
                          activeSubView === 'stock_in'
                            ? 'bg-emerald-700 text-white font-bold'
                            : 'bg-white hover:bg-emerald-50 text-slate-800 border border-slate-200'
                        }`}
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Receive Stock (Stock In)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelect('inventory_in', 'stock_ledger')}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
                          activeSection === 'inventory_in' && activeSubView === 'stock_ledger'
                            ? 'bg-emerald-700 text-white font-bold'
                            : 'bg-white hover:bg-emerald-50 text-slate-800 border border-slate-200'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>Inward Ledger</span>
                      </button>
                    </div>
                  </div>

                  {/* ========================================================= */}
                  {/* SUB-MENU 2: INVENTORY OUT                                 */}
                  {/* ========================================================= */}
                  <div
                    className={`rounded-xl border transition-all p-2.5 ${
                      activeSection === 'inventory_out'
                        ? 'border-rose-300 bg-rose-50/30 shadow-2xs'
                        : 'border-slate-200/80 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-rose-100/80">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-rose-600 text-white shadow-xs">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900 uppercase tracking-tight">
                              Inventory Out
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                              Sub-Menu
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            Sales orders, fulfillment, dispatch &amp; write-offs
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelect('inventory_out', 'stock_out')}
                        className={`flex-1 min-w-[130px] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
                          activeSubView === 'stock_out'
                            ? 'bg-rose-700 text-white font-bold'
                            : 'bg-white hover:bg-rose-50 text-slate-800 border border-slate-200'
                        }`}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                        <span>Dispatch Stock (Stock Out)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelect('inventory_out', 'stock_ledger')}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
                          activeSection === 'inventory_out' && activeSubView === 'stock_ledger'
                            ? 'bg-rose-700 text-white font-bold'
                            : 'bg-white hover:bg-rose-50 text-slate-800 border border-slate-200'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>Outward Ledger</span>
                      </button>
                    </div>
                  </div>

                  {/* ========================================================= */}
                  {/* SUB-MENU 3: INVENTORY OVERVIEW & HEALTH                   */}
                  {/* ========================================================= */}
                  <div
                    className={`rounded-xl border transition-all p-2.5 ${
                      activeSection === 'inventory' && !isScannerSubView(activeSubView)
                        ? 'border-blue-300 bg-blue-50/30 shadow-2xs'
                        : 'border-slate-200/80 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-blue-100/80">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                          <Boxes className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900 uppercase tracking-tight">
                              Inventory Overview &amp; Health
                            </span>
                            {inventoryCount !== undefined && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                                {inventoryCount} items
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500">
                            Catalog, velocity turnover &amp; quality reputation
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelect('inventory', 'inventory')}
                        className={`px-2 py-1.5 rounded-md text-[11px] font-semibold text-left flex items-center gap-1.5 transition-colors ${
                          activeSection === 'inventory' && activeSubView === 'inventory'
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/80'
                        }`}
                      >
                        <Boxes className="w-3 h-3 text-blue-500" />
                        <span className="truncate">Overview</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelect('inventory', 'turnover')}
                        className={`px-2 py-1.5 rounded-md text-[11px] font-semibold text-left flex items-center gap-1.5 transition-colors ${
                          activeSubView === 'turnover'
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/80'
                        }`}
                      >
                        <TrendingUp className="w-3 h-3 text-blue-500" />
                        <span className="truncate">Turnover &amp; DSI</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelect('inventory', 'reputation')}
                        className={`px-2 py-1.5 rounded-md text-[11px] font-semibold text-left flex items-center gap-1.5 transition-colors ${
                          activeSubView === 'reputation'
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/80'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3 text-blue-500" />
                        <span className="truncate">Reputation</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelect('inventory', 'stock_ledger')}
                        className={`px-2 py-1.5 rounded-md text-[11px] font-semibold text-left flex items-center gap-1.5 transition-colors ${
                          activeSection === 'inventory' && activeSubView === 'stock_ledger'
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/80'
                        }`}
                      >
                        <FileText className="w-3 h-3 text-blue-500" />
                        <span className="truncate">Stock Ledger</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelect('inventory', 'expiry_alerts')}
                        className={`px-2 py-1.5 rounded-md text-[11px] font-semibold text-left flex items-center gap-1.5 transition-colors ${
                          activeSection === 'inventory' && activeSubView === 'expiry_alerts'
                            ? 'bg-amber-600 text-white font-bold'
                            : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/80'
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        <span className="truncate">Expiry Alerts</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dropdown Footer: Quick Drawer Toggle & Warnings */}
                <div className="pt-2.5 px-1 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Need all reports &amp; categories?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        handleDrawer();
                      }}
                      className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
                    >
                      <Menu className="w-3.5 h-3.5" />
                      <span>Open Full Drawer</span>
                    </button>
                  </div>

                  {alertCount > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSelect('inventory', 'low_stock')}
                      className="w-full py-1.5 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/70 text-[11px] font-bold flex items-center justify-between transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>{alertCount} items need attention</span>
                      </span>
                      <span className="text-amber-700 underline text-[10px]">View</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Language Selector Button */}
          <LanguageSelectorButton variant="pill" />

          {/* Google Sheets Trigger Button */}
          {onOpenGoogleSheets && (
            <button
              type="button"
              onClick={onOpenGoogleSheets}
              id="header-sheets-btn"
              className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 text-emerald-700 hover:text-emerald-900 transition-colors flex items-center gap-1.5"
              title={t('sheets.title')}
              aria-label={t('sheets.title')}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden xl:inline-block text-xs font-bold text-emerald-800">
                Google Sheets
              </span>
            </button>
          )}

          {/* Settings Trigger Button */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              id="header-settings-btn"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 text-slate-600 hover:text-slate-900 transition-colors"
              title={t('settings.title')}
              aria-label={t('settings.title')}
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* User Profile Avatar Pill */}
          {userProfile && onEditProfile && (
            <button
              type="button"
              onClick={onEditProfile}
              id="header-user-profile-btn"
              className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 transition-all text-left group"
              title="Manage Profile"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0 text-[#1473EA] font-bold text-[10px]">
                {userProfile.profile_image_url ? (
                  <img
                    src={userProfile.profile_image_url}
                    alt={userProfile.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  userProfile.full_name.charAt(0).toUpperCase() || <User className="w-3 h-3" />
                )}
              </div>
              <span className="hidden md:inline-block text-xs font-bold text-slate-700 group-hover:text-[#1473EA] max-w-[100px] truncate">
                {userProfile.full_name.split(' ')[0]}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
