/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { FileText, ShieldAlert } from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { AdSenseSlot } from '../../ads/AdSenseSlot';

interface PublicTermsPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicTermsPage: React.FC<PublicTermsPageProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  useEffect(() => {
    updateDocumentSeo({
      title: 'Terms of Service | ScanMe AI Retail Assistant',
      description:
        'Official Terms of Service for ScanMe AI: user responsibilities, optical recognition accuracy limitations, inventory tool disclaimers, and acceptable use.',
      canonicalUrl: 'https://scanme-ai.vercel.app/terms',
      ogTitle: 'Terms of Service – ScanMe AI',
      ogDescription:
        'Terms of Service and user agreement for ScanMe AI product scanner and inventory manager.',
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath="/terms"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-10">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#1473EA] text-xs font-black">
            <FileText className="w-3.5 h-3.5" />
            <span>LEGAL AGREEMENT &amp; TERMS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#092B4C] tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-slate-400">
            Last Updated: October 1, 2026 • Production URL: https://scanme-ai.vercel.app
          </p>
        </header>

        <article className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-8 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#092B4C]">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the ScanMe AI web application (https://scanme-ai.vercel.app) or native Android application, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#092B4C]">2. Purpose &amp; Operational Scope</h2>
            <p>
              ScanMe AI is provided as an operational assistant for commercial stocktaking, retail product detection, barcode reading, and date tracking.
            </p>
            <p>
              <strong>Optical OCR Verification Responsibility:</strong> While our computer-vision models achieve high accuracy on packaging labels, variations in ambient lighting, torn wrapping, reflective foils, or unusual fonts can impact optical reading. The storekeeper is solely responsible for verifying the extracted numbers on the AutoFill form before committing them to legal accounts or selling products to consumers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#092B4C]">3. Specific Industry &amp; Medical Disclaimers</h2>
            <p>
              For pharmacies, chemists, and medical supply businesses: ScanMe AI is NOT medical diagnosis, prescription verification, or patient care software. Storekeepers must verify physical drug schedules, inspect manufacturer safety seals, and strictly follow applicable pharmaceutical laws in their jurisdiction.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#092B4C]">4. Acceptable Commercial Use</h2>
            <p>
              You agree to use ScanMe AI exclusively for legitimate business, educational, or inventory purposes. You agree not to attempt denial-of-service attacks, reverse engineer the server API proxies, or use automated scrapers against the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#092B4C]">5. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, ScanMe AI and its developers shall not be liable for any indirect, incidental, or consequential damages resulting from inventory discrepancies, misread expiration dates, or lost commercial profits.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#092B4C]">6. Inquiries</h2>
            <p>
              For questions regarding these Terms, contact ab123170@gmail.com.
            </p>
          </section>
        </article>

        {/* Safe Ad Placement */}
        <AdSenseSlot currentPath="/terms" />
      </main>

      <PublicFooter
        currentPath="/terms"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
