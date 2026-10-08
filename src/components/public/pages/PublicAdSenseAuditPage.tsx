/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  FileText,
  Lock,
  Camera,
  ArrowLeft,
} from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import {
  getRouteAuditMatrix,
  ADSENSE_CLIENT_ID,
  ADSENSE_SLOT_ID,
  APPROVED_PUBLIC_CONTENT_ROUTES,
  BLOCKED_APP_ROUTES,
} from '../../../config/adsenseConfig';

interface PublicAdSenseAuditPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicAdSenseAuditPage: React.FC<PublicAdSenseAuditPageProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  useEffect(() => {
    // Strictly block search engine indexing for this compliance audit route
    updateDocumentSeo({
      title: 'Google AdSense Compliance & Route Audit Matrix | ScanMe AI',
      description: 'Internal development audit verifying Google AdSense publisher policy compliance across all application and public content routes.',
      robots: 'noindex, nofollow',
    });
  }, []);

  const matrix = getRouteAuditMatrix();

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath="/adsense-audit"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-10">
        {/* Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-black">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>DEVELOPMENT &amp; REVIEW AUDIT DASHBOARD</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-[#092B4C] tracking-tight">
            Google AdSense Route &amp; Content Compliance Audit
          </h1>

          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
            This live audit verifies that ScanMe AI complies with the Google AdSense policy prohibition against serving ads on screens without publisher content. Ads are restricted strictly to approved public informational pages.
          </p>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs font-mono flex flex-wrap items-center gap-6 text-slate-600">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Publisher Client ID</span>
              <span className="font-bold text-[#092B4C]">{ADSENSE_CLIENT_ID}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Configured Ad Slot</span>
              <span className="font-bold text-[#092B4C]">{ADSENSE_SLOT_ID}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Approved Public Routes</span>
              <span className="font-bold text-emerald-600">{APPROVED_PUBLIC_CONTENT_ROUTES.length} Routes</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Guarded App Routes</span>
              <span className="font-bold text-rose-600">{BLOCKED_APP_ROUTES.length} Screens (Ads BLOCKED)</span>
            </div>
          </div>
        </div>

        {/* Audit Table */}
        <div className="rounded-3xl bg-white border border-slate-200/90 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black tracking-wider text-[10px]">
                <tr>
                  <th className="py-4 px-6">Route / Screen</th>
                  <th className="py-4 px-6">Classification</th>
                  <th className="py-4 px-6 text-center">Publisher Content</th>
                  <th className="py-4 px-6 text-center">AdSense Status</th>
                  <th className="py-4 px-6">Operational Policy Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrix.map((row, idx) => {
                  const isAllowed = row.adSenseAllowed;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-900 font-mono text-[11px]">
                        {row.route}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                            row.type === 'Public Content'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {row.publisherContent ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>YES</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-slate-400">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>NO (Interactive Tool)</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {isAllowed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-[10px]">
                            ALLOWED (GUARDED)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-black text-[10px]">
                            STRICTLY BLOCKED
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-500 max-w-xs leading-relaxed">
                        {row.description}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Verification Summary Checklist */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-8 shadow-sm space-y-4">
          <h2 className="text-base font-black text-[#092B4C] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Policy Compliance Verification Checklist</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Camera Viewfinder &amp; Scanner Protected:</strong> Zero ads exist inside the camera preview, real-time object tracking box, crop screens, or auto-capture modal.
              </span>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Interactive Dashboard Protected:</strong> The global AdSense placement on the private app dashboard has been removed and redirected strictly to approved public content pages.
              </span>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Inventory Reports Protected:</strong> The ad unit previously embedded inside the private financial Inventory Reports screen has been completely removed.
              </span>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Guarded By Default:</strong> The reusable &lt;AdSenseContentGuard&gt; defaults to ADS DISABLED unless a path is explicitly listed on the white-list.
              </span>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter
        currentPath="/adsense-audit"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
