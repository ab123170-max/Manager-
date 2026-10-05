/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DetectedCode } from '../types';
import { playScanSuccessBeep, triggerScanVibrate } from '../utils/audioFeedback';

const FORMAT_NAMES: Record<string, string> = {
  ean_13: 'EAN-13',
  ean_8: 'EAN-8',
  upc_a: 'UPC-A',
  upc_e: 'UPC-E',
  code_128: 'Code 128',
  code_39: 'Code 39',
  code_93: 'Code 93',
  itf: 'ITF',
  codabar: 'Codabar',
  qr_code: 'QR_CODE',
  data_matrix: 'Data Matrix',
  aztec: 'Aztec',
  pdf417: 'PDF417',
};

/**
 * Universal Barcode & QR Code Engine with ZXing reader, debouncing, and audio/haptic feedback.
 */
export class BarcodeScannerEngine {
  private zxingReader: any = null;
  private zxingModule: any = null;
  private isInitializing = false;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private cooldownMap: Map<string, number> = new Map();
  private cooldownDurationMs = 2500;

  private async getReader() {
    if (this.zxingReader && this.zxingModule) {
      return { reader: this.zxingReader, zxing: this.zxingModule };
    }

    if (this.isInitializing) {
      await new Promise((r) => setTimeout(r, 150));
      if (this.zxingReader) return { reader: this.zxingReader, zxing: this.zxingModule };
    }

    this.isInitializing = true;
    try {
      const zxing = await import('@zxing/library');
      this.zxingModule = zxing;

      const formats = [
        zxing.BarcodeFormat.EAN_13,
        zxing.BarcodeFormat.EAN_8,
        zxing.BarcodeFormat.UPC_A,
        zxing.BarcodeFormat.UPC_E,
        zxing.BarcodeFormat.CODE_128,
        zxing.BarcodeFormat.CODE_39,
        zxing.BarcodeFormat.CODE_93,
        zxing.BarcodeFormat.ITF,
        zxing.BarcodeFormat.CODABAR,
        zxing.BarcodeFormat.QR_CODE,
        zxing.BarcodeFormat.DATA_MATRIX,
        zxing.BarcodeFormat.PDF_417,
      ];

      const hints = new Map();
      hints.set(zxing.DecodeHintType.POSSIBLE_FORMATS, formats);
      hints.set(zxing.DecodeHintType.TRY_HARDER, true);

      this.zxingReader = new zxing.MultiFormatReader();
      this.zxingReader.setHints(hints);

      return { reader: this.zxingReader, zxing };
    } catch (err) {
      console.error('[BarcodeScanner] Failed to initialize ZXing:', err);
      return null;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Decodes barcode from an active HTMLVideoElement.
   */
  public async decodeVideoFrame(video: HTMLVideoElement): Promise<DetectedCode | null> {
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    const zxingSetup = await this.getReader();
    if (!zxingSetup) return null;

    const { reader, zxing } = zxingSetup;

    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
    }

    const targetWidth = Math.min(video.videoWidth, 800);
    const scale = targetWidth / video.videoWidth;
    const targetHeight = Math.round(video.videoHeight * scale);

    if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;
      this.ctx = null;
    }

    if (!this.ctx) {
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }
    if (!this.ctx) return null;

    this.ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    const imageData = this.ctx.getImageData(0, 0, targetWidth, targetHeight);

    return this.decodeImageData(imageData, reader, zxing);
  }

  /**
   * Decodes barcode from an image Data URL (used in Native Android camera frame samples).
   */
  public async decodeDataUrl(dataUrl: string): Promise<DetectedCode | null> {
    if (!dataUrl) return null;

    const zxingSetup = await this.getReader();
    if (!zxingSetup) return null;

    const { reader, zxing } = zxingSetup;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        resolve(this.decodeImageData(imageData, reader, zxing));
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  private decodeImageData(imageData: ImageData, reader: any, zxing: any): DetectedCode | null {
    try {
      const luminanceSource = new zxing.RGBLuminanceSource(
        imageData.data,
        imageData.width,
        imageData.height
      );
      const binaryBitmap = new zxing.BinaryBitmap(new zxing.HybridBinarizer(luminanceSource));
      const result = reader.decode(binaryBitmap);

      if (!result || !result.getText()) return null;

      const rawValue = result.getText().trim();
      const rawFormat = result.getBarcodeFormat() ? String(result.getBarcodeFormat()).toLowerCase() : 'unknown';
      const normalizedFormat = FORMAT_NAMES[rawFormat] || rawFormat.toUpperCase();

      // Check debouncing cooldown
      const now = Date.now();
      const lastScanned = this.cooldownMap.get(rawValue) || 0;
      if (now - lastScanned < this.cooldownDurationMs) {
        return null;
      }
      this.cooldownMap.set(rawValue, now);

      // Trigger audio & haptic feedback
      try {
        playScanSuccessBeep();
        triggerScanVibrate();
      } catch {}

      const isQr = normalizedFormat === 'QR_CODE' || normalizedFormat.toLowerCase().includes('qr');
      const isUrl = /^https?:\/\//i.test(rawValue);
      let isJson = false;
      let parsedJson: Record<string, unknown> | null = null;
      if (rawValue.startsWith('{') && rawValue.endsWith('}')) {
        try {
          parsedJson = JSON.parse(rawValue);
          isJson = true;
        } catch {}
      }

      return {
        type: isQr ? 'qr' : 'barcode',
        format: normalizedFormat,
        value: rawValue,
        raw_value: rawValue,
        confidence: 1.0,
        timestamp: now,
        isUrl,
        isJson,
        parsedJson,
      };
    } catch {
      // Normal when frame has no code
      return null;
    }
  }

  public clearCooldown() {
    this.cooldownMap.clear();
  }
}

export const barcodeScanner = new BarcodeScannerEngine();
