/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import {
  Camera,
  Boxes,
  Clock,
  BookOpen,
  BarChart3,
  ArrowRight,
  LogIn,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Zap,
  Globe,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSelectorButton } from '../common/LanguageSelectorButton';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
  const { t, languageOption, openLanguageSelector } = useLanguage();

  const features = [
    {
      title: t('scanner.title'),
      desc: t('landing.aiScannerDesc', { default: 'Snap packaging photos to extract names, prices, MFD, and EXP automatically with vision intelligence.' }),
      icon: Camera,
      color: 'bg-blue-500/10 text-blue-600 border-blue-200',
      badge: 'Multishot Vision',
    },
    {
      title: t('inventory.title'),
      desc: t('landing.inventoryDesc', { default: 'Organize stock levels, track batch numbers, supplier info, rack locations, and real-time stock-in/out.' }),
      icon: Boxes,
      color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
      badge: 'Real-time Stock',
    },
    {
      title: t('expiry.title'),
      desc: t('landing.expiryAlertsDesc', { default: 'Dynamic countdowns, early warnings, and zero-loss notifications before inventory spoils.' }),
      icon: Clock,
      color: 'bg-amber-500/10 text-amber-600 border-amber-200',
      badge: 'Smart Alerts',
    },
    {
      title: t('nav.products'),
      desc: t('landing.catalogDesc', { default: 'Search, filter, and organize items with barcode, SKU, category tags, and pricing history.' }),
      icon: BookOpen,
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
      badge: 'Catalog Matrix',
    },
    {
      title: t('reports.title'),
      desc: t('landing.analyticsDesc', { default: 'Monitor turnover rates, stock valuation, COGS, profit & loss, and comprehensive ledger accounts.' }),
      icon: BarChart3,
      color: 'bg-purple-500/10 text-purple-600 border-purple-200',
      badge: 'Financial Ledger',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 flex flex-col justify-between selection:bg-[#1473EA] selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1473EA] flex items-center justify-center text-white shadow-md shadow-[#1473EA]/25">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-tight text-[#092B4C]">SmartStock</span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-[#1473EA]/10 text-[#1473EA]">AI</span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 hidden sm:block">
                {t('app.tagline')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Reusable Global Language Selector */}
            <LanguageSelectorButton variant="compact" />

            <button
              type="button"
              onClick={onLogin}
              className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold text-[#092B4C] hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-[#1473EA]" />
              <span>{t('auth.login')}</span>
            </button>
            <button
              type="button"
              onClick={onGetStarted}
              className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-[#1473EA] text-white hover:bg-blue-600 transition-all shadow-sm shadow-[#1473EA]/30 active:scale-95"
            >
              {t('landing.getStarted')}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Headlines & Call to Action */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-7 space-y-5 text-center lg:text-left"
          >
            {/* Language Quick-Select Banner for First-Time Users */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50/90 border border-indigo-200/80 text-indigo-900 text-xs font-bold shadow-2xs">
              <span className="text-base leading-none">🌐</span>
              <span>{t('settings.chooseLanguage')}:</span>
              <button
                type="button"
                onClick={openLanguageSelector}
                className="underline text-indigo-700 hover:text-indigo-950 ml-0.5 flex items-center gap-1 cursor-pointer font-extrabold"
              >
                <span>{languageOption.flag} {languageOption.name}</span>
                <span className="text-[10px] text-indigo-500 font-normal">({t('common.edit')})</span>
              </button>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold ml-2">
              <Sparkles className="w-3.5 h-3.5 text-[#1473EA]" />
              <span>Next-Gen AI Vision Scanner</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#092B4C] tracking-tight leading-[1.15]">
              {t('landing.heroTitle')}
            </h1>

            <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {t('landing.heroSubtitle')}
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <button
                type="button"
                onClick={onGetStarted}
                id="btn-landing-get-started"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#1473EA] hover:bg-blue-600 text-white font-bold text-sm shadow-lg shadow-[#1473EA]/25 hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <span>{t('landing.getStarted')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={openLanguageSelector}
                className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-2xs transition-all flex items-center justify-center gap-2"
              >
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>{t('settings.language')}: {languageOption.flag} {languageOption.name}</span>
              </button>

              <button
                type="button"
                onClick={onLogin}
                id="btn-landing-login"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white border border-slate-200 text-[#092B4C] hover:bg-slate-50 font-bold text-sm shadow-2xs transition-all flex items-center justify-center gap-2"
              >
                <span>{t('auth.login')}</span>
              </button>
            </div>

            {/* Trust badges */}
            <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Zero Manual Setup</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                <span>Offline First & Cloud Synced</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Camera Multi-Shot OCR</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Interactive Scanner-Themed Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative mx-auto max-w-sm sm:max-w-md bg-white rounded-3xl p-5 shadow-xl border border-slate-200/90 overflow-hidden">
              {/* Device Frame Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] font-bold text-slate-400 ml-2">SmartStock Scanner View</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                  Ready
                </span>
              </div>

              {/* Simulated Camera Viewfinder Area */}
              <div className="relative mt-4 aspect-4/3 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4 flex flex-col justify-between overflow-hidden shadow-inner">
                {/* Target reticle corners */}
                <div className="absolute inset-4 pointer-events-none border border-white/20 rounded-xl">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#1473EA]" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#1473EA]" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#1473EA]" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#1473EA]" />
                </div>

                {/* Animated scan line */}
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-[#1473EA] shadow-[0_0_12px_#1473EA] opacity-80 animate-pulse" />

                {/* Simulated product packaging graphics */}
                <div className="relative z-10 flex items-center justify-between text-white/90">
                  <div className="text-[11px] font-mono bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
                    SCAN_ID: 89010300
                  </div>
                  <div className="text-[10px] font-bold bg-[#1473EA] text-white px-2 py-0.5 rounded-full">
                    99.4% AI Match
                  </div>
                </div>

                {/* Live Detected Overlay Card */}
                <div className="relative z-10 bg-white/95 backdrop-blur-md rounded-xl p-3 border border-white text-slate-800 shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Extracted Product</p>
                      <p className="text-xs font-bold text-[#092B4C] leading-tight">Organic Himalayan Honey 500g</p>
                    </div>
                    <span className="text-xs font-extrabold text-[#1473EA] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                      Rs. 450
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-slate-400 font-medium">MFD:</span>{' '}
                      <span className="font-semibold text-slate-700">14/08/2026</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">EXP:</span>{' '}
                      <span className="font-bold text-emerald-600">14/08/2028</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status footer inside phone mockup */}
              <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
                <span>Multi-Image OCR Engine</span>
                <span className="text-blue-600 font-bold">Auto-Calculates Best Before</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Feature Highlights Section */}
        <section className="mt-14 sm:mt-20">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-[#092B4C] tracking-tight">
              Comprehensive Retail & Stock Intelligence
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Everything required to run a smooth inventory workflow without spreadsheets or clunky hardware.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {features.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-slate-300 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${item.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {item.badge}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[#092B4C]">{item.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Bottom Callout Banner */}
        <section className="mt-12 sm:mt-16 bg-[#092B4C] text-white rounded-3xl p-6 sm:p-10 relative overflow-hidden shadow-lg">
          <div className="max-w-2xl space-y-3 relative z-10">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Ready to automate your store inventory?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Start in seconds. Scan your first product now with zero training required.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onGetStarted}
                className="px-5 py-3 rounded-xl bg-[#1473EA] hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <span>Get Started Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* Subtle background glow */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-[#1473EA]/20 rounded-full blur-3xl pointer-events-none" />
        </section>
      </main>

      {/* Simple Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white py-6 px-4 text-center text-xs text-slate-500 font-medium">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} SmartStock AI – ScanMe Technology. All rights reserved.</span>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>Privacy & Security</span>
            <span>•</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
