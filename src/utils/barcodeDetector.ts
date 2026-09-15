/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  MultiFormatReader,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
  DecodeHintType,
  BarcodeFormat,
  NotFoundException,
} from '@zxing/library';
import { DetectedCode } from '../types';

/**
 * ============================================================================
 * HIGH-PERFORMANCE BARCODE & QR CODE DETECTOR ENGINE
 * ============================================================================
 * Prioritizes the ultra-fast native Browser BarcodeDetector API (Android Chrome, Edge),
 * with seamless fallback to ZXing multi-format reader when native API is unavailable.
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

// ZXing BarcodeFormat enum to friendly label
function mapZxingFormat(format: BarcodeFormat): string {
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

// Native BarcodeDetector interface for TypeScript
interface NativeBarcodeDetector {
  detect: (image: ImageBitmapSource) => Promise<
    Array<{
      format: string;
      rawValue: string;
      boundingBox?: DOMRectReadOnly;
      cornerPoints?: Array<{ x: number; y: number }>;
    }>
  >;
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats: string[] }): NativeBarcodeDetector;
      getSupportedFormats: () => Promise<string[]>;
    };
  }
}

class CodeDetectionEngine {
  private nativeDetector: NativeBarcodeDetector | null = null;
  private zxingReader: MultiFormatReader | null = null;
  private hints: Map<DecodeHintType, unknown> = new Map();
  private isNativeSupported = false;
  private supportedNativeFormats: string[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    // 1. Check Native BarcodeDetector API
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window && window.BarcodeDetector) {
      try {
        const supported = await window.BarcodeDetector.getSupportedFormats();
        if (supported && supported.length > 0) {
          this.supportedNativeFormats = supported;
          this.nativeDetector = new window.BarcodeDetector({ formats: supported });
          this.isNativeSupported = true;
          return;
        }
      } catch (e) {
        console.warn('Native BarcodeDetector probe fallback to ZXing:', e);
      }
    }

    // 2. Setup ZXing Fallback MultiFormatReader
    try {
      const formats = [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.ITF,
        BarcodeFormat.CODABAR,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX,
      ];
      this.hints = new Map();
      this.hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
      this.hints.set(DecodeHintType.TRY_HARDER, true);

      this.zxingReader = new MultiFormatReader();
      this.zxingReader.setHints(this.hints);
    } catch (e) {
      console.error('Failed to initialize ZXing fallback:', e);
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
   * Detects barcode or QR code from an active HTMLVideoElement frame.
   */
  public async detectFromVideo(video: HTMLVideoElement): Promise<DetectedCode | null> {
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    // 1. Try Native BarcodeDetector (Chrome Android, Edge, Opera)
    if (this.isNativeSupported && this.nativeDetector) {
      try {
        const barcodes = await this.nativeDetector.detect(video);
        if (barcodes && barcodes.length > 0) {
          const first = barcodes[0];
          const rawValue = first.rawValue?.trim() || '';
          if (rawValue) {
            const normalizedFormat =
              FORMAT_NORMALIZATION[first.format.toLowerCase()] || first.format.toUpperCase();
            return this.buildDetectedCode(normalizedFormat, rawValue);
          }
        }
      } catch {
        // Native detection frame transfer fallback
      }
    }

    // 2. ZXing Fallback using frame buffer
    if (!this.zxingReader) {
      this.zxingReader = new MultiFormatReader();
      this.zxingReader.setHints(this.hints);
    }

    try {
      const vWidth = video.videoWidth;
      const vHeight = video.videoHeight;
      const { canvas, ctx } = this.getCanvas(vWidth, vHeight);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const luminanceSource = new RGBLuminanceSource(
        imageData.data,
        canvas.width,
        canvas.height
      );
      const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));

      const result = this.zxingReader.decodeWithState(binaryBitmap);
      if (result && result.getText()) {
        const rawValue = result.getText().trim();
        const formatLabel = mapZxingFormat(result.getBarcodeFormat());
        return this.buildDetectedCode(formatLabel, rawValue);
      }
    } catch (e) {
      if (e instanceof NotFoundException) {
        return null;
      }
      return null;
    } finally {
      if (this.zxingReader) {
        this.zxingReader.reset();
      }
    }

    return null;
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

