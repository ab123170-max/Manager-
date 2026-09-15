/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckCircle,
  Copy,
  Download,
  X,
  Code2,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { ExtractedFormData } from '../types';

interface PayloadModalProps {
  isOpen: boolean;
  data: ExtractedFormData | null;
  onClose: () => void;
  onResetWorkflow: () => void;
}

export const PayloadModal: React.FC<PayloadModalProps> = ({
  isOpen,
  data,
  onClose,
  onResetWorkflow,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !data) return null;

  // Clean payload format without internal IDs for production consumption
  const cleanPayload = {
    submissionTimestamp: new Date().toISOString(),
    documentClassification: data.documentType,
    verifiedData: {
      fullName: data.fullName,
      documentNumber: data.documentNumber,
      dateOfBirth: data.dateOfBirth,
      issueDate: data.issueDate,
      expiryDate: data.expiryDate,
      email: data.email,
      phone: data.phone,
      address: data.address,
      organization: data.organization,
      nationality: data.nationality,
      notesOrAdditional: data.notesOrAdditional,
    },
    customAttributes: data.customFields.reduce((acc, curr) => {
      if (curr.key) acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>),
    aiMetadata: {
      model: 'gemini-3.8-flash',
      confidenceScore: data.confidenceScore,
    },
  };

  const jsonString = JSON.stringify(cleanPayload, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `form-payload-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Form Submission Payload
              </h3>
              <p className="text-xs text-slate-500">
                Structured JSON output generated from image OCR and user review
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: JSON Viewer */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-500 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-slate-400" />
              payload.json
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Copied!' : 'Copy JSON'}
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                <Download className="w-3 h-3" />
                Download File
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
            {jsonString}
          </pre>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-800">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              This verified JSON payload is ready to be dispatched to your backend database, CRM, KYC identity provider, or webhook destination.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onResetWorkflow}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Start New Auto-Fill
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
