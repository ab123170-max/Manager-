/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.martmartai.inventory',
  appName: 'ScanMe AI',
  webDir: 'dist',

  // Keep the installed APK synchronized with the deployed web application.
  // The APK uses the same Vercel app for its web content, so normal web
  // deployments become available to installed APKs without rebuilding them.
  server: {
    url: 'https://scanme-ai.vercel.app',
    androidScheme: 'https',
    cleartext: false,
  },

  android: {
    allowMixedContent: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1600,
      launchAutoHide: true,
      launchFadeOutDuration: 350,
      backgroundColor: '#092B4C',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
