/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================================
 * CENTRALIZED DATE SERVICE & REAL-WORLD CALENDAR PARSER
 * ============================================================================
 * Dynamically uses device/browser runtime timezone and calendar date.
 * Supports explicit parsing of 2-digit/4-digit years, text months ("26 SEP 05"),
 * expiry date calculations from manufacture date + best-before months,
 * and date validation.
 */

export interface ParsedDateResult {
  raw: string;
  formatted: string; // e.g. "26 Sep 2026"
  isoDate: string;   // e.g. "2026-09-26"
  year: number;
  month: number;     // 1-12
  day: number;       // 1-31
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  warning?: string;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTH_NAME_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/**
 * 1. Obtains current local date and time dynamically from device/browser at runtime.
 */
export function getCurrentLocalDateTime(): {
  year: number;
  month: number;
  day: number;
  timestamp: number;
  formatted: string;
} {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const formatted = `${day} ${MONTH_NAMES[month - 1]} ${year}`;
  return {
    year,
    month,
    day,
    timestamp: now.getTime(),
    formatted,
  };
}

/**
 * 2. Interpret ambiguous 2-digit or 4-digit years using current year context.
 */
export function interpretAmbiguousYear(yearInput: string | number): number {
  const currentYear = new Date().getFullYear();
  const str = String(yearInput).trim();
  const parsed = parseInt(str, 10);

  if (isNaN(parsed)) return currentYear;

  if (str.length === 2 || parsed < 100) {
    // 2-digit year interpretation: e.g. 25 -> 2025, 26 -> 2026
    const fullYear = 2000 + (parsed % 100);
    // If within reasonable product window (e.g. 5 years past or 10 years future), keep it.
    // Otherwise adjust if needed.
    return fullYear;
  }

  return parsed;
}

// Fast in-memory parse cache
const parsedDateServiceCache = new Map<string, ParsedDateResult>();

/**
 * 3. Centralized parseProductDate function without ambiguous JS Date parsing.
 */
export function parseProductDate(rawDateStr: string): ParsedDateResult {
  const current = getCurrentLocalDateTime();

  if (!rawDateStr || typeof rawDateStr !== 'string') {
    return {
      raw: '',
      formatted: '',
      isoDate: '',
      year: current.year,
      month: current.month,
      day: current.day,
      isValid: false,
      confidence: 'low',
      warning: 'No date provided',
    };
  }

  const raw = rawDateStr.trim();
  if (parsedDateServiceCache.has(raw)) {
    return parsedDateServiceCache.get(raw)!;
  }

  let clean = raw.replace(/[,\s]+/g, ' ').trim();

  // Strip common packaging prefix tags (e.g. "EXP 12/2027", "MFD 06/2026", "BB 12 MONTHS", "EXP.", "MFG:")
  const prefixMatch = clean.match(/^(?:EXP(?:IRY)?|MFD|MFG|PROD(?:UCTION)?|PD|DOM|BEST\s+BEFORE|BB|B\.B\.|USE\s+BY|UB|BBD)\s*[:.\-]?\s+(.*)$/i);
  if (prefixMatch) {
    clean = prefixMatch[1].trim();
  }

  // Relative format check: "BB 12 MONTHS", "12 MONTHS", "6 MONTHS"
  const relMonthsMatch = clean.match(/^(\d{1,3})\s*(?:MONTHS?|MON|M)\b/i);
  if (relMonthsMatch) {
    const months = parseInt(relMonthsMatch[1], 10);
    if (months > 0 && months <= 120) {
      const now = new Date();
      const nowYear = now.getFullYear();
      const nowMonth = now.getMonth() + 1;
      const totalMonths = (nowYear * 12) + (nowMonth - 1) + months;
      const targetYear = Math.floor(totalMonths / 12);
      const targetMonth = (totalMonths % 12) + 1;
      const iso = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
      const formatted = `${MONTH_NAMES[targetMonth - 1]} ${targetYear}`;
      const result: ParsedDateResult = {
        raw,
        formatted,
        isoDate: iso,
        year: targetYear,
        month: targetMonth,
        day: 1,
        isValid: true,
        confidence: 'high',
      };
      parsedDateServiceCache.set(raw, result);
      return result;
    }
  }

  // Pattern A: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const isoMatch = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const formatted = `${d} ${MONTH_NAMES[m - 1]} ${y}`;
      const result: ParsedDateResult = {
        raw,
        formatted,
        isoDate: iso,
        year: y,
        month: m,
        day: d,
        isValid: true,
        confidence: 'high',
      };
      parsedDateServiceCache.set(raw, result);
      return result;
    }
  }

  // Pattern B: Textual Month (e.g. "26 SEP 05", "15 OCT 2026", "OCT 2026")
  const wordMonthMatch = clean.match(/(?:(\d{1,2})[\/\s\-\.])?([a-zA-Z]{3,9})[\/\s\-\.](\d{2,4})/i);
  if (wordMonthMatch) {
    const rawDay = wordMonthMatch[1];
    const monthStr = wordMonthMatch[2].toLowerCase();
    const rawYear = wordMonthMatch[3];
    const y = interpretAmbiguousYear(rawYear);
    const m = MONTH_NAME_MAP[monthStr];

    if (m) {
      const d = rawDay ? parseInt(rawDay, 10) : 1;
      if (d >= 1 && d <= 31) {
        const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const formatted = `${d} ${MONTH_NAMES[m - 1]} ${y}`;
        const confidence = rawYear.length === 2 ? 'medium' : 'high';
        const warning = rawYear.length === 2 ? 'Please confirm the year.' : undefined;
        const result: ParsedDateResult = {
          raw,
          formatted,
          isoDate: iso,
          year: y,
          month: m,
          day: d,
          isValid: true,
          confidence,
          warning,
        };
        parsedDateServiceCache.set(raw, result);
        return result;
      }
    }
  }

  // Pattern C: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const rawYear = dmyMatch[3];
    const y = interpretAmbiguousYear(rawYear);

    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const formatted = `${d} ${MONTH_NAMES[m - 1]} ${y}`;
      const confidence = rawYear.length === 2 ? 'medium' : 'high';
      const warning = rawYear.length === 2 ? 'Please confirm the year.' : undefined;
      const result: ParsedDateResult = {
        raw,
        formatted,
        isoDate: iso,
        year: y,
        month: m,
        day: d,
        isValid: true,
        confidence,
        warning,
      };
      parsedDateServiceCache.set(raw, result);
      return result;
    }
  }

  // Pattern C2: MM/YYYY or MM-YYYY
  const myMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{2,4})$/);
  if (myMatch) {
    const m = parseInt(myMatch[1], 10);
    const rawYear = myMatch[2];
    const y = interpretAmbiguousYear(rawYear);
    if (m >= 1 && m <= 12) {
      const iso = `${y}-${String(m).padStart(2, '0')}-01`;
      const formatted = `${MONTH_NAMES[m - 1]} ${y}`;
      const result: ParsedDateResult = {
        raw,
        formatted,
        isoDate: iso,
        year: y,
        month: m,
        day: 1,
        isValid: true,
        confidence: 'high',
      };
      parsedDateServiceCache.set(raw, result);
      return result;
    }
  }

  // Pattern D: YY/MM/DD or YY//MM//DD or YY-MM-DD (2-digit year first)
  const yyyymmddMatch = clean.match(/^(\d{2})[\/\-\.]+(\d{1,2})[\/\-\.]+(\d{1,2})$/);
  if (yyyymmddMatch) {
    const rawYear = yyyymmddMatch[1];
    const m = parseInt(yyyymmddMatch[2], 10);
    const d = parseInt(yyyymmddMatch[3], 10);
    const y = interpretAmbiguousYear(rawYear);

    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const formatted = `${d} ${MONTH_NAMES[m - 1]} ${y}`;
      return {
        raw,
        formatted,
        isoDate: iso,
        year: y,
        month: m,
        day: d,
        isValid: true,
        confidence: 'medium',
        warning: 'Please confirm the year.',
      };
    }
  }

  // Fallback / Unrecognized
  return {
    raw,
    formatted: raw,
    isoDate: '',
    year: current.year,
    month: current.month,
    day: current.day,
    isValid: false,
    confidence: 'low',
    warning: 'Please confirm the year.',
  };
}

/**
 * 4. Automatically calculate expiry date from manufacture date + best before months.
 */
export function calculateExpiryDate(manufactureDateStr: string, bestBeforeMonths: number): string {
  const mfdParsed = parseProductDate(manufactureDateStr);
  if (!mfdParsed.isValid || !bestBeforeMonths || bestBeforeMonths <= 0) {
    return '';
  }

  const d = new Date(mfdParsed.year, mfdParsed.month - 1, mfdParsed.day);
  d.setMonth(d.getMonth() + bestBeforeMonths);

  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();

  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * 5. Validate product dates (MFD vs EXP, expiration status).
 */
export function validateProductDates(manufactureDateStr: string, expiryDateStr: string): {
  isValid: boolean;
  isExpired: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const mfd = parseProductDate(manufactureDateStr);
  const exp = parseProductDate(expiryDateStr);

  const current = getCurrentLocalDateTime();
  const todayTime = new Date(current.year, current.month - 1, current.day).getTime();

  let isExpired = false;

  if (exp.isValid && exp.isoDate) {
    const expTime = new Date(exp.isoDate).getTime();
    if (expTime < todayTime) {
      isExpired = true;
      warnings.push('Product is expired.');
    }
  }

  if (mfd.isValid && exp.isValid && mfd.isoDate && exp.isoDate) {
    const mfdTime = new Date(mfd.isoDate).getTime();
    const expTime = new Date(exp.isoDate).getTime();
    if (expTime < mfdTime) {
      warnings.push('Expiry date cannot be earlier than manufacture date.');
    }
  }

  return {
    isValid: warnings.length === 0,
    isExpired,
    warnings,
  };
}
