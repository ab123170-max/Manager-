/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Loader2,
  Sparkles,
  CheckCircle,
  AlertCircle,
  FileSearch,
  Key,
  Layers,
  Cpu,
  ShieldAlert,
} from 'lucide-react';
import { GEMINI_MODEL } from '../config/model';

interface ProcessingStateProps {
  imagePreview: string | null;
  error?: string | null;
  onRetry?: () => void;
  onCancel?: () => void;
}

export const ProcessingState: React.FC<ProcessingStateProps> = ({
  imagePreview,
  error,
  onRetry,
  onCancel,
}) => {
  const [activeStep, setActiveStep] = useState(0);

  // Reflects the full scanner pipeline specified in prompt requirement 6
  const pipelineSteps = [
    { title: 'OpenCV Preprocessing', desc: 'Grayscale & contrast enhancement' },
    { title: 'Local OCR Extraction', desc: 'Analyzing local character & date cues' },
    { title: `Gemini 3.7 Vision Supervisor`, desc: `Auditing OCR via model '${GEMINI_MODEL}'` },
    { title: 'Structured Field Mapping', desc: 'Resolving SKU, batch, dates & confidence' },
    { title: 'Validation & Auto-Fill', desc: 'Applying strict zero-hallucination rules' },
  ];

  useEffect(() => {
    if (error) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev < pipelineSteps.length - 1 ? prev + 1 : prev));
    }, 1200);
    return () => clearInterval(interval);
  }, [error, pipelineSteps.length]);

  if (error) {
    const isApiKeyError = /\b(api[_\s-]?key|unauthenticated|unauthorized|permission_denied)\b/i.test(error);
    const isRateLimit = /\b(rate[_\s-]?limit|quota|resource_exhausted)\b/i.test(error);
    const isHighDemand = /\b(high demand|temporarily unavailable|service unavailable)\b/i.test(error);
    const isModelError = /\b(model|unexpected model name format|invalid_model)\b/i.test(error);

    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-lg mx-auto shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center mb-4">
          {isApiKeyError ? (
            <Key className="w-7 h-7" />
          ) : isRateLimit || isHighDemand ? (
            <ShieldAlert className="w-7 h-7" />
          ) : (
            <AlertCircle className="w-7 h-7" />
          )}
        </div>

        <h3 className="text-base font-bold text-slate-900 mb-1">
          {isApiKeyError
            ? 'API Key Configuration Required'
            : isRateLimit
            ? 'Rate Limit / Quota Exceeded'
            : isHighDemand
            ? 'Model Experiencing High Demand'
            : isModelError
            ? 'Model Configuration Format Error'
            : 'Vision Extraction Failed'}
        </h3>

        <p className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-100 mb-6 text-left break-words leading-relaxed font-mono">
          {error}
        </p>

        {isApiKeyError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 text-left mb-6 space-y-1">
            <span className="font-bold flex items-center gap-1">
              <Key className="w-3.5 h-3.5" /> Remediation:
            </span>
            <p className="text-[11px] text-amber-800">
              Ensure <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200">GEMINI_API_KEY</code> is set in your AI Studio Settings secrets panel or in your server environment.
            </p>
          </div>
        )}

        {isHighDemand && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 text-left mb-6 space-y-1">
            <span className="font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" /> Temporary Traffic Spike:
            </span>
            <p className="text-[11px] text-amber-800">
              Google Gemini servers are experiencing high traffic spikes. Automatic retries are active, or click below to retry immediately.
            </p>
          </div>
        )}

        {isRateLimit && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 text-left mb-6 space-y-1">
            <span className="font-bold flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700" /> Quota Info:
            </span>
            <p className="text-[11px] text-amber-800">
              The API quota limit has been temporarily reached. Wait 5-10 seconds before clicking Retry.
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Back to Camera
            </button>
          )}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
            >
              Retry Pipeline
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm text-center max-w-xl mx-auto space-y-6">
      {/* Animated Image Preview with Scan Line */}
      {imagePreview && (
        <div className="relative w-56 h-36 mx-auto rounded-xl overflow-hidden border border-slate-200 bg-slate-950 shadow-inner">
          <img
            src={imagePreview}
            alt="Scanning target"
            className="w-full h-full object-cover opacity-60"
          />
          {/* Animated laser scan line */}
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#22d3ee] animate-bounce" />
          <div className="absolute bottom-2 left-2 right-2 bg-slate-900/85 backdrop-blur rounded px-2.5 py-1 text-[11px] text-cyan-300 font-mono flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileSearch className="w-3 h-3 text-cyan-400" />
              Vision Supervisor
            </span>
            <span className="text-[10px] text-slate-400 font-sans">{GEMINI_MODEL}</span>
          </div>
        </div>
      )}

      {/* Spinner & Main Status */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mb-1">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
        <h3 className="text-base font-bold text-slate-900 flex items-center justify-center gap-2">
          <span>Processing Scanner Pipeline...</span>
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Executing OpenCV enhancement, OCR cue audit, and Gemini 3.7 structured extraction.
        </p>
      </div>

      {/* 5-Step Pipeline visualizer */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-left space-y-2.5 max-w-md mx-auto">
        {pipelineSteps.map((step, idx) => {
          const isDone = idx < activeStep;
          const isCurrent = idx === activeStep;
          return (
            <div
              key={step.title}
              className={`flex items-start gap-2.5 text-xs transition-opacity ${
                isDone
                  ? 'text-emerald-700 font-medium'
                  : isCurrent
                  ? 'text-indigo-600 font-semibold'
                  : 'text-slate-400'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-400">
                    {idx + 1}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-xs font-semibold">{step.title}</span>
                <span className="block text-[11px] text-slate-400 truncate">{step.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline transition-colors"
        >
          Cancel extraction
        </button>
      )}
    </div>
  );
};
