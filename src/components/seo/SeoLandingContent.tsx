/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Camera,
  Sparkles,
  CheckCircle2,
  Scan,
  Barcode,
  Layers,
  Calendar,
  DollarSign,
  Tag,
  ChevronDown,
  ShieldCheck,
  Zap,
  ArrowRight,
  Clock,
  Box,
} from 'lucide-react';
import { MenuSection, AppSubView } from '../../types';

interface SeoLandingContentProps {
  onNavigate?: (section: MenuSection, subView: AppSubView) => void;
}

interface FaqItem {
  question: string;
  answer: string;
}

export const SEO_FAQS: FaqItem[] = [
  {
    question: 'What is ScanMe AI?',
    answer:
      'ScanMe AI (also known as Scan Me AI) is an intelligent product scanner that uses advanced computer vision and AI OCR to automatically extract product information from packaging images into editable digital forms.',
  },
  {
    question: 'How does the AI product scanner work?',
    answer:
      'Simply upload or snap photos of any product label or retail packaging. ScanMe AI analyzes the visual text, identifies essential attributes like product name, price, manufacturing date (MFD), expiry date (EXP), and best-before duration, and automatically populates structured form fields in seconds.',
  },
  {
    question: 'Can ScanMe AI extract product information from an image?',
    answer:
      'Yes. ScanMe AI is engineered specifically for image-to-form extraction. It analyzes retail packaging photos, food labels, cosmetics, and consumer goods to extract text and data accurately even from angled, curved, or low-light surfaces.',
  },
  {
    question: 'Can it extract product names and prices?',
    answer:
      'Yes. The scanner identifies the primary brand and product name along with printed price or MRP (Maximum Retail Price) markings, accurately parsing numeric amounts and currency designations without manual typing.',
  },
  {
    question: 'Can it read manufacture and expiry dates?',
    answer:
      'Yes. ScanMe AI accurately recognizes date stamps including MFD, MFG, DOM, PKD, EXP, EXD, Best Before, and Use-By dates. It standardizes diverse international date formats and calculates final expiration dates when a shelf-life duration (e.g., "Best before 12 months") is stated.',
  },
  {
    question: 'Can AI automatically fill a form from a product image?',
    answer:
      'Yes. With instant image-to-form autofill, captured product attributes are mapped directly into structured form inputs, eliminating tedious manual data entry and speeding up inventory receiving, e-commerce cataloging, and stock management.',
  },
  {
    question: 'Does ScanMe AI support barcode scanning?',
    answer:
      'Yes. In addition to multimodal AI vision scanning, ScanMe AI includes a high-speed local 1D and 2D barcode and QR code scanner capable of reading UPC, EAN, Code 128, and QR formats directly in your browser without requiring external software.',
  },
];

export const SeoLandingContent: React.FC<SeoLandingContentProps> = ({ onNavigate }) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const handleScrollToScanner = (subView: AppSubView = 'scan_product') => {
    if (onNavigate) {
      onNavigate('inventory_in', subView);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <article
      id="seo-overview"
      className="mt-14 pt-10 border-t border-slate-200/80 space-y-12 text-slate-800"
      aria-label="ScanMe AI Product Information and Capabilities"
    >
      {/* ==================================================================== */}
      {/* 1. PRIMARY H1 HERO SEO SECTION                                       */}
      {/* ==================================================================== */}
      <section className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-xs relative overflow-hidden">
        <div className="max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI Product Scanner · Image to Form Autofill</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            AI Product Scanner &amp; Image-to-Form Autofill
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
            Welcome to <strong>ScanMe AI</strong> (also known as <em>Scan Me AI</em>), the next-generation <strong>AI product scanner</strong> designed to streamline retail receiving, cataloging, and inventory auditing. Scan products with AI and automatically extract product name, price, manufacture date, expiry date, and other essential product details directly from packaging images into structured forms.
          </p>

          {/* Quick Action Navigation for crawlers and real users */}
          <nav
            aria-label="Quick Scanner Modes"
            className="flex flex-wrap items-center gap-3 pt-2"
          >
            <button
              type="button"
              onClick={() => handleScrollToScanner('scan_product')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Launch AI Camera Scanner</span>
            </button>
            <button
              type="button"
              onClick={() => handleScrollToScanner('barcode_scanner')}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Barcode className="w-4 h-4" />
              <span>Barcode Scanner</span>
            </button>
            <button
              type="button"
              onClick={() => handleScrollToScanner('manual_entry')}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Box className="w-4 h-4" />
              <span>Manual Product Entry</span>
            </button>
          </nav>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 2. SCAN PRODUCT INFORMATION WITH AI                                  */}
      {/* ==================================================================== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
            <Scan className="w-4 h-4" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Scan Product Information With AI
          </h2>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
          Traditional manual entry for product receiving and inventory stock-in is time-consuming and error-prone. <strong>ScanMe AI</strong> combines state-of-the-art multimodal vision intelligence with high-precision <strong>AI OCR</strong> to read complex labels, stamps, nutritional facts, and packaging typography. Whether you are searching for an <em>AI scanner</em>, <em>product scanner</em>, or an <em>image to form autofill</em> solution, ScanMe AI transforms your smartphone or web camera into a professional <strong>product data extraction</strong> station.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Zero Typing Automation</h3>
            <p className="text-xs text-slate-600 leading-normal">
              Capture label images and watch form inputs auto-populate in under two seconds. Avoid transcription errors across product names and batch numbers.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Multi-Shot Image Analysis</h3>
            <p className="text-xs text-slate-600 leading-normal">
              Snap multiple angles of the same package—such as the front branding, side barcode, and stamped expiration date—for synchronized, comprehensive data synthesis.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Intelligent Date Calculation</h3>
            <p className="text-xs text-slate-600 leading-normal">
              Automatically distinguishes manufacturing dates from expiry stamps. When packaging displays shelf-life duration, ScanMe AI calculates the true expiration date instantly.
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 3. HOW SCANME AI WORKS                                               */}
      {/* ==================================================================== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
            <Camera className="w-4 h-4" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            How ScanMe AI Works
          </h2>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
          Using ScanMe AI is designed to be effortless for store clerks, warehouse managers, and consumers:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
            <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-black">
              Step 1
            </span>
            <h3 className="font-bold text-sm text-slate-900">Capture or Upload</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Take 1 to 5 clear photos of the product using your device camera or upload image files directly into the scanner workspace.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
            <span className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-600 text-white text-[11px] font-black">
              Step 2
            </span>
            <h3 className="font-bold text-sm text-slate-900">AI Vision &amp; OCR Scan</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              ScanMe AI applies localized image preprocessing, contrast enhancement, and neural OCR models to parse textual and numerical markings.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
            <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-black">
              Step 3
            </span>
            <h3 className="font-bold text-sm text-slate-900">Automatic Form Fill</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Extracted fields—including product name, price, manufacture date, and expiration date—are mapped directly into an interactive form.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
            <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-black">
              Step 4
            </span>
            <h3 className="font-bold text-sm text-slate-900">Review &amp; Stock In</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Verify the fields with side-by-side confidence indicators, make any quick adjustments, and commit the item directly into your inventory.
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 4. PRODUCT INFORMATION YOU CAN EXTRACT                              */}
      {/* ==================================================================== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
            <Tag className="w-4 h-4" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Product Information You Can Extract
          </h2>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
          ScanMe AI specializes in extracting structured metadata from diverse packaging styles, blister packs, bottles, cans, boxes, and cartons:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 shrink-0">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Product Name Extraction</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Accurately isolates the commercial brand, product line, and variant name from foreground graphics.
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Price &amp; MRP Extraction</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Reads maximum retail price (MRP), unit pricing, and currency notations automatically.
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Manufacture Date Scanner</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Detects MFD, MFG, DOM, and PKD date stamps across dotted matrix and laser-etched codes.
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Expiry Date Scanner</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Reads EXP, EXD, Use-By, and Expiration dates to ensure stock rotation and food safety.
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Best Before Duration</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Interprets relative shelf-life phrases (e.g. &ldquo;Best within 24 months&rdquo;) and computes valid calendar dates.
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700 shrink-0">
              <Barcode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Barcode &amp; QR Scanning</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Instantly decodes UPC, EAN-13, Code 128, and QR codes for synchronized database lookups.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 5. AI SCANNER FEATURES                                               */}
      {/* ==================================================================== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            AI Scanner Features
          </h2>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
          ScanMe AI was engineered from the ground up to solve common challenges in retail stock-in and physical inventory management:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Multi-Camera &amp; Torch Integration</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Switch seamlessly between front and environment cameras with built-in flashlight toggle to illuminate dark warehouse shelves and shadowy storerooms.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Adaptive Preprocessing &amp; Binarization</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automatic edge detection, perspective alignment, and luminance leveling ensure unreadable or glossy packaging prints become sharp and legible.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Comprehensive Inventory Intelligence</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Beyond scanning, access real-time valuation, stock movement ledgers, low stock notifications, turnover velocity metrics, and proactive 30-day expiration alerts.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Enterprise-Grade Privacy &amp; Security</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              All AI processing runs through secure server-side conduits. Sensitive API credentials are never exposed to browser clients, keeping your business data safe.
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 6. FREQUENTLY ASKED QUESTIONS (FAQ)                                 */}
      {/* ==================================================================== */}
      <section id="faq" className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
          Everything you need to know about using ScanMe AI for product scanning, OCR data extraction, and automatic form filling:
        </p>

        <div className="space-y-3 pt-2">
          {SEO_FAQS.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={faq.question}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'transform rotate-180 text-indigo-600' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${index}`}
                    className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100"
                  >
                    <p className="pt-2">{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Semantic Discovery Note (Natural discovery for alternative queries) */}
      <section className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 text-xs text-slate-500 leading-relaxed">
        <p>
          <strong>Search Discovery Note:</strong> Whether you searched for <em>ScanMe AI</em>, <em>Scan Me AI</em>, <em>AI product scanner</em>, <em>product scanner</em>, <em>image to form autofill</em>, <em>OCR product scanner</em>, or <em>expiry date scanner</em>, this web application is engineered to provide fast, reliable data extraction from retail and grocery items directly inside your browser.
        </p>
      </section>
    </article>
  );
};
