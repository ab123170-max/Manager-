/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Camera, Sparkles, LogIn, ArrowRight } from 'lucide-react';
import { LanguageSelectorButton } from '../common/LanguageSelectorButton';

interface PublicSeoNavbarProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
  onLogin: () => void;
  currentPath?: string;
}

export const PublicSeoNavbar: React.FC<PublicSeoNavbarProps> = ({
  onNavigatePath,
  onLaunchApp,
  onLogin,
  currentPath = '/',
}) => {
  const navItems = [
    { label: 'Overview', path: '/' },
    { label: 'AI Scanner', path: '/ai-product-scanner' },
    { label: 'Barcode Scanner', path: '/barcode-scanner' },
    { label: 'Expiry Tracking', path: '/expiry-date-scanner' },
    { label: 'Inventory', path: '/inventory-management' },
    { label: 'FAQ', path: '/faq' },
  ];

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    onNavigatePath(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 py-3 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <a
          href="/"
          onClick={(e) => handleLinkClick(e, '/')}
          className="flex items-center gap-2.5 group cursor-pointer text-decoration-none"
          title="ScanMe AI Homepage"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-600 group-hover:bg-indigo-700 flex items-center justify-center text-white shadow-sm shadow-indigo-600/25 transition-colors">
            <Camera className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-black text-base tracking-tight text-slate-900">ScanMe</span>
              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                AI
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-500 hidden sm:block mt-0.5">
              Product Scanner &amp; Inventory Manager
            </p>
          </div>
        </a>

        {/* Public Desktop Navigation Links (Crawlable) */}
        <nav aria-label="Public SEO Navigation" className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => handleLinkClick(e, item.path)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSelectorButton variant="compact" />

          <button
            type="button"
            onClick={onLogin}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Sign In</span>
          </button>

          <button
            type="button"
            onClick={onLaunchApp}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-600/30 flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <span>Launch App</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
