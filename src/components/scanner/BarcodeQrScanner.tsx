/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Flashlight,
  Volume2,
  VolumeX,
  Vibrate,
  VibrateOff,
  SwitchCamera,
  Sparkles,
  RefreshCw,
  History,
  AlertTriangle,
  Barcode as BarcodeIcon,
  QrCode as QrCodeIcon,
  CheckCircle2,
  SlidersHorizontal,
  ChevronLeft,
  Search,
  Keyboard,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useCamera } from '../../hooks/useCamera';
import { codeDetector } from '../../utils/barcodeDetector';
import { playScanSuccessBeep, playScanDuplicateTone, triggerScanVibrate } from '../../utils/audioFeedback';
import { lookupProductByCode } from '../../services/productLookupService';
import { DetectedCode, LookupResult, ScannerSettings, ScanHistoryItem, SavedInventoryItem } from '../../types';
import { ProductLookupModal } from './ProductLookupModal';
import { BarcodeToProductPipelineModal } from './BarcodeToProductPipelineModal';
import { ScanHistoryDrawer } from './ScanHistoryDrawer';

interface BarcodeQrScannerProps {
  onBackToMain?: () => void;
  onSwitchToAiVision: (barcode?: string) => void;
  onOpenProductFormWithData: (data: Partial<SavedInventoryItem>) => void;
  onAddStock: (productId: string, quantity: number) => void;
  onNavigateToCatalog?: () => void;
}

const SETTINGS_STORAGE_KEY = 'ais_scanner_settings_v1';

export const BarcodeQrScanner: React.FC<BarcodeQrScannerProps> = ({
  onBackToMain,
  onSwitchToAiVision,
  onOpenProductFormWithData,
  onAddStock,
  onNavigateToCatalog,
}) => {
  const {
    videoRef,
    cameraState,
    startCamera,
    stopCamera,
    toggleFacingMode,
    isTorchOn,
    isTorchAvailable,
    toggleTorch,
  } = useCamera();

  // Scanner state
  const [isScanningActive, setIsScanningActive] = useState(true);
  const [lastDetectedCode, setLastDetectedCode] = useState<DetectedCode | null>(null);
  const [activeLookupResult, setActiveLookupResult] = useState<LookupResult | null>(null);
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Success flash animation
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<ScannerSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      soundEnabled: true,
      vibrationEnabled: true,
      continuousScan: true,
      preferredMode: 'all',
    };
  });

  // Duplicate suppression ref: keeps timestamp of recently scanned codes to prevent spamming
  const recentCodesCooldownRef = useRef<Map<string, number>>(new Map());
  const scanLoopRef = useRef<number | null>(null);
  const isProcessingFrameRef = useRef(false);

  // Persist settings
  const updateSettings = (updates: Partial<ScannerSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Start camera on mount
  useEffect(() => {
    startCamera('environment');
    return () => {
      stopCamera();
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
      }
    };
  }, [startCamera, stopCamera]);

  /**
   * Code detection loop running on active video frames
   */
  const processScanningLoop = useCallback(async () => {
    if (!isScanningActive || !videoRef.current || !cameraState.isStreaming) {
      scanLoopRef.current = requestAnimationFrame(() => {
        setTimeout(processScanningLoop, 150);
      });
      return;
    }

    if (isProcessingFrameRef.current) {
      scanLoopRef.current = requestAnimationFrame(() => {
        setTimeout(processScanningLoop, 100);
      });
      return;
    }

    try {
      isProcessingFrameRef.current = true;
      const detected = await codeDetector.detectFromVideo(videoRef.current);

      if (detected && detected.value) {
        const now = Date.now();
        const codeKey = `${detected.format}:${detected.value}`;
        const lastScanTime = recentCodesCooldownRef.current.get(codeKey) || 0;

        // Duplicate cooldown check (ignore same code within 1.8 seconds)
        if (now - lastScanTime > 1800) {
          recentCodesCooldownRef.current.set(codeKey, now);

          // Clean old entries from cooldown map
          for (const [k, time] of recentCodesCooldownRef.current.entries()) {
            if (now - time > 5000) {
              recentCodesCooldownRef.current.delete(k);
            }
          }

          // Handle successful detection
          handleCodeDetected(detected);
        }
      }
    } catch (err) {
      console.debug('Frame detection cycle error:', err);
    } finally {
      isProcessingFrameRef.current = false;
      if (isScanningActive) {
        scanLoopRef.current = requestAnimationFrame(() => {
          setTimeout(processScanningLoop, 120);
        });
      }
    }
  }, [isScanningActive, cameraState.isStreaming]);

  useEffect(() => {
    if (cameraState.isStreaming && isScanningActive) {
      scanLoopRef.current = requestAnimationFrame(processScanningLoop);
    }
    return () => {
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
      }
    };
  }, [cameraState.isStreaming, isScanningActive, processScanningLoop]);

  /**
   * Dispatches audio/haptic feedback, executes product lookup, and opens modal.
   */
  const handleCodeDetected = (code: DetectedCode) => {
    // 1. Audio & Haptic Feedback
    if (settings.soundEnabled) {
      playScanSuccessBeep();
    }
    if (settings.vibrationEnabled) {
      triggerScanVibrate();
    }

    // 2. Visual Success Flash
    setShowSuccessFlash(true);
    setTimeout(() => setShowSuccessFlash(false), 500);

    // 3. Pause active scanning loop
    setIsScanningActive(false);
    setLastDetectedCode(code);

    // 4. Product Lookup against existing inventory & catalog
    const lookup = lookupProductByCode(code);
    setActiveLookupResult(lookup);

    // 5. Append to session scan history
    setScanHistory((prev) => [
      {
        id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        code,
        matchedProduct: lookup.item,
        timestamp: Date.now(),
      },
      ...prev.slice(0, 49),
    ]);

    // 6. Open Barcode-to-Product Information Pipeline for barcodes (or QR without URL)
    if (code.type === 'barcode' || !code.isUrl) {
      setIsPipelineModalOpen(true);
    } else {
      setIsLookupModalOpen(true);
    }
  };

  /**
   * Resets scanner and re-arms detection loop
   */
  const handleScanNext = () => {
    setIsLookupModalOpen(false);
    setIsPipelineModalOpen(false);
    setActiveLookupResult(null);
    setLastDetectedCode(null);
    setIsScanningActive(true);
  };

  /**
   * Handles manual barcode/QR code submission
   */
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;

    const trimmed = manualCodeInput.trim();
    const simulatedCode: DetectedCode = {
      type: trimmed.length > 20 || trimmed.startsWith('http') ? 'qr' : 'barcode',
      format: trimmed.length === 13 ? 'EAN-13' : trimmed.length === 12 ? 'UPC-A' : 'Code 128',
      value: trimmed,
      raw_value: trimmed,
      confidence: 1.0,
      timestamp: Date.now(),
      isUrl: /^https?:\/\//i.test(trimmed),
    };

    setManualCodeInput('');
    setShowManualInput(false);
    handleCodeDetected(simulatedCode);
  };

  return (
    <div
      id="barcode-qr-scanner-viewport"
      className="relative w-full h-[580px] sm:h-[640px] bg-slate-950 rounded-2xl overflow-hidden flex flex-col border border-slate-800 shadow-2xl select-none"
    >
      {/* ================================================================= */}
      {/* 1. TOP CONTROL BAR                                                */}
      {/* ================================================================= */}
      <div className="absolute top-0 inset-x-0 z-30 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBackToMain && (
            <button
              id="btn-scanner-back"
              onClick={onBackToMain}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white border border-white/10 backdrop-blur-md transition-colors shadow-sm"
              title="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-white tracking-wide">
              Barcode & QR Scanner
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Torch / Flashlight Button */}
          {isTorchAvailable && (
            <button
              id="btn-toggle-torch"
              onClick={toggleTorch}
              className={`p-2.5 rounded-xl border backdrop-blur-md transition-all ${
                isTorchOn
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-400/30'
                  : 'bg-slate-900/80 text-white border-white/10 hover:bg-slate-800'
              }`}
              title={isTorchOn ? 'Turn Flashlight Off' : 'Turn Flashlight On'}
            >
              <Flashlight className="w-4 h-4" />
            </button>
          )}

          {/* Switch Camera Facing Mode */}
          <button
            id="btn-toggle-camera-facing"
            onClick={toggleFacingMode}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white border border-white/10 backdrop-blur-md transition-colors shadow-sm"
            title="Switch Camera (Front/Rear)"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>

          {/* Scan History Button */}
          <button
            id="btn-open-scan-history"
            onClick={() => setIsHistoryDrawerOpen(true)}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white border border-white/10 backdrop-blur-md transition-colors shadow-sm relative"
            title="Scan History"
          >
            <History className="w-4 h-4" />
            {scanHistory.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center">
                {scanHistory.length}
              </span>
            )}
          </button>

          {/* Settings Toggle */}
          <button
            id="btn-toggle-scanner-settings"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-2.5 rounded-xl border backdrop-blur-md transition-colors ${
              isSettingsOpen
                ? 'bg-indigo-600 text-white border-indigo-400'
                : 'bg-slate-900/80 text-white border-white/10 hover:bg-slate-800'
            }`}
            title="Scanner Preferences"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 2. SETTINGS OVERLAY DROPDOWN                                      */}
      {/* ================================================================= */}
      {isSettingsOpen && (
        <div
          id="scanner-settings-dropdown"
          className="absolute top-16 right-4 z-40 w-72 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-white/15 p-3.5 shadow-2xl text-xs text-white space-y-3 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-bold text-slate-200">Scanner Preferences</span>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Sound Toggle */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-300">
              {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              <span>Beep Sound</span>
            </span>
            <button
              id="btn-toggle-setting-sound"
              onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                settings.soundEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.soundEnabled ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Vibration Toggle */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-300">
              {settings.vibrationEnabled ? <Vibrate className="w-4 h-4 text-emerald-400" /> : <VibrateOff className="w-4 h-4 text-slate-500" />}
              <span>Haptic Vibration</span>
            </span>
            <button
              id="btn-toggle-setting-vibration"
              onClick={() => updateSettings({ vibrationEnabled: !settings.vibrationEnabled })}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                settings.vibrationEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.vibrationEnabled ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Continuous Scan */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-300">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Continuous Scan</span>
            </span>
            <button
              id="btn-toggle-setting-continuous"
              onClick={() => updateSettings({ continuousScan: !settings.continuousScan })}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                settings.continuousScan ? 'bg-indigo-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.continuousScan ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. LIVE CAMERA VIEWPORT & SCAN RETICLE                            */}
      {/* ================================================================= */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {/* Real Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Permission Denied or Camera Error State */}
        {cameraState.error && (
          <div className="absolute inset-0 z-20 bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h4 className="text-base font-bold text-white">Camera Access Required</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {cameraState.error}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                id="btn-retry-camera-perm"
                onClick={() => startCamera('environment')}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Camera</span>
              </button>
              <button
                id="btn-manual-code-fallback"
                onClick={() => setShowManualInput(true)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-all"
              >
                <Keyboard className="w-4 h-4" />
                <span>Enter Code Manually</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* SCANNING RETICLE & LASER LINE                                  */}
        {/* ============================================================= */}
        {cameraState.isStreaming && (
          <div className="relative z-10 pointer-events-none flex flex-col items-center justify-center">
            {/* Target Reticle Box */}
            <div
              className={`relative w-64 sm:w-80 h-44 sm:h-52 rounded-2xl transition-all duration-300 ${
                showSuccessFlash
                  ? 'border-4 border-emerald-400 bg-emerald-500/20 shadow-[0_0_40px_rgba(52,211,153,0.6)]'
                  : isScanningActive
                  ? 'border-2 border-white/60 shadow-[0_0_25px_rgba(0,0,0,0.5)]'
                  : 'border-2 border-amber-400/80 bg-amber-500/10'
              }`}
            >
              {/* Corner Brackets */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />

              {/* Animated Laser Scanning Line */}
              {isScanningActive && (
                <div
                  className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-[scannerBeam_2s_ease-in-out_infinite]"
                  style={{
                    animation: 'scannerBeam 2s ease-in-out infinite',
                  }}
                />
              )}

              {/* Center Crosshairs */}
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <div className="w-6 h-0.5 bg-white" />
                <div className="h-6 w-0.5 bg-white absolute" />
              </div>
            </div>

            {/* Subtitle / User Guidance Prompt */}
            <div className="mt-4 px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[11px] font-medium text-slate-200 text-center shadow-lg">
              {isScanningActive ? (
                <span>Align barcode or QR code inside the frame</span>
              ) : (
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Code Detected
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* 4. MANUAL INPUT MODAL                                             */}
      {/* ================================================================= */}
      {showManualInput && (
        <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleManualSubmit}
            className="w-full max-w-sm bg-slate-900 border border-white/15 rounded-2xl p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-indigo-400" />
                <span>Enter Barcode or Code</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowManualInput(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="input-manual-barcode-val" className="text-xs text-slate-300">
                Barcode / SKU / QR Value
              </label>
              <input
                id="input-manual-barcode-val"
                type="text"
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value)}
                placeholder="e.g. 8901030829871"
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Quick Demo Test Barcodes */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Quick Test Codes:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setManualCodeInput('8901030829871')}
                  className="text-[10px] font-mono px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700"
                >
                  Face Wash (8901030829871)
                </button>
                <button
                  type="button"
                  onClick={() => setManualCodeInput('012000000133')}
                  className="text-[10px] font-mono px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700"
                >
                  Pepsi (012000000133)
                </button>
                <button
                  type="button"
                  onClick={() => setManualCodeInput('049000050116')}
                  className="text-[10px] font-mono px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700"
                >
                  Coca-Cola (049000050116)
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowManualInput(false)}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md"
              >
                Search & Lookup
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================================================================= */}
      {/* 5. BOTTOM BAR CONTROLS & AI VISION PIPELINE BRIDGE               */}
      {/* ================================================================= */}
      <div className="p-4 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col sm:flex-row items-center justify-between gap-3 z-30">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            id="btn-open-manual-code-modal"
            onClick={() => setShowManualInput(true)}
            className="flex-1 sm:flex-none py-2.5 px-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-white/10 backdrop-blur-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Keyboard className="w-4 h-4 text-slate-400" />
            <span>Enter Code</span>
          </button>

          {!isScanningActive && (
            <button
              id="btn-rearm-scanner"
              onClick={handleScanNext}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-emerald-600/30"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Scan Again</span>
            </button>
          )}
        </div>

        {/* Bridge Button to AI Vision Multi-Photo Document/Label Extraction */}
        <button
          id="btn-bridge-to-ai-vision"
          onClick={() => onSwitchToAiVision()}
          className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-98"
        >
          <Sparkles className="w-4 h-4" />
          <span>Switch to AI Label Vision</span>
        </button>
      </div>

      {/* Barcode-to-Product Information Pipeline Modal */}
      <BarcodeToProductPipelineModal
        isOpen={isPipelineModalOpen}
        detectedCode={lastDetectedCode}
        onClose={() => {
          setIsPipelineModalOpen(false);
          setIsScanningActive(true);
        }}
        onScanNext={handleScanNext}
        onProductSaved={(savedItem) => {
          setIsPipelineModalOpen(false);
          setIsScanningActive(true);
        }}
        onSwitchToFullAiVision={(barcodeVal) => {
          setIsPipelineModalOpen(false);
          onSwitchToAiVision(barcodeVal);
        }}
        onOpenManualEntryWithBarcode={(barcodeVal) => {
          setIsPipelineModalOpen(false);
          onOpenProductFormWithData({ barcode: barcodeVal });
        }}
      />

      {/* Product Lookup Modal */}
      <ProductLookupModal
        isOpen={isLookupModalOpen}
        lookupResult={activeLookupResult}
        onClose={() => {
          setIsLookupModalOpen(false);
          setIsScanningActive(true);
        }}
        onScanNext={handleScanNext}
        onAddStock={(id, qty) => {
          onAddStock(id, qty);
        }}
        onOpenProductFormWithData={(data) => {
          setIsLookupModalOpen(false);
          onOpenProductFormWithData(data);
        }}
        onScanLabelWithAi={(barcodeVal) => {
          setIsLookupModalOpen(false);
          onSwitchToAiVision(barcodeVal);
        }}
        onNavigateToCatalog={onNavigateToCatalog}
      />

      {/* Scan History Drawer */}
      <ScanHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        history={scanHistory}
        onClose={() => setIsHistoryDrawerOpen(false)}
        onClearHistory={() => setScanHistory([])}
        onSelectHistoryItem={(item) => {
          setIsHistoryDrawerOpen(false);
          const lookup = lookupProductByCode(item.code);
          setActiveLookupResult(lookup);
          setIsLookupModalOpen(true);
        }}
      />

      {/* Global CSS animation for laser scan line */}
      <style>{`
        @keyframes scannerBeam {
          0% { top: 6%; opacity: 0.8; }
          50% { top: 88%; opacity: 1; }
          100% { top: 6%; opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};
