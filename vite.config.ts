import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load environment variables from .env files and process.env
  // Passing '' loads all variables (including Vercel's SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY)
  const env = loadEnv(mode, process.cwd(), '');

  // Safely extract ONLY the public Supabase URL and Publishable/Anon Key.
  // Supports local VITE_* variables AND Vercel's automated Supabase integration (SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY).
  // CRITICAL: We NEVER expose or map SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY to the browser bundle.
  const supabaseUrl = (
    env.VITE_SUPABASE_URL ||
    env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  ).trim();

  const supabasePublishableKey = (
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  // Populate process.env with VITE_ prefixed keys so Vite's internal import.meta.env handles them naturally
  if (supabaseUrl && !process.env.VITE_SUPABASE_URL) {
    process.env.VITE_SUPABASE_URL = supabaseUrl;
  }
  if (supabasePublishableKey && !process.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = supabasePublishableKey;
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(supabasePublishableKey),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabasePublishableKey),
    },
    build: {
      target: 'es2020',
      minify: 'esbuild' as const,
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('node_modules/@supabase')) {
              return 'vendor-supabase';
            }
          },
        },
      },
    },
    server: {
      // Disable Vite HMR WebSocket by default.
      // This prevents "WebSocket is closed without being open" in
      // AI Studio, mobile previews, reverse proxies, and environments
      // where the HMR WebSocket endpoint is not available.
      // Enable only when a local development workflow explicitly needs it.
      hmr: process.env.ENABLE_HMR === 'true',
      watch: process.env.ENABLE_HMR === 'true' ? {} : null,
    },
  };
});
