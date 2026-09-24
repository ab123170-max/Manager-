/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  Camera,
  Sparkles,
  Zap,
  Layers,
  Calendar,
  DollarSign,
  Tag,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { updateDocumentSeo } from '../../utils/seoHelper';
import { PublicSeoNavbar } from './PublicSeoNavbar';
import { PublicSeoFooter } from './PublicSeoFooter';

interface PublicAiScannerPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
  onLogin: () => void;
}

export const PublicAiScannerPage: React.FC<PublicAiScannerPageProps> = ({
  onNavigatePath,
  onLaunchApp,
  onLogin,
}) => {
  useEffect(() => {
    updateDocumentSeo({
      title: 'AI Product Scanner | ScanMe AI',
      description:
        'Scan product packaging with AI to automatically extract product names, prices, manufacture dates, and expiry dates into structured digital inventory forms.',
      canonicalUrl: 'https://scanme-ai.vercel.app/ai-product-scanner',
      ogTitle: 'AI Product Scanner | ScanMe AI',
      ogDescription:
        'AI product scanner that captures packaging photos to extract names, prices, MFD, and EXP automatically with multimodal computer vision.',
      schemaJson: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'AI Product Scanner | ScanMe AI',
        url: 'https://scanme-ai.vercel.app/ai-product-scanner',
        description:
          'Scan product packaging with AI to automatically extract product names, prices, manufacture dates, and expiry dates into structured digital inventory forms.',
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: 'https://scanme-ai.vercel.app/',
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'AI Product Scanner',
              item: 'https://scanme-ai.vercel.app/ai-product-scanner',
            },
          ],
        },
      },
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col justify-between">
      <PublicSeoNavbar
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
        onLogin={onLogin}
        currentPath="/ai-product-scanner"
      />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full space-y-12">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigatePath('/');
            }}
            className="hover:text-indigo-600 transition-colors"
          >
            Home
          </a>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-900">AI Product Scanner</span>
        </nav>

        {/* Hero Section */}
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/70 text-indigo-700 text-xs font-bold uppercase tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multimodal Vision Intelligence</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            AI Product Scanner &amp; Packaging OCR
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-3xl">
            Extract product attributes instantly from packaging photos. ScanMe AI uses advanced computer vision and neural OCR to recognize brands, prices, manufacturing stamps, and expiration dates—populating inventory records with zero typing.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onLaunchApp}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Launch AI Camera Scanner</span>
            </button>
            <a
              href="/barcode-scanner"
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath('/barcode-scanner');
              }}
              className="px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-bold shadow-2xs transition-all flex items-center gap-2"
            >
              <span>Explore Barcode Scanner</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </a>
          </div>
        </header>

        {/* Section 1: How AI Product Scanning Works */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            How Multimodal AI Product Scanning Works
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Traditional barcode readers only query static UPC databases that often lack batch-specific information like expiry dates and manufacturing stamps. ScanMe AI overcomes this limitation by reading the actual physical packaging using multimodal vision models.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Multi-Shot Capture</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Take up to 5 photos from different angles (front label, price tag, batch stamp, side details) for cross-referenced accuracy.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Adaptive Preprocessing</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automated brightness normalization, contrast enhancement, and noise reduction make curved bottles and shiny pouches readable.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Tag className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Structured Autofill</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Extracted information maps directly to standardized database fields with confidence scores for one-tap stock intake.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: The 5 Extracted Fields */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Key Product Information Extracted Automatically
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">1. Product Name &amp; Variant</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Detects commercial brand name, variant, and unit quantity (e.g., &ldquo;Organic Virgin Coconut Oil 500ml&rdquo;) isolated from decorative packaging text.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">2. Retail Price &amp; MRP</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Identifies Maximum Retail Price (MRP), sale prices, and currency markers, standardizing numbers for accurate inventory valuation.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-900">3. Manufacture Date (MFD/PKD)</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Interprets ink-jet stamped, embossed, or dot-matrix MFD, MFG, DOM, and PKD date formats with cross-format validation.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-600" />
                <h3 className="font-bold text-sm text-slate-900">4. Expiry Date (EXP/Use-By)</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Extracts expiration stamps or computes valid dates from shelf-life duration labels like &ldquo;Best within 18 months from packaging&rdquo;.
              </p>
            </div>
          </div>
        </section>

        {/* Internal Linking Journey */}
        <section className="bg-indigo-50/70 rounded-3xl p-6 sm:p-8 border border-indigo-100 space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Explore More Capabilities
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Continue learning how ScanMe AI helps retail stores and small businesses automate daily operations:
          </p>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <a
              href="/barcode-scanner"
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath('/barcode-scanner');
              }}
              className="px-3.5 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors"
            >
              Barcode &amp; QR Scanner →
            </a>
            <a
              href="/expiry-date-scanner"
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath('/expiry-date-scanner');
              }}
              className="px-3.5 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors"
            >
              Expiry Date Scanner →
            </a>
            <a
              href="/inventory-management"
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath('/inventory-management');
              }}
              className="px-3.5 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors"
            >
              Inventory Management App →
            </a>
          </div>
        </section>
      </main>

      <PublicSeoFooter onNavigatePath={onNavigatePath} onLaunchApp={onLaunchApp} />
    </div>
  );
};
