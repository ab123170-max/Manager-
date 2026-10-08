/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  Clock,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  TrendingDown,
  Sparkles,
  Camera,
  Layers,
} from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { AdSenseSlot } from '../../ads/AdSenseSlot';

interface PublicExpiryManagementPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicExpiryManagementPage: React.FC<PublicExpiryManagementPageProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  useEffect(() => {
    updateDocumentSeo({
      title: 'Retail Expiry Management Guide – MFD, EXD & Shelf-Life | ScanMe AI',
      description:
        'Comprehensive guide to retail expiry date tracking: MFD vs EXD vs Best-Before, First-Expired First-Out (FEFO) shelf rotation, 30-day radar warnings, and food waste reduction.',
      canonicalUrl: 'https://scanme-ai.vercel.app/expiry-management',
      ogTitle: 'Retail Expiry Management & Shelf-Life Tracking Guide',
      ogDescription:
        'Learn how independent stores, Kirana shops, and pharmacies eliminate expired stock write-offs with mobile date tracking and FEFO restocking.',
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath="/expiry-management"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-16">
        {/* Compliance Notice */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm leading-relaxed flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Pharmaceutical &amp; Medical Disclaimer:</strong> For medicines, medical devices, and regulated health products, ScanMe AI is strictly an inventory record-keeping and date-tracking assistant. It does not replace professional clinical advice or manufacturer lot inspection. Pharmacists and healthcare retailers must strictly follow applicable pharmaceutical laws, official drug administration guidelines, and manufacturer storage specifications.
          </div>
        </div>

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-black">
            <Clock className="w-3.5 h-3.5" />
            <span>EXPIRY DATE AUDIT &amp; SHELF-LIFE SCIENCE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#092B4C] tracking-tight">
            The Complete Guide to Retail Expiry Management
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Expired stock is not just an unfortunate accident—it is a direct drain on working capital that damages customer trust and risks legal fines. Here is how modern retailers master expiration dates.
          </p>
        </div>

        {/* Educational Core: Acronym Breakdown */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-8">
          <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">
            Understanding Packaging Date Stamps: MFD vs. EXD vs. Best-Before
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                Anchor Date
              </span>
              <h3 className="font-bold text-base text-[#092B4C]">MFD / Date of Manufacture</h3>
              <p>
                MFD indicates the exact date when the item was formulated, cooked, compounded, or packaged at the manufacturing facility.
              </p>
              <p className="font-medium text-slate-700">
                MFD is NOT an expiration date. It is the reference starting point used to calculate relative expiration statements such as "Best before 12 months from manufacture".
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                Hard Safety Limit
              </span>
              <h3 className="font-bold text-base text-[#092B4C]">EXD / Use-By Date</h3>
              <p>
                EXD or Use-By indicates strict safety boundaries. After this calendar date, the manufacturer cannot guarantee microbial safety, sterility, or chemical potency.
              </p>
              <p className="font-medium text-slate-700">
                Selling products past their printed EXD is illegal in almost all jurisdictions and poses severe consumer health risks.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                Quality Indicator
              </span>
              <h3 className="font-bold text-base text-[#092B4C]">Best-Before Date</h3>
              <p>
                Best-Before indicates peak sensory quality, aroma, crispness, and vitamin retention. After this date, unopened food may remain wholesome to eat, but flavor or texture may degrade.
              </p>
              <p className="font-medium text-slate-700">
                For commercial retail shelves, items nearing or crossing Best-Before dates must be heavily discounted or removed.
              </p>
            </div>
          </div>
        </section>

        {/* Why Expiry Tracking Matters */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-6">
          <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">
            Why Expiry Tracking Matters for Small Business Economics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="space-y-3">
              <h3 className="font-bold text-base text-slate-900">1. Profit Margin Destruction</h3>
              <p>
                If your shop operates on a 10% net margin, throwing away a Rs. 200 bottle of cooking oil requires selling Rs. 2,000 worth of fresh goods just to break even on that single lost item.
              </p>
              <h3 className="font-bold text-base text-slate-900">2. Customer Retention &amp; Trust</h3>
              <p>
                When a regular customer purchases a biscuit packet or infant food only to discover at home that it expired two weeks ago, they rarely return to complain—they simply switch to a competitor store.
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="font-bold text-base text-slate-900">3. Regulatory Inspections &amp; Penalties</h3>
              <p>
                Food safety officers and drug inspectors conduct surprise retail raids. Storing expired goods on consumer display shelves leads to on-the-spot confiscations and heavy fines.
              </p>
              <h3 className="font-bold text-base text-slate-900">4. Wholesaler Credit Recovery</h3>
              <p>
                Distributors only reimburse near-expiry inventory if returned 60 to 90 days before expiration. Without early digital warnings, store owners miss the return window entirely.
              </p>
            </div>
          </div>
        </section>

        {/* The FEFO System */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-6">
          <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">
            The FEFO Rule: How Small Shops Should Restock Shelves
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Traditional grocery staff often practice FIFO (First-In, First-Out), assuming delivery order matches expiration order. In reality, distributors frequently deliver newly manufactured cartons on Monday and older factory surplus batches on Friday.
          </p>

          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
            <h3 className="font-bold text-emerald-950 text-base">The FEFO Standard (First-Expired, First-Out)</h3>
            <p className="text-xs sm:text-sm text-emerald-900 leading-relaxed">
              Whenever opening delivery cartons, arrange products on shelves so that items with the earliest expiration date sit at the front, directly accessible to browsing customers. Newly delivered items with longer shelf lives must always be placed toward the back.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center pt-6 space-y-4">
          <button
            type="button"
            onClick={onLaunchApp}
            className="px-8 py-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-sm transition-all shadow-lg shadow-amber-600/20 inline-flex items-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Activate 30-Day Expiry Radar Free</span>
          </button>
        </div>
      </main>

      <PublicFooter
        currentPath="/expiry-management"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
