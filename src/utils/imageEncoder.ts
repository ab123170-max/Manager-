/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================================
 * IMAGE CAPTURE & BASE64 ENCODING UTILITIES
 * ============================================================================
 * This module handles:
 * 1. Grabbing video frames from the live HTML MediaDevices camera stream.
 * 2. Drawing frames onto an in-memory HTML5 <canvas> element.
 * 3. Encoding high-resolution snapshots to Base64 (JPEG/PNG format).
 * 4. Converting pre-existing file uploads (via drag & drop or input[type=file])
 *    into standard Base64 data for the multimodal AI model.
 */

/**
 * Captures the current video frame from an HTML5 <video> element and
 * returns it as a Base64-encoded image string.
 *
 * HOW IT WORKS:
 * 1. Validates that the video element is actively playing and has dimensions.
 * 2. Creates an off-screen HTML5 <canvas> matching the video's natural resolution.
 * 3. Uses context.drawImage() to project the live stream buffer onto the canvas.
 * 4. Calls canvas.toDataURL('image/jpeg', quality) to generate a Base64 representation.
 *
 * @param videoEl - The HTMLVideoElement connected to navigator.mediaDevices.getUserMedia
 * @param quality - Compression quality between 0.1 and 1.0 (default 0.92)
 * @returns Base64 Data URL (e.g., 'data:image/jpeg;base64,...')
 */
export function captureFrameFromVideo(
  videoEl: HTMLVideoElement,
  quality: number = 0.88
): string {
  if (!videoEl || videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
    throw new Error('Video stream is not ready or has zero dimensions.');
  }

  // Create an off-screen canvas to render the captured frame
  const canvas = document.createElement('canvas');
  const width = videoEl.videoWidth;
  const height = videoEl.videoHeight;

  // Max dimension clamp to prevent massive payloads while maintaining crisp text OCR
  const MAX_DIM = 1440;
  let targetWidth = width;
  let targetHeight = height;

  if (targetWidth > MAX_DIM || targetHeight > MAX_DIM) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * MAX_DIM) / targetWidth);
      targetWidth = MAX_DIM;
    } else {
      targetWidth = Math.round((targetWidth * MAX_DIM) / targetHeight);
      targetHeight = MAX_DIM;
    }
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not obtain 2D canvas context for capture.');
  }

  // Draw the current video frame onto the canvas
  ctx.drawImage(videoEl, 0, 0, targetWidth, targetHeight);

  // Encode the canvas pixels into a standard Base64 JPEG data URL
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return dataUrl;
}

/**
 * Converts a standard browser File or Blob object to a Base64 data URL.
 * Used for the fallback file upload input.
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
    // If it's already raw base64 without prefix
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
