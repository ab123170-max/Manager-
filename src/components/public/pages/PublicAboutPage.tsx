/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  Info,
  ShieldCheck,
  CheckCircle2,
  Heart,
  Globe2,
  Lock,
  Smartphone,
  Sparkles,
  Camera,
  ArrowRight,
} from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { AdSenseSlot } from '../../ads/AdSenseSlot';

interface PublicAboutPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicAboutPage: React.FC<PublicAboutPageProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  useEffect(() => {
    updateDocumentSeo({
      title: 'About ScanMe AI – Smart Retail & Inventory Management',
      description:
        'Learn about ScanMe AI: our mission to empower independent retailers with accessible computer vision, eliminate expired stock losses, and protect business privacy.',
      canonicalUrl: 'https://scanme-ai.vercel.app/about',
      ogTitle: 'About ScanMe AI – Mission, Technology & Architecture',
      ogDescription:
        'Why we built ScanMe AI for small grocery stores, pharmacies, and local businesses without expensive POS hardware.',
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath="/about"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#1473EA] text-xs font-black">
            <Info className="w-3.5 h-3.5" />
            <span>OUR MISSION &amp; PHILOSOPHY</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#092B4C] tracking-tight">
            About ScanMe AI
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            ScanMe AI was created to solve a straightforward, high-impact problem: independent small businesses lose too much time to manual typing and too much money to expired stock.
          </p>
        </div>

        {/* The Problem We Solve */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-10 shadow-sm space-y-6">
          <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">
            The Problem We Set Out to Solve
          </h2>
          <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <p>
              Large supermarket chains have multi-million dollar ERP systems, automated barcode conveyor belts, and dedicated loss-prevention departments. Independent grocery stores, Kirana shops, neighborhood pharmacies, and small cafes have none of that.
            </p>
            <p>
              Instead, local shopkeepers rely on paper registers, memory, and late-night manual data entry. Stamped expiry dates get pushed to the back of shelves and forgotten. When goods expire, the shopkeeper absorbs the entire financial loss directly out of their household income.
            </p>
            <p>
              We believed modern computer vision could solve this without requiring store owners to buy $500 POS desktop hardware or pay expensive enterprise software subscriptions.
            </p>
          </div>
        </section>

        {/* Product Philosophy */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-10 shadow-sm space-y-6">
          <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">
            Our Core Product Philosophy
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="font-bold text-slate-900 block text-sm">1. Hardware Independence</span>
              <p>
                ScanMe AI runs on the smartphone already in your pocket. There is no requirement for specialized handheld laser guns, dedicated thermal printers, or fixed checkout stations.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="font-bold text-slate-900 block text-sm">2. Zero Friction &amp; Fast Setup</span>
              <p>
                Open the website or native app and start scanning immediately. You do not need to sit through multi-hour onboarding demos or provide a credit card to begin managing your stock.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="font-bold text-slate-900 block text-sm">3. Localized for South Asian Retail Realities</span>
              <p>
                Engineered with native bilingual support for Nepali (नेपाली) and English, multi-currency pricing (NPR, INR, USD, EUR), and optical OCR trained on local regional packaging scripts.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="font-bold text-slate-900 block text-sm">4. Offline-First Resilience</span>
              <p>
                Power cuts and unstable mobile networks should never freeze a retail checkout. ScanMe AI uses on-device local storage (IndexedDB) as its foundation so you can keep working offline.
              </p>
            </div>
          </div>
        </section>

        {/* Privacy-Conscious Architecture */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-10 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">
              Privacy-Conscious Architecture
            </h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <p>
              Your store inventory is your private business property. ScanMe AI is architected with strict data boundaries:
            </p>
            <ul className="space-y-2 font-medium text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>We do NOT sell, rent, or monetize your store inventory records or sales data.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Camera video frames are processed locally on your device for real-time tracking.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All backend API requests are proxied server-side with zero client API key exposure.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>You can export or purge your inventory records at any time.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Safe Ad Placement */}
        <AdSenseSlot currentPath="/about" />

        {/* CTA */}
        <div className="text-center pt-4">
          <button
            type="button"
            onClick={onLaunchApp}
            className="px-8 py-4 rounded-2xl bg-[#1473EA] hover:bg-blue-600 text-white font-black text-sm transition-all shadow-lg shadow-[#1473EA]/20 inline-flex items-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Launch ScanMe AI Free</span>
          </button>
        </div>
      </main>

      <PublicFooter
        currentPath="/about"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
