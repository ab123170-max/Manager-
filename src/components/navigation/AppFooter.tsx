/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Camera,
  Barcode,
  QrCode,
  Box,
  Layers,
  Sparkles,
  Zap,
  ArrowUp,
  ShieldCheck,
} from 'lucide-react';
import { MenuSection, AppSubView } from '../../types';

interface AppFooterProps {
  onNavigate?: (section: MenuSection, subView: AppSubView) => void;
}

export const AppFooter: React.FC<AppFooterProps> = ({ onNavigate }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNav = (section: MenuSection, subView: AppSubView) => {
    if (onNavigate) {
      onNavigate(section, subView);
    }
    scrollToTop();
  };

  return (
    <footer
      className="mt-16 bg-white border-t border-slate-200/90 text-slate-600 font-sans"
      aria-label="ScanMe AI Site Footer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Overview */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-xs">
                <Zap className="w-4 h-4 text-indigo-100" />
              </div>
              <span className="font-extrabold text-base text-slate-900 tracking-tight">
                ScanMe AI
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200/60">
                AI Product Scanner
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-md leading-relaxed">
              ScanMe AI provides high-precision AI product scanning, multimodal packaging OCR, and image-to-form autofill for retailers, warehouses, and inventory managers.
            </p>
            <div className="flex items-center gap-3 pt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero Server Key Exposure</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Multi-Shot Vision Engine</span>
              </span>
            </div>
          </div>

          {/* Scanner Modes */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Scanner Modes
            </h3>
            <nav aria-label="Scanner Modes Navigation" className="flex flex-col space-y-2 text-xs">
              <button
                type="button"
                onClick={() => handleNav('inventory_in', 'scan_product')}
                className="text-left text-slate-600 hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>AI Camera Scanner</span>
              </button>
              <button
                type="button"
                onClick={() => handleNav('inventory_in', 'barcode_scanner')}
                className="text-left text-slate-600 hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Barcode className="w-3.5 h-3.5" />
                <span>Barcode Scanner</span>
              </button>
              <button
                type="button"
                onClick={() => handleNav('inventory_in', 'qr_scanner')}
                className="text-left text-slate-600 hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Code Scanner</span>
              </button>
              <button
                type="button"
                onClick={() => handleNav('inventory_in', 'manual_entry')}
                className="text-left text-slate-600 hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Box className="w-3.5 h-3.5" />
                <span>Manual Product Entry</span>
              </button>
            </nav>
          </div>

          {/* Quick Links & Resources */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Navigation &amp; FAQ
            </h3>
            <nav aria-label="Footer Quick Links" className="flex flex-col space-y-2 text-xs">
              <a
                href="#seo-overview"
                className="text-slate-600 hover:text-indigo-600 transition-colors"
              >
                About ScanMe AI
              </a>
              <a
                href="#faq"
                className="text-slate-600 hover:text-indigo-600 transition-colors"
              >
                Frequently Asked Questions
              </a>
              <button
                type="button"
                onClick={() => handleNav('inventory', 'inventory')}
                className="text-left text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Inventory Overview
              </button>
              <button
                type="button"
                onClick={scrollToTop}
                className="text-left text-slate-600 hover:text-indigo-600 transition-colors flex items-center gap-1 pt-1 cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Back to Top</span>
              </button>
            </nav>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} ScanMe AI. All rights reserved. AI Product Scanner &amp; Image to Form Autofill.</p>
          <div className="flex items-center gap-4">
            <a href="https://scanme-ai.vercel.app/" className="hover:text-slate-600 transition-colors">
              https://scanme-ai.vercel.app/
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
