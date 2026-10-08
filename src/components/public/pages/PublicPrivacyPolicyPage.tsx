/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { ShieldCheck, Lock, Eye, Database, FileText } from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { AdSenseSlot } from '../../ads/AdSenseSlot';

interface PublicPrivacyPolicyPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicPrivacyPolicyPage: React.FC<PublicPrivacyPolicyPageProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  useEffect(() => {
    updateDocumentSeo({
      title: 'Privacy Policy | ScanMe AI Retail Assistant',
      description:
        'Official Privacy Policy for ScanMe AI: transparent details on camera stream processing, on-device local storage, authentication, and zero third-party sale of user data.',
      canonicalUrl: 'https://scanme-ai.vercel.app/privacy-policy',
      ogTitle: 'Privacy Policy – ScanMe AI',
      ogDescription:
        'Transparent data practices: how ScanMe AI processes packaging photos and stores inventory records safely.',
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath="/privacy-policy"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-10">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#1473EA] text-xs font-black">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>DATA GOVERNANCE &amp; PRIVACY</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#092B4C] tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-400">
            Effective Date: October 1, 2026 • Production URL: https://scanme-ai.vercel.app
          </p>
        </header>

        <article className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-8 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#092B4C]">1. Introduction &amp; Core Commitment</h2>
            <p>
              ScanMe AI ("we", "us", or "the application") provides camera-assisted product scanning, barcode identification, expiry date monitoring, and inventory cataloging for independent retailers, grocery stores, pharmacies, restaurants, and small businesses.
            </p>
            <p>
              We respect the privacy of your commercial operations. We do NOT sell, rent, monetize, or trade your store inventory records, sales transactions, or customer lists to any third party.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#092B4C]">2. Camera Processing &amp; Video Streams</h2>
            <p>
              ScanMe AI requires camera permissions solely to scan product packaging, labels, barcodes, and QR codes.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Live Video Frames:</strong> Continuous real-time object tracking and bounding box calculations run locally on your device hardware (30 FPS). Video frames are never recorded, streamed, or stored on remote servers.
              </li>
              <li>
                <strong>Captured Snapshots:</strong> Only when you explicitly capture photos (or trigger stable auto-capture) are cropped packaging images sent to our server-side optical vision proxy to perform OCR and field extraction.
              </li>
              <li>
                Temporary photo buffers are flushed from local device memory when you finish or discard an intake session.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#092B4C]">3. How Your Data is Stored</h2>
            <p>
              ScanMe AI operates primarily as an offline-first web application.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>On-Device Storage (IndexedDB &amp; LocalStorage):</strong> Your product catalog, stock counts, cost prices, selling prices, and transaction ledgers reside securely inside your browser's private sandbox storage on your physical device.
              </li>
              <li>
                <strong>Optional Cloud Sync:</strong> If you choose to authenticate with Supabase, your inventory records are backed up to secure database tables associated strictly with your user ID.
              </li>
              <li>
                <strong>Optional Google Sheets Sync:</strong> If you connect Google Sheets, exported data is saved directly into your personal Google Drive account. ScanMe AI never accesses other spreadsheets in your Drive.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#092B4C]">4. Google AdSense &amp; Third-Party Cookies</h2>
            <p>
              This website displays advertisements served by Google AdSense on designated public informational pages (such as educational guides and FAQs). Google uses cookies (including DoubleClick cookies) to serve ads based on user visits to this and other websites.
            </p>
            <p>
              You may opt out of personalized advertising by visiting Google's Ads Settings (https://adssettings.google.com). Ads are NEVER displayed within the private interactive scanner, camera viewfinder, or inventory management dashboards.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#092B4C]">5. Your Data Rights &amp; Deletion</h2>
            <p>
              You maintain total ownership over your inventory records. You can:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Export all products and transactions to Google Sheets or CSV at any time.</li>
              <li>Clear local browser storage via your browser settings to permanently wipe all stored items from your device.</li>
              <li>Request full account deletion and cloud record removal by emailing us at ab123170@gmail.com.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#092B4C]">6. Contact Information</h2>
            <p>
              If you have any questions about this Privacy Policy or our operational data handling, please contact:
            </p>
            <p className="font-semibold text-slate-800">
              ScanMe AI Team<br />
              Email: ab123170@gmail.com<br />
              Repository: https://github.com/ab123170-max/manager
            </p>
          </section>
        </article>

        {/* Safe Ad Placement */}
        <AdSenseSlot currentPath="/privacy-policy" />
      </main>

      <PublicFooter
        currentPath="/privacy-policy"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
