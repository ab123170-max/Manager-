/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Camera,
  Boxes,
} from 'lucide-react';
import { updateDocumentSeo } from '../../utils/seoHelper';
import { PublicSeoNavbar } from './PublicSeoNavbar';
import { PublicSeoFooter } from './PublicSeoFooter';

interface PublicFaqPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
  onLogin: () => void;
}

export const PUBLIC_FAQS = [
  {
    question: 'What is ScanMe AI?',
    answer:
      'ScanMe AI is an AI-powered product scanner and inventory manager designed for shops, warehouses, and small businesses to extract product information, scan barcodes and QR codes, track expiry dates, and automate stock control.',
  },
  {
    question: 'How does AI product scanning work?',
    answer:
      'Capture 1 to 5 photos of product packaging with your device camera. ScanMe AI uses computer vision and OCR to read label text, extract product attributes (product name, price/MRP, MFD, EXP, shelf life), and autofill structured inventory forms in seconds without manual typing.',
  },
  {
    question: 'Can ScanMe AI scan barcodes?',
    answer:
      'Yes. ScanMe AI includes a high-speed in-browser barcode reader supporting standard 1D symbologies including UPC-A, UPC-E, EAN-13, EAN-8, Code 128, Code 39, and ITF directly via your camera.',
  },
  {
    question: 'Can ScanMe AI scan QR codes?',
    answer:
      'Yes. ScanMe AI instantly decodes 2D QR codes and Data Matrix codes printed on retail packaging, master shipping cases, invoices, and digital asset tags.',
  },
  {
    question: 'Can ScanMe AI extract product information from an image?',
    answer:
      'Yes. ScanMe AI extracts brand names, product variants, net weight/volume, pricing, manufacturing dates, and expiration dates even from curved, glossy, or low-light packaging surfaces.',
  },
  {
    question: 'Can ScanMe AI track product expiry dates?',
    answer:
      'Yes. ScanMe AI tracks expiry dates, calculates end-of-life dates from relative shelf-life statements (e.g., "Best within 12 months"), and issues proactive 30-day early expiration warnings to prevent spoiled inventory and eliminate waste.',
  },
  {
    question: 'Can ScanMe AI manage inventory?',
    answer:
      'Yes. ScanMe AI provides complete inventory management including real-time stock balances, stock-in and stock-out logging, low-stock alerts, total inventory valuation, and sales turnover analytics.',
  },
  {
    question: 'Who can use ScanMe AI?',
    answer:
      'ScanMe AI is built for retail store owners, grocery shops, convenience stores, pharmacies, supermarket staff, warehouse operators, and small businesses that want fast, hardware-free inventory control.',
  },
];

export const PublicFaqPage: React.FC<PublicFaqPageProps> = ({
  onNavigatePath,
  onLaunchApp,
  onLogin,
}) => {
  const [openIndices, setOpenIndices] = useState<number[]>([0, 1]);

  useEffect(() => {
    updateDocumentSeo({
      title: 'Frequently Asked Questions | ScanMe AI',
      description:
        'Find answers to common questions about ScanMe AI product scanning, barcode decoding, expiry date tracking, and small business inventory management.',
      canonicalUrl: 'https://scanme-ai.vercel.app/faq',
      ogTitle: 'Frequently Asked Questions | ScanMe AI',
      ogDescription:
        'Learn how ScanMe AI helps businesses automate product scanning, OCR data extraction, barcode reading, and inventory tracking.',
      schemaJson: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: PUBLIC_FAQS.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
    });
  }, []);

  const toggleIndex = (index: number) => {
    setOpenIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col justify-between">
      <PublicSeoNavbar
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
        onLogin={onLogin}
        currentPath="/faq"
      />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full space-y-10">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigatePath('/');
            }}
            className="hover:text-indigo-600 transition-colors"
          >
            Home
          </a>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-900">Frequently Asked Questions</span>
        </nav>

        {/* Hero Section */}
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold uppercase tracking-wide">
            <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
            <span>Knowledge Base &amp; Answers</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Frequently Asked Questions
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
            Everything you need to know about ScanMe AI's AI product scanner, barcode reader, expiry date tracking, and small business inventory management.
          </p>
        </header>

        {/* FAQ Accordion List */}
        <section className="space-y-3 pt-2">
          {PUBLIC_FAQS.map((faq, index) => {
            const isOpen = openIndices.includes(index);
            return (
              <div
                key={faq.question}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleIndex(index)}
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
        </section>

        {/* Internal Link Suggestions */}
        <section className="bg-purple-50/60 rounded-3xl p-6 sm:p-8 border border-purple-100 space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Learn More About Our Capabilities
          </h2>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <a
              href="/ai-product-scanner"
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath('/ai-product-scanner');
              }}
              className="px-3.5 py-2 rounded-xl bg-white border border-purple-200 text-purple-900 hover:bg-purple-100 text-xs font-bold transition-colors"
            >
              AI Product Scanner →
            </a>
            <a
              href="/barcode-scanner"
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath('/barcode-scanner');
              }}
              className="px-3.5 py-2 rounded-xl bg-white border border-purple-200 text-purple-900 hover:bg-purple-100 text-xs font-bold transition-colors"
            >
              Barcode &amp; QR Scanner →
            </a>
            <a
              href="/expiry-date-scanner"
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath('/expiry-date-scanner');
              }}
              className="px-3.5 py-2 rounded-xl bg-white border border-purple-200 text-purple-900 hover:bg-purple-100 text-xs font-bold transition-colors"
            >
              Expiry Date Scanner →
            </a>
            <a
              href="/inventory-management"
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath('/inventory-management');
              }}
              className="px-3.5 py-2 rounded-xl bg-white border border-purple-200 text-purple-900 hover:bg-purple-100 text-xs font-bold transition-colors"
            >
              Inventory Management →
            </a>
          </div>
        </section>
      </main>

      <PublicSeoFooter onNavigatePath={onNavigatePath} onLaunchApp={onLaunchApp} />
    </div>
  );
};
