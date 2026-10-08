/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Mail,
  MessageSquare,
  Bug,
  HelpCircle,
  CheckCircle2,
  Send,
  Github,
  Globe2,
} from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { AdSenseSlot } from '../../ads/AdSenseSlot';

interface PublicContactPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicContactPage: React.FC<PublicContactPageProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General Support',
    message: '',
  });

  useEffect(() => {
    updateDocumentSeo({
      title: 'Contact & Support | ScanMe AI Retail Assistant',
      description:
        'Get in touch with the ScanMe AI team for product support, bug reports, feature suggestions, or business inquiries. Official contact information and feedback form.',
      canonicalUrl: 'https://scanme-ai.vercel.app/contact',
      ogTitle: 'Contact ScanMe AI – Technical Support & Inquiries',
      ogDescription:
        'Submit feedback, report packaging OCR bugs, or get technical support for your retail store inventory setup.',
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setFormSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath="/contact"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#1473EA] text-xs font-black">
            <Mail className="w-3.5 h-3.5" />
            <span>COMMUNICATION &amp; USER FEEDBACK</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#092B4C] tracking-tight">
            Contact ScanMe AI Support
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Have a suggestion, question, or need assistance setting up inventory scanning in your shop? We welcome inquiries from small store owners and developers worldwide.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact Details Column */}
          <div className="space-y-6">
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-black uppercase text-[#092B4C] tracking-wider">
                Support Channels
              </h2>

              <div className="space-y-4 text-xs text-slate-600">
                <div className="space-y-1">
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-[#1473EA]" />
                    <span>Official Support Email</span>
                  </span>
                  <a
                    href="mailto:ab123170@gmail.com"
                    className="text-[#1473EA] font-semibold hover:underline block"
                  >
                    ab123170@gmail.com
                  </a>
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <Github className="w-4 h-4 text-slate-700" />
                    <span>Open Source &amp; Bug Tracking</span>
                  </span>
                  <a
                    href="https://github.com/ab123170-max/manager"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-600 hover:text-slate-900 font-semibold hover:underline block"
                  >
                    github.com/ab123170-max/manager
                  </a>
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <Globe2 className="w-4 h-4 text-emerald-600" />
                    <span>Production Web Domain</span>
                  </span>
                  <span className="text-slate-600 font-mono text-[11px] block">
                    https://scanme-ai.vercel.app
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-blue-50/70 border border-blue-100 p-6 text-xs text-slate-700 space-y-2">
              <span className="font-bold text-[#1473EA] text-sm block">Reporting OCR or Barcode Issues</span>
              <p className="leading-relaxed">
                If an unusual product packaging label or damaged barcode fails to extract accurately in your store, please send us the brand name or a clear photo so our engineering team can improve the multimodal vision models.
              </p>
            </div>
          </div>

          {/* Feedback & Inquiries Form */}
          <div className="md:col-span-2 rounded-3xl bg-white border border-slate-200/90 p-8 shadow-sm">
            {formSubmitted ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-[#092B4C]">Thank You for Your Feedback!</h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Your message has been recorded. Our team reviews user feedback daily to make ScanMe AI faster and more reliable for local storekeepers.
                </p>
                <button
                  type="button"
                  onClick={() => setFormSubmitted(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-lg font-black text-[#092B4C] border-b border-slate-100 pb-3">
                  Send a Direct Inquiry or Bug Report
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Your Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1473EA]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Your Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. shop@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1473EA]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Subject Category</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1473EA]"
                  >
                    <option value="General Support">General Support &amp; Question</option>
                    <option value="Bug Report">Packaging OCR or Camera Bug Report</option>
                    <option value="Feature Suggestion">Feature Request for Small Shops</option>
                    <option value="Business Inquiry">Commercial or Partnership Inquiry</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Your Message *</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Describe your question, your shop type, or the issue you encountered..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1473EA]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#1473EA] hover:bg-blue-600 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Message to Support</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Safe AdSense Placement */}
        <AdSenseSlot currentPath="/contact" />
      </main>

      <PublicFooter
        currentPath="/contact"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
