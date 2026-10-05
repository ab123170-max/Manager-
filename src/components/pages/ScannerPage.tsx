/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Camera,
  Barcode,
  QrCode,
  Plus,
  History,
  RotateCcw,
  X,
  PlusCircle,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ExtractionStage,
  ExtractedFormData,
  ProductScanResult,
  SavedInventoryItem,
} from '../../types';
import { MultiShotProductScanner } from '../scanner/MultiShotProductScanner';
import { BarcodeScannerView } from '../scanner/BarcodeScannerView';
import { QrScannerView } from '../scanner/QrScannerView';
import { ManualProductEntryView } from '../scanner/ManualProductEntryView';
import { ScanHistoryView } from '../scanner/ScanHistoryView';
import { AutoFillForm } from '../AutoFillForm';
import { ProcessingState } from '../ProcessingState';

interface ScannerPageProps {
  activeSubView: string;
  currentStage: ExtractionStage;
  capturedImage: string | null;
  capturedImages: string[];
  extractionError: string | null;
  isFormExtracting: boolean;
  productScanResult: ProductScanResult | null;
  extractedData: ExtractedFormData | null;
  editingProduct: SavedInventoryItem | null;
  prefilledBarcode: string | null;
  onSelectSubView: (subView: string) => void;
  onMultiShotAnalyze: (images: string[]) => void;
  onResetWorkflow: () => void;
  onRetryExtraction: () => void;
  onFormSubmit: (data: ExtractedFormData) => void;
  onRegisterBarcodeProduct: (barcode: string) => void;
  onRecordSale: (product: SavedInventoryItem) => void;
  onViewInventory: () => void;
  onManualSaveSuccess: (saved: SavedInventoryItem) => void;
}

export const ScannerPage: React.FC<ScannerPageProps> = ({
  activeSubView,
  currentStage,
  capturedImage,
  capturedImages,
  extractionError,
  isFormExtracting,
  productScanResult,
  extractedData,
  editingProduct,
  prefilledBarcode,
  onSelectSubView,
  onMultiShotAnalyze,
  onResetWorkflow,
  onRetryExtraction,
  onFormSubmit,
  onRegisterBarcodeProduct,
  onRecordSale,
  onViewInventory,
  onManualSaveSuccess,
}) => {
  const isAiScannerView =
    activeSubView === 'scan_product' ||
    !['barcode_scanner', 'qr_scanner', 'multi_scan', 'multiple_image_scan', 'scan_history', 'manual_entry'].includes(activeSubView);

  return (
    <div className="space-y-4 font-sans text-slate-900 pb-2">
      {/* 1. Scanner Sub-View Selector Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200/90 shadow-2xs flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => onSelectSubView('scan_product')}
          className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
            isAiScannerView
              ? 'bg-[#1473EA] text-white shadow-xs'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Scanner</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectSubView('barcode_scanner')}
          className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
            activeSubView === 'barcode_scanner'
              ? 'bg-[#1473EA] text-white shadow-xs'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
          }`}
        >
          <Barcode className="w-3.5 h-3.5" />
          <span>Barcode</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectSubView('qr_scanner')}
          className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
            activeSubView === 'qr_scanner'
              ? 'bg-[#1473EA] text-white shadow-xs'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>QR Code</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectSubView('manual_entry')}
          className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
            activeSubView === 'manual_entry'
              ? 'bg-[#1473EA] text-white shadow-xs'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Manual Entry</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectSubView('scan_history')}
          className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
            activeSubView === 'scan_history'
              ? 'bg-[#1473EA] text-white shadow-xs'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>History</span>
        </button>
      </div>

      {/* 2. Active Scanner Sub-View Execution */}
      {isAiScannerView && (
        <div className="space-y-4">
          {currentStage === 'idle' && (
            <div className="space-y-4">
              <MultiShotProductScanner onAnalyze={onMultiShotAnalyze} disabled={false} />
            </div>
          )}

          {currentStage === 'processing' && (
            <ProcessingState
              imagePreview={capturedImage}
              onCancel={onResetWorkflow}
            />
          )}

          {currentStage === 'error' && (
            <div className="bg-white rounded-3xl p-6 border border-rose-200 shadow-2xs text-center max-w-lg mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <X className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Extraction Failed</h3>
                <p className="text-xs text-slate-600 mt-1">{extractionError}</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                {capturedImages.length > 0 && (
                  <button
                    type="button"
                    onClick={onRetryExtraction}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry Extraction</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onResetWorkflow}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Change Photos
                </button>
              </div>
            </div>
          )}

          {currentStage === 'ready' && (productScanResult || extractedData) && (
            <AutoFillForm
              initialData={(productScanResult || extractedData)!}
              imageThumbnail={capturedImage}
              capturedImages={capturedImages}
              isExtracting={isFormExtracting}
              onSubmit={onFormSubmit}
              onRetake={onResetWorkflow}
              onCleanupImages={onResetWorkflow}
            />
          )}
        </div>
      )}

      {activeSubView === 'barcode_scanner' && (
        <BarcodeScannerView
          onRegisterProduct={onRegisterBarcodeProduct}
          onRecordSale={onRecordSale}
          onViewProduct={onViewInventory}
        />
      )}

      {activeSubView === 'qr_scanner' && (
        <QrScannerView
          onRegisterProduct={onRegisterBarcodeProduct}
          onRecordSale={onRecordSale}
        />
      )}

      {activeSubView === 'scan_history' && (
        <ScanHistoryView onSelectProduct={onViewInventory} />
      )}

      {activeSubView === 'manual_entry' && (
        <ManualProductEntryView
          existingProduct={editingProduct}
          initialBarcode={prefilledBarcode}
          onSaveSuccess={onManualSaveSuccess}
          onCancel={onResetWorkflow}
        />
      )}
    </div>
  );
};

export default ScannerPage;
