/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  Pill,
  Clock,
  Barcode,
  Boxes,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  Camera,
  FileText,
  Building,
} from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { AdSenseSlot } from '../../ads/AdSenseSlot';

interface PublicIndustryPharmacyPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicIndustryPharmacyPage: React.FC<PublicIndustryPharmacyPageProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  useEffect(() => {
    updateDocumentSeo({
      title: 'ScanMe AI for Retail Pharmacies – Medicine Batch & Expiry Tracker',
      description:
        'Track medicine batches, monitor drug shelf lives, and streamline distributor returns with ScanMe AI. Built for retail chemists, dispensaries, and community pharmacies.',
      canonicalUrl: 'https://scanme-ai.vercel.app/for-pharmacies',
      ogTitle: 'ScanMe AI for Retail Pharmacies & Chemists',
      ogDescription:
        'Mobile medicine batch and expiry inventory assistant for community pharmacies. Enforce FEFO dispensing and prevent expired medication write-offs.',
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath="/for-pharmacies"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-16">
        {/* Compliance Notice Banner */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm leading-relaxed flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Pharmaceutical Inventory Disclaimer:</strong> ScanMe AI is strictly an operational inventory-management and record-keeping tool. It is NOT clinical diagnostic or medical prescribing software. Licensed pharmacists and dispensary staff must always comply with national drug administration regulations, inspect physical tamper-evident seals, and follow manufacturer batch instructions.
          </div>
        </div>

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-black">
            <Pill className="w-3.5 h-3.5" />
            <span>RETAIL PHARMACY &amp; CHEMIST SOLUTIONS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#092B4C] tracking-tight">
            Batch &amp; Expiry Management for Community Pharmacies
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Community pharmacists face strict regulatory penalties for dispensing expired medicines alongside tight distributor return deadlines. Here is how ScanMe AI protects your patients and your pharmacy license.
          </p>
        </div>

        {/* The Real Problem */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-6">
          <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">
            Unique Inventory Challenges in Pharmacy Dispensaries
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="space-y-2 p-4 rounded-2xl bg-rose-50/50 border border-rose-100">
              <span className="font-bold text-rose-800 block text-sm">1. Mixed Batches in One Drawer</span>
              <p>
                A single dispensary drawer holding 20 boxes of an antibiotic may contain three different manufacturing batches with expiration dates separated by eight months. Without batch separation, staff inadvertently dispense newer stock first.
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
              <span className="font-bold text-amber-800 block text-sm">2. Strict Wholesaler Return Deadlines</span>
              <p>
                Pharmaceutical distributors routinely reject credit claims if near-expiry strips are returned less than 60 days before the printed expiry month. Missing this return window turns inventory into a 100% dead financial loss.
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
              <span className="font-bold text-blue-800 block text-sm">3. Bulky POS Systems Away from Racks</span>
              <p>
                Traditional billing terminals sit fixed at the billing counter. Taking physical stock of 3,000 medicine strips requires writing numbers on clipboards and typing them into desktop computers after hours.
              </p>
            </div>
          </div>
        </section>

        {/* How ScanMe Helps */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-8">
          <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">
            Recommended Pharmacy Workflow with ScanMe AI
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-[10px] font-black text-blue-600 uppercase">Step 1: Carton Reception</span>
              <h3 className="font-bold text-sm text-[#092B4C]">Scan Blister Foils &amp; Flaps</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Scan the stamped batch number, manufacturing date, and expiry date printed on carton flaps or blister strip foils directly at the receiving counter.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-[10px] font-black text-blue-600 uppercase">Step 2: Rack Organization</span>
              <h3 className="font-bold text-sm text-[#092B4C]">Arrange by Expiry Sequence</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Organize dispensary racks by FEFO (First-Expired, First-Out). Strips expiring first stay at the front of each dispensing bin.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-[10px] font-black text-blue-600 uppercase">Step 3: 90-Day Return Audit</span>
              <h3 className="font-bold text-sm text-[#092B4C]">Wholesaler Credit Window</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Use the Expiry Radar to filter medicines expiring within 90 days. Pull near-expiry stock and send it to distributors for full credit reimbursement.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-[10px] font-black text-blue-600 uppercase">Step 4: Rapid Counter Lookup</span>
              <h3 className="font-bold text-sm text-[#092B4C]">Instant 1-Second Barcode Search</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Scan 2D Data Matrix or 1D barcodes with your phone to instantly verify available quantities, formulation strengths, and prices.
              </p>
            </div>
          </div>
        </section>

        {/* Benefits & Scope */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-3xl bg-white border border-slate-200/90 p-8 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-[#092B4C]">Practical Benefits for Dispensaries</h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Safeguards patient safety by preventing expired drug dispensation.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Captures wholesale credit by tracking 60-to-90 day distributor return eligibility.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Enables walk-around shelf auditing right at medicine racks using mobile phones.</span>
              </li>
            </ul>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200/90 p-8 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-[#092B4C]">Important Scope &amp; Legal Boundaries</h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Does not replace physical pharmacist verification of medication schedules.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Controlled substances must still be recorded in government-mandated registers.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Pharmacists must verify that scanned batch numbers match physical strip engravings.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-6 space-y-4">
          <button
            type="button"
            onClick={onLaunchApp}
            className="px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm transition-all shadow-lg shadow-blue-600/20 inline-flex items-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Open Pharmacy Scanner Free</span>
          </button>
        </div>
      </main>

      <PublicFooter
        currentPath="/for-pharmacies"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
