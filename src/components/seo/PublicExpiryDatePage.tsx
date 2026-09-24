/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { updateDocumentSeo } from '../../utils/seoHelper';
import { PublicSeoNavbar } from './PublicSeoNavbar';
import { PublicSeoFooter } from './PublicSeoFooter';

interface PublicExpiryDatePageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
  onLogin: () => void;
}

export const PublicExpiryDatePage: React.FC<PublicExpiryDatePageProps> = ({
  onNavigatePath,
  onLaunchApp,
  onLogin,
}) => {
  useEffect(() => {
    updateDocumentSeo({
      title: 'Expiry Date Scanner | ScanMe AI',
      description:
        'Track product expiry dates, detect MFD and EXP stamps automatically with AI OCR, and receive proactive 30-day early warnings to eliminate spoiled inventory.',
      canonicalUrl: 'https://scanme-ai.vercel.app/expiry-date-scanner',
      ogTitle: 'Expiry Date Scanner | ScanMe AI',
      ogDescription:
        'Scan packaging expiry dates, auto-calculate shelf-life durations, and monitor real-time expiration countdowns with ScanMe AI.',
      schemaJson: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Expiry Date Scanner | ScanMe AI',
        url: 'https://scanme-ai.vercel.app/expiry-date-scanner',
        description:
          'Track product expiry dates, detect MFD and EXP stamps automatically with AI OCR, and receive proactive 30-day early warnings to eliminate spoiled inventory.',
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
              name: 'Expiry Date Scanner',
              item: 'https://scanme-ai.vercel.app/expiry-date-scanner',
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
        currentPath="/expiry-date-scanner"
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
          <span className="font-semibold text-slate-900">Expiry Date Scanner</span>
        </nav>

        {/* Hero Section */}
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wide">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Zero-Waste Expiry Intelligence</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Expiry Date Scanner &amp; Shelf-Life Tracking
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-3xl">
            Never lose money to expired stock again. ScanMe AI automatically reads stamped manufacturing and expiration dates, calculates true end-of-life dates, and issues proactive 30-day early warnings to protect your margins.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onLaunchApp}
              className="px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-amber-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Track Expiry Dates Now</span>
            </button>
            <a
              href="/inventory-management"
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath('/inventory-management');
              }}
              className="px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-bold shadow-2xs transition-all flex items-center gap-2"
            >
              <span>Explore Inventory Controls</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </a>
          </div>
        </header>

        {/* How It Works Section */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Automated Date Stamp Recognition &amp; Parsing
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Unlike manual auditing where staff must squint at stamped cans and blister packs, ScanMe AI uses specialized optical models trained to recognize dot-matrix, stamped, and etched date notations across world standards:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-slate-900">MFD &amp; MFG Dates</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Reads manufacture date codes (MFD, MFG, DOM, PKD) across formats such as DD/MM/YYYY, MM/YYYY, and Julian calendar dates.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-slate-900">EXP &amp; Use-By Dates</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Extracts expiration stamps (EXP, EXD, Best Before, Use By), verifying month names and numerical formats accurately.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-slate-900">Relative Shelf-Life Math</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                When packaging states &ldquo;Best within 18 months from MFD&rdquo;, the system adds 18 months directly to compute the true expiry day.
              </p>
            </div>
          </div>
        </section>

        {/* Proactive 30-Day Warning Feature */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Proactive 30-Day Expiration Early Warning System
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900">Color-Coded Status Badges</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Inventory items are categorized into Good (&gt;30 days), Expiring Soon (&le;30 days), and Expired so your staff can prioritize sales and markdown discounts.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">FEFO Stock Rotation</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enables First-Expired, First-Out (FEFO) order fulfillment so older incoming batches are merchandised before newer stock.
              </p>
            </div>
          </div>
        </section>

        {/* Navigation Journey */}
        <section className="bg-amber-50/60 rounded-3xl p-6 sm:p-8 border border-amber-100 space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Next in the Workflow
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Connect your expiry dates directly with your sales ledger and physical inventory:
          </p>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <a
              href="/inventory-management"
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath('/inventory-management');
              }}
              className="px-3.5 py-2 rounded-xl bg-white border border-amber-200 text-amber-900 hover:bg-amber-100 text-xs font-bold transition-colors"
            >
              Inventory Management &amp; Stock Control →
            </a>
            <a
              href="/ai-product-scanner"
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath('/ai-product-scanner');
              }}
              className="px-3.5 py-2 rounded-xl bg-white border border-amber-200 text-amber-900 hover:bg-amber-100 text-xs font-bold transition-colors"
            >
              AI Product Scanner Overview →
            </a>
          </div>
        </section>
      </main>

      <PublicSeoFooter onNavigatePath={onNavigatePath} onLaunchApp={onLaunchApp} />
    </div>
  );
};
