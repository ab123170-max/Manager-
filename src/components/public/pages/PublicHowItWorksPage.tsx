/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  Camera,
  Eye,
  Crosshair,
  Crop,
  Sparkles,
  CheckCircle2,
  Database,
  Clock,
  ArrowRight,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { AdSenseSlot } from '../../ads/AdSenseSlot';

interface PublicHowItWorksPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicHowItWorksPage: React.FC<PublicHowItWorksPageProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  useEffect(() => {
    updateDocumentSeo({
      title: 'How ScanMe AI Works – 9-Step Camera to Stock Workflow',
      description:
        'Discover the 9 simple steps of ScanMe AI: from pointing your camera at packaging, real-time object tracking, and smart cropping to AI extraction and expiry radar.',
      canonicalUrl: 'https://scanme-ai.vercel.app/how-it-works',
      ogTitle: 'How ScanMe AI Works – Step-by-Step AI Scanner Guide',
      ogDescription:
        'Visual step-by-step walkthrough explaining how ScanMe AI detects, tracks, crops, extracts, and manages retail product inventory.',
    });
  }, []);

  const steps = [
    {
      number: 'STEP 1',
      title: 'Open ScanMe AI',
      desc: 'Open https://scanme-ai.vercel.app in any web browser on your smartphone, tablet, or laptop, or launch the native Android APK. No app store installation or complex account creation is required to begin scanning.',
      icon: Smartphone,
      color: 'bg-blue-50 text-[#1473EA]',
    },
    {
      number: 'STEP 2',
      title: 'Point Camera at Products',
      desc: 'Position your device camera 15 to 25 cm away from the product carton, bottle, pouch, or box. The live preview opens immediately using native camera hardware.',
      icon: Camera,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      number: 'STEP 3',
      title: 'ScanMe Detects Products',
      desc: 'Lightweight on-device computer vision algorithms evaluate frame contrast, edges, and luminance gradients in real time at 30 FPS to identify the packaging boundary.',
      icon: Eye,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      number: 'STEP 4',
      title: 'Detection Boxes Track the Product',
      desc: 'A visible rectangular bounding box locks onto the detected item with a unique tracking ID (e.g. TRK-084). As you move or angle the phone, the box smoothly follows the product without shaking.',
      icon: Crosshair,
      color: 'bg-cyan-50 text-cyan-600',
    },
    {
      number: 'STEP 5',
      title: 'System Crops the Detected Product',
      desc: 'Once the frame achieves optical stability (Emerald Green state), ScanMe AI smart-crops the packaging area, eliminating irrelevant background shelves, hands, or floors.',
      icon: Crop,
      color: 'bg-teal-50 text-teal-600',
    },
    {
      number: 'STEP 6',
      title: 'AI Extracts Product Information',
      desc: 'Multimodal vision models analyze the cropped image to recognize the Brand Name, Product Variant, Price/MRP, Date of Manufacture (MFD), Expiry Date (EXD), and Shelf Life.',
      icon: Sparkles,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      number: 'STEP 7',
      title: 'User Reviews the Result',
      desc: 'The extracted fields populate a clean AutoFill review card. Storekeepers can quickly glance at the fields and make instant manual adjustments if needed before saving.',
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      number: 'STEP 8',
      title: 'Product is Saved into Inventory',
      desc: 'With a single tap on "Save to Inventory", the item enters your digital catalog, updating live stock counts, total inventory valuation, and category lists.',
      icon: Database,
      color: 'bg-blue-50 text-blue-700',
    },
    {
      number: 'STEP 9',
      title: 'Expiry Information is Monitored',
      desc: 'The item is now on the active Expiry Radar. You receive automated warnings 30, 60, and 90 days before the product reaches its expiration deadline, preventing dead stock.',
      icon: Clock,
      color: 'bg-rose-50 text-rose-600',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath="/how-it-works"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-16">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#1473EA] text-xs font-black">
            <Sparkles className="w-3.5 h-3.5" />
            <span>THE 9-STAGE SMART PIPELINE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#092B4C] tracking-tight">
            How ScanMe AI Works: From Camera Frame to Stock Ledger
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Follow the complete workflow showing how our computer-vision and AI pipeline turns physical packaging photos into structured, actionable inventory data in seconds.
          </p>
        </div>

        {/* 9-Step Timeline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-6 relative hover:border-[#1473EA] transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                      {step.number}
                    </span>
                    <div className={`w-10 h-10 rounded-2xl ${step.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h2 className="text-lg font-black text-[#092B4C] tracking-tight">
                    {step.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                  <span>Stage {idx + 1} of 9</span>
                  {idx < steps.length - 1 ? (
                    <span className="text-[#1473EA]">Next: {steps[idx + 1].title} →</span>
                  ) : (
                    <span className="text-emerald-600">Complete!</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quality Check Section */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-6">
          <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">
            Why Quality Checks &amp; Human Review Always Come First
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <p>
              <strong>1. Never Guess Price or Expiry:</strong> ScanMe AI never invents information. If a printed expiry date is smudged or torn, the AI marks the field as missing and prompts the storekeeper to glance at the carton and enter it manually.
            </p>
            <p>
              <strong>2. No Black-Box Errors:</strong> Every extracted field is shown in the editable AutoFill form prior to saving. You retain 100% control over the numbers entering your inventory records.
            </p>
            <p>
              <strong>3. Multi-Angle Verification:</strong> If a product has its title on the front and expiry stamped on the bottom, our multi-shot workflow synthesizes up to 5 pictures of the same item into one unified record.
            </p>
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="text-center pt-6 space-y-4">
          <button
            type="button"
            onClick={onLaunchApp}
            className="px-8 py-4 rounded-2xl bg-[#1473EA] hover:bg-blue-600 text-white font-black text-sm transition-all shadow-lg shadow-[#1473EA]/20 inline-flex items-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Try the 9-Step Scanner Live</span>
          </button>
        </div>
      </main>

      <PublicFooter
        currentPath="/how-it-works"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
