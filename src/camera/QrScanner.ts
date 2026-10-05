/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { barcodeScanner } from './BarcodeScanner';
import { DetectedCode } from '../types';

export class QrScannerEngine {
  /**
   * Decodes QR code from Data URL.
   */
  public async decodeDataUrl(dataUrl: string): Promise<DetectedCode | null> {
    const code = await barcodeScanner.decodeDataUrl(dataUrl);
    if (!code) return null;
    return code;
  }

  public clearCooldown() {
    barcodeScanner.clearCooldown();
  }
}

export const qrScanner = new QrScannerEngine();
