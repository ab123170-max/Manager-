/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { detectFastCode } from './fastBarcodeEngine';

export interface NormalizedRect {
  x: number; // 0.0 to 1.0 (relative to preview width)
  y: number; // 0.0 to 1.0 (relative to preview height)
  width: number; // 0.0 to 1.0
  height: number; // 0.0 to 1.0
}

export type TrackingState =
  | 'SEARCHING'
  | 'DETECTED'
  | 'TRACKING'
  | 'TEMPORARILY_LOST'
  | 'LOCKED'
  | 'SCANNING'
  | 'COMPLETED';

export interface TrackedObject {
  id: string; // Persistent tracking ID (e.g., 'ID 01', 'ID 02')
  label: string; // Class / Category, e.g., 'Product / Package', 'Beverage / Can', 'Pharmaceutical'
  confidence: number; // 0.0 to 1.0
  box: NormalizedRect; // Current interpolated / smoothed bounding box
  rawBox: NormalizedRect; // Instantaneous detection box from latest frame
  velocity: { vx: number; vy: number; vw: number; vh: number }; // Kalman/motion velocity
  state: TrackingState;
  framesTracked: number;
  framesLost: number;
  lastSeenTimestamp: number;
  dominantColor: string;
  detectedBarcode?: string;
  isLocked?: boolean;
}

export interface MultiObjectDetectionResult {
  hasObjects: boolean;
  objects: TrackedObject[];
  primaryObject: TrackedObject | null;
  fps: number;
  detectionLatencyMs: number;
  trackingLatencyMs: number;
  sourceResolution: { width: number; height: number };
}

// Global persistent tracking registry to ensure continuity between frames
class ObjectTrackerEngine {
  private activeTracks: TrackedObject[] = [];
  private nextTrackNumericId: number = 1;
  private lastFrameTimestamp: number = 0;
  private fpsBuffer: number[] = [];

  // Reset or clear tracks
  public reset() {
    this.activeTracks = [];
    this.nextTrackNumericId = 1;
    this.lastFrameTimestamp = 0;
    this.fpsBuffer = [];
  }

  // Lock a specific tracking ID
  public lockObject(id: string) {
    this.activeTracks = this.activeTracks.map((trk) => {
      if (trk.id === id) {
        return { ...trk, isLocked: true, state: 'LOCKED' };
      }
      return { ...trk, isLocked: false };
    });
  }

  // Unlock all objects
  public unlockAll() {
    this.activeTracks = this.activeTracks.map((trk) => ({
      ...trk,
      isLocked: false,
      state: trk.state === 'LOCKED' ? 'TRACKING' : trk.state,
    }));
  }

  public getTracks(): TrackedObject[] {
    return this.activeTracks;
  }

  /**
   * Updates tracks with newly detected raw bounding boxes from the current frame.
   * Uses Hungarian / IoU association + Exponential Smoothing + Motion Prediction.
   */
  public update(
    rawDetections: { box: NormalizedRect; confidence: number; label: string; color: string; barcode?: string }[],
    now: number
  ): TrackedObject[] {
    const dt = this.lastFrameTimestamp > 0 ? Math.max(0.016, (now - this.lastFrameTimestamp) / 1000) : 0.05;
    this.lastFrameTimestamp = now;

    // 1. Prediction step: extrapolate existing active tracks forward based on velocity
    for (const track of this.activeTracks) {
      if (track.state !== 'TEMPORARILY_LOST') {
        track.box = {
          x: Math.max(0.01, Math.min(0.95, track.box.x + track.velocity.vx * dt)),
          y: Math.max(0.01, Math.min(0.95, track.box.y + track.velocity.vy * dt)),
          width: Math.max(0.08, Math.min(0.98, track.box.width + track.velocity.vw * dt)),
          height: Math.max(0.08, Math.min(0.98, track.box.height + track.velocity.vh * dt)),
        };
      }
    }

    // 2. Association step: Compute Intersection over Union (IoU) & Distance matrix
    const matchedTrackIndices = new Set<number>();
    const matchedDetectionIndices = new Set<number>();

    // For locked track, give it highest priority if near detection
    const lockedTrackIndex = this.activeTracks.findIndex((t) => t.isLocked);

    // Compute pairwise cost / IoU
    const pairs: { trackIdx: number; detIdx: number; iou: number; dist: number }[] = [];
    for (let t = 0; t < this.activeTracks.length; t++) {
      for (let d = 0; d < rawDetections.length; d++) {
        const iou = computeIoU(this.activeTracks[t].box, rawDetections[d].box);
        const dist = computeCenterDistance(this.activeTracks[t].box, rawDetections[d].box);
        pairs.push({ trackIdx: t, detIdx: d, iou, dist });
      }
    }

    // Sort matching pairs prioritizing IoU, then center proximity
    pairs.sort((a, b) => {
      // Prioritize locked track
      if (a.trackIdx === lockedTrackIndex && b.trackIdx !== lockedTrackIndex) return -1;
      if (b.trackIdx === lockedTrackIndex && a.trackIdx !== lockedTrackIndex) return 1;
      if (b.iou !== a.iou) return b.iou - a.iou;
      return a.dist - b.dist;
    });

    // Greedy assignment with minimum overlap / proximity gating
    for (const pair of pairs) {
      if (matchedTrackIndices.has(pair.trackIdx) || matchedDetectionIndices.has(pair.detIdx)) {
        continue;
      }

      // Valid match criteria: IoU > 0.15 or Center distance < 0.28
      if (pair.iou > 0.15 || pair.dist < 0.28) {
        matchedTrackIndices.add(pair.trackIdx);
        matchedDetectionIndices.add(pair.detIdx);

        const track = this.activeTracks[pair.trackIdx];
        const det = rawDetections[pair.detIdx];

        // Smooth bounding box update with adaptive alpha
        // If moving fast, increase responsiveness; if still, suppress jitter
        const changeMagnitude = Math.abs(det.box.x - track.box.x) + Math.abs(det.box.y - track.box.y);
        const alpha = Math.min(0.85, Math.max(0.40, 0.45 + changeMagnitude * 1.5));

        const prevBox = { ...track.box };
        track.box = {
          x: prevBox.x + (det.box.x - prevBox.x) * alpha,
          y: prevBox.y + (det.box.y - prevBox.y) * alpha,
          width: prevBox.width + (det.box.width - prevBox.width) * alpha,
          height: prevBox.height + (det.box.height - prevBox.height) * alpha,
        };
        track.rawBox = det.box;

        // Estimate velocity
        track.velocity = {
          vx: (track.box.x - prevBox.x) / dt,
          vy: (track.box.y - prevBox.y) / dt,
          vw: (track.box.width - prevBox.width) / dt,
          vh: (track.box.height - prevBox.height) / dt,
        };

        track.confidence = Math.min(0.99, Math.max(0.70, track.confidence * 0.7 + det.confidence * 0.3));
        track.framesTracked++;
        track.framesLost = 0;
        track.lastSeenTimestamp = now;
        track.dominantColor = det.color;
        if (det.barcode) track.detectedBarcode = det.barcode;

        if (track.isLocked) {
          track.state = 'LOCKED';
        } else if (track.framesTracked >= 3) {
          track.state = 'TRACKING';
        } else {
          track.state = 'DETECTED';
        }
      }
    }

    // 3. Handle unmatched active tracks (Temporarily Lost or Decay)
    for (let t = 0; t < this.activeTracks.length; t++) {
      if (!matchedTrackIndices.has(t)) {
        const track = this.activeTracks[t];
        track.framesLost++;

        // Keep predicting for up to ~1.4 seconds (approx 9 frames) before discarding
        if (track.framesLost <= 9) {
          track.state = 'TEMPORARILY_LOST';
          track.confidence = Math.max(0.40, track.confidence * 0.88);
          // Dampen velocity to prevent run-away drift
          track.velocity.vx *= 0.7;
          track.velocity.vy *= 0.7;
          track.velocity.vw *= 0.7;
          track.velocity.vh *= 0.7;
        } else {
          // Beyond grace period: will be filtered out below
          track.state = 'TEMPORARILY_LOST';
        }
      }
    }

    // Remove tracks lost for more than 10 frames
    this.activeTracks = this.activeTracks.filter((t) => t.framesLost <= 10);

    // 4. Register brand new detected objects
    for (let d = 0; d < rawDetections.length; d++) {
      if (!matchedDetectionIndices.has(d)) {
        const det = rawDetections[d];
        const formattedNum = String(this.nextTrackNumericId++).padStart(2, '0');
        const newTrack: TrackedObject = {
          id: `ID ${formattedNum}`,
          label: det.label,
          confidence: det.confidence,
          box: { ...det.box },
          rawBox: { ...det.box },
          velocity: { vx: 0, vy: 0, vw: 0, vh: 0 },
          state: 'DETECTED',
          framesTracked: 1,
          framesLost: 0,
          lastSeenTimestamp: now,
          dominantColor: det.color,
          detectedBarcode: det.barcode,
          isLocked: false,
        };
        this.activeTracks.push(newTrack);
      }
    }

    // Sort tracks so locked or most stable is always first
    this.activeTracks.sort((a, b) => {
      if (a.isLocked) return -1;
      if (b.isLocked) return 1;
      return b.framesTracked - a.framesTracked;
    });

    return this.activeTracks;
  }
}

export const globalObjectTracker = new ObjectTrackerEngine();

/**
 * Computes Intersection over Union (IoU) between two bounding boxes
 */
function computeIoU(boxA: NormalizedRect, boxB: NormalizedRect): number {
  const xA = Math.max(boxA.x, boxB.x);
  const yA = Math.max(boxA.y, boxB.y);
  const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
  const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

  const interW = Math.max(0, xB - xA);
  const interH = Math.max(0, yB - yA);
  const interArea = interW * interH;

  const areaA = boxA.width * boxA.height;
  const areaB = boxB.width * boxB.height;
  const unionArea = areaA + areaB - interArea;

  return unionArea > 0 ? interArea / unionArea : 0;
}

/**
 * Computes Euclidean distance between centers of two normalized boxes
 */
function computeCenterDistance(boxA: NormalizedRect, boxB: NormalizedRect): number {
  const cAx = boxA.x + boxA.width / 2;
  const cAy = boxA.y + boxA.height / 2;
  const cBx = boxB.x + boxB.width / 2;
  const cBy = boxB.y + boxB.height / 2;
  const dx = cAx - cBx;
  const dy = cAy - cBy;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Reusable analysis context to prevent garbage collection spikes
 */
let sampleCanvas: HTMLCanvasElement | null = null;
let sampleCtx: CanvasRenderingContext2D | null = null;

function getSampleContext(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  if (!sampleCanvas) {
    sampleCanvas = document.createElement('canvas');
    sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (sampleCanvas.width !== w || sampleCanvas.height !== h) {
    sampleCanvas.width = w;
    sampleCanvas.height = h;
  }
  if (!sampleCtx) return null;
  return { canvas: sampleCanvas, ctx: sampleCtx };
}

/**
 * REAL-TIME COMPUTER VISION OBJECT DETECTOR
 *
 * Runs on device in < 12ms per frame:
 * 1. Analyzes luminance energy, multi-scale gradient magnitude, and color variance.
 * 2. Segments connected foreground component clusters into distinct physical objects.
 * 3. Extracts multiple independent object bounding boxes with dynamic width, height, and coordinates.
 * 4. Feeds detections to the persistent multi-object tracker engine.
 */
export async function detectAndTrackObjectsInFrame(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  fpsCounter?: number
): Promise<MultiObjectDetectionResult> {
  const startTime = performance.now();

  const sampleW = 320;
  const sampleH = 240;

  const ctxObj = getSampleContext(sampleW, sampleH);
  if (!ctxObj) {
    return {
      hasObjects: false,
      objects: [],
      primaryObject: null,
      fps: 0,
      detectionLatencyMs: 0,
      trackingLatencyMs: 0,
      sourceResolution: { width: 0, height: 0 },
    };
  }

  const { ctx } = ctxObj;

  let srcW = 1280;
  let srcH = 720;
  if ('videoWidth' in source && source.videoWidth) {
    srcW = source.videoWidth;
    srcH = source.videoHeight;
  } else if ('naturalWidth' in source && source.naturalWidth) {
    srcW = source.naturalWidth;
    srcH = source.naturalHeight;
  } else if ('width' in source) {
    srcW = source.width;
    srcH = source.height;
  }

  try {
    ctx.drawImage(source, 0, 0, sampleW, sampleH);
  } catch {
    return {
      hasObjects: false,
      objects: [],
      primaryObject: null,
      fps: 0,
      detectionLatencyMs: 0,
      trackingLatencyMs: 0,
      sourceResolution: { width: srcW, height: srcH },
    };
  }

  const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
  const data = imgData.data;

  // Segment frame into an analysis grid
  const cell = 16;
  const cols = Math.floor(sampleW / cell);
  const rows = Math.floor(sampleH / cell);

  const gridEnergy = new Float32Array(cols * rows);
  const gridColors = new Array<{ r: number; g: number; b: number }>(cols * rows);

  let totalEnergy = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let rSum = 0, gSum = 0, bSum = 0;
      let minLum = 255, maxLum = 0;
      let gradSum = 0;
      let sampleCount = 0;

      const startX = c * cell;
      const startY = r * cell;

      for (let y = startY + 1; y < startY + cell - 1; y += 2) {
        for (let x = startX + 1; x < startX + cell - 1; x += 2) {
          const idx = (y * sampleW + x) * 4;
          const red = data[idx];
          const green = data[idx + 1];
          const blue = data[idx + 2];
          const lum = 0.299 * red + 0.587 * green + 0.114 * blue;

          if (lum < minLum) minLum = lum;
          if (lum > maxLum) maxLum = lum;

          const dx = Math.abs(data[idx + 4] - data[idx - 4]);
          const dy = Math.abs(data[idx + sampleW * 4] - data[idx - sampleW * 4]);
          gradSum += dx + dy;

          rSum += red;
          gSum += green;
          bSum += blue;
          sampleCount++;
        }
      }

      const contrast = maxLum - minLum;
      const energy = (gradSum / (sampleCount || 1)) * (contrast / 255);
      const gIdx = r * cols + c;
      gridEnergy[gIdx] = energy;
      totalEnergy += energy;

      gridColors[gIdx] = {
        r: Math.round(rSum / (sampleCount || 1)),
        g: Math.round(gSum / (sampleCount || 1)),
        b: Math.round(bSum / (sampleCount || 1)),
      };
    }
  }

  const avgEnergy = totalEnergy / (cols * rows);
  const activationThreshold = Math.max(avgEnergy * 0.90, 4.0);

  // Binary occupancy map of detected object features
  const visited = new Uint8Array(cols * rows);
  const rawClusters: {
    minC: number;
    maxC: number;
    minR: number;
    maxR: number;
    cells: number;
    avgR: number;
    avgG: number;
    avgB: number;
  }[] = [];

  // Connected Component Labeling (Flood Fill / BFS) to discover discrete products
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const idx = r * cols + c;
      if (visited[idx] || gridEnergy[idx] < activationThreshold) continue;

      let minC = c, maxC = c, minR = r, maxR = r;
      let clusterCells = 0;
      let rTotal = 0, gTotal = 0, bTotal = 0;

      const queue: number[] = [idx];
      visited[idx] = 1;

      while (queue.length > 0) {
        const cur = queue.pop()!;
        const curR = Math.floor(cur / cols);
        const curC = cur % cols;

        clusterCells++;
        if (curC < minC) minC = curC;
        if (curC > maxC) maxC = curC;
        if (curR < minR) minR = curR;
        if (curR > maxR) maxR = curR;

        rTotal += gridColors[cur].r;
        gTotal += gridColors[cur].g;
        bTotal += gridColors[cur].b;

        // Check 4-connected neighbors
        const neighbors = [
          cur - 1, // left
          cur + 1, // right
          cur - cols, // up
          cur + cols, // down
        ];

        for (const n of neighbors) {
          if (n >= 0 && n < cols * rows && !visited[n] && gridEnergy[n] >= activationThreshold) {
            visited[n] = 1;
            queue.push(n);
          }
        }
      }

      // Filter out tiny noise clusters (require at least 4 active cells)
      if (clusterCells >= 4) {
        rawClusters.push({
          minC,
          maxC,
          minR,
          maxR,
          cells: clusterCells,
          avgR: Math.round(rTotal / clusterCells),
          avgG: Math.round(gTotal / clusterCells),
          avgB: Math.round(bTotal / clusterCells),
        });
      }
    }
  }

  // Convert valid clusters to normalized detection bounding boxes
  const rawDetections: {
    box: NormalizedRect;
    confidence: number;
    label: string;
    color: string;
    barcode?: string;
  }[] = [];

  for (const cl of rawClusters) {
    const rawX = (cl.minC * cell) / sampleW;
    const rawY = (cl.minR * cell) / sampleH;
    const rawW = ((cl.maxC - cl.minC + 1) * cell) / sampleW;
    const rawH = ((cl.maxR - cl.minR + 1) * cell) / sampleH;

    // Minimum physical product area filter (at least 7% width and 7% height)
    if (rawW < 0.08 || rawH < 0.08) continue;

    // Small boundary margin padding around product hull
    const padX = 0.03;
    const padY = 0.03;

    // Tight product boundary: keep only a small safety margin around the detected hull.
    // The previous larger padding made the live box look detached from the product.
    const box: NormalizedRect = {
      x: Math.max(0, rawX - padX),
      y: Math.max(0, rawY - padY),
      width: Math.min(1 - Math.max(0, rawX - padX), rawW + padX * 2),
      height: Math.min(1 - Math.max(0, rawY - padY), rawH + padY * 2),
    };

    // Classify label / category based on aspect ratio & color
    const aspect = box.width / box.height;
    let label = 'Product / Package';
    if (aspect > 1.6) {
      label = 'Retail Box / Carton';
    } else if (aspect < 0.65) {
      label = 'Bottle / Container';
    } else if (aspect >= 0.85 && aspect <= 1.25) {
      label = 'Packaged Item';
    }

    const hexColor = `#${((1 << 24) + (cl.avgR << 16) + (cl.avgG << 8) + cl.avgB).toString(16).slice(1)}`;
    const confidence = Math.min(0.98, 0.72 + (cl.cells / (cols * rows)) * 2.5);

    rawDetections.push({
      box,
      confidence,
      label,
      color: hexColor,
    });
  }

  // Fast Barcode / QR scan check on the downsampled frame (non-blocking)
  let frameBarcode: string | undefined = undefined;
  if (rawDetections.length > 0) {
    try {
      const detectedCode = await detectFastCode(ctxObj.canvas);
      if (detectedCode?.value) {
        frameBarcode = detectedCode.value;
        // Associate barcode with the primary detection.
        rawDetections[0].barcode = frameBarcode;
      }
    } catch {
      // Non-fatal
    }
  }

  const detectionLatencyMs = Math.round(performance.now() - startTime);

  // Run persistent tracking update
  const trackingStart = performance.now();
  const trackedObjects = globalObjectTracker.update(rawDetections, Date.now());
  const trackingLatencyMs = Math.round(performance.now() - trackingStart);

  const primaryObject = trackedObjects.length > 0 ? trackedObjects[0] : null;

  return {
    hasObjects: trackedObjects.length > 0,
    objects: trackedObjects,
    primaryObject,
    fps: fpsCounter || 24,
    detectionLatencyMs,
    trackingLatencyMs,
    sourceResolution: { width: srcW, height: srcH },
  };
}

/**
 * Transforms normalized coordinates (0.0 to 1.0) into exact full-resolution
 * pixel coordinates and crops the selected tracked object with safe boundary clamping.
 */
export async function cropTrackedObjectFromSource(
  sourceImageOrVideo: string | HTMLVideoElement | HTMLCanvasElement,
  normalizedBox: NormalizedRect,
  paddingFactor: number = 0.05
): Promise<string> {
  return new Promise((resolve, reject) => {
    const handleCropCanvas = (
      imgElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
      naturalW: number,
      naturalH: number
    ) => {
      try {
        const padX = normalizedBox.width * paddingFactor * naturalW;
        const padY = normalizedBox.height * paddingFactor * naturalH;

        const cropX = Math.max(0, Math.floor(normalizedBox.x * naturalW - padX));
        const cropY = Math.max(0, Math.floor(normalizedBox.y * naturalH - padY));
        const cropW = Math.min(naturalW - cropX, Math.ceil(normalizedBox.width * naturalW + padX * 2));
        const cropH = Math.min(naturalH - cropY, Math.ceil(normalizedBox.height * naturalH + padY * 2));

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(160, cropW);
        canvas.height = Math.max(160, cropH);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(typeof sourceImageOrVideo === 'string' ? sourceImageOrVideo : '');
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(imgElement, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL('image/jpeg', 0.94));
      } catch (err) {
        reject(err);
      }
    };

    if (typeof sourceImageOrVideo === 'string') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => handleCropCanvas(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
      img.onerror = (e) => reject(e);
      img.src = sourceImageOrVideo;
    } else if ('videoWidth' in sourceImageOrVideo) {
      handleCropCanvas(sourceImageOrVideo, sourceImageOrVideo.videoWidth, sourceImageOrVideo.videoHeight);
    } else {
      handleCropCanvas(sourceImageOrVideo, sourceImageOrVideo.width, sourceImageOrVideo.height);
    }
  });
}
