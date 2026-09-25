/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve public environment variables using standard Vite client-side conventions
// In Vercel deployments, vite.config.ts safely maps SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY into these.
const supabaseUrl = (
  import.meta.env.VITE_SUPABASE_URL ||
  (import.meta.env as any)?.SUPABASE_URL ||
  ''
).trim();

const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  (import.meta.env as any)?.SUPABASE_PUBLISHABLE_KEY ||
  (import.meta.env as any)?.SUPABASE_ANON_KEY ||
  ''
).trim();

/**
 * Checks whether valid Supabase configuration is present.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabasePublishableKey &&
    supabaseUrl.startsWith('https://') &&
    supabasePublishableKey.length > 10
  );
}

/**
 * Returns any missing environment variable names for Supabase configuration.
 */
export function getSupabaseMissingVars(): string[] {
  const missing: string[] = [];
  if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
    missing.push('VITE_SUPABASE_URL');
  }
  if (!supabasePublishableKey || supabasePublishableKey.length <= 10) {
    missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');
  }
  return missing;
}

// Robust startup validation with clear diagnostic output
if (!isSupabaseConfigured()) {
  const missing = getSupabaseMissingVars();
  console.warn(
    `[ScanMe AI] Supabase configuration is missing or incomplete.\n` +
    `Missing required variables: ${missing.join(', ')}.\n` +
    `Note for Vercel: Connect your project to Supabase via Vercel's Supabase Integration (which automatically provides SUPABASE_URL & SUPABASE_PUBLISHABLE_KEY), or define VITE_SUPABASE_URL & VITE_SUPABASE_PUBLISHABLE_KEY in your Project Settings.`
  );
}

// Fallback placeholder credentials to prevent createClient crashes if env vars are unset
const fallbackUrl = 'https://placeholder-project.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder-anon-key';

/**
 * Single reusable Supabase client instance used across the entire application.
 * Utilizes the public publishable key with Row Level Security (RLS).
 * Never uses or exposes the service_role or secret key in frontend code.
 */
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? supabaseUrl : fallbackUrl,
  isSupabaseConfigured() ? supabasePublishableKey : fallbackKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  }
);
