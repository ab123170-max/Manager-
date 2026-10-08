/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  Camera,
  Sparkles,
  Barcode,
  Clock,
  Boxes,
  Share2,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Search,
  SlidersHorizontal,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { AdSenseSlot } from '../../ads/AdSenseSlot';

interface PublicFeaturesPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicFeaturesPage: React.FC<PublicFeaturesPageProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  useEffect(() => {
    updateDocumentSeo({
      title: 'ScanMe AI Features – AI Scanner, Barcode Reader & Stock Ledger',
      description:
        'Explore ScanMe AI features: AI packaging recognition, multi-shot OCR, real-time object tracking, 1D/2D barcode reader, 30-day expiry radar, and Google Sheets sync.',
      canonicalUrl: 'https://scanme-ai.vercel.app/features',
      ogTitle: 'Features of ScanMe AI – Smart Retail Inventory Assistant',
      ogDescription:
        'Comprehensive breakdown of ScanMe AI camera scanning, barcode decoding, expiry date automation, and inventory control capabilities.',
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath="/features"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-16">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#1473EA] text-xs font-black">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PRODUCT CAPABILITIES &amp; ARCHITECTURE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#092B4C] tracking-tight">
            Complete Features Built for Fast Retail Execution
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Every feature in ScanMe AI was designed alongside real small-business owners to solve daily bottlenecks in stock intake, shelf rotation, and product accounting.
          </p>
        </div>

        {/* Feature 1: AI Product Scanning */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1473EA] flex items-center justify-center font-bold">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#1473EA] uppercase tracking-wider">Vision Engine</span>
              <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">1. AI Product Scanning &amp; Frame Tracking</h2>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            ScanMe AI replaces manual typing with computer-vision intelligence. Instead of typing long brand titles, batch numbers, and prices on a smartphone keyboard, the camera extracts structured fields straight from packaging labels.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Real-Time Object Detection</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Evaluates ambient illumination and luminance gradients on-device at 30 FPS. Draws an adaptive bounding box around the detected product.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Object Tracking &amp; Smoothing</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Maintains a unique tracking ID (e.g. TRK-084) while the user tilts or moves the phone. Linear interpolation prevents box flickering and jitter.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Smart Background Cropping</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Automatically discards hands, shelves, and background clutter, isolating only the text-dense packaging area for OCR analysis.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Multi-Shot Synthesis (1-5 Photos)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Captures front, back, and side panels of the same carton to combine product title, nutrition, and stamped expiration dates into one record.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Optical Character Recognition</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Identifies dot-matrix printed dates, embossed stamps, Devanagari labels, and diverse global currency symbols (Rs., ₹, $, €, £).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Human Verification &amp; Retry</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Extracted fields populate a review card where storekeepers can modify any field with 1 tap before committing to the inventory store.
              </p>
            </div>
          </div>
        </section>

        {/* Feature 2: Barcode & QR Scanner */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Barcode className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Barcode Engine</span>
              <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">2. High-Speed Barcode &amp; QR Code Scanning</h2>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            Eliminate bulky handheld laser barcode guns. ScanMe AI includes a lightning-fast browser and native camera barcode reader that instantly decodes retail 1D and 2D matrices.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Universal 1D Barcodes</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Decodes standard retail formats including EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, and ITF instantly.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">2D QR Codes &amp; Data Matrix</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Reads modern 2D QR codes and pharmaceutical Data Matrix symbols printed on secondary outer packaging.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Catalog Auto-Lookup</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Scanning an existing barcode brings up that product's stock count and price instantly, enabling rapid 1-second Stock-In or Stock-Out.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Unregistered Item Intake</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                If an unknown barcode is scanned, ScanMe AI pre-fills the barcode number into a new registration form for effortless catalog expansion.
              </p>
            </div>
          </div>
        </section>

        {/* Feature 3: Expiry Management */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Date Radar</span>
              <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">3. Expiry Management &amp; Early Alert System</h2>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            Stop throwing money into the trash bin. ScanMe AI actively tracks shelf lives and warns you weeks before products spoil so you can take commercial action.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Automatic Date Calculation</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Resolves complex labels like "Best before 18 months from MFD 02/2026" into an exact expiration date (August 2027) automatically.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">30-Day Proactive Alerts</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Categorizes your stock into Safe (Green), Expiring Soon within 30 days (Amber), and Expired (Red) with clear badge indicators.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Distributor Return Window</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Enables pharmacies and retailers to return near-expiry medicines and goods to suppliers within the 60-to-90 day refund window.
              </p>
            </div>
          </div>
        </section>

        {/* Feature 4: Stock Ledger & Inventory */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Accounting</span>
              <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">4. Live Stock Ledger &amp; Valuation Reports</h2>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            Gain immediate visibility into your shop’s financial health with real-time inventory balances and valuation metrics.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Stock-In &amp; Stock-Out Logs</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Every sale, reception, loss, or return is recorded with timestamp and reason, providing an audit trail for your bookkeeper.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Total Stock Valuation</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Calculates the live wholesale cost value and potential retail selling value (MRP) of everything sitting on your store shelves.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Low-Stock Alerts</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Configure minimum quantity thresholds to receive replenishment prompts before customer staples run out completely.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Google Sheets Backup</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sync your entire catalog and transactions directly with Google Sheets for backup, tax accounting, and external reporting.
              </p>
            </div>
          </div>
        </section>

        {/* Feature 5: Product Catalog & Sharing */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Commerce</span>
              <h2 className="text-xl sm:text-2xl font-black text-[#092B4C]">5. Digital Product Catalog &amp; Customer Sharing</h2>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            Turn your inventory into an interactive digital showcase. Share available items, promotional bundles, and shop contact details with customers via WhatsApp or direct link.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Visual Product Showcase</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Display product photos, pricing, and packaging details in a modern clean grid suitable for customer viewing on mobile phones.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Instant WhatsApp Sharing</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Send item details, available quantities, and current offers directly to regular neighborhood customers with one tap.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="font-bold text-sm text-[#092B4C]">Digital Visiting Card</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Generate a branded business profile with shop address, contact numbers, hours, and catalog links to promote your local store.
              </p>
            </div>
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
            <span>Try These Features in ScanMe AI Now</span>
          </button>
          <p className="text-xs text-slate-500">Free to use • No installation required • Works on any browser</p>
        </div>
      </main>

      <PublicFooter
        currentPath="/features"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
