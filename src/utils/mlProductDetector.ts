/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Genuine Machine Learning Object Detection Engine.
 * Powered by TensorFlow.js and MobileNetV2 SSDLite.
 *
 * Strictly NO heuristic contrast boxes or fabricated detections.
 * Surface genuine model presence, class labels, and real confidence scores.
 */

import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { NormalizedRect } from './coordinateMapping';

export type ModelLoadingStatus = 'uninitialized' | 'loading' | 'ready' | 'error';

export interface MLRawDetection {
  label: string;
  category: string;
  isPackagedProductLikely: boolean;
  confidence: number; // 0.0 to 1.0 (genuine model score)
  box: NormalizedRect; // Normalized 0..1 relative to source resolution
  pixelBox: { x: number; y: number; width: number; height: number };
  dominantColor: string;
}

export interface MLInferenceResult {
  hasDetections: boolean;
  detections: MLRawDetection[];
  primaryDetection: MLRawDetection | null;
  inferenceLatencyMs: number;
  sourceResolution: { width: number; height: number };
  modelStatus: ModelLoadingStatus;
  modelError: string | null;
  backendName: string;
}

// Classes in COCO-80 that represent sellable packaged products, groceries, or consumer items
const PRODUCT_CLASS_CATEGORIES: Record<string, { category: string; isProduct: boolean }> = {
  bottle: { category: 'Beverage / Container', isProduct: true },
  can: { category: 'Beverage / Can', isProduct: true },
  cup: { category: 'Beverage / Container', isProduct: true },
  bowl: { category: 'Container / Bowl', isProduct: true },
  'wine glass': { category: 'Beverage / Glass', isProduct: true },
  banana: { category: 'Food / Produce', isProduct: true },
  apple: { category: 'Food / Produce', isProduct: true },
  orange: { category: 'Food / Produce', isProduct: true },
  sandwich: { category: 'Food / Grocery', isProduct: true },
  broccoli: { category: 'Food / Produce', isProduct: true },
  carrot: { category: 'Food / Produce', isProduct: true },
  'hot dog': { category: 'Food / Grocery', isProduct: true },
  pizza: { category: 'Food / Grocery', isProduct: true },
  donut: { category: 'Food / Bakery', isProduct: true },
  cake: { category: 'Food / Bakery', isProduct: true },
  book: { category: 'Book / Box Packaging', isProduct: true },
  'cell phone': { category: 'Electronic / Device', isProduct: true },
  laptop: { category: 'Electronic / Device', isProduct: true },
  mouse: { category: 'Electronic / Accessory', isProduct: true },
  keyboard: { category: 'Electronic / Accessory', isProduct: true },
  remote: { category: 'Electronic / Accessory', isProduct: true },
  clock: { category: 'Household / Appliance', isProduct: true },
  toaster: { category: 'Household / Appliance', isProduct: true },
  suitcase: { category: 'Packaged Goods', isProduct: true },
  handbag: { category: 'Packaged Goods', isProduct: true },
  backpack: { category: 'Packaged Goods', isProduct: true },
  umbrella: { category: 'Consumer Goods', isProduct: true },
  toothbrush: { category: 'Personal Care', isProduct: true },
  'hair drier': { category: 'Personal Care', isProduct: true },
  scissors: { category: 'Stationery / Tool', isProduct: true },
  vase: { category: 'Container / Household', isProduct: true },
  'teddy bear': { category: 'Toy / Consumer Goods', isProduct: true },
};

// Explicit non-product classes to reject (especially humans / persons in frame)
const REJECTED_CLASSES = new Set([
  'person',
  'cat',
  'dog',
  'horse',
  'sheep',
  'cow',
  'elephant',
  'bear',
  'zebra',
  'giraffe',
  'car',
  'truck',
  'bus',
  'train',
  'airplane',
  'traffic light',
  'fire hydrant',
  'stop sign',
  'parking meter',
  'bench',
]);

class MLProductDetectorService {
  private model: cocoSsd.ObjectDetection | null = null;
  private status: ModelLoadingStatus = 'uninitialized';
  private errorMessage: string | null = null;
  private loadingPromise: Promise<cocoSsd.ObjectDetection | null> | null = null;
  private isInferenceInFlight = false;
  private frameToken = 0;
  private backendName = 'webgl';

  // Small scratch canvas for dominant color extraction (reuses memory)
  private colorCanvas: HTMLCanvasElement | null = null;
  private colorCtx: CanvasRenderingContext2D | null = null;

  public getStatus(): ModelLoadingStatus {
    return this.status;
  }

  public getErrorMessage(): string | null {
    return this.errorMessage;
  }

  public getBackendName(): string {
    return this.backendName;
  }

  /**
   * Initializes TensorFlow.js and loads the COCO-SSD SSDLite MobileNetV2 model.
   * Checks local public model weights first, with fallback to remote GCS.
   */
  public async loadModel(): Promise<cocoSsd.ObjectDetection | null> {
    if (this.model) return this.model;
    if (this.loadingPromise) return this.loadingPromise;

    this.status = 'loading';
    this.errorMessage = null;

    this.loadingPromise = (async () => {
      try {
        // Initialize TensorFlow.js backend (prefer WebGL for GPU acceleration on mobile/web)
        try {
          await tf.setBackend('webgl');
          await tf.ready();
          this.backendName = tf.getBackend();
          console.log('[MLDetector] TensorFlow.js initialized with backend:', this.backendName);
        } catch (backendError) {
          console.warn('[MLDetector] WebGL initialization failed, falling back to CPU:', backendError);
          await tf.setBackend('cpu');
          await tf.ready();
          this.backendName = 'cpu';
        }

        // Try loading model from local public bundle first
        let loadedModel: cocoSsd.ObjectDetection | null = null;
        try {
          console.log('[MLDetector] Loading SSDLite MobileNetV2 from local assets (/models/coco-ssd/model.json)...');
          loadedModel = await cocoSsd.load({
            base: 'lite_mobilenet_v2',
            modelUrl: '/models/coco-ssd/model.json',
          });
          console.log('[MLDetector] Model loaded successfully from local assets.');
        } catch (localErr) {
          console.warn('[MLDetector] Local model asset load failed, trying remote GCS fallback...', localErr);
          loadedModel = await cocoSsd.load({
            base: 'lite_mobilenet_v2',
          });
          console.log('[MLDetector] Model loaded successfully from remote GCS fallback.');
        }

        this.model = loadedModel;
        this.status = 'ready';
        this.errorMessage = null;
        return this.model;
      } catch (err: unknown) {
        const error = err as Error;
        console.error('[MLDetector] Fatal model loading error:', error);
        this.status = 'error';
        this.errorMessage = error?.message || 'Failed to load object detection model.';
        this.model = null;
        return null;
      } finally {
        this.loadingPromise = null;
      }
    })();

    return this.loadingPromise;
  }

  /**
   * Runs single-flight genuine ML object detection on a camera frame.
   * If a previous frame is still being processed, drops the frame to prevent jank.
   */
  public async detect(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    confidenceThreshold = 0.38
  ): Promise<MLInferenceResult> {
    const currentToken = ++this.frameToken;
    const start = performance.now();

    // Source dimension inspection
    let srcW = 0;
    let srcH = 0;
    if ('videoWidth' in source && source.videoWidth) {
      srcW = source.videoWidth;
      srcH = source.videoHeight;
    } else if ('naturalWidth' in source && source.naturalWidth) {
      srcW = source.naturalWidth;
      srcH = source.naturalHeight;
    } else if ('width' in source && source.width) {
      srcW = source.width;
      srcH = source.height;
    }

    if (srcW <= 0 || srcH <= 0) {
      return {
        hasDetections: false,
        detections: [],
        primaryDetection: null,
        inferenceLatencyMs: 0,
        sourceResolution: { width: srcW, height: srcH },
        modelStatus: this.status,
        modelError: this.errorMessage,
        backendName: this.backendName,
      };
    }

    if (!this.model) {
      // Trigger lazy load if not started
      if (this.status !== 'loading' && this.status !== 'error') {
        void this.loadModel();
      }
      return {
        hasDetections: false,
        detections: [],
        primaryDetection: null,
        inferenceLatencyMs: 0,
        sourceResolution: { width: srcW, height: srcH },
        modelStatus: this.status,
        modelError: this.errorMessage,
        backendName: this.backendName,
      };
    }

    // Single-flight guard: skip if inference is already executing
    if (this.isInferenceInFlight) {
      return {
        hasDetections: false,
        detections: [],
        primaryDetection: null,
        inferenceLatencyMs: 0,
        sourceResolution: { width: srcW, height: srcH },
        modelStatus: this.status,
        modelError: this.errorMessage,
        backendName: this.backendName,
      };
    }

    this.isInferenceInFlight = true;

    try {
      const predictions = await this.model.detect(source, 6, confidenceThreshold);

      // Check if stale (newer frame requested or reset during inference)
      if (currentToken !== this.frameToken) {
        return {
          hasDetections: false,
          detections: [],
          primaryDetection: null,
          inferenceLatencyMs: Math.round(performance.now() - start),
          sourceResolution: { width: srcW, height: srcH },
          modelStatus: this.status,
          modelError: null,
          backendName: this.backendName,
        };
      }

      const validDetections: MLRawDetection[] = [];

      for (const pred of predictions) {
        const cls = pred.class.toLowerCase().trim();

        // 1. Filter out human/person detections and unwanted animals/vehicles
        if (REJECTED_CLASSES.has(cls)) {
          continue;
        }

        // 2. Minimum confidence threshold check
        const score = typeof pred.score === 'number' ? pred.score : 0;
        if (score < confidenceThreshold) {
          continue;
        }

        // 3. Coordinate bounds validation
        const [pxX, pxY, pxW, pxH] = pred.bbox; // [x, y, width, height] in source pixels
        if (pxW < 12 || pxH < 12 || isNaN(pxX) || isNaN(pxY)) {
          continue;
        }

        // Clamp to source dimensions
        const clampedX = Math.max(0, Math.min(srcW - 1, pxX));
        const clampedY = Math.max(0, Math.min(srcH - 1, pxY));
        const clampedW = Math.max(10, Math.min(srcW - clampedX, pxW));
        const clampedH = Math.max(10, Math.min(srcH - clampedY, pxH));

        // Normalized [0..1]
        const normBox: NormalizedRect = {
          x: clampedX / srcW,
          y: clampedY / srcH,
          width: clampedW / srcW,
          height: clampedH / srcH,
        };

        const meta = PRODUCT_CLASS_CATEGORIES[cls] || {
          category: 'Object / Product',
          isProduct: true,
        };

        // Extract dominant color from detected bounding region
        const dominantColor = this.sampleDominantColor(source, clampedX, clampedY, clampedW, clampedH);

        validDetections.push({
          label: pred.class,
          category: meta.category,
          isPackagedProductLikely: meta.isProduct,
          confidence: Math.round(score * 100) / 100, // True model score (e.g. 0.84)
          box: normBox,
          pixelBox: { x: clampedX, y: clampedY, width: clampedW, height: clampedH },
          dominantColor,
        });
      }

      // Sort by score descending (highest confidence first)
      validDetections.sort((a, b) => b.confidence - a.confidence);

      const elapsed = Math.round(performance.now() - start);

      return {
        hasDetections: validDetections.length > 0,
        detections: validDetections,
        primaryDetection: validDetections[0] || null,
        inferenceLatencyMs: elapsed,
        sourceResolution: { width: srcW, height: srcH },
        modelStatus: this.status,
        modelError: null,
        backendName: this.backendName,
      };
    } catch (err: unknown) {
      const error = err as Error;
      console.warn('[MLDetector] Inference error:', error);
      return {
        hasDetections: false,
        detections: [],
        primaryDetection: null,
        inferenceLatencyMs: Math.round(performance.now() - start),
        sourceResolution: { width: srcW, height: srcH },
        modelStatus: this.status,
        modelError: error?.message || 'Inference failed',
        backendName: this.backendName,
      };
    } finally {
      this.isInferenceInFlight = false;
    }
  }

  /**
   * Reset engine state (clears token to invalidate in-flight async callbacks)
   */
  public reset() {
    this.frameToken++;
    this.isInferenceInFlight = false;
  }

  /**
   * Samples average color of a detected bounding region without significant CPU overhead
   */
  private sampleDominantColor(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    x: number,
    y: number,
    w: number,
    h: number
  ): string {
    try {
      if (typeof document === 'undefined') return '#10b981';
      if (!this.colorCanvas) {
        this.colorCanvas = document.createElement('canvas');
        this.colorCanvas.width = 16;
        this.colorCanvas.height = 16;
        this.colorCtx = this.colorCanvas.getContext('2d', { willReadFrequently: true });
      }
      if (!this.colorCtx) return '#10b981';

      this.colorCtx.drawImage(source, x, y, w, h, 0, 0, 16, 16);
      const imgData = this.colorCtx.getImageData(0, 0, 16, 16);
      const data = imgData.data;

      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      for (let i = 0; i < data.length; i += 16) {
        rSum += data[i];
        gSum += data[i + 1];
        bSum += data[i + 2];
        count++;
      }

      if (count === 0) return '#10b981';
      const r = Math.round(rSum / count);
      const g = Math.round(gSum / count);
      const b = Math.round(bSum / count);
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    } catch {
      return '#10b981';
    }
  }
}

export const mlProductDetector = new MLProductDetectorService();
