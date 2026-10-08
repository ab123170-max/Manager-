/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Target, Check, Sparkles, Lock, AlertCircle, Crosshair } from 'lucide-react';
import { RealtimeDetectionResult, NormalizedRect } from '../../utils/realtimeProductDetector';
import { TrackedProduct, getActiveTargetField } from '../../utils/productTracker';
import { TrackedObject } from '../../utils/realtimeVisionTracker';

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
}) => {
  const [lastBox, setLastBox] = useState<NormalizedRect | null>(null);
  const [lostTracking, setLostTracking] = useState(false);

  // Keep track of primary product box to gracefully handle re-acquisition
  useEffect(() => {
    if (detection.hasProduct && detection.productBox) {
      setLastBox(detection.productBox);
      setLostTracking(false);
    } else if (!detection.hasProduct && lastBox && !lostTracking) {
      setLostTracking(true);
      const timer = setTimeout(() => {
        setLastBox(null);
        setLostTracking(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [detection.hasProduct, detection.productBox, lastBox, lostTracking]);

  const activeTarget = getActiveTargetField(trackedProduct);
  const isComplete = activeTarget.name === 'Complete';

  const confidencePercent = detection.hasProduct
    ? Math.round((0.84 + detection.stabilityScore * 0.14) * 100)
    : 0;

  // Format tracking ID to match requirement (e.g., 'ID 01', 'ID 02' or 'TRK-084')
  const trackingId = trackedObjects.length > 0 && trackedObjects[0]?.id
    ? trackedObjects[0].id
    : `ID ${trackedProduct.id.replace('prod-', '').slice(-2).padStart(2, '0')}`;

  // If we have multi-object real-time tracking, render all tracked objects
  const hasMultipleTrackedObjects = trackedObjects && trackedObjects.length > 1;

  // Primary box coordinates to render
  // The tracker is the authoritative live geometry. Prefer its current box over the
  // slower field-analysis box so the overlay follows the physical product every frame.
  const trackedPrimaryBox = trackedObjects.length > 0 ? trackedObjects[0].box : null;
  const primaryBox = trackedPrimaryBox || (detection.hasProduct ? detection.productBox : (lostTracking ? lastBox : null));

  // Completed fields calculation
  const totalFields = 5;
  const completedFieldsCount = Object.values(trackedProduct.fields).filter(
    (f) => f.status === 'complete'
  ).length;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden select-none">
      {/* Optional In-Development Debug HUD (Hidden in production) */}
      {showDebugInfo && (
        <div className="absolute top-2 left-2 z-40 bg-black/85 backdrop-blur-md text-emerald-400 font-mono text-[10px] p-2.5 rounded-xl border border-emerald-500/30 space-y-0.5 shadow-xl pointer-events-auto">
          <div className="font-bold text-white flex items-center gap-1.5 border-b border-white/10 pb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>VISION PIPELINE DEBUG</span>
          </div>
          <div>FPS: <span className="text-white">{fps}</span></div>
          <div>Det Latency: <span className="text-white">{detectionLatencyMs} ms</span></div>
          <div>Track Latency: <span className="text-white">{trackingLatencyMs} ms</span></div>
          <div>Objects Detected: <span className="text-white">{trackedObjects.length || (detection.hasProduct ? 1 : 0)}</span></div>
          <div>Resolution: <span className="text-white">{sourceResolution.width}x{sourceResolution.height}</span></div>
          <div>Tracking IDs: <span className="text-white">{trackedObjects.map((o) => o.id).join(', ') || trackingId}</span></div>
        </div>
      )}

      {/* Render Multiple Secondary Detected Objects when present in frame */}
      {hasMultipleTrackedObjects &&
        trackedObjects.slice(1).map((secObj) => {
          const isSelected = selectedObjectId === secObj.id || secObj.isLocked;
          const leftPct = Math.max(0, Math.min(94, secObj.box.x * 100));
          const topPct = Math.max(0, Math.min(94, secObj.box.y * 100));
          const widthPct = Math.max(1.5, Math.min(100 - leftPct, secObj.box.width * 100));
          const heightPct = Math.max(1.5, Math.min(100 - topPct, secObj.box.height * 100));

          return (
            <div
              key={secObj.id}
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
                transition: 'left 0.06s linear, top 0.06s linear, width 0.06s linear, height 0.06s linear',
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
                <span>{Math.round(secObj.confidence * 100)}%</span>
              </div>
            </div>
          );
        })}

      {/* Render Primary Tracked Product Bounding Box */}
      {primaryBox && (
        <div
          style={{
            position: 'absolute',
            left: `${Math.max(0, Math.min(94, primaryBox.x * 100))}%`,
            top: `${Math.max(0, Math.min(94, primaryBox.y * 100))}%`,
            width: `${Math.max(1.5, Math.min(100 - primaryBox.x * 100, primaryBox.width * 100))}%`,
            height: `${Math.max(1.5, Math.min(100 - primaryBox.y * 100, primaryBox.height * 100))}%`,
            // Smooth, responsive interpolation: moves & resizes continuously with the physical object
            transition: 'left 0.08s linear, top 0.08s linear, width 0.08s linear, height 0.08s linear',
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (trackedObjects.length > 0 && onSelectObject) {
              onSelectObject(trackedObjects[0]);
            }
          }}
          className={`border-2 rounded-3xl relative flex flex-col justify-between pointer-events-auto cursor-pointer transition-transform ${
            lostTracking
              ? 'border-amber-400 border-dashed shadow-[0_0_12px_rgba(251,191,36,0.4)] opacity-80'
              : isComplete
              ? 'border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.7)] ring-2 ring-emerald-400/30'
              : detection.trackingState === 'stable'
              ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.55)]'
              : 'border-[#1473EA] shadow-[0_0_18px_rgba(20,115,234,0.45)]'
          }`}
        >
          {/* 4 Corner Bracket Accents (ScanMe signature design) */}
          <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 border-inherit rounded-tl-xl pointer-events-none" />
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 border-inherit rounded-tr-xl pointer-events-none" />
          <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 border-inherit rounded-bl-xl pointer-events-none" />
          <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 border-inherit rounded-br-xl pointer-events-none" />

          {/* Laser Scanning Bar */}
          {!isComplete && !lostTracking && (
            <div className="absolute left-0 right-0 h-[2px] bg-cyan-400 opacity-60 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-scan-laser pointer-events-none" />
          )}

          {/* Top Header Badge Row */}
          <div className="absolute -top-6 left-2 right-2 flex items-center justify-between gap-2 pointer-events-none select-none">
            {/* Tracking ID & Status */}
            <div className="flex items-center gap-1.5 bg-[#092B4C]/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 shadow-lg text-[10px] font-black text-white">
              <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{trackingId}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
              <span className="text-cyan-300">
                {lostTracking
                  ? 'REACQUIRING'
                  : isComplete
                  ? 'LOCKED & READY'
                  : detection.trackingState === 'stable'
                  ? 'STABLE'
                  : 'TRACKING'}
              </span>
            </div>

            {/* Confidence */}
            {!lostTracking && (
              <div className="bg-[#092B4C]/90 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 shadow-lg text-[10px] font-black text-emerald-400 flex items-center gap-1 shrink-0">
                <span>{confidencePercent}%</span>
              </div>
            )}
          </div>

          {/* Main Internal Content: Active Target Region Highlight */}
          <div className="absolute inset-0 p-3 flex flex-col justify-between pointer-events-none">
            <div className="w-full h-full relative">
              {(() => {
                if (lostTracking || isComplete) return null;

                const activeRegion = detection.regions.find((reg) => activeTarget.types.includes(reg.type));
                if (!activeRegion) return null;

                const relX = ((activeRegion.box.x - primaryBox.x) / primaryBox.width) * 100;
                const relY = ((activeRegion.box.y - primaryBox.y) / primaryBox.height) * 100;
                const relW = (activeRegion.box.width / primaryBox.width) * 100;
                const relH = (activeRegion.box.height / primaryBox.height) * 100;

                return (
                  <div
                    key={activeRegion.id}
                    style={{
                      position: 'absolute',
                      left: `${Math.max(0, Math.min(92, Math.round(relX)))}%`,
                      top: `${Math.max(0, Math.min(92, Math.round(relY)))}%`,
                      width: `${Math.max(8, Math.min(100, Math.round(relW)))}%`,
                      height: `${Math.max(6, Math.min(100, Math.round(relH)))}%`,
                      transition: 'all 0.12s linear',
                    }}
                    className="border-2 border-dashed border-cyan-400 bg-cyan-400/10 shadow-[0_0_10px_rgba(34,211,238,0.35)] rounded-xl flex items-start p-1 pointer-events-none"
                  >
                    <span className="text-[9px] font-black bg-[#092B4C]/90 px-1.5 py-0.5 rounded text-white truncate max-w-full flex items-center gap-1 border border-white/10 shadow-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span>{activeTarget.name}</span>
                    </span>
                  </div>
                );
              })()}

              {/* Completed checkdots inside bounding box */}
              {(() => {
                const completedTypes = Object.entries(trackedProduct.fields)
                  .filter(([_, val]) => val.status === 'complete')
                  .map(([key, _]) => {
                    if (key === 'productName') return 'product_name';
                    if (key === 'manufactureDate') return 'mfd_date';
                    if (key === 'expiryDate') return 'expiry_date';
                    if (key === 'price') return 'price_mrp';
                    if (key === 'barcode') return 'barcode_qr';
                    return '';
                  })
                  .filter(Boolean);

                const completedRegions = detection.regions.filter((reg) => completedTypes.includes(reg.type as any));

                return completedRegions.map((reg) => {
                  const relX = ((reg.box.x - primaryBox.x) / primaryBox.width) * 100;
                  const relY = ((reg.box.y - primaryBox.y) / primaryBox.height) * 100;
                  const relW = (reg.box.width / primaryBox.width) * 100;
                  const relH = (reg.box.height / primaryBox.height) * 100;
                  const centerX = relX + relW / 2;
                  const centerY = relY + relH / 2;

                  return (
                    <div
                      key={reg.id}
                      style={{
                        position: 'absolute',
                        left: `${Math.max(2, Math.min(98, centerX))}%`,
                        top: `${Math.max(2, Math.min(98, centerY))}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center border border-white shadow-lg"
                      title={`${reg.label} Captured ✓`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Bottom Extraction Status Pill */}
          {!lostTracking && (
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-[#092B4C]/90 backdrop-blur-md px-3 py-0.5 rounded-full border border-white/10 shadow-lg text-[9px] font-black text-white flex items-center gap-1.5 tracking-tight pointer-events-none select-none w-max max-w-[90%]">
              {isComplete ? (
                <>
                  <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="text-emerald-400">All fields tracked & crop-ready!</span>
                </>
              ) : (
                <>
                  <span className="text-white/60">Extracted:</span>
                  <span className="text-emerald-400">{completedFieldsCount}/{totalFields}</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="text-cyan-300">Aim at {activeTarget.name}</span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
