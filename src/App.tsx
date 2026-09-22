/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AppHeader } from './components/navigation/AppHeader';
import { AndroidNavDrawer } from './components/navigation/AndroidNavDrawer';
import { ViewLoadingSkeleton } from './components/common/ViewLoadingSkeleton';
import { extractProduct5FieldsFromImages, extractFormDataFromImage } from './services/geminiService';
import {
  ExtractedFormData,
  ExtractionStage,
  SavedInventoryItem,
  AppNavigationState,
  MenuSection,
  ProductScanResult,
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
  HelpCircle,
  X,
  Sparkles,
  Cpu,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { tempImageManager } from './utils/smartLabelCropper';
import { ToastContainer } from './components/common/ToastContainer';
import { SeoLandingContent } from './components/seo/SeoLandingContent';
import { AppFooter } from './components/navigation/AppFooter';
import { HomeScreenActiveExpiryAlerts } from './components/scanner/HomeScreenActiveExpiryAlerts';
import { expiryAlertManager } from './utils/expiryAlertManager';

// ============================================================================
// CODE-SPLIT / LAZY-LOADED HEAVY VIEW CHUNKS
// ============================================================================
const CameraViewport = lazy(() =>
  import('./components/CameraViewport').then((m) => ({ default: m.CameraViewport }))
);
const MultiShotProductScanner = lazy(() =>
  import('./components/scanner/MultiShotProductScanner').then((m) => ({
    default: m.MultiShotProductScanner,
  }))
);
const AutoFillForm = lazy(() =>
  import('./components/AutoFillForm').then((m) => ({ default: m.AutoFillForm }))
);
const ProcessingState = lazy(() =>
  import('./components/ProcessingState').then((m) => ({ default: m.ProcessingState }))
);
const PayloadModal = lazy(() =>
  import('./components/PayloadModal').then((m) => ({ default: m.PayloadModal }))
);
const ManualProductEntryView = lazy(() =>
  import('./components/scanner/ManualProductEntryView').then((m) => ({
    default: m.ManualProductEntryView,
  }))
);
const BarcodeScannerView = lazy(() =>
  import('./components/scanner/BarcodeScannerView').then((m) => ({
    default: m.BarcodeScannerView,
  }))
);
const QrScannerView = lazy(() =>
  import('./components/scanner/QrScannerView').then((m) => ({ default: m.QrScannerView }))
);
const ScanHistoryView = lazy(() =>
  import('./components/scanner/ScanHistoryView').then((m) => ({ default: m.ScanHistoryView }))
);
const InventoryOverviewView = lazy(() =>
  import('./components/inventory/InventoryOverviewView').then((m) => ({
    default: m.InventoryOverviewView,
  }))
);
const InventoryAccountingView = lazy(() =>
  import('./components/inventory/InventoryAccountingView').then((m) => ({
    default: m.InventoryAccountingView,
  }))
);
const StockInView = lazy(() =>
  import('./components/inventory/StockInView').then((m) => ({ default: m.StockInView }))
);
const StockOutView = lazy(() =>
  import('./components/inventory/StockOutView').then((m) => ({ default: m.StockOutView }))
);
const LowStockView = lazy(() =>
  import('./components/inventory/LowStockView').then((m) => ({ default: m.LowStockView }))
);
const ExpiringSoonView = lazy(() =>
  import('./components/inventory/ExpiringSoonView').then((m) => ({
    default: m.ExpiringSoonView,
  }))
);
const ExpiredProductsView = lazy(() =>
  import('./components/inventory/ExpiredProductsView').then((m) => ({
    default: m.ExpiredProductsView,
  }))
);
const ExpiryAlertsView = lazy(() =>
  import('./components/inventory/ExpiryAlertsView').then((m) => ({
    default: m.ExpiryAlertsView,
  }))
);
const CategoriesView = lazy(() =>
  import('./components/inventory/CategoriesView').then((m) => ({ default: m.CategoriesView }))
);
const InventoryReportsView = lazy(() =>
  import('./components/inventory/InventoryReportsView').then((m) => ({
    default: m.InventoryReportsView,
  }))
);
const StockTransactionsLedgerView = lazy(() =>
  import('./components/inventory/StockTransactionsLedgerView').then((m) => ({
    default: m.StockTransactionsLedgerView,
  }))
);
const InventoryTurnoverView = lazy(() =>
  import('./components/inventory/InventoryTurnoverView').then((m) => ({
    default: m.InventoryTurnoverView,
  }))
);
const ProductReputationView = lazy(() =>
  import('./components/inventory/ProductReputationView').then((m) => ({
    default: m.ProductReputationView,
  }))
);

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
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedFormData | null>(null);
  const [productScanResult, setProductScanResult] = useState<ProductScanResult | null>(null);
  const [isFormExtracting, setIsFormExtracting] = useState(false);
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
  const [activeExpiryAlertsCount, setActiveExpiryAlertsCount] = useState<number>(() =>
    expiryAlertManager.getActiveCount()
  );

  useEffect(() => {
    const unsubStore = subscribeToStore(() => {
      setProducts(getProducts());
      setValuation(getInventoryValuation());
      setScanHistory(getScanHistory());
    });
    const unsubAlerts = expiryAlertManager.subscribeAlerts((alerts) => {
      setActiveExpiryAlertsCount(alerts.length);
    });
    return () => {
      unsubStore();
      unsubAlerts();
    };
  }, []);

  const isScannerSubView = (sub: string) =>
    [
      'scan_product',
      'manual_entry',
      'barcode_scanner',
      'qr_scanner',
      'multi_scan',
      'multiple_image_scan',
      'scan_history',
    ].includes(sub);

  const handleNavigate = (
    section: MenuSection,
    subView: string
  ) => {
    // Scanner is positioned inside Inventory In
    const targetSection: MenuSection = isScannerSubView(subView)
      ? 'inventory_in'
      : section;

    // If leaving scanner workflows, release temporary images from memory
    const wasInScanner = isScannerSubView(navState.activeSubView);
    const willBeInScanner = isScannerSubView(subView);
    if (wasInScanner && !willBeInScanner) {
      tempImageManager.clearAll();
      setCapturedImage(null);
      setCapturedImages([]);
      setExtractionError(null);
    }
    setNavState({ activeSection: targetSection, activeSubView: subView });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Multi-Shot Synchronized Analysis (1 to 5 photos of product packaging)
   */
  const handleMultiShotAnalyze = async (images: string[]) => {
    if (!images || images.length === 0) return;
    setCapturedImages(images);
    setCapturedImage(images[0] || null);
    setExtractionError(null);

    // Initial progressive draft to immediately show the AutoFill form without blocking
    const initialDraft: ProductScanResult = {
      productName: '',
      price: null,
      manufactureDate: null,
      expiryDate: null,
      bestBeforeMonths: null,
      isCalculatedExpiry: false,
      unit: 'pcs',
      quantity: 1,
      currency: 'USD',
      detectedLanguage: 'English',
      confidence: {},
      warnings: [],
      capturedImages: images,
    };
    setProductScanResult(initialDraft);
    setIsFormExtracting(true);
    setCurrentStage('ready');

    try {
      const result = await extractProduct5FieldsFromImages(images);
      setProductScanResult(result);
      if (result.capturedImages && result.capturedImages.length > 0) {
        setCapturedImages(result.capturedImages);
        setCapturedImage(result.capturedImages[0]);
      }
      setIsFormExtracting(false);

      const currencySymbol = result.currency === 'NPR' ? 'Rs. ' : result.currency === 'INR' ? '₹' : result.currency === 'EUR' ? '€' : result.currency === 'GBP' ? '£' : '$';

      // Create ExtractedFormData object for unified application compatibility
      const data: ExtractedFormData = {
        isProductOrPackage: true,
        documentType: 'Product Package / Label',
        productName: result.productName,
        brand: '',
        category: '',
        sku: '',
        barcode: prefilledBarcode || '',
        batchNumber: '',
        manufacturingDate: result.manufactureDate || '',
        expiryDate: result.expiryDate || '',
        bestBefore: result.bestBeforeMonths ? `${result.bestBeforeMonths} months` : '',
        bestBeforeMonths: result.bestBeforeMonths,
        quantity: String(result.quantity || 1),
        unit: result.unit || 'pcs',
        mrp: result.price !== null ? `${currencySymbol}${result.price.toFixed(2)}` : '',
        confidence: result.confidence,
        warnings: result.warnings,
        missingFields: [],
        fullName: result.productName,
        documentNumber: '',
        dateOfBirth: '',
        issueDate: result.manufactureDate || '',
        email: '',
        phone: '',
        address: '',
        organization: '',
        nationality: '',
        notesOrAdditional: '',
        confidenceScore: result.confidence.overall || 0.95,
        customFields: [],
      };

      setExtractedData(data);
    } catch (err: unknown) {
      setIsFormExtracting(false);
      const error = err as Error;
      console.error('Multi-shot extraction error:', error);
      setExtractionError(
        error.message ||
          'Failed to extract data. Please ensure the label photos are clear and try again.'
      );
      // Keep on form so user can still enter details manually, or switch to error if empty
      if (!productScanResult?.productName) {
        setCurrentStage('error');
      }
    }
  };

  /**
   * Pipeline Execution: Single Image -> Preprocess -> Gemini Vision
   */
  const handleImageSelected = async (imageBase64: string) => {
    handleMultiShotAnalyze([imageBase64]);
  };

  const handleResetWorkflow = () => {
    tempImageManager.clearAll();
    setCapturedImage(null);
    setCapturedImages([]);
    setExtractedData(null);
    setProductScanResult(null);
    setExtractionError(null);
    setSubmittedData(null);
    setPrefilledBarcode(null);
    setIsModalOpen(false);
    setCurrentStage('idle');
  };

  const handleRetryExtraction = () => {
    if (capturedImages.length > 0) {
      handleMultiShotAnalyze(capturedImages);
    } else {
      handleResetWorkflow();
    }
  };

  const handleFormSubmit = (finalFormData: ExtractedFormData) => {
    setSubmittedData(finalFormData);
    setIsModalOpen(true);
  };

  const handleStartProductRegistration = (barcode: string) => {
    setPrefilledBarcode(barcode);
    handleNavigate('inventory_in', 'scan_product');
    setCurrentStage('idle');
  };

  const handleStartSaleForProduct = (product: SavedInventoryItem) => {
    setPosProduct(product);
    handleNavigate('inventory_out', 'stock_out');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans text-slate-900 pb-8">
      {/* App Header */}
      <AppHeader
        activeSection={navState.activeSection}
        activeSubView={navState.activeSubView}
        onNavigate={handleNavigate}
        onToggleDrawer={() => setIsDrawerOpen(true)}
        inventoryCount={products.length}
        alertCount={valuation.lowStockCount + activeExpiryAlertsCount}
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
          expiring: activeExpiryAlertsCount,
          expired: valuation.expiredCount,
          scanHistory: scanHistory.length,
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Suspense fallback={<ViewLoadingSkeleton label="Loading SmartStock AI module..." />}>
          {/* ==================================================================== */}
          {/* SECTION 1: INVENTORY IN -> SCANNER VIEWS                              */}
          {/* ==================================================================== */}

          {/* 1.1 Scan Product (AI Multi-Shot Synchronized Vision Extraction) */}
          {navState.activeSubView === 'scan_product' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> Model: {GEMINI_MODEL}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Multi-Shot 5-Field Vision Engine Active · Inventory In
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    {currentStage === 'ready'
                      ? 'Review & Modify 5-Field Product Data'
                      : currentStage === 'processing'
                      ? 'Synchronized Vision Analysis & Date Calculator'
                      : 'Multi-Shot Product Scanner'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Snap 1 to 5 photos (Front label, MFD/EXP stamps, Best before) to extract and calculate the 5 product fields.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct(null);
                      handleNavigate('inventory_in', 'manual_entry');
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
                  <HomeScreenActiveExpiryAlerts
                    onNavigateToAlerts={() => handleNavigate('inventory', 'expiry_alerts')}
                    onNavigateToStockOut={(prodId) => {
                      const found = products.find((p) => p.id === prodId);
                      if (found) setPosProduct(found);
                      handleNavigate('inventory_out', 'stock_out');
                    }}
                  />
                  <MultiShotProductScanner onAnalyze={handleMultiShotAnalyze} disabled={false} />
                </div>
              )}

              {currentStage === 'processing' && (
                <ProcessingState
                  imagePreview={capturedImage}
                  onCancel={handleResetWorkflow}
                />
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
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    {capturedImages.length > 0 && (
                      <button
                        type="button"
                        onClick={handleRetryExtraction}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Retry Extraction
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleResetWorkflow}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
                    >
                      Discard & Retake Photo
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
                  onSubmit={handleFormSubmit}
                  onRetake={handleResetWorkflow}
                  onCleanupImages={() => {
                    setCapturedImage(null);
                    setCapturedImages([]);
                    tempImageManager.clearAll();
                  }}
                />
              )}
            </div>
          )}

          {/* 1.2 Barcode Scanner */}
          {navState.activeSubView === 'barcode_scanner' && (
            <BarcodeScannerView
              onRegisterProduct={handleStartProductRegistration}
              onRecordSale={handleStartSaleForProduct}
              onViewProduct={() => handleNavigate('inventory', 'inventory')}
            />
          )}

          {/* 1.4 QR Scanner */}
          {navState.activeSubView === 'qr_scanner' && (
            <QrScannerView
              onRegisterProduct={handleStartProductRegistration}
              onRecordSale={handleStartSaleForProduct}
            />
          )}

          {/* 1.5 Multiple Image Scan */}
          {(navState.activeSubView === 'multiple_image_scan' || navState.activeSubView === 'multi_scan') && (
            <div className="space-y-6">
              <MultiShotProductScanner onAnalyze={handleMultiShotAnalyze} disabled={false} />
            </div>
          )}

          {/* 1.6 Scan History */}
          {navState.activeSubView === 'scan_history' && (
            <ScanHistoryView
              onSelectProduct={() => handleNavigate('inventory', 'inventory')}
            />
          )}

          {/* 1.7 Add / Edit Product Manually */}
          {navState.activeSubView === 'manual_entry' && (
            <ManualProductEntryView
              existingProduct={editingProduct}
              initialBarcode={prefilledBarcode}
              onSaveSuccess={(_saved) => {
                setEditingProduct(null);
                setPrefilledBarcode(null);
                handleNavigate('inventory', 'inventory');
              }}
              onCancel={() => {
                setEditingProduct(null);
                setPrefilledBarcode(null);
                handleNavigate('inventory_in', 'scan_product');
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
                  handleNavigate('inventory_in', 'manual_entry');
                }}
                onEditProduct={(prod) => {
                  setEditingProduct(prod);
                  handleNavigate('inventory_in', 'manual_entry');
                }}
                onStockIn={(prodId) => {
                  if (prodId) {
                    const found = products.find((p) => p.id === prodId);
                    if (found) setPosProduct(found);
                  }
                  handleNavigate('inventory_in', 'stock_in');
                }}
                onStockOut={(prodId) => {
                  if (prodId) {
                    const found = products.find((p) => p.id === prodId);
                    if (found) setPosProduct(found);
                  }
                  handleNavigate('inventory_out', 'stock_out');
                }}
                onRecordSale={handleStartSaleForProduct}
                onNavigateSection={handleNavigate}
              />
            )}

          {/* 2.2 Inventory Turnover & Velocity */}
          {navState.activeSection === 'inventory' &&
            navState.activeSubView === 'turnover' && (
              <InventoryTurnoverView
                onStockIn={(prodId) => {
                  if (prodId) {
                    const found = products.find((p) => p.id === prodId);
                    if (found) setPosProduct(found);
                  }
                  handleNavigate('inventory_in', 'stock_in');
                }}
                onStockOut={(prodId) => {
                  if (prodId) {
                    const found = products.find((p) => p.id === prodId);
                    if (found) setPosProduct(found);
                  }
                  handleNavigate('inventory_out', 'stock_out');
                }}
              />
            )}

          {/* 2.3 Product Reputation & Ratings */}
          {navState.activeSection === 'inventory' &&
            navState.activeSubView === 'reputation' && (
              <ProductReputationView />
            )}

          {/* 2.4 Stock Transactions Ledger */}
          {navState.activeSection === 'inventory' &&
            navState.activeSubView === 'stock_ledger' && <StockTransactionsLedgerView />}

          {/* 2.5 Low Stock */}
          {navState.activeSection === 'inventory' &&
            navState.activeSubView === 'low_stock' && (
              <LowStockView onStockIn={() => handleNavigate('inventory_in', 'stock_in')} />
            )}

          {/* 2.6 Expiring Soon */}
          {navState.activeSection === 'inventory' &&
            navState.activeSubView === 'expiring_soon' && (
              <ExpiringSoonView onRecordSale={handleStartSaleForProduct} />
            )}

          {/* 2.7 Expired Products */}
          {navState.activeSection === 'inventory' &&
            (navState.activeSubView === 'expired' || navState.activeSubView === 'expired_products') && (
              <ExpiredProductsView />
            )}

          {/* 2.7.5 Dedicated Expiry Alerts View */}
          {navState.activeSection === 'inventory' &&
            navState.activeSubView === 'expiry_alerts' && (
              <ExpiryAlertsView
                onResolveStockOut={(prodId) => {
                  const found = products.find((p) => p.id === prodId);
                  if (found) setPosProduct(found);
                  handleNavigate('inventory_out', 'stock_out');
                }}
                onNavigateToCatalog={() => handleNavigate('inventory', 'inventory')}
              />
            )}

          {/* 2.8 Categories */}
          {navState.activeSection === 'inventory' &&
            navState.activeSubView === 'categories' && <CategoriesView />}

          {/* 2.9 Inventory Reports */}
          {navState.activeSection === 'inventory' &&
            (navState.activeSubView === 'reports' || navState.activeSubView === 'inventory_reports') && (
              <InventoryReportsView />
            )}

          {/* ==================================================================== */}
          {/* SECTION 3: INVENTORY IN (RECEIVING / PURCHASES)                       */}
          {/* ==================================================================== */}
          {navState.activeSection === 'inventory_in' &&
            (navState.activeSubView === 'stock_in' || navState.activeSubView === 'inventory_in') && (
              <StockInView initialProductId={posProduct?.id} />
            )}
          {navState.activeSection === 'inventory_in' &&
            navState.activeSubView === 'stock_ledger' && (
              <StockTransactionsLedgerView defaultTypeFilter="in" />
            )}

          {/* ==================================================================== */}
          {/* SECTION 4: INVENTORY OUT (DISPATCH / SALES)                           */}
          {/* ==================================================================== */}
          {navState.activeSection === 'inventory_out' &&
            (navState.activeSubView === 'stock_out' || navState.activeSubView === 'inventory_out') && (
              <StockOutView
                initialProduct={posProduct}
                initialProductId={posProduct?.id}
              />
            )}
          {navState.activeSection === 'inventory_out' &&
            navState.activeSubView === 'stock_ledger' && (
              <StockTransactionsLedgerView defaultTypeFilter="out" />
            )}
        </Suspense>

        {/* Crawlable Landing Page Content & SEO Knowledge Base */}
        <SeoLandingContent onNavigate={handleNavigate} />
      </main>

      {/* Semantic Site Footer */}
      <AppFooter onNavigate={handleNavigate} />

      {/* Payload Modal */}
      <Suspense fallback={null}>
        <PayloadModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          formData={submittedData}
        />
      </Suspense>

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
                <li><strong>Scanner:</strong> Extract MFD, EXP, Batch, Price, and Product Name from packaging labels, or use Barcode/QR and manual entry.</li>
                <li><strong>Inventory:</strong> Real-time valuation, stock movement ledger, low stock warnings, and expiry date safety alerts.</li>
                <li><strong>Turnover &amp; Reputation:</strong> Stock velocity, turnover ratios, DSI days, and verified product quality ratings.</li>
                <li><strong>Inventory In &amp; Out:</strong> Streamlined stock receiving, dispatch, sales fulfillment, and wastage tracking.</li>
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

      {/* Expiry Alert Toast System (30-day proactive warning) */}
      <ToastContainer
        onNavigateToInventory={() => handleNavigate('inventory', 'inventory')}
        onNavigateToAlerts={() => handleNavigate('inventory', 'expiry_alerts')}
      />
    </div>
  );
}
