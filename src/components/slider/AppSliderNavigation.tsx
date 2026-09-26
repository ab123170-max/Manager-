/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import {
  Camera,
  Boxes,
  ArrowUpDown,
  AlertTriangle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Barcode,
  PlusCircle,
  History,
  FileSpreadsheet,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  ScrollText,
  Clock,
  Sparkles,
  BarChart3,
  Layers,
} from 'lucide-react';
import { MenuSection, AppSubView } from '../../types';

export interface SliderPageDefinition {
  id: string;
  index: number;
  title: string;
  shortTitle: string;
  subtitle: string;
  icon: React.ElementType;
  section: MenuSection;
  defaultSubView: AppSubView;
  badge?: string | number;
  badgeType?: 'default' | 'warning' | 'danger' | 'success';
  subViews: {
    id: AppSubView;
    section: MenuSection;
    label: string;
    icon: React.ElementType;
    badge?: string | number;
  }[];
}

interface AppSliderNavigationProps {
  activeSlideIndex: number;
  activeSubView: AppSubView;
  activeSection: MenuSection;
  onSlideChange: (index: number) => void;
  onNavigate: (section: MenuSection, subView: AppSubView) => void;
  inventoryCount?: number;
  alertCount?: number;
  lowStockCount?: number;
  expiredCount?: number;
  scanHistoryCount?: number;
  onOpenGoogleSheets?: () => void;
}

export const AppSliderNavigation: React.FC<AppSliderNavigationProps> = ({
  activeSlideIndex,
  activeSubView,
  activeSection,
  onSlideChange,
  onNavigate,
  inventoryCount = 0,
  alertCount = 0,
  lowStockCount = 0,
  expiredCount = 0,
  scanHistoryCount = 0,
  onOpenGoogleSheets,
}) => {
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  const sliderPages: SliderPageDefinition[] = [
    {
      id: 'scanner',
      index: 0,
      title: 'AI Scanner & Intake',
      shortTitle: '1. Scanner',
      subtitle: 'Multi-Shot AI · Barcode · QR · Manual Entry',
      icon: Camera,
      section: 'inventory_in',
      defaultSubView: 'scan_product',
      subViews: [
        {
          id: 'scan_product',
          section: 'inventory_in',
          label: 'AI Multi-Shot Scan',
          icon: Sparkles,
        },
        {
          id: 'barcode_scanner',
          section: 'inventory_in',
          label: 'Barcode Scanner',
          icon: Barcode,
        },
        {
          id: 'qr_scanner',
          section: 'inventory_in',
          label: 'QR Scanner',
          icon: QrCode,
        },
        {
          id: 'manual_entry',
          section: 'inventory_in',
          label: 'Add Manually',
          icon: PlusCircle,
        },
        {
          id: 'scan_history',
          section: 'inventory_in',
          label: 'Scan History',
          icon: History,
          badge: scanHistoryCount > 0 ? scanHistoryCount : undefined,
        },
      ],
    },
    {
      id: 'inventory',
      index: 1,
      title: 'Live Inventory & Catalog',
      shortTitle: '2. Inventory',
      subtitle: 'Product Catalog · Stock Levels · Search & Filter',
      icon: Boxes,
      section: 'inventory',
      defaultSubView: 'inventory',
      badge: `${inventoryCount} Items`,
      badgeType: 'default',
      subViews: [
        {
          id: 'inventory',
          section: 'inventory',
          label: 'Products Catalog',
          icon: Boxes,
          badge: inventoryCount,
        },
        {
          id: 'categories',
          section: 'inventory',
          label: 'Categories',
          icon: Tag,
        },
      ],
    },
    {
      id: 'stock_ops',
      index: 2,
      title: 'Stock Operations',
      shortTitle: '3. In & Out',
      subtitle: 'Receive Stock · Dispatch Sales · Movement Ledger',
      icon: ArrowUpDown,
      section: 'inventory_in',
      defaultSubView: 'stock_in',
      subViews: [
        {
          id: 'stock_in',
          section: 'inventory_in',
          label: 'Receive Stock (In)',
          icon: ArrowDownLeft,
        },
        {
          id: 'stock_out',
          section: 'inventory_out',
          label: 'Dispatch / Sales (Out)',
          icon: ArrowUpRight,
        },
        {
          id: 'stock_ledger',
          section: 'inventory',
          label: 'Movement Ledger',
          icon: ScrollText,
        },
      ],
    },
    {
      id: 'alerts',
      index: 3,
      title: 'Expiry Radar & Alerts',
      shortTitle: '4. Alerts',
      subtitle: '30-Day Radar · Expiry Countdown · Low Stock',
      icon: AlertTriangle,
      section: 'inventory',
      defaultSubView: 'expiry_alerts',
      badge: alertCount > 0 ? `${alertCount} Alerts` : undefined,
      badgeType: alertCount > 0 ? 'warning' : 'default',
      subViews: [
        {
          id: 'expiry_alerts',
          section: 'inventory',
          label: 'Expiry Radar',
          icon: AlertTriangle,
          badge: alertCount > 0 ? alertCount : undefined,
        },
        {
          id: 'expiring_soon',
          section: 'inventory',
          label: 'Expiring Soon',
          icon: Clock,
        },
        {
          id: 'expired',
          section: 'inventory',
          label: 'Expired Quarantine',
          icon: AlertTriangle,
          badge: expiredCount > 0 ? expiredCount : undefined,
        },
        {
          id: 'low_stock',
          section: 'inventory',
          label: 'Low Stock',
          icon: Layers,
          badge: lowStockCount > 0 ? lowStockCount : undefined,
        },
      ],
    },
    {
      id: 'analytics',
      index: 4,
      title: 'Turnover & Reports',
      shortTitle: '5. Analytics',
      subtitle: 'Stock Velocity · Valuation · Product Ratings',
      icon: TrendingUp,
      section: 'inventory',
      defaultSubView: 'turnover',
      subViews: [
        {
          id: 'turnover',
          section: 'inventory',
          label: 'Turnover & Velocity',
          icon: TrendingUp,
        },
        {
          id: 'reputation',
          section: 'inventory',
          label: 'Product Reputation',
          icon: Sparkles,
        },
        {
          id: 'reports',
          section: 'inventory',
          label: 'Reports & Export',
          icon: BarChart3,
        },
      ],
    },
  ];

  const currentSlide = sliderPages[activeSlideIndex] || sliderPages[0];

  // Auto-scroll active tab into view horizontally on mobile
  useEffect(() => {
    if (activeTabRef.current && tabsScrollRef.current) {
      const container = tabsScrollRef.current;
      const tab = activeTabRef.current;
      const containerRect = container.getBoundingClientRect();
      const tabRect = tab.getBoundingClientRect();

      if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
        tab.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    }
  }, [activeSlideIndex]);

  const handlePrevSlide = () => {
    if (activeSlideIndex > 0) {
      const prevIndex = activeSlideIndex - 1;
      const targetPage = sliderPages[prevIndex];
      onSlideChange(prevIndex);
      onNavigate(targetPage.section, targetPage.defaultSubView);
    }
  };

  const handleNextSlide = () => {
    if (activeSlideIndex < sliderPages.length - 1) {
      const nextIndex = activeSlideIndex + 1;
      const targetPage = sliderPages[nextIndex];
      onSlideChange(nextIndex);
      onNavigate(targetPage.section, targetPage.defaultSubView);
    }
  };

  const handleSelectSlide = (page: SliderPageDefinition) => {
    onSlideChange(page.index);
    onNavigate(page.section, page.defaultSubView);
  };

  return (
    <div className="w-full mb-6 space-y-3">
      {/* 1. Main Functional Slider Tabs Track */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-2 sm:p-2.5">
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          {/* Slider Progress & Page Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-indigo-600" />
              Page {activeSlideIndex + 1}/{sliderPages.length}
            </span>
            <span className="text-xs font-bold text-slate-800 hidden sm:inline">
              {currentSlide.title}
            </span>
          </div>

          {/* Quick Prev / Next Arrows */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevSlide}
              disabled={activeSlideIndex === 0}
              className={`p-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 ${
                activeSlideIndex === 0
                  ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95'
              }`}
              title="Previous Slider Page"
              aria-label="Previous Slider Page"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden md:inline text-[11px]">Prev Page</span>
            </button>

            {/* Slider Dots */}
            <div className="flex items-center gap-1 px-1.5">
              {sliderPages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => handleSelectSlide(page)}
                  className={`transition-all rounded-full ${
                    page.index === activeSlideIndex
                      ? 'w-5 h-2 bg-indigo-600'
                      : 'w-2 h-2 bg-slate-200 hover:bg-slate-300'
                  }`}
                  title={`Go to ${page.title}`}
                  aria-label={`Go to ${page.title}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNextSlide}
              disabled={activeSlideIndex === sliderPages.length - 1}
              className={`p-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 ${
                activeSlideIndex === sliderPages.length - 1
                  ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95'
              }`}
              title="Next Slider Page"
              aria-label="Next Slider Page"
            >
              <span className="hidden md:inline text-[11px]">Next Page</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Slider Pages Tabs */}
        <div
          ref={tabsScrollRef}
          className="flex items-stretch gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth snap-x snap-mandatory"
        >
          {sliderPages.map((page) => {
            const Icon = page.icon;
            const isActive = page.index === activeSlideIndex;

            return (
              <button
                key={page.id}
                ref={isActive ? activeTabRef : null}
                type="button"
                onClick={() => handleSelectSlide(page)}
                className={`snap-start shrink-0 flex-1 min-w-[130px] sm:min-w-[160px] p-2 sm:p-2.5 rounded-xl border text-left transition-all duration-200 relative group cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-indigo-500/30'
                    : 'bg-slate-50/80 hover:bg-slate-100 text-slate-700 border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 group-hover:text-indigo-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {page.badge && (
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md tracking-tight ${
                        isActive
                          ? page.badgeType === 'warning'
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-white/20 text-white'
                          : page.badgeType === 'warning'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                      }`}
                    >
                      {page.badge}
                    </span>
                  )}
                </div>

                <div className="font-extrabold text-xs tracking-tight line-clamp-1">
                  {page.title}
                </div>

                {/* Active Indicator Underline */}
                {isActive && (
                  <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-indigo-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Secondary Sub-Function Switcher for the Active Slider Page */}
      <div className="bg-slate-200/60 p-1.5 rounded-xl flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto">

          {currentSlide.subViews.map((sub) => {
            const SubIcon = sub.icon;
            const isSubActive =
              activeSubView === sub.id ||
              (sub.id === 'multiple_image_scan' && activeSubView === 'multi_scan') ||
              (sub.id === 'expired' && activeSubView === 'expired_products');

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => onNavigate(sub.section, sub.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSubActive
                    ? 'bg-white text-indigo-700 shadow-sm shadow-slate-200 ring-1 ring-slate-200/80 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <SubIcon className={`w-3.5 h-3.5 ${isSubActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{sub.label}</span>
                {sub.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isSubActive
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {sub.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Contextual Action (e.g. Google Sheets on Inventory page) */}
        {activeSlideIndex === 1 && onOpenGoogleSheets && (
          <button
            type="button"
            onClick={onOpenGoogleSheets}
            className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1 rounded-lg transition-colors shrink-0"
            title="Open Google Sheets Sync & Backup"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Sheets Sync</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default AppSliderNavigation;
