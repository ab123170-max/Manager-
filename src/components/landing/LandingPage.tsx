/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Camera,
  Boxes,
  Clock,
  BarChart3,
  ArrowRight,
  LogIn,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Zap,
  Globe,
  Barcode,
  QrCode,
  Tag,
  DollarSign,
  Calendar,
  Layers,
  ChevronDown,
  ArrowDownRight,
  ArrowUpRight,
  Package,
  Info,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSelectorButton } from '../common/LanguageSelectorButton';
import { updateDocumentSeo } from '../../utils/seoHelper';
import { PUBLIC_FAQS } from '../seo/PublicFaqPage';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onNavigatePath?: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onLogin,
  onNavigatePath,
}) => {
  const { t, languageOption, openLanguageSelector } = useLanguage();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);

  useEffect(() => {
    updateDocumentSeo({
      title: 'ScanMe AI – AI Product Scanner & Inventory Manager',
      description:
        'ScanMe AI is an AI-powered product scanner and inventory manager that extracts product information, scans barcodes and QR codes, tracks expiry dates, and helps businesses manage stock.',
      canonicalUrl: 'https://scanme-ai.vercel.app/',
      ogTitle: 'ScanMe AI – AI Product Scanner & Inventory Manager',
      ogDescription:
        'ScanMe AI is an AI-powered product scanner and inventory manager that extracts product information, scans barcodes and QR codes, tracks expiry dates, and helps businesses manage stock.',
    });
  }, []);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (onNavigatePath) {
      e.preventDefault();
      onNavigatePath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 flex flex-col justify-between selection:bg-indigo-600 selection:text-white">
      {/* ==================================================================== */}
      {/* 1. TOP NAVBAR                                                         */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 py-3 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <a
            href="/"
            onClick={(e) => handleLinkClick(e, '/')}
            className="flex items-center gap-3 group text-decoration-none"
            title="ScanMe AI"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 group-hover:bg-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-600/25 transition-colors">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-black text-base tracking-tight text-slate-900">ScanMe</span>
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                  AI
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 hidden sm:block mt-0.5">
                AI Product Scanner &amp; Inventory Manager
              </p>
            </div>
          </a>

          {/* Desktop Crawlable Sub-Page Links */}
          <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-1 text-xs font-bold text-slate-600">
            <a
              href="/ai-product-scanner"
              onClick={(e) => handleLinkClick(e, '/ai-product-scanner')}
              className="px-2.5 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              AI Scanner
            </a>
            <a
              href="/barcode-scanner"
              onClick={(e) => handleLinkClick(e, '/barcode-scanner')}
              className="px-2.5 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Barcode &amp; QR
            </a>
            <a
              href="/expiry-date-scanner"
              onClick={(e) => handleLinkClick(e, '/expiry-date-scanner')}
              className="px-2.5 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Expiry Tracking
            </a>
            <a
              href="/inventory-management"
              onClick={(e) => handleLinkClick(e, '/inventory-management')}
              className="px-2.5 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Stock Management
            </a>
            <a
              href="/faq"
              onClick={(e) => handleLinkClick(e, '/faq')}
              className="px-2.5 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelectorButton variant="compact" />

            <button
              type="button"
              onClick={onLogin}
              className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-indigo-600" />
              <span>{t('auth.login')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 2. MAIN HERO SECTION (With required H1)                               */}
      {/* ==================================================================== */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Required H1 & Value Proposition */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-7 space-y-5 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Multimodal Vision &amp; OCR Engine</span>
            </div>

            {/* REQUIRED H1 */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
              AI Product Scanner &amp; Inventory Manager
            </h1>

            {/* Concise Subtitle */}
            <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {t('landing.heroSubtitle')}
            </p>

            {/* On-Demand Collapsible Info - Only shown when user taps/requests it */}
            <div className="flex flex-col items-center lg:items-start gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/90 hover:bg-indigo-100/90 border border-indigo-200/60 px-3.5 py-1.5 rounded-full transition-all cursor-pointer shadow-2xs"
                aria-expanded={isOverviewExpanded}
              >
                <Info className="w-3.5 h-3.5 text-indigo-500" />
                <span>{isOverviewExpanded ? t('landing.hideDetails') : t('landing.showDetails')}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-indigo-600 transition-transform duration-200 ${
                    isOverviewExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isOverviewExpanded && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="w-full max-w-xl bg-slate-50/95 border border-slate-200/90 p-3.5 rounded-2xl text-xs sm:text-sm text-slate-600 leading-relaxed text-left shadow-2xs"
                >
                  <p>
                    <strong>ScanMe AI</strong> is an intelligent product scanner and small-business inventory management application. Scan retail packaging with AI to automatically extract product names, prices, manufacture dates, and expiry dates, scan barcodes and QR codes, and maintain a real-time stock ledger without manual typing.
                  </p>
                </motion.div>
              )}
            </div>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <button
                type="button"
                onClick={onGetStarted}
                id="btn-landing-get-started"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                <span>{t('landing.getStarted')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onLogin}
                id="btn-landing-login"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 font-bold text-sm shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-indigo-600" />
                <span>{t('auth.login')}</span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Zero Manual Setup</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                <span>Offline First &amp; Cloud Synced</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Camera Multi-Shot OCR</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Interactive Scanner Preview Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative mx-auto max-w-sm sm:max-w-md bg-white rounded-3xl p-5 shadow-xl border border-slate-200/90 overflow-hidden">
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] font-bold text-slate-400 ml-2">ScanMe AI Vision Viewfinder</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                  Ready
                </span>
              </div>

              {/* Viewfinder Graphics */}
              <div className="relative mt-4 aspect-4/3 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 flex flex-col justify-between overflow-hidden shadow-inner">
                <div className="absolute inset-4 pointer-events-none border border-white/20 rounded-xl">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-500" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-500" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-500" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-500" />
                </div>

                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-indigo-500 shadow-[0_0_12px_#6366f1] opacity-80 animate-pulse" />

                <div className="relative z-10 flex items-center justify-between text-white/90">
                  <div className="text-[11px] font-mono bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
                    SCAN_ID: 89010300
                  </div>
                  <div className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                    99.4% AI Match
                  </div>
                </div>

                <div className="relative z-10 bg-white/95 backdrop-blur-md rounded-xl p-3 border border-white text-slate-800 shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Extracted Product</p>
                      <p className="text-xs font-bold text-slate-900 leading-tight">Organic Himalayan Honey 500g</p>
                    </div>
                    <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                      $9.50
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-slate-400 font-medium">MFD:</span>{' '}
                      <span className="font-semibold text-slate-700">14/08/2026</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">EXP:</span>{' '}
                      <span className="font-bold text-emerald-600">14/08/2028</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
                <span>Multi-Image OCR Engine</span>
                <span className="text-indigo-600 font-bold">Auto-Calculates Best Before</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ==================================================================== */}
        {/* REQUIRED H2 SECTION 1: Scan Products With AI                          */}
        {/* ==================================================================== */}
        <section className="space-y-4 pt-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Scan Products With AI
            </h2>
          </div>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-4xl">
            Manual data entry when receiving inventory slows down store staff and introduces expensive transcription mistakes. With <strong>ScanMe AI</strong>, you simply point your device camera at any retail package, grocery tin, cosmetics jar, or food container. Our multimodal vision system reads labels across angles, shadows, and reflective finishes to automatically extract product names, prices, batch identifiers, manufacturing dates, and expiry dates into structured digital forms.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <Tag className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Product Information Extraction</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Isolates brand names, variants, and net contents from background artwork, eliminating manual typing.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <DollarSign className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Price &amp; MRP Detection</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Reads maximum retail price (MRP) and unit prices accurately to establish sales value automatically.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Multi-Shot Synchronization</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Capture front branding, side ingredients, and bottom date stamps into a unified product record.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <a
              href="/ai-product-scanner"
              onClick={(e) => handleLinkClick(e, '/ai-product-scanner')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              <span>Learn more about our AI Product Scanner</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* REQUIRED H2 SECTION 2: Barcode & QR Scanner                           */}
        {/* ==================================================================== */}
        <section className="space-y-4 pt-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-800 flex items-center justify-center font-bold">
              <Barcode className="w-5 h-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Barcode &amp; QR Scanner
            </h2>
          </div>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-4xl">
            In addition to AI label reading, ScanMe AI features a high-speed browser-based barcode and QR code scanner. Read 1D retail symbologies (UPC-A, EAN-13, Code 128) and 2D QR codes with sub-second latency using your mobile phone or laptop webcam. Look up on-hand stock quantities instantly or link newly scanned packaging to your existing inventory barcode database.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <Barcode className="w-5 h-5 text-indigo-600 mb-1" />
              <h3 className="font-bold text-xs text-slate-900">1D Linear Barcodes</h3>
              <p className="text-[11px] text-slate-500">Supports UPC-A, UPC-E, EAN-13, EAN-8, Code 128, and Code 39.</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <QrCode className="w-5 h-5 text-purple-600 mb-1" />
              <h3 className="font-bold text-xs text-slate-900">2D QR &amp; Data Matrix</h3>
              <p className="text-[11px] text-slate-500">Decodes QR codes on cartons, digital invoices, and pharmaceutical tags.</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <Zap className="w-5 h-5 text-amber-600 mb-1" />
              <h3 className="font-bold text-xs text-slate-900">Torch &amp; Flashlight Toggle</h3>
              <p className="text-[11px] text-slate-500">Easily illuminate dark storerooms and warehouse backrooms.</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <Package className="w-5 h-5 text-emerald-600 mb-1" />
              <h3 className="font-bold text-xs text-slate-900">Instant Database Lookup</h3>
              <p className="text-[11px] text-slate-500">Brings up current stock levels, shelf location, and supplier information.</p>
            </div>
          </div>

          <div className="pt-2">
            <a
              href="/barcode-scanner"
              onClick={(e) => handleLinkClick(e, '/barcode-scanner')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              <span>Explore full Barcode &amp; QR Scanner guide</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* REQUIRED H2 SECTION 3: Track Product Expiry Dates                    */}
        {/* ==================================================================== */}
        <section className="space-y-4 pt-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Track Product Expiry Dates
            </h2>
          </div>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-4xl">
            Perishable goods and dated consumer inventory require constant monitoring. ScanMe AI extracts both manufacturing dates (MFD, MFG, DOM, PKD) and expiration dates (EXP, EXD, Use-By, Best Before). If packaging specifies a shelf-life duration (such as &ldquo;Best within 24 months&rdquo;), the application automatically computes the calendar expiry date. With automated 30-day early warnings, your business can run proactive markdowns and First-Expired, First-Out (FEFO) stock rotation before items spoil.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-sm text-slate-900">MFD &amp; EXP Detection</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Recognizes diverse international date formats and stamps without manual verification.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <Clock className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-sm text-slate-900">30-Day Expiry Early Warnings</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Color-coded badges flag items expiring in less than 30 days so you can discount or merchandise them.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">Zero-Waste Stock Rotation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Implement FEFO workflows to ensure older stock batches sell out before newer arrivals.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <a
              href="/expiry-date-scanner"
              onClick={(e) => handleLinkClick(e, '/expiry-date-scanner')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              <span>Read more about Expiry Date Tracking</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* REQUIRED H2 SECTION 4: Manage Your Inventory                          */}
        {/* ==================================================================== */}
        <section className="space-y-4 pt-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <Boxes className="w-5 h-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Manage Your Inventory
            </h2>
          </div>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-4xl">
            ScanMe AI provides a complete inventory and stock management system tailored for retail shops, grocery stores, pharmacies, and small warehouses. Organize your product database by category, SKU, and barcode. Record stock-in purchases and stock-out customer sales with an immutable transaction ledger, track inventory valuation in real time, and receive alerts when stock falls below reorder thresholds.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <ArrowDownRight className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">Stock-In Intake</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Add new supplier shipments via fast AI camera scans or manual entry with cost prices and batch numbers.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <ArrowUpRight className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">Stock-Out &amp; Sales</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Deduct sold quantities with quick barcode scans, log invoice references, and compute real-time margins.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">Reports &amp; Valuation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Monitor inventory valuation, cost of goods sold (COGS), profit margins, and turnover velocity.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <Package className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">Product Database</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Centralized catalog with SKU, rack locations, batch records, supplier info, and reorder levels.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <a
              href="/inventory-management"
              onClick={(e) => handleLinkClick(e, '/inventory-management')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              <span>Explore Small Business Inventory Management</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* REQUIRED H2 SECTION 5: Why Use ScanMe AI?                            */}
        {/* ==================================================================== */}
        <section className="space-y-4 pt-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Why Use ScanMe AI?
            </h2>
          </div>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-4xl">
            Whether you manage a local retail shop, convenience store, pharmacy, or warehouse, ScanMe AI combines camera-based optical recognition with robust stock ledger tools to replace expensive scanning hardware and messy spreadsheets:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-indigo-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <h3 className="font-bold text-sm text-slate-900">Zero Dedicated Hardware Needed</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                No need to purchase expensive barcode guns or proprietary handheld terminals. Run ScanMe AI directly on any modern smartphone, tablet, or PC browser.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-indigo-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <h3 className="font-bold text-sm text-slate-900">Prevents Expired Inventory Waste</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Capture expiry dates at intake and receive proactive 30-day alerts to markdown or clear items before they turn into unsellable waste.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-indigo-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <h3 className="font-bold text-sm text-slate-900">5x Faster Stock Receiving</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Scan multiple angles of packaging in seconds. Autofill product names, prices, and dates without keyboard typing.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-indigo-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <h3 className="font-bold text-sm text-slate-900">Multi-Language &amp; Secure Cloud Sync</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Works seamlessly in English, Nepali, and Hindi. Store data securely in the cloud with offline-first responsiveness.
              </p>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* REQUIRED H2 SECTION 6: How ScanMe AI Works                            */}
        {/* ==================================================================== */}
        <section className="space-y-4 pt-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              How ScanMe AI Works
            </h2>
          </div>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-4xl">
            Getting started with ScanMe AI takes less than two minutes:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-black">
                Step 1
              </span>
              <h3 className="font-bold text-sm text-slate-900">Snap Packaging Photos</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Take 1 to 5 clear photos of product packaging using your phone camera or upload packaging images.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-600 text-white text-[11px] font-black">
                Step 2
              </span>
              <h3 className="font-bold text-sm text-slate-900">AI Vision &amp; OCR Analysis</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                ScanMe AI pre-processes the image, corrects lighting, and extracts text, numbers, and dates.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-black">
                Step 3
              </span>
              <h3 className="font-bold text-sm text-slate-900">Automatic Form Fill</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Fields for product name, price/MRP, MFD, and EXP are populated automatically into your review form.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-black">
                Step 4
              </span>
              <h3 className="font-bold text-sm text-slate-900">Commit to Inventory</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Verify confidence scores, assign quantity and rack location, and commit the item to your stock ledger.
              </p>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* REQUIRED H2 SECTION 7: Frequently Asked Questions                     */}
        {/* ==================================================================== */}
        <section id="faq" className="space-y-4 pt-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-4xl">
            Real answers to common questions about using ScanMe AI for product scanning, barcode decoding, expiry date tracking, and inventory management:
          </p>

          <div className="space-y-3 pt-2">
            {PUBLIC_FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={faq.question}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer"
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${index}`}
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'transform rotate-180 text-indigo-600' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div
                      id={`faq-answer-${index}`}
                      className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100"
                    >
                      <p className="pt-2">{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <a
              href="/faq"
              onClick={(e) => handleLinkClick(e, '/faq')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              <span>View dedicated FAQ knowledge base</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 relative overflow-hidden shadow-lg">
          <div className="max-w-2xl space-y-3 relative z-10">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Ready to automate your product scanning and inventory?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Start in seconds. Scan your first product now with zero training or external equipment required.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onGetStarted}
                className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Get Started Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        </section>
      </main>

      {/* Crawlable Public Footer */}
      <footer className="mt-16 bg-white border-t border-slate-200/90 text-slate-600 font-sans" aria-label="Site Footer">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Camera className="w-4 h-4" />
                </div>
                <span className="font-extrabold text-base text-slate-900 tracking-tight">ScanMe AI</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                ScanMe AI is an AI-powered product scanner and inventory manager that extracts product information, scans barcodes and QR codes, tracks expiry dates, and helps businesses manage stock.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Core Capabilities
              </h3>
              <nav aria-label="Footer Capabilities Links" className="flex flex-col space-y-2 text-xs">
                <a
                  href="/ai-product-scanner"
                  onClick={(e) => handleLinkClick(e, '/ai-product-scanner')}
                  className="hover:text-indigo-600 transition-colors"
                >
                  AI Product Scanner
                </a>
                <a
                  href="/barcode-scanner"
                  onClick={(e) => handleLinkClick(e, '/barcode-scanner')}
                  className="hover:text-indigo-600 transition-colors"
                >
                  Barcode &amp; QR Scanner
                </a>
                <a
                  href="/expiry-date-scanner"
                  onClick={(e) => handleLinkClick(e, '/expiry-date-scanner')}
                  className="hover:text-indigo-600 transition-colors"
                >
                  Expiry Date Scanner
                </a>
                <a
                  href="/inventory-management"
                  onClick={(e) => handleLinkClick(e, '/inventory-management')}
                  className="hover:text-indigo-600 transition-colors"
                >
                  Inventory Management App
                </a>
                <a
                  href="/faq"
                  onClick={(e) => handleLinkClick(e, '/faq')}
                  className="hover:text-indigo-600 transition-colors"
                >
                  Frequently Asked Questions
                </a>
              </nav>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Key Features
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-500">
                <li>AI multimodal label OCR</li>
                <li>Instant 1D &amp; 2D barcode decoding</li>
                <li>Proactive 30-day expiry early warnings</li>
                <li>Real-time stock ledger &amp; valuation</li>
                <li>Small business inventory controls</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Quick Access
              </h3>
              <button
                type="button"
                onClick={onGetStarted}
                className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Launch ScanMe AI</span>
              </button>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} ScanMe AI. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="https://scanme-ai.vercel.app/" className="hover:text-slate-600 transition-colors">
                https://scanme-ai.vercel.app/
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
