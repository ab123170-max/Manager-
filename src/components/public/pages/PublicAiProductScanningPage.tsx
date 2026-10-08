/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  Camera,
  Sparkles,
  Layers,
  Crosshair,
  Crop,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { AdSenseSlot } from '../../ads/AdSenseSlot';

interface PublicAiProductScanningPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicAiProductScanningPage: React.FC<PublicAiProductScanningPageProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  useEffect(() => {
    updateDocumentSeo({
      title: 'AI Product Scanner – Multimodal Packaging Vision & OCR | ScanMe AI',
      description:
        'Discover how AI product scanning works: real-time bounding box tracking, smart cropping, multi-shot synthesis, and multimodal OCR extracting brand names, prices, MFD, and EXP.',
      canonicalUrl: 'https://scanme-ai.vercel.app/ai-product-scanning',
      ogTitle: 'AI Product Scanner – Packaging Vision & OCR Engine',
      ogDescription:
        'Technical overview of multimodal retail computer vision: how ScanMe AI extracts structured inventory fields from physical packaging photos.',
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath="/ai-product-scanning"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#1473EA] text-xs font-black">
            <Sparkles className="w-3.5 h-3.5" />
            <span>MULTIMODAL COMPUTER VISION PIPELINE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#092B4C] tracking-tight">
            How AI Product Scanning Works: From Pixels to Data
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Traditional flat document scanners fail on curved bottles, crinkled plastic pouches, and glossy metallic packaging. Learn how ScanMe AI solves the hard geometry of retail packaging vision.
          </p>
        </div>

        {/* Technical Architecture Breakdown */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-8">
          <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">
            The 4 Technical Layers of ScanMe AI Vision
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <h3 className="font-bold text-base text-[#092B4C] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#1473EA] text-white flex items-center justify-center text-xs">1</span>
                <span>On-Device Frame Analysis (30 FPS)</span>
              </h3>
              <p>
                Video streaming to the cloud is battery-draining and laggy. ScanMe AI performs continuous frame evaluation locally on your device hardware, analyzing contrast histograms and luminance gradients to identify foreground products without sending a single byte over the network.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <h3 className="font-bold text-base text-[#092B4C] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#1473EA] text-white flex items-center justify-center text-xs">2</span>
                <span>Real-Time Bounding Box &amp; Tracking ID</span>
              </h3>
              <p>
                When a product enters the camera viewfinder, our tracking engine assigns a unique tracking ID (TRK-XXX) and draws an adaptive bounding box. As you move or angle your device, linear smoothing ensures the box tracks the product smoothly without jitter or flicker.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <h3 className="font-bold text-base text-[#092B4C] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#1473EA] text-white flex items-center justify-center text-xs">3</span>
                <span>Stability Detection &amp; Smart Cropping</span>
              </h3>
              <p>
                The system measures inter-frame camera motion. When the user holds the phone steady for 600ms, the tracking box turns Emerald Green (Locked), automatically triggering a high-resolution snapshot and smart-cropping away extraneous shelves, hands, or floors.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <h3 className="font-bold text-base text-[#092B4C] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#1473EA] text-white flex items-center justify-center text-xs">4</span>
                <span>Multimodal Vision-Language Extraction</span>
              </h3>
              <p>
                The isolated packaging crop is evaluated by multimodal models trained on retail packaging typography. The engine parses the visual context to separate Brand Name, Variant, Price, MFD, EXD, and Shelf-Life into a structured AutoFill form ready for 1-tap review.
              </p>
            </div>
          </div>
        </section>

        {/* Multi-Shot Logic */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-6">
          <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">
            Multi-Shot Synthesis: Solving Multi-Sided Packaging
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Most retail packaging displays the product brand name on the front face, while the manufacturing date and retail price are stamped on the bottom flap or side seam. Taking only one picture leaves half the data missing.
          </p>

          <div className="p-6 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
            <span className="font-bold text-[#1473EA] text-base block">How Multi-Shot Works:</span>
            <p>
              ScanMe AI allows you to snap up to 5 photos of the same item. Take a shot of the front label, rotate the box to snap the expiry stamp on the bottom, and tap "Analyze". Our pipeline synthesizes all photos simultaneously under the same Tracking ID, giving you a complete, accurate record without manual typing.
            </p>
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
            <span>Launch AI Product Scanner Live</span>
          </button>
        </div>
      </main>

      <PublicFooter
        currentPath="/ai-product-scanning"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
