/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  Stethoscope,
  ShieldCheck,
  Clock,
  Barcode,
  Boxes,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  Camera,
  Layers,
  ThermometerSnowflake,
} from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { AdSenseSlot } from '../../ads/AdSenseSlot';

interface PublicIndustryMedicalStorePageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicIndustryMedicalStorePage: React.FC<PublicIndustryMedicalStorePageProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  useEffect(() => {
    updateDocumentSeo({
      title: 'ScanMe AI for Medical Supply Stores – Surgical Goods & Lot Tracking',
      description:
        'Manage sterile surgical supplies, diagnostic consumables, and medical equipment shelf lives with ScanMe AI. Barcode and camera tracking for healthcare supply retailers.',
      canonicalUrl: 'https://scanme-ai.vercel.app/for-medical-stores',
      ogTitle: 'ScanMe AI for Medical Supply & Surgical Stores',
      ogDescription:
        'Track sterile consumable shelf lives, lot numbers, and supplier shipments with mobile AI camera scanning.',
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath="/for-medical-stores"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-16">
        {/* Compliance Notice */}
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 text-xs sm:text-sm leading-relaxed flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Medical Supplies Notice:</strong> ScanMe AI assists with physical inventory counts, lot recording, and warehouse expiration tracking. It does not certify medical device sterility, nor does it replace specialized hospital sterilization logs. Always follow manufacturer storage instructions.
          </div>
        </div>

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-black">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>MEDICAL &amp; SURGICAL SUPPLY SOLUTIONS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#092B4C] tracking-tight">
            Lot Tracking &amp; Shelf-Life Control for Medical Stores
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Medical supply dealers and surgical instrument retailers manage high-value sterile goods with strict manufacturer shelf-life expiration dates. Here is how ScanMe AI streamlines warehouse intake and audits.
          </p>
        </div>

        {/* Real Problems */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-6">
          <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">
            Inventory Pain Points in Healthcare Supply Stores
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="space-y-2 p-4 rounded-2xl bg-rose-50/50 border border-rose-100">
              <span className="font-bold text-rose-800 block text-sm">1. Sterility Expiration on Surgical Items</span>
              <p>
                Surgical sutures, IV cannulas, catheter sets, and sterile dressings carry strict barrier-integrity expiration dates. Once past date, sterile barriers can no longer be guaranteed, and products must be incinerated.
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
              <span className="font-bold text-amber-800 block text-sm">2. Diagnostic Reagent Shelf Lives</span>
              <p>
                Blood glucose test strips, urine test reagents, and diagnostic rapid kits degrade rapidly if stored past manufacturer shelf limits, leading to false lab test results if sold to clinics.
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
              <span className="font-bold text-blue-800 block text-sm">3. Complex Manufacturer Lot Numbers</span>
              <p>
                Medical packaging labels carry dense alphanumeric lot identifiers (LOT), sterilization dates (STERILE EO), and manufacture stamps. Typing 16-character alphanumeric codes by hand is error-prone.
              </p>
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-8">
          <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">
            Medical Store Restocking Workflow with ScanMe AI
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-[10px] font-black text-teal-600 uppercase">Phase 1: Inward Delivery</span>
              <h3 className="font-bold text-sm text-[#092B4C]">Capture Lot &amp; Expiry Symbols</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Scan carton labels to capture brand name, size/gauge, lot number, and hourglass expiration symbols in seconds.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-[10px] font-black text-teal-600 uppercase">Phase 2: Clinic Allocation</span>
              <h3 className="font-bold text-sm text-[#092B4C]">Dispatch by Oldest Lot</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                When supplying clinics or nursing homes, check the live catalog to dispatch items with the shortest remaining shelf life first.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-[10px] font-black text-teal-600 uppercase">Phase 3: Quarterly Audit</span>
              <h3 className="font-bold text-sm text-[#092B4C]">Sterile Expiry Radar</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Export comprehensive inventory reports to Google Sheets for institutional hospital buyers and annual audit checks.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center pt-6 space-y-4">
          <button
            type="button"
            onClick={onLaunchApp}
            className="px-8 py-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-sm transition-all shadow-lg shadow-teal-600/20 inline-flex items-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Launch Medical Inventory Scanner</span>
          </button>
        </div>
      </main>

      <PublicFooter
        currentPath="/for-medical-stores"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
