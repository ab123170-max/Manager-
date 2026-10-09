/**
 * Real on-device object detection using TensorFlow.js COCO-SSD.
 * This model detects common physical objects (including bottles, boxes,
 * food, etc.). It does not identify exact product names or read expiry dates;
 * OCR/barcode extraction remains a separate stage.
 */
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export interface RealObjectDetection {
  box: { x: number; y: number; width: number; height: number };
  confidence: number;
  label: string;
}

type Source = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;
let inferenceBusy = false;
let lastInferenceAt = 0;
let cachedDetections: RealObjectDetection[] = [];
let cachedAt = 0;
const MIN_CONFIDENCE = 0.55;
const MIN_INFERENCE_INTERVAL_MS = 180;
const MAX_CACHE_AGE_MS = 250;

// COCO-SSD is a general-object model, not a package detector. Accept only
// common physical product/food containers; people, furniture and background
// objects must never be reported as products by this scanner.
const PRODUCT_CLASSES = new Set([
  'bottle', 'cup', 'bowl', 'wine glass', 'cup', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
]);

async function loadModel(): Promise<cocoSsd.ObjectDetection> {
  if (!modelPromise) {
    modelPromise = (async () => {
      try {
        await tf.setBackend('webgl');
      } catch {
        await tf.setBackend('cpu');
      }
      await tf.ready();
      return cocoSsd.load({ base: 'lite_mobilenet_v2' });
    })().catch((error) => {
      modelPromise = null;
      throw error;
    });
  }
  return modelPromise;
}

/**
 * Returns real model predictions in normalized source coordinates.
 * While a previous inference is running, returns no stale prediction rather
 * than pretending a previous object's location is a fresh detection.
 */
export async function detectRealObjects(source: Source): Promise<RealObjectDetection[]> {
  const now = Date.now();
  if (inferenceBusy || now - lastInferenceAt < MIN_INFERENCE_INTERVAL_MS) {
    // Never keep a stale box following a moving object. Short-lived cache is
    // used only to bridge normal frame cadence; expired results mean no detection.
    return now - cachedAt <= MAX_CACHE_AGE_MS ? cachedDetections : [];
  }
  inferenceBusy = true;
  lastInferenceAt = now;
  try {
    const model = await loadModel();
    const predictions = await model.detect(source, 10, MIN_CONFIDENCE);
    const width = ('videoWidth' in source ? source.videoWidth : 'naturalWidth' in source ? source.naturalWidth : source.width) || 1;
    const height = ('videoHeight' in source ? source.videoHeight : 'naturalHeight' in source ? source.naturalHeight : source.height) || 1;
    cachedDetections = predictions
      .filter((prediction) => PRODUCT_CLASSES.has(prediction.class.toLowerCase()) && prediction.score >= MIN_CONFIDENCE && prediction.bbox[2] > 0 && prediction.bbox[3] > 0)
      .map((prediction) => {
        const [x, y, boxWidth, boxHeight] = prediction.bbox;
        const left = Math.max(0, Math.min(1, x / width));
        const top = Math.max(0, Math.min(1, y / height));
        const right = Math.max(left, Math.min(1, (x + boxWidth) / width));
        const bottom = Math.max(top, Math.min(1, (y + boxHeight) / height));
        return {
          box: { x: left, y: top, width: right - left, height: bottom - top },
          confidence: prediction.score,
          label: prediction.class,
        };
      });
    cachedAt = Date.now();
    return cachedDetections;
  } catch (error) {
    cachedDetections = [];
    cachedAt = 0;
    console.warn('[RealObjectDetector] Model inference failed:', error);
    return [];
  } finally {
    inferenceBusy = false;
  }
}

/** Clear predictions when the camera session closes so old boxes cannot leak into a new scan. */
export function resetRealObjectDetector(): void {
  cachedDetections = [];
  cachedAt = 0;
  lastInferenceAt = 0;
}
