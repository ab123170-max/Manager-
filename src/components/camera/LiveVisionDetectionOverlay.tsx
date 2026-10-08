/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Target, CheckCircle2, Lock, Sparkles, AlertCircle } from 'lucide-react';
import { TrackedObject, NormalizedRect } from '../../utils/realtimeVisionTracker';

interface LiveVisionDetectionOverlayProps {
  objects: TrackedObject[];
  selectedObjectId?: string | null;
  onSelectObject: (obj: TrackedObject) => void;
  showDebugInfo?: boolean;
  fps?: number;
  detectionLatencyMs?: number;
  trackingLatencyMs?: number;
  resolution?: { width: number; height: number };
}

export const LiveVisionDetectionOverlay: React.FC<LiveVisionDetectionOverlayProps> = ({
  objects,
  selectedObjectId,
  onSelectObject,
  showDebugInfo = false,
  fps = 24,
  detectionLatencyMs = 8,
  trackingLatencyMs = 2,
  resolution = { width: 1280, height: 720 },
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none">
      {/* Optional In-Development Debug HUD (Hidden in production) */}
      {showDebugInfo && (
        <div className="absolute top-2 left-2 z-40 bg-black/85 backdrop-blur-md text-emerald-400 font-mono text-[10px] p-2.5 rounded-xl border border-emerald-500/30 space-y-1 shadow-xl pointer-events-auto">
          <div className="font-bold text-white flex items-center gap-1.5 border-b border-white/10 pb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>REAL-TIME VISION PIPELINE</span>
          </div>
          <div>FPS: <span className="text-white">{fps}</span></div>
          <div>Det Latency: <span className="text-white">{detectionLatencyMs} ms</span></div>
          <div>Track Latency: <span className="text-white">{trackingLatencyMs} ms</span></div>
          <div>Objects Detected: <span className="text-white">{objects.length}</span></div>
          <div>Resolution: <span className="text-white">{resolution.width}x{resolution.height}</span></div>
        </div>
      )}

      {/* Render Dynamic Bounding Boxes for Every Tracked Object */}
      {objects.map((obj) => {
        const isSelected = selectedObjectId === obj.id || obj.isLocked;
        const isLost = obj.state === 'TEMPORARILY_LOST';
        const isDetected = obj.state === 'DETECTED';

        // Coordinates mapped dynamically to camera viewport percentage
        const leftPercent = Math.max(0, Math.min(94, obj.box.x * 100));
        const topPercent = Math.max(0, Math.min(94, obj.box.y * 100));
        const widthPercent = Math.max(6, Math.min(100 - leftPercent, obj.box.width * 100));
        const heightPercent = Math.max(6, Math.min(100 - topPercent, obj.box.height * 100));

        // Styling based on tracking states
        let borderClasses = 'border-2 border-[#1473EA] shadow-[0_0_15px_rgba(20,115,234,0.45)]';
        let badgeBg = 'bg-[#1473EA] text-white';
        let stateLabel = 'TRACKING';

        if (isSelected) {
          borderClasses = 'border-2 border-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.7)] ring-2 ring-emerald-400/30';
          badgeBg = 'bg-emerald-500 text-white';
          stateLabel = 'LOCKED';
        } else if (isLost) {
          borderClasses = 'border-2 border-dashed border-amber-400/80 opacity-75 shadow-[0_0_10px_rgba(251,191,36,0.3)]';
          badgeBg = 'bg-amber-500/90 text-white';
          stateLabel = 'REACQUIRING';
        } else if (isDetected) {
          borderClasses = 'border-2 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.4)]';
          badgeBg = 'bg-cyan-500 text-white';
          stateLabel = 'DETECTED';
        }

        return (
          <div
            key={obj.id}
            style={{
              position: 'absolute',
              left: `${leftPercent}%`,
              top: `${topPercent}%`,
              width: `${widthPercent}%`,
              height: `${heightPercent}%`,
              // Smooth, low-latency transition interpolation between detection frames
              transition: 'left 0.08s linear, top 0.08s linear, width 0.08s linear, height 0.08s linear',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectObject(obj);
            }}
            className={`rounded-2xl flex flex-col justify-between pointer-events-auto cursor-pointer group ${borderClasses}`}
          >
            {/* Corner Bracket Accents (ScanMe AI Signature Look) */}
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-inherit rounded-tl-lg pointer-events-none" />
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-inherit rounded-tr-lg pointer-events-none" />
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-inherit rounded-bl-lg pointer-events-none" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-inherit rounded-br-lg pointer-events-none" />

            {/* Subtle Laser Sweep line (Only when selected or actively tracking) */}
            {(isSelected || obj.state === 'TRACKING') && !isLost && (
              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent opacity-70 top-1/2 -translate-y-1/2 pointer-events-none animate-pulse" />
            )}

            {/* Header Badge: Tracking ID + Class + State */}
            <div className="absolute -top-6 left-1 right-1 flex items-center justify-between gap-1 pointer-events-none">
              <div className="flex items-center gap-1.5 bg-[#092B4C]/90 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 text-[9px] font-black tracking-tight text-white shadow-md truncate">
                {isSelected ? (
                  <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                ) : (
                  <Target className="w-3 h-3 text-[#1473EA] shrink-0" />
                )}
                <span>{obj.id}</span>
                <span className="text-white/40">•</span>
                <span className="text-white/90 truncate">{obj.label}</span>
              </div>

              {/* Confidence badge */}
              <div className="bg-[#092B4C]/90 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/10 text-[9px] font-bold text-emerald-400 shadow-md shrink-0">
                {Math.round(obj.confidence * 100)}%
              </div>
            </div>

            {/* Tap to select / lock hint overlay on hover or active */}
            <div className="w-full h-full flex items-center justify-center p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-[#092B4C]/85 backdrop-blur-md px-2.5 py-1 rounded-xl text-white text-[10px] font-bold shadow-lg flex items-center gap-1.5 border border-white/15">
                <Sparkles className="w-3 h-3 text-cyan-300" />
                <span>{isSelected ? 'Selected (Tap to scan)' : 'Tap to Target & Crop'}</span>
              </div>
            </div>

            {/* Bottom State / Barcode Indicator */}
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-max max-w-[95%] pointer-events-none">
              <div className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase backdrop-blur-md shadow-md flex items-center gap-1 ${badgeBg}`}>
                {obj.detectedBarcode ? (
                  <>
                    <span>BARCODE: {obj.detectedBarcode}</span>
                  </>
                ) : (
                  <span>{stateLabel}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
