/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Camera,
  Barcode,
  Clock,
  Boxes,
  HelpCircle,
  ArrowUp,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface PublicSeoFooterProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicSeoFooter: React.FC<PublicSeoFooterProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    onNavigatePath(path);
    scrollToTop();
  };

  return (
    <footer className="mt-16 bg-white border-t border-slate-200/90 text-slate-600 font-sans" aria-label="Site Footer">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Column 1: Brand & Identity */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                <Camera className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-base text-slate-900 tracking-tight">ScanMe AI</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              AI-powered product scanner and inventory manager. Automatically extracts product information, scans barcodes and QR codes, tracks expiry dates, and streamlines retail stock management.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zero-exposure API Proxy</span>
            </div>
          </div>

          {/* Column 2: Public SEO Pages (Internal Linking) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Core Capabilities
            </h3>
            <nav aria-label="Core Capabilities Links" className="flex flex-col space-y-2 text-xs">
              <a
                href="/ai-product-scanner"
                onClick={(e) => handleLink(e, '/ai-product-scanner')}
                className="hover:text-indigo-600 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>AI Product Scanner</span>
              </a>
              <a
                href="/barcode-scanner"
                onClick={(e) => handleLink(e, '/barcode-scanner')}
                className="hover:text-indigo-600 transition-colors flex items-center gap-1.5"
              >
                <Barcode className="w-3.5 h-3.5 text-slate-500" />
                <span>Barcode &amp; QR Scanner</span>
              </a>
              <a
                href="/expiry-date-scanner"
                onClick={(e) => handleLink(e, '/expiry-date-scanner')}
                className="hover:text-indigo-600 transition-colors flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Expiry Date Scanner</span>
              </a>
              <a
                href="/inventory-management"
                onClick={(e) => handleLink(e, '/inventory-management')}
                className="hover:text-indigo-600 transition-colors flex items-center gap-1.5"
              >
                <Boxes className="w-3.5 h-3.5 text-blue-500" />
                <span>Inventory Management</span>
              </a>
              <a
                href="/faq"
                onClick={(e) => handleLink(e, '/faq')}
                className="hover:text-indigo-600 transition-colors flex items-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5 text-purple-500" />
                <span>Frequently Asked Questions</span>
              </a>
            </nav>
          </div>

          {/* Column 3: Feature Highlights */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Key Features
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Multi-shot packaging OCR</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Automatic MFD &amp; EXP detection</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>30-Day early expiration warnings</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Real-time stock ledger &amp; valuation</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>High-speed browser barcode reader</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Quick Action & Back to Top */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Get Started
            </h3>
            <p className="text-xs text-slate-500">
              Automate your stock reception, eliminate manual entry, and prevent product spoilage today.
            </p>
            <button
              type="button"
              onClick={onLaunchApp}
              className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Try ScanMe AI Free</span>
            </button>
            <button
              type="button"
              onClick={scrollToTop}
              className="w-full text-center text-xs text-slate-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1 pt-1 cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Back to Top</span>
            </button>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} ScanMe AI. AI Product Scanner &amp; Inventory Manager. All rights reserved.</p>
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
