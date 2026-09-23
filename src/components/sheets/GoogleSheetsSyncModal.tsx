/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  X,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  LogOut,
  FolderOpen,
  Plus,
  ShieldCheck,
  Table,
  Check,
  Loader2,
  FileCheck,
} from 'lucide-react';
import {
  connectGoogleAccount,
  disconnectGoogleAccount,
  getGoogleAccessToken,
  getGoogleUser,
  subscribeGoogleAuth,
  listGoogleSpreadsheets,
  createInventorySpreadsheet,
  exportToExistingSpreadsheet,
  getSpreadsheetMetadata,
  readSpreadsheetValues,
  GoogleDriveSpreadsheet,
} from '../../services/googleSheetsService';
import { getProducts, saveProduct } from '../../utils/unifiedDataStore';
import { SavedInventoryItem } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductsUpdated?: () => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  onProductsUpdated,
}) => {
  const { t, formatCurrency, formatDate } = useLanguage();

  // Auth state
  const [googleUser, setGoogleUser] = useState(getGoogleUser());
  const [hasToken, setHasToken] = useState<boolean>(!!getGoogleAccessToken());
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'settings'>('export');

  // Drive Spreadsheets list
  const [spreadsheets, setSpreadsheets] = useState<GoogleDriveSpreadsheet[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);

  // Export State
  const [exportMode, setExportMode] = useState<'new' | 'existing'>('new');
  const [newSheetTitle, setNewSheetTitle] = useState(
    `SmartStock AI - Inventory ${new Date().toISOString().split('T')[0]}`
  );
  const [selectedExportSheetId, setSelectedExportSheetId] = useState<string>('');
  const [availableExportTabs, setAvailableExportTabs] = useState<string[]>([]);
  const [selectedExportTab, setSelectedExportTab] = useState<string>('Inventory Catalog');
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportedUrl, setLastExportedUrl] = useState<string | null>(null);

  // Import State
  const [selectedImportSheetId, setSelectedImportSheetId] = useState<string>('');
  const [availableImportTabs, setAvailableImportTabs] = useState<string[]>([]);
  const [selectedImportTab, setSelectedImportTab] = useState<string>('');
  const [isLoadingTabs, setIsLoadingTabs] = useState(false);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ count: number } | null>(null);

  // Confirmation Modals (MANDATORY FOR DESTRUCTIVE/MUTATING ACTIONS)
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    type: 'export_overwrite' | 'import_overwrite';
    title: string;
    description: string;
    action: () => Promise<void>;
  } | null>(null);

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Subscribe to auth state
  useEffect(() => {
    return subscribeGoogleAuth((user, token) => {
      setGoogleUser(user);
      setHasToken(!!token);
    });
  }, []);

  // Fetch Drive spreadsheets when user is authenticated
  const fetchDriveSheets = async () => {
    if (!hasToken) return;
    setIsLoadingDrive(true);
    try {
      const files = await listGoogleSpreadsheets();
      setSpreadsheets(files);
      if (files.length > 0 && !selectedExportSheetId) {
        setSelectedExportSheetId(files[0].id);
      }
      if (files.length > 0 && !selectedImportSheetId) {
        setSelectedImportSheetId(files[0].id);
      }
    } catch (err: any) {
      console.error('Failed to list Google Sheets:', err);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  useEffect(() => {
    if (isOpen && hasToken) {
      fetchDriveSheets();
    }
  }, [isOpen, hasToken]);

  // Load tabs for selected import sheet
  useEffect(() => {
    if (!selectedImportSheetId || !hasToken) return;
    let isCancelled = false;

    const loadTabs = async () => {
      setIsLoadingTabs(true);
      try {
        const metadata = await getSpreadsheetMetadata(selectedImportSheetId);
        if (!isCancelled) {
          setAvailableImportTabs(metadata.sheetNames);
          if (metadata.sheetNames.length > 0) {
            setSelectedImportTab(metadata.sheetNames[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load tabs:', err);
      } finally {
        if (!isCancelled) setIsLoadingTabs(false);
      }
    };

    loadTabs();
    return () => {
      isCancelled = true;
    };
  }, [selectedImportSheetId, hasToken]);

  // Load preview rows when import tab changes
  useEffect(() => {
    if (!selectedImportSheetId || !selectedImportTab || !hasToken) return;
    let isCancelled = false;

    const loadPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const values = await readSpreadsheetValues(
          selectedImportSheetId,
          `'${selectedImportTab}'!A1:Z6`
        );
        if (!isCancelled) {
          setPreviewRows(values);
        }
      } catch (err) {
        console.error('Failed to load preview rows:', err);
      } finally {
        if (!isCancelled) setIsLoadingPreview(false);
      }
    };

    loadPreview();
    return () => {
      isCancelled = true;
    };
  }, [selectedImportSheetId, selectedImportTab, hasToken]);

  // Handle Google Sign In
  const handleConnectGoogle = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      await connectGoogleAccount();
      setNotification({
        type: 'success',
        message: 'Google Account connected successfully with Sheets & Drive permissions.',
      });
      fetchDriveSheets();
    } catch (err: any) {
      setAuthError(err.message || 'Google authentication was cancelled or failed.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle Disconnect
  const handleDisconnect = async () => {
    await disconnectGoogleAccount();
    setSpreadsheets([]);
    setLastExportedUrl(null);
    setNotification({
      type: 'success',
      message: 'Google Account disconnected.',
    });
  };

  // Execute Export to Google Sheets
  const triggerExport = async () => {
    const products = getProducts();
    if (products.length === 0) {
      setNotification({
        type: 'error',
        message: 'Your inventory is currently empty. Add products first before exporting.',
      });
      return;
    }

    if (exportMode === 'new') {
      setIsExporting(true);
      try {
        const result = await createInventorySpreadsheet(newSheetTitle, products);
        setLastExportedUrl(result.spreadsheetUrl);
        setNotification({
          type: 'success',
          message: `Successfully created and exported ${products.length} products to Google Sheets!`,
        });
        fetchDriveSheets();
      } catch (err: any) {
        setNotification({
          type: 'error',
          message: err.message || 'Failed to export to Google Sheets.',
        });
      } finally {
        setIsExporting(false);
      }
    } else {
      // Overwrite/Update existing sheet -> MANDATORY CONFIRMATION DIALOG
      const targetSheet = spreadsheets.find((s) => s.id === selectedExportSheetId);
      const sheetName = targetSheet?.name || 'Selected Spreadsheet';

      setPendingConfirmation({
        type: 'export_overwrite',
        title: `Overwrite Google Sheet: ${sheetName}?`,
        description: `This will update tab '${selectedExportTab}' in '${sheetName}' with ${products.length} current inventory items. Existing cell data in that range will be replaced.`,
        action: async () => {
          setIsExporting(true);
          try {
            await exportToExistingSpreadsheet(selectedExportSheetId, selectedExportTab, products);
            const sheetUrl = `https://docs.google.com/spreadsheets/d/${selectedExportSheetId}/edit`;
            setLastExportedUrl(sheetUrl);
            setNotification({
              type: 'success',
              message: `Successfully updated '${sheetName}' with ${products.length} items!`,
            });
          } catch (err: any) {
            setNotification({
              type: 'error',
              message: err.message || 'Failed to update Google Sheet.',
            });
          } finally {
            setIsExporting(false);
          }
        },
      });
    }
  };

  // Execute Import from Google Sheets
  const triggerImport = async () => {
    if (!selectedImportSheetId || !selectedImportTab) {
      setNotification({
        type: 'error',
        message: 'Please select a spreadsheet and sheet tab to import from.',
      });
      return;
    }

    // MANDATORY CONFIRMATION DIALOG FOR IMPORT
    setPendingConfirmation({
      type: 'import_overwrite',
      title: `Import products from tab '${selectedImportTab}'?`,
      description: `This will read product rows from '${selectedImportTab}' and import them into your SmartStock AI catalog. Products with matching barcodes or names will be updated with the spreadsheet quantities and prices.`,
      action: async () => {
        setIsImporting(true);
        try {
          const allRows = await readSpreadsheetValues(
            selectedImportSheetId,
            `'${selectedImportTab}'!A1:Z500`
          );

          if (allRows.length <= 1) {
            throw new Error('No product data rows found in this sheet tab.');
          }

          const headerRow = allRows[0].map((h) => (h || '').toLowerCase().trim());

          // Detect column indices
          const nameIdx = headerRow.findIndex((h) => h.includes('name') || h.includes('product') || h.includes('item'));
          const skuIdx = headerRow.findIndex((h) => h.includes('sku') || h.includes('code'));
          const barcodeIdx = headerRow.findIndex((h) => h.includes('barcode') || h.includes('upc') || h.includes('ean'));
          const qtyIdx = headerRow.findIndex((h) => h.includes('qty') || h.includes('quantity') || h.includes('stock'));
          const costIdx = headerRow.findIndex((h) => h.includes('cost') || h.includes('purchase') || h.includes('buy'));
          const retailIdx = headerRow.findIndex((h) => h.includes('retail') || h.includes('sale') || h.includes('price'));
          const mfdIdx = headerRow.findIndex((h) => h.includes('mfd') || h.includes('mfg') || h.includes('manufacture'));
          const expIdx = headerRow.findIndex((h) => h.includes('exp') || h.includes('expiry') || h.includes('expiration'));
          const categoryIdx = headerRow.findIndex((h) => h.includes('category') || h.includes('type') || h.includes('dept'));
          const batchIdx = headerRow.findIndex((h) => h.includes('batch') || h.includes('lot'));

          let importedCount = 0;
          const dataRows = allRows.slice(1);

          for (const row of dataRows) {
            const rawName = nameIdx !== -1 ? row[nameIdx] : row[1] || row[0];
            if (!rawName || !rawName.trim()) continue;

            const name = rawName.trim();
            const sku = skuIdx !== -1 && row[skuIdx] ? row[skuIdx].trim() : `SKU-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
            const barcode = barcodeIdx !== -1 && row[barcodeIdx] ? row[barcodeIdx].trim() : sku;
            const quantity = qtyIdx !== -1 ? parseInt(row[qtyIdx], 10) || 0 : 1;
            const price = costIdx !== -1 ? parseFloat(row[costIdx].replace(/[^0-9.]/g, '')) || 0 : 0;
            const retailPrice = retailIdx !== -1 ? parseFloat(row[retailIdx].replace(/[^0-9.]/g, '')) || price * 1.25 : price * 1.25;
            const mfd = mfdIdx !== -1 && row[mfdIdx] ? row[mfdIdx].trim() : '';
            const exp = expIdx !== -1 && row[expIdx] ? row[expIdx].trim() : '';
            const category = categoryIdx !== -1 && row[categoryIdx] ? row[categoryIdx].trim() : 'General';
            const batch = batchIdx !== -1 && row[batchIdx] ? row[batchIdx].trim() : '';

            saveProduct({
              productName: name,
              sku,
              barcode,
              quantity: String(quantity),
              stockQuantity: quantity,
              purchasePrice: price.toFixed(2),
              sellingPrice: retailPrice.toFixed(2),
              manufacturingDate: mfd,
              expiryDate: exp,
              category,
              batchNumber: batch,
              status: quantity <= 0 ? 'out_of_stock' : quantity <= 5 ? 'low_stock' : 'in_stock',
              savedAt: new Date().toISOString(),
            });

            importedCount++;
          }

          setImportSummary({ count: importedCount });
          setNotification({
            type: 'success',
            message: `Successfully imported ${importedCount} products into your inventory!`,
          });

          if (onProductsUpdated) {
            onProductsUpdated();
          }
        } catch (err: any) {
          setNotification({
            type: 'error',
            message: err.message || 'Failed to import products from Google Sheets.',
          });
        } finally {
          setIsImporting(false);
        }
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  {t('sheets.title')}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950 uppercase tracking-wider">
                  Google Workspace
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                {t('sheets.subtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Notifications */}
        {notification && (
          <div
            className={`px-5 py-3 text-xs font-semibold flex items-center justify-between transition-colors ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-b border-emerald-100'
                : 'bg-rose-50 text-rose-900 border-b border-rose-100'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Auth Barrier / Connected Banner */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80">
          {!hasToken ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-extrabold text-slate-900">
                    Connect Your Google Account
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Allow SmartStock AI to access Google Drive and Google Sheets to export and import your product catalog, with permission from your Google Account.
                </p>
                {authError && (
                  <p className="text-[11px] font-bold text-rose-600 pt-1">
                    {authError}
                  </p>
                )}
              </div>

              {/* Official Google Sign-In Styled Button */}
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={isAuthenticating}
                className="gsi-material-button inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs font-bold text-xs transition-all active:scale-98 disabled:opacity-50 shrink-0"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Connecting…</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    <span>{t('sheets.signInWithGoogle')}</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-emerald-200/80 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0">
                  {googleUser?.photoURL ? (
                    <img
                      src={googleUser.photoURL}
                      alt="Google User"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-black text-xs text-emerald-800">
                      {googleUser?.displayName?.charAt(0) || 'G'}
                    </span>
                  )}
                </div>
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {googleUser?.displayName || 'Google Account'}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800">
                      <Check className="w-2.5 h-2.5" />
                      <span>{t('sheets.connected')}</span>
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">
                    {googleUser?.email || ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchDriveSheets}
                  disabled={isLoadingDrive}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  title="Refresh Drive Spreadsheets"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  <span>{t('sheets.disconnect')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-5 pt-2 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('sheets.exportTab')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{t('sheets.importTab')}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExportMode('new')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    exportMode === 'new'
                      ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-extrabold text-slate-900">
                      {t('sheets.createNewSpreadsheet')}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Auto-formats headers, frozen rows, and columns in your Drive.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setExportMode('existing')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    exportMode === 'existing'
                      ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-extrabold text-slate-900">
                      {t('sheets.selectExisting')}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Select an existing sheet from your Google Drive.
                  </p>
                </button>
              </div>

              {exportMode === 'new' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Spreadsheet Name
                  </label>
                  <input
                    type="text"
                    value={newSheetTitle}
                    onChange={(e) => setNewSheetTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="e.g. SmartStock AI - Inventory"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Select Google Sheet from Drive
                    </label>
                    <select
                      value={selectedExportSheetId}
                      onChange={(e) => setSelectedExportSheetId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      {spreadsheets.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                      {spreadsheets.length === 0 && (
                        <option value="">No Google Sheets found in your Drive</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Target Sheet Tab Name
                    </label>
                    <input
                      type="text"
                      value={selectedExportTab}
                      onChange={(e) => setSelectedExportTab(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
                      placeholder="e.g. Sheet1 or Inventory Catalog"
                    />
                  </div>
                </div>
              )}

              {/* Data Summary */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Products to Export:</span>
                <span className="font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                  {getProducts().length} items
                </span>
              </div>

              {/* Export CTA */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={triggerExport}
                  disabled={!hasToken || isExporting}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Exporting to Google Sheets…</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Export Inventory to Google Sheets</span>
                    </>
                  )}
                </button>
              </div>

              {/* Success View Link */}
              {lastExportedUrl && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>{t('sheets.exportSuccess')}</span>
                  </div>
                  <a
                    href={lastExportedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-black text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1"
                  >
                    <span>{t('sheets.openInSheets')}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Choose Spreadsheet to Import From
                </label>
                <select
                  value={selectedImportSheetId}
                  onChange={(e) => setSelectedImportSheetId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {spreadsheets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                  {spreadsheets.length === 0 && (
                    <option value="">No Google Sheets found in your Drive</option>
                  )}
                </select>
              </div>

              {/* Sheet Tab Picker */}
              {availableImportTabs.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Choose Sheet Tab
                  </label>
                  <select
                    value={selectedImportTab}
                    onChange={(e) => setSelectedImportTab(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
                  >
                    {availableImportTabs.map((tab) => (
                      <option key={tab} value={tab}>
                        {tab}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Preview of rows detected */}
              <div>
                <div className="flex items-center justify-between pb-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Table className="w-3.5 h-3.5 text-slate-500" />
                    <span>Data Preview (First 5 Rows)</span>
                  </span>
                  {isLoadingPreview && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading preview…
                    </span>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 overflow-x-auto max-h-48 bg-slate-50">
                  {previewRows.length > 0 ? (
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                          {previewRows[0].map((header, idx) => (
                            <th key={idx} className="p-2 whitespace-nowrap">
                              {header || `Col ${idx + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {previewRows.slice(1).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="p-2 whitespace-nowrap text-slate-600">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No rows available to preview from this sheet tab.
                    </div>
                  )}
                </div>
              </div>

              {/* Import CTA */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={triggerImport}
                  disabled={!hasToken || isImporting || previewRows.length <= 1}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Importing from Google Sheets…</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Import Products into SmartStock AI</span>
                    </>
                  )}
                </button>
              </div>

              {importSummary && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t('sheets.importSuccess')} ({importSummary.count} products)</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400 font-medium">
            SmartStock AI · Google Sheets v4 API
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>

      {/* MANDATORY CONFIRMATION MODAL FOR DESTRUCTIVE/MUTATING ACTIONS */}
      {pendingConfirmation && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-base font-black text-slate-900">
                {pendingConfirmation.title}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {pendingConfirmation.description}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingConfirmation(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const action = pendingConfirmation.action;
                  setPendingConfirmation(null);
                  await action();
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm shadow-emerald-600/25"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
