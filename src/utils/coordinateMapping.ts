/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mathematically correct coordinate mapping between camera preview buffers
 * (Web video with object-fit: cover, and Android CameraX PreviewView with FILL_CENTER)
 * and the DOM overlay container.
 */

export interface NormalizedRect {
  x: number; // 0.0 to 1.0 (relative to source frame width)
  y: number; // 0.0 to 1.0 (relative to source frame height)
  width: number; // 0.0 to 1.0
  height: number; // 0.0 to 1.0
}

export interface ViewportRect {
  // Percentage relative to the container (0..100)
  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;

  // Exact pixel values within the container
  leftPx: number;
  topPx: number;
  widthPx: number;
  heightPx: number;

  // True if the box is at least partially visible inside the viewport
  isVisible: boolean;
}

export interface CoordinateMappingParams {
  sourceWidth: number;
  sourceHeight: number;
  containerWidth: number;
  containerHeight: number;
  fitMode?: 'cover' | 'contain';
}

/**
 * Maps a normalized bounding box [0..1] on the source camera frame
 * to the exact rendered pixel coordinates in the overlay DOM element.
 *
 * Handles:
 * - CSS object-fit: cover (and CameraX PreviewView.ScaleType.FILL_CENTER)
 * - Aspect ratio mismatch between sensor (e.g. 16:9 or 4:3) and phone screen (e.g. 9:19.5)
 * - Centered letterboxing or cropping offsets
 * - Strict clamping to container boundaries
 */
export function mapNormalizedRectToViewport(
  rect: NormalizedRect,
  params: CoordinateMappingParams
): ViewportRect {
  const {
    sourceWidth,
    sourceHeight,
    containerWidth,
    containerHeight,
    fitMode = 'cover',
  } = params;

  if (
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    !rect ||
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    return {
      leftPercent: 0,
      topPercent: 0,
      widthPercent: 0,
      heightPercent: 0,
      leftPx: 0,
      topPx: 0,
      widthPx: 0,
      heightPx: 0,
      isVisible: false,
    };
  }

  // Uniform scale factor
  const scale =
    fitMode === 'cover'
      ? Math.max(containerWidth / sourceWidth, containerHeight / sourceHeight)
      : Math.min(containerWidth / sourceWidth, containerHeight / sourceHeight);

  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;

  // Centering offsets (negative if cropped in 'cover', positive if letterboxed in 'contain')
  const offsetX = (containerWidth - renderedWidth) / 2;
  const offsetY = (containerHeight - renderedHeight) / 2;

  // Unclipped pixel coordinates
  const rawPixelX = rect.x * renderedWidth + offsetX;
  const rawPixelY = rect.y * renderedHeight + offsetY;
  const rawPixelW = rect.width * renderedWidth;
  const rawPixelH = rect.height * renderedHeight;

  // Clip to container bounds [0, containerWidth] x [0, containerHeight]
  const clippedLeft = Math.max(0, rawPixelX);
  const clippedTop = Math.max(0, rawPixelY);
  const clippedRight = Math.min(containerWidth, rawPixelX + rawPixelW);
  const clippedBottom = Math.min(containerHeight, rawPixelY + rawPixelH);

  const clippedWidth = Math.max(0, clippedRight - clippedLeft);
  const clippedHeight = Math.max(0, clippedBottom - clippedTop);

  const isVisible = clippedWidth > 4 && clippedHeight > 4;

  const leftPercent = (clippedLeft / containerWidth) * 100;
  const topPercent = (clippedTop / containerHeight) * 100;
  const widthPercent = (clippedWidth / containerWidth) * 100;
  const heightPercent = (clippedHeight / containerHeight) * 100;

  return {
    leftPercent: Math.max(0, Math.min(100, leftPercent)),
    topPercent: Math.max(0, Math.min(100, topPercent)),
    widthPercent: Math.max(0, Math.min(100 - leftPercent, widthPercent)),
    heightPercent: Math.max(0, Math.min(100 - topPercent, heightPercent)),
    leftPx: Math.round(clippedLeft),
    topPx: Math.round(clippedTop),
    widthPx: Math.round(clippedWidth),
    heightPx: Math.round(clippedHeight),
    isVisible,
  };
}
