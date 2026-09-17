/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================================
 * ACCURATE PRODUCT DATE CALCULATOR & RECONCILIATION
 * ============================================================================
 * Handles:
 * - Recognizing date formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, MM/YYYY, MM-YYYY, YYYY/MM, YYYY-MM, YYYY-MM-DD
 * - Adding Best-Before duration (in months) to Manufacture Date (MFD) to calculate Expiry Date (EXP)
 * - Calculating duration in months between MFD and EXP
 * - Preferring explicit printed expiry dates over calculated ones
 * - Never fabricating or inventing missing information
 */

export interface DateParts {
  day?: number;
  month: number;
  year: number;
  separator: string;
  order: 'DMY' | 'MY' | 'YMD' | 'YM';
  isTextualMonth?: boolean;
  monthText?: string;
  raw: string;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, 'jan.': 1, january: 1,
  feb: 2, 'feb.': 2, february: 2,
  mar: 3, 'mar.': 3, march: 3,
  apr: 4, 'apr.': 4, april: 4,
  may: 5,
  jun: 6, 'jun.': 6, june: 6,
  jul: 7, 'jul.': 7, july: 7,
  aug: 8, 'aug.': 8, august: 8,
  sep: 9, 'sep.': 9, sept: 9, 'sept.': 9, september: 9,
  oct: 10, 'oct.': 10, october: 10,
  nov: 11, 'nov.': 11, november: 11,
  dec: 12, 'dec.': 12, december: 12,
  // Roman numerals common on product packaging
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12,
};

const SHORT_MONTH_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

/**
 * Normalizes 2-digit or 4-digit year strings into full 4-digit years (1990 - 2099)
 */
function normalizeYear(rawYear: string | number): number {
  let y = typeof rawYear === 'string' ? parseInt(rawYear.trim(), 10) : rawYear;
  if (isNaN(y)) return 0;
  if (y >= 0 && y <= 99) {
    // 00-69 mapped to 2000-2069, 70-99 mapped to 1970-1999
    return y < 70 ? 2000 + y : 1900 + y;
  }
  return y;
}

/**
 * Parses any date string into structured date components preserving delimiter and format
 */
export function parseDateComponents(dateStr: string): DateParts | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const raw = dateStr.trim();
  if (!raw) return null;

  // Clean raw string for uniform token matching
  const cleanStr = raw.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

  // 1. Textual Month Format (e.g. "26 SEP 25", "26 SEP 2025", "26-SEP-25", "26/SEP/2025", "SEP 2025", "SEP 25", "SEPT 25")
  // Pattern A: Day-Month-Year (e.g., "26 SEP 25", "26-SEP-2025", "26.SEP.2025")
  const dmyTextMatch = cleanStr.match(/^(\d{1,2})[\/\s\-\.]([a-zA-Z]{1,9}\.?|\b(?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\b)[\/\s\-\.](\d{2,4})$/i);
  if (dmyTextMatch) {
    const day = parseInt(dmyTextMatch[1], 10);
    const monthKey = dmyTextMatch[2].toLowerCase();
    const month = MONTH_NAMES[monthKey];
    const year = normalizeYear(dmyTextMatch[3]);

    if (month && year >= 1990 && year <= 2100 && day >= 1 && day <= 31) {
      return { day, month, year, separator: '/', order: 'DMY', isTextualMonth: true, monthText: dmyTextMatch[2], raw };
    }
  }

  // Pattern B: Month-Year Text (e.g., "SEP 2025", "SEP 25", "SEPT-25", "SEPT/2025")
  const myTextMatch = cleanStr.match(/^([a-zA-Z]{1,9}\.?|\b(?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\b)[\/\s\-\.](\d{2,4})$/i);
  if (myTextMatch) {
    const monthKey = myTextMatch[1].toLowerCase();
    const month = MONTH_NAMES[monthKey];
    const year = normalizeYear(myTextMatch[2]);

    if (month && year >= 1990 && year <= 2100) {
      return { month, year, separator: '/', order: 'MY', isTextualMonth: true, monthText: myTextMatch[1], raw };
    }
  }

  // Pattern C: Year-Month-Day Text (e.g., "2025 SEP 26", "2025-SEP-26")
  const ymdTextMatch = cleanStr.match(/^(\d{4})[\/\s\-\.]([a-zA-Z]{1,9}\.?|\b(?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\b)[\/\s\-\.](\d{1,2})$/i);
  if (ymdTextMatch) {
    const year = normalizeYear(ymdTextMatch[1]);
    const monthKey = ymdTextMatch[2].toLowerCase();
    const month = MONTH_NAMES[monthKey];
    const day = parseInt(ymdTextMatch[3], 10);

    if (month && year >= 1990 && year <= 2100 && day >= 1 && day <= 31) {
      return { day, month, year, separator: '/', order: 'YMD', isTextualMonth: true, monthText: ymdTextMatch[2], raw };
    }
  }

  // 2. YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD or YYYY MM DD
  const ymdMatch = cleanStr.match(/^(\d{4})([\/\-\.\s])(\d{1,2})[\/\-\.\s](\d{1,2})$/);
  if (ymdMatch) {
    const year = normalizeYear(ymdMatch[1]);
    const separator = ymdMatch[2] === ' ' ? '/' : ymdMatch[2];
    const month = parseInt(ymdMatch[3], 10);
    const day = parseInt(ymdMatch[4], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1990 && year <= 2100) {
      return { day, month, year, separator, order: 'YMD', raw };
    }
  }

  // 3. YYYY/MM or YYYY-MM or YYYY.MM or YYYY MM
  const ymMatch = cleanStr.match(/^(\d{4})([\/\-\.\s])(\d{1,2})$/);
  if (ymMatch) {
    const year = normalizeYear(ymMatch[1]);
    const separator = ymMatch[2] === ' ' ? '/' : ymMatch[2];
    const month = parseInt(ymMatch[3], 10);
    if (month >= 1 && month <= 12 && year >= 1990 && year <= 2100) {
      return { month, year, separator, order: 'YM', raw };
    }
  }

  // 4. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY or DD MM YYYY or DD/MM/YY
  const dmyMatch = cleanStr.match(/^(\d{1,2})([\/\-\.\s])(\d{1,2})[\/\-\.\s](\d{2,4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const separator = dmyMatch[2] === ' ' ? '/' : dmyMatch[2];
    const month = parseInt(dmyMatch[3], 10);
    const year = normalizeYear(dmyMatch[4]);

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1990 && year <= 2100) {
      return { day, month, year, separator, order: 'DMY', raw };
    }
  }

  // 5. MM/YYYY or MM-YYYY or MM.YYYY or MM YYYY or MM/YY or MM-YY or MM.YY
  const myMatch = cleanStr.match(/^(\d{1,2})([\/\-\.\s])(\d{2,4})$/);
  if (myMatch) {
    const month = parseInt(myMatch[1], 10);
    const separator = myMatch[2] === ' ' ? '/' : myMatch[2];
    const year = normalizeYear(myMatch[3]);

    if (month >= 1 && month <= 12 && year >= 1990 && year <= 2100) {
      return { month, year, separator, order: 'MY', raw };
    }
  }

  return null;
}

/**
 * Adds months to a date and formats it matching the original format style
 */
export function addMonthsToDate(dateStr: string, monthsToAdd: number): string {
  if (!dateStr || !monthsToAdd || isNaN(monthsToAdd) || monthsToAdd <= 0) return '';
  const parsed = parseDateComponents(dateStr);
  if (!parsed) return '';

  const totalMonths = (parsed.year * 12) + (parsed.month - 1) + Math.round(monthsToAdd);
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;

  const pad = (n: number) => String(n).padStart(2, '0');
  const sep = parsed.separator === '-' || parsed.separator === '.' ? parsed.separator : '/';

  if (parsed.order === 'DMY' && parsed.day !== undefined) {
    // Determine max days in target month (e.g. Feb 28/29, Apr 30)
    const maxDays = new Date(newYear, newMonth, 0).getDate();
    const newDay = Math.min(parsed.day, maxDays);
    return `${pad(newDay)}${sep}${pad(newMonth)}${sep}${newYear}`;
  }

  if (parsed.order === 'YMD' && parsed.day !== undefined) {
    const maxDays = new Date(newYear, newMonth, 0).getDate();
    const newDay = Math.min(parsed.day, maxDays);
    return `${newYear}${sep}${pad(newMonth)}${sep}${pad(newDay)}`;
  }

  if (parsed.order === 'YM') {
    return `${newYear}${sep}${pad(newMonth)}`;
  }

  // Default / MY
  return `${pad(newMonth)}${sep}${newYear}`;
}

/**
 * Calculates duration in months between two date strings (MFD and EXP)
 */
export function calculateMonthDifference(mfdStr: string, expStr: string): number | null {
  const mfd = parseDateComponents(mfdStr);
  const exp = parseDateComponents(expStr);
  if (!mfd || !exp) return null;

  let months = (exp.year - mfd.year) * 12 + (exp.month - mfd.month);

  // If both have day precision and exp day is slightly earlier in month
  if (mfd.day !== undefined && exp.day !== undefined) {
    if (exp.day < mfd.day - 15) {
      months -= 1;
    }
  }

  if (months > 0 && months <= 120) {
    return months;
  }
  return null;
}

export interface ReconciledDates {
  manufactureDate: string;
  expiryDate: string;
  bestBeforeMonths: number | null;
  isCalculatedExpiry: boolean;
}

/**
 * Reconciles MFD, EXP and Best Before duration according to strict business logic:
 * - Prefer explicit printed expiry date if available
 * - If MFD + Best Before duration available and EXP missing -> calculate EXP automatically
 * - If MFD + EXP available and Best Before duration missing -> calculate duration in months
 * - Never invent missing information
 */
export function reconcileProductDates(
  mfd: string | null | undefined,
  exp: string | null | undefined,
  bestBeforeMonths: number | null | undefined
): ReconciledDates {
  const cleanMfd = (mfd || '').trim();
  const cleanExp = (exp || '').trim();
  let numBb = typeof bestBeforeMonths === 'number' && !isNaN(bestBeforeMonths) && bestBeforeMonths > 0
    ? Math.round(bestBeforeMonths)
    : null;

  let finalMfd = cleanMfd;
  let finalExp = cleanExp;
  let isCalculated = false;

  // Case 1: Both printed MFD and printed EXP are available
  if (finalMfd && finalExp) {
    // Prefer explicit printed expiry date!
    if (!numBb) {
      // Calculate best before duration if possible
      const calculatedMonths = calculateMonthDifference(finalMfd, finalExp);
      if (calculatedMonths) {
        numBb = calculatedMonths;
      }
    }
    return {
      manufactureDate: finalMfd,
      expiryDate: finalExp,
      bestBeforeMonths: numBb,
      isCalculatedExpiry: false,
    };
  }

  // Case 2: Printed MFD + Best Before months provided, but EXP is missing
  if (finalMfd && numBb && !finalExp) {
    const calculatedExp = addMonthsToDate(finalMfd, numBb);
    if (calculatedExp) {
      finalExp = calculatedExp;
      isCalculated = true;
    }
  }

  return {
    manufactureDate: finalMfd,
    expiryDate: finalExp,
    bestBeforeMonths: numBb,
    isCalculatedExpiry: isCalculated,
  };
}
