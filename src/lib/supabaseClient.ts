/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve environment variables securely without exposing secrets
const env = (import.meta as any).env || {};
const supabaseUrl = (env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || '').trim();

/**
 * Checks whether valid Supabase configuration is present.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseAnonKey.length > 10
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
  if (!supabaseAnonKey || supabaseAnonKey.length <= 10) {
    missing.push('VITE_SUPABASE_ANON_KEY');
  }
  return missing;
}

// Fallback placeholder credentials to prevent createClient crashes if env vars are unset
const fallbackUrl = 'https://placeholder-project.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder-anon-key';

/**
 * Single reusable Supabase client instance used across the entire application.
 * Utilizes the public anon/publishable key with Row Level Security (RLS).
 * Never uses or exposes the service_role key in frontend code.
 */
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? supabaseUrl : fallbackUrl,
  isSupabaseConfigured() ? supabaseAnonKey : fallbackKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  }
);
