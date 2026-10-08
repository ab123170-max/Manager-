/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  Hotel,
  Clock,
  Boxes,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Camera,
  Layers,
  Sparkles,
} from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { AdSenseSlot } from '../../ads/AdSenseSlot';

interface PublicIndustryHotelPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicIndustryHotelPage: React.FC<PublicIndustryHotelPageProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  useEffect(() => {
    updateDocumentSeo({
      title: 'ScanMe AI for Hotels & Lodges – Amenities & Minibar Inventory',
      description:
        'Track housekeeping amenities, minibar beverages, and hotel guest supplies with ScanMe AI. Mobile stock scanning for boutique hotels, resorts, and lodges.',
      canonicalUrl: 'https://scanme-ai.vercel.app/for-hotels',
      ogTitle: 'ScanMe AI for Hotels & Lodges',
      ogDescription:
        'Mobile guest supplies and minibar stock assistant for hotel managers. Prevent amenity stockouts and monitor beverage expiration dates.',
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath="/for-hotels"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black">
            <Hotel className="w-3.5 h-3.5" />
            <span>HOTELS, RESORTS &amp; LODGES</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#092B4C] tracking-tight">
            Guest Supplies, Amenities &amp; Minibar Inventory Control
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            From luxury guest toiletries to minibar canned beverages, hotel operations demand seamless supply replenishment without room service delays. Here is how ScanMe AI helps hospitality teams.
          </p>
        </div>

        {/* Real Hospitality Challenges */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-6">
          <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">
            Hospitality Inventory Bottlenecks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="space-y-2 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
              <span className="font-bold text-indigo-900 block text-sm">1. Minibar Beverage Expirations</span>
              <p>
                Canned sodas, craft beers, and chocolates inside guest room minibars sit in low-turnover rooms during off-peak seasons, quietly crossing expiration dates and risking guest complaints.
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
              <span className="font-bold text-blue-900 block text-sm">2. Scattered Housekeeping Carts</span>
              <p>
                Guest soaps, toothbrushes, shampoos, and coffee pods are distributed across housekeeping floors without a centralized count, leading to panic replenishment orders.
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-2xl bg-teal-50/50 border border-teal-100">
              <span className="font-bold text-teal-900 block text-sm">3. Multi-Department Blindspots</span>
              <p>
                Housekeeping, Front Desk, and the Restaurant Kitchen frequently order overlapping cleaning supplies and beverages without shared inventory visibility.
              </p>
            </div>
          </div>
        </section>

        {/* Benefits for Hotels */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-8">
          <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">
            How ScanMe AI Streamlines Hotel Operations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Fast Delivery Intake</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Receive bulk shipments of guest amenities and beverages with camera barcode scans. Auto-categorize items into Housekeeping, Food &amp; Beverage, or Maintenance.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Minibar Expiry Tracking</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Scan minibar items to monitor expiration dates automatically. Rotate older canned drinks to high-traffic hotel bar areas before they expire.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Multi-Floor Auditing</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Housekeeping supervisors use mobile phones to check linen and toilet amenity balances across multiple storage closets without clipboards.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center pt-6 space-y-4">
          <button
            type="button"
            onClick={onLaunchApp}
            className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm transition-all shadow-lg shadow-indigo-600/20 inline-flex items-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Launch Hotel Supply Scanner</span>
          </button>
        </div>
      </main>

      <PublicFooter
        currentPath="/for-hotels"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
