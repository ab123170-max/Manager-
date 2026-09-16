/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppHeader } from './components/navigation/AppHeader';
import { AndroidNavDrawer } from './components/navigation/AndroidNavDrawer';
import { AndroidBottomBar } from './components/navigation/AndroidBottomBar';
import { CameraViewport } from './components/CameraViewport';
import { ProcessingState } from './components/ProcessingState';
import { AutoFillForm } from './components/AutoFillForm';
import { PayloadModal } from './components/PayloadModal';
import { ScanInvoiceView } from './components/scanner/ScanInvoiceView';
import { ManualProductEntryView } from './components/scanner/ManualProductEntryView';
import { BarcodeScannerView } from './components/scanner/BarcodeScannerView';
import { QrScannerView } from './components/scanner/QrScannerView';
import { ScanHistoryView } from './components/scanner/ScanHistoryView';
import { InventoryOverviewView } from './components/inventory/InventoryOverviewView';
import { InventoryAccountingView } from './components/inventory/InventoryAccountingView';
import { StockInView } from './components/inventory/StockInView';
import { StockOutView } from './components/inventory/StockOutView';
import { LowStockView } from './components/inventory/LowStockView';
import { ExpiringSoonView } from './components/inventory/ExpiringSoonView';
import { ExpiredProductsView } from './components/inventory/ExpiredProductsView';
import { CategoriesView } from './components/inventory/CategoriesView';
import { InventoryReportsView } from './components/inventory/InventoryReportsView';
import { StockTransactionsLedgerView } from './components/inventory/StockTransactionsLedgerView';
import { MarketplaceContainer } from './components/marketplace/MarketplaceContainer';
import { SalesView } from './components/account/SalesView';
import { PurchasesView } from './components/account/PurchasesView';
import { ProfitLossView } from './components/account/ProfitLossView';
import { ExpensesView } from './components/account/ExpensesView';
import { IncomeView } from './components/account/IncomeView';
import { AccountSummaryView } from './components/account/AccountSummaryView';
import { extractFormDataFromImage } from './services/geminiService';
import {
  ExtractedFormData,
  ExtractionStage,
  SavedInventoryItem,
  AppNavigationState,
  MenuSection,
} from './types';
import { preprocessImageCanvas } from './utils/imagePreprocessing';
import {
  getProducts,
  getInventoryValuation,
  getScanHistory,
  subscribeToStore,
} from './utils/unifiedDataStore';
import { GEMINI_MODEL } from './config/model';
import {
  Boxes,
  FileSpreadsheet,
  HelpCircle,
  X,
  Sparkles,
  Cpu,
  Camera,
  Barcode as BarcodeIcon,
  Zap,
  Plus,
} from 'lucide-react';

export default function App() {
  // Navigation State
  const [navState, setNavState] = useState<AppNavigationState>({
    activeSection: 'scanner',
    activeSubView: 'scan_product',
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Scanner & AutoFill State
  const [prefilledBarcode, setPrefilledBarcode] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<SavedInventoryItem | null>(null);
  const [currentStage, setCurrentStage] = useState<ExtractionStage>('idle');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedFormData | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<ExtractedFormData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Selected item for POS/Sale or Product View
  const [posProduct, setPosProduct] = useState<SavedInventoryItem | null>(null);

  // Store metrics for badge counts
  const [products, setProducts] = useState(getProducts());
  const [valuation, setValuation] = useState(getInventoryValuation());
  const [scanHistory, setScanHistory] = useState(getScanHistory());

  useEffect(() => {
    return subscribeToStore(() => {
      setProducts(getProducts());
      setValuation(getInventoryValuation());
      setScanHistory(getScanHistory());
    });
  }, []);

  const handleNavigate = (
    section: MenuSection,
    subView: string
  ) => {
    setNavState({ activeSection: section, activeSubView: subView });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Pipeline Execution: Image -> Preprocess -> Gemini Vision
   */
  const handleImageSelected = async (imageBase64: string) => {
    setCapturedImage(imageBase64);
    setCurrentStage('processing');
    setExtractionError(null);

    try {
      const { enhancedDataUrl, cues } = await preprocessImageCanvas(imageBase64, {
        contrast: 1.25,
        sharpen: true,
      });

      if (prefilledBarcode && !cues.possibleBarcodes.includes(prefilledBarcode)) {
        cues.possibleBarcodes.unshift(prefilledBarcode);
      }

      const data = await extractFormDataFromImage(enhancedDataUrl, {
        localOcrCues: cues,
      });

      if (prefilledBarcode && !data.barcode) {
        data.barcode = prefilledBarcode;
      }

      setExtractedData(data);
      setCurrentStage('ready');
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Image extraction error:', error);
      setExtractionError(
        error.message ||
          'Failed to extract data. Please ensure the label image is clear and try again.'
      );
      setCurrentStage('error');
    }
  };

  const handleResetWorkflow = () => {
    setCapturedImage(null);
    setExtractedData(null);
    setExtractionError(null);
    setSubmittedData(null);
    setPrefilledBarcode(null);
    setIsModalOpen(false);
    setCurrentStage('idle');
  };

  const handleFormSubmit = (finalFormData: ExtractedFormData) => {
    setSubmittedData(finalFormData);
    setIsModalOpen(true);
  };

  const handleStartProductRegistration = (barcode: string) => {
    setPrefilledBarcode(barcode);
    handleNavigate('scanner', 'scan_product');
    setCurrentStage('idle');
  };

  const handleStartSaleForProduct = (product: SavedInventoryItem) => {
    setPosProduct(product);
    handleNavigate('account', 'sales');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans text-slate-900 pb-20 md:pb-8">
      {/* App Header */}
      <AppHeader
        activeSection={navState.activeSection}
        activeSubView={navState.activeSubView}
        onNavigate={handleNavigate}
        onToggleDrawer={() => setIsDrawerOpen(true)}
        inventoryCount={products.length}
        alertCount={valuation.lowStockCount + valuation.expiredCount + valuation.expiringSoonCount}
      />

      {/* Android Nav Drawer */}
      <AndroidNavDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeSection={navState.activeSection}
        activeSubView={navState.activeSubView}
        onNavigate={handleNavigate}
        counts={{
          products: products.length,
          lowStock: valuation.lowStockCount,
          expiring: valuation.expiringSoonCount,
          expired: valuation.expiredCount,
          scanHistory: scanHistory.length,
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ==================================================================== */}
        {/* SECTION 1: SCANNER VIEWS                                             */}
        {/* ==================================================================== */}

        {/* 1.1 Scan Product (AI Label & Vision Extraction) */}
        {navState.activeSection === 'scanner' && navState.activeSubView === 'scan_product' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> Model: {GEMINI_MODEL}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Gemini Vision Supervisor + Local OCR Active
                  </span>
                </div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {currentStage === 'ready'
                    ? 'Review & Modify Auto-Filled Product Data'
                    : currentStage === 'processing'
                    ? 'Vision Supervisor OCR & Mapping Engine'
                    : 'Product Label & Package Vision Scanner'}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Capture or upload product packaging to automatically extract and map MFD, Expiry, Batch, MRP, and SKU.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    handleNavigate('scanner', 'manual_entry');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
                  id="btn-scan-add-manual"
                >
                  <Plus className="w-4 h-4" />
                  <span>＋ Add Product Manually</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="p-2 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors"
                  title="Architecture Documentation"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stage Routing */}
            {currentStage === 'idle' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">Need direct entry without scanning?</h3>
                      <p className="text-[11px] text-slate-500">Add products with custom SKU, auto date calculations & stock details.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct(null);
                      handleNavigate('scanner', 'manual_entry');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>＋ Add Product Manually</span>
                  </button>
                </div>
                <CameraViewport onImageSelected={handleImageSelected} disabled={false} />
              </div>
            )}

            {currentStage === 'processing' && (
              <ProcessingState capturedImage={capturedImage} onCancel={handleResetWorkflow} />
            )}

            {currentStage === 'error' && (
              <div className="bg-white rounded-3xl p-8 border border-rose-200 shadow-sm text-center max-w-lg mx-auto space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <X className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Extraction Error</h3>
                  <p className="text-xs text-slate-600 mt-1">{extractionError}</p>
                </div>
                <button
                  type="button"
                  onClick={handleResetWorkflow}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  Try Another Image
                </button>
              </div>
            )}

            {currentStage === 'ready' && extractedData && (
              <AutoFillForm
                initialData={extractedData}
                imageThumbnail={capturedImage}
                onSubmit={handleFormSubmit}
                onReset={handleResetWorkflow}
              />
            )}
          </div>
        )}

        {/* 1.2 Scan Invoice */}
        {navState.activeSection === 'scanner' && navState.activeSubView === 'scan_invoice' && (
          <ScanInvoiceView
            onSuccess={() => handleNavigate('inventory', 'inventory_accounting')}
          />
        )}

        {/* 1.3 Barcode Scanner */}
        {navState.activeSection === 'scanner' && navState.activeSubView === 'barcode_scanner' && (
          <BarcodeScannerView
            onRegisterProduct={handleStartProductRegistration}
            onRecordSale={handleStartSaleForProduct}
            onViewProduct={() => handleNavigate('inventory', 'inventory')}
          />
        )}

        {/* 1.4 QR Scanner */}
        {navState.activeSection === 'scanner' && navState.activeSubView === 'qr_scanner' && (
          <QrScannerView
            onRegisterProduct={handleStartProductRegistration}
            onRecordSale={handleStartSaleForProduct}
          />
        )}

        {/* 1.5 Multiple Image Scan */}
        {navState.activeSection === 'scanner' && navState.activeSubView === 'multiple_image_scan' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Batch Multi-Package Scanner</h2>
              <p className="text-xs text-slate-500 mt-1">
                Scan multiple sides of product packaging (Front, Back, Nutrition, Dates) into a single unified record.
              </p>
            </div>
            <CameraViewport onImageSelected={handleImageSelected} disabled={false} />
          </div>
        )}

        {/* 1.6 Scan History */}
        {navState.activeSection === 'scanner' && navState.activeSubView === 'scan_history' && (
          <ScanHistoryView
            onSelectProduct={() => handleNavigate('inventory', 'inventory')}
          />
        )}

        {/* 1.7 Add / Edit Product Manually */}
        {navState.activeSection === 'scanner' && navState.activeSubView === 'manual_entry' && (
          <ManualProductEntryView
            existingProduct={editingProduct}
            initialBarcode={prefilledBarcode}
            onSaveSuccess={(saved) => {
              setEditingProduct(null);
              setPrefilledBarcode(null);
              handleNavigate('inventory', 'inventory');
            }}
            onCancel={() => {
              setEditingProduct(null);
              setPrefilledBarcode(null);
              handleNavigate('scanner', 'scan_product');
            }}
          />
        )}

        {/* ==================================================================== */}
        {/* SECTION 2: INVENTORY VIEWS                                           */}
        {/* ==================================================================== */}

        {/* 2.1 & 2.3 Inventory Overview & Products */}
        {navState.activeSection === 'inventory' &&
          (navState.activeSubView === 'inventory' || navState.activeSubView === 'products') && (
            <InventoryOverviewView
              onAddProduct={() => {
                setEditingProduct(null);
                handleNavigate('scanner', 'manual_entry');
              }}
              onEditProduct={(prod) => {
                setEditingProduct(prod);
                handleNavigate('scanner', 'manual_entry');
              }}
              onStockIn={() => handleNavigate('inventory', 'stock_in')}
              onRecordSale={handleStartSaleForProduct}
              onNavigateSection={handleNavigate}
            />
          )}

        {/* 2.2 Inventory Accounting */}
        {navState.activeSection === 'inventory' &&
          navState.activeSubView === 'inventory_accounting' && <InventoryAccountingView />}

        {/* 2.4 Stock In */}
        {navState.activeSection === 'inventory' &&
          navState.activeSubView === 'stock_in' && <StockInView />}

        {/* 2.5 Stock Out */}
        {navState.activeSection === 'inventory' &&
          navState.activeSubView === 'stock_out' && <StockOutView />}

        {/* 2.5.1 Stock Transactions Ledger (Standardized Stock Transaction Engine) */}
        {navState.activeSection === 'inventory' &&
          navState.activeSubView === 'stock_ledger' && <StockTransactionsLedgerView />}

        {/* 2.6 Low Stock */}
        {navState.activeSection === 'inventory' &&
          navState.activeSubView === 'low_stock' && (
            <LowStockView onStockIn={() => handleNavigate('inventory', 'stock_in')} />
          )}

        {/* 2.7 Expiring Soon */}
        {navState.activeSection === 'inventory' &&
          navState.activeSubView === 'expiring_soon' && (
            <ExpiringSoonView onRecordSale={handleStartSaleForProduct} />
          )}

        {/* 2.8 Expired Products */}
        {navState.activeSection === 'inventory' &&
          navState.activeSubView === 'expired_products' && <ExpiredProductsView />}

        {/* 2.9 Categories */}
        {navState.activeSection === 'inventory' &&
          navState.activeSubView === 'categories' && <CategoriesView />}

        {/* 2.10 Inventory Reports */}
        {navState.activeSection === 'inventory' &&
          navState.activeSubView === 'inventory_reports' && <InventoryReportsView />}

        {/* ==================================================================== */}
        {/* SECTION 3: MARKETPLACE & SOCIAL COMMERCE                             */}
        {/* ==================================================================== */}
        {navState.activeSection === 'marketplace' && (
          <MarketplaceContainer
            initialSubView={
              navState.activeSubView === 'marketplace_listings' || navState.activeSubView === 'listings'
                ? 'listings'
                : navState.activeSubView === 'marketplace_create_listing' || navState.activeSubView === 'create_listing'
                ? 'create_listing'
                : navState.activeSubView === 'marketplace_orders' || navState.activeSubView === 'orders'
                ? 'orders'
                : navState.activeSubView === 'marketplace_social_hub' || navState.activeSubView === 'social_channels'
                ? 'social_channels'
                : navState.activeSubView === 'marketplace_settings' || navState.activeSubView === 'settings'
                ? 'settings'
                : 'dashboard'
            }
          />
        )}

        {/* ==================================================================== */}
        {/* SECTION 4: ACCOUNT VIEWS                                             */}
        {/* ==================================================================== */}

        {/* 3.1 Sales */}
        {navState.activeSection === 'account' && navState.activeSubView === 'sales' && (
          <SalesView initialProduct={posProduct} />
        )}

        {/* 3.2 Purchases */}
        {navState.activeSection === 'account' && navState.activeSubView === 'purchases' && (
          <PurchasesView />
        )}

        {/* 3.3 & 3.4 Profit & Loss */}
        {navState.activeSection === 'account' &&
          (navState.activeSubView === 'profit' || navState.activeSubView === 'loss') && (
            <ProfitLossView />
          )}

        {/* 3.5 Expenses */}
        {navState.activeSection === 'account' && navState.activeSubView === 'expenses' && (
          <ExpensesView />
        )}

        {/* 3.6 Income */}
        {navState.activeSection === 'account' && navState.activeSubView === 'income' && (
          <IncomeView />
        )}

        {/* Account Summary & Financial Reports */}
        {navState.activeSection === 'account' &&
          (navState.activeSubView === 'account_summary' ||
            navState.activeSubView === 'financial_reports') && <AccountSummaryView />}
      </main>

      {/* Android Bottom Navigation Bar for Mobile */}
      <AndroidBottomBar
        activeSection={navState.activeSection}
        activeSubView={navState.activeSubView}
        onNavigate={handleNavigate}
        onOpenDrawer={() => setIsDrawerOpen(true)}
      />

      {/* Payload Modal */}
      <PayloadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        formData={submittedData}
      />

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-black text-slate-900">System Architecture</h3>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>
                <strong>SmartStock AI</strong> incorporates high-speed local 1D/2D Barcode/QR scanning with Gemini 3.7 Vision OCR intelligence.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Scanner:</strong> Extract MFD, EXP, Batch, and MRP from labels, or scan multi-item wholesale purchase invoices.</li>
                <li><strong>Inventory:</strong> Real-time valuation, stock-in/out tracking, low stock warnings, and expiry date safety alerts.</li>
                <li><strong>Account:</strong> POS customer checkouts, vendor purchases, operating expenses, and double-entry profit &amp; loss statements.</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
