/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================================
 * IMAGE FILE CONVERSION & BASE64 UTILITIES
 * ============================================================================
 * Handles converting uploaded files/blobs to Base64 strings for AI processing.
 */

/**
 * Converts a standard browser File or Blob object to a Base64 data URL.
 *
 * @param file - The File or Blob selected by the user
 * @returns Promise resolving to the Base64 Data URL string
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as base64 string.'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Extracts pure Base64 data and MIME type from a full data URL string.
 * Example: "data:image/png;base64,iVBORw0KG..."
 *   -> { mimeType: "image/png", base64Data: "iVBORw0KG..." }
 */
export function parseDataUrl(dataUrl: string): {
  mimeType: string;
  base64Data: string;
} {
  const match = dataUrl.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
  if (!match) {
    return {
      mimeType: 'image/jpeg',
      base64Data: dataUrl,
    };
  }
  return {
    mimeType: match[1],
    base64Data: match[2],
  };
}
