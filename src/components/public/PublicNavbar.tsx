/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Camera,
  Menu,
  X,
  ChevronDown,
  ArrowRight,
  Download,
  BookOpen,
  Sparkles,
  Barcode,
  Clock,
  Boxes,
  Store,
  Pill,
  Stethoscope,
  UtensilsCrossed,
  Hotel,
  ShieldCheck,
  HelpCircle,
  Info,
  Mail,
} from 'lucide-react';
import { LanguageSelectorButton } from '../common/LanguageSelectorButton';

interface PublicNavbarProps {
  currentPath: string;
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({
  currentPath,
  onNavigatePath,
  onLaunchApp,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [solutionsDropdownOpen, setSolutionsDropdownOpen] = useState(false);

  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    setSolutionsDropdownOpen(false);
    onNavigatePath(path);
  };

  const isSolutionsActive = [
    '/for-grocery-stores',
    '/for-pharmacies',
    '/for-medical-stores',
    '/for-restaurants',
    '/for-hotels',
  ].includes(currentPath);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <a
            href="/"
            onClick={(e) => handleLink(e, '/')}
            className="flex items-center gap-2.5 group cursor-pointer"
            title="ScanMe AI – Smart Retail & Inventory Scanner"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1473EA] to-indigo-600 flex items-center justify-center text-white shadow-md shadow-[#1473EA]/20 transition-transform group-hover:scale-105">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-black text-lg tracking-tight text-[#092B4C]">ScanMe</span>
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-[#1473EA]/10 text-[#1473EA] border border-[#1473EA]/20">
                  AI
                </span>
              </div>
              <p className="text-[10px] font-semibold text-slate-500 hidden sm:block mt-0.5">
                AI Inventory &amp; Expiry Assistant
              </p>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav aria-label="Main Navigation" className="hidden lg:flex items-center space-x-1">
            <a
              href="/"
              onClick={(e) => handleLink(e, '/')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                currentPath === '/'
                  ? 'text-[#1473EA] bg-blue-50/80 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Home
            </a>

            <a
              href="/features"
              onClick={(e) => handleLink(e, '/features')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                currentPath === '/features'
                  ? 'text-[#1473EA] bg-blue-50/80 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Features
            </a>

            <a
              href="/how-it-works"
              onClick={(e) => handleLink(e, '/how-it-works')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                currentPath === '/how-it-works'
                  ? 'text-[#1473EA] bg-blue-50/80 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              How It Works
            </a>

            {/* Solutions Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSolutionsDropdownOpen(!solutionsDropdownOpen)}
                onBlur={() => setTimeout(() => setSolutionsDropdownOpen(false), 200)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                  isSolutionsActive
                    ? 'text-[#1473EA] bg-blue-50/80 font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>Solutions</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${solutionsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {solutionsDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 rounded-2xl bg-white border border-slate-200/90 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <a
                    href="/for-grocery-stores"
                    onClick={(e) => handleLink(e, '/for-grocery-stores')}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 text-xs text-slate-700 font-bold transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <div>Grocery &amp; Kirana Stores</div>
                      <div className="text-[10px] text-slate-400 font-normal">FMCG &amp; daily staples</div>
                    </div>
                  </a>

                  <a
                    href="/for-pharmacies"
                    onClick={(e) => handleLink(e, '/for-pharmacies')}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 text-xs text-slate-700 font-bold transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div>
                      <div>Retail Pharmacies</div>
                      <div className="text-[10px] text-slate-400 font-normal">Batch &amp; expiry monitoring</div>
                    </div>
                  </a>

                  <a
                    href="/for-medical-stores"
                    onClick={(e) => handleLink(e, '/for-medical-stores')}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 text-xs text-slate-700 font-bold transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div>
                      <div>Medical Supply Stores</div>
                      <div className="text-[10px] text-slate-400 font-normal">Sterile goods &amp; supplies</div>
                    </div>
                  </a>

                  <a
                    href="/for-restaurants"
                    onClick={(e) => handleLink(e, '/for-restaurants')}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 text-xs text-slate-700 font-bold transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <UtensilsCrossed className="w-4 h-4" />
                    </div>
                    <div>
                      <div>Restaurants &amp; Cafes</div>
                      <div className="text-[10px] text-slate-400 font-normal">Fresh ingredient turnover</div>
                    </div>
                  </a>

                  <a
                    href="/for-hotels"
                    onClick={(e) => handleLink(e, '/for-hotels')}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 text-xs text-slate-700 font-bold transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Hotel className="w-4 h-4" />
                    </div>
                    <div>
                      <div>Hotels &amp; Lodges</div>
                      <div className="text-[10px] text-slate-400 font-normal">Minibar &amp; guest supplies</div>
                    </div>
                  </a>
                </div>
              )}
            </div>

            <a
              href="/expiry-management"
              onClick={(e) => handleLink(e, '/expiry-management')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                currentPath === '/expiry-management'
                  ? 'text-[#1473EA] bg-blue-50/80 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Expiry Tracking
            </a>

            <a
              href="/guides"
              onClick={(e) => handleLink(e, '/guides')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 ${
                currentPath.startsWith('/guides')
                  ? 'text-[#1473EA] bg-blue-50/80 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Guides</span>
            </a>

            <a
              href="/faq"
              onClick={(e) => handleLink(e, '/faq')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                currentPath === '/faq'
                  ? 'text-[#1473EA] bg-blue-50/80 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              FAQ
            </a>

            <a
              href="/about"
              onClick={(e) => handleLink(e, '/about')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                currentPath === '/about'
                  ? 'text-[#1473EA] bg-blue-50/80 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              About
            </a>

            <a
              href="/contact"
              onClick={(e) => handleLink(e, '/contact')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                currentPath === '/contact'
                  ? 'text-[#1473EA] bg-blue-50/80 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Contact
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelectorButton variant="compact" />

            <a
              href="https://github.com/ab123170-max/Manager-/releases/latest/download/scanme-ai.apk"
              download
              className="hidden sm:inline-flex px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors items-center gap-1.5"
              title="Download ScanMe AI Android APK"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Get APK</span>
            </a>

            <button
              type="button"
              onClick={onLaunchApp}
              className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-[#1473EA] to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md shadow-[#1473EA]/25 flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <span>Start Scanning</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Toggle mobile navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200/90 bg-white px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-2 gap-1 pb-2 border-b border-slate-100">
            <a
              href="/"
              onClick={(e) => handleLink(e, '/')}
              className={`p-2 rounded-xl text-xs font-bold ${
                currentPath === '/' ? 'text-[#1473EA] bg-blue-50 font-black' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Home
            </a>
            <a
              href="/features"
              onClick={(e) => handleLink(e, '/features')}
              className={`p-2 rounded-xl text-xs font-bold ${
                currentPath === '/features' ? 'text-[#1473EA] bg-blue-50 font-black' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Features
            </a>
            <a
              href="/how-it-works"
              onClick={(e) => handleLink(e, '/how-it-works')}
              className={`p-2 rounded-xl text-xs font-bold ${
                currentPath === '/how-it-works' ? 'text-[#1473EA] bg-blue-50 font-black' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              How It Works
            </a>
            <a
              href="/expiry-management"
              onClick={(e) => handleLink(e, '/expiry-management')}
              className={`p-2 rounded-xl text-xs font-bold ${
                currentPath === '/expiry-management' ? 'text-[#1473EA] bg-blue-50 font-black' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Expiry Radar
            </a>
            <a
              href="/guides"
              onClick={(e) => handleLink(e, '/guides')}
              className={`p-2 rounded-xl text-xs font-bold ${
                currentPath.startsWith('/guides') ? 'text-[#1473EA] bg-blue-50 font-black' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Guides (10)
            </a>
            <a
              href="/faq"
              onClick={(e) => handleLink(e, '/faq')}
              className={`p-2 rounded-xl text-xs font-bold ${
                currentPath === '/faq' ? 'text-[#1473EA] bg-blue-50 font-black' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              FAQ
            </a>
            <a
              href="/about"
              onClick={(e) => handleLink(e, '/about')}
              className={`p-2 rounded-xl text-xs font-bold ${
                currentPath === '/about' ? 'text-[#1473EA] bg-blue-50 font-black' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              About
            </a>
            <a
              href="/contact"
              onClick={(e) => handleLink(e, '/contact')}
              className={`p-2 rounded-xl text-xs font-bold ${
                currentPath === '/contact' ? 'text-[#1473EA] bg-blue-50 font-black' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Contact
            </a>
          </div>

          <div className="pt-2">
            <p className="text-[10px] uppercase font-bold text-slate-400 px-2 mb-1">Industry Solutions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
              <a
                href="/for-grocery-stores"
                onClick={(e) => handleLink(e, '/for-grocery-stores')}
                className="p-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2"
              >
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                <span>For Grocery &amp; Kirana Stores</span>
              </a>
              <a
                href="/for-pharmacies"
                onClick={(e) => handleLink(e, '/for-pharmacies')}
                className="p-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2"
              >
                <Pill className="w-3.5 h-3.5 text-blue-600" />
                <span>For Retail Pharmacies</span>
              </a>
              <a
                href="/for-medical-stores"
                onClick={(e) => handleLink(e, '/for-medical-stores')}
                className="p-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2"
              >
                <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                <span>For Medical Supply Stores</span>
              </a>
              <a
                href="/for-restaurants"
                onClick={(e) => handleLink(e, '/for-restaurants')}
                className="p-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2"
              >
                <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />
                <span>For Restaurants &amp; Cafes</span>
              </a>
              <a
                href="/for-hotels"
                onClick={(e) => handleLink(e, '/for-hotels')}
                className="p-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2"
              >
                <Hotel className="w-3.5 h-3.5 text-indigo-600" />
                <span>For Hotels &amp; Hospitality</span>
              </a>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onLaunchApp();
              }}
              className="w-full py-2.5 rounded-xl text-xs font-black bg-[#1473EA] text-white flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Launch Live Scanner App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <a
              href="https://github.com/ab123170-max/Manager-/releases/latest/download/scanme-ai.apk"
              download
              className="w-full py-2 rounded-xl text-xs font-bold text-center bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Download Android APK
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
