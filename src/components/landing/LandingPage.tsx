/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Boxes, BarChart3, LogIn, Download, Share2 } from 'lucide-react';
import { updateDocumentSeo } from '../../utils/seoHelper';
import { LanguageSelectorButton } from '../common/LanguageSelectorButton';
import { isNativeApp } from '../../utils/platform';
import { PersonalizedIntro } from '../onboarding/PersonalizedIntro';
import { useLanguage } from '../../context/LanguageContext';
import { LandingStatsSection } from './LandingStatsSection';
import { trackDownloadClick, getAnonymousId } from '../../services/analyticsService';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onNavigatePath?: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin, onNavigatePath }) => {
  const { t } = useLanguage();
  const [selectedBusiness, setSelectedBusiness] = React.useState<any>(null);
  useEffect(() => {
    updateDocumentSeo({
      title: 'Free AI Inventory Management & Product Scanner | ScanMe AI',
      description: 'Free AI storekeeping and inventory management for grocery stores, pharmacies, medical stores, restaurants, hotels, and other businesses. Scan products, manage stock, and track expiry dates.',
      canonicalUrl: 'https://scanme-ai.vercel.app/',
      ogTitle: 'Free AI Inventory Management & Product Scanner | ScanMe AI',
      ogDescription: 'Free AI storekeeping and inventory management for grocery stores, pharmacies, medical stores, restaurants, hotels, and other businesses.',
    });
  }, []);

  const anonId = getAnonymousId();
  const APK_DOWNLOAD_URL = `https://github.com/ab123170-max/Manager-/releases/latest/download/scanme-ai.apk?anon_id=${encodeURIComponent(anonId)}`;
  const [isDownloading, setIsDownloading] = useState(false);
  const [autoGuideActive, setAutoGuideActive] = useState(true);
  const autoScrollCancelledRef = useRef(false);
  const nativeApp = isNativeApp();
  const storeTypes = [
    { icon: '🛒', label: 'Grocery', nepali: 'किराना पसल' },
    { icon: '💊', label: 'Pharmacy', nepali: 'औषधि पसल' },
    { icon: '🏨', label: 'Hotels', nepali: 'होटल' },
    { icon: '🍛', label: 'Restaurants', nepali: 'रेस्टुरेन्ट' },
    { icon: '🩺', label: 'Medical Stores', nepali: 'मेडिकल स्टोर' },
    { icon: '🏪', label: 'Other Stores', nepali: 'अन्य पसल' },
  ];
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (!onNavigatePath) return;
    e.preventDefault();
    onNavigatePath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownloadClick = () => {
    setIsDownloading(true);
    autoScrollCancelledRef.current = true;
    setAutoGuideActive(false);
    trackDownloadClick();
    window.setTimeout(() => setIsDownloading(false), 2500);
  };

  // Guided landing-page tour: automatically moves from the top toward the
  // bottom Download APK area. Any user touch/scroll immediately cancels it.
  useEffect(() => {
    if (nativeApp) return;
    if (typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setAutoGuideActive(false);
      return;
    }

    autoScrollCancelledRef.current = false;
    window.scrollTo({ top: 0, behavior: 'auto' });

    let frame = 0;
    let startTimer = 0;
    let lastTime = 0;

    const cancelAutoScroll = () => {
      if (autoScrollCancelledRef.current) return;
      autoScrollCancelledRef.current = true;
      setAutoGuideActive(false);
      if (startTimer) window.clearTimeout(startTimer);
      if (frame) window.cancelAnimationFrame(frame);
    };

    const onUserInput = () => cancelAutoScroll();

    window.addEventListener('wheel', onUserInput, { passive: true });
    window.addEventListener('touchstart', onUserInput, { passive: true });
    window.addEventListener('touchmove', onUserInput, { passive: true });
    window.addEventListener('pointerdown', onUserInput, { passive: true });
    window.addEventListener('keydown', onUserInput);

    const step = (time: number) => {
      if (autoScrollCancelledRef.current) return;
      if (!lastTime) lastTime = time;
      const delta = Math.min(time - lastTime, 50);
      lastTime = time;

      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const nextY = Math.min(window.scrollY + (delta * 0.035), maxScroll);
      window.scrollTo(0, nextY);

      if (nextY >= maxScroll - 2) {
        setAutoGuideActive(false);
        autoScrollCancelledRef.current = true;
        return;
      }

      frame = window.requestAnimationFrame(step);
    };

    startTimer = window.setTimeout(() => {
      if (!autoScrollCancelledRef.current) {
        frame = window.requestAnimationFrame(step);
      }
    }, 1200);

    return () => {
      if (startTimer) window.clearTimeout(startTimer);
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('wheel', onUserInput);
      window.removeEventListener('touchstart', onUserInput);
      window.removeEventListener('touchmove', onUserInput);
      window.removeEventListener('pointerdown', onUserInput);
      window.removeEventListener('keydown', onUserInput);
    };
  }, [nativeApp]);

  return (
    <div className="min-h-[100svh] bg-[#F5F7FA] text-slate-900 flex flex-col overflow-x-hidden">
      <header className="h-14 shrink-0 bg-white/95 backdrop-blur border-b border-slate-200 px-4 flex items-center justify-between">
        <a href="/" onClick={(e) => handleLinkClick(e, '/')} className="flex items-center gap-2" aria-label="ScanMe AI home">
          <img src="/favicon.png" alt="ScanMe AI Logo" className="w-9 h-9 rounded-xl object-cover shadow-sm shrink-0" referrerPolicy="no-referrer" />
          <div className="leading-none">
            <div className="font-black text-[15px] tracking-tight">ScanMe <span className="text-[#1473EA]">AI</span></div>
            <div className="text-[9px] text-slate-400 font-medium mt-1">{t('landing.tagline')}</div>
          </div>
        </a>
        <div className="flex items-center gap-1">
          <LanguageSelectorButton variant="compact" />
          <button type="button" onClick={onLogin} className="h-10 px-3 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all flex items-center gap-1.5">
            <LogIn className="w-4 h-4 text-[#1473EA]" />{t('landing.login')}
          </button>
        </div>
      </header>
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-5 flex flex-col justify-center">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="text-center">
          <img src="/favicon.png" alt="ScanMe AI Logo" className="w-16 h-16 rounded-[22px] object-cover border border-slate-200/90 shadow-md mx-auto mb-4" referrerPolicy="no-referrer" />
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#1473EA] mb-2">{t('landing.smartInventory')}</p>
          <h1 className="text-[30px] leading-[1.08] font-black tracking-tight">{t('landing.heroTitle')}</h1>
          <p className="mt-3 text-sm leading-5 text-slate-500 max-w-xs mx-auto">{t('landing.heroText')}</p>
          <div className="mt-5 flex flex-col gap-2.5">
            <a href="/share-app" onClick={(e) => handleLinkClick(e, '/share-app')} className="w-full h-11 rounded-2xl bg-white border border-slate-200 text-[#1473EA] font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
              <Share2 className="w-4 h-4" />{t('landing.shareApp')}
            </a>
            <button type="button" onClick={onLogin} id="btn-landing-login" className="w-full h-11 rounded-2xl bg-white border border-slate-200 text-slate-800 font-bold text-sm active:scale-[0.98] transition-transform">
              {t('landing.account')}
            </button>
          </div>
        </motion.section>

        {/* Real ScanMe AI Platform Statistics Section */}
        <LandingStatsSection />

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.04 }} className="mt-7">
          <h2 className="text-center text-sm font-black text-slate-800">{t('landing.storeKeeping')}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {storeTypes.map(({ icon, label, nepali }) => (
              <button
                type="button"
                key={label}
                onClick={() => setSelectedBusiness(label.toLowerCase().startsWith('grocery') ? 'grocery' : label.toLowerCase().startsWith('pharmacy') ? 'pharmacy' : label.toLowerCase().startsWith('hotel') ? 'hotel' : label.toLowerCase().startsWith('restaurant') ? 'restaurant' : label.toLowerCase().startsWith('medical') ? 'medical' : 'other')}
                className="bg-white border border-slate-200 rounded-2xl px-3 py-2.5 flex items-center gap-2.5 shadow-sm text-left active:scale-[.98] transition-transform"
              >
                <div className="w-10 h-10 shrink-0 rounded-xl bg-[#FFF8EA] border border-[#E8D8B8] flex items-center justify-center text-xl shadow-sm">{icon}</div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-700">{label}</div>
                  <div className="text-[9px] font-semibold text-slate-400 mt-0.5">{nepali}</div>
                </div>
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] text-slate-400">{t('landing.guideHint')}</p>
        </motion.div>

        <PersonalizedIntro
          isOpen={Boolean(selectedBusiness)}
          kind={selectedBusiness}
          onClose={() => setSelectedBusiness(null)}
          onStart={() => {
            setSelectedBusiness(null);
            onGetStarted();
          }}
        />

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.06 }} className="mt-7 grid grid-cols-3 gap-2.5">
          {[{ icon: Camera, label: t('landing.aiScan') }, { icon: Boxes, label: t('landing.inventory') }, { icon: BarChart3, label: t('landing.reports') }].map(({ icon: Icon, label }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-2xl p-3 text-center shadow-sm">
              <div className="mx-auto w-9 h-9 rounded-xl bg-[#1473EA]/10 text-[#1473EA] flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </div>
              <div className="mt-2 text-[11px] font-bold text-slate-700">{label}</div>
            </div>
          ))}
        </motion.div>
        {!nativeApp && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-8 mb-5 rounded-3xl bg-white border border-[#1473EA]/20 p-4 shadow-lg shadow-[#1473EA]/10"
          >
            <div className="text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#1473EA]">
                {autoGuideActive ? '↓ Follow the guide' : 'Ready to start'}
              </div>
              <h2 className="mt-1 text-base font-black text-slate-900">ScanMe AI तपाईंको फोनमा तयार छ</h2>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">तलको बटनबाट APK डाउनलोड गर्नुहोस्।</p>
              <a
                href={APK_DOWNLOAD_URL}
                download="ScanMe-AI.apk"
                id="btn-landing-download-bottom"
                aria-label="Download ScanMe AI APK"
                onClick={handleDownloadClick}
                className="mt-3 w-full h-13 min-h-12 rounded-2xl bg-[#1473EA] text-white font-black text-sm shadow-lg shadow-[#1473EA]/25 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                {isDownloading ? 'Downloading…' : t('landing.downloadApk')}
              </a>
            </div>
          </motion.section>
        )}

      </main>
      {autoGuideActive && !nativeApp && (
        <div
          className="fixed left-1/2 bottom-4 -translate-x-1/2 z-40 pointer-events-none"
          aria-hidden="true"
        >
          <div className="rounded-full bg-slate-900/90 text-white px-4 py-2 shadow-xl backdrop-blur text-[10px] font-bold flex items-center gap-2 animate-bounce">
            <span>↓</span>
            <span>तलको Download मा जाँदैछ…</span>
          </div>
        </div>
      )}

      <footer className="shrink-0 px-4 pb-4 text-center">
        <div className="text-[10px] text-slate-400">© {new Date().getFullYear()} ScanMe AI</div>
        <nav className="mt-1 flex justify-center gap-3 text-[10px] text-slate-400">
          <a href="/inventory-management" onClick={(e) => handleLinkClick(e, "/inventory-management")} className="hover:text-[#1473EA]">{t('landing.inventoryLink')}</a>
          <a href="/expiry-date-scanner" onClick={(e) => handleLinkClick(e, "/expiry-date-scanner")} className="hover:text-[#1473EA]">{t('landing.expiryLink')}</a>
          <a href="/faq" onClick={(e) => handleLinkClick(e, '/faq')} className="hover:text-[#1473EA]">{t('landing.faq')}</a>
          <a href="/ai-product-scanner" onClick={(e) => handleLinkClick(e, '/ai-product-scanner')} className="hover:text-[#1473EA]">{t('landing.scannerLink')}</a>
        </nav>
      </footer>
    </div>
  );
};
