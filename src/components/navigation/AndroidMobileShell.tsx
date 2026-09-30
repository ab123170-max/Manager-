import React, { useEffect, useState } from 'react';
import {
  Menu,
  X,
  ScanLine,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  MoreHorizontal,
  Settings,
  User,
  LogOut,
  Languages,
  FileSpreadsheet,
  HelpCircle,
  ChevronRight,
  Home,
} from 'lucide-react';
import { AppSubView, MenuSection, UserProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface AndroidMobileShellProps {
  activeSection: MenuSection;
  activeSubView: AppSubView;
  onNavigate: (section: MenuSection, subView: AppSubView) => void;
  userProfile?: UserProfile | null;
  onEditProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenGoogleSheets?: () => void;
  onShowOnboarding?: () => void;
  onLogout?: () => void;
}

const PRIMARY_ITEMS = [
  { id: 'home', label: 'Home', icon: Home, section: 'inventory' as MenuSection, subView: 'inventory' as AppSubView },
  { id: 'scan', label: 'Scan', icon: ScanLine, section: 'inventory_in' as MenuSection, subView: 'scan_product' as AppSubView },
  { id: 'inventory', label: 'Inventory', icon: Package, section: 'inventory' as MenuSection, subView: 'inventory' as AppSubView },
  { id: 'receive', label: 'Receive Stock', icon: ArrowDownToLine, section: 'inventory_in' as MenuSection, subView: 'stock_in' as AppSubView },
  { id: 'sell', label: 'Sell / Dispatch', icon: ArrowUpFromLine, section: 'inventory_out' as MenuSection, subView: 'stock_out' as AppSubView },
] as const;

export const AndroidMobileShell: React.FC<AndroidMobileShellProps> = ({
  activeSection,
  activeSubView,
  onNavigate,
  userProfile,
  onEditProfile,
  onOpenSettings,
  onOpenGoogleSheets,
  onShowOnboarding,
  onLogout,
}) => {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  const navigate = (section: MenuSection, subView: AppSubView) => {
    onNavigate(section, subView);
    setOpen(false);
    setMoreOpen(false);
  };

  const titleMap: Record<string, string> = {
    inventory: 'Home',
    scan_product: 'Scan Product',
    barcode_scanner: 'Barcode Scanner',
    qr_scanner: 'QR Scanner',
    manual_entry: 'Add Product',
    stock_in: 'Receive Stock',
    stock_out: 'Sell / Dispatch',
    turnover: 'Turnover',
    low_stock: 'Low Stock',
    expiring_soon: 'Expiring Soon',
    expired: 'Expired',
    expiry_alerts: 'Expiry Alerts',
    categories: 'Categories',
    reports: 'Reports',
    accounting: 'Valuation',
    stock_ledger: 'Stock Ledger',
    reputation: 'Product Reputation',
    scan_history: 'Scan History',
  };

  const title = titleMap[activeSubView] || 'ScanMe AI';

  return (
    <>
      <header className="android-appbar">
        <button
          type="button"
          className="android-icon-button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="android-appbar-title">
          <div className="android-brand-dot">S</div>
          <div className="min-w-0">
            <div className="android-title">{title}</div>
            <div className="android-subtitle">ScanMe AI</div>
          </div>
        </div>

        <button
          type="button"
          className="android-avatar-button"
          onClick={() => setOpen(true)}
          aria-label="Open account menu"
        >
          {userProfile?.profile_image_url ? (
            <img src={userProfile.profile_image_url} alt="" />
          ) : (
            <User className="w-4 h-4" />
          )}
        </button>
      </header>

      {open && (
        <div className="android-nav-layer" role="dialog" aria-modal="true">
          <button className="android-nav-backdrop" onClick={() => setOpen(false)} aria-label="Close navigation" />
          <aside className="android-nav-sheet">
            <div className="android-nav-header">
              <div className="flex items-center gap-3 min-w-0">
                <div className="android-brand-large">S</div>
                <div className="min-w-0">
                  <div className="text-base font-black text-slate-950 truncate">ScanMe AI</div>
                  <div className="text-[11px] text-slate-500 truncate">Simple inventory management</div>
                </div>
              </div>
              <button className="android-icon-button" onClick={() => setOpen(false)} aria-label="Close navigation">
                <X className="w-5 h-5" />
              </button>
            </div>

            {userProfile && (
              <div className="android-account-card">
                <div className="android-avatar-large">
                  {userProfile.profile_image_url ? (
                    <img src={userProfile.profile_image_url} alt="" />
                  ) : (
                    userProfile.full_name?.charAt(0).toUpperCase() || <User className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold truncate">{userProfile.full_name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{userProfile.email}</div>
                </div>
              </div>
            )}

            <div className="android-nav-list">
              {PRIMARY_ITEMS.map((item) => {
                const Icon = item.icon;
                const active =
                  (item.id === 'scan' && ['scan_product','barcode_scanner','qr_scanner','manual_entry','multi_scan','multiple_image_scan','scan_history'].includes(activeSubView)) ||
                  (item.id === 'receive' && activeSubView === 'stock_in') ||
                  (item.id === 'sell' && activeSubView === 'stock_out') ||
                  (item.id === 'inventory' && activeSection === 'inventory' && activeSubView !== 'inventory_in') ||
                  (item.id === 'home' && activeSection === 'inventory' && activeSubView === 'inventory');
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`android-nav-item ${active ? 'is-active' : ''}`}
                    onClick={() => navigate(item.section, item.subView)}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                    <ChevronRight className="ml-auto w-4 h-4 opacity-40" />
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className={`android-more-toggle ${moreOpen ? 'is-open' : ''}`}
              onClick={() => setMoreOpen((value) => !value)}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span>More</span>
              <ChevronRight className={`ml-auto w-4 h-4 transition-transform ${moreOpen ? 'rotate-90' : ''}`} />
            </button>

            <div className={`android-more-panel ${moreOpen ? 'is-open' : ''}`}>
              <button onClick={() => navigate('inventory', 'low_stock')}><Package /> Low Stock</button>
              <button onClick={() => navigate('inventory', 'expiry_alerts')}><HelpCircle /> Expiry Alerts</button>
              <button onClick={() => navigate('inventory', 'reports')}><FileSpreadsheet /> Reports</button>
              <button onClick={() => navigate('inventory', 'stock_ledger')}><FileSpreadsheet /> Stock Ledger</button>
              {onEditProfile && <button onClick={() => { setOpen(false); onEditProfile(); }}><User /> Profile</button>}
              {onOpenSettings && <button onClick={() => { setOpen(false); onOpenSettings(); }}><Settings /> Settings</button>}
              {onOpenGoogleSheets && <button onClick={() => { setOpen(false); onOpenGoogleSheets(); }}><FileSpreadsheet /> Google Sheets</button>}
              {onShowOnboarding && <button onClick={() => { setOpen(false); onShowOnboarding(); }}><HelpCircle /> Feature Tour</button>}
              <button onClick={() => { setOpen(false); onLogout?.(); }} className="danger"><LogOut /> {t('auth.logout')}</button>
            </div>

            <div className="android-nav-tip">
              <ScanLine className="w-4 h-4" />
              <span>Use <b>Scan</b> for the fastest way to add a product.</span>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
