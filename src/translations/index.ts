/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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

/**
 * In-memory translations registry.
 * Populated on-demand only for the active language.
 */
export const TRANSLATIONS_REGISTRY: Partial<Record<SupportedLanguage, Record<string, any>>> = {};

// In-flight loading promises to prevent duplicate fetches
const loadingPromises: Partial<Record<SupportedLanguage, Promise<Record<string, any>>>> = {};

/**
 * On-demand translation loader.
 * Checks memory cache -> checks localStorage cache -> dynamically imports target language chunk.
 */
export async function loadLanguageTranslations(lang: SupportedLanguage): Promise<Record<string, any>> {
  // 1. Memory Cache
  if (TRANSLATIONS_REGISTRY[lang]) {
    return TRANSLATIONS_REGISTRY[lang]!;
  }

  // 2. In-flight promise
  if (loadingPromises[lang]) {
    return loadingPromises[lang]!;
  }

  // 3. LocalStorage Cache
  const storageKey = `smartstock_lang_dict_v1_${lang}`;
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        TRANSLATIONS_REGISTRY[lang] = parsed;
        return parsed;
      }
    } catch {}
  }

  // 4. Dynamic Import (Code-split language chunk)
  const promise = (async () => {
    let dict: Record<string, any>;
    try {
      if (lang === 'ne') {
        const mod = await import('./ne.json');
        dict = mod.default || mod;
      } else if (lang === 'hi') {
        const mod = await import('./hi.json');
        dict = mod.default || mod;
      } else {
        const mod = await import('./en.json');
        dict = mod.default || mod;
      }
    } catch (err) {
      console.warn(`[translations] Failed to load language '${lang}':`, err);
      // Fallback to empty dictionary if network fails
      dict = {};
    }

    TRANSLATIONS_REGISTRY[lang] = dict;

    // Cache locally for offline and instant subsequent access
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(dict));
      } catch {}
    }

    return dict;
  })();

  loadingPromises[lang] = promise;
  return promise;
}

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
 * Safe translation lookup with nested dot notation and fallback
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
  let text = dictionary ? getNested(dictionary, key) : null;

  // 2. Fall back to English if missing or empty
  if (!text && lang !== 'en' && fallbackDictionary) {
    text = getNested(fallbackDictionary, key);
  }

  // 3. If still missing, return the human-friendly key leaf so UI remains informative
  if (!text) {
    const segments = key.split('.');
    text = segments[segments.length - 1] || key;
  }

  // Parameter replacement: {paramName}
  if (params && typeof text === 'string') {
    Object.entries(params).forEach(([k, v]) => {
      text = text!.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }

  return text;
}
