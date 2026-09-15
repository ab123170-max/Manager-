/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================================
 * ACCURATE DATE PARSER & NORMALIZER
 * ============================================================================
 * Recognizes common product date formats:
 * - DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
 * - MM/YYYY, MM-YYYY
 * - YYYY-MM-DD
 * - Month text forms: "OCT 2026", "15 OCT 2025", "OCT/2026"
 *
 * CRITICAL DIRECTIVE:
 * - If only month/year is available (e.g., "08/2026"), preserve the original value
 *   and mark the date precision as "month".
 * - DO NOT invent a missing day!
 * - Preserve exact extracted numeric values.
 */

export type DatePrecision = 'day' | 'month' | 'year' | 'unknown';

export interface ParsedDateResult {
  raw: string;
  formatted: string;
  precision: DatePrecision;
  isoDate?: string; // Only populated if day precision is available
  year?: number;
  month?: number;
  day?: number;
  isValid: boolean;
}

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
 * Parses any date string and returns structured metadata with precision level.
 */
export function parseProductDate(rawDateStr: string): ParsedDateResult {
  if (!rawDateStr || typeof rawDateStr !== 'string') {
    return { raw: '', formatted: '', precision: 'unknown', isValid: false };
  }

  const raw = rawDateStr.trim();
  const clean = raw.replace(/[,\s]+/g, ' ').trim();

  // 1. Check ISO Format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2099) {
      const formatted = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return {
        raw,
        formatted,
        precision: 'day',
        isoDate: formatted,
        year: y,
        month: m,
        day: d,
        isValid: true,
      };
    }
  }

  // 2. Check Textual Month (e.g. "15 OCT 2026", "OCT 2026", "15-OCT-2026", "OCT/2026")
  const wordMonthMatch = clean.match(
    /(?:(\d{1,2})[\/\s\-\.])?([a-zA-Z]{3,9})[\/\s\-\.](\d{2,4})/i
  );
  if (wordMonthMatch) {
    const rawDay = wordMonthMatch[1];
    const monthStr = wordMonthMatch[2].toLowerCase();
    let rawYear = wordMonthMatch[3];
    if (rawYear.length === 2) rawYear = `20${rawYear}`;
    const y = parseInt(rawYear, 10);
    const m = MONTH_NAME_MAP[monthStr];

    if (m && y >= 2000 && y <= 2099) {
      if (rawDay) {
        const d = parseInt(rawDay, 10);
        if (d >= 1 && d <= 31) {
          const formatted = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          return {
            raw,
            formatted,
            precision: 'day',
            isoDate: formatted,
            year: y,
            month: m,
            day: d,
            isValid: true,
          };
        }
      }
      // Month-only precision: DO NOT invent a missing day
      const formatted = `${String(m).padStart(2, '0')}/${y}`;
      return {
        raw,
        formatted,
        precision: 'month',
        year: y,
        month: m,
        isValid: true,
      };
    }
  }

  // 3. Check DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    let rawYear = dmyMatch[3];
    if (rawYear.length === 2) rawYear = `20${rawYear}`;
    const y = parseInt(rawYear, 10);

    // Validate day & month
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2000 && y <= 2099) {
      const formatted = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return {
        raw,
        formatted,
        precision: 'day',
        isoDate: formatted,
        year: y,
        month: m,
        day: d,
        isValid: true,
      };
    }
  }

  // 4. Check MM/YYYY or MM-YYYY or MM.YYYY (DO NOT invent a missing day)
  const myMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{2,4})$/);
  if (myMatch) {
    const m = parseInt(myMatch[1], 10);
    let rawYear = myMatch[2];
    if (rawYear.length === 2) rawYear = `20${rawYear}`;
    const y = parseInt(rawYear, 10);

    if (m >= 1 && m <= 12 && y >= 2000 && y <= 2099) {
      const formatted = `${String(m).padStart(2, '0')}/${y}`;
      return {
        raw,
        formatted,
        precision: 'month',
        year: y,
        month: m,
        isValid: true,
      };
    }
  }

  // Fallback: return raw string with unknown precision
  return {
    raw,
    formatted: raw,
    precision: 'unknown',
    isValid: false,
  };
}
