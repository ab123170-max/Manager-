/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';

export type CameraPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unavailable';

export interface CameraPermissionResult {
  status: CameraPermissionStatus;
  canRetry: boolean;
  message?: string;
}

/**
 * Manages runtime camera permissions across Android Native and Web Browsers.
 */
export class CameraPermissions {
  /**
   * Checks the current camera permission state without triggering a prompt.
   */
  public static async checkPermission(): Promise<CameraPermissionStatus> {
    if (Capacitor.isNativePlatform()) {
      try {
        if (Capacitor.isPluginAvailable('Camera')) {
          const check = await Camera.checkPermissions();
          if (check.camera === 'granted') return 'granted';
          if (check.camera === 'denied') return 'denied';
          return 'prompt';
        }
      } catch (e) {
        console.warn('[CameraPermissions] Native check error:', e);
      }
      return 'prompt';
    }

    // Web Browser environment
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      try {
        const query = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (query.state === 'granted') return 'granted';
        if (query.state === 'denied') return 'denied';
        return 'prompt';
      } catch {
        // Fall back to prompt
      }
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return 'unavailable';
    }

    return 'prompt';
  }

  /**
   * Requests runtime camera permission from Android OS or browser.
   */
  public static async requestPermission(): Promise<CameraPermissionResult> {
    if (Capacitor.isNativePlatform()) {
      try {
        if (Capacitor.isPluginAvailable('Camera')) {
          const req = await Camera.requestPermissions({ permissions: ['camera'] });
          if (req.camera === 'granted') {
            return { status: 'granted', canRetry: true };
          }
          if (req.camera === 'denied') {
            return {
              status: 'denied',
              canRetry: true,
              message: 'Camera permission is required to scan products and barcodes. Please allow camera access.',
            };
          }
        }
      } catch (err) {
        console.warn('[CameraPermissions] Native request failed:', err);
      }
    }

    // Web browser environment
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        status: 'unavailable',
        canRetry: false,
        message: 'Camera is not supported on this browser or device context. Please use photo upload instead.',
      };
    }

    try {
      // Test-probe getUserMedia to trigger the browser permission prompt if needed
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      return { status: 'granted', canRetry: true };
    } catch (err: any) {
      const isDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.toLowerCase().includes('denied');

      return {
        status: isDenied ? 'denied' : 'unavailable',
        canRetry: true,
        message: isDenied
          ? 'Camera permission is required to scan products. Please allow camera access in your browser or site settings.'
          : 'Camera device unavailable or currently in use by another application.',
      };
    }
  }
}
