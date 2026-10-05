/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { NativeCamera } from './NativeCamera';
import { BrowserCamera } from './BrowserCamera';
import { CameraPermissions } from './CameraPermissions';
import { barcodeScanner } from './BarcodeScanner';
import { DetectedCode } from '../types';

export interface CameraManagerConfig {
  preferredFacingMode?: 'rear' | 'front';
  autoStart?: boolean;
  enableScanning?: boolean;
  scanIntervalMs?: number;
  onCodeDetected?: (code: DetectedCode) => void;
}

export interface CameraManagerState {
  isStreaming: boolean;
  hasPermission: boolean | null;
  error: string | null;
  facingMode: 'rear' | 'front';
  isTorchOn: boolean;
  isTorchAvailable: boolean;
  isNative: boolean;
}

/**
 * High-Level React Hook for unified In-App Camera and Live Scanning.
 * Automatically chooses Android Native CameraX on APK, and Browser getUserMedia on Web.
 */
export function useCameraManager(config: CameraManagerConfig = {}) {
  const isNative = Capacitor.isNativePlatform();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanIntervalRef = useRef<any>(null);
  const isScanningRef = useRef(false);
  const onCodeDetectedRef = useRef(config.onCodeDetected);
  onCodeDetectedRef.current = config.onCodeDetected;

  const [state, setState] = useState<CameraManagerState>({
    isStreaming: false,
    hasPermission: null,
    error: null,
    facingMode: config.preferredFacingMode || 'rear',
    isTorchOn: false,
    isTorchAvailable: isNative ? true : false,
    isNative,
  });

  /**
   * Stops the camera and active scanning loop.
   */
  const stopCamera = useCallback(async () => {
    isScanningRef.current = false;
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (isNative) {
      await NativeCamera.stop();
    } else {
      await BrowserCamera.stop();
    }

    setState((prev) => ({
      ...prev,
      isStreaming: false,
      isTorchOn: false,
    }));
  }, [isNative]);

  /**
   * Starts live barcode/QR code scanning loop.
   */
  const startScanningLoop = useCallback(
    (intervalMs = 350) => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      isScanningRef.current = true;

      scanIntervalRef.current = setInterval(async () => {
        if (!isScanningRef.current) return;

        try {
          if (isNative) {
            // Android Native: sample a frame
            const sample = await NativeCamera.captureSample(70);
            if (sample && onCodeDetectedRef.current) {
              const code = await barcodeScanner.decodeDataUrl(sample);
              if (code && onCodeDetectedRef.current) {
                onCodeDetectedRef.current(code);
              }
            }
          } else {
            // Web Browser: sample active video element
            const video = videoRef.current;
            if (video && onCodeDetectedRef.current) {
              const code = await barcodeScanner.decodeVideoFrame(video);
              if (code && onCodeDetectedRef.current) {
                onCodeDetectedRef.current(code);
              }
            }
          }
        } catch {
          // Ignore transient frame decode drops
        }
      }, intervalMs);
    },
    [isNative]
  );

  /**
   * Starts the camera.
   */
  const startCamera = useCallback(
    async (targetFacingMode?: 'rear' | 'front') => {
      setState((prev) => ({ ...prev, error: null }));
      const mode = targetFacingMode || state.facingMode;

      // 1. Verify / Request Camera Permission
      const perm = await CameraPermissions.requestPermission();
      if (perm.status !== 'granted') {
        setState((prev) => ({
          ...prev,
          hasPermission: false,
          isStreaming: false,
          error: perm.message || 'Camera permission is required to scan products.',
        }));
        return;
      }

      try {
        if (isNative) {
          // Android Native in-app live preview
          await NativeCamera.start({ position: mode });
          setState((prev) => ({
            ...prev,
            isStreaming: true,
            hasPermission: true,
            facingMode: mode,
            isTorchOn: false,
            isTorchAvailable: true,
            error: null,
          }));
        } else {
          // Web Browser getUserMedia
          if (!videoRef.current) {
            throw new Error('Video container element is not ready.');
          }
          await BrowserCamera.start(videoRef.current, mode === 'front' ? 'user' : 'environment');
          setState((prev) => ({
            ...prev,
            isStreaming: true,
            hasPermission: true,
            facingMode: mode,
            isTorchOn: false,
            isTorchAvailable: BrowserCamera.isTorchAvailable(),
            error: null,
          }));
        }

        // Start scanning loop if configured
        if (config.enableScanning) {
          startScanningLoop(config.scanIntervalMs || 350);
        }
      } catch (err: any) {
        console.error('[CameraManager] Start failed:', err);
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: err?.message || 'Failed to initialize camera.',
        }));
      }
    },
    [isNative, state.facingMode, config.enableScanning, config.scanIntervalMs, startScanningLoop]
  );

  /**
   * Toggles front/rear camera.
   */
  const toggleFacingMode = useCallback(async () => {
    try {
      if (isNative) {
        const newPos = await NativeCamera.flip();
        setState((prev) => ({ ...prev, facingMode: newPos, isTorchOn: false }));
      } else {
        if (!videoRef.current) return;
        const newMode = await BrowserCamera.flip(videoRef.current);
        setState((prev) => ({
          ...prev,
          facingMode: newMode === 'user' ? 'front' : 'rear',
          isTorchOn: false,
        }));
      }
    } catch (err: any) {
      console.warn('[CameraManager] Flip error:', err);
    }
  }, [isNative]);

  /**
   * Toggles flashlight / torch.
   */
  const toggleTorch = useCallback(async () => {
    const nextTorch = !state.isTorchOn;
    try {
      if (isNative) {
        const success = await NativeCamera.setTorch(nextTorch);
        setState((prev) => ({ ...prev, isTorchOn: success }));
      } else {
        const success = await BrowserCamera.setTorch(nextTorch);
        setState((prev) => ({ ...prev, isTorchOn: success }));
      }
    } catch (err) {
      console.warn('[CameraManager] Torch error:', err);
    }
  }, [isNative, state.isTorchOn]);

  /**
   * Captures a photo frame for AI analysis.
   */
  const capturePhoto = useCallback(
    async (quality = 85): Promise<string> => {
      if (isNative) {
        return await NativeCamera.capture(quality);
      } else {
        return BrowserCamera.capture(quality / 100);
      }
    },
    [isNative]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    state,
    startCamera,
    stopCamera,
    toggleFacingMode,
    toggleTorch,
    capturePhoto,
    startScanningLoop,
    isNative,
  };
}
