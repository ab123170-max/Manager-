/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Capacitor } from '@capacitor/core';

/**
 * Production HTTPS API Base URL for ScanMe AI / Scanu backend.
 * Installed Android APKs communicate with this endpoint for server-side Gemini AI analysis.
 */
export const PRODUCTION_API_URL = 'https://scanme-ai.vercel.app';

/**
 * Resolves the full URL for any API endpoint.
 *
 * Guarantees that:
 * 1. An installed Android APK (Capacitor/WebView) NEVER calls localhost, 127.0.0.1, or 10.0.2.2.
 * 2. An installed APK calls the deployed production HTTPS API (https://scanme-ai.vercel.app).
 * 3. Web browsers on the production domain use seamless same-origin or absolute HTTPS.
 * 4. Custom API URLs can be provided via VITE_API_URL or VITE_PUBLIC_API_URL.
 */
export function getApiUrl(endpointPath: string): string {
  const cleanPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;

  // 1. Check explicit build-time or runtime environment variable
  const envApi = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_PUBLIC_API_URL ||
    ''
  ).toString().trim();

  if (envApi) {
    const base = envApi.replace(/\/+$/, '');
    return `${base}${cleanPath}`;
  }

  // 2. Detect if running inside Android APK (Capacitor native or WebView on localhost)
  if (typeof window !== 'undefined') {
    const isNative = Capacitor.isNativePlatform();
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;

    // Inside Android APK or WebView on device, origin is https://localhost, http://localhost,
    // or capacitor://localhost. There is NO server running on the device's localhost!
    const isDeviceLocalOrigin =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '10.0.2.2' ||
      protocol === 'capacitor:' ||
      protocol === 'content:';

    // If native platform or local device WebView (without the dev server port 3000):
    // MUST call the production HTTPS API!
    if (isNative || (isDeviceLocalOrigin && port !== '3000')) {
      return `${PRODUCTION_API_URL}${cleanPath}`;
    }
  }

  // 3. Web production on Vercel or local dev on port 3000
  return cleanPath;
}

/**
 * Formats API and processing errors into clean, user-friendly messages.
 * Prevents exposing internal stack traces, API keys, or raw technical error codes to end users.
 */
export function formatUserFriendlyError(err: unknown): string {
  if (!err) return 'Unable to analyze this image. Please try again.';

  const message = typeof err === 'string' ? err : (err as Error)?.message || '';
  const code = (err as { code?: string })?.code || '';

  if (code === 'NO_IMAGE' || /no images? provided/i.test(message)) {
    return 'No photo selected. Please take or choose a photo of the product.';
  }

  if (code === 'PERMISSION_DENIED' || /camera permission/i.test(message)) {
    return 'Camera permission was denied. Please allow camera access in your device settings, or choose a photo from the gallery.';
  }

  if (code === 'TIMEOUT' || /timed?\s*out|abort/i.test(message)) {
    return 'Analysis timed out. Please check your internet connection and try again.';
  }

  if (/network|failed to fetch|could not reach/i.test(message)) {
    return 'Network unavailable. Please check your internet connection and try again.';
  }

  if (code === 'API_KEY_INVALID' || code === 'API_KEY_MISSING' || /api[_\s-]?key/i.test(message)) {
    return 'AI service configuration issue. Please contact support or verify backend settings.';
  }

  if (code === 'RATE_LIMIT_EXCEEDED' || /rate limit|429|quota/i.test(message)) {
    return 'AI service is currently busy. Please wait a few moments and try again.';
  }

  if (/400|invalid image|bad request|image_processing_failed/i.test(message)) {
    return 'Unable to analyze this image. Please ensure the product label is clearly visible and try again.';
  }

  if (/500|502|503|504|internal_server_error/i.test(message)) {
    return 'AI service temporarily unavailable. Please try again in a few moments.';
  }

  return 'Unable to analyze this image. Please ensure the label is well-lit and try again.';
}
