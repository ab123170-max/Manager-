/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Camera,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { AdSenseSlot } from '../../ads/AdSenseSlot';

interface PublicFaqPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

export const PublicFaqPage: React.FC<PublicFaqPageProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  const faqs: FaqItem[] = [
    {
      category: 'General',
      question: 'What is ScanMe AI?',
      answer:
        'ScanMe AI is an on-device computer-vision and inventory-management assistant created for small independent businesses. It turns any smartphone or web camera into an optical scanner that identifies retail packaging, reads 1D barcodes and 2D QR codes, extracts product details (brand, price, MFD, EXD), and tracks stock quantities in a live digital ledger.',
    },
    {
      category: 'General',
      question: 'Who can use ScanMe AI?',
      answer:
        'ScanMe AI is built for neighborhood grocery stores, Kirana shops, retail chemists and pharmacies, medical supply dealers, restaurants, cafes, hotels, and general retailers who want to cut inventory loss without investing in expensive desktop POS terminals or barcode guns.',
    },
    {
      category: 'General',
      question: 'Is ScanMe AI free to use?',
      answer:
        'Yes. The core product scanning engine, 1D/2D barcode reader, local inventory ledger, 30-day expiry radar, and Google Sheets export are completely free for small retailers and shopkeepers.',
    },
    {
      category: 'Industry Applications',
      question: 'Can grocery and Kirana stores use ScanMe AI?',
      answer:
        'Yes. Grocery shops use ScanMe AI to process fast-moving consumer goods (FMCG), unpack wholesale delivery crates in minutes, track bread and dairy expiration dates, and enforce First-Expired, First-Out (FEFO) shelf restocking.',
    },
    {
      category: 'Industry Applications',
      question: 'Can retail pharmacies and chemists use ScanMe AI?',
      answer:
        'Yes. Pharmacies use ScanMe AI to record medicine batch numbers and expiration dates from blister foils and carton flaps. The 90-day expiry radar helps pharmacists return near-expiry stock to pharmaceutical distributors for full credit. Please note: ScanMe AI is strictly an inventory-tracking tool and does not provide clinical or prescribing advice.',
    },
    {
      category: 'Industry Applications',
      question: 'Can restaurants, cafes, and bakeries use ScanMe AI?',
      answer:
        'Yes. Food service businesses use ScanMe AI to monitor pantry stock, track dairy and perishable ingredient shelf lives in walk-in coolers, and log daily recipe ingredient usage to prevent kitchen food waste.',
    },
    {
      category: 'Scanning & AI',
      question: 'What information can ScanMe AI extract from packaging photos?',
      answer:
        'The multimodal vision engine extracts: Product Brand Name, Specific Variant, Retail Price (MRP in Rs., NPR, INR, USD, EUR, GBP), Manufacturing Date (MFD), Expiration Date (EXD), Best-Before Duration (in months), and Package Net Weight/Quantity.',
    },
    {
      category: 'Scanning & AI',
      question: 'Does ScanMe AI track product expiry dates?',
      answer:
        'Yes. ScanMe AI monitors expiration dates continuously and flags items on your Expiry Radar 30, 60, and 90 days in advance. If a package only states "Best before 12 months from MFD 03/2026", the engine automatically computes the final expiry date (March 2027).',
    },
    {
      category: 'Scanning & AI',
      question: 'Does ScanMe AI support standard 1D barcodes and 2D QR codes?',
      answer:
        'Yes. The built-in scanner decodes standard retail 1D formats (EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, ITF) as well as 2D QR codes and Data Matrix symbols with zero external laser hardware required.',
    },
    {
      category: 'Scanning & AI',
      question: 'Can users manually correct extracted information?',
      answer:
        'Always. ScanMe AI never writes directly to your database without your permission. After scanning, all extracted fields appear in an editable AutoFill review card where you can tap to edit any number, date, or price before saving.',
    },
    {
      category: 'Scanning & AI',
      question: 'What happens when AI extraction fails on damaged packaging?',
      answer:
        'If a label is torn, smudged, or in extreme darkness, ScanMe AI informs you immediately and allows you to retry the photo or manually type the missing fields. The system never guesses or fabricates prices or dates.',
    },
    {
      category: 'Data & Privacy',
      question: 'Does ScanMe AI save my products and work offline?',
      answer:
        'Yes. ScanMe AI uses on-device local storage (IndexedDB) as its foundation. Your catalog, transactions, and scan history remain fully functional even when the internet or power goes out. When connected, records can optionally sync to secure cloud storage or Google Sheets.',
    },
    {
      category: 'Data & Privacy',
      question: 'How does account authentication work?',
      answer:
        'You can use ScanMe AI immediately without an account in instant local mode. To back up records across multiple devices or sync with staff members, you can sign in securely with email or Google Authentication.',
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    updateDocumentSeo({
      title: 'ScanMe AI Frequently Asked Questions (FAQ) | Retail Scanner',
      description:
        'Find accurate answers to common questions about ScanMe AI: camera scanning, barcode reader, medicine expiry tracking, offline storage, and supported businesses.',
      canonicalUrl: 'https://scanme-ai.vercel.app/faq',
      ogTitle: 'Frequently Asked Questions | ScanMe AI',
      ogDescription:
        'Detailed answers about ScanMe AI capabilities, supported packaging formats, retail workflows, and data security.',
      schemaJson: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath="/faq"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#1473EA] text-xs font-black">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>COMMONLY ASKED QUESTIONS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#092B4C] tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Everything you need to know about ScanMe AI scanning accuracy, device compatibility, data privacy, and retail operations.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-2xs transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      {faq.category}
                    </span>
                    <h2 className="text-sm sm:text-base font-bold text-[#092B4C]">
                      {faq.question}
                    </h2>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 animate-in fade-in duration-150">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Safe AdSense Placement */}
        <div className="pt-4">
          <AdSenseSlot currentPath="/faq" />
        </div>

        {/* CTA */}
        <div className="text-center pt-4 space-y-3">
          <p className="text-xs text-slate-500">Have a question not listed here?</p>
          <a
            href="/contact"
            onClick={(e) => {
              e.preventDefault();
              onNavigatePath('/contact');
            }}
            className="text-xs font-bold text-[#1473EA] hover:underline"
          >
            Contact our support team directly →
          </a>
        </div>
      </main>

      <PublicFooter
        currentPath="/faq"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
