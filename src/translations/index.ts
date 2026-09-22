/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import enTranslations from './en.json';
import neTranslations from './ne.json';
import hiTranslations from './hi.json';

export type SupportedLanguage = 'en' | 'ne' | 'hi';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string; // Native name
  englishName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
  locale: string; // BCP 47 locale for Intl formatting
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'ne',
    name: 'नेपाली',
    englishName: 'Nepali',
    flag: '🇳🇵',
    dir: 'ltr',
    locale: 'ne-NP',
  },
  {
    code: 'en',
    name: 'English',
    englishName: 'English',
    flag: '🇬🇧',
    dir: 'ltr',
    locale: 'en-US',
  },
  {
    code: 'hi',
    name: 'हिन्दी',
    englishName: 'Hindi',
    flag: '🇮🇳',
    dir: 'ltr',
    locale: 'hi-IN',
  },
];

export const TRANSLATIONS_REGISTRY: Record<SupportedLanguage, Record<string, any>> = {
  en: enTranslations,
  ne: neTranslations,
  hi: hiTranslations,
};

/**
 * Normalizes any language string (e.g. "Nepali", "ne-NP", "Hindi", "hi_IN") to SupportedLanguage
 */
export function normalizeLanguageCode(input?: string | null): SupportedLanguage | null {
  if (!input) return null;
  const clean = input.trim().toLowerCase();
  if (clean === 'ne' || clean.startsWith('ne-') || clean.startsWith('ne_') || clean.includes('nepal')) {
    return 'ne';
  }
  if (clean === 'hi' || clean.startsWith('hi-') || clean.startsWith('hi_') || clean.includes('hindi')) {
    return 'hi';
  }
  if (clean === 'en' || clean.startsWith('en-') || clean.startsWith('en_') || clean.includes('english')) {
    return 'en';
  }
  return null;
}

/**
 * Automatically detect device/browser language
 */
export function detectBrowserLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') return 'en';

  const candidateLanguages: string[] = [];
  if (Array.isArray(navigator.languages)) {
    candidateLanguages.push(...navigator.languages);
  }
  if (navigator.language) {
    candidateLanguages.push(navigator.language);
  }

  for (const lang of candidateLanguages) {
    const matched = normalizeLanguageCode(lang);
    if (matched) return matched;
  }

  return 'en';
}

/**
 * Safe translation lookup with nested dot notation and English fallback
 */
export function translateKey(
  lang: SupportedLanguage,
  key: string,
  params?: Record<string, string | number>
): string {
  const dictionary = TRANSLATIONS_REGISTRY[lang] || TRANSLATIONS_REGISTRY.en;
  const fallbackDictionary = TRANSLATIONS_REGISTRY.en;

  const getNested = (obj: any, path: string): string | null => {
    if (!obj || typeof obj !== 'object') return null;
    const parts = path.split('.');
    let curr = obj;
    for (const part of parts) {
      if (curr && typeof curr === 'object' && part in curr) {
        curr = curr[part];
      } else {
        return null;
      }
    }
    return typeof curr === 'string' ? curr : null;
  };

  // 1. Try active language
  let text = getNested(dictionary, key);

  // 2. Fall back to English if missing or empty
  if (!text && lang !== 'en') {
    text = getNested(fallbackDictionary, key);
  }

  // 3. If still missing, return the key itself so UI never displays "undefined"
  if (!text) {
    text = key;
  }

  // Parameter replacement: {paramName}
  if (params && typeof text === 'string') {
    Object.entries(params).forEach(([k, v]) => {
      text = text!.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }

  return text;
}
