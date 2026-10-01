/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Camera, Boxes, BarChart3, LogIn, Download, ShoppingBasket, Pill, Hotel, UtensilsCrossed, Stethoscope, Store } from 'lucide-react';
import { updateDocumentSeo } from '../../utils/seoHelper';
import { LanguageSelectorButton } from '../common/LanguageSelectorButton';
import { isNativeApp } from '../../utils/platform';

interface LandingPageProps { onGetStarted: () => void; onLogin: () => void; onNavigatePath?: (path: string) => void; }

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin, onNavigatePath }) => {
  useEffect(() => { updateDocumentSeo({ title: 'Free AI Inventory Management & Product Scanner | ScanMe AI', description: 'Free AI storekeeping and inventory management for grocery stores, pharmacies, medical stores, restaurants, hotels, and other businesses. Scan products, manage stock, and track expiry dates.', canonicalUrl: 'https://scanme-ai.vercel.app/', ogTitle: 'Free AI Inventory Management & Product Scanner | ScanMe AI', ogDescription: 'Free AI storekeeping and inventory management for grocery stores, pharmacies, medical stores, restaurants, hotels, and other businesses.' }); }, []);

  const APK_DOWNLOAD_URL = 'https://github.com/ab123170-max/Manager-/releases/latest/download/app-debug.apk';
  const nativeApp = isNativeApp();
  const storeTypes = [
    { icon: ShoppingBasket, label: 'Grocery' }, { icon: Pill, label: 'Pharmacy' }, { icon: Hotel, label: 'Hotels' },
    { icon: UtensilsCrossed, label: 'Restaurants' }, { icon: Stethoscope, label: 'Medical Stores' }, { icon: Store, label: 'Other Stores' },
  ];
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => { if (!onNavigatePath) return; e.preventDefault(); onNavigatePath(path); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div className="min-h-[100svh] bg-[#F5F7FA] text-slate-900 flex flex-col overflow-x-hidden">
      <header className="h-14 shrink-0 bg-white/95 backdrop-blur border-b border-slate-200 px-4 flex items-center justify-between">
        <a href="/" onClick={(e) => handleLinkClick(e, '/')} className="flex items-center gap-2" aria-label="ScanMe AI home">
          <div className="w-9 h-9 rounded-xl bg-[#1473EA] text-white flex items-center justify-center shadow-sm"><Camera className="w-5 h-5" /></div>
          <div className="leading-none"><div className="font-black text-[15px] tracking-tight">ScanMe <span className="text-[#1473EA]">AI</span></div><div className="text-[9px] text-slate-400 font-medium mt-1">Scan. Manage. Done.</div></div>
        </a>
        <div className="flex items-center gap-1"><LanguageSelectorButton variant="compact" /><button type="button" onClick={onLogin} className="h-10 px-3 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all flex items-center gap-1.5"><LogIn className="w-4 h-4 text-[#1473EA]" />Login</button></div>
      </header>
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-5 flex flex-col justify-center">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-[22px] bg-white border border-slate-200 shadow-sm flex items-center justify-center"><Camera className="w-8 h-8 text-[#1473EA]" /></div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#1473EA] mb-2">Smart inventory for your business</p>
          <h1 className="text-[30px] leading-[1.08] font-black tracking-tight">Free AI inventory<br /><span className="text-[#1473EA]">management &amp; storekeeping.</span></h1>
          <p className="mt-3 text-sm leading-5 text-slate-500 max-w-xs mx-auto">Scan products, manage stock, and track expiry dates in one simple tool for grocery, pharmacy, medical, hotel, restaurant, and other stores.</p>
          <div className="mt-5 flex flex-col gap-2.5">
            {!nativeApp && <a href={APK_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" id="btn-landing-get-started" aria-label="Download ScanMe AI APK" className="w-full h-12 rounded-2xl bg-[#1473EA] text-white font-bold text-sm shadow-lg shadow-[#1473EA]/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"><Download className="w-4 h-4" />Download APK from here</a>}
            <button type="button" onClick={onLogin} id="btn-landing-login" className="w-full h-11 rounded-2xl bg-white border border-slate-200 text-slate-800 font-bold text-sm active:scale-[0.98] transition-transform">I already have an account</button>
          </div>
        </motion.section>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.04 }} className="mt-5">
          <h2 className="text-center text-sm font-black text-slate-800">Smart store keeping for</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">{storeTypes.map(({ icon: Icon, label }) => <div key={label} className="bg-white border border-slate-200 rounded-2xl px-3 py-2.5 flex items-center gap-2.5 shadow-sm"><div className="w-9 h-9 shrink-0 rounded-xl bg-[#1473EA]/10 text-[#1473EA] flex items-center justify-center"><Icon className="w-4 h-4" /></div><span className="text-xs font-bold text-slate-700">{label}</span></div>)}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.06 }} className="mt-7 grid grid-cols-3 gap-2.5">{[{ icon: Camera, label: 'AI Scan' }, { icon: Boxes, label: 'Inventory' }, { icon: BarChart3, label: 'Reports' }].map(({ icon: Icon, label }) => <div key={label} className="bg-white border border-slate-200 rounded-2xl p-3 text-center shadow-sm"><div className="mx-auto w-9 h-9 rounded-xl bg-[#1473EA]/10 text-[#1473EA] flex items-center justify-center"><Icon className="w-4 h-4" /></div><div className="mt-2 text-[11px] font-bold text-slate-700">{label}</div></div>)}</motion.div>
      </main>
      <footer className="shrink-0 px-4 pb-4 text-center"><div className="text-[10px] text-slate-400">© {new Date().getFullYear()} ScanMe AI</div><nav className="mt-1 flex justify-center gap-3 text-[10px] text-slate-400"><a href="/inventory-management" onClick={(e) => handleLinkClick(e, "/inventory-management")} className="hover:text-[#1473EA]">Inventory</a><a href="/expiry-date-scanner" onClick={(e) => handleLinkClick(e, "/expiry-date-scanner")} className="hover:text-[#1473EA]">Expiry</a><a href="/faq" onClick={(e) => handleLinkClick(e, '/faq')} className="hover:text-[#1473EA]">FAQ</a><a href="/ai-product-scanner" onClick={(e) => handleLinkClick(e, '/ai-product-scanner')} className="hover:text-[#1473EA]">AI Scanner</a></nav></footer>
    </div>
  );
};
