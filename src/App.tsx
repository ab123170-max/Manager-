/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AppHeader } from './components/navigation/AppHeader';
import { ViewLoadingSkeleton } from './components/common/ViewLoadingSkeleton';
import {
  ExtractedFormData,
  ExtractionStage,
  SavedInventoryItem,
  AppNavigationState,
  MenuSection,
  ProductScanResult,
  AuthSession,
  UserProfile,
  AppRootMode,
} from './types';
import { authService, subscribeAuth, subscribePasswordRecovery } from './services/authService';
import {
  getProducts,
  getInventoryValuation,
  getScanHistory,
  subscribeToStore,
  type InventoryValuation,
} from './utils/unifiedDataStore';
import {
  X,
  Sparkles,
  Plus,
  RotateCcw,
  Camera,
  Loader2,
} from 'lucide-react';
import { AppFooter } from './components/navigation/AppFooter';
import { expiryAlertManager } from './utils/expiryAlertManager';
import { setPrivatePageSeo } from './utils/seoHelper';
import { AppSliderNavigation } from './components/slider/AppSliderNavigation';
import { HomeDashboard } from './components/home/HomeDashboard';
import { SliderPageWrapper } from './components/slider/SliderPageWrapper';
import { AdSenseUnit } from './components/ads/AdSenseUnit';
import { StartupSplash } from './components/common/StartupSplash';
import { formatUserFriendlyError } from './config/apiConfig';

// ============================================================================
// CODE-SPLIT / LAZY-LOADED HEAVY VIEW CHUNKS
// ============================================================================
const AndroidNavDrawer = lazy(() =>
  import('./components/navigation/AndroidNavDrawer').then((m) => ({
    default: m.AndroidNavDrawer,
  }))
);
const ToastContainer = lazy(() =>
  import('./components/common/ToastContainer').then((m) => ({
    default: m.ToastContainer,
  }))
);

const HomeScreenActiveExpiryAlerts = lazy(() =>
  import('./components/scanner/HomeScreenActiveExpiryAlerts').then((m) => ({
    default: m.HomeScreenActiveExpiryAlerts,
  }))
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
const CatalogView = lazy(() =>
  import('./components/inventory/CatalogView').then((m) => ({ default: m.CatalogView }))
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

// Lazy-loaded Authentication, Onboarding, Landing & Profile Modules
const LandingPage = lazy(() =>
  import('./components/landing/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const PublicAiScannerPage = lazy(() =>
  import('./components/seo/PublicAiScannerPage').then((m) => ({ default: m.PublicAiScannerPage }))
);
const PublicBarcodeScannerPage = lazy(() =>
  import('./components/seo/PublicBarcodeScannerPage').then((m) => ({ default: m.PublicBarcodeScannerPage }))
);
const PublicExpiryDatePage = lazy(() =>
  import('./components/seo/PublicExpiryDatePage').then((m) => ({ default: m.PublicExpiryDatePage }))
);
const PublicInventoryManagementPage = lazy(() =>
  import('./components/seo/PublicInventoryManagementPage').then((m) => ({ default: m.PublicInventoryManagementPage }))
);
const PublicFaqPage = lazy(() =>
  import('./components/seo/PublicFaqPage').then((m) => ({ default: m.PublicFaqPage }))
);
const PublicShareAppPage = lazy(() =>
  import('./components/seo/PublicShareAppPage').then((m) => ({ default: m.PublicShareAppPage }))
);
const PublicIndustryInventoryPage = lazy(() =>
  import('./components/seo/PublicIndustryInventoryPage').then((m) => ({ default: m.PublicIndustryInventoryPage }))
);
const AuthScreen = lazy(() =>
  import('./components/auth/AuthScreen').then((m) => ({ default: m.AuthScreen }))
);
const ProfileSetupView = lazy(() =>
  import('./components/profile/ProfileSetupView').then((m) => ({ default: m.ProfileSetupView }))
);
const OnboardingModal = lazy(() =>
  import('./components/onboarding/OnboardingModal').then((m) => ({ default: m.OnboardingModal }))
);
const InfoHelpViewLazy = lazy(() => import('./components/help/InfoHelpView').then((m) => ({ default: m.InfoHelpView })));
const SettingsModal = lazy(() =>
  import('./components/settings/SettingsModal').then((m) => ({ default: m.SettingsModal }))
);
const MarketingAutomationView = lazy(() => import('./components/marketing/MarketingAutomationView').then((m) => ({ default: m.MarketingAutomationView })));
const BusinessVisitingCardView = lazy(() => import('./components/business/BusinessVisitingCardView').then((m) => ({ default: m.BusinessVisitingCardView })));
const CustomerMessagingModal = lazy(() => import('./components/sheets/CustomerMessagingModal').then((m) => ({ default: m.CustomerMessagingModal })));
const GoogleSheetsSyncModal = lazy(() =>
  import('./components/sheets/GoogleSheetsSyncModal').then((m) => ({
    default: m.GoogleSheetsSyncModal,
  }))
);

export default function App() {
  // Authentication & View Mode State
  const [isAuthInitializing] = useState<boolean>(false);
  const [session] = useState<AuthSession | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot_password'>('login');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isEditingProfileModal, setIsEditingProfileModal] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isCustomerMessagingOpen, setIsCustomerMessagingOpen] = useState(false);
  const [isInfoHelpOpen, setIsInfoHelpOpen] = useState(false);
  const [rootMode] = useState<AppRootMode>('dashboard');
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return typeof window !== 'undefined' ? window.location.pathname : '/';
  });

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handlePublicNavigate = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Anonymous mode: no authentication or profile startup.
  // Navigation State
  const [navState, setNavState] = useState<AppNavigationState>({
    activeSection: 'scanner',
    activeSubView: 'scan_product',
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (rootMode !== 'landing') {
      const pageTitle =
        rootMode === 'auth'
          ? 'Sign In'
          : rootMode === 'profile_setup'
          ? 'Profile Setup'
          : navState.activeSection.charAt(0).toUpperCase() + navState.activeSection.slice(1);
      setPrivatePageSeo(pageTitle);
    }
  }, [rootMode, navState.activeSection]);

  // Scanner & AutoFill State
  const [autoOpenScannerCamera, setAutoOpenScannerCamera] = useState(false);
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

  // Selected item for POS/Sale or Product View
  const [posProduct, setPosProduct] = useState<SavedInventoryItem | null>(null);

  // Store metrics for badge counts - deferred until dashboard mode
  const [products, setProducts] = useState<SavedInventoryItem[]>(() => {
    return rootMode === 'dashboard' ? getProducts() : [];
  });
  const [valuation, setValuation] = useState<InventoryValuation>(() => {
    return getInventoryValuation();
  });
  const [scanHistory, setScanHistory] = useState<any[]>(() => {
    return rootMode === 'dashboard' ? getScanHistory() : [];
  });
  const [activeExpiryAlertsCount, setActiveExpiryAlertsCount] = useState<number>(0);

  useEffect(() => {
    if (rootMode !== 'dashboard') return;

    // Initialize metrics on entering dashboard
    setProducts(getProducts());
    setValuation(getInventoryValuation());
    setScanHistory(getScanHistory());
    setActiveExpiryAlertsCount(expiryAlertManager.getActiveCount());

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
  }, [rootMode]);

  // On-demand data sync: fetch only when user opens relevant section
  useEffect(() => {
    if (rootMode !== 'dashboard' || !session?.user?.id) return;
    if (navState.activeSection === 'inventory' || navState.activeSection === 'inventory_in') {
      import('./utils/unifiedDataStore').then((m) => {
        m.ensureProductsSynced(session.user.id);
      });
    } else if (navState.activeSection === 'inventory_out' || (navState.activeSubView as string) === 'reports') {
      import('./utils/unifiedDataStore').then((m) => {
        m.ensureProductsSynced(session.user.id);
        m.ensureTransactionsSynced(session.user.id);
      });
    }
  }, [navState.activeSection, rootMode, session?.user?.id]);

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
      import('./utils/smartLabelCropper').then((m) => m.tempImageManager.clearAll());
      setCapturedImage(null);
      setCapturedImages([]);
      setExtractionError(null);
    }
    if (subView === 'scan_product') {
      setAutoOpenScannerCamera(true);
    }
    setNavState({ activeSection: targetSection, activeSubView: subView });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Maps any subview and menu section to one of the 5 functional slider pages
   */
  const getSlideIndexForNav = (subView: string, section?: MenuSection): number => {
    if (section === 'business_card' || subView === 'business_card') return 6;
    if (section === 'marketing' || subView === 'marketing') return 5;
    if (subView === 'home') return 0;
    if (
      [
        'scan_product',
        'barcode_scanner',
        'qr_scanner',
        'manual_entry',
        'multi_scan',
        'multiple_image_scan',
        'scan_history',
      ].includes(subView)
    ) {
      return 0; // Page 1: AI Scanner & Intake
    }
    if (['inventory', 'products', 'categories'].includes(subView)) {
      return 1; // Page 2: Live Inventory & Catalog
    }
    if (
      [
        'stock_in',
        'stock_out',
        'stock_ledger',
        'receiving',
        'dispatch',
        'in_ledger',
        'out_ledger',
      ].includes(subView)
    ) {
      return 2; // Page 3: Stock Operations
    }
    if (
      [
        'expiry_alerts',
        'expiring_soon',
        'expired',
        'expired_products',
        'low_stock',
      ].includes(subView)
    ) {
      return 3; // Page 4: Expiry Radar & Alerts
    }
    if (
      [
        'turnover',
        'reputation',
        'reports',
        'inventory_reports',
        'accounting',
      ].includes(subView)
    ) {
      return 4; // Page 5: Turnover & Analytics
    }
    if (section === 'inventory_in' || section === 'scanner') return 0;
    if (section === 'inventory_out') return 2;
    return 1;
  };

  const activeSlideIndex = getSlideIndexForNav(navState.activeSubView, navState.activeSection);

  const SLIDER_PAGE_CONFIGS: { title: string; section: MenuSection; subView: string }[] = [
    { title: 'Scanner & Intake', section: 'inventory_in', subView: 'scan_product' },
    { title: 'Live Inventory', section: 'inventory', subView: 'inventory' },
    { title: 'Product Catalog', section: 'inventory', subView: 'catalog' },
    { title: 'Stock In & Out', section: 'inventory_in', subView: 'stock_in' },
    { title: 'Expiry & Alerts', section: 'inventory', subView: 'expiry_alerts' },
    { title: 'Turnover & Reports', section: 'inventory', subView: 'turnover' },
    { title: 'Marketing', section: 'marketing', subView: 'marketing' },
  ];

  const handleSlideChange = (newIndex: number) => {
    const target = SLIDER_PAGE_CONFIGS[newIndex];
    if (target) {
      handleNavigate(target.section, target.subView);
    }
  };

  /**
   * Multi-Shot Synchronized Analysis (1 to 5 photos of product packaging)
   * AI module is loaded strictly on-demand when user initiates analysis
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
      const { extractProduct5FieldsFromImages } = await import('./services/geminiService');
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
        brand: result.brand || '',
        category: '',
        sku: '',
        barcode: result.barcode || prefilledBarcode || '',
        batchNumber: result.batchNumber || '',
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
      // Play extraction completion confirmation sound
      import('./utils/audioFeedback').then((m) => m.playExtractionSuccessChime());
    } catch (err: unknown) {
      setIsFormExtracting(false);
      const friendlyMsg = formatUserFriendlyError(err);
      console.warn('[AI Analysis] Multi-shot extraction error:', (err as Error)?.message || err);
      setExtractionError(friendlyMsg);
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
    import('./utils/smartLabelCropper').then((m) => m.tempImageManager.clearAll());
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

  // Authentication/profile handlers are disabled in anonymous mode.
  const handleLandingGetStarted = () => {};
  const handleLandingLogin = () => {};
  const handleOnboardingFinish = () => setIsOnboardingOpen(false);
  const handleAuthSuccess = () => {};
  const handleProfileSaved = () => setIsEditingProfileModal(false);
  const handleLogout = async () => {};

  // ---------------------------------------------------------------------------
  // 0. Auth Initializing Splash State (Prevents Startup Authentication Flickering)
  // ---------------------------------------------------------------------------
  if (isAuthInitializing) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4 max-w-xs text-center animate-in fade-in duration-300">
          <div className="w-14 h-14 rounded-2xl bg-[#1473EA] flex items-center justify-center text-white shadow-lg shadow-[#1473EA]/25 animate-pulse">
            <Camera className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-black text-[#092B4C] tracking-tight">ScanMe AI</h1>
            <p className="text-xs text-slate-500 font-medium">Checking your account…</p>
          </div>
          <Loader2 className="w-5 h-5 text-[#1473EA] animate-spin mt-1" />
        </div>
      </div>
    );
  }

  // Anonymous app: skip landing/auth/profile gates and render dashboard directly.

  // ---------------------------------------------------------------------------
  // 4. Main App Dashboard (Existing complete workflow)
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans text-slate-900 pb-8">
      {/* Warm personalized welcome */}
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3">
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm px-4 py-3 sm:px-5 sm:py-4">
          <p className="text-[11px] sm:text-xs font-bold text-indigo-600 uppercase tracking-wide">ScanMe AI</p>
          <h1 className="mt-0.5 text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
            {(() => {
              const hour = new Date().getHours();
              const greeting = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night';
              const firstName = (session?.profile?.full_name || session?.user?.displayName || 'there').trim().split(/\s+/)[0] || 'there';
              return greeting + ', ' + firstName + ' 👋';
            })()}
          </h1>
          
        </div>
      </div>

      {/* App Header */}
      <AppHeader
        activeSection={navState.activeSection}
        activeSubView={navState.activeSubView}
        onNavigate={handleNavigate}
        onToggleDrawer={() => setIsDrawerOpen(true)}
        inventoryCount={products.length}
        alertCount={valuation.lowStockCount + activeExpiryAlertsCount}
        userProfile={session?.profile}
        onEditProfile={() => setIsEditingProfileModal(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGoogleSheets={() => setIsSheetsModalOpen(true)}
      />

      {/* Android Nav Drawer - Loaded strictly when opened */}
      {isDrawerOpen && (
        <Suspense fallback={null}>
          <AndroidNavDrawer
            isOpen={true}
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
            userProfile={session?.profile}
            onEditProfile={() => setIsEditingProfileModal(true)}
            onShowOnboarding={() => setIsOnboardingOpen(true)}
            onLogout={handleLogout}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenInfoHelp={() => setIsInfoHelpOpen(true)}
            onOpenGoogleSheets={() => setIsSheetsModalOpen(true)}
          />
        </Suspense>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Functional Slider Pages Navigation Bar */}
        <AppSliderNavigation
          activeSlideIndex={activeSlideIndex}
          activeSubView={navState.activeSubView}
          activeSection={navState.activeSection}
          onSlideChange={handleSlideChange}
          onNavigate={handleNavigate}
          inventoryCount={products.length}
          alertCount={valuation.lowStockCount + activeExpiryAlertsCount}
          lowStockCount={valuation.lowStockCount}
          expiredCount={valuation.expiredCount}
          scanHistoryCount={scanHistory.length}
          onOpenGoogleSheets={() => setIsSheetsModalOpen(true)}
          onOpenDrawer={() => setIsDrawerOpen(true)}
        />

        {/* Swipeable & Animated Slider Page Wrapper */}
        <SliderPageWrapper
          activeSlideIndex={activeSlideIndex}
          totalSlides={SLIDER_PAGE_CONFIGS.length}
          currentSlideTitle={SLIDER_PAGE_CONFIGS[activeSlideIndex]?.title || 'Scanner'}
          onPrevSlide={() => {
            if (activeSlideIndex > 0) handleSlideChange(activeSlideIndex - 1);
          }}
          onNextSlide={() => {
            if (activeSlideIndex < SLIDER_PAGE_CONFIGS.length - 1) handleSlideChange(activeSlideIndex + 1);
          }}
        >
          <Suspense fallback={<ViewLoadingSkeleton label="Loading ScanMe AI slider module..." />}>
            {activeSlideIndex === 5 && navState.activeSubView === 'marketing' && <MarketingAutomationView />}

            {/* ==================================================================== */}
            {/* SLIDER PAGE 1: AI SCANNER & INTAKE                                   */}
            {/* ==================================================================== */}
            {activeSlideIndex === 0 && navState.activeSubView === 'home' && (
              <HomeDashboard
                productCount={products.length}
                lowStockCount={valuation.lowStockCount}
                expiringCount={valuation.expiringSoonCount}
                expiredCount={valuation.expiredCount}
                onNavigate={handleNavigate}
              />
            )}

            {activeSlideIndex === 0 && navState.activeSubView !== 'home' && (
              <div className="space-y-6">
                {/* 1.1 Scan Product (AI Multi-Shot Synchronized Vision Extraction) */}
                {(navState.activeSubView === 'scan_product' ||
                  !['barcode_scanner', 'qr_scanner', 'multi_scan', 'multiple_image_scan', 'scan_history', 'manual_entry'].includes(navState.activeSubView)) && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                          {currentStage === 'ready'
                            ? 'Review & Modify Product Data'
                            : currentStage === 'processing'
                            ? 'Processing Scanner Analysis'
                            : 'Multi-Shot Product Scanner'}
                        </h2>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(null);
                            handleNavigate('inventory_in', 'manual_entry');
                          }}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                          id="btn-scan-add-manual"
                        >
                          <Plus className="w-4 h-4" />
                          <span>＋ Add Product Manually</span>
                        </button>
                      </div>
                    </div>

                    {/* Stage Routing */}
                    {currentStage === 'idle' && (
                      <div className="space-y-4">
                        <Suspense fallback={null}>
                          <HomeScreenActiveExpiryAlerts
                            onNavigateToAlerts={() => handleNavigate('inventory', 'expiry_alerts')}
                            onNavigateToStockOut={(prodId) => {
                              const found = products.find((p) => p.id === prodId);
                              if (found) setPosProduct(found);
                              handleNavigate('inventory_out', 'stock_out');
                            }}
                          />
                        </Suspense>
                        <MultiShotProductScanner
                          onAnalyze={handleMultiShotAnalyze}
                          disabled={false}
                          initialAutoOpen={autoOpenScannerCamera}
                          onCameraOpened={() => setAutoOpenScannerCamera(false)}
                        />
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
                          import('./utils/smartLabelCropper').then((m) => m.tempImageManager.clearAll());
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

                {/* 1.3 QR Scanner */}
                {navState.activeSubView === 'qr_scanner' && (
                  <QrScannerView
                    onRegisterProduct={handleStartProductRegistration}
                    onRecordSale={handleStartSaleForProduct}
                  />
                )}

                {/* 1.4 Multiple Image Scan */}
                {(navState.activeSubView === 'multiple_image_scan' || navState.activeSubView === 'multi_scan') && (
                  <div className="space-y-6">
                    <MultiShotProductScanner
                      onAnalyze={handleMultiShotAnalyze}
                      disabled={false}
                      initialAutoOpen={autoOpenScannerCamera}
                      onCameraOpened={() => setAutoOpenScannerCamera(false)}
                    />
                  </div>
                )}

                {/* 1.5 Scan History */}
                {navState.activeSubView === 'scan_history' && (
                  <ScanHistoryView
                    onSelectProduct={() => handleNavigate('inventory', 'inventory')}
                  />
                )}

                {/* 1.6 Add / Edit Product Manually */}
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
              </div>
            )}

            {/* ==================================================================== */}
            {/* SLIDER PAGE 2: LIVE INVENTORY & CATALOG                              */}
            {/* ==================================================================== */}
            {activeSlideIndex === 1 && (
              <div className="space-y-6">
                {navState.activeSubView === 'categories' ? (
                  <CategoriesView />
                ) : navState.activeSubView === 'catalog' ? (
                  <CatalogView
                    onAddProduct={() => {
                      setEditingProduct(null);
                      handleNavigate('inventory_in', 'manual_entry');
                    }}
                    onSelectProduct={(prod) => {
                      setEditingProduct(prod);
                      handleNavigate('inventory_in', 'manual_entry');
                    }}
                    onSellProduct={handleStartSaleForProduct}
                  />
                ) : (
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
                    onOpenGoogleSheets={() => setIsSheetsModalOpen(true)}
                  />
                )}
              </div>
            )}

            {/* ==================================================================== */}
            {/* SLIDER PAGE 3: STOCK IN & STOCK OUT (OPERATIONS)                     */}
            {/* ==================================================================== */}
            {activeSlideIndex === 2 && (
              <div className="space-y-6">
                {(navState.activeSubView === 'stock_out' || navState.activeSection === 'inventory_out') ? (
                  <StockOutView
                    initialProduct={posProduct}
                    initialProductId={posProduct?.id}
                  />
                ) : navState.activeSubView === 'stock_ledger' ? (
                  <StockTransactionsLedgerView />
                ) : (
                  <StockInView initialProductId={posProduct?.id} />
                )}
              </div>
            )}

            {/* ==================================================================== */}
            {/* SLIDER PAGE 4: EXPIRY RADAR & ALERTS                                 */}
            {/* ==================================================================== */}
            {activeSlideIndex === 3 && (
              <div className="space-y-6">
                {navState.activeSubView === 'expiring_soon' ? (
                  <ExpiringSoonView onRecordSale={handleStartSaleForProduct} />
                ) : (navState.activeSubView === 'expired' || navState.activeSubView === 'expired_products') ? (
                  <ExpiredProductsView />
                ) : navState.activeSubView === 'low_stock' ? (
                  <LowStockView onStockIn={() => handleNavigate('inventory_in', 'stock_in')} />
                ) : (
                  <ExpiryAlertsView
                    onResolveStockOut={(prodId) => {
                      const found = products.find((p) => p.id === prodId);
                      if (found) setPosProduct(found);
                      handleNavigate('inventory_out', 'stock_out');
                    }}
                    onNavigateToCatalog={() => handleNavigate('inventory', 'inventory')}
                  />
                )}
              </div>
            )}

            {activeSlideIndex === 5 && navState.activeSubView === 'marketing' && (
              <div className="space-y-6"><MarketingAutomationView /></div>
            )}

            {activeSlideIndex === 6 && navState.activeSubView === 'business_card' && (
              <div className="space-y-6"><BusinessVisitingCardView profile={session?.profile || null} /></div>
            )}

            {/* ==================================================================== */}
            {/* SLIDER PAGE 5: TURNOVER, ANALYTICS & REPORTS                         */}
            {/* ==================================================================== */}
            {activeSlideIndex === 4 && (
              <div className="space-y-6">
                {navState.activeSubView === 'reputation' ? (
                  <ProductReputationView />
                ) : (navState.activeSubView === 'reports' || navState.activeSubView === 'inventory_reports') ? (
                  <InventoryReportsView />
                ) : navState.activeSubView === 'accounting' ? (
                  <InventoryAccountingView />
                ) : (
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
              </div>
            )}
          </Suspense>
        </SliderPageWrapper>

        {/* Google AdSense Placement - Non-intrusive container below active dashboard slider */}
        <AdSenseUnit className="max-w-4xl mx-auto my-6" />

      </main>

      {/* Semantic Site Footer */}
      <AppFooter onNavigate={handleNavigate} />

      {/* Payload Modal - loaded on demand */}
      {isModalOpen && (
        <Suspense fallback={null}>
          <PayloadModal
            isOpen={true}
            data={submittedData}
            onClose={() => setIsModalOpen(false)}
            onResetWorkflow={handleResetWorkflow}
          />
        </Suspense>
      )}

      {/* Expiry Alert Toast System (30-day proactive warning) */}
      <Suspense fallback={null}>
        <ToastContainer
          onNavigateToInventory={() => handleNavigate('inventory', 'inventory')}
          onNavigateToAlerts={() => handleNavigate('inventory', 'expiry_alerts')}
        />
      </Suspense>

      {/* Edit Profile Modal in Dashboard */}
      {isEditingProfileModal && session?.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-xl my-8">
            <Suspense fallback={<ViewLoadingSkeleton label="Loading Profile..." />}>
              <ProfileSetupView
                user={session.user}
                initialProfile={session.profile}
                isInitialSetup={false}
                onCancel={() => setIsEditingProfileModal(false)}
                onProfileSaved={handleProfileSaved}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Feature Onboarding / Tour Reopened from Drawer - Loaded strictly when opened */}
      {isOnboardingOpen && (
        <Suspense fallback={null}>
          <OnboardingModal
            isOpen={true}
            onClose={() => setIsOnboardingOpen(false)}
            onFinish={() => setIsOnboardingOpen(false)}
          />
        </Suspense>
      )}

      {/* Global Settings & Language Modal - Loaded strictly when opened */}
      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={true}
            onClose={() => setIsSettingsOpen(false)}
            userProfile={session?.profile}
            onEditProfile={() => {
              setIsSettingsOpen(false);
              setIsEditingProfileModal(true);
            }}
            onLogout={handleLogout}
          />
        </Suspense>
      )}

      {isInfoHelpOpen && (
        <Suspense fallback={null}>
          <InfoHelpViewLazy onClose={() => setIsInfoHelpOpen(false)} onNavigate={handleNavigate} />
        </Suspense>
      )}

      {/* Customer messaging from Google Sheets */}
      {isCustomerMessagingOpen && (
        <Suspense fallback={null}>
          <CustomerMessagingModal
            isOpen={true}
            onClose={() => setIsCustomerMessagingOpen(false)}
          />
        </Suspense>
      )}

      {/* Google Sheets Sync & Backup Modal - Loaded strictly when opened */}
      {isSheetsModalOpen && (
        <Suspense fallback={null}>
          <GoogleSheetsSyncModal
            isOpen={true}
            onClose={() => setIsSheetsModalOpen(false)}
            onProductsUpdated={() => setProducts(getProducts())}
          />
        </Suspense>
      )}
    </div>
  );
}
