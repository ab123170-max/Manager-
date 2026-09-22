/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  Boxes,
  Clock,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  Check,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSelectorButton } from '../common/LanguageSelectorButton';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinish: () => void;
}

interface StepItem {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  accentBg: string;
  details: string[];
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onFinish,
}) => {
  const { t, languageOption, openLanguageSelector } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);

  const steps: StepItem[] = [
    {
      title: 'Scan Products',
      subtitle: 'Instant Packaging & Vision Recognition',
      description:
        'Point your camera at any consumer package or label. The multi-shot scanner automatically recognizes the product name, price, batch, manufacture date, and expiry date.',
      icon: Camera,
      iconColor: 'text-[#1473EA]',
      accentBg: 'bg-blue-50 border-blue-100',
      details: [
        'Single or multi-shot label extraction',
        'Automatic MFD & EXP date calculation',
        'Barcode and QR code cross-validation',
      ],
    },
    {
      title: 'Manage Inventory',
      subtitle: 'Streamlined Stock-In & Stock-Out',
      description:
        'Add products, organize quantities, purchase costs, selling prices, and store locations. Perform quick stock adjustments and track every unit movement in a verified ledger.',
      icon: Boxes,
      iconColor: 'text-indigo-600',
      accentBg: 'bg-indigo-50 border-indigo-100',
      details: [
        'Organize stock by rack location & supplier',
        'Direct POS sales and dispatch ledger',
        'Automatic low-stock warning thresholds',
      ],
    },
    {
      title: 'Track Expiry',
      subtitle: 'Zero Waste & Early Alerts',
      description:
        'Never let expired stock reach your shelves. Receive smart expiry countdowns, color-coded urgency badges, and instant home-screen alerts before items spoil.',
      icon: Clock,
      iconColor: 'text-amber-600',
      accentBg: 'bg-amber-50 border-amber-100',
      details: [
        'Automated 30-day, 7-day, and critical alerts',
        'One-touch stock write-off or discount sales',
        'Multi-gesture swipe-to-dismiss support',
      ],
    },
    {
      title: 'Analyze Your Stock',
      subtitle: 'Clear Financial Reports & Turnover',
      description:
        'Gain complete visibility over your inventory health with turnover velocity metrics, total stock valuation, gross profit margins, and detailed loss summaries.',
      icon: BarChart3,
      iconColor: 'text-purple-600',
      accentBg: 'bg-purple-50 border-purple-100',
      details: [
        'Live inventory valuation and estimated profit',
        'Turnover velocity (fast vs stagnant items)',
        'Full historical audit trail of transactions',
      ],
    },
  ];

  if (!isOpen) return null;

  const isLastStep = currentStep === steps.length - 1;
  const stepData = steps[currentStep];
  const IconComponent = stepData.icon;

  const handleNext = () => {
    if (isLastStep) {
      authService.setOnboardingCompleted(true);
      onFinish();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    authService.setOnboardingCompleted(true);
    onFinish();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Language, Step count, Skip and Close */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#1473EA] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              {currentStep + 1} / {steps.length}
            </span>
            <LanguageSelectorButton variant="compact" />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              {t('onboarding.skip')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Graphic / Icon Badge */}
              <div className="flex items-center justify-center pt-2">
                <div
                  className={`w-20 h-20 rounded-3xl flex items-center justify-center border shadow-md ${stepData.accentBg}`}
                >
                  <IconComponent className={`w-10 h-10 ${stepData.iconColor}`} />
                </div>
              </div>

              {/* Text info */}
              <div className="text-center space-y-2">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  {stepData.subtitle}
                </p>
                <h3 className="text-2xl font-black text-[#092B4C] tracking-tight">
                  {stepData.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                  {stepData.description}
                </p>
              </div>

              {/* Feature Points */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5">
                {stepData.details.map((detail) => (
                  <div key={detail} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          {/* Progress Indicators */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStep ? 'w-6 bg-[#1473EA]' : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-white text-xs font-bold transition-all flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{t('common.back')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              id="btn-onboarding-next"
              className="px-5 py-2.5 rounded-xl bg-[#1473EA] hover:bg-blue-600 text-white text-xs font-bold shadow-md shadow-[#1473EA]/25 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>{isLastStep ? `${t('common.finish')} & ${t('auth.login')}` : t('common.next')}</span>
              {isLastStep ? <Sparkles className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
