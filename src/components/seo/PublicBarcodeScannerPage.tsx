/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  Barcode,
  QrCode,
  Zap,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { updateDocumentSeo } from '../../utils/seoHelper';
import { PublicSeoNavbar } from './PublicSeoNavbar';
import { PublicSeoFooter } from './PublicSeoFooter';

interface PublicBarcodeScannerPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
  onLogin: () => void;
}

export const PublicBarcodeScannerPage: React.FC<PublicBarcodeScannerPageProps> = ({
  onNavigatePath,
  onLaunchApp,
  onLogin,
}) => {
  useEffect(() => {
    updateDocumentSeo({
      title: 'Barcode Inventory Scanner | ScanMe AI',
      description:
        'Fast 1D and 2D barcode and QR code scanner for retail inventory. Scan UPC, EAN, Code 128, and QR codes directly in your browser with zero extra hardware.',
      canonicalUrl: 'https://scanme-ai.vercel.app/barcode-scanner',
      ogTitle: 'Barcode Inventory Scanner | ScanMe AI',
      ogDescription:
        'Scan UPC, EAN-13, Code 128, and QR codes instantly using your device camera for fast inventory check-in and checkout.',
      schemaJson: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Barcode Inventory Scanner | ScanMe AI',
        url: 'https://scanme-ai.vercel.app/barcode-scanner',
        description:
          'Fast 1D and 2D barcode and QR code scanner for retail inventory. Scan UPC, EAN, Code 128, and QR codes directly in your browser with zero extra hardware.',
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
              name: 'Barcode Scanner',
              item: 'https://scanme-ai.vercel.app/barcode-scanner',
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
        currentPath="/barcode-scanner"
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
          <span className="font-semibold text-slate-900">Barcode &amp; QR Scanner</span>
        </nav>

        {/* Hero Section */}
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wide">
            <Barcode className="w-3.5 h-3.5 text-indigo-600" />
            <span>High-Speed In-Browser Decoding</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Barcode &amp; QR Scanner for Retail Inventory
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-3xl">
            Turn your smartphone, tablet, or web camera into a high-performance inventory scanner. Scan retail barcodes and 2D QR codes with sub-second response times—no external hand scanner or software installation required.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onLaunchApp}
              className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Barcode className="w-4 h-4" />
              <span>Launch Barcode Scanner</span>
            </button>
            <a
              href="/expiry-date-scanner"
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath('/expiry-date-scanner');
              }}
              className="px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-bold shadow-2xs transition-all flex items-center gap-2"
            >
              <span>Learn Expiry Tracking</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </a>
          </div>
        </header>

        {/* Supported Formats Section */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Universal Symbology &amp; Supported Barcode Formats
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            ScanMe AI supports the standard 1D linear barcodes used across consumer goods and retail supermarkets, as well as high-density 2D matrix symbologies used in modern logistics:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="text-xs font-extrabold text-indigo-600 uppercase">Retail 1D</span>
              <h3 className="font-bold text-sm text-slate-900">UPC-A &amp; UPC-E</h3>
              <p className="text-xs text-slate-500">Universal Product Codes standard across North American retail products.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="text-xs font-extrabold text-indigo-600 uppercase">Global 1D</span>
              <h3 className="font-bold text-sm text-slate-900">EAN-13 &amp; EAN-8</h3>
              <p className="text-xs text-slate-500">International Article Numbers used globally for retail point-of-sale items.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="text-xs font-extrabold text-indigo-600 uppercase">Industrial 1D</span>
              <h3 className="font-bold text-sm text-slate-900">Code 128 &amp; Code 39</h3>
              <p className="text-xs text-slate-500">Alphanumeric barcodes prevalent in warehousing, shipping cartons, and logistics.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="text-xs font-extrabold text-purple-600 uppercase">2D Matrix</span>
              <h3 className="font-bold text-sm text-slate-900">QR Code</h3>
              <p className="text-xs text-slate-500">Quick Response codes encoding URLs, product IDs, batch data, and certificates.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="text-xs font-extrabold text-purple-600 uppercase">2D Matrix</span>
              <h3 className="font-bold text-sm text-slate-900">Data Matrix</h3>
              <p className="text-xs text-slate-500">Compact high-density 2D codes common on pharmaceutical packaging and electronics.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="text-xs font-extrabold text-emerald-600 uppercase">Logistics 1D</span>
              <h3 className="font-bold text-sm text-slate-900">ITF / Interleaved 2 of 5</h3>
              <p className="text-xs text-slate-500">Standard for corrugated packaging, master shipping cases, and pallets.</p>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Why Use Browser-Based Barcode Scanning?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">Zero Hardware Costs</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Save hundreds of dollars on dedicated handheld barcode guns. Store employees can use their existing mobile phone or warehouse tablet cameras directly.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">Instant Inventory Lookup</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Scanning immediately queries your local database to display current on-hand stock, shelf location, cost price, and previous purchase history.
              </p>
            </div>
          </div>
        </section>

        {/* Next Step Linking */}
        <section className="bg-slate-100 rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Combine Barcode Scanning With Expiry Tracking
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            While barcodes identify the item, ScanMe AI combines barcode lookups with visual OCR to read the exact stamped expiration date:
          </p>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <a
              href="/expiry-date-scanner"
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath('/expiry-date-scanner');
              }}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
            >
              Expiry Date Scanner Guide →
            </a>
            <a
              href="/inventory-management"
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath('/inventory-management');
              }}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
            >
              Manage Inventory Stock →
            </a>
          </div>
        </section>
      </main>

      <PublicSeoFooter onNavigatePath={onNavigatePath} onLaunchApp={onLaunchApp} />
    </div>
  );
};
