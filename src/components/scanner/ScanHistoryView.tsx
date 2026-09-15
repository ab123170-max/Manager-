/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  History,
  Barcode,
  QrCode,
  Trash2,
  Package,
  Calendar,
  ExternalLink,
  Search,
} from 'lucide-react';
import { ScanHistoryItem } from '../../types';
import { getScanHistory, clearScanHistory, subscribeToStore } from '../../utils/unifiedDataStore';

interface ScanHistoryViewProps {
  onSelectProduct?: (productId: string) => void;
}

export const ScanHistoryView: React.FC<ScanHistoryViewProps> = ({ onSelectProduct }) => {
  const [history, setHistory] = useState<ScanHistoryItem[]>(getScanHistory());
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    return subscribeToStore(() => {
      setHistory(getScanHistory());
    });
  }, []);

  const filteredHistory = history.filter((item) => {
    const val = item.code.value.toLowerCase();
    const name = item.matchedProduct?.productName?.toLowerCase() || '';
    const q = searchTerm.toLowerCase();
    return val.includes(q) || name.includes(q);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <History className="w-4 h-4" />
            <span>Audit &amp; Detection Log</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Scan History ({history.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Historical log of all real-time Barcode and QR code scans recorded during active sessions.
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={clearScanHistory}
            className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      {history.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search scanned values or product names..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      )}

      {/* History Items List */}
      {filteredHistory.length > 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
          {filteredHistory.map((item) => {
            const isQr = item.code.type === 'qr';
            const Icon = isQr ? QrCode : Barcode;

            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      isQr
                        ? 'bg-purple-50 text-purple-600 border border-purple-200'
                        : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900 truncate">
                        {item.code.value}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                        {item.code.format}
                      </span>
                    </div>

                    {item.matchedProduct ? (
                      <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                        <Package className="w-3.5 h-3.5" />
                        <span>{item.matchedProduct.productName} (Stock: {item.matchedProduct.stockQuantity})</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        No catalog match found
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                  </div>

                  {item.matchedProduct && onSelectProduct && (
                    <button
                      type="button"
                      onClick={() => onSelectProduct(item.matchedProduct!.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center gap-1"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
          <History className="w-12 h-12 mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-700">No Scans Recorded Yet</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Scan barcodes or QR codes from the Scanner section to build your real-time detection history.
          </p>
        </div>
      )}
    </div>
  );
};
