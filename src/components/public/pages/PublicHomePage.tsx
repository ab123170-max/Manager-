/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Camera,
  Sparkles,
  Barcode,
  Clock,
  Boxes,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Store,
  Pill,
  UtensilsCrossed,
  Hotel,
  Layers,
  ChevronDown,
  HelpCircle,
  Info,
  Check,
  Zap,
  Globe2,
} from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { useLanguage } from '../../../context/LanguageContext';

interface PublicHomePageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicHomePage: React.FC<PublicHomePageProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  const { language, setLanguage } = useLanguage();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  useEffect(() => {
    updateDocumentSeo({
      title:
        language === 'ne'
          ? 'ScanMe AI – स्थानीय व्यवसायका लागि स्मार्ट Product Scanning र Inventory Management'
          : 'ScanMe AI – Smart Product Scanning & Inventory Management for Small Businesses',
      description:
        language === 'ne'
          ? 'Scan गर्नुहोस्। Product जानकारी जाँच गर्नुहोस्। Expiry व्यवस्थापन गर्नुहोस्। आफ्नो stock सजिलै व्यवस्थित गर्नुहोस्। किराना, फार्मेसी र स्थानीय पसलका लागि सरल AI inventory tool।'
          : 'Scan products, verify details, track expiry, and organize stock effortlessly. Simple AI-powered inventory tool for grocery stores, pharmacies, and small shops.',
      canonicalUrl: 'https://scanme-ai.vercel.app/',
      ogTitle:
        language === 'ne'
          ? 'ScanMe AI – स्थानीय व्यवसायका लागि स्मार्ट Product Scanning'
          : 'ScanMe AI – Smart Product Scanning & Inventory Management',
      ogDescription:
        language === 'ne'
          ? 'Scan गर्नुहोस्। Product जानकारी जाँच गर्नुहोस्। Expiry व्यवस्थापन गर्नुहोस्। आफ्नो stock सजिलै व्यवस्थित गर्नुहोस्।'
          : 'Scan products. Verify product details. Manage expiration dates. Organize your stock with ease.',
      schemaJson: {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'ScanMe AI',
        url: 'https://scanme-ai.vercel.app/',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'All (Web, Android, iOS, Windows, macOS)',
        description:
          'AI-powered product scanner and inventory manager for grocery stores, pharmacies, restaurants, hotels, and small retailers.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'NPR',
        },
      },
    });
  }, [language]);

  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    onNavigatePath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isNepali = language === 'ne';

  const faqListNepali = [
    {
      q: 'ScanMe AI के हो?',
      a: 'ScanMe AI camera र AI technology प्रयोग गरेर product information scan र organize गर्न सहयोग गर्ने inventory management tool हो।',
    },
    {
      q: 'ScanMe AI कुन व्यवसायका लागि हो?',
      a: 'Grocery, pharmacy, medical store, restaurant, hotel, general store लगायत product inventory व्यवस्थापन गर्ने व्यवसायका लागि प्रयोग गर्न सकिन्छ।',
    },
    {
      q: 'के AI ले दिएको information सधैं सही हुन्छ?',
      a: 'होइन। AI-generated information मा त्रुटि हुन सक्छ। त्यसैले information save गर्नु अघि review र आवश्यक correction गर्नु महत्वपूर्ण हुन्छ।',
    },
    {
      q: 'के म expiry date track गर्न सक्छु?',
      a: 'ScanMe AI को inventory workflow मा उपलब्ध expiry information record गरेर त्यसलाई व्यवस्थापन गर्न सकिन्छ।',
    },
    {
      q: 'Barcode र QR code प्रयोग गर्न सकिन्छ?',
      a: 'समर्थित अवस्थामा barcode वा QR information product identification का लागि प्रयोग गर्न सकिन्छ।',
    },
    {
      q: 'के मैले product information save गर्नुअघि जाँच गर्न सक्छु?',
      a: 'हो। AI बाट प्राप्त information लाई review गरेर आवश्यक correction गरेपछि save गर्नु राम्रो हुन्छ।',
    },
    {
      q: 'ScanMe AI प्रयोग गर्न programming knowledge चाहिन्छ?',
      a: 'होइन। यसको उद्देश्य सामान्य shopkeeper ले पनि सजिलै प्रयोग गर्न सक्ने सरल interface उपलब्ध गराउनु हो।',
    },
    {
      q: 'मेरो व्यवसायको लागि ScanMe AI उपयोगी हुन्छ?',
      a: 'यदि तपाईंले नियमित रूपमा धेरै products, prices वा expiry dates व्यवस्थापन गर्नुहुन्छ भने ScanMe AI तपाईंको inventory workflow लाई व्यवस्थित बनाउन उपयोगी हुन सक्छ।',
    },
  ];

  const faqListEnglish = [
    {
      q: 'What is ScanMe AI?',
      a: 'ScanMe AI is a lightweight inventory management assistant that leverages on-device smartphone vision and AI to scan packaging and organize product records.',
    },
    {
      q: 'Which businesses is ScanMe AI designed for?',
      a: 'Grocery stores, pharmacies, medical supply stores, restaurants, hotels, and independent neighborhood retail shops handling physical stock and expiration dates.',
    },
    {
      q: 'Is AI-extracted information always 100% accurate?',
      a: 'No. AI-generated OCR predictions can occasionally encounter lighting glares or curved packaging. ScanMe AI provides an instant verification step so you can review and correct fields before saving.',
    },
    {
      q: 'Can I track product expiry dates?',
      a: 'Yes. Expiry dates are recorded with proactive radar notifications (30, 60, and 90 days) to prevent dead stock losses.',
    },
    {
      q: 'Can barcode and QR codes be scanned?',
      a: 'Yes. Supported barcodes (EAN, UPC, Code 128) and QR codes are detected instantly using high-speed camera scanning.',
    },
    {
      q: 'Can I review extracted information before saving?',
      a: 'Always. ScanMe AI follows a strict Review → Verify → Save workflow to keep your inventory records clean and reliable.',
    },
    {
      q: 'Does it require specialized technical skills?',
      a: 'Not at all. The interface is purposefully built for everyday shopkeepers and works cleanly on any standard smartphone browser or Android APK.',
    },
    {
      q: 'Is ScanMe AI useful for my business?',
      a: 'If you handle diverse packaged goods, fluctuating prices, or expiration dates, ScanMe AI significantly cuts manual record-keeping time and prevents lost stock.',
    },
  ];

  const faqs = isNepali ? faqListNepali : faqListEnglish;

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath="/"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />

      <main className="flex-1">
        {/* ==================================================================== */}
        {/* 1. HERO SECTION                                                      */}
        {/* ==================================================================== */}
        <section className="relative overflow-hidden bg-white border-b border-slate-200/80 pt-12 pb-16 lg:pt-18 lg:pb-22">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Language Quick Switcher Banner */}
            <div className="flex items-center justify-center lg:justify-start mb-6">
              <div className="inline-flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setLanguage('ne')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    isNepali
                      ? 'bg-white text-[#1473EA] shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🇳🇵</span>
                  <span>नेपाली संस्करण</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    !isNepali
                      ? 'bg-white text-[#1473EA] shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🇬🇧</span>
                  <span>English Version</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Headline & Value Proposition */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200/70 text-[#1473EA] text-xs font-black tracking-wide">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isNepali
                      ? 'स्थानीय व्यवसायका लागि स्मार्ट AI INVENTORY TOOL'
                      : 'SMART AI INVENTORY TOOL FOR LOCAL BUSINESSES'}
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#092B4C] tracking-tight leading-[1.18]">
                  {isNepali ? (
                    <>
                      स्थानीय व्यवसायका लागि स्मार्ट{' '}
                      <span className="text-[#1473EA]">Product Scanning</span> र{' '}
                      <span className="text-[#1473EA]">Inventory Management</span>
                    </>
                  ) : (
                    <>
                      Smart Product Scanning &amp;{' '}
                      <span className="text-[#1473EA]">Inventory Management</span> for Local Businesses
                    </>
                  )}
                </h1>

                <p className="text-base sm:text-lg font-bold text-slate-700 leading-snug max-w-2xl mx-auto lg:mx-0">
                  {isNepali ? (
                    'Scan गर्नुहोस्। Product जानकारी जाँच गर्नुहोस्। Expiry व्यवस्थापन गर्नुहोस्। आफ्नो stock सजिलै व्यवस्थित गर्नुहोस्।'
                  ) : (
                    'Scan products. Verify details. Track expiry dates. Organize your stock effortlessly.'
                  )}
                </p>

                <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  {isNepali ? (
                    'ScanMe AI साना तथा मध्यम व्यवसायका लागि बनाइएको सरल AI-powered inventory tool हो। यसले product को जानकारी पहिचान गर्न र व्यवस्थित गर्न मद्दत गर्छ, ताकि shopkeeper ले आफ्नो दैनिक stock management अझ सजिलो बनाउन सकून्।'
                  ) : (
                    'ScanMe AI is a simple AI-powered inventory tool designed for small and medium businesses. It helps identify and organize product information so shopkeepers can manage daily stock with ease.'
                  )}
                </p>

                {/* Primary & Secondary Call To Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onLaunchApp}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#1473EA] to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black text-sm transition-all shadow-lg shadow-[#1473EA]/25 flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{isNepali ? 'Start Scanning' : 'Start Scanning'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <a
                    href="/how-it-works"
                    onClick={(e) => handleLink(e, '/how-it-works')}
                    className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-[#092B4C] font-bold text-sm transition-colors text-center cursor-pointer"
                  >
                    {isNepali ? 'कसरी काम गर्छ हेर्नुहोस्' : 'Learn How It Works'}
                  </a>
                </div>

                {/* Key Verification Badges */}
                <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{isNepali ? 'निःशुल्क आधारभूत सुविधाहरू' : '100% Free Core Features'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{isNepali ? 'कुनै पनि स्मार्टफोनमा चल्ने' : 'Works on Any Smartphone'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{isNepali ? 'नेपाली र English दुवै समर्थन' : 'Nepali & English Support'}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Visual Product Scanner Preview Card */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-full max-w-sm rounded-3xl bg-slate-900 border-4 border-slate-800 shadow-2xl overflow-hidden relative text-white p-4 space-y-4">
                  {/* Camera Header Bar */}
                  <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{isNepali ? 'LIVE PRODUCT DETECTION' : 'LIVE PRODUCT DETECTION'}</span>
                    </div>
                    <span className="font-mono text-[11px] bg-slate-800 px-2 py-0.5 rounded">AI READY</span>
                  </div>

                  {/* Viewfinder with Bounding Box */}
                  <div className="h-60 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-950 relative flex items-center justify-center overflow-hidden border border-slate-700/60 p-4">
                    <div className="w-48 h-38 rounded-xl bg-amber-50 text-slate-900 p-3 shadow-md flex flex-col justify-between border-2 border-emerald-400 relative">
                      <div className="absolute -inset-1 border-2 border-emerald-400 rounded-xl pointer-events-none">
                        <div className="absolute -top-3 left-2 bg-emerald-500 text-black text-[9px] font-black px-1.5 py-0.2 rounded shadow">
                          {isNepali ? 'उत्पादन पहिचान भयो (98%)' : 'PRODUCT DETECTED (98%)'}
                        </div>
                      </div>

                      <div className="border-b border-slate-200 pb-1">
                        <span className="text-[10px] font-bold text-amber-700 uppercase">
                          {isNepali ? 'स्थानीय ब्राण्ड' : 'Local Brand'}
                        </span>
                        <div className="text-xs font-black">
                          {isNepali ? 'शुद्ध चियापत्ती २०० ग्राम' : 'Organic Tea 200g'}
                        </div>
                      </div>

                      <div className="space-y-0.5 text-[9px] font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-500">MFD:</span>
                          <span className="font-bold text-emerald-700">12/01/2026 ✓</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">EXP:</span>
                          <span className="font-bold text-emerald-700">11/01/2027 ✓</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Price:</span>
                          <span className="font-bold text-emerald-700">Rs. 240.00 ✓</span>
                        </div>
                      </div>
                    </div>

                    <div className="absolute inset-x-0 h-0.5 bg-cyan-400 opacity-70 shadow-[0_0_10px_#22d3ee] top-1/2 animate-bounce" />
                  </div>

                  {/* Summary pill */}
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">
                        {isNepali ? 'विवरण स्वतः पहिचान भयो' : 'Fields Auto-Identified'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {isNepali ? 'जाँच गर्नुहोस् र save गर्नुहोस्' : 'Review and save'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onLaunchApp}
                      className="px-3 py-1.5 rounded-xl bg-[#1473EA] text-white text-[11px] font-bold hover:bg-blue-600 transition-colors cursor-pointer"
                    >
                      {isNepali ? 'Scan सुरु' : 'Start Scan'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* 2. SCANME AI के हो? (WHAT IS SCANME AI?)                             */}
        {/* ==================================================================== */}
        <section className="py-16 bg-white border-b border-slate-200/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-black">
              <Info className="w-3.5 h-3.5 text-[#1473EA]" />
              <span>{isNepali ? 'परिचय' : 'OVERVIEW'}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-[#092B4C] tracking-tight">
              {isNepali ? 'ScanMe AI के हो?' : 'What is ScanMe AI?'}
            </h2>

            <div className="text-base sm:text-lg text-slate-600 leading-relaxed space-y-4 text-left sm:text-center">
              <p>
                {isNepali ? (
                  'धेरै स्थानीय पसलमा अझै पनि product को नाम, मूल्य र expiry सम्बन्धी जानकारी कागज, notebook वा छुट्टाछुट्टै system मा राखिन्छ।'
                ) : (
                  'In many local shops, product names, prices, and expiration details are still tracked manually on paper notebooks or disparate disconnected notes.'
                )}
              </p>
              <p>
                {isNepali ? (
                  'ScanMe AI ले camera-based scanning र AI technology प्रयोग गरेर product information व्यवस्थित गर्न सजिलो बनाउने प्रयास गर्छ।'
                ) : (
                  'ScanMe AI uses camera-based scanning and modern AI technology to make product information organization simpler and faster.'
                )}
              </p>
              <p className="font-medium text-slate-800">
                {isNepali ? (
                  'तपाईं product scan गरेर उपलब्ध जानकारी review गर्न सक्नुहुन्छ र आवश्यक जानकारी आफ्नो inventory मा राख्न सक्नुहुन्छ।'
                ) : (
                  'You can scan a product, review the detected details, verify accuracy, and store the necessary information in your inventory.'
                )}
              </p>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* 3. SCANME AI ले के गर्न मद्दत गर्छ? (FEATURES)                         */}
        {/* ==================================================================== */}
        <section className="py-16 lg:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#1473EA]">
              {isNepali ? 'मुख्य सुविधाहरू' : 'KEY CAPABILITIES'}
            </h2>
            <h3 className="text-2xl sm:text-3xl font-black text-[#092B4C] tracking-tight">
              {isNepali ? 'ScanMe AI ले के गर्न मद्दत गर्छ?' : 'What Can ScanMe AI Help You With?'}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {isNepali
                ? 'दैनिक पसल सञ्चालनलाई सजिलो बनाउने ५ वटा मुख्य विशेषताहरू'
                : 'Five key features engineered to make daily shop management straightforward'}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Product Scanning */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-3 hover:border-[#1473EA] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1473EA] flex items-center justify-center font-bold">
                <Camera className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-black text-[#092B4C]">
                {isNepali ? '📷 Product Scanning' : '📷 Product Scanning'}
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {isNepali
                  ? 'Camera प्रयोग गरेर product scan गर्नुहोस् र product information पहिचान गर्ने प्रक्रिया सुरु गर्नुहोस्।'
                  : 'Use your camera to scan products and initiate the information identification workflow.'}
              </p>
            </div>

            {/* 2. Product Information */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-3 hover:border-[#1473EA] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-black text-[#092B4C]">
                {isNepali ? '🏷️ Product Information' : '🏷️ Product Information'}
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {isNepali
                  ? 'Product name, price तथा उपलब्ध manufacturing र expiry information व्यवस्थित गर्न मद्दत गर्छ।'
                  : 'Helps organize product name, price, and available manufacturing and expiration information.'}
              </p>
            </div>

            {/* 3. Expiry Management */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-3 hover:border-[#1473EA] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-black text-[#092B4C]">
                {isNepali ? '📅 Expiry Management' : '📅 Expiry Management'}
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {isNepali
                  ? 'Expiry date भएका products लाई व्यवस्थित रूपमा record गरेर upcoming expiry हेर्न सजिलो बनाउनुहोस्।'
                  : 'Record expiry-bearing products systematically to spot upcoming expirations before stock is lost.'}
              </p>
            </div>

            {/* 4. Barcode & QR */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-3 hover:border-[#1473EA] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                <Barcode className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-black text-[#092B4C]">
                {isNepali ? '🔎 Barcode & QR' : '🔎 Barcode & QR'}
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {isNepali
                  ? 'समर्थित products मा barcode वा QR information प्रयोग गरेर product पहिचान गर्न मद्दत गर्छ।'
                  : 'Identifies supported items instantly using standardized barcode or QR code signals.'}
              </p>
            </div>

            {/* 5. Inventory Organization */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-3 hover:border-[#1473EA] transition-all md:col-span-2 lg:col-span-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Boxes className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-black text-[#092B4C]">
                {isNepali ? '📦 Inventory Organization' : '📦 Inventory Organization'}
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {isNepali
                  ? 'तपाईंको product records लाई व्यवस्थित राख्न मद्दत गर्छ, ताकि आवश्यक जानकारी पछि सजिलै भेट्टाउन सकियोस्।'
                  : 'Maintains your product catalog and records cleanly so any item, price, or expiry detail is readily retrievable.'}
              </p>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* 4. स्थानीय व्यवसायका लागि (TARGET INDUSTRIES)                         */}
        {/* ==================================================================== */}
        <section className="py-16 bg-white border-y border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#1473EA]">
                {isNepali ? 'लक्षित क्षेत्र' : 'TARGET SECTORS'}
              </h2>
              <h3 className="text-2xl sm:text-3xl font-black text-[#092B4C] tracking-tight">
                {isNepali ? 'स्थानीय व्यवसायका लागि' : 'Tailored for Local Businesses'}
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {isNepali
                  ? 'दैनिक धेरै सामान र मितिहरू व्यवस्थापन गर्नुपर्ने विभिन्न पसल तथा व्यवसायहरूका लागि'
                  : 'Designed to solve everyday stock handling for varied retail operations'}
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Grocery */}
              <div className="rounded-2xl border border-slate-200 p-6 bg-[#F5F7FA] hover:bg-white hover:border-[#1473EA] transition-all space-y-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <h4 className="font-black text-base text-[#092B4C]">
                  {isNepali ? '🛒 Grocery & General Stores' : '🛒 Grocery & General Stores'}
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {isNepali
                    ? 'दैनिक रूपमा धेरै products handle गर्ने पसलमा product information र expiry dates व्यवस्थित राख्न ScanMe AI उपयोगी हुन सक्छ।'
                    : 'Helpful for grocery shops handling diverse daily FMCG products, prices, and fast-moving dates.'}
                </p>
              </div>

              {/* Pharmacy */}
              <div className="rounded-2xl border border-slate-200 p-6 bg-[#F5F7FA] hover:bg-white hover:border-[#1473EA] transition-all space-y-3">
                <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Pill className="w-5 h-5" />
                </div>
                <h4 className="font-black text-base text-[#092B4C]">
                  {isNepali ? '💊 Pharmacy & Medical Stores' : '💊 Pharmacy & Medical Stores'}
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {isNepali
                    ? 'Medicine तथा health-related products मा expiry information महत्वपूर्ण हुन्छ। ScanMe AI ले उपलब्ध product information record र organize गर्न सहयोग गर्न सक्छ।'
                    : 'Medicine and health supplies rely critically on expiry vigilance. Helps organize and record essential batch and date records.'}
                </p>
              </div>

              {/* Restaurant */}
              <div className="rounded-2xl border border-slate-200 p-6 bg-[#F5F7FA] hover:bg-white hover:border-[#1473EA] transition-all space-y-3">
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <h4 className="font-black text-base text-[#092B4C]">
                  {isNepali ? '🍽️ Restaurants' : '🍽️ Restaurants'}
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {isNepali
                    ? 'Kitchen तथा food-related stock को product information व्यवस्थित राख्न प्रयोग गर्न सकिन्छ।'
                    : 'Useful for managing kitchen inventory, perishable ingredient lifespans, and packaged condiments.'}
                </p>
              </div>

              {/* Hotel */}
              <div className="rounded-2xl border border-slate-200 p-6 bg-[#F5F7FA] hover:bg-white hover:border-[#1473EA] transition-all space-y-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Hotel className="w-5 h-5" />
                </div>
                <h4 className="font-black text-base text-[#092B4C]">
                  {isNepali ? '🏨 Hotels' : '🏨 Hotels'}
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {isNepali
                    ? 'Hotel तथा hospitality businesses मा प्रयोग हुने विभिन्न supplies को records व्यवस्थित गर्न मद्दत गर्न सक्छ।'
                    : 'Helps keep systematic track of minibar items, guest room toiletries, and housekeeping supplies.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* 5. कसरी काम गर्छ? (HOW IT WORKS)                                     */}
        {/* ==================================================================== */}
        <section className="py-16 lg:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#1473EA]">
              {isNepali ? 'सरल ५-चरण प्रक्रिया' : '5-STEP SIMPLE WORKFLOW'}
            </h2>
            <h3 className="text-2xl sm:text-3xl font-black text-[#092B4C] tracking-tight">
              {isNepali ? 'कसरी काम गर्छ?' : 'How It Works'}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {isNepali
                ? 'जटिल सेटअप बिना सजिलो र भरपर्दो चरणहरू'
                : 'A clean, step-by-step workflow designed for speed and verification'}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Step 1 */}
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-2 relative">
              <div className="w-8 h-8 rounded-full bg-[#1473EA] text-white flex items-center justify-center font-black text-xs">
                1
              </div>
              <h4 className="font-black text-base text-[#092B4C]">
                {isNepali ? 'Scan गर्नुहोस्' : '1. Scan'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isNepali
                  ? 'Product लाई camera अगाडि राखेर scan सुरु गर्नुहोस्।'
                  : 'Position packaging in front of the camera to start scanning.'}
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-2 relative">
              <div className="w-8 h-8 rounded-full bg-[#1473EA] text-white flex items-center justify-center font-black text-xs">
                2
              </div>
              <h4 className="font-black text-base text-[#092B4C]">
                {isNepali ? 'Detect गर्नुहोस्' : '2. Detect'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isNepali
                  ? 'System ले image मा product र उपलब्ध information पहिचान गर्ने प्रयास गर्छ।'
                  : 'The vision engine detects the product and readable label information.'}
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-2 relative">
              <div className="w-8 h-8 rounded-full bg-[#1473EA] text-white flex items-center justify-center font-black text-xs">
                3
              </div>
              <h4 className="font-black text-base text-[#092B4C]">
                {isNepali ? 'Information जाँच गर्नुहोस्' : '3. Verify'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isNepali
                  ? 'AI बाट प्राप्त information लाई save गर्नु अघि तपाईंले review र आवश्यक correction गर्न सक्नुहुन्छ।'
                  : 'Review and correct any AI-extracted values before saving to ensure accuracy.'}
              </p>
            </div>

            {/* Step 4 */}
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-2 relative">
              <div className="w-8 h-8 rounded-full bg-[#1473EA] text-white flex items-center justify-center font-black text-xs">
                4
              </div>
              <h4 className="font-black text-base text-[#092B4C]">
                {isNepali ? 'Save गर्नुहोस्' : '4. Save'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isNepali
                  ? 'सही information आफ्नो inventory मा राख्नुहोस्।'
                  : 'Commit verified product details cleanly into your store inventory.'}
              </p>
            </div>

            {/* Step 5 */}
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-2 relative">
              <div className="w-8 h-8 rounded-full bg-[#1473EA] text-white flex items-center justify-center font-black text-xs">
                5
              </div>
              <h4 className="font-black text-base text-[#092B4C]">
                {isNepali ? 'Manage गर्नुहोस्' : '5. Manage'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isNepali
                  ? 'पछि product information र expiry सम्बन्धी records हेर्न तथा व्यवस्थापन गर्न सक्नुहुन्छ।'
                  : 'View, filter, and manage inventory balances and expiry records anytime.'}
              </p>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* 6. EXPIRY किन महत्वपूर्ण छ? (WHY EXPIRY MATTERS)                     */}
        {/* ==================================================================== */}
        <section className="py-16 bg-white border-y border-slate-200/80">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-black">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{isNepali ? 'हानि रोकथाम' : 'LOSS PREVENTION'}</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-[#092B4C] tracking-tight">
                  {isNepali ? 'Expiry किन महत्वपूर्ण छ?' : 'Why is Expiry Management Important?'}
                </h3>

                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  {isNepali ? (
                    'Expired वा expiry नजिक पुगेका products समयमै पहिचान गर्न नसक्दा व्यवसायलाई अनावश्यक stock loss हुन सक्छ।'
                  ) : (
                    'Failing to identify expired or near-expiry items on time directly results in avoidable stock spoilage and lost store capital.'
                  )}
                </p>

                <div className="space-y-2 pt-1 text-sm text-slate-700">
                  <p className="font-bold text-[#092B4C]">
                    {isNepali ? 'सही product records राख्दा shopkeeper ले:' : 'By keeping accurate product records, shopkeepers can:'}
                  </p>
                  <ul className="space-y-2 font-medium">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{isNepali ? 'कुन product को expiry नजिक छ भनेर हेर्न' : 'Spot which products are nearing expiration dates'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{isNepali ? 'पुरानो stock पहिले व्यवस्थापन गर्न' : 'Prioritize older stock first (FEFO inventory discipline)'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{isNepali ? 'inventory information व्यवस्थित राख्न' : 'Keep stock information clean and reliable'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{isNepali ? 'manual record-keeping घटाउन' : 'Significantly reduce tedious manual ledger writing'}</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                  <span className="font-bold">
                    {isNepali ? 'महत्वपूर्ण सूचना: ' : 'Important Notice: '}
                  </span>
                  {isNepali ? (
                    'ScanMe AI कुनै व्यवसायिक निर्णयको replacement होइन। Product information save वा प्रयोग गर्नु अघि त्यसलाई जाँच गर्नु सधैं राम्रो अभ्यास हो।'
                  ) : (
                    'ScanMe AI is not a replacement for merchant discretion. Reviewing and verifying extracted product details before saving is always best practice.'
                  )}
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="rounded-3xl bg-slate-900 text-white p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-bold text-amber-400">EXPIRY RADAR</span>
                    <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      {isNepali ? 'सक्रिय चेतावनी' : 'Active Warning'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-2xl bg-slate-800/80 border border-amber-500/40">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-amber-200">
                          {isNepali ? 'दूध तथा दुग्ध उत्पादन' : 'Dairy & Milk Items'}
                        </span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                          {isNepali ? '७ दिन बाँकी' : '7 Days Left'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {isNepali ? 'पहिले बिक्री गर्नुपर्ने सूचीमा' : 'Prioritized for immediate sale'}
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-800/80 border border-emerald-500/40">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-emerald-200">
                          {isNepali ? 'प्याकेट बिस्कुट तथा खाजा' : 'Packaged Biscuits'}
                        </span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                          {isNepali ? '१२० दिन बाँकी' : '120 Days Left'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {isNepali ? 'सुरक्षित स्टक स्थिति' : 'Safe stock status'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onLaunchApp}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors cursor-pointer"
                  >
                    {isNepali ? 'आफ्नो पसलमा जाँच गर्नुहोस्' : 'Check in Your Store'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* 7. SCANME AI कसका लागि बनाइएको हो? (WHO IS IT FOR?)                  */}
        {/* ==================================================================== */}
        <section className="py-16 lg:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#1473EA]">
              {isNepali ? 'प्रयोगकर्ता प्रोफाइल' : 'TARGET AUDIENCE'}
            </h2>
            <h3 className="text-2xl sm:text-3xl font-black text-[#092B4C] tracking-tight">
              {isNepali ? 'ScanMe AI कसका लागि बनाइएको हो?' : 'Who is ScanMe AI Built For?'}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {isNepali ? (
                'ScanMe AI विशेष गरी दैनिक रूपमा धेरै products व्यवस्थापन गर्ने local businesses लाई ध्यानमा राखेर बनाइएको हो।'
              ) : (
                'ScanMe AI is specially crafted for local retail operations managing high daily product turnover.'
              )}
            </p>
          </div>

          <div className="mt-12 max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: isNepali ? 'Grocery stores' : 'Grocery stores', icon: '🛒' },
              { label: isNepali ? 'General stores' : 'General stores', icon: '🏪' },
              { label: isNepali ? 'Pharmacies' : 'Pharmacies', icon: '💊' },
              { label: isNepali ? 'Medical stores' : 'Medical stores', icon: '🩺' },
              { label: isNepali ? 'Restaurants' : 'Restaurants', icon: '🍽️' },
              { label: isNepali ? 'Hotels' : 'Hotels', icon: '🏨' },
              { label: isNepali ? 'Small retailers' : 'Small retailers', icon: '📦' },
              { label: isNepali ? 'अन्य product businesses' : 'Other retail businesses', icon: '✨' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white border border-slate-200 text-center space-y-2 shadow-xs hover:border-[#1473EA] transition-all"
              >
                <div className="text-2xl">{item.icon}</div>
                <div className="text-xs sm:text-sm font-bold text-slate-800">{item.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ==================================================================== */}
        {/* 8. सरल DIGITAL INVENTORY को सुरुवात (THE WORKFLOW)                     */}
        {/* ==================================================================== */}
        <section className="py-16 bg-white border-y border-slate-200/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#1473EA]">
              {isNepali ? 'सुरुवात' : 'GETTING STARTED'}
            </h2>

            <h3 className="text-2xl sm:text-3xl font-black text-[#092B4C] tracking-tight">
              {isNepali ? 'सरल Digital Inventory को सुरुवात' : 'Start Simple Digital Inventory Today'}
            </h3>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {isNepali ? (
                'ठूलो र जटिल inventory system प्रयोग गर्न नसक्ने वा सुरु गर्न नचाहने साना व्यवसायका लागि ScanMe AI ले सरल workflow उपलब्ध गराउने लक्ष्य राख्छ।'
              ) : (
                'For small shops who cannot afford or manage complex Enterprise ERP systems, ScanMe AI delivers a straightforward, intuitive workflow.'
              )}
            </p>

            {/* Workflow Banner */}
            <div className="py-6">
              <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-emerald-50 border border-blue-200/80 text-sm sm:text-base font-black text-[#092B4C] shadow-sm">
                <span className="px-3 py-1 rounded-xl bg-white shadow-2xs">Scan</span>
                <span className="text-[#1473EA]">→</span>
                <span className="px-3 py-1 rounded-xl bg-white shadow-2xs">Review</span>
                <span className="text-[#1473EA]">→</span>
                <span className="px-3 py-1 rounded-xl bg-white shadow-2xs">Save</span>
                <span className="text-[#1473EA]">→</span>
                <span className="px-3 py-1 rounded-xl bg-white shadow-2xs">Manage</span>
              </div>
            </div>

            <p className="text-sm text-slate-600 font-medium">
              {isNepali ? (
                'यही सरल प्रक्रियाबाट आफ्नो product records व्यवस्थित गर्न सुरु गर्न सकिन्छ।'
              ) : (
                'Start keeping organized product records through this straightforward, four-step routine.'
              )}
            </p>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* 9. FREQUENTLY ASKED QUESTIONS (FAQ)                                  */}
        {/* ==================================================================== */}
        <section className="py-16 lg:py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-10">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#1473EA]">
              {isNepali ? 'प्रायः सोधिने प्रश्नहरू' : 'FAQ'}
            </h2>
            <h3 className="text-2xl sm:text-3xl font-black text-[#092B4C] tracking-tight">
              {isNepali ? 'Frequently Asked Questions' : 'Frequently Asked Questions'}
            </h3>
            <p className="text-sm text-slate-600">
              {isNepali
                ? 'ScanMe AI सम्बन्धी सम्पूर्ण जिज्ञासाहरूको स्पष्ट जवाफ'
                : 'Clear answers to common questions about ScanMe AI'}
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-[#092B4C] hover:text-[#1473EA] transition-colors cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180 text-[#1473EA]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 animate-in fade-in duration-150">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ==================================================================== */}
        {/* 10. ABOUT SCANME AI                                                  */}
        {/* ==================================================================== */}
        <section className="py-16 bg-white border-y border-slate-200/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#1473EA]">
              {isNepali ? 'हाम्रो बारेमा' : 'ABOUT US'}
            </h2>

            <h3 className="text-2xl sm:text-3xl font-black text-[#092B4C] tracking-tight">
              {isNepali ? 'About ScanMe AI' : 'About ScanMe AI'}
            </h3>

            <div className="text-base text-slate-600 leading-relaxed space-y-4 text-left sm:text-center max-w-3xl mx-auto">
              <p>
                {isNepali ? (
                  'ScanMe AI को उद्देश्य local businesses लाई आधुनिक technology प्रयोग गरेर आफ्नो दैनिक product र inventory management सरल बनाउन सहयोग गर्नु हो।'
                ) : (
                  'ScanMe AI aims to assist local businesses in simplifying their day-to-day product and inventory management using accessible modern technology.'
                )}
              </p>
              <p>
                {isNepali ? (
                  'ठूला businesses का लागि मात्र होइन, साना local shops ले पनि digital tools प्रयोग गर्न सकून् भन्ने उद्देश्यले ScanMe AI लाई सरल र mobile-friendly बनाइएको छ।'
                ) : (
                  'Crafted specifically so small local stores—not just large supermarket chains—can reap the benefits of digital scanning and inventory tools right on their mobile phones.'
                )}
              </p>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* 11. प्रयोग गर्नुहोस् (START SCANNING FINAL CTA)                          */}
        {/* ==================================================================== */}
        <section className="py-16 lg:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-[#092B4C] via-[#0d3b66] to-[#1473EA] text-white p-8 sm:p-14 text-center space-y-6 shadow-xl">
            <h3 className="text-2xl sm:text-4xl font-black tracking-tight">
              {isNepali ? 'प्रयोग गर्नुहोस्' : 'Try It Now'}
            </h3>

            <p className="text-sm sm:text-base text-blue-100 max-w-2xl mx-auto leading-relaxed">
              {isNepali
                ? 'आफ्नो पहिलो product scan गरेर ScanMe AI कसरी काम गर्छ भनेर हेर्नुहोस्।'
                : 'Scan your first product packaging and experience how ScanMe AI organizes inventory.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={onLaunchApp}
                className="w-full sm:w-auto px-9 py-4 rounded-2xl bg-white text-[#092B4C] font-black text-sm hover:bg-slate-100 transition-all shadow-md flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-[#1473EA]" />
                <span>{isNepali ? 'Start Scanning' : 'Start Scanning'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="https://github.com/ab123170-max/Manager-/releases/latest/download/scanme-ai.apk"
                download
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-colors text-center border border-white/20"
              >
                Download Android APK
              </a>
            </div>

            <div className="pt-2 text-xs font-semibold text-blue-200">
              ScanMe AI — Simple scanning. Smarter inventory management.
            </div>
          </div>
        </section>
      </main>

      <PublicFooter
        currentPath="/"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
