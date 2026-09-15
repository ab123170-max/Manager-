/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ScanText, Camera, Cpu, CheckCircle2, ShieldCheck, Boxes, Sparkles } from 'lucide-react';
import { ExtractionStage } from '../types';

interface HeaderProps {
  currentStage: ExtractionStage;
  hasCapturedImage: boolean;
  hasExtractedData: boolean;
  onReset: () => void;
  activeTab: 'scanner' | 'catalog';
  onTabChange: (tab: 'scanner' | 'catalog') => void;
  catalogCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentStage,
  hasCapturedImage,
  hasExtractedData,
  onReset,
  activeTab,
  onTabChange,
  catalogCount,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Brand & App Identity */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <ScanText className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  SmartStock AI
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" />
                  Gemini 3.8
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                AI Product Scanner &amp; Product Catalog Manager
              </p>
            </div>
          </div>

          {/* Navigation Pill on Mobile */}
          <div className="flex md:hidden items-center bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => onTabChange('scanner')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'scanner'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Scanner
            </button>
            <button
              type="button"
              onClick={() => onTabChange('catalog')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'catalog'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Catalog
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-50 text-indigo-700 font-extrabold">
                {catalogCount}
              </span>
            </button>
          </div>
        </div>

        {/* Center / Right: Desktop Tab Navigation & Pipeline Step Indicators */}
        <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap">
          {/* Main Desktop Tabs */}
          <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => onTabChange('scanner')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'scanner'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Scanner</span>
            </button>
            <button
              type="button"
              onClick={() => onTabChange('catalog')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'catalog'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Boxes className="w-3.5 h-3.5 text-indigo-600" />
              <span>Product Catalog</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-extrabold">
                {catalogCount}
              </span>
            </button>
          </div>

          {/* Scanner Step Indicators (when in scanner tab) */}
          {activeTab === 'scanner' && (
            <div className="flex items-center gap-1 sm:gap-1.5 text-xs">
              {/* Step 1 */}
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  currentStage === 'idle' || currentStage === 'capturing'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : hasCapturedImage
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <span>1. Capture</span>
              </div>

              <span className="text-slate-300 font-bold text-[10px]">→</span>

              {/* Step 2 */}
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  currentStage === 'processing'
                    ? 'bg-indigo-600 text-white shadow-2xs animate-pulse'
                    : hasExtractedData
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <span>2. AI Extract</span>
              </div>

              <span className="text-slate-300 font-bold text-[10px]">→</span>

              {/* Step 3 */}
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  currentStage === 'ready'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <span>3. Save Catalog</span>
              </div>

              {(hasCapturedImage || hasExtractedData) && (
                <button
                  type="button"
                  onClick={onReset}
                  className="ml-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors"
                  title="Reset workflow to start over"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

