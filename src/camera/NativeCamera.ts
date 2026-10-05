/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CameraPreview, CameraPreviewOptions } from '@capacitor-community/camera-preview';
import { CameraPermissions } from './CameraPermissions';

export interface NativeCameraStartOptions {
  parent?: string;
  position?: 'rear' | 'front';
  toBack?: boolean;
}

/**
 * Android Native Camera implementation powered by CameraX / CameraPreview.
 * Operates live inside the ScanMe AI app interface with hardware acceleration.
 */
export class NativeCamera {
  private static isRunning = false;
  private static activePosition: 'rear' | 'front' = 'rear';
  private static torchState = false;

  public static isPreviewRunning(): boolean {
    return this.isRunning;
  }

  public static getPosition(): 'rear' | 'front' {
    return this.activePosition;
  }

  public static isTorchOn(): boolean {
    return this.torchState;
  }

  /**
   * Starts the native Android camera preview behind the transparent WebView overlay.
   */
  public static async start(options: NativeCameraStartOptions = {}): Promise<void> {
    if (this.isRunning) {
      await this.stop();
    }

    // 1. Request camera permission
    const perm = await CameraPermissions.requestPermission();
    if (perm.status !== 'granted') {
      throw new Error(perm.message || 'Camera permission is required to scan products.');
    }

    const position = options.position || 'rear';
    this.activePosition = position;

    // 2. Enable WebView background transparency so native camera surface shows through
    this.applyTransparency(true);

    const cameraOptions: CameraPreviewOptions = {
      parent: options.parent || 'camera-preview-viewport',
      position,
      toBack: options.toBack !== false,
      disableAudio: true,
      enableOpacity: true,
      enableZoom: true,
      className: 'native-camera-layer',
    };

    try {
      await CameraPreview.start(cameraOptions);
      this.isRunning = true;
      this.torchState = false;
    } catch (err: any) {
      this.applyTransparency(false);
      this.isRunning = false;
      console.error('[NativeCamera] Failed to start native preview:', err);
      throw new Error(err?.message || 'Failed to initialize native camera preview.');
    }
  }

  /**
   * Stops the native camera and restores standard WebView background.
   */
  public static async stop(): Promise<void> {
    if (!this.isRunning) {
      this.applyTransparency(false);
      return;
    }

    try {
      if (this.torchState) {
        try {
          await CameraPreview.setFlashMode({ flashMode: 'off' });
        } catch {}
        this.torchState = false;
      }
      await CameraPreview.stop();
    } catch (err) {
      console.warn('[NativeCamera] Stop warning:', err);
    } finally {
      this.isRunning = false;
      this.applyTransparency(false);
    }
  }

  /**
   * Switches between rear and front camera.
   */
  public static async flip(): Promise<'rear' | 'front'> {
    if (!this.isRunning) return this.activePosition;

    try {
      await CameraPreview.flip();
      this.activePosition = this.activePosition === 'rear' ? 'front' : 'rear';
      this.torchState = false;
      return this.activePosition;
    } catch (err: any) {
      console.error('[NativeCamera] Flip camera failed:', err);
      throw new Error(err?.message || 'Failed to switch camera.');
    }
  }

  /**
   * Toggles the device flashlight / torch.
   */
  public static async setTorch(on: boolean): Promise<boolean> {
    if (!this.isRunning) return false;

    try {
      await CameraPreview.setFlashMode({ flashMode: on ? 'torch' : 'off' });
      this.torchState = on;
      return on;
    } catch (err) {
      console.warn('[NativeCamera] Torch toggle failed:', err);
      this.torchState = false;
      return false;
    }
  }

  /**
   * Captures a high-resolution frame as a Base64 data URL for Gemini AI analysis.
   */
  public static async capture(quality = 85): Promise<string> {
    if (!this.isRunning) {
      throw new Error('Camera is not active.');
    }

    try {
      const result = await CameraPreview.capture({ quality });
      if (!result || !result.value) {
        throw new Error('No image captured from native camera.');
      }

      const raw = result.value.trim();
      return raw.startsWith('data:') ? raw : `data:image/jpeg;base64,${raw}`;
    } catch (err: any) {
      console.error('[NativeCamera] Capture error:', err);
      throw new Error(err?.message || 'Failed to capture image from camera.');
    }
  }

  /**
   * Captures a lightweight frame sample for fast live barcode / QR decoding.
   */
  public static async captureSample(quality = 70): Promise<string | null> {
    if (!this.isRunning) return null;

    try {
      const result = await CameraPreview.captureSample({ quality });
      if (!result || !result.value) return null;
      const raw = result.value.trim();
      return raw.startsWith('data:') ? raw : `data:image/jpeg;base64,${raw}`;
    } catch {
      return null;
    }
  }

  /**
   * Controls DOM and WebView transparency classes.
   */
  private static applyTransparency(active: boolean) {
    if (typeof document === 'undefined') return;

    const root = document.getElementById('root');
    const appBody = document.body;
    const htmlElem = document.documentElement;

    if (active) {
      appBody.classList.add('camera-preview-active');
      htmlElem.classList.add('camera-preview-active');
      if (root) root.classList.add('camera-preview-active');
    } else {
      appBody.classList.remove('camera-preview-active');
      htmlElem.classList.remove('camera-preview-active');
      if (root) root.classList.remove('camera-preview-active');
    }
  }
}
