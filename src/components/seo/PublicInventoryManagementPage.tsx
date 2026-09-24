/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  Boxes,
  TrendingUp,
  BarChart3,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { updateDocumentSeo } from '../../utils/seoHelper';
import { PublicSeoNavbar } from './PublicSeoNavbar';
import { PublicSeoFooter } from './PublicSeoFooter';

interface PublicInventoryManagementPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
  onLogin: () => void;
}

export const PublicInventoryManagementPage: React.FC<PublicInventoryManagementPageProps> = ({
  onNavigatePath,
  onLaunchApp,
  onLogin,
}) => {
  useEffect(() => {
    updateDocumentSeo({
      title: 'Inventory Management App | ScanMe AI',
      description:
        'Small business inventory management app. Track stock-in, stock-out, real-time inventory valuation, low-stock reorder alerts, and sales ledgers with ScanMe AI.',
      canonicalUrl: 'https://scanme-ai.vercel.app/inventory-management',
      ogTitle: 'Inventory Management App | ScanMe AI',
      ogDescription:
        'Complete inventory management solution for retail stores and warehouses: live stock counts, transaction history, barcode lookups, and financial ledgers.',
      schemaJson: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Inventory Management App | ScanMe AI',
        url: 'https://scanme-ai.vercel.app/inventory-management',
        description:
          'Small business inventory management app. Track stock-in, stock-out, real-time inventory valuation, low-stock reorder alerts, and sales ledgers with ScanMe AI.',
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
              name: 'Inventory Management',
              item: 'https://scanme-ai.vercel.app/inventory-management',
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
        currentPath="/inventory-management"
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
          <span className="font-semibold text-slate-900">Inventory Management</span>
        </nav>

        {/* Hero Section */}
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold uppercase tracking-wide">
            <Boxes className="w-3.5 h-3.5 text-blue-600" />
            <span>Real-Time Stock Control</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Inventory Management for Small Business &amp; Retail
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-3xl">
            Streamline retail stock-in, point-of-sale stock-out, and financial auditing without expensive ERP systems or spreadsheet formulas. ScanMe AI gives you complete visibility over every product batch, shelf location, and margin.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onLaunchApp}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Boxes className="w-4 h-4" />
              <span>Open Inventory Manager</span>
            </button>
            <a
              href="/faq"
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath('/faq');
              }}
              className="px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-bold shadow-2xs transition-all flex items-center gap-2"
            >
              <span>View Frequently Asked Questions</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </a>
          </div>
        </header>

        {/* Core Inventory Features */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Stock-In &amp; Stock-Out Transactions Ledger
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Every movement of stock is recorded in a double-entry style ledger with full audit trails, tracking reasons (purchase, sales, damaged goods, return, manual adjustment):
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800">
                <ArrowDownRight className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm">Stock-In Intake</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Log new supplier deliveries using AI camera scanning or barcode verification. Automatically increments total quantity on hand and updates cost price records.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-100 space-y-2">
              <div className="flex items-center gap-2 text-rose-800">
                <ArrowUpRight className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-sm">Stock-Out &amp; Point of Sale (POS)</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Deduct sold quantities with quick barcode scans. Generate receipts, compute realized gross margins, and log customer invoices instantly.
              </p>
            </div>
          </div>
        </section>

        {/* Financial & Reporting Metrics */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Comprehensive Inventory Analytics &amp; Reports
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">Total Stock Valuation</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Calculates total retail value, landed cost basis, and projected profit across your entire catalog in real time.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Turnover Velocity</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Identify fast-moving top sellers versus slow-moving dormant items to optimize reorders and store space allocation.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">Low-Stock Alerts</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automated reorder notifications trigger as soon as item counts fall below customizable threshold limits.
              </p>
            </div>
          </div>
        </section>

        {/* Workflow Journey */}
        <section className="bg-blue-50/60 rounded-3xl p-6 sm:p-8 border border-blue-100 space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Connect Your Full Workflow
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Combine inventory management with AI scanning and expiry controls:
          </p>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <a
              href="/ai-product-scanner"
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath('/ai-product-scanner');
              }}
              className="px-3.5 py-2 rounded-xl bg-white border border-blue-200 text-blue-800 hover:bg-blue-100 text-xs font-bold transition-colors"
            >
              AI Product Scanner →
            </a>
            <a
              href="/barcode-scanner"
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath('/barcode-scanner');
              }}
              className="px-3.5 py-2 rounded-xl bg-white border border-blue-200 text-blue-800 hover:bg-blue-100 text-xs font-bold transition-colors"
            >
              Barcode &amp; QR Scanner →
            </a>
            <a
              href="/faq"
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath('/faq');
              }}
              className="px-3.5 py-2 rounded-xl bg-white border border-blue-200 text-blue-800 hover:bg-blue-100 text-xs font-bold transition-colors"
            >
              Frequently Asked Questions →
            </a>
          </div>
        </section>
      </main>

      <PublicSeoFooter onNavigatePath={onNavigatePath} onLaunchApp={onLaunchApp} />
    </div>
  );
};
