/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Crosshair, Check, AlertTriangle, Sparkles, Target } from 'lucide-react';
import { RealtimeDetectionResult, NormalizedRect } from '../../utils/realtimeProductDetector';
import { TrackedProduct, getActiveTargetField } from '../../utils/productTracker';

interface DetectionOverlayProps {
  detection: RealtimeDetectionResult;
  trackedProduct: TrackedProduct;
  autoCaptureEnabled: boolean;
  stableCountdownProgress: number;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  detection,
  trackedProduct,
  autoCaptureEnabled,
  stableCountdownProgress,
}) => {
  const [isNewDetection, setIsNewDetection] = useState(false);
  const [lastBox, setLastBox] = useState<NormalizedRect | null>(null);
  const [lostTracking, setLostTracking] = useState(false);

  // Trigger brief scale up animation upon new tracking session
  useEffect(() => {
    if (detection.hasProduct && trackedProduct.id) {
      setIsNewDetection(true);
      const timer = setTimeout(() => setIsNewDetection(false), 800);
      return () => clearTimeout(timer);
    }
  }, [trackedProduct.id, detection.hasProduct]);

  // Keep track of last known box to display "LOST" state gracefully
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

  // Calculate high-fidelity confidence percentage
  const confidencePercent = detection.hasProduct
    ? Math.round((0.84 + (detection.stabilityScore * 0.14)) * 100)
    : 0;

  // Determine border color and status text based on state
  let borderClass = 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.35)]';
  let statusText = 'DETECTING';
  let statusColor = 'text-amber-400 bg-amber-400/10 border-amber-400/30';

  if (lostTracking && lastBox) {
    borderClass = 'border-rose-600 border-dashed shadow-[0_0_15px_rgba(225,29,72,0.4)] opacity-70 transition-opacity duration-300';
    statusText = 'TRACKING LOST';
    statusColor = 'text-rose-400 bg-rose-500/20 border-rose-500/40';
  } else if (isComplete) {
    borderClass = 'border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.6)] animate-pulse';
    statusText = 'EXTRACTION COMPLETE';
    statusColor = 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';
  } else if (detection.trackingState === 'stable') {
    borderClass = 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)]';
    statusText = 'STABLE (LOCKED)';
    statusColor = 'text-emerald-400 bg-emerald-400/20 border-emerald-400/40';
  } else if (detection.trackingState === 'tracking') {
    borderClass = 'border-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.4)]';
    statusText = 'TRACKING';
    statusColor = 'text-cyan-400 bg-cyan-400/20 border-cyan-400/40';
  }

  const boxToRender = detection.hasProduct ? detection.productBox : (lostTracking ? lastBox : null);

  if (!boxToRender) return null;

  // Format tracking ID to be short and recognizable (e.g. TRK-084)
  const trackingId = `TRK-${trackedProduct.id.replace('prod-', '').slice(-3).toUpperCase()}`;

  // Count how many fields are complete
  const totalFields = 5;
  const completedFieldsCount = Object.values(trackedProduct.fields).filter(
    (f) => f.status === 'complete'
  ).length;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${Math.round(boxToRender.x * 100)}%`,
        top: `${Math.round(boxToRender.y * 100)}%`,
        width: `${Math.round(boxToRender.width * 100)}%`,
        height: `${Math.round(boxToRender.height * 100)}%`,
        transition: 'left 0.12s ease-out, top 0.12s ease-out, width 0.12s ease-out, height 0.12s ease-out',
      }}
      className={`border-2 rounded-3xl relative flex flex-col justify-between ${borderClass} ${
        isNewDetection ? 'scale-[1.03] transition-transform duration-150' : 'scale-100 transition-transform duration-200'
      }`}
    >
      {/* 4 Corner Bracket Accents */}
      <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 border-inherit rounded-tl-xl" />
      <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 border-inherit rounded-tr-xl" />
      <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 border-inherit rounded-bl-xl" />
      <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 border-inherit rounded-br-xl" />

      {/* Laser Scanning Bar (Only when tracking & not fully complete) */}
      {!isComplete && !lostTracking && (
        <div className="absolute left-0 right-0 h-[2.5px] bg-cyan-400 opacity-60 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-scan-laser pointer-events-none" />
      )}

      {/* Top Header Badge Row */}
      <div className="absolute -top-5 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none select-none">
        {/* Tracking ID & Status */}
        <div className="flex items-center gap-1.5 bg-black/85 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-lg text-[10px] font-black tracking-tight text-white">
          <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{trackingId}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
          <span className={statusColor.split(' ')[0]}>{statusText}</span>
        </div>

        {/* Confidence Percentage */}
        {!lostTracking && (
          <div className="bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow-lg text-[10px] font-black text-emerald-400 flex items-center gap-1 shrink-0">
            <span>Conf:</span>
            <span>{confidencePercent}%</span>
          </div>
        )}
      </div>

      {/* Main Internal Content Area for Bounding Box (Active target region / Completed Indicators) */}
      <div className="absolute inset-0 p-3 flex flex-col justify-between pointer-events-none">
        <div className="w-full h-full relative">
          
          {/* Active Target Outline Rendering */}
          {(() => {
            if (lostTracking || isComplete) return null;

            const activeRegion = detection.regions.find((reg) => activeTarget.types.includes(reg.type));
            if (!activeRegion) return null;

            const relX = ((activeRegion.box.x - boxToRender.x) / boxToRender.width) * 100;
            const relY = ((activeRegion.box.y - boxToRender.y) / boxToRender.height) * 100;
            const relW = (activeRegion.box.width / boxToRender.width) * 100;
            const relH = (activeRegion.box.height / boxToRender.height) * 100;

            return (
              <div
                key={activeRegion.id}
                style={{
                  position: 'absolute',
                  left: `${Math.max(0, Math.min(92, Math.round(relX)))}%`,
                  top: `${Math.max(0, Math.min(92, Math.round(relY)))}%`,
                  width: `${Math.max(8, Math.min(100, Math.round(relW)))}%`,
                  height: `${Math.max(6, Math.min(100, Math.round(relH)))}%`,
                  transition: 'all 0.15s ease-out',
                }}
                className={`border-2 border-dashed rounded-xl flex items-start p-1 pointer-events-none ${
                  activeRegion.type === 'expiry_date'
                    ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_10px_rgba(251,191,36,0.35)]'
                    : activeRegion.type === 'mfd_date'
                    ? 'border-orange-400 bg-orange-400/10 shadow-[0_0_10px_rgba(251,146,60,0.35)]'
                    : activeRegion.type === 'barcode_qr'
                    ? 'border-cyan-400 bg-cyan-400/10 shadow-[0_0_10px_rgba(34,211,238,0.35)]'
                    : activeRegion.type === 'price_mrp'
                    ? 'border-emerald-400 bg-emerald-400/10 shadow-[0_0_10px_rgba(52,211,153,0.35)]'
                    : 'border-white bg-white/10 shadow-[0_0_10px_rgba(255,255,255,0.25)]'
                }`}
              >
                <span className="text-[9px] font-black bg-black/85 px-1.5 py-0.5 rounded text-white truncate max-w-full flex items-center gap-1 border border-white/5 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span>{activeTarget.name}</span>
                </span>
              </div>
            );
          })()}

          {/* Render Completed Checkdots inside bounding box */}
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
              const relX = ((reg.box.x - boxToRender.x) / boxToRender.width) * 100;
              const relY = ((reg.box.y - boxToRender.y) / boxToRender.height) * 100;
              const relW = (reg.box.width / boxToRender.width) * 100;
              const relH = (reg.box.height / boxToRender.height) * 100;
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
                  className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center border border-white shadow-lg scale-100 animate-in zoom-in duration-150"
                  title={`${reg.label} Captured ✓`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                </div>
              );
            });
          })()}

        </div>
      </div>

      {/* Bottom Extraction Status Pill (Shows current scanning checklist summary) */}
      {!lostTracking && (
        <div className="absolute -bottom-4.5 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/10 shadow-lg text-[9px] font-black text-white/90 flex items-center gap-1.5 tracking-tight pointer-events-none select-none w-max max-w-[90%]">
          {isComplete ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-emerald-400">All 5 fields tracked & crop-ready!</span>
            </>
          ) : (
            <>
              <span className="text-white/60">Extracted:</span>
              <span className="text-emerald-400">{completedFieldsCount} / {totalFields} fields</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="text-cyan-300">Aim at {activeTarget.name}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
