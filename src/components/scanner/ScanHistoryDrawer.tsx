/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { History, Barcode, QrCode, Trash2, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { ScanHistoryItem } from '../../types';

interface ScanHistoryDrawerProps {
  history: ScanHistoryItem[];
  isOpen: boolean;
  onClose: () => void;
  onClearHistory: () => void;
  onSelectHistoryItem: (item: ScanHistoryItem) => void;
}

export const ScanHistoryDrawer: React.FC<ScanHistoryDrawerProps> = ({
  history,
  isOpen,
  onClose,
  onClearHistory,
  onSelectHistoryItem,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="scan-history-drawer-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="scan-history-drawer-panel"
        className="w-full max-w-md h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">Session Scan History</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {history.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {history.length > 0 && (
              <button
                id="btn-clear-scan-history"
                onClick={onClearHistory}
                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Clear History"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
            <button
              id="btn-close-scan-history"
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* History List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {history.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <History className="w-10 h-10 mx-auto stroke-[1.5] text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No scans recorded in this session</p>
              <p className="text-[11px] text-slate-400 max-w-[240px] mx-auto">
                Barcodes and QR codes you scan will appear here with instant lookup history.
              </p>
            </div>
          ) : (
            history.map((item) => {
              const isQr = item.code.type === 'qr';
              const timeString = new Date(item.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectHistoryItem(item)}
                  className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition-all space-y-1.5 group"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 font-semibold text-slate-500">
                      {isQr ? <QrCode className="w-3.5 h-3.5 text-indigo-600" /> : <Barcode className="w-3.5 h-3.5 text-sky-600" />}
                      <span>{item.code.format}</span>
                    </span>
                    <span className="text-slate-400">{timeString}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono font-bold text-xs text-slate-800 truncate">
                      {item.matchedProduct ? item.matchedProduct.productName : item.code.value}
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 transition-colors shrink-0" />
                  </div>

                  {item.matchedProduct ? (
                    <div className="flex items-center gap-2 text-[10px] text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Matched in inventory • Stock: {item.matchedProduct.stockQuantity ?? 1}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[10px] text-amber-700 font-medium">
                      <AlertCircle className="w-3 h-3" />
                      <span>New product / Not in catalog</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
