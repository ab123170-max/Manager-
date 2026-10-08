/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Cookie, ShieldCheck } from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { AdSenseSlot } from '../../ads/AdSenseSlot';

interface PublicCookiePolicyPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicCookiePolicyPage: React.FC<PublicCookiePolicyPageProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  useEffect(() => {
    updateDocumentSeo({
      title: 'Cookie Policy | ScanMe AI Retail Assistant',
      description:
        'Official Cookie Policy for ScanMe AI: details on local storage, session cookies, analytics, and Google AdSense advertising cookies.',
      canonicalUrl: 'https://scanme-ai.vercel.app/cookie-policy',
      ogTitle: 'Cookie Policy – ScanMe AI',
      ogDescription:
        'Understanding how ScanMe AI uses cookies and browser local storage to maintain your retail inventory state.',
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath="/cookie-policy"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-10">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#1473EA] text-xs font-black">
            <Cookie className="w-3.5 h-3.5" />
            <span>COOKIE TRANSPARENCY &amp; CONSENT</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#092B4C] tracking-tight">
            Cookie Policy
          </h1>
          <p className="text-xs text-slate-400">
            Effective Date: October 1, 2026 • Production URL: https://scanme-ai.vercel.app
          </p>
        </header>

        <article className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-8 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#092B4C]">1. What are Cookies and Local Storage?</h2>
            <p>
              Cookies are small text files placed on your device by websites you visit. Browser Local Storage (such as IndexedDB and localStorage) is a modern web standard that allows applications to store data securely on your device so that features continue to work without a continuous internet connection.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#092B4C]">2. How ScanMe AI Uses Local Storage (Essential)</h2>
            <p>
              ScanMe AI relies on browser local storage for essential operational functions:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Product Inventory Storage:</strong> Storing your products, barcodes, prices, and expiration dates locally so you can manage stock offline.</li>
              <li><strong>Language Preferences:</strong> Remembering whether you selected English or Nepali (नेपाली).</li>
              <li><strong>UI State:</strong> Preserving active dashboard filters, notification dismissal states, and dark/light settings.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#092B4C]">3. Google AdSense Advertising Cookies</h2>
            <p>
              We use Google AdSense to serve non-intrusive advertisements exclusively on approved public educational pages (such as guides and FAQs). Google and its advertising partners use cookies to serve personalized or non-personalized ads based on your prior visits to this and other websites across the internet.
            </p>
            <p>
              You can manage or disable personalized advertising cookies at any time via <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-[#1473EA] underline">Google Ads Settings</a> or through your browser's cookie preferences.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#092B4C]">4. How to Manage Cookies in Your Browser</h2>
            <p>
              Most web browsers allow you to control cookies through their settings. You can set your browser to refuse all cookies or notify you when a cookie is set. If you choose to clear your browser local storage, your locally saved inventory products will be removed unless you previously backed them up to Google Sheets or authenticated cloud storage.
            </p>
          </section>
        </article>

        {/* Safe Ad Placement */}
        <AdSenseSlot currentPath="/cookie-policy" />
      </main>

      <PublicFooter
        currentPath="/cookie-policy"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
