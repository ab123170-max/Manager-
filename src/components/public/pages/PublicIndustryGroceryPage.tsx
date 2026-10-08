/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  Store,
  Clock,
  Barcode,
  Boxes,
  TrendingDown,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  Camera,
  Layers,
  Sparkles,
} from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { AdSenseSlot } from '../../ads/AdSenseSlot';

interface PublicIndustryGroceryPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicIndustryGroceryPage: React.FC<PublicIndustryGroceryPageProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  useEffect(() => {
    updateDocumentSeo({
      title: 'ScanMe AI for Grocery & Kirana Stores – Inventory & Expiry Control',
      description:
        'Eliminate expired food waste, automate stock intake, and track FMCG packaged goods with ScanMe AI. Built for grocery shops, Kirana stores, and local supermarkets.',
      canonicalUrl: 'https://scanme-ai.vercel.app/for-grocery-stores',
      ogTitle: 'ScanMe AI for Grocery & Kirana Stores',
      ogDescription:
        'The mobile inventory assistant designed for neighborhood grocery shops. Fast camera scanning, 30-day expiry alerts, and zero hardware expense.',
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath="/for-grocery-stores"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black">
            <Store className="w-3.5 h-3.5" />
            <span>GROCERY &amp; KIRANA RETAIL SOLUTIONS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#092B4C] tracking-tight">
            Smart Inventory &amp; Expiry Tracking for Neighborhood Grocery Stores
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Neighborhood grocery stores, Kirana shops, and mini-marts deal with fast-moving inventory, high transaction volumes, and tight profit margins. Here is how ScanMe AI protects your daily bottom line.
          </p>
        </div>

        {/* The Real Problem */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-6">
          <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">
            The Actual Inventory Problems Facing Grocery Retailers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="space-y-2 p-4 rounded-2xl bg-rose-50/50 border border-rose-100">
              <span className="font-bold text-rose-800 block text-sm">1. High Spoilage on Fast-Movers</span>
              <p>
                Packaged dairy, bakery goods, snacks, biscuits, and cooking oils arrive with varied expiration dates. When newly arrived crates are placed in front of existing stock, older items get buried and expire unnoticed.
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
              <span className="font-bold text-amber-800 block text-sm">2. Exhausting Delivery Intakes</span>
              <p>
                Wholesale distributors drop 40 to 80 crates at the shop entrance during peak shopping hours. Writing product names, pack sizes, and prices in paper registers takes up to an hour per delivery.
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
              <span className="font-bold text-blue-800 block text-sm">3. Loose vs. Packaged Discrepancies</span>
              <p>
                Kirana stores carry both branded barcoded goods and local unbarcoded staples (flours, pulses, dry spices). Standard POS apps force you into rigid barcode-only setups that fail on local packaging.
              </p>
            </div>
          </div>
        </section>

        {/* How ScanMe AI Helps: Real Workflow */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-8">
          <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">
            Example Daily Grocery Workflow with ScanMe AI
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-[10px] font-black text-[#1473EA] uppercase">Step 1: Morning Delivery</span>
              <h3 className="font-bold text-sm text-[#092B4C]">Point Camera at Crates</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                As distributor crates are unpacked, the storekeeper points their phone at each carton. The AI reads brand name, price (MRP), and printed EXD in under 2 seconds.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-[10px] font-black text-[#1473EA] uppercase">Step 2: Shelf Placement</span>
              <h3 className="font-bold text-sm text-[#092B4C]">Enforce FEFO Shelf Order</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                The storekeeper glances at the scanned expiry date. Items expiring sooner stay in front; items with long shelf life are placed toward the back.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-[10px] font-black text-[#1473EA] uppercase">Step 3: Mid-Month Radar</span>
              <h3 className="font-bold text-sm text-[#092B4C]">Check 30-Day Expiry Radar</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                ScanMe AI highlights packaged cookies or juices expiring this month. The owner moves them to a counter basket for a quick 20% discount sale.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-[10px] font-black text-[#1473EA] uppercase">Step 4: Evening Close</span>
              <h3 className="font-bold text-sm text-[#092B4C]">1-Tap Stock Valuation</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Review total inventory value, low-stock staples, and daily sales logs directly from the smartphone screen before locking the shutters.
              </p>
            </div>
          </div>
        </section>

        {/* Practical Benefits & Honest Limitations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-3xl bg-white border border-slate-200/90 p-8 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-[#092B4C]">Practical Benefits for Grocers</h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Zero hardware costs—works on existing Android or iOS smartphones.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Cuts delivery logging time by over 75% compared to paper notebooks.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Supports both English and Devanagari labels found on local regional goods.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Offline-first architecture maintains full capability during power and internet outages.</span>
              </li>
            </ul>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200/90 p-8 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-[#092B4C]">Operational Limitations to Keep in Mind</h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Unpackaged fresh produce (loose tomatoes, potatoes) requires manual quantity logging.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Extremely dark backrooms may require turning on your phone flashlight for clear camera OCR.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Always glance at the AutoFill form to verify dot-matrix date stamps before saving.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-6 space-y-4">
          <button
            type="button"
            onClick={onLaunchApp}
            className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition-all shadow-lg shadow-emerald-600/20 inline-flex items-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Start Scanning Grocery Stock Free</span>
          </button>
        </div>
      </main>

      <PublicFooter
        currentPath="/for-grocery-stores"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
