/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Camera,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowUp,
  Store,
  Pill,
  Stethoscope,
  UtensilsCrossed,
  Hotel,
  BookOpen,
  HelpCircle,
  FileText,
  Lock,
  Cookie,
  Accessibility,
  Mail,
  Heart,
} from 'lucide-react';
import { AdSenseSlot } from '../ads/AdSenseSlot';

interface PublicFooterProps {
  currentPath: string;
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({
  currentPath,
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
    <footer className="bg-white border-t border-slate-200/90 text-slate-600 font-sans mt-20" aria-label="Publisher Footer">
      {/* Optional Safe Ad Slot on Approved Public Content Routes Only */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <AdSenseSlot currentPath={currentPath} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Column 1: Brand & Philosophy */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#1473EA] flex items-center justify-center text-white shadow-md shadow-[#1473EA]/20">
                <Camera className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-tight text-[#092B4C]">ScanMe</span>
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-[#1473EA]/10 text-[#1473EA]">
                  AI
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
              ScanMe AI is an on-device assisted inventory and product-management system built specifically for small retailers, grocery stores, pharmacies, restaurants, and medical shops. We eliminate manual typing and expired stock write-offs with real-time camera tracking and intelligent label parsing.
            </p>

            <div className="pt-1 flex flex-col space-y-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero client API key exposure • Local frame analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1473EA] shrink-0" />
                <span>Built for retail shops in Nepal and international small businesses</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onLaunchApp}
                className="px-4 py-2.5 rounded-xl bg-[#1473EA] hover:bg-blue-600 text-white text-xs font-black transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Open ScanMe AI Web App</span>
              </button>
            </div>
          </div>

          {/* Column 2: Product & Capabilities */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#092B4C]">
              Product &amp; Features
            </h3>
            <nav aria-label="Features navigation" className="flex flex-col space-y-2 text-xs">
              <a href="/features" onClick={(e) => handleLink(e, '/features')} className="hover:text-[#1473EA] transition-colors">
                All Features Overview
              </a>
              <a href="/how-it-works" onClick={(e) => handleLink(e, '/how-it-works')} className="hover:text-[#1473EA] transition-colors">
                How It Works (9 Steps)
              </a>
              <a href="/ai-product-scanning" onClick={(e) => handleLink(e, '/ai-product-scanning')} className="hover:text-[#1473EA] transition-colors">
                AI Product Scanner
              </a>
              <a href="/barcode-scanning" onClick={(e) => handleLink(e, '/barcode-scanning')} className="hover:text-[#1473EA] transition-colors">
                Barcode &amp; QR Reader
              </a>
              <a href="/expiry-management" onClick={(e) => handleLink(e, '/expiry-management')} className="hover:text-[#1473EA] transition-colors">
                Expiry Radar &amp; Alerts
              </a>
              <a href="/inventory-management" onClick={(e) => handleLink(e, '/inventory-management')} className="hover:text-[#1473EA] transition-colors">
                Digital Inventory Ledger
              </a>
              <a href="/faq" onClick={(e) => handleLink(e, '/faq')} className="hover:text-[#1473EA] transition-colors">
                Frequently Asked Questions
              </a>
            </nav>
          </div>

          {/* Column 3: Industry Solutions */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#092B4C]">
              Industry Solutions
            </h3>
            <nav aria-label="Solutions navigation" className="flex flex-col space-y-2 text-xs">
              <a href="/for-grocery-stores" onClick={(e) => handleLink(e, '/for-grocery-stores')} className="hover:text-[#1473EA] transition-colors flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                <span>Grocery &amp; Kirana Shops</span>
              </a>
              <a href="/for-pharmacies" onClick={(e) => handleLink(e, '/for-pharmacies')} className="hover:text-[#1473EA] transition-colors flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-blue-600" />
                <span>Retail Pharmacies</span>
              </a>
              <a href="/for-medical-stores" onClick={(e) => handleLink(e, '/for-medical-stores')} className="hover:text-[#1473EA] transition-colors flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                <span>Medical Supply Stores</span>
              </a>
              <a href="/for-restaurants" onClick={(e) => handleLink(e, '/for-restaurants')} className="hover:text-[#1473EA] transition-colors flex items-center gap-1.5">
                <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />
                <span>Restaurants &amp; Cafes</span>
              </a>
              <a href="/for-hotels" onClick={(e) => handleLink(e, '/for-hotels')} className="hover:text-[#1473EA] transition-colors flex items-center gap-1.5">
                <Hotel className="w-3.5 h-3.5 text-indigo-600" />
                <span>Hotels &amp; Lodges</span>
              </a>
              <a href="/guides" onClick={(e) => handleLink(e, '/guides')} className="hover:text-[#1473EA] transition-colors flex items-center gap-1.5 pt-1">
                <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                <span className="font-bold">Business Guides (10 Articles)</span>
              </a>
            </nav>
          </div>

          {/* Column 4: Trust, Company & Legal */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#092B4C]">
              Trust &amp; Legal
            </h3>
            <nav aria-label="Legal and Trust navigation" className="flex flex-col space-y-2 text-xs">
              <a href="/about" onClick={(e) => handleLink(e, '/about')} className="hover:text-[#1473EA] transition-colors">
                About ScanMe AI
              </a>
              <a href="/contact" onClick={(e) => handleLink(e, '/contact')} className="hover:text-[#1473EA] transition-colors">
                Contact &amp; Support
              </a>
              <a href="/privacy-policy" onClick={(e) => handleLink(e, '/privacy-policy')} className="hover:text-[#1473EA] transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" onClick={(e) => handleLink(e, '/terms')} className="hover:text-[#1473EA] transition-colors">
                Terms of Service
              </a>
              <a href="/cookie-policy" onClick={(e) => handleLink(e, '/cookie-policy')} className="hover:text-[#1473EA] transition-colors">
                Cookie Policy
              </a>
              <a href="/accessibility" onClick={(e) => handleLink(e, '/accessibility')} className="hover:text-[#1473EA] transition-colors">
                Accessibility Statement
              </a>
              <a href="/adsense-audit" onClick={(e) => handleLink(e, '/adsense-audit')} className="hover:text-[#1473EA] transition-colors text-slate-400">
                Compliance &amp; Ad Audit
              </a>
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} ScanMe AI. Designed for small retailers and local businesses.</p>

          <div className="flex items-center gap-4">
            <a href="https://scanme-ai.vercel.app/" className="hover:text-slate-600 transition-colors">
              https://scanme-ai.vercel.app
            </a>
            <button
              type="button"
              onClick={scrollToTop}
              className="hover:text-[#1473EA] transition-colors flex items-center gap-1 cursor-pointer font-bold"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Back to Top</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
