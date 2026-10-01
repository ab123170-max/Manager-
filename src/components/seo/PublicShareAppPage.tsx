/** @license SPDX-License-Identifier: Apache-2.0 */

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Copy, Download, ExternalLink, MessageCircle, Share2, Smartphone } from 'lucide-react';
import { updateDocumentSeo } from '../../utils/seoHelper';

interface PublicShareAppPageProps { onNavigatePath?: (path: string) => void; }

const APP_URL = 'https://scanme-ai.vercel.app/';
const APK_URL = 'https://github.com/ab123170-max/Manager-/releases/latest/download/app-debug.apk';

export const PublicShareAppPage: React.FC<PublicShareAppPageProps> = ({ onNavigatePath }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    updateDocumentSeo({
      title: 'Share ScanMe AI | Free AI Inventory App',
      description: 'Share the ScanMe AI app download link with WhatsApp, copy the link, use your phone share menu, or open Google Drive.',
      canonicalUrl: 'https://scanme-ai.vercel.app/share-app',
      ogTitle: 'Share ScanMe AI – Free AI Inventory App',
      ogDescription: 'Share ScanMe AI with your store, pharmacy, restaurant, hotel, or business.',
    });
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(APK_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt('Copy the ScanMe AI APK download link:', APK_URL);
    }
  };

  const shareFromPhone = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ScanMe AI – Free AI Storekeeping App',
          text: 'Try ScanMe AI, a free AI inventory and storekeeping tool.',
          url: APK_URL,
        });
      } catch {}
      return;
    }
    await copyLink();
  };

  const shareWhatsApp = () => {
    const message = encodeURIComponent('Try ScanMe AI – Free AI storekeeping & inventory management app.\n\nDownload: ' + APK_URL);
    window.open('https://wa.me/?text=' + message, '_blank', 'noopener,noreferrer');
  };

  const openGoogleDrive = async () => {
    await copyLink();
    window.open('https://drive.google.com/drive/my-drive', '_blank', 'noopener,noreferrer');
  };

  const goHome = () => {
    if (onNavigatePath) onNavigatePath('/');
    else window.location.href = '/';
  };

  const options = [
    { label: 'WhatsApp', detail: 'Send the APK link directly', icon: MessageCircle, action: shareWhatsApp, className: 'bg-[#25D366] text-white' },
    { label: copied ? 'Link Copied' : 'Copy Download Link', detail: 'Copy the APK download URL', icon: copied ? Check : Copy, action: copyLink, className: 'bg-[#1473EA] text-white' },
    { label: 'Share via Phone', detail: 'WhatsApp, Messenger, Bluetooth & more', icon: Share2, action: shareFromPhone, className: 'bg-white text-slate-800 border border-slate-200' },
    { label: 'Google Drive', detail: 'Copy link and open your Drive', icon: ExternalLink, action: openGoogleDrive, className: 'bg-white text-slate-800 border border-slate-200' },
  ];

  return (
    <div className="min-h-[100svh] bg-[#F5F7FA] text-slate-900 px-4 py-5">
      <main className="max-w-md mx-auto">
        <button type="button" onClick={goHome} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-5">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
        <section className="bg-white rounded-[28px] border border-slate-200 shadow-sm p-5 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-[#1473EA] text-white flex items-center justify-center shadow-lg shadow-[#1473EA]/20">
            <Smartphone className="w-8 h-8" />
          </div>
          <p className="mt-4 text-[11px] font-black uppercase tracking-[0.16em] text-[#1473EA]">Share ScanMe AI</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">Share the app with anyone</h1>
          <p className="mt-2 text-sm leading-5 text-slate-500">Send the ScanMe AI download link to a shop owner, pharmacy, hotel, restaurant, or any business.</p>
          <a href={APK_URL} className="mt-5 w-full h-12 rounded-2xl bg-[#092B4C] text-white font-bold text-sm flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> Download APK
          </a>
          <div className="mt-4 grid gap-2.5 text-left">
            {options.map(({ label, detail, icon: Icon, action, className }) => (
              <button key={label} type="button" onClick={action} className={`w-full min-h-14 rounded-2xl px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition-transform ${className}`}>
                <span className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></span>
                <span className="min-w-0"><span className="block text-sm font-black">{label}</span><span className="block text-[11px] opacity-75 mt-0.5">{detail}</span></span>
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-100 p-3 text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">APK download link</p>
            <p className="mt-1 text-[11px] leading-4 text-slate-600 break-all">{APK_URL}</p>
          </div>
        </section>
      </main>
    </div>
  );
};
