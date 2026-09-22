/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings,
  Globe,
  Coins,
  Store,
  Phone,
  CheckCircle2,
  ChevronRight,
  X,
  User,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { UserProfile } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: UserProfile | null;
  onEditProfile?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onEditProfile,
}) => {
  const {
    languageOption,
    openLanguageSelector,
    lastLanguageChangeNotice,
    clearLanguageNotice,
    t,
  } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 p-5 sm:p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center">
              <Settings className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {t('settings.title')}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {t('settings.preferences')} &amp; {t('settings.language')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language Success Toast if recently changed */}
        {lastLanguageChangeNotice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 font-bold"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{lastLanguageChangeNotice}</span>
            </div>
            <button
              type="button"
              onClick={clearLanguageNotice}
              className="text-emerald-600 hover:text-emerald-800 text-xs ml-2"
            >
              ✕
            </button>
          </motion.div>
        )}

        <div className="space-y-3">
          {/* Section: Language Selection */}
          <div>
            <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider block mb-2 px-1">
              {t('settings.general')}
            </span>

            {/* Language Selection Card */}
            <div
              onClick={() => {
                openLanguageSelector();
              }}
              role="button"
              tabIndex={0}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-2xl cursor-pointer transition-all active:scale-[0.99] group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100/80 text-indigo-700 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 leading-snug">
                    {t('settings.language')}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                    <span>{t('settings.currentLanguage')}:</span>
                    <span className="font-black text-indigo-600 flex items-center gap-1">
                      <span>{languageOption.flag}</span>
                      <span>{languageOption.name}</span>
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-indigo-600 group-hover:text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                  {t('common.edit')}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
              </div>
            </div>
          </div>

          {/* Section: Account & Store Details */}
          <div>
            <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider block mb-2 px-1">
              {t('settings.account')}
            </span>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-200/80 text-slate-700 flex items-center justify-center font-bold text-xs">
                    {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {userProfile?.full_name || 'Guest User'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      @{userProfile?.username || 'user'}
                    </p>
                  </div>
                </div>

                {onEditProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEditProfile();
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs"
                  >
                    {t('profile.editProfile')}
                  </button>
                )}
              </div>

              {userProfile?.currency && (
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">{t('settings.currency')}</span>
                  <span className="font-mono font-bold text-slate-800">{userProfile.currency}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
          >
            {t('common.close')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
