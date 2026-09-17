/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DetectedCode } from '../types';

/**
 * ============================================================================
 * HIGH-PERFORMANCE BARCODE & QR CODE DETECTOR ENGINE (ZXing Engine)
 * ============================================================================
 * Fast, reliable barcode and QR code decoding using ZXing multi-format reader.
 *
 * Supported formats:
 * - 1D: EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, Code 93, ITF, Codabar
 * - 2D: QR Code, Data Matrix, Aztec, PDF417
 */

// Format normalization mapping
const FORMAT_NORMALIZATION: Record<string, string> = {
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

class CodeDetectionEngine {
  private zxingReader: any = null;
  private zxingModule: any = null;
  private hints: any = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private isInitializingZxing = false;

  constructor() {}

  /**
   * Lazily loads ZXing library
   */
  private async getZxingReader(): Promise<{ reader: any; zxing: any } | null> {
    if (this.zxingReader && this.zxingModule) {
      return { reader: this.zxingReader, zxing: this.zxingModule };
    }

    if (this.isInitializingZxing) {
      await new Promise((r) => setTimeout(r, 200));
      if (this.zxingReader && this.zxingModule) {
        return { reader: this.zxingReader, zxing: this.zxingModule };
      }
    }

    this.isInitializingZxing = true;
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
      ];
      this.hints = new Map();
      this.hints.set(zxing.DecodeHintType.POSSIBLE_FORMATS, formats);
      this.hints.set(zxing.DecodeHintType.TRY_HARDER, true);

      this.zxingReader = new zxing.MultiFormatReader();
      this.zxingReader.setHints(this.hints);

      return { reader: this.zxingReader, zxing: this.zxingModule };
    } catch (e) {
      console.error('Failed to lazily load ZXing library:', e);
      return null;
    } finally {
      this.isInitializingZxing = false;
    }
  }

  private getCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
    }
    // Resize internal processing canvas (cap to 800px width for fast mobile processing)
    const targetWidth = Math.min(width, 800);
    const scale = targetWidth / width;
    const targetHeight = Math.round(height * scale);

    if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;
      this.ctx = null;
    }
    if (!this.ctx) {
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }
    return { canvas: this.canvas, ctx: this.ctx! };
  }

  /**
   * Detects barcode or QR code from an active HTMLVideoElement frame using ZXing reader.
   */
  public async detectFromVideo(video: HTMLVideoElement): Promise<DetectedCode | null> {
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    const zxingInstance = await this.getZxingReader();
    if (!zxingInstance) return null;

    const { reader, zxing } = zxingInstance;

    try {
      const vWidth = video.videoWidth;
      const vHeight = video.videoHeight;
      const { canvas, ctx } = this.getCanvas(vWidth, vHeight);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const luminanceSource = new zxing.RGBLuminanceSource(
        imageData.data,
        canvas.width,
        canvas.height
      );
      const binaryBitmap = new zxing.BinaryBitmap(new zxing.HybridBinarizer(luminanceSource));

      const result = reader.decodeWithState(binaryBitmap);
      if (result && result.getText()) {
        const rawValue = result.getText().trim();
        const formatLabel = this.mapZxingFormatLabel(result.getBarcodeFormat(), zxing);
        return this.buildDetectedCode(formatLabel, rawValue);
      }
    } catch (e: any) {
      if (e?.name === 'NotFoundException' || e instanceof zxing.NotFoundException) {
        return null;
      }
      return null;
    } finally {
      if (reader) {
        reader.reset();
      }
    }

    return null;
  }

  /**
   * Detects barcode or QR code from an image element or data URL
   */
  public async detectFromImage(imageSource: HTMLImageElement | string): Promise<DetectedCode | null> {
    let imgElement: HTMLImageElement;
    if (typeof imageSource === 'string') {
      imgElement = new Image();
      imgElement.src = imageSource;
      await new Promise<void>((resolve, reject) => {
        imgElement.onload = () => resolve();
        imgElement.onerror = () => reject(new Error('Failed to load image'));
      });
    } else {
      imgElement = imageSource;
    }

    const zxingInstance = await this.getZxingReader();
    if (!zxingInstance) return null;

    const { reader, zxing } = zxingInstance;

    try {
      const { canvas, ctx } = this.getCanvas(imgElement.naturalWidth || imgElement.width, imgElement.naturalHeight || imgElement.height);
      ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const luminanceSource = new zxing.RGBLuminanceSource(
        imageData.data,
        canvas.width,
        canvas.height
      );
      const binaryBitmap = new zxing.BinaryBitmap(new zxing.HybridBinarizer(luminanceSource));

      const result = reader.decodeWithState(binaryBitmap);
      if (result && result.getText()) {
        const rawValue = result.getText().trim();
        const formatLabel = this.mapZxingFormatLabel(result.getBarcodeFormat(), zxing);
        return this.buildDetectedCode(formatLabel, rawValue);
      }
    } catch {
      return null;
    } finally {
      if (reader) {
        reader.reset();
      }
    }

    return null;
  }

  private mapZxingFormatLabel(format: any, zxing: any): string {
    const BarcodeFormat = zxing.BarcodeFormat;
    switch (format) {
      case BarcodeFormat.EAN_13:
        return 'EAN-13';
      case BarcodeFormat.EAN_8:
        return 'EAN-8';
      case BarcodeFormat.UPC_A:
        return 'UPC-A';
      case BarcodeFormat.UPC_E:
        return 'UPC-E';
      case BarcodeFormat.CODE_128:
        return 'Code 128';
      case BarcodeFormat.CODE_39:
        return 'Code 39';
      case BarcodeFormat.CODE_93:
        return 'Code 93';
      case BarcodeFormat.ITF:
        return 'ITF';
      case BarcodeFormat.CODABAR:
        return 'Codabar';
      case BarcodeFormat.QR_CODE:
        return 'QR_CODE';
      case BarcodeFormat.DATA_MATRIX:
        return 'Data Matrix';
      case BarcodeFormat.AZTEC:
        return 'Aztec';
      case BarcodeFormat.PDF_417:
        return 'PDF417';
      default:
        return 'Barcode';
    }
  }

  /**
   * Analyzes raw value to determine if it's a URL, JSON object, or standard alphanumeric code.
   */
  private buildDetectedCode(format: string, rawValue: string): DetectedCode {
    const isQr = format.toUpperCase().includes('QR') || format.toUpperCase().includes('MATRIX');
    let isUrl = false;
    let isJson = false;
    let parsedJson: Record<string, unknown> | null = null;

    // Check URL
    if (/^https?:\/\//i.test(rawValue)) {
      isUrl = true;
    }

    // Check JSON
    if (rawValue.startsWith('{') && rawValue.endsWith('}')) {
      try {
        const parsed = JSON.parse(rawValue);
        if (parsed && typeof parsed === 'object') {
          isJson = true;
          parsedJson = parsed as Record<string, unknown>;
        }
      } catch {
        // Not valid JSON
      }
    }

    return {
      type: isQr ? 'qr' : 'barcode',
      format,
      value: rawValue,
      raw_value: rawValue,
      confidence: 1.0,
      timestamp: Date.now(),
      isUrl,
      isJson,
      parsedJson,
    };
  }
}

export const codeDetector = new CodeDetectionEngine();

/**
 * High-performance frame detector helper
 */
export async function detectCodesInFrame(
  video: HTMLVideoElement,
  mode: 'barcode' | 'qr' | 'all' = 'all'
): Promise<DetectedCode[]> {
  const res = await codeDetector.detectFromVideo(video);
  if (!res) return [];
  if (mode === 'barcode' && res.type !== 'barcode') return [];
  if (mode === 'qr' && res.type !== 'qr') return [];
  return [res];
}

/**
 * Image code detector helper
 */
export async function detectCodesInImage(
  imageSource: HTMLImageElement | string,
  mode: 'barcode' | 'qr' | 'all' = 'all'
): Promise<DetectedCode[]> {
  const res = await codeDetector.detectFromImage(imageSource);
  if (!res) return [];
  if (mode === 'barcode' && res.type !== 'barcode') return [];
  if (mode === 'qr' && res.type !== 'qr') return [];
  return [res];
}

/**
 * Synthesizes an audio beep upon successful code scan
 */
export function playScanBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, ctx.currentTime); // High A6 note
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Silent fallback
  }
}

/**
 * Triggers short haptic buzz vibration
 */
export function triggerHapticFeedback() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(60);
    }
  } catch {
    // Ignore
  }
}
