/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Menu, Camera, Zap, Bell, Settings } from 'lucide-react';
import { MenuSection, AppSubView, UserProfile } from '../../types';
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

const getTitle = (activeSection: MenuSection, activeSubView: AppSubView) => {
  if (activeSubView === 'home') return 'Home';
  if (['scan_product','manual_entry','barcode_scanner','qr_scanner','multi_scan','multiple_image_scan'].includes(activeSubView)) return 'Scan';
  if (['inventory','products','categories','low_stock','expiring_soon','expired','expiry_alerts','turnover','reputation','accounting'].includes(activeSubView)) return 'Inventory';
  if (activeSubView === 'reports') return 'Reports';
  if (activeSubView === 'scan_history') return 'Scan History';
  if (activeSubView === 'stock_in') return 'Stock In';
  if (activeSubView === 'stock_out') return 'Stock Out';
  if (activeSubView === 'stock_ledger') return 'Stock History';
  return activeSection === 'inventory_in' ? 'Stock In' : activeSection === 'inventory_out' ? 'Stock Out' : 'ScanMe AI';
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeSection,
  activeSubView,
  onNavigate,
  onOpenDrawer,
  onToggleDrawer,
  alertCount = 0,
  userProfile,
  onEditProfile,
  onOpenSettings,
}) => {
  const handleDrawer = onOpenDrawer || onToggleDrawer || (() => {});
  const title = getTitle(activeSection, activeSubView);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
      <div className="h-14 max-w-7xl mx-auto px-3 sm:px-5 flex items-center gap-2">
        <button
          type="button"
          onClick={handleDrawer}
          className="w-10 h-10 rounded-xl bg-slate-100 active:scale-95 transition-transform flex items-center justify-center text-slate-700 shrink-0"
          aria-label="Open More menu"
          title="More"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img
            src="/favicon.png"
            alt="ScanMe AI Logo"
            className="w-8 h-8 rounded-lg object-cover shadow-sm shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-500 leading-none">ScanMe AI</div>
            <div className="text-sm font-extrabold text-slate-900 truncate leading-tight">{title}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {alertCount > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('inventory', 'expiry_alerts')}
              className="relative w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center active:scale-95 transition-transform"
              aria-label={`${alertCount} alerts`}
              title="Alerts"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white">
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate('inventory_in', 'scan_product')}
            className="h-10 px-3 rounded-xl bg-[#1473EA] text-white flex items-center gap-1.5 text-xs font-extrabold shadow-sm active:scale-95 transition-transform"
            aria-label="Scan product"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden xs:inline">Scan</span>
          </button>

          <div className="hidden sm:block">
            <LanguageSelectorButton variant="pill" />
          </div>

          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="hidden md:flex w-10 h-10 rounded-xl bg-slate-100 text-slate-600 items-center justify-center active:scale-95 transition-transform"
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {userProfile && onEditProfile && (
            <button
              type="button"
              onClick={onEditProfile}
              className="hidden sm:flex w-9 h-9 rounded-full overflow-hidden bg-blue-100 border border-blue-200 items-center justify-center text-[#1473EA] font-bold text-xs"
              aria-label="Profile"
              title="Profile"
            >
              {userProfile.profile_image_url ? (
                <img src={userProfile.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                userProfile.full_name?.charAt(0).toUpperCase() || 'U'
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
