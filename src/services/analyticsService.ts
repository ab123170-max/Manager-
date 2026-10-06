/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { isNativeApp } from '../utils/platform';

export interface PublicStats {
  downloads: number;
  installs: number;
  activeUsers: number;
  registeredUsers: number;
  productsScanned: number;
  productsAdded: number;
  period?: string;
  timestamp?: string;
}

const ANON_ID_KEY = 'scanme_anon_device_id_v1';
const INSTALL_ID_KEY = 'scanme_native_install_id_v1';
const LAST_INSTALL_SYNC_KEY = 'scanme_last_install_sync_v1';
const LAST_ACTIVITY_TIME_KEY = 'scanme_last_activity_time_v1';

/**
 * Returns a persistent anonymous ID for browser / device download tracking.
 */
export function getAnonymousId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let id = localStorage.getItem(ANON_ID_KEY);
    if (!id || id.length < 10) {
      id = 'anon_' + crypto.randomUUID();
      localStorage.setItem(ANON_ID_KEY, id);
    }
    return id;
  } catch {
    return 'anon_fallback_' + Math.random().toString(36).substring(2, 10);
  }
}

/**
 * Returns the persistent installation ID for native Android APK.
 */
export function getInstallationId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let id = localStorage.getItem(INSTALL_ID_KEY);
    if (!id || id.length < 10) {
      id = 'inst_' + crypto.randomUUID();
      localStorage.setItem(INSTALL_ID_KEY, id);
    }
    return id;
  } catch {
    return 'inst_fallback_' + Math.random().toString(36).substring(2, 10);
  }
}

/**
 * Registers native app installation or updates last_seen on startup.
 */
export async function registerInstallation(userId?: string | null): Promise<void> {
  if (!isNativeApp()) return; // Only native APK registers app installation

  const installation_id = getInstallationId();
  const app_version = '1.0.0';
  const platform = 'android';

  // Prevent redundant installation pings within 5 minutes in same session
  const now = Date.now();
  const lastSync = Number(sessionStorage.getItem(LAST_INSTALL_SYNC_KEY) || 0);
  if (now - lastSync < 5 * 60 * 1000 && !userId) {
    return;
  }
  sessionStorage.setItem(LAST_INSTALL_SYNC_KEY, String(now));

  try {
    // 1. Post to backend server installation endpoint
    await fetch('/api/analytics/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        installation_id,
        user_id: userId || null,
        app_version,
        platform,
      }),
    }).catch(() => {});

    // 2. Direct Supabase sync if client is available
    if (isSupabaseConfigured()) {
      const { data: existing } = await supabase
        .from('app_installations')
        .select('id')
        .eq('installation_id', installation_id)
        .maybeSingle();

      const isoNow = new Date().toISOString();

      if (existing) {
        await supabase
          .from('app_installations')
          .update({
            last_seen: isoNow,
            ...(userId ? { user_id: userId } : {}),
          })
          .eq('installation_id', installation_id);
      } else {
        await supabase.from('app_installations').insert([
          {
            installation_id,
            user_id: userId || null,
            app_version,
            platform,
            first_seen: isoNow,
            last_seen: isoNow,
          },
        ]);
      }
    }
  } catch (error) {
    console.warn('[Analytics] registerInstallation notice:', error);
  }
}

/**
 * Records a download button click event.
 */
export async function trackDownloadClick(): Promise<void> {
  const anonId = getAnonymousId();
  try {
    await fetch('/api/analytics?action=download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anonymous_id: anonId,
        platform: 'android',
        app_version: '1.0.0',
      }),
    }).catch(() => {});

    if (isSupabaseConfigured()) {
      await supabase.from('app_downloads').insert([
        {
          anonymous_id: anonId,
          platform: 'android',
          app_version: '1.0.0',
        },
      ]);
    }
  } catch (error) {
    console.warn('[Analytics] trackDownloadClick notice:', error);
  }
}

/**
 * Tracks general user activity safely.
 */
export async function trackUserActivity(
  activityType: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    const installId = isNativeApp() ? getInstallationId() : null;
    let userId: string | null = null;

    if (isSupabaseConfigured()) {
      const { data } = await supabase.auth.getSession();
      userId = data.session?.user?.id || null;
    }

    // Debounce activity pings within 10 seconds for same type
    const dedupeKey = `${activityType}_${userId || installId || 'anon'}`;
    const now = Date.now();
    const lastTime = Number(sessionStorage.getItem(LAST_ACTIVITY_TIME_KEY + dedupeKey) || 0);
    if (now - lastTime < 10_000) return;
    sessionStorage.setItem(LAST_ACTIVITY_TIME_KEY + dedupeKey, String(now));

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: activityType,
        user_id: userId,
        installation_id: installId,
        app_version: '1.0.0',
        platform: isNativeApp() ? 'android' : 'web',
        metadata,
      }),
    }).catch(() => {});

    if (isSupabaseConfigured()) {
      await supabase.from('analytics_events').insert([
        {
          event_name: activityType,
          user_id: userId,
          installation_id: installId,
          app_version: '1.0.0',
          platform: isNativeApp() ? 'android' : 'web',
          metadata,
        },
      ]);
    }
  } catch (error) {
    console.warn('[Analytics] trackUserActivity notice:', error);
  }
}

/**
 * Tracks successful product scan event.
 */
export function trackProductScanned(details: Record<string, any> = {}): void {
  void trackUserActivity('product_scanned', details);
}

/**
 * Tracks successful product saved event.
 */
export function trackProductSaved(details: Record<string, any> = {}): void {
  void trackUserActivity('product_saved', details);
}

/**
 * Fetches real platform statistics from `/api/stats`.
 */
export async function fetchPublicStats(): Promise<PublicStats | null> {
  try {
    const res = await fetch('/api/stats', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Stats endpoint returned status ${res.status}`);
    }

    const data = await res.json();
    return {
      downloads: Number(data.downloads) || 0,
      installs: Number(data.installs) || 0,
      activeUsers: Number(data.activeUsers) || 0,
      registeredUsers: Number(data.registeredUsers) || 0,
      productsScanned: Number(data.productsScanned) || 0,
      productsAdded: Number(data.productsAdded) || 0,
      period: data.period || '30_days',
      timestamp: data.timestamp,
    };
  } catch (err) {
    console.warn('[Analytics] fetchPublicStats failed:', err);
    return null;
  }
}
