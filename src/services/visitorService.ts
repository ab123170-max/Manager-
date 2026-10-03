/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

// Module-level guard to prevent multiple increments during React StrictMode re-renders or component remounts in a single page load.
let initialVisitRecorded = false;
let cachedVisitorCount: number | null = null;
let activeVisitPromise: Promise<number> | null = null;

/**
 * Records a visitor session (increments by 1) on initial app load,
 * and retrieves the total visitor count from Supabase.
 * Subsequent calls within the same page session return the cached count without re-incrementing.
 */
export async function recordVisitAndGetCount(): Promise<number> {
  // If visit already recorded in this JS execution context / page load, return cached or fetched count
  if (initialVisitRecorded && cachedVisitorCount !== null) {
    return cachedVisitorCount;
  }

  // Deduplicate simultaneous async calls
  if (activeVisitPromise) {
    return activeVisitPromise;
  }

  activeVisitPromise = (async () => {
    try {
      if (!isSupabaseConfigured()) {
        cachedVisitorCount = 1;
        initialVisitRecorded = true;
        return 1;
      }

      // 1. Primary Strategy: Call Supabase RPC function if available (atomic increment)
      const { data: rpcData, error: rpcError } = await supabase.rpc('increment_visitor_count');

      if (!rpcError && typeof rpcData === 'number' && rpcData > 0) {
        cachedVisitorCount = rpcData;
        initialVisitRecorded = true;
        return rpcData;
      }

      if (!rpcError && rpcData && typeof rpcData === 'object' && 'count' in rpcData) {
        const count = Number((rpcData as any).count) || 1;
        cachedVisitorCount = count;
        initialVisitRecorded = true;
        return count;
      }

      // 2. Fallback Strategy: Table query & upsert on `app_visitors` table
      const { data: existingRow, error: fetchError } = await supabase
        .from('app_visitors')
        .select('count')
        .eq('id', 'total_visitors')
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.warn('[VisitorService] Fetch error on app_visitors:', fetchError.message);
      }

      const currentCount = existingRow?.count ? Number(existingRow.count) : 0;
      const nextCount = currentCount + 1;

      // Upsert incremented count into `app_visitors`
      const { data: updatedRow, error: upsertError } = await supabase
        .from('app_visitors')
        .upsert(
          {
            id: 'total_visitors',
            count: nextCount,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select('count')
        .single();

      if (!upsertError && updatedRow && updatedRow.count) {
        const finalCount = Number(updatedRow.count) || nextCount;
        cachedVisitorCount = finalCount;
        initialVisitRecorded = true;
        return finalCount;
      }

      // Fallback: If upsert failed (e.g. strict RLS update policy), read current count
      if (currentCount > 0) {
        cachedVisitorCount = currentCount;
        initialVisitRecorded = true;
        return currentCount;
      }

      // Default fallback
      cachedVisitorCount = nextCount > 0 ? nextCount : 1;
      initialVisitRecorded = true;
      return cachedVisitorCount;
    } catch (err) {
      console.warn('[VisitorService] Visitor count error:', err);
      cachedVisitorCount = cachedVisitorCount || 1;
      initialVisitRecorded = true;
      return cachedVisitorCount;
    } finally {
      activeVisitPromise = null;
    }
  })();

  return activeVisitPromise;
}

/**
 * Retrieves the current total visitor count from Supabase without incrementing.
 */
export async function getVisitorCount(): Promise<number> {
  if (cachedVisitorCount !== null) {
    return cachedVisitorCount;
  }

  try {
    if (!isSupabaseConfigured()) {
      return 1;
    }

    const { data, error } = await supabase
      .from('app_visitors')
      .select('count')
      .eq('id', 'total_visitors')
      .maybeSingle();

    if (!error && data?.count) {
      cachedVisitorCount = Number(data.count);
      return cachedVisitorCount;
    }
  } catch (err) {
    console.warn('[VisitorService] Fetch visitor count error:', err);
  }

  return 1;
}
