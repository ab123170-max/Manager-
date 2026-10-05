/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CameraPermissions } from './CameraPermissions';

export class BrowserCamera {
  private static activeStream: MediaStream | null = null;
  private static activeVideo: HTMLVideoElement | null = null;
  private static activeFacingMode: 'user' | 'environment' = 'environment';
  private static torchState = false;
  private static isTorchSupported = false;

  public static isStreaming(): boolean {
    return Boolean(this.activeStream && this.activeStream.active);
  }

  public static getFacingMode(): 'user' | 'environment' {
    return this.activeFacingMode;
  }

  public static isTorchOn(): boolean {
    return this.torchState;
  }

  public static isTorchAvailable(): boolean {
    return this.isTorchSupported;
  }

  public static getVideoElement(): HTMLVideoElement | null {
    return this.activeVideo;
  }

  /**
   * Starts camera streaming into an HTMLVideoElement.
   */
  public static async start(
    video: HTMLVideoElement,
    facingMode: 'user' | 'environment' = 'environment'
  ): Promise<void> {
    await this.stop();

    const perm = await CameraPermissions.requestPermission();
    if (perm.status !== 'granted') {
      throw new Error(perm.message || 'Camera permission denied.');
    }

    this.activeFacingMode = facingMode;
    this.activeVideo = video;

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920, max: 2560 },
            height: { ideal: 1080, max: 1440 },
          },
          audio: false,
        });
      } catch {
        // Fallback constraint
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
      }

      this.activeStream = stream;

      // Check torch capability
      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          const cap = (track as any).getCapabilities?.();
          this.isTorchSupported = Boolean(cap && 'torch' in cap);
        } catch {
          this.isTorchSupported = false;
        }
      }

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      await video.play().catch((playErr) => {
        console.warn('[BrowserCamera] play() deferred:', playErr);
      });
    } catch (err: any) {
      this.activeStream = null;
      console.error('[BrowserCamera] Start error:', err);
      throw new Error(err?.message || 'Could not access browser camera.');
    }
  }

  /**
   * Stops all active video tracks.
   */
  public static async stop(): Promise<void> {
    if (this.activeStream) {
      this.activeStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      this.activeStream = null;
    }

    if (this.activeVideo) {
      this.activeVideo.srcObject = null;
      this.activeVideo = null;
    }

    this.torchState = false;
    this.isTorchSupported = false;
  }

  /**
   * Flips between rear and front camera.
   */
  public static async flip(video: HTMLVideoElement): Promise<'user' | 'environment'> {
    const nextMode = this.activeFacingMode === 'environment' ? 'user' : 'environment';
    await this.start(video, nextMode);
    return nextMode;
  }

  /**
   * Toggles browser torch if supported by the active track.
   */
  public static async setTorch(on: boolean): Promise<boolean> {
    if (!this.activeStream) return false;
    const track = this.activeStream.getVideoTracks()[0];
    if (!track) return false;

    try {
      await (track as any).applyConstraints({
        advanced: [{ torch: on }],
      });
      this.torchState = on;
      return on;
    } catch (err) {
      console.warn('[BrowserCamera] Torch not supported:', err);
      this.torchState = false;
      return false;
    }
  }

  /**
   * Captures the current video frame as a JPEG Base64 data URL.
   */
  public static capture(quality = 0.85): string {
    if (!this.activeVideo || this.activeVideo.videoWidth === 0) {
      throw new Error('Video frame not available for capture.');
    }

    const video = this.activeVideo;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable.');

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  }
}
