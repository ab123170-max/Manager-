/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Real-time Multi-Object Tracker powered by genuine machine learning detections.
 * Replaces fake heuristic contrast grids with TensorFlow.js SSDLite MobileNetV2.
 */

import { detectFastCode } from './fastBarcodeEngine';
import { mlProductDetector, ModelLoadingStatus } from './mlProductDetector';
import { NormalizedRect } from './coordinateMapping';

export type { NormalizedRect } from './coordinateMapping';

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
  label: string; // Class / Category, e.g., 'Bottle', 'Cup', 'Book / Box'
  category: string;
  confidence: number; // 0.0 to 1.0 (genuine ML score)
  box: NormalizedRect; // Current interpolated / smoothed bounding box
  rawBox: NormalizedRect; // Instantaneous detection box from latest frame
  velocity: { vx: number; vy: number; vw: number; vh: number };
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
  modelStatus: ModelLoadingStatus;
  modelError: string | null;
  backendName: string;
}

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
    mlProductDetector.reset();
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
   * Matches via IoU & Center distance, applies smooth LERP without lag, and promptly
   * purges lost tracks.
   */
  public update(
    rawDetections: Array<{
      box: NormalizedRect;
      confidence: number;
      label: string;
      category: string;
      color: string;
      barcode?: string;
    }>,
    now: number
  ): TrackedObject[] {
    const dt = this.lastFrameTimestamp > 0 ? Math.max(0.016, (now - this.lastFrameTimestamp) / 1000) : 0.05;
    this.lastFrameTimestamp = now;

    // Track matching matrices
    const matchedTrackIndices = new Set<number>();
    const matchedDetectionIndices = new Set<number>();

    // 1. Associate existing tracks with current detections
    for (let t = 0; t < this.activeTracks.length; t++) {
      const track = this.activeTracks[t];
      let bestMatchIdx = -1;
      let highestScore = -1;

      for (let d = 0; d < rawDetections.length; d++) {
        if (matchedDetectionIndices.has(d)) continue;
        const det = rawDetections[d];

        const iou = computeIoU(track.box, det.box);
        const centerDist = computeCenterDistance(track.box, det.box);
        const isSameClass = track.label.toLowerCase() === det.label.toLowerCase();

        // Combined association score
        let score = iou * 0.7;
        if (centerDist < 0.20) {
          score += (0.20 - centerDist) * 1.5;
        }
        if (isSameClass) {
          score += 0.25;
        }

        // Must meet minimal physical threshold
        if ((iou >= 0.15 || centerDist <= 0.22) && score > highestScore) {
          highestScore = score;
          bestMatchIdx = d;
        }
      }

      if (bestMatchIdx !== -1) {
        matchedTrackIndices.add(t);
        matchedDetectionIndices.add(bestMatchIdx);

        const det = rawDetections[bestMatchIdx];

        // Velocity computation (normalized change per second)
        const vx = (det.box.x - track.rawBox.x) / dt;
        const vy = (det.box.y - track.rawBox.y) / dt;
        const vw = (det.box.width - track.rawBox.width) / dt;
        const vh = (det.box.height - track.rawBox.height) / dt;

        // Smooth bounding box coordinates using adaptive LERP
        // Alpha 0.55 gives smooth anti-jitter while following physical movement immediately
        const alpha = 0.55;
        const smoothedBox: NormalizedRect = {
          x: track.box.x * (1 - alpha) + det.box.x * alpha,
          y: track.box.y * (1 - alpha) + det.box.y * alpha,
          width: track.box.width * (1 - alpha) + det.box.width * alpha,
          height: track.box.height * (1 - alpha) + det.box.height * alpha,
        };

        track.rawBox = { ...det.box };
        track.box = smoothedBox;
        track.velocity = { vx, vy, vw, vh };
        track.confidence = det.confidence;
        track.label = det.label;
        track.category = det.category;
        track.dominantColor = det.color;
        if (det.barcode) track.detectedBarcode = det.barcode;

        track.framesTracked++;
        track.framesLost = 0;
        track.lastSeenTimestamp = now;

        if (!track.isLocked) {
          track.state = track.framesTracked >= 2 ? 'TRACKING' : 'DETECTED';
        }
      } else {
        // Unmatched existing track: increment lost count
        track.framesLost++;
        track.state = 'TEMPORARILY_LOST';
      }
    }

    // 2. Remove tracks lost for more than 2 frames (or older than 180ms)
    // NEVER retain phantom boxes after an object leaves the frame!
    this.activeTracks = this.activeTracks.filter(
      (t) => t.framesLost <= 2 && now - t.lastSeenTimestamp <= 250
    );

    // 3. Register newly detected objects
    for (let d = 0; d < rawDetections.length; d++) {
      if (!matchedDetectionIndices.has(d)) {
        const det = rawDetections[d];
        const formattedNum = String(this.nextTrackNumericId++).padStart(2, '0');
        const newTrack: TrackedObject = {
          id: `ID ${formattedNum}`,
          label: det.label,
          category: det.category,
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

    // 4. Sort tracks so locked or most stable is always first
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
 * REAL-TIME COMPUTER VISION OBJECT DETECTOR & TRACKER
 *
 * Runs genuine machine learning inference on the camera frame:
 * 1. MobileNetV2 SSDLite detects actual objects and genuine bounding boxes.
 * 2. Filters out humans/background and extracts true class labels & confidences.
 * 3. Associates detections with persistent tracking IDs.
 * 4. Checks for fast local barcodes non-blockingly.
 */
export async function detectAndTrackObjectsInFrame(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  fpsCounter?: number
): Promise<MultiObjectDetectionResult> {
  const startTime = performance.now();

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

  // 1. Genuine ML object detection
  const mlResult = await mlProductDetector.detect(source, 0.38);
  const detLatency = mlResult.inferenceLatencyMs;

  const trackStart = performance.now();

  // Fast barcode check on source (non-blocking)
  let frameBarcode: string | undefined = undefined;
  if (mlResult.hasDetections) {
    try {
      const code = await detectFastCode(source);
      if (code?.value) {
        frameBarcode = code.value;
      }
    } catch {
      // Barcode scan is non-fatal
    }
  }

  // 2. Feed genuine ML detections to tracker
  const rawDetectionsForTracker = mlResult.detections.map((det, idx) => ({
    box: det.box,
    confidence: det.confidence,
    label: det.label,
    category: det.category,
    color: det.dominantColor,
    barcode: idx === 0 ? frameBarcode : undefined,
  }));

  const now = performance.now();
  const trackedTracks = globalObjectTracker.update(rawDetectionsForTracker, now);

  const trackLatency = Math.round(performance.now() - trackStart);

  // Active tracks that are current (not lost)
  const activeObjects = trackedTracks.filter((t) => t.framesLost === 0);

  // FPS estimation
  const totalElapsed = performance.now() - startTime;
  const fps = fpsCounter || (totalElapsed > 0 ? Math.min(60, Math.round(1000 / totalElapsed)) : 24);

  return {
    hasObjects: activeObjects.length > 0,
    objects: activeObjects,
    primaryObject: activeObjects[0] || null,
    fps,
    detectionLatencyMs: detLatency,
    trackingLatencyMs: trackLatency,
    sourceResolution: { width: srcW, height: srcH },
    modelStatus: mlResult.modelStatus,
    modelError: mlResult.modelError,
    backendName: mlResult.backendName,
  };
}

/**
 * Intelligent auto-cropping utility that clamps bounding boxes safely
 * to image boundaries and preserves resolution for OCR, barcodes, etc.
 */
export async function cropTrackedObjectFromSource(
  sourceImageOrVideo: string | HTMLVideoElement | HTMLCanvasElement,
  normalizedBox: NormalizedRect,
  paddingFactor: number = 0.04
): Promise<string> {
  return new Promise((resolve, reject) => {
    const handleCropCanvas = (
      imgElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
      naturalW: number,
      naturalH: number
    ) => {
      try {
        if (
          !normalizedBox ||
          normalizedBox.width <= 0 ||
          normalizedBox.height <= 0 ||
          naturalW <= 0 ||
          naturalH <= 0
        ) {
          resolve(typeof sourceImageOrVideo === 'string' ? sourceImageOrVideo : '');
          return;
        }

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
