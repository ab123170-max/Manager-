/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  UtensilsCrossed,
  Clock,
  Boxes,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  Camera,
  Flame,
  TrendingDown,
} from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { AdSenseSlot } from '../../ads/AdSenseSlot';

interface PublicIndustryRestaurantPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicIndustryRestaurantPage: React.FC<PublicIndustryRestaurantPageProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  useEffect(() => {
    updateDocumentSeo({
      title: 'ScanMe AI for Restaurants & Cafes – Kitchen Ingredient & Expiry Control',
      description:
        'Cut kitchen food waste, track perishable dairy and pantry supplies, and manage restaurant ingredient stock-in with ScanMe AI. Free for cafes and commercial kitchens.',
      canonicalUrl: 'https://scanme-ai.vercel.app/for-restaurants',
      ogTitle: 'ScanMe AI for Restaurants & Cafes',
      ogDescription:
        'Mobile kitchen pantry inventory assistant. Track dairy, meat, and dry ingredient shelf lives to prevent food spoilage.',
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath="/for-restaurants"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onNavigatePath}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-black">
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>RESTAURANTS, CAFES &amp; COMMERCIAL KITCHENS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#092B4C] tracking-tight">
            Kitchen Ingredient Turnover &amp; Food Waste Prevention
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            In food service, ingredient spoilage directly eats into chef profitability. ScanMe AI gives restaurant managers a fast mobile tool to track pantry deliveries, monitor perishable expiration dates, and control food costs.
          </p>
        </div>

        {/* Pain Points */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-6">
          <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">
            Why Commercial Kitchens Struggle with Ingredient Control
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="space-y-2 p-4 rounded-2xl bg-rose-50/50 border border-rose-100">
              <span className="font-bold text-rose-800 block text-sm">1. High Perishability of Dairy &amp; Sauces</span>
              <p>
                Heavy creams, cheeses, butter, and specialty sauces have tight shelf lives. When line cooks open new cartons without checking older containers in the walk-in cooler, ingredients sour and get discarded.
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
              <span className="font-bold text-amber-800 block text-sm">2. Hectic Rush Hours</span>
              <p>
                During Friday night dinner rushes, staff cannot sit at a computer terminal to log butter or oil consumption. Inventory checks only happen after food is already ruined.
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
              <span className="font-bold text-blue-800 block text-sm">3. Supplier Over-Ordering</span>
              <p>
                Without real-time stock balances on mobile phones, head chefs over-order 25-kilo sacks of rice or flour that sit in damp pantry corners past their best-before dates.
              </p>
            </div>
          </div>
        </section>

        {/* Benefits for Kitchens */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-8">
          <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">
            Practical Benefits for Restaurant Managers &amp; Chefs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Walk-In Cooler Audits in Minutes</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Walk through cold rooms with your phone camera, scanning carton expiry dates to flag any item expiring within 7 to 14 days for priority menu specials.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Daily Prep Stock-Out</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Log ingredients allocated to daily prep with one tap. Keep pantry counts synchronized so you never run out of signature dish staples.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Food Cost &amp; Valuation Control</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                View live valuation of kitchen inventory to track food cost percentages against weekly restaurant revenue.
              </p>
            </div>
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
            <span>Try Kitchen Stock Scanner Free</span>
          </button>
        </div>
      </main>

      <PublicFooter
        currentPath="/for-restaurants"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
