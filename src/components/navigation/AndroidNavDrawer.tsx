/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Camera,
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  Barcode,
  QrCode,
  Layers,
  History,
  Package,
  AlertTriangle,
  Clock,
  Skull,
  Tag,
  BarChart3,
  TrendingUp,
  FileText,
  X,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Zap,
  ScrollText,
  User,
  LogOut,
  HelpCircle,
  Globe,
  Settings,
} from 'lucide-react';
import { MenuSection, AppSubView, UserProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface NavItem {
  id: AppSubView;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
  description?: string;
  group?: string;
}

interface NavSection {
  id: MenuSection;
  title: string;
  subtitle?: string;
  emoji: string;
  icon: React.ElementType;
  items: NavItem[];
}

interface AndroidNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: MenuSection;
  activeSubView: AppSubView;
  onNavigate: (section: MenuSection, subView: AppSubView) => void;
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
  userProfile?: UserProfile | null;
  onEditProfile?: () => void;
  onShowOnboarding?: () => void;
  onLogout?: () => void;
  onOpenSettings?: () => void;
}

export const AndroidNavDrawer: React.FC<AndroidNavDrawerProps> = ({
  isOpen,
  onClose,
  activeSection,
  activeSubView,
  onNavigate,
  badges,
  counts,
  userProfile,
  onEditProfile,
  onShowOnboarding,
  onLogout,
  onOpenSettings,
}) => {
  const { t, languageOption, openLanguageSelector } = useLanguage();
  const effectiveBadges = {
    totalProducts: badges?.totalProducts ?? counts?.products,
    lowStock: badges?.lowStock ?? counts?.lowStock,
    expiringSoon: badges?.expiringSoon ?? counts?.expiring,
    expired: badges?.expired ?? counts?.expired,
  };

  const getInitialSection = (sec: MenuSection): MenuSection => {
    if (sec === 'scanner') return 'inventory_in';
    return sec;
  };

  const [expandedSection, setExpandedSection] = useState<MenuSection>(getInitialSection(activeSection));

  const toggleSection = (section: MenuSection) => {
    setExpandedSection((prev) => (prev === section ? section : section));
  };

  // Synchronized Inventory hierarchy: Inventory In (with Scanner) & Inventory Out as sub-menus
  const menuSections: NavSection[] = [
    {
      id: 'inventory_in',
      title: 'INVENTORY IN',
      subtitle: 'Sub-Menu of Inventory · Receiving & Intake',
      emoji: '📥',
      icon: ArrowDownLeft,
      items: [
        // Scanner inside Inventory In!
        { id: 'scan_product', label: 'Scan Product (AI Multi-Shot)', icon: Camera, group: 'Scanner (Intake Suite)', description: 'AI Packaging Label Vision & MFD/EXP' },
        { id: 'barcode_scanner', label: 'Barcode Scanner', icon: Barcode, group: 'Scanner (Intake Suite)', description: 'Real-time 1D EAN/UPC hardware detection' },
        { id: 'qr_scanner', label: 'QR Scanner', icon: QrCode, group: 'Scanner (Intake Suite)', description: 'Instant QR code & matrix parser' },
        { id: 'manual_entry', label: 'Add Product Manually', icon: PlusCircle, group: 'Scanner (Intake Suite)', description: 'Direct form input with auto date calculations' },
        { id: 'multi_scan', label: 'Multiple Image Scan', icon: Layers, group: 'Scanner (Intake Suite)', description: 'Multi-angle batch package capture' },
        { id: 'scan_history', label: 'Scan History', icon: History, group: 'Scanner (Intake Suite)', description: 'Recent scans & detection log' },
        // Inward stock operations
        { id: 'stock_in', label: 'Receive Stock (Stock In)', icon: ArrowDownLeft, group: 'Inward Stock Operations', description: 'Purchases, vendor deliveries & restock' },
        { id: 'stock_ledger', label: 'Inward Stock Movement Ledger', icon: ScrollText, group: 'Inward Stock Operations', description: 'History of inbound stock transactions' },
      ],
    },
    {
      id: 'inventory_out',
      title: 'INVENTORY OUT',
      subtitle: 'Sub-Menu of Inventory · Dispatches & Orders',
      emoji: '📤',
      icon: ArrowUpRight,
      items: [
        { id: 'stock_out', label: 'Dispatch Stock (Stock Out)', icon: ArrowUpRight, description: 'Customer sales, POS dispatch & write-offs' },
        { id: 'stock_ledger', label: 'Outward Stock Movement Ledger', icon: ScrollText, description: 'History of outbound stock transactions' },
      ],
    },
    {
      id: 'inventory',
      title: 'INVENTORY OVERVIEW & HEALTH',
      subtitle: 'Master Inventory Management',
      emoji: '📦',
      icon: Boxes,
      items: [
        { id: 'inventory', label: 'Inventory Overview', icon: Boxes, badge: effectiveBadges.totalProducts },
        { id: 'turnover', label: 'Turnover & Velocity', icon: TrendingUp, description: 'Turnover ratio, DSI days & velocity tier' },
        { id: 'reputation', label: 'Product Reputation', icon: ShieldCheck, description: 'Customer ratings, trust score & badges' },
        { id: 'products', label: 'Products Catalog', icon: Package },
        { id: 'stock_ledger', label: 'Complete Movement Ledger', icon: ScrollText, description: 'Audit trail of every stock transaction' },
        {
          id: 'low_stock',
          label: 'Low Stock Alerts',
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
        {
          id: 'expiry_alerts',
          label: 'Expiry Alerts',
          icon: AlertTriangle,
          badgeColor: 'bg-amber-600 text-white',
        },
        { id: 'categories', label: 'Categories', icon: Tag },
        { id: 'reports', label: 'Inventory Reports', icon: BarChart3 },
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
      <aside className="relative w-84 max-w-[85vw] bg-white h-full flex flex-col shadow-2xl border-r border-slate-200 z-10 animate-in slide-in-from-left duration-250">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 pt-6 pb-5 flex flex-col justify-between border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
                <Zap className="w-5 h-5 text-indigo-200" />
              </div>
              <div>
                <h2 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                  ScanMe AI
                </h2>
                <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> AI Product Scanner &amp; Inventory
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

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Structure: <strong>Inventory Hierarchy</strong></span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
              Synced
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 min-h-0 overflow-y-auto py-3 px-3 space-y-2 overscroll-contain">
          {menuSections.map((section) => {
            const isExpanded = expandedSection === section.id;
            const isCurrentSection =
              activeSection === section.id ||
              (section.id === 'inventory_in' && activeSection === 'scanner');

            return (
              <div
                key={section.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isCurrentSection
                    ? 'border-indigo-300/80 bg-indigo-50/20 shadow-2xs'
                    : 'border-slate-200/60 bg-white'
                }`}
              >
                {/* Section Accordion Trigger */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 text-left font-bold text-xs uppercase tracking-wider transition-colors ${
                    isCurrentSection ? 'text-indigo-950' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{section.emoji}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black truncate">{section.title}</span>
                        {section.subtitle?.includes('Sub-Menu') && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 normal-case">
                            Sub-Menu
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {/* Sub-menu items */}
                {isExpanded && (
                  <div className="px-2 pb-2.5 pt-1 space-y-1">
                    {section.items.map((item, idx) => {
                      const isScannerItem =
                        section.id === 'inventory_in' &&
                        [
                          'scan_product',
                          'barcode_scanner',
                          'qr_scanner',
                          'manual_entry',
                          'multi_scan',
                          'scan_history',
                        ].includes(item.id);

                      const isActive =
                        activeSubView === item.id ||
                        (activeSection === section.id && activeSubView === item.id);

                      const IconComponent = item.icon;

                      // Check if we need group heading
                      const showGroupHeader =
                        item.group &&
                        (idx === 0 || section.items[idx - 1].group !== item.group);

                      return (
                        <React.Fragment key={item.id}>
                          {showGroupHeader && (
                            <div className="pt-2.5 pb-1 px-2 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500 border-t border-slate-100 first:border-t-0">
                              <span className="flex items-center gap-1 text-slate-700">
                                {item.group?.includes('Scanner') ? '📷' : '📥'} {item.group}
                              </span>
                              {item.group?.includes('Scanner') && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 normal-case">
                                  Inside Inventory In
                                </span>
                              )}
                            </div>
                          )}

                          <button
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
                              <div className="text-left min-w-0">
                                <span className="truncate block">{item.label}</span>
                                {item.description && !isActive && (
                                  <span className="text-[10px] text-slate-400 truncate block font-normal">
                                    {item.description}
                                  </span>
                                )}
                              </div>
                            </div>

                            {item.badge !== undefined && (
                              <span
                                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 ${
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
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* User Account & Actions Footer */}
        <div className="shrink-0 p-3.5 border-t border-slate-200 bg-slate-50 space-y-2.5">
          {userProfile && (
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-slate-500 font-bold text-xs">
                  {userProfile.profile_image_url ? (
                    <img
                      src={userProfile.profile_image_url}
                      alt={userProfile.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    userProfile.full_name.charAt(0).toUpperCase() || <User className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-xs font-bold text-[#092B4C] truncate">{userProfile.full_name}</p>
                  <p className="text-[10px] text-slate-400 truncate">@{userProfile.username}</p>
                </div>
              </div>

              {onEditProfile && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditProfile();
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-[#1473EA] hover:bg-slate-100 transition-colors shrink-0"
                  title="Edit Profile"
                >
                  <User className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Language Selector Row */}
          <button
            type="button"
            onClick={() => {
              openLanguageSelector();
            }}
            id="drawer-language-btn"
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-100/80 transition-colors shadow-2xs group"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Globe className="w-4 h-4 text-indigo-600" />
              <span>{t('settings.language')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 group-hover:text-indigo-800">
              <span>{languageOption.flag} {languageOption.name}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </button>

          {/* Settings Row */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              id="drawer-settings-btn"
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-100/80 transition-colors shadow-2xs text-xs font-bold text-slate-800 group"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-600 group-hover:text-slate-900" />
                <span>{t('settings.title')}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}

          <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
            {onShowOnboarding ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onShowOnboarding();
                }}
                className="text-[11px] font-semibold text-slate-500 hover:text-[#1473EA] flex items-center gap-1 transition-colors"
              >
                <HelpCircle className="w-3 h-3 text-[#1473EA]" />
                <span>Feature Tour</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium">SmartStock AI</span>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="w-full sm:w-auto justify-center text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors hover:bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg bg-white"
              >
                <LogOut className="w-3 h-3" />
                <span>{t('auth.logout')}</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};
