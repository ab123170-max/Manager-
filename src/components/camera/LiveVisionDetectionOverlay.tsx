/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Target, CheckCircle2, Lock, Sparkles, AlertCircle } from 'lucide-react';
import { TrackedObject, NormalizedRect } from '../../utils/realtimeVisionTracker';
import { mapNormalizedRectToViewport } from '../../utils/coordinateMapping';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

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

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none"
    >
      {/* Optional In-Development Debug HUD */}
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

        const viewport = mapNormalizedRectToViewport(obj.box, {
          sourceWidth: resolution.width || 1280,
          sourceHeight: resolution.height || 720,
          containerWidth: containerSize.width || window.innerWidth,
          containerHeight: containerSize.height || window.innerHeight,
          fitMode: 'cover',
        });

        if (!viewport.isVisible) return null;

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
              left: `${viewport.leftPercent}%`,
              top: `${viewport.topPercent}%`,
              width: `${viewport.widthPercent}%`,
              height: `${viewport.heightPercent}%`,
              transition: 'left 0.05s linear, top 0.05s linear, width 0.05s linear, height 0.05s linear',
              willChange: 'left, top, width, height',
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

            {/* Laser scanning indicator when active */}
            {!isLost && (
              <div className="absolute left-0 right-0 h-[2px] bg-cyan-400 opacity-60 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-scan-laser pointer-events-none" />
            )}

            {/* Top Badge: Tracking ID & State */}
            <div className="absolute -top-5.5 left-2 flex items-center gap-1.5 pointer-events-none">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 ${badgeBg}`}>
                <Target className="w-2.5 h-2.5" />
                <span>{obj.id}</span>
                <span className="opacity-60">•</span>
                <span>{obj.label}</span>
                <span className="opacity-60">•</span>
                <span>{stateLabel}</span>
              </span>

              {/* Confidence badge */}
              <span className="bg-[#092B4C]/90 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-white/10 text-[9px] font-mono text-emerald-400 shadow-md">
                {Math.round(obj.confidence * 100)}%
              </span>
            </div>

            {/* Barcode badge if present */}
            {obj.detectedBarcode && (
              <div className="absolute -bottom-5 left-2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 text-[8px] font-mono text-cyan-300 pointer-events-none">
                BARCODE: {obj.detectedBarcode}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
