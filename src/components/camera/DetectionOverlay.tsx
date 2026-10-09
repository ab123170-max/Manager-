/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Real-time Dynamic Detection Overlay.
 * Mathematically maps normalized ML detections to viewport coordinates.
 * Strictly no fabricated confidences, phantom boxes, or misaligned overlays.
 */

import React, { useRef, useState, useEffect } from 'react';
import { Target, Check, Sparkles, AlertCircle, Crosshair, Cpu, CheckCircle2 } from 'lucide-react';
import { RealtimeDetectionResult, NormalizedRect } from '../../utils/realtimeProductDetector';
import { TrackedProduct, getActiveTargetField } from '../../utils/productTracker';
import { TrackedObject } from '../../utils/realtimeVisionTracker';
import { mapNormalizedRectToViewport } from '../../utils/coordinateMapping';
import { ModelLoadingStatus } from '../../utils/mlProductDetector';

interface DetectionOverlayProps {
  detection: RealtimeDetectionResult;
  trackedProduct: TrackedProduct;
  autoCaptureEnabled: boolean;
  stableCountdownProgress: number;
  trackedObjects?: TrackedObject[];
  selectedObjectId?: string | null;
  onSelectObject?: (obj: TrackedObject) => void;
  showDebugInfo?: boolean;
  fps?: number;
  detectionLatencyMs?: number;
  trackingLatencyMs?: number;
  sourceResolution?: { width: number; height: number };
  modelStatus?: ModelLoadingStatus;
  modelError?: string | null;
  backendName?: string;
  cameraSourceType?: string;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  detection,
  trackedProduct,
  autoCaptureEnabled,
  stableCountdownProgress,
  trackedObjects = [],
  selectedObjectId,
  onSelectObject,
  showDebugInfo = false,
  fps = 24,
  detectionLatencyMs = 8,
  trackingLatencyMs = 2,
  sourceResolution = { width: 1280, height: 720 },
  modelStatus = 'ready',
  modelError = null,
  backendName = 'webgl',
  cameraSourceType = 'Web Camera',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Monitor rendered container dimensions to ensure mathematically accurate coordinate mapping
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({
          width: Math.round(rect.width || window.innerWidth),
          height: Math.round(rect.height || window.innerHeight),
        });
      } else {
        setContainerSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const activeTarget = getActiveTargetField(trackedProduct);
  const isComplete = activeTarget.name === 'Complete';

  // Primary object to render
  const primaryObject = trackedObjects.length > 0 ? trackedObjects[0] : null;
  const hasGenuineDetection = detection.hasProduct && (Boolean(primaryObject) || Boolean(detection.productBox));

  const primaryBox: NormalizedRect | null = primaryObject
    ? primaryObject.box
    : detection.hasProduct
    ? detection.productBox
    : null;

  // Genuine confidence score (from ML model, never fabricated)
  const confidencePercent = primaryObject
    ? Math.round(primaryObject.confidence * 100)
    : detection.confidence
    ? Math.round(detection.confidence * 100)
    : 0;

  const trackingId = primaryObject?.id || `ID 01`;
  const productLabel = primaryObject?.label || detection.detectedLabel || 'Packaged Product';

  // Mathematically map normalized bounding box to the container viewport
  const primaryViewport = primaryBox && containerSize.width > 0
    ? mapNormalizedRectToViewport(primaryBox, {
        sourceWidth: sourceResolution.width || 1280,
        sourceHeight: sourceResolution.height || 720,
        containerWidth: containerSize.width,
        containerHeight: containerSize.height,
        fitMode: 'cover',
      })
    : null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-10 overflow-hidden select-none"
    >
      {/* ========================================================================= */}
      {/* 1. VISION DIAGNOSTICS & DEBUG HUD (Toggleable in header)                   */}
      {/* ========================================================================= */}
      {showDebugInfo && (
        <div className="absolute top-16 left-3 z-40 bg-black/90 backdrop-blur-md text-emerald-400 font-mono text-[10px] p-3 rounded-2xl border border-emerald-500/40 space-y-1 shadow-2xl pointer-events-auto max-w-[280px]">
          <div className="font-bold text-white flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${modelStatus === 'ready' ? 'bg-emerald-400 animate-pulse' : modelStatus === 'loading' ? 'bg-amber-400 animate-spin' : 'bg-rose-500'}`} />
              <span className="tracking-wider">VISION DIAGNOSTICS</span>
            </div>
            <span className="text-[9px] text-white/50">{backendName.toUpperCase()}</span>
          </div>

          <div>Model: <span className="text-white font-semibold">{modelStatus === 'ready' ? 'SSDLite MobileNetV2' : modelStatus === 'loading' ? 'Loading weights...' : 'Load Error'}</span></div>
          {modelError && <div className="text-rose-400 text-[9px] truncate">Err: {modelError}</div>}
          <div>Camera: <span className="text-white">{cameraSourceType}</span></div>
          <div>FPS: <span className="text-white font-bold">{fps}</span></div>
          <div>Det Latency: <span className="text-white font-bold">{detectionLatencyMs} ms</span></div>
          <div>Track Latency: <span className="text-white font-bold">{trackingLatencyMs} ms</span></div>
          <div>Objects Detected: <span className="text-white font-bold">{trackedObjects.length}</span></div>
          <div>Source Res: <span className="text-white">{sourceResolution.width}x{sourceResolution.height}</span></div>
          <div>Viewport: <span className="text-white">{containerSize.width}x{containerSize.height}</span></div>

          {primaryObject && (
            <div className="border-t border-white/10 pt-1 mt-1 space-y-0.5">
              <div>Primary ID: <span className="text-white font-bold">{primaryObject.id}</span></div>
              <div>Class: <span className="text-white font-bold">{primaryObject.label}</span> ({Math.round(primaryObject.confidence * 100)}%)</div>
              <div>State: <span className="text-white font-bold">{primaryObject.state}</span></div>
              {primaryViewport && (
                <div>Box Px: <span className="text-white">{primaryViewport.leftPx}, {primaryViewport.topPx}, {primaryViewport.widthPx}x{primaryViewport.heightPx}</span></div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SECONDARY DETECTED OBJECTS (Multi-Object Tracking)                     */}
      {/* ========================================================================= */}
      {trackedObjects.length > 1 &&
        trackedObjects.slice(1).map((secObj) => {
          const secViewport = mapNormalizedRectToViewport(secObj.box, {
            sourceWidth: sourceResolution.width || 1280,
            sourceHeight: sourceResolution.height || 720,
            containerWidth: containerSize.width,
            containerHeight: containerSize.height,
            fitMode: 'cover',
          });

          if (!secViewport.isVisible) return null;

          const isSelected = selectedObjectId === secObj.id || secObj.isLocked;

          return (
            <div
              key={secObj.id}
              style={{
                position: 'absolute',
                left: `${secViewport.leftPercent}%`,
                top: `${secViewport.topPercent}%`,
                width: `${secViewport.widthPercent}%`,
                height: `${secViewport.heightPercent}%`,
                transition: 'left 0.05s linear, top 0.05s linear, width 0.05s linear, height 0.05s linear',
                willChange: 'left, top, width, height',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectObject?.(secObj);
              }}
              className={`border-2 rounded-2xl pointer-events-auto cursor-pointer transition-all ${
                isSelected
                  ? 'border-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.7)]'
                  : 'border-[#1473EA]/80 hover:border-cyan-300 shadow-[0_0_12px_rgba(20,115,234,0.35)]'
              }`}
            >
              <div className="absolute -top-5 left-1 flex items-center gap-1 bg-[#092B4C]/90 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 text-[9px] font-black text-white shadow-md">
                <Target className="w-3 h-3 text-[#1473EA]" />
                <span>{secObj.id}</span>
                <span className="text-white/40">•</span>
                <span>{secObj.label}</span>
                <span className="text-white/40">•</span>
                <span>{Math.round(secObj.confidence * 100)}%</span>
              </div>
            </div>
          );
        })}

      {/* ========================================================================= */}
      {/* 3. PRIMARY PRODUCT BOUNDING BOX                                           */}
      {/* ========================================================================= */}
      {hasGenuineDetection && primaryViewport && primaryViewport.isVisible && (
        <div
          style={{
            position: 'absolute',
            left: `${primaryViewport.leftPercent}%`,
            top: `${primaryViewport.topPercent}%`,
            width: `${primaryViewport.widthPercent}%`,
            height: `${primaryViewport.heightPercent}%`,
            // High-frequency, low-latency linear transition follows physical object immediately
            transition: 'left 0.05s linear, top 0.05s linear, width 0.05s linear, height 0.05s linear',
            willChange: 'left, top, width, height',
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (primaryObject && onSelectObject) {
              onSelectObject(primaryObject);
            }
          }}
          className={`border-2 rounded-3xl relative flex flex-col justify-between pointer-events-auto cursor-pointer transition-colors ${
            isComplete
              ? 'border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.7)] ring-2 ring-emerald-400/30'
              : detection.trackingState === 'stable'
              ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.55)]'
              : 'border-[#1473EA] shadow-[0_0_18px_rgba(20,115,234,0.45)]'
          }`}
        >
          {/* Corner Bracket Accents (Signature ScanMe UI) */}
          <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 border-inherit rounded-tl-xl pointer-events-none" />
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 border-inherit rounded-tr-xl pointer-events-none" />
          <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 border-inherit rounded-bl-xl pointer-events-none" />
          <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 border-inherit rounded-br-xl pointer-events-none" />

          {/* Laser Scanning Line Animation */}
          {!isComplete && (
            <div className="absolute left-0 right-0 h-[2px] bg-cyan-400 opacity-60 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-scan-laser pointer-events-none" />
          )}

          {/* Top Header Badge Row */}
          <div className="absolute -top-6 left-2 right-2 flex items-center justify-between gap-2 pointer-events-none select-none">
            {/* Tracking ID, Class & Status */}
            <div className="flex items-center gap-1.5 bg-[#092B4C]/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 shadow-lg text-[10px] font-black text-white">
              <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{trackingId}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
              <span className="text-cyan-200">{productLabel}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
              <span className="text-cyan-300">
                {isComplete
                  ? 'LOCKED & READY'
                  : detection.trackingState === 'stable'
                  ? 'STABLE'
                  : 'TRACKING'}
              </span>
            </div>

            {/* Genuine ML Confidence Score */}
            <div className="bg-[#092B4C]/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 shadow-lg text-[10px] font-black text-emerald-400 flex items-center gap-1 shrink-0">
              <span>{confidencePercent}%</span>
            </div>
          </div>

          {/* Detected Barcode Tag if available */}
          {detection.detectedBarcode && (
            <div className="absolute -bottom-6 left-2 flex items-center gap-1 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 text-[9px] font-mono text-cyan-300 pointer-events-none">
              <span>BARCODE:</span>
              <span className="text-white font-bold">{detection.detectedBarcode}</span>
            </div>
          )}
        </div>
      )}

      {/* Model Loading / Error Pill when no product detected */}
      {!hasGenuineDetection && modelStatus === 'loading' && (
        <div className="absolute top-16 inset-x-0 mx-auto w-max bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-white text-xs font-semibold flex items-center gap-2 pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>Initializing Vision Model (SSDLite MobileNetV2)...</span>
        </div>
      )}

      {!hasGenuineDetection && modelStatus === 'error' && (
        <div className="absolute top-16 inset-x-0 mx-auto w-max max-w-[90%] bg-rose-950/85 backdrop-blur-md px-4 py-2 rounded-2xl border border-rose-500/30 text-rose-200 text-xs font-semibold flex items-center gap-2 pointer-events-none">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Vision model failed to load. Manual capture is available.</span>
        </div>
      )}
    </div>
  );
};
