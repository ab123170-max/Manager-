/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  Camera,
  Sparkles,
  Barcode,
  Clock,
  Boxes,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Store,
  Pill,
  UtensilsCrossed,
  Hotel,
  Layers,
  Smartphone,
  Eye,
  FileText,
  RotateCw,
  TrendingUp,
  Globe2,
  Zap,
} from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { AdSenseSlot } from '../../ads/AdSenseSlot';

interface PublicHomePageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicHomePage: React.FC<PublicHomePageProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  useEffect(() => {
    updateDocumentSeo({
      title: 'ScanMe AI – AI Inventory Management & Product Scanner for Small Business',
      description:
        'Scan products, track inventory, and never miss an expiry date. Free AI camera scanner, barcode reader, and stock ledger for grocery stores, pharmacies, and small retailers.',
      canonicalUrl: 'https://scanme-ai.vercel.app/',
      ogTitle: 'ScanMe AI – AI Inventory Management & Product Scanner',
      ogDescription:
        'Transform your smartphone camera into an AI product scanner. Extract names, prices, MFD, and EXP automatically. Free for small businesses.',
      schemaJson: {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'ScanMe AI',
        url: 'https://scanme-ai.vercel.app/',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'All (Web, Android, iOS, Windows, macOS)',
        description:
          'AI-powered product scanner and inventory manager for grocery stores, pharmacies, restaurants, hotels, and small retailers.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
    });
  }, []);

  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    onNavigatePath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath="/"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />

      <main className="flex-1">
        {/* ==================================================================== */}
        {/* HERO SECTION ABOVE THE FOLD                                          */}
        {/* ==================================================================== */}
        <section className="relative overflow-hidden bg-white border-b border-slate-200/80 pt-12 pb-16 lg:pt-20 lg:pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Headline & Value Proposition */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200/70 text-[#1473EA] text-xs font-black tracking-wide">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>SMART INVENTORY ASSISTANT FOR SMALL BUSINESSES</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#092B4C] tracking-tight leading-[1.15]">
                  Scan products. Track inventory.{' '}
                  <span className="text-[#1473EA]">Never miss an expiry.</span>
                </h1>

                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  ScanMe AI turns your smartphone camera into an intelligent product scanner. Instantly detect packaging, read barcodes, extract brand names, prices, and expiration dates, and maintain a real-time digital stock ledger—at zero hardware cost.
                </p>

                {/* Primary & Secondary Call To Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onLaunchApp}
                    className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#1473EA] to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black text-sm transition-all shadow-lg shadow-[#1473EA]/25 flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Start Scanning Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <a
                    href="/how-it-works"
                    onClick={(e) => handleLink(e, '/how-it-works')}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-[#092B4C] font-bold text-sm transition-colors text-center cursor-pointer"
                  >
                    Learn How It Works
                  </a>
                </div>

                {/* Key Verification Badges */}
                <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>100% Free Core Features</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Works on Any Smartphone</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Devanagari &amp; English Support</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Visual Scanner Mockup */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-full max-w-sm rounded-3xl bg-slate-900 border-4 border-slate-800 shadow-2xl overflow-hidden relative text-white p-4 space-y-4">
                  {/* Camera Header Bar */}
                  <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>LIVE OBJECT TRACKING</span>
                    </div>
                    <span className="font-mono text-[11px] bg-slate-800 px-2 py-0.5 rounded">FPS: 30</span>
                  </div>

                  {/* Simulated Viewfinder with Bounding Box */}
                  <div className="h-64 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-950 relative flex items-center justify-center overflow-hidden border border-slate-700/60 p-4">
                    {/* Simulated packaging label */}
                    <div className="w-48 h-40 rounded-xl bg-amber-50 text-slate-900 p-3 shadow-md flex flex-col justify-between border-2 border-emerald-400 relative">
                      {/* Active Tracking Bounding Box */}
                      <div className="absolute -inset-1 border-2 border-emerald-400 rounded-xl pointer-events-none">
                        <div className="absolute -top-3 left-2 bg-emerald-500 text-black text-[9px] font-black px-1.5 py-0.2 rounded shadow">
                          TRK-084 • STABLE (98%)
                        </div>
                      </div>

                      <div className="border-b border-slate-200 pb-1">
                        <span className="text-[10px] font-bold text-amber-700 uppercase">Himalayan Agro</span>
                        <div className="text-xs font-black">Organic Green Tea 100g</div>
                      </div>

                      <div className="space-y-0.5 text-[9px] font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-500">MFD:</span>
                          <span className="font-bold text-emerald-700">12/01/2026 ✓</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">EXP:</span>
                          <span className="font-bold text-emerald-700">11/01/2027 ✓</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">MRP:</span>
                          <span className="font-bold text-emerald-700">Rs. 240.00 ✓</span>
                        </div>
                      </div>
                    </div>

                    {/* Laser scanning beam */}
                    <div className="absolute inset-x-0 h-0.5 bg-cyan-400 opacity-70 shadow-[0_0_10px_#22d3ee] top-1/2 animate-bounce" />
                  </div>

                  {/* Auto-extracted summary pill */}
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">5 Fields Auto-Detected</div>
                      <div className="text-[10px] text-slate-400">Zero typing needed</div>
                    </div>
                    <button
                      type="button"
                      onClick={onLaunchApp}
                      className="px-3 py-1.5 rounded-xl bg-[#1473EA] text-white text-[11px] font-bold hover:bg-blue-600 transition-colors cursor-pointer"
                    >
                      Autofill Form
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* WHAT SCANME AI DOES                                                  */}
        {/* ==================================================================== */}
        <section className="py-16 lg:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#1473EA]">
              CORE ARCHITECTURE
            </h2>
            <h3 className="text-2xl sm:text-3xl font-black text-[#092B4C] tracking-tight">
              What ScanMe AI Does for Your Business
            </h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              ScanMe AI eliminates the two biggest headaches in small retail operations: tedious manual stock entry and unexpected financial losses from expired inventory.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1473EA] flex items-center justify-center font-bold">
                <Camera className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-black text-[#092B4C]">1. Computer Vision Product Intake</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Point your phone camera at single or multi-sided retail packaging. Our on-device frame analyzer tracks the item with a real-time bounding box, auto-crops extraneous background, and uses optical character recognition to extract brand name, price (MRP), manufacturing date (MFD), and expiry date (EXD).
              </p>
              <a
                href="/ai-product-scanning"
                onClick={(e) => handleLink(e, '/ai-product-scanning')}
                className="text-xs font-bold text-[#1473EA] hover:underline inline-flex items-center gap-1"
              >
                <span>Read AI Scanner Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-black text-[#092B4C]">2. Proactive Expiry Date Radar</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Items approaching their expiration date are automatically flagged 30, 60, and 90 days in advance. The system automatically calculates end-of-life dates from relative statements like "Best before 12 months from MFD", allowing you to run clearance discounts or arrange distributor returns before stock spoils.
              </p>
              <a
                href="/expiry-management"
                onClick={(e) => handleLink(e, '/expiry-management')}
                className="text-xs font-bold text-[#1473EA] hover:underline inline-flex items-center gap-1"
              >
                <span>Explore Expiry Tracking</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Boxes className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-black text-[#092B4C]">3. Complete Stock Ledger &amp; Catalog</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Maintain continuous control over your inventory with real-time stock balances, stock-in logs, stock-out register, and low-stock warnings. Export your entire product catalog to Google Sheets with 1 tap or share stock lists with customers via WhatsApp.
              </p>
              <a
                href="/inventory-management"
                onClick={(e) => handleLink(e, '/inventory-management')}
                className="text-xs font-bold text-[#1473EA] hover:underline inline-flex items-center gap-1"
              >
                <span>View Inventory Capabilities</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* WHO IT IS FOR (TARGET INDUSTRIES)                                    */}
        {/* ==================================================================== */}
        <section className="py-16 bg-white border-y border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#1473EA]">
                TAILORED INDUSTRY SOLUTIONS
              </h2>
              <h3 className="text-2xl sm:text-3xl font-black text-[#092B4C] tracking-tight">
                Built Specifically for Small Retail &amp; Service Businesses
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Every business category manages inventory differently. Discover how ScanMe AI addresses the exact operational bottlenecks of your sector.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {/* Grocery */}
              <div className="rounded-2xl border border-slate-200 p-5 bg-[#F5F7FA] hover:bg-white hover:border-[#1473EA] transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <h4 className="font-black text-sm text-[#092B4C]">Grocery &amp; Kirana</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Fast FMCG intake, daily staple tracking, multi-language packaging recognition, and zero expired milk or bread on shelves.
                </p>
                <a
                  href="/for-grocery-stores"
                  onClick={(e) => handleLink(e, '/for-grocery-stores')}
                  className="text-xs font-bold text-[#1473EA] hover:underline inline-flex items-center gap-1 pt-1"
                >
                  <span>Learn More</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>

              {/* Pharmacy */}
              <div className="rounded-2xl border border-slate-200 p-5 bg-[#F5F7FA] hover:bg-white hover:border-[#1473EA] transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Pill className="w-5 h-5" />
                </div>
                <h4 className="font-black text-sm text-[#092B4C]">Retail Pharmacies</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Batch number monitoring, strict FEFO medicine arrangement, and timely 90-day returns to pharmaceutical wholesalers.
                </p>
                <a
                  href="/for-pharmacies"
                  onClick={(e) => handleLink(e, '/for-pharmacies')}
                  className="text-xs font-bold text-[#1473EA] hover:underline inline-flex items-center gap-1 pt-1"
                >
                  <span>Learn More</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>

              {/* Medical Store */}
              <div className="rounded-2xl border border-slate-200 p-5 bg-[#F5F7FA] hover:bg-white hover:border-[#1473EA] transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="font-black text-sm text-[#092B4C]">Medical Supplies</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Lot tracking for sterile consumables, diagnostic test kits, and surgical equipment with manufacturer expiry controls.
                </p>
                <a
                  href="/for-medical-stores"
                  onClick={(e) => handleLink(e, '/for-medical-stores')}
                  className="text-xs font-bold text-[#1473EA] hover:underline inline-flex items-center gap-1 pt-1"
                >
                  <span>Learn More</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>

              {/* Restaurant */}
              <div className="rounded-2xl border border-slate-200 p-5 bg-[#F5F7FA] hover:bg-white hover:border-[#1473EA] transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <h4 className="font-black text-sm text-[#092B4C]">Restaurants &amp; Cafes</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Daily perishable turnover, dairy and meat shelf-life tracking, and recipe batch control to eliminate kitchen waste.
                </p>
                <a
                  href="/for-restaurants"
                  onClick={(e) => handleLink(e, '/for-restaurants')}
                  className="text-xs font-bold text-[#1473EA] hover:underline inline-flex items-center gap-1 pt-1"
                >
                  <span>Learn More</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>

              {/* Hotel */}
              <div className="rounded-2xl border border-slate-200 p-5 bg-[#F5F7FA] hover:bg-white hover:border-[#1473EA] transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Hotel className="w-5 h-5" />
                </div>
                <h4 className="font-black text-sm text-[#092B4C]">Hotels &amp; Lodges</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Housekeeping amenity stocks, minibar beverage rotation, cleaning chemical inventory, and laundry supplies.
                </p>
                <a
                  href="/for-hotels"
                  onClick={(e) => handleLink(e, '/for-hotels')}
                  className="text-xs font-bold text-[#1473EA] hover:underline inline-flex items-center gap-1 pt-1"
                >
                  <span>Learn More</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* WHY SMALL BUSINESSES NEED IT & NEPAL FOCUS                           */}
        {/* ==================================================================== */}
        <section className="py-16 lg:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black">
                <Globe2 className="w-3.5 h-3.5" />
                <span>LOCALIZED RETAIL REALITIES</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-[#092B4C] tracking-tight">
                Why ScanMe AI is Specially Useful for Nepalese &amp; Local Retailers
              </h3>

              <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                <p>
                  Most global retail applications are engineered for Western supermarkets where every item carries a standardized barcode registered in a cloud database. They fail miserably in South Asian neighborhood shops.
                </p>
                <p>
                  In Nepal and neighboring regional markets, Kirana stores carry local lentils, loose spices, regional packaged items with Devanagari labels, and products without standard barcodes. Prices are in Nepalese Rupees (NPR), and distributors frequently deliver crates with diverse expiry formats.
                </p>
                <p>
                  ScanMe AI was specifically architected with:
                </p>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-700 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Full bilingual interface in Nepali (नेपाली) and English</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Native pricing in Rs., NPR, INR, USD, EUR, and GBP</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Optical text recognition for both Devanagari and Latin packaging</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Offline-first local storage that functions even during power or internet cuts</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onLaunchApp}
                  className="px-6 py-3 rounded-2xl bg-[#092B4C] hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span>Experience ScanMe AI in Your Shop</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-slate-200/90 p-8 shadow-sm space-y-6">
              <h4 className="font-black text-lg text-[#092B4C] border-b border-slate-100 pb-3">
                How Independent Shops Save Money with ScanMe AI
              </h4>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1473EA] flex items-center justify-center shrink-0 font-bold text-xs">
                    1
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Zero Hardware Investment</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      No $500 POS desktop terminals or $100 laser barcode guns. Use any Android smartphone or tablet you already own.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 font-bold text-xs">
                    2
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Prevents Dead Inventory Losses</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      A small grocery store losing Rs. 5,000 every month to expired products recovers that money in full with automated 30-day radar warnings.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-bold text-xs">
                    3
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">80% Faster Restocking Time</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Cataloging a 40-item delivery crate takes 8 minutes with camera scanning, compared to 45 minutes of typing names and dates into paper ledgers.
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs text-slate-700">
                <span className="font-bold text-[#1473EA]">Privacy-First Design:</span> ScanMe AI does not sell your customer data, store transactions, or inventory records to third-party advertisers. All inventory records remain your private business property.
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* RECENT GUIDES & EDUCATIONAL ARTICLES PREVIEW                         */}
        {/* ==================================================================== */}
        <section className="py-16 bg-white border-t border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-[#1473EA]">
                  RETAIL KNOWLEDGE HUB
                </h2>
                <h3 className="text-2xl sm:text-3xl font-black text-[#092B4C] tracking-tight mt-1">
                  Practical Guides for Small Store Owners
                </h3>
              </div>
              <a
                href="/guides"
                onClick={(e) => handleLink(e, '/guides')}
                className="text-xs font-black text-[#1473EA] hover:underline flex items-center gap-1"
              >
                <span>View All 10 Guides</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-slate-200/90 p-5 bg-[#F5F7FA] space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                  Expiry Management
                </span>
                <h4 className="font-bold text-sm text-[#092B4C]">
                  How to Manage Expiry Dates in a Small Grocery Shop
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Learn practical FEFO restocking methods, weekly audit routines, and clearance discount strategies to prevent spoiled stock.
                </p>
                <a
                  href="/guides/how-to-manage-expiry-dates-in-a-small-grocery-shop"
                  onClick={(e) => handleLink(e, '/guides/how-to-manage-expiry-dates-in-a-small-grocery-shop')}
                  className="text-xs font-bold text-[#1473EA] hover:underline inline-flex items-center gap-1"
                >
                  <span>Read Guide</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>

              <div className="rounded-2xl border border-slate-200/90 p-5 bg-[#F5F7FA] space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                  Technology
                </span>
                <h4 className="font-bold text-sm text-[#092B4C]">
                  How Barcode Scanning Reduces Manual Entry Errors
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Why keyboard data entry has a 1-in-300 error rate, and how camera barcode decoders save dozens of hours each week.
                </p>
                <a
                  href="/guides/how-barcode-scanning-can-reduce-manual-inventory-entry"
                  onClick={(e) => handleLink(e, '/guides/how-barcode-scanning-can-reduce-manual-inventory-entry')}
                  className="text-xs font-bold text-[#1473EA] hover:underline inline-flex items-center gap-1"
                >
                  <span>Read Guide</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>

              <div className="rounded-2xl border border-slate-200/90 p-5 bg-[#F5F7FA] space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                  Standards &amp; Law
                </span>
                <h4 className="font-bold text-sm text-[#092B4C]">
                  MFD vs EXD vs Best Before: What is the Difference?
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Demystifying packaging dates, shelf-life calculations, legal compliance rules, and safe consumer guidelines.
                </p>
                <a
                  href="/guides/mfd-vs-exd-vs-best-before-whats-the-difference"
                  onClick={(e) => handleLink(e, '/guides/mfd-vs-exd-vs-best-before-whats-the-difference')}
                  className="text-xs font-bold text-[#1473EA] hover:underline inline-flex items-center gap-1"
                >
                  <span>Read Guide</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* BOTTOM CTA BANNER                                                    */}
        {/* ==================================================================== */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-[#092B4C] to-[#1473EA] text-white p-8 sm:p-12 text-center space-y-6 shadow-xl">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              Ready to Modernize Your Store Inventory Today?
            </h3>
            <p className="text-sm sm:text-base text-blue-100 max-w-2xl mx-auto leading-relaxed">
              Join thousands of shopkeepers, grocers, and pharmacies who use ScanMe AI to automate stock intake, track expiry dates, and cut losses. No credit card, app installation, or expensive equipment needed.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={onLaunchApp}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-[#092B4C] font-black text-sm hover:bg-slate-100 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-[#1473EA]" />
                <span>Launch ScanMe AI Web App</span>
              </button>
              <a
                href="https://github.com/ab123170-max/Manager-/releases/latest/download/scanme-ai.apk"
                download
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-colors text-center border border-white/20"
              >
                Download Android APK
              </a>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter
        currentPath="/"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
