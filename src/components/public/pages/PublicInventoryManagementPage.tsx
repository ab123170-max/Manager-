/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  Boxes,
  Layers,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Search,
  SlidersHorizontal,
  Camera,
  RotateCw,
} from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { AdSenseSlot } from '../../ads/AdSenseSlot';

interface PublicInventoryManagementPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicInventoryManagementPage: React.FC<PublicInventoryManagementPageProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  useEffect(() => {
    updateDocumentSeo({
      title: 'Digital Inventory Management for Small Retailers | ScanMe AI',
      description:
        'Master inventory control without expensive hardware. Learn stock-in and stock-out ledger tracking, valuation calculations, low-stock reordering, and Google Sheets sync.',
      canonicalUrl: 'https://scanme-ai.vercel.app/inventory-management',
      ogTitle: 'Digital Inventory Management Software | ScanMe AI',
      ogDescription:
        'Complete guide to modern retail inventory management: real-time stock balances, turnover valuation, cycle counts, and mobile camera intake.',
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath="/inventory-management"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#1473EA] text-xs font-black">
            <Boxes className="w-3.5 h-3.5" />
            <span>RETAIL STOCK CONTROL HANDBOOK</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#092B4C] tracking-tight">
            Digital Inventory Management for Independent Retailers
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Effective stock management is the single biggest differentiator between struggling retail shops and thriving, cash-flow-positive businesses. Discover how modern digital ledgers replace messy registers.
          </p>
        </div>

        {/* Educational Section 1: The Core Principles */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-8">
          <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">
            The Four Pillars of Retail Inventory Control
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="space-y-3 p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <h3 className="font-bold text-base text-[#092B4C] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs">1</span>
                <span>The Live Stock-In / Stock-Out Ledger</span>
              </h3>
              <p>
                Inventory is dynamic. Whenever a supplier crate arrives, a Stock-In record must be created with quantity, unit cost, and selling price. Whenever an item is sold, damaged, or returned, a corresponding Stock-Out entry is logged.
              </p>
              <p className="font-medium text-slate-700">
                Without synchronized transaction logging, physical shelf counts inevitably diverge from accounting records.
              </p>
            </div>

            <div className="space-y-3 p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <h3 className="font-bold text-base text-[#092B4C] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs">2</span>
                <span>Real-Time Valuation (Cost vs. MRP)</span>
              </h3>
              <p>
                Knowing you have 400 total items in your shop is meaningless unless you know their monetary value. ScanMe AI continuously calculates two numbers: Total Wholesale Cost (your invested capital) and Total Retail Valuation (projected revenue).
              </p>
              <p className="font-medium text-slate-700">
                This gives owners immediate insight into gross margin potential and working capital distribution.
              </p>
            </div>

            <div className="space-y-3 p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <h3 className="font-bold text-base text-[#092B4C] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs">3</span>
                <span>Reorder Point &amp; Low-Stock Warnings</span>
              </h3>
              <p>
                Running out of popular everyday items (cooking oil, salt, baby soap) sends customers straight to your competitor across the street. Setting minimum reorder thresholds ensures you order fresh stock before physical shelves empty.
              </p>
              <p className="font-medium text-slate-700">
                ScanMe AI flags low-stock items automatically on your morning dashboard slider.
              </p>
            </div>

            <div className="space-y-3 p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <h3 className="font-bold text-base text-[#092B4C] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs">4</span>
                <span>Weekly Rolling Cycle Counts</span>
              </h3>
              <p>
                Never wait for annual tax season to count your inventory. Cycle counting involves auditing one small shelf or category every week.
              </p>
              <p className="font-medium text-slate-700">
                A 15-minute weekly mobile scan keeps numbers accurate year-round without closing your doors to customers.
              </p>
            </div>
          </div>
        </section>

        {/* Integration with Google Sheets */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Cloud Data Interoperability</span>
              <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">Seamless Google Sheets Backup &amp; Sync</h2>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            We believe your business data belongs entirely to you. ScanMe AI features a 1-tap Google Sheets integration that exports your complete product catalog, stock balances, price points, and transaction ledgers directly into your personal Google Drive spreadsheet.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm text-slate-600">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="font-bold text-slate-900">Zero Vendor Lock-In:</span>
              <p>Your records are always exported in universal standard CSV and Google Sheet formats.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="font-bold text-slate-900">Accountant Ready:</span>
              <p>Share your exported Google Sheet directly with your tax consultant or bank without manual reformatting.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="font-bold text-slate-900">Multi-Device Access:</span>
              <p>Update stock from your mobile phone on the shop floor, and inspect sheets from your home computer at night.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center pt-6 space-y-4">
          <button
            type="button"
            onClick={onLaunchApp}
            className="px-8 py-4 rounded-2xl bg-[#1473EA] hover:bg-blue-600 text-white font-black text-sm transition-all shadow-lg shadow-[#1473EA]/20 inline-flex items-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Open Free Inventory Manager Now</span>
          </button>
        </div>
      </main>

      <PublicFooter
        currentPath="/inventory-management"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
