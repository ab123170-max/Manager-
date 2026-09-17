/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.martmartai.inventory',
  appName: 'MartMart AI Inventory',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
