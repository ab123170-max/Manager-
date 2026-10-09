/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  X,
  RotateCcw,
  Zap,
  ZapOff,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Loader2,
  Check,
  Sparkles,
  Crosshair,
  Timer,
  Play,
  Pause,
} from 'lucide-react';
import {
  isScanMeCameraNative,
  openScanMeCamera,
  closeScanMeCamera,
  captureScanMePhoto,
  getScanMePreviewFrame,
  switchScanMeCamera,
  setScanMeFlashMode,
  getCameraPermissionStatus,
  requestCameraPermission,
  openCameraAppSettings,
} from '../../plugins/scanmeCamera';
import { ScanSession, ScanShot } from '../../types';
import {
  playProductDetectedTone,
  playCameraShutterBeep,
  triggerScanVibrate,
} from '../../utils/audioFeedback';
import {
  analyzeLiveFrame,
  RealtimeDetectionResult,
  NormalizedRect,
} from '../../utils/realtimeProductDetector';
import {
  TrackedProduct,
  createNewTrackedProduct,
  updateProductTracking,
  addShotToTrackedProduct,
  removeLastShotFromTrackedProduct,
  getMissingFieldGuidance,
  ActiveTargetField,
  getActiveTargetField,
} from '../../utils/productTracker';
import {
  detectAndTrackObjectsInFrame,
  cropTrackedObjectFromSource,
  TrackedObject,
  globalObjectTracker,
} from '../../utils/realtimeVisionTracker';
import {
  progressiveExtractionService,
  SessionExtractionState,
} from '../../services/progressiveExtractionService';
import { DetectionOverlay } from './DetectionOverlay';

export type CameraModalMode =
  | 'initializing'
  | 'permission_explanation'
  | 'permission_denied'
  | 'permission_permanently_denied'
  | 'live_camera';

interface ScanMeCameraModalProps {
  isOpen: boolean;
  onFinishAndExtract: (shots: string[], session?: ScanSession) => void;
  onShotCaptured?: (image: string, index: number) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  initialShots?: string[];
  maxShots?: number;
}

export const ScanMeCameraModal: React.FC<ScanMeCameraModalProps> = ({
  isOpen,
  onFinishAndExtract,
  onShotCaptured,
  onClose,
  title = 'Live Product Scanner',
  subtitle = 'Detects, tracks, and extracts product data in real-time',
  initialShots = [],
  maxShots = 5,
}) => {
  const [mode, setMode] = useState<CameraModalMode>('initializing');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [justCapturedToast, setJustCapturedToast] = useState<string | null>(null);
  const [isFlashEffect, setIsFlashEffect] = useState(false);

  // Auto-capture settings
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
  const [stableCountdownProgress, setStableCountdownProgress] = useState(0); // 0 to 100%

  // Multi-Shot Session State
  const [scanSession, setScanSession] = useState<ScanSession>(() => ({
    id: `scan-${Date.now()}`,
    shots: initialShots.map((img, i) => ({
      id: `shot-${i + 1}`,
      image: img,
      timestamp: Date.now(),
      label: `Shot ${i + 1}`,
    })),
    detectedProduct: null,
    extractedData: {},
    status: 'capturing',
  }));

  // Progressive Background AI Extraction State
  const [extractionState, setExtractionState] = useState<SessionExtractionState>(() =>
    progressiveExtractionService.getOrCreateSession(scanSession.id)
  );
  const [isFinishing, setIsFinishing] = useState(false);

  // Subscribe to background extraction updates and dynamically synchronize field completions
  useEffect(() => {
    const unsub = progressiveExtractionService.subscribe(scanSession.id, (state) => {
      setExtractionState(state);

      if (state.mergedResult) {
        setTrackedProduct((prev) => {
          const res = state.mergedResult!;
          const f = { ...prev.fields };
          let changed = false;

          if (res.productName && f.productName.status !== 'complete') {
            f.productName = {
              value: res.productName,
              status: 'complete',
              confidence: res.confidence?.productName ?? 0.95,
            };
            changed = true;
          }
          if (res.brand && f.brand.status !== 'complete') {
            f.brand = {
              value: res.brand,
              status: 'complete',
              confidence: 0.95,
            };
            changed = true;
          }
          if (res.price !== null && f.price.status !== 'complete') {
            f.price = {
              value: res.price,
              status: 'complete',
              confidence: res.confidence?.price ?? 0.90,
            };
            changed = true;
          }
          if (res.manufactureDate && f.manufactureDate.status !== 'complete') {
            f.manufactureDate = {
              value: res.manufactureDate,
              status: 'complete',
              confidence: res.confidence?.manufactureDate ?? 0.95,
            };
            changed = true;
          }
          if (res.expiryDate && f.expiryDate.status !== 'complete') {
            f.expiryDate = {
              value: res.expiryDate,
              status: 'complete',
              confidence: res.confidence?.expiryDate ?? 0.95,
            };
            changed = true;
          }
          if (res.barcode && f.barcode.status !== 'complete') {
            f.barcode = {
              value: res.barcode,
              status: 'complete',
              confidence: 0.99,
            };
            changed = true;
          }

          return changed ? { ...prev, fields: f } : prev;
        });
      }
    });

    return unsub;
  }, [scanSession.id]);

  // Tracked Product State across continuous angles
  const [trackedProduct, setTrackedProduct] = useState<TrackedProduct>(() => createNewTrackedProduct());

  // Real-time Multi-Object Tracking State
  const [visionObjects, setVisionObjects] = useState<TrackedObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [debugMetrics, setDebugMetrics] = useState({
    fps: 24,
    detLatency: 8,
    trackLatency: 2,
    resolution: { width: 1280, height: 720 },
  });

  // Real-time Frame Detection Output
  const [detection, setDetection] = useState<RealtimeDetectionResult>({
    hasProduct: false,
    isStable: false,
    stabilityScore: 0,
    productBox: null,
    regions: [],
    guidanceText: 'Searching for product...',
    trackingState: 'searching',
    dominantColor: '#10b981',
  });

  // Camera hardware controls
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flashMode, setFlashMode] = useState<'auto' | 'on' | 'off' | 'torch'>('auto');

  // Web fallback & analysis references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isAnalyzingRef = useRef<boolean>(false);
  const prevDetectionRef = useRef<RealtimeDetectionResult | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const analysisLoopRunningRef = useRef(false);

  // Auto-capture countdown refs
  const stableSinceRef = useRef<number | null>(null);
  const cooldownUntilRef = useRef<number>(0);
  const hasPlayedInitialDetectionSoundRef = useRef<boolean>(false);

  const isNative = isScanMeCameraNative();

  /**
   * Stops live camera stream & restores DOM background
   */
  const stopLiveCamera = useCallback(async () => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }

    document.documentElement.classList.remove('camera-preview-active');
    document.body.classList.remove('camera-preview-active');

    if (isNative) {
      try {
        await closeScanMeCamera();
      } catch (err) {
        console.warn('[ScanMeCameraModal] close native camera error:', err);
      }
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [isNative]);

  /**
   * CONTINUOUS MULTI-SHOT CAPTURE FLOW WITH SMART AUTO-CROP
   */
  const handleCaptureShot = useCallback(async (currentProductBox?: NormalizedRect | null) => {
    if (isCapturing) return;
    if (scanSession.shots.length >= maxShots) {
      return;
    }

    setIsCapturing(true);
    cooldownUntilRef.current = Date.now() + 2400; // 2.4s cooldown to allow re-framing for next angle
    setStableCountdownProgress(0);
    stableSinceRef.current = null;

    try {
      let photoDataUrl = '';

      if (isNative) {
        const result = await captureScanMePhoto();
        if (result && result.dataUrl) {
          photoDataUrl = result.dataUrl;
        } else {
          throw new Error('No photo data returned from native camera');
        }
      } else {
        // Web canvas capture
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth || 1280;
          canvas.height = video.videoHeight || 720;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            photoDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          }
        }
      }

      if (photoDataUrl) {
        const nextShotNum = scanSession.shots.length + 1;
        const newShot: ScanShot = {
          id: `shot-${nextShotNum}`,
          image: photoDataUrl,
          timestamp: Date.now(),
          label: `Shot ${nextShotNum}`,
        };

        // Add to temporary scan session
        setScanSession((prev) => ({
          ...prev,
          shots: [...prev.shots, newShot],
        }));

        // Dispatch immediately; extraction runs independently of camera capture.
        // Never await network/AI work from the live camera loop.
        try { onShotCaptured?.(photoDataUrl, nextShotNum - 1); } catch (dispatchError) {
          console.warn('[ProgressiveExtraction] Shot dispatch failed:', dispatchError);
        }

        const activeTarget = getActiveTargetField(trackedProduct);
        let fieldKey = '';
        if (activeTarget.name === 'Label') fieldKey = 'productName';
        else if (activeTarget.name === 'MFD') fieldKey = 'manufactureDate';
        else if (activeTarget.name === 'EXP') fieldKey = 'expiryDate';
        else if (activeTarget.name === 'Price') fieldKey = 'price';
        else if (activeTarget.name === 'Barcode') fieldKey = 'barcode';

        // Associate shot & extract targeted regions into tracked product
        const updatedTracked = await addShotToTrackedProduct(
          trackedProduct,
          photoDataUrl,
          detection.regions,
          currentProductBox || detection.productBox,
          fieldKey
        );
        setTrackedProduct(updatedTracked);

        // Start background AI extraction immediately for this shot without blocking user or camera
        const lastShotRecord = updatedTracked.shots[updatedTracked.shots.length - 1];
        const croppedImg = lastShotRecord?.croppedProductImage || photoDataUrl;

        progressiveExtractionService.enqueueShot({
          sessionId: scanSession.id,
          shotId: newShot.id,
          shotNumber: nextShotNum,
          rawImage: photoDataUrl,
          croppedImage: croppedImg,
          detectedBarcode: detection.detectedBarcode,
          targetFieldHint: fieldKey,
        });

        // Sound & visual shutter feedback
        playCameraShutterBeep();
        setIsFlashEffect(true);
        setTimeout(() => setIsFlashEffect(false), 140);

        // Dynamic guidance feedback based on remaining missing fields
        const missingHint = getMissingFieldGuidance(updatedTracked);
        setJustCapturedToast(`Shot ${nextShotNum} captured ✓ ${missingHint}`);
        setTimeout(() => setJustCapturedToast(null), 2500);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('[ScanMeCameraModal] Capture error:', error);
      alert(`Photo capture failed: ${error.message || 'Please try again.'}`);
    } finally {
      setIsCapturing(false);
    }
  }, [detection.productBox, detection.regions, isCapturing, isNative, maxShots, scanSession.shots.length, trackedProduct]);

  /**
   * Starts real-time lightweight frame analysis loop (~6-8 fps, < 6ms per frame)
   */
  const startRealtimeAnalysisLoop = useCallback(() => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
    }

    const runFrame = async () => {
      if (analysisLoopRunningRef.current || mode !== 'live_camera') return;
      analysisLoopRunningRef.current = true;
      isAnalyzingRef.current = true;

      try {
        let frameSource: HTMLVideoElement | HTMLImageElement | null = null;

        if (isNative) {
          // In native Android APK, fetch lightweight preview bitmap snapshot
          const frameRes = await getScanMePreviewFrame();
          if (frameRes && frameRes.dataUrl) {
            const img = new Image();
            img.src = frameRes.dataUrl;
            await new Promise((r) => {
              img.onload = r;
              img.onerror = r;
            });
            frameSource = img;
          }
        } else {
          // On Web browser preview, analyze directly from video stream
          if (videoRef.current && videoRef.current.readyState >= 2) {
            frameSource = videoRef.current;
          }
        }

        if (frameSource) {
          // 1. Run real-time computer vision multi-object detection and tracking
          const visionRes = await detectAndTrackObjectsInFrame(frameSource);
          setVisionObjects(visionRes.objects);
          setDebugMetrics({
            fps: visionRes.fps,
            detLatency: visionRes.detectionLatencyMs,
            trackLatency: visionRes.trackingLatencyMs,
            resolution: visionRes.sourceResolution,
          });

          // 2. Run detailed region & barcode extraction
          const res = await analyzeLiveFrame(frameSource, prevDetectionRef.current);
          prevDetectionRef.current = res;

          // The TensorFlow.js COCO-SSD model is the source of truth for object presence.
          // Do not let the separate edge/contrast heuristic mark a background as a product.
          const modelObject = visionRes.primaryObject &&
            visionRes.primaryObject.state !== 'TEMPORARILY_LOST' &&
            visionRes.primaryObject.confidence >= 0.55
              ? visionRes.primaryObject
              : null;

          if (modelObject) {
            res.productBox = modelObject.box;
            res.hasProduct = true;
            if (modelObject.detectedBarcode) {
              res.detectedBarcode = modelObject.detectedBarcode;
            }
          } else {
            res.productBox = null;
            res.hasProduct = false;
            res.isStable = false;
          }

          setDetection(res);

          // Update tracked product identity
          setTrackedProduct((prev) =>
            updateProductTracking(prev, res.productBox, res.isStable, res.dominantColor, res.detectedBarcode)
          );

          // Audio feedback: play gentle chime once when product is first detected
          if (res.hasProduct && !hasPlayedInitialDetectionSoundRef.current) {
            hasPlayedInitialDetectionSoundRef.current = true;
            playProductDetectedTone();
          } else if (!res.hasProduct) {
            hasPlayedInitialDetectionSoundRef.current = false;
          }

          // Auto-capture countdown logic
          const now = Date.now();
          if (
            autoCaptureEnabled &&
            res.hasProduct &&
            res.isStable &&
            res.productBox &&
            now >= cooldownUntilRef.current &&
            !isCapturing &&
            scanSession.shots.length < maxShots
          ) {
            if (!stableSinceRef.current) {
              stableSinceRef.current = now;
              setStableCountdownProgress(10);
            } else {
              const elapsed = now - stableSinceRef.current;
              const requiredDuration = 1000; // 1.0 second of holding steady
              const progress = Math.min(100, Math.round((elapsed / requiredDuration) * 100));
              setStableCountdownProgress(progress);

              if (elapsed >= requiredDuration) {
                // Trigger auto capture!
                stableSinceRef.current = null;
                setStableCountdownProgress(100);
                await handleCaptureShot(res.productBox);
              }
            }
          } else {
            stableSinceRef.current = null;
            setStableCountdownProgress(0);
          }
        }
      } catch (err) {
        console.debug('[RealtimeAnalysis] Frame skipped:', err);
      } finally {
        isAnalyzingRef.current = false;
        analysisLoopRunningRef.current = false;
      }
    };

    // Adaptive cadence: schedule the next frame only after the previous one
    // finishes, preventing overlapping analysis and queue buildup on slower phones.
    const scheduleNext = () => {
      if (mode !== 'live_camera') return;
      const delay = isNative ? 110 : 90;
      analysisIntervalRef.current = setTimeout(async () => {
        await runFrame();
        scheduleNext();
      }, delay) as unknown as NodeJS.Timeout;
    };

    void runFrame();
    scheduleNext(); // adaptive ~7-10 FPS, never overlapping work
  }, [autoCaptureEnabled, handleCaptureShot, isCapturing, isNative, maxShots, mode, scanSession.shots.length]);

  /**
   * Starts the live camera view inside the app
   */
  const startLiveCamera = useCallback(async () => {
    setMode('live_camera');

    if (isNative) {
      try {
        document.documentElement.classList.add('camera-preview-active');
        document.body.classList.add('camera-preview-active');
        await openScanMeCamera({ facingMode, toBack: true });
        console.log('[ScanMeCameraModal] Native CameraX preview opened');
        
        // 550ms stabilization delay to allow camera auto-focus, exposure, and hardware binding
        // to complete before starting CPU-intensive real-time frame analysis
        setTimeout(() => {
          console.info('TIMING: [analysis_started]');
          startRealtimeAnalysisLoop();
        }, 550);
      } catch (err) {
        console.error('[ScanMeCameraModal] Failed to open native CameraX:', err);
        document.documentElement.classList.remove('camera-preview-active');
        document.body.classList.remove('camera-preview-active');
        alert('Could not start camera preview. Please check camera permissions.');
        onClose();
      }
    } else {
      // Web browser preview fallback
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        
        // Match stabilization delay on browser fallback
        setTimeout(() => {
          console.info('TIMING: [analysis_started]');
          startRealtimeAnalysisLoop();
        }, 550);
      } catch (err) {
        console.warn('[ScanMeCameraModal] Browser getUserMedia error:', err);
      }
    }
  }, [facingMode, isNative, onClose, startRealtimeAnalysisLoop]);

  /**
   * Initializes and checks camera permissions whenever modal opens
   */
  const checkAndInitCamera = useCallback(async () => {
    hasPlayedInitialDetectionSoundRef.current = false;
    stableSinceRef.current = null;
    cooldownUntilRef.current = 0;
    setStableCountdownProgress(0);

    setScanSession({
      id: `scan-${Date.now()}`,
      shots: initialShots.map((img, i) => ({
        id: `shot-${i + 1}`,
        image: img,
        timestamp: Date.now(),
        label: `Shot ${i + 1}`,
      })),
      detectedProduct: null,
      extractedData: {},
      status: 'capturing',
    });

    setTrackedProduct(createNewTrackedProduct());

    if (isNative) {
      try {
        const status = await getCameraPermissionStatus();
        console.log('[ScanMeCameraModal] Initial permission status:', status);

        if (status === 'granted') {
          await startLiveCamera();
        } else if (status === 'prompt') {
          setMode('permission_explanation');
        } else if (status === 'prompt-with-rationale') {
          setMode('permission_denied');
        } else {
          setMode('permission_permanently_denied');
        }
      } catch (err) {
        console.error('[ScanMeCameraModal] Permission check failed:', err);
        setMode('permission_explanation');
      }
    } else {
      await startLiveCamera();
    }
  }, [initialShots, isNative, startLiveCamera]);

  // Maintain a stable reference to checkAndInitCamera to prevent infinite re-render loops
  const checkAndInitCameraRef = useRef(checkAndInitCamera);
  useEffect(() => {
    checkAndInitCameraRef.current = checkAndInitCamera;
  });

  useEffect(() => {
    if (!isOpen) return;

    // Lock the document behind the camera and restore its exact previous state on close.
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      checkAndInitCameraRef.current();
    } else {
      stopLiveCamera();
    }

    return () => {
      stopLiveCamera();
    };
  }, [isOpen, stopLiveCamera]);

  /**
   * Auto-detect permission change when returning from Android Settings
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleAppResume = async () => {
      if (isNative && mode === 'permission_permanently_denied') {
        try {
          const status = await getCameraPermissionStatus();
          if (status === 'granted') {
            await startLiveCamera();
          }
        } catch (err) {
          console.warn('[ScanMeCameraModal] Resume check error:', err);
        }
      }
    };

    window.addEventListener('focus', handleAppResume);
    document.addEventListener('visibilitychange', handleAppResume);

    return () => {
      window.removeEventListener('focus', handleAppResume);
      document.removeEventListener('visibilitychange', handleAppResume);
    };
  }, [isOpen, isNative, mode, startLiveCamera]);

  /**
   * Permission Actions
   */
  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    try {
      const status = await requestCameraPermission();
      if (status === 'granted') {
        await startLiveCamera();
      } else if (status === 'prompt-with-rationale') {
        setMode('permission_denied');
      } else {
        setMode('permission_permanently_denied');
      }
    } catch (err) {
      console.warn('[ScanMeCameraModal] Permission request error:', err);
      setMode('permission_denied');
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleOpenSettings = async () => {
    await openCameraAppSettings();
  };

  /**
   * RETAKE LAST
   */
  const handleRetakeLast = () => {
    if (scanSession.shots.length === 0) return;
    const lastShot = scanSession.shots[scanSession.shots.length - 1];
    const removedNum = scanSession.shots.length;

    // Cancel and remove from progressive background extraction service
    progressiveExtractionService.removeShot(scanSession.id, lastShot.id);

    setScanSession((prev) => ({
      ...prev,
      shots: prev.shots.slice(0, -1),
    }));
    setTrackedProduct((prev) => removeLastShotFromTrackedProduct(prev));

    setJustCapturedToast(`Shot ${removedNum} removed. Retake now.`);
    setTimeout(() => setJustCapturedToast(null), 1800);
  };

  /**
   * FINISH & EXTRACT
   */
  const handleFinishAndExtract = async () => {
    if (scanSession.shots.length === 0 || isFinishing) return;
    setIsFinishing(true);

    try {
      // 1. Await in-flight background extractions with a bounded timeout
      const summary = await progressiveExtractionService.finishSession(scanSession.id, 4500);

      await stopLiveCamera();

      const finalResult = summary.mergedResult;
      const currencySymbol =
        finalResult.currency === 'NPR'
          ? 'Rs. '
          : finalResult.currency === 'INR'
          ? '₹'
          : finalResult.currency === 'EUR'
          ? '€'
          : finalResult.currency === 'GBP'
          ? '£'
          : '$';

      const finalSession: ScanSession = {
        ...scanSession,
        status: 'processing',
        detectedProduct: finalResult,
        extractedData: {
          ...scanSession.extractedData,
          trackingId: trackedProduct.id,
          productName: finalResult.productName,
          brand: finalResult.brand || '',
          category: '',
          sku: '',
          barcode: finalResult.barcode || '',
          batchNumber: finalResult.batchNumber || '',
          manufacturingDate: finalResult.manufactureDate || '',
          expiryDate: finalResult.expiryDate || '',
          bestBefore: finalResult.bestBeforeMonths ? `${finalResult.bestBeforeMonths} months` : '',
          bestBeforeMonths: finalResult.bestBeforeMonths,
          quantity: String(finalResult.quantity || 1),
          unit: finalResult.unit || 'pcs',
          mrp: finalResult.price !== null ? `${currencySymbol}${finalResult.price.toFixed(2)}` : '',
          confidence: finalResult.confidence,
          warnings: finalResult.warnings,
        },
      };

      // Extract the cropped product or region-specific crop images instead of raw full camera photos
      const imagesToExtract = scanSession.shots.map((s) => {
        const matched = trackedProduct.shots.find((ts) => ts.id === s.id);
        if (matched) {
          if (matched.cropRegions && matched.cropRegions.length > 0) {
            // If we cropped a specific targeted region (Label, MFD, EXP, Price), prefer that crop
            return matched.cropRegions[0].cropDataUrl || matched.croppedProductImage || s.image;
          }
          // Fallback to cropped product bounding box
          return matched.croppedProductImage || s.image;
        }
        return s.image;
      });

      onFinishAndExtract(imagesToExtract, finalSession);
      onClose();
    } catch (err) {
      console.error('[ScanMeCameraModal] finish error:', err);
      await stopLiveCamera();
      onClose();
    } finally {
      setIsFinishing(false);
    }
  };

  /**
   * CANCEL
   */
  const handleCancel = async () => {
    await stopLiveCamera();
    progressiveExtractionService.cancelSession(scanSession.id);
    setScanSession({
      id: `cancelled-${Date.now()}`,
      shots: [],
      detectedProduct: null,
      extractedData: {},
      status: 'cancelled',
    });
    onClose();
  };

  /**
   * Switch Camera
   */
  const handleSwitchCamera = async () => {
    if (isNative) {
      try {
        const res = await switchScanMeCamera();
        setFacingMode(res.facingMode === 'user' ? 'user' : 'environment');
      } catch (err) {
        console.warn('[ScanMeCameraModal] switch camera error:', err);
      }
    } else {
      const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
      setFacingMode(nextFacing);
      await stopLiveCamera();
      await startLiveCamera();
    }
  };

  /**
   * Toggle Flash
   */
  const handleToggleFlash = async () => {
    const modes: ('auto' | 'on' | 'off' | 'torch')[] = ['auto', 'on', 'torch', 'off'];
    const nextMode = modes[(modes.indexOf(flashMode) + 1) % modes.length];
    if (isNative) {
      try {
        const res = await setScanMeFlashMode(nextMode);
        if (res.success) {
          setFlashMode(nextMode);
        }
      } catch (err) {
        console.warn('[ScanMeCameraModal] toggle flash error:', err);
      }
    } else {
      setFlashMode(nextMode);
    }
  };

  if (!isOpen) return null;

  const f = trackedProduct.fields;
  const activeTarget = getActiveTargetField(trackedProduct);

  return createPortal((
    <div className="fixed inset-0 overflow-hidden select-none" style={{ zIndex: 2147483647, touchAction: 'none' }}>
      {/* Hidden canvas for browser preview snapshots */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Shutter flash animation overlay */}
      {isFlashEffect && (
        <div className="absolute inset-0 z-40 bg-white opacity-85 pointer-events-none transition-opacity duration-150" />
      )}

      {/* ========================================================================= */}
      {/* 1. PERMISSION EXPLANATION                                                 */}
      {/* ========================================================================= */}
      {mode === 'permission_explanation' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-4">
            <button
              type="button"
              onClick={handleCancel}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
              <Camera className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Camera Access</h3>
              <p className="text-xs font-bold text-slate-800">
                ScanMe AI needs camera access to scan and track products.
              </p>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Real-time tracking highlights barcodes, manufacturing dates, and pricing automatically.
              </p>
            </div>

            <div className="w-full pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleRequestPermission}
                disabled={isRequestingPermission}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-[#1473EA] hover:bg-blue-600 text-white text-sm font-bold shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isRequestingPermission ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Requesting Permission...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Allow Camera</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PERMISSION DENIED ONCE                                                  */}
      {/* ========================================================================= */}
      {mode === 'permission_denied' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-4">
            <button
              type="button"
              onClick={handleCancel}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Camera Permission Required</h3>
              <p className="text-xs font-semibold text-slate-800">
                Camera access is required to track product labels and scan barcodes.
              </p>
            </div>

            <div className="w-full pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleRequestPermission}
                disabled={isRequestingPermission}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-[#1473EA] hover:bg-blue-600 text-white text-sm font-bold shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isRequestingPermission ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Requesting...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Allow Camera</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleOpenSettings}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>Open Android Settings</span>
              </button>

              <button
                type="button"
                onClick={handleCancel}
                className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PERMISSION PERMANENTLY DENIED                                          */}
      {/* ========================================================================= */}
      {mode === 'permission_permanently_denied' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-4">
            <button
              type="button"
              onClick={handleCancel}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Camera Permission Disabled</h3>
              <p className="text-xs font-bold text-slate-800">
                Camera permission is disabled. Enable it in Android Settings to use the camera.
              </p>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Tap below to open App Info and enable Camera.
              </p>
            </div>

            <div className="w-full pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleOpenSettings}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-[#1473EA] hover:bg-blue-600 text-white text-sm font-bold shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>Open Android Settings</span>
              </button>

              <button
                type="button"
                onClick={handleCancel}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. REAL-TIME PRODUCT DETECTION + TRACKING CAMERA OVERLAY                  */}
      {/* ========================================================================= */}
      {mode === 'live_camera' && (
        <div className="absolute inset-0 z-50 flex flex-col justify-between bg-transparent">
          {/* Browser fallback video */}
          {!isNative && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 z-0 w-full h-full object-cover"
            />
          )}

          {/* TOP CONTROLS & FIELD CHECKLIST STATUS BAR */}
          <div className="w-full bg-gradient-to-b from-black/90 via-black/50 to-transparent p-3.5 sm:p-5 space-y-2.5 z-20">
            <div className="flex items-center justify-between">
              {/* Cancel Button */}
              <button
                type="button"
                onClick={handleCancel}
                className="p-2.5 rounded-full bg-black/55 hover:bg-black/75 text-white backdrop-blur-md border border-white/15 transition-transform active:scale-95 cursor-pointer"
                title="Cancel Session"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Dynamic Tracking Status Badge */}
              <div
                className={`px-3.5 py-1.5 rounded-full text-xs font-black backdrop-blur-md border flex items-center gap-2 transition-colors duration-200 ${
                  detection.trackingState === 'stable'
                    ? 'bg-emerald-500/90 text-white border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                    : detection.trackingState === 'tracking'
                    ? 'bg-cyan-500/80 text-white border-cyan-300'
                    : detection.trackingState === 'detected'
                    ? 'bg-blue-500/80 text-white border-blue-300'
                    : 'bg-black/60 text-white/90 border-white/15'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    detection.trackingState === 'stable'
                      ? 'bg-white animate-pulse'
                      : detection.trackingState === 'tracking'
                      ? 'bg-emerald-300'
                      : detection.trackingState === 'detected'
                      ? 'bg-cyan-300'
                      : 'bg-amber-400'
                  }`}
                />
                <span>
                  {detection.trackingState === 'searching'
                    ? 'Detecting Product'
                    : detection.trackingState === 'stable' && autoCaptureEnabled && stableCountdownProgress > 0
                    ? `${activeTarget.description} (${stableCountdownProgress}%)`
                    : activeTarget.description}
                </span>
              </div>

              {/* Lens Switch, Flash, Auto-Capture Controls */}
              <div className="flex items-center gap-2">
                {/* Auto-Capture Toggle */}
                <button
                  type="button"
                  onClick={() => setAutoCaptureEnabled((v) => !v)}
                  className={`p-2.5 rounded-full backdrop-blur-md border transition-all active:scale-95 cursor-pointer ${
                    autoCaptureEnabled
                      ? 'bg-emerald-500/80 border-emerald-300 text-white'
                      : 'bg-black/55 border-white/15 text-white/60'
                  }`}
                  title={autoCaptureEnabled ? 'Auto-Capture: ON' : 'Auto-Capture: OFF (Manual)'}
                >
                  <Timer className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={handleToggleFlash}
                  className="p-2.5 rounded-full bg-black/55 hover:bg-black/75 text-white backdrop-blur-md border border-white/15 transition-transform active:scale-95 cursor-pointer"
                  title={`Flash: ${flashMode.toUpperCase()}`}
                >
                  {flashMode === 'off' ? (
                    <ZapOff className="w-5 h-5 text-slate-400" />
                  ) : (
                    <Zap className={`w-5 h-5 ${flashMode === 'torch' ? 'text-amber-400' : 'text-emerald-400'}`} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="p-2.5 rounded-full bg-black/55 hover:bg-black/75 text-white backdrop-blur-md border border-white/15 transition-transform active:scale-95 cursor-pointer"
                  title="Switch Lens"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Field Status Pill Strip (Tracks coverage across multi-shots) */}
            <div className="flex items-center justify-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-black backdrop-blur-md border flex items-center gap-1 transition-all ${
                  f.productName.status === 'complete'
                    ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                    : 'bg-black/40 border-white/10 text-white/70'
                }`}
              >
                <span>Name</span>
                {f.productName.status === 'complete' && <Check className="w-3 h-3 text-emerald-400" />}
              </span>

              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-black backdrop-blur-md border flex items-center gap-1 transition-all ${
                  f.price.status === 'complete'
                    ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                    : 'bg-black/40 border-white/10 text-white/70'
                }`}
              >
                <span>Price</span>
                {f.price.status === 'complete' && <Check className="w-3 h-3 text-emerald-400" />}
              </span>

              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-black backdrop-blur-md border flex items-center gap-1 transition-all ${
                  f.manufactureDate.status === 'complete'
                    ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                    : 'bg-black/40 border-white/10 text-white/70'
                }`}
              >
                <span>MFD</span>
                {f.manufactureDate.status === 'complete' && <Check className="w-3 h-3 text-emerald-400" />}
              </span>

              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-black backdrop-blur-md border flex items-center gap-1 transition-all ${
                  f.expiryDate.status === 'complete'
                    ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                    : 'bg-black/40 border-white/10 text-white/70'
                }`}
              >
                <span>EXP</span>
                {f.expiryDate.status === 'complete' && <Check className="w-3 h-3 text-emerald-400" />}
              </span>

              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-black backdrop-blur-md border flex items-center gap-1 transition-all ${
                  f.barcode.status === 'complete'
                    ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                    : 'bg-black/40 border-white/10 text-white/70'
                }`}
              >
                <span>Barcode</span>
                {f.barcode.status === 'complete' && <Check className="w-3 h-3 text-emerald-400" />}
              </span>
            </div>
          </div>

          {/* Toast Notification Banner */}
          {justCapturedToast && (
            <div className="absolute top-28 inset-x-0 mx-auto w-max max-w-[90%] bg-emerald-600 text-white px-4 py-2 rounded-2xl text-xs font-black shadow-xl flex items-center gap-2 z-30 animate-in fade-in zoom-in-95">
              <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
              <span>{justCapturedToast}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REAL-TIME DYNAMIC BOUNDING BOX OVERLAY (Follows moving product smoothly)  */}
          {/* ========================================================================= */}
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <DetectionOverlay
              detection={detection}
              trackedProduct={trackedProduct}
              autoCaptureEnabled={autoCaptureEnabled}
              stableCountdownProgress={stableCountdownProgress}
              trackedObjects={visionObjects}
              selectedObjectId={selectedObjectId}
              onSelectObject={(obj) => {
                setSelectedObjectId(obj.id);
                globalObjectTracker.lockObject(obj.id);
                // Immediately align detection productBox to locked target
                setDetection((prev) => ({
                  ...prev,
                  productBox: obj.box,
                  hasProduct: true,
                }));
                // Audio & haptic feedback
                playProductDetectedTone();
                triggerScanVibrate();
                setJustCapturedToast(`${obj.id} Locked ✓`);
                setTimeout(() => setJustCapturedToast(null), 1600);
              }}
              showDebugInfo={false}
              fps={debugMetrics.fps}
              detectionLatencyMs={debugMetrics.detLatency}
              trackingLatencyMs={debugMetrics.trackLatency}
              sourceResolution={debugMetrics.resolution}
            />

            {/* Default Soft Framing Box when NOT searching/tracking/lost */}
            {!detection.hasProduct && visionObjects.length === 0 && (
              <div className="relative w-full max-w-sm aspect-[3/4] sm:aspect-square border-2 border-dashed border-amber-400/50 rounded-3xl flex flex-col items-center justify-between p-4 shadow-2xl animate-pulse">
                <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-xl" />
                <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-xl" />
                <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-xl" />
                <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-xl" />

                <span className="text-[11px] font-bold text-white bg-black/70 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/15">
                  {title}
                </span>

                <span className="text-[11px] font-medium text-white/95 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 text-center max-w-[280px]">
                  {detection.guidanceText || subtitle}
                </span>
              </div>
            )}
          </div>

          {/* BOTTOM CONTROLS & CONTINUOUS MULTI-SHOT TRAY */}
          <div className="w-full bg-gradient-to-t from-black/95 via-black/80 to-transparent p-4 sm:p-6 pb-8 space-y-3.5 z-20">
            {/* Live Shot Thumbnails & Retake Last Button */}
            {scanSession.shots.length > 0 && (
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  {scanSession.shots.map((shot, idx) => {
                    const job = extractionState.jobs.get(shot.id);
                    return (
                      <div
                        key={shot.id}
                        className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 border-emerald-400 bg-slate-900 shadow-md group"
                      >
                        <img
                          src={shot.image}
                          alt={`Shot ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {/* Live extraction badge */}
                        <div className="absolute top-0.5 right-0.5 z-10">
                          {job?.status === 'extracting' || job?.status === 'retrying' ? (
                            <div className="w-3.5 h-3.5 rounded-full bg-blue-500/90 text-white flex items-center justify-center animate-spin shadow-xs" title="Extracting in background...">
                              <Loader2 className="w-2.5 h-2.5" />
                            </div>
                          ) : job?.status === 'completed' ? (
                            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs" title="Extracted ✓">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          ) : job?.status === 'error' ? (
                            <div className="w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs" title="Extraction error">
                              <AlertTriangle className="w-2.5 h-2.5" />
                            </div>
                          ) : null}
                        </div>
                        <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] font-black text-center text-white">
                          #{idx + 1}
                        </span>
                      </div>
                    );
                  })}
                  {scanSession.shots.length < maxShots && (
                    <div className="shrink-0 w-12 h-12 rounded-xl border-2 border-dashed border-white/40 flex items-center justify-center text-white/70 text-[10px] font-bold">
                      +{maxShots - scanSession.shots.length}
                    </div>
                  )}
                </div>

                {/* [Retake Last] Button */}
                <button
                  type="button"
                  onClick={handleRetakeLast}
                  className="shrink-0 py-2 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold backdrop-blur-md border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
                  <span>Retake Last</span>
                </button>
              </div>
            )}

            {/* Smart Real-time Guidance Banner */}
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white font-bold text-xs border border-white/15 shadow-sm">
                {extractionState.activeRequests > 0 && (
                  <Loader2 className="w-3 h-3 text-cyan-400 animate-spin shrink-0" />
                )}
                <span>
                  {extractionState.activeRequests > 0
                    ? `Background AI processing (${extractionState.completedCount}/${scanSession.shots.length} ready) • ${detection.guidanceText}`
                    : detection.guidanceText}
                </span>
              </span>
            </div>

            {/* Action Bar: [Cancel] | [Capture with countdown] | [Finish & Extract] */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleCancel}
                className="min-w-[80px] py-2.5 px-3.5 rounded-xl text-white/80 hover:text-white text-xs font-bold bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all cursor-pointer text-center"
              >
                Cancel
              </button>

              {/* [Capture] Button with Live Countdown Ring */}
              <div className="relative flex items-center justify-center">
                {/* Countdown progress circle ring */}
                {autoCaptureEnabled && stableCountdownProgress > 0 && (
                  <svg className="absolute w-24 h-24 -rotate-90 pointer-events-none">
                    <circle
                      cx="48"
                      cy="48"
                      r="42"
                      className="stroke-emerald-400"
                      strokeWidth="4"
                      fill="transparent"
                      strokeDasharray={264}
                      strokeDashoffset={264 - (264 * stableCountdownProgress) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                )}

                <button
                  type="button"
                  onClick={() => handleCaptureShot(detection.productBox)}
                  disabled={isCapturing || scanSession.shots.length >= maxShots}
                  className="w-20 h-20 rounded-full bg-white hover:bg-slate-100 border-4 border-emerald-500 flex items-center justify-center shadow-2xl transition-transform active:scale-90 cursor-pointer disabled:opacity-50"
                  title="Capture Shot"
                  id="btn-camera-capture-shot"
                >
                  {isCapturing ? (
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-inner">
                      <Camera className="w-7 h-7" />
                    </div>
                  )}
                </button>
              </div>

              {/* [Finish & Extract] Button */}
              {scanSession.shots.length > 0 ? (
                <button
                  type="button"
                  onClick={handleFinishAndExtract}
                  disabled={isFinishing}
                  className="min-w-[125px] py-3 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer animate-in fade-in disabled:opacity-75"
                  id="btn-camera-finish-extract"
                >
                  {isFinishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Finalizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-white" />
                      <span>
                        Finish ({scanSession.shots.length})
                        {extractionState.completedCount > 0 && (
                          <span className="ml-1 text-[10px] text-emerald-100 font-semibold">
                            ✓{extractionState.completedCount}
                          </span>
                        )}
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <div className="min-w-[80px] text-right text-[11px] font-medium text-white/60 pr-1">
                  Aim & Hold
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  ), document.body);
};

export default ScanMeCameraModal;
