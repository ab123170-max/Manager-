/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Check, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SupportedLanguage } from '../../translations';

interface LanguageSelectorModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSelect?: (lang: SupportedLanguage) => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  onSelect,
}) => {
  const {
    language,
    setLanguage,
    supportedLanguages,
    isLanguageSelectorOpen,
    closeLanguageSelector,
    t,
  } = useLanguage();

  const isOpen = propIsOpen !== undefined ? propIsOpen : isLanguageSelectorOpen;
  const handleClose = propOnClose || closeLanguageSelector;

  if (!isOpen) return null;

  const handleSelectLanguage = async (code: SupportedLanguage) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
    await setLanguage(code);
    if (onSelect) onSelect(code);
    handleClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        />

        {/* Modal / Bottom Sheet */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full sm:max-w-md max-h-[calc(100dvh-1rem)] sm:max-h-[90dvh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 pb-4 sm:pb-5 flex flex-col"
        >
          {/* Mobile Drag Pill */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

          {/* Header */}
          <div className="p-5 pb-3 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  {t('settings.selectLanguageTitle')}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {t('settings.currentLanguage')}:{' '}
                  <span className="font-bold text-indigo-600">
                    {supportedLanguages.find((l) => l.code === language)?.name}
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Language Options List */}
          <div className="p-4 space-y-2 overflow-y-auto overscroll-contain min-h-0">
            {supportedLanguages.map((item) => {
              const isSelected = language === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleSelectLanguage(item.code)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all active:scale-[0.99] text-left ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-400/80 text-indigo-950 shadow-xs'
                      : 'bg-slate-50/70 hover:bg-slate-100/90 border-slate-200/80 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl select-none" role="img" aria-label={item.name}>
                      {item.flag}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm text-slate-900">{item.name}</span>
                        {item.code !== 'en' && (
                          <span className="text-xs text-slate-400 font-medium">
                            ({item.englishName})
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {item.code === 'ne'
                          ? 'नेपाली भाषा'
                          : item.code === 'hi'
                          ? 'हिन्दी भाषा'
                          : 'Standard English'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center">
                    {isSelected ? (
                      <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-slate-300 group-hover:border-slate-400" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bottom Note */}
          <div className="px-5 pt-1 text-center">
            <p className="text-[11px] text-slate-400">
              {t('settings.selectLanguageSubtitle')}
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
