/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  Barcode,
  QrCode,
  Zap,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Camera,
  Layers,
  Search,
} from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { AdSenseSlot } from '../../ads/AdSenseSlot';

interface PublicBarcodeScanningPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicBarcodeScanningPage: React.FC<PublicBarcodeScanningPageProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  useEffect(() => {
    updateDocumentSeo({
      title: 'Free Barcode & QR Code Scanner for Retail Inventory | ScanMe AI',
      description:
        'Transform your phone into a high-speed barcode reader. Scan EAN-13, UPC-A, Code 128, and QR codes directly in your browser. No expensive handheld scanner guns needed.',
      canonicalUrl: 'https://scanme-ai.vercel.app/barcode-scanning',
      ogTitle: 'Free Barcode & QR Code Scanner for Retail Stores',
      ogDescription:
        'Fast browser barcode decoding for retail stocktaking. Decode 1D barcodes and 2D QR codes with your device camera at zero hardware expense.',
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath="/barcode-scanning"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black">
            <Barcode className="w-3.5 h-3.5" />
            <span>OPTICAL CODE RECOGNITION</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#092B4C] tracking-tight">
            High-Speed Barcode &amp; QR Code Scanning for Inventory
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Eliminate bulky handheld laser scanner guns and tangled USB wires. ScanMe AI turns your existing smartphone camera into an industrial-grade barcode and QR code reader directly in your browser.
          </p>
        </div>

        {/* Formats Supported */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-8">
          <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">
            Supported Optical Code Formats
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs sm:text-sm text-slate-600">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="font-bold text-slate-900 block">EAN-13 &amp; EAN-8</span>
              <p>The standard barcode format on packaged consumer goods throughout Europe, Asia, and international markets.</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="font-bold text-slate-900 block">UPC-A &amp; UPC-E</span>
              <p>The universal product code standard found on North American retail packaging and imported consumer items.</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="font-bold text-slate-900 block">Code 128 &amp; Code 39</span>
              <p>High-density alphanumeric barcodes commonly used on warehouse shipping cartons, logistics labels, and asset tags.</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="font-bold text-slate-900 block">2D QR Codes &amp; Data Matrix</span>
              <p>Two-dimensional matrix codes printed on pharmaceutical cartons, electronic components, and digital invoices.</p>
            </div>
          </div>
        </section>

        {/* Benefits vs Hardware Laser Guns */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-6">
          <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">
            Why Camera Scanning Beats Dedicated Hardware Scanners
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-100">
              <h3 className="font-bold text-slate-900">Zero Hardware Maintenance</h3>
              <p>Dedicated laser guns require USB cables, replacement battery packs, and fixed desktop drivers that break down frequently in dusty retail environments.</p>
            </div>
            <div className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-100">
              <h3 className="font-bold text-slate-900">Multi-Angle Flexibility</h3>
              <p>Walk around cramped stockroom shelves with your smartphone, scanning barcodes located high on top racks without dragging extension cords.</p>
            </div>
            <div className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-100">
              <h3 className="font-bold text-slate-900">Instant Screen Feedback</h3>
              <p>Unlike a laser gun that only emits a blind beep, your phone screen immediately displays product photos, live stock balances, and current pricing.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center pt-6 space-y-4">
          <button
            type="button"
            onClick={onLaunchApp}
            className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition-all shadow-lg shadow-emerald-600/20 inline-flex items-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Open Barcode &amp; QR Scanner Free</span>
          </button>
        </div>
      </main>

      <PublicFooter
        currentPath="/barcode-scanning"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
