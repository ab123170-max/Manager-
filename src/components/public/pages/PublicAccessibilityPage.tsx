/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Accessibility, CheckCircle2 } from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { AdSenseSlot } from '../../ads/AdSenseSlot';

interface PublicAccessibilityPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicAccessibilityPage: React.FC<PublicAccessibilityPageProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  useEffect(() => {
    updateDocumentSeo({
      title: 'Accessibility Statement | ScanMe AI Retail Assistant',
      description:
        'Official Accessibility Statement for ScanMe AI: our commitment to WCAG 2.1 standards, keyboard navigation, color contrast, and screen reader accessibility.',
      canonicalUrl: 'https://scanme-ai.vercel.app/accessibility',
      ogTitle: 'Accessibility Statement – ScanMe AI',
      ogDescription:
        'Commitment to digital accessibility for all users, shopkeepers, and retailers.',
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath="/accessibility"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-10">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#1473EA] text-xs font-black">
            <Accessibility className="w-3.5 h-3.5" />
            <span>UNIVERSAL ACCESS &amp; USABILITY</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#092B4C] tracking-tight">
            Accessibility Statement
          </h1>
          <p className="text-xs text-slate-400">
            Standards: WCAG 2.1 Level AA Guidelines • Production URL: https://scanme-ai.vercel.app
          </p>
        </header>

        <article className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-8 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#092B4C]">1. Our Accessibility Commitment</h2>
            <p>
              ScanMe AI is committed to ensuring digital accessibility for all people, including storekeepers with visual, auditory, cognitive, or motor impairments. We continually improve the user experience and apply relevant accessibility standards across our web and mobile applications.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#092B4C]">2. Standards &amp; Conformance</h2>
            <p>
              We strive to adhere to the Web Content Accessibility Guidelines (WCAG) 2.1 at Level AA conformance. Measures implemented include:
            </p>
            <ul className="space-y-2 font-medium text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Keyboard Navigability: All interactive controls, modals, and buttons are operable via keyboard Tab/Enter/Escape.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Color Contrast: Text and interactive elements maintain minimum 4.5:1 contrast ratios against backgrounds.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Semantic HTML &amp; ARIA: Meaningful landmark regions (header, main, nav, footer, aside) and descriptive ARIA labels.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Auditory &amp; Visual Feedback: Audio chimes for scan success are accompanied by distinct visual green checks and text banners.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Text Sizing &amp; Responsive Zoom: Pages scale gracefully without loss of content up to 200% browser zoom.</span>
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#092B4C]">3. Feedback &amp; Accessibility Inquiries</h2>
            <p>
              We welcome your feedback on the accessibility of ScanMe AI. If you experience accessibility barriers while using our scanning software, please email ab123170@gmail.com and our team will work to resolve the issue promptly.
            </p>
          </section>
        </article>

        {/* Safe Ad Placement */}
        <AdSenseSlot currentPath="/accessibility" />
      </main>

      <PublicFooter
        currentPath="/accessibility"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
