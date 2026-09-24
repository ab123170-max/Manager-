/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import {
  SupportedLanguage,
  LanguageOption,
  SUPPORTED_LANGUAGES,
  detectBrowserLanguage,
  normalizeLanguageCode,
  translateKey,
  loadLanguageTranslations,
} from '../translations';
import { authService, subscribeAuth } from '../services/authService';

const STORAGE_KEYS = {
  LANGUAGE: 'smartstock_language',
  MANUAL_FLAG: 'smartstock_lang_manual',
};

interface LanguageContextType {
  language: SupportedLanguage;
  languageOption: LanguageOption;
  supportedLanguages: LanguageOption[];
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: string | Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatRelativeDate: (days: number) => string;
  formatCurrency: (amount: number, currencyCode?: string) => string;
  isLanguageSelectorOpen: boolean;
  openLanguageSelector: () => void;
  closeLanguageSelector: () => void;
  lastLanguageChangeNotice: string | null;
  clearLanguageNotice: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Determine initial language following priority:
  // 1. User's saved Supabase profile language
  // 2. Manually selected local preference
  // 3. Device/browser language
  // 4. English fallback
  const determineInitialLanguage = (): SupportedLanguage => {
    try {
      // 1. Supabase Profile if available
      const currentProfile = authService.getCurrentProfile();
      if (currentProfile?.language) {
        const normalized = normalizeLanguageCode(currentProfile.language);
        if (normalized) return normalized;
      }

      // 2. Manually selected local preference
      const stored = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
      if (stored) {
        const normalized = normalizeLanguageCode(stored);
        if (normalized) return normalized;
      }

      // 3. Device / browser language
      const detected = detectBrowserLanguage();
      if (detected) return detected;
    } catch (e) {
      console.warn('[LanguageProvider] initial language check failed, defaulting to en', e);
    }

    // 4. English Fallback
    return 'en';
  };

  const [language, setLanguageState] = useState<SupportedLanguage>(determineInitialLanguage);
  const [isLanguageSelectorOpen, setIsLanguageSelectorOpen] = useState<boolean>(false);
  const [lastLanguageChangeNotice, setLastLanguageChangeNotice] = useState<string | null>(null);
  const [, setTranslationsVersion] = useState(0);

  // Load translations on-demand for active language
  useEffect(() => {
    let active = true;
    loadLanguageTranslations(language).then(() => {
      if (active) setTranslationsVersion((v) => v + 1);
    });
    return () => {
      active = false;
    };
  }, [language]);

  const activeOption = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[1]; // default English
  }, [language]);

  // Sync HTML element lang and dir attributes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = activeOption.dir;
    }
  }, [language, activeOption]);

  // Listen to auth state changes (e.g. user logs in on another device or gets fresh profile from Supabase)
  useEffect(() => {
    const unsub = subscribeAuth((session) => {
      if (session?.profile?.language) {
        const profileLang = normalizeLanguageCode(session.profile.language);
        if (profileLang && profileLang !== language) {
          setLanguageState(profileLang);
          try {
            localStorage.setItem(STORAGE_KEYS.LANGUAGE, profileLang);
          } catch {}
        }
      }
    });
    return unsub;
  }, [language]);

  // Change language function
  const setLanguage = useCallback(
    async (newLang: SupportedLanguage) => {
      await loadLanguageTranslations(newLang);
      setLanguageState(newLang);
      setTranslationsVersion((v) => v + 1);

      // Persist locally
      try {
        localStorage.setItem(STORAGE_KEYS.LANGUAGE, newLang);
        localStorage.setItem(STORAGE_KEYS.MANUAL_FLAG, 'true');
      } catch (err) {
        console.warn('[LanguageProvider] Failed to persist language to localStorage', err);
      }

      // If user is authenticated, save preference to Supabase profile (profiles.language)
      if (authService.isAuthenticated()) {
        try {
          await authService.saveProfile({ language: newLang });
        } catch (err) {
          console.warn('[LanguageProvider] Failed to sync language to Supabase profile', err);
        }
      }

      // Show success notification in newly selected language
      const noticeText = translateKey(newLang, 'settings.languageChanged');
      setLastLanguageChangeNotice(noticeText);
    },
    []
  );

  const clearLanguageNotice = useCallback(() => {
    setLastLanguageChangeNotice(null);
  }, []);

  // Safe translation helper
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      return translateKey(language, key, params);
    },
    [language]
  );

  // Locale-aware number formatting
  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions): string => {
      try {
        return new Intl.NumberFormat(activeOption.locale, options).format(value);
      } catch {
        return String(value);
      }
    },
    [activeOption.locale]
  );

  // Locale-aware date formatting
  const formatDate = useCallback(
    (date: string | Date | number, options?: Intl.DateTimeFormatOptions): string => {
      try {
        const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
        if (isNaN(d.getTime())) return String(date);
        const defaultOptions: Intl.DateTimeFormatOptions = {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          ...options,
        };
        return new Intl.DateTimeFormat(activeOption.locale, defaultOptions).format(d);
      } catch {
        return String(date);
      }
    },
    [activeOption.locale]
  );

  // Locale-aware relative date formatting
  const formatRelativeDate = useCallback(
    (days: number): string => {
      try {
        if (typeof Intl !== 'undefined' && 'RelativeTimeFormat' in Intl) {
          const rtf = new Intl.RelativeTimeFormat(activeOption.locale, { numeric: 'auto' });
          return rtf.format(days, 'day');
        }
      } catch {}

      if (days === 0) {
        return language === 'ne' ? 'आज' : language === 'hi' ? 'आज' : 'Today';
      }
      if (days === 1) {
        return language === 'ne' ? 'भोलि' : language === 'hi' ? 'कल' : 'Tomorrow';
      }
      if (days === -1) {
        return language === 'ne' ? 'हिजो' : language === 'hi' ? 'कल' : 'Yesterday';
      }
      if (days > 0) {
        return language === 'ne'
          ? `${days} दिन बाँकी`
          : language === 'hi'
          ? `${days} दिन शेष`
          : `in ${days} days`;
      }
      return language === 'ne'
        ? `${Math.abs(days)} दिन अघि`
        : language === 'hi'
        ? `${Math.abs(days)} दिन पहले`
        : `${Math.abs(days)} days ago`;
    },
    [activeOption.locale, language]
  );

  // Currency formatting (Keeps user-selected currency independent from display language!)
  const formatCurrency = useCallback(
    (amount: number, currencyCode = 'NPR'): string => {
      try {
        return new Intl.NumberFormat(activeOption.locale, {
          style: 'currency',
          currency: currencyCode,
          maximumFractionDigits: 2,
        }).format(amount);
      } catch {
        // Fallback if specific currency code or locale combination throws
        return `${currencyCode} ${amount.toFixed(2)}`;
      }
    },
    [activeOption.locale]
  );

  const openLanguageSelector = useCallback(() => setIsLanguageSelectorOpen(true), []);
  const closeLanguageSelector = useCallback(() => setIsLanguageSelectorOpen(false), []);

  const contextValue = useMemo(
    () => ({
      language,
      languageOption: activeOption,
      supportedLanguages: SUPPORTED_LANGUAGES,
      setLanguage,
      t,
      formatNumber,
      formatDate,
      formatRelativeDate,
      formatCurrency,
      isLanguageSelectorOpen,
      openLanguageSelector,
      closeLanguageSelector,
      lastLanguageChangeNotice,
      clearLanguageNotice,
    }),
    [
      language,
      activeOption,
      setLanguage,
      t,
      formatNumber,
      formatDate,
      formatRelativeDate,
      formatCurrency,
      isLanguageSelectorOpen,
      openLanguageSelector,
      closeLanguageSelector,
      lastLanguageChangeNotice,
      clearLanguageNotice,
    ]
  );

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export const useTranslation = useLanguage;
