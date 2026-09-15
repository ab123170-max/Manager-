/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  FileSpreadsheet,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  DollarSign,
  Calendar,
  Building,
  User,
  Hash,
  Sparkles,
  RefreshCw,
  Eye,
  Check,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  ExtractedInvoiceData,
  InvoiceData,
  InvoiceLineItem,
  CapturedPhotoItem,
} from '../../types';
import { extractInvoiceFromImages } from '../../services/geminiService';
import { confirmPurchaseInvoice, saveDraftInvoice } from '../../utils/unifiedDataStore';

interface ScanInvoiceViewProps {
  onSuccessNavigate?: (targetSection: 'inventory' | 'account', subView: string) => void;
}

export const ScanInvoiceView: React.FC<ScanInvoiceViewProps> = ({ onSuccessNavigate }) => {
  // Capture / Upload state
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhotoItem[]>([]);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Extraction state
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Review & Edit Form state
  const [invoiceForm, setInvoiceForm] = useState<{
    invoiceNumber: string;
    invoiceDate: string;
    supplier: string;
    customerName: string;
    items: InvoiceLineItem[];
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    grandTotal: number;
    paymentStatus: 'paid' | 'pending' | 'partial';
    paymentMethod: 'bank_transfer' | 'cash' | 'card' | 'upi' | 'credit';
    notes: string;
  } | null>(null);

  const [confirmationStatus, setConfirmationStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream when unmounting
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    stopCameraStream();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access camera. Please check permissions or upload photos.');
      setIsCameraActive(false);
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    const newPhoto: CapturedPhotoItem = {
      id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      dataUrl,
      label: `Page ${capturedPhotos.length + 1}`,
      source: 'camera',
      timestamp: Date.now(),
    };

    setCapturedPhotos((prev) => [...prev, newPhoto]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const newPhoto: CapturedPhotoItem = {
            id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            dataUrl: reader.result,
            label: file.name,
            source: 'upload',
            timestamp: Date.now(),
          };
          setCapturedPhotos((prev) => [...prev, newPhoto]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (id: string) => {
    setCapturedPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Sample demo invoice for testing
  const loadSampleInvoice = () => {
    // Generate high resolution SVG data url of a sample purchase invoice
    const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
      <rect width="800" height="1000" fill="#ffffff"/>
      <rect x="40" y="40" width="720" height="920" fill="none" stroke="#e2e8f0" stroke-width="2"/>
      <text x="70" y="90" font-family="sans-serif" font-size="24" font-weight="bold" fill="#0f172a">TAX INVOICE / PURCHASE BILL</text>
      <text x="70" y="125" font-family="sans-serif" font-size="14" fill="#64748b">Supplier: APEX WHOLESALE DISTRIBUTORS LLC</text>
      <text x="70" y="145" font-family="sans-serif" font-size="14" fill="#64748b">Invoice No: INV-2025-8849 | Date: 2025-02-28</text>
      <text x="70" y="165" font-family="sans-serif" font-size="14" fill="#64748b">Billed To: SmartStock Retail Hub</text>
      <line x1="70" y1="190" x2="730" y2="190" stroke="#cbd5e1" stroke-width="1.5"/>
      <text x="70" y="215" font-family="sans-serif" font-size="13" font-weight="bold" fill="#334155">ITEM DESCRIPTION</text>
      <text x="360" y="215" font-family="sans-serif" font-size="13" font-weight="bold" fill="#334155">BARCODE</text>
      <text x="490" y="215" font-family="sans-serif" font-size="13" font-weight="bold" fill="#334155">QTY</text>
      <text x="560" y="215" font-family="sans-serif" font-size="13" font-weight="bold" fill="#334155">RATE</text>
      <text x="650" y="215" font-family="sans-serif" font-size="13" font-weight="bold" fill="#334155">AMT</text>
      <line x1="70" y1="230" x2="730" y2="230" stroke="#e2e8f0" stroke-width="1"/>
      <text x="70" y="260" font-family="sans-serif" font-size="13" fill="#1e293b">1. Organic Sumatra Coffee 340g (MFD: 2025-02-10, EXP: 2026-06-15)</text>
      <text x="360" y="260" font-family="sans-serif" font-size="13" fill="#64748b">084729103958</text>
      <text x="490" y="260" font-family="sans-serif" font-size="13" fill="#1e293b">20</text>
      <text x="560" y="260" font-family="sans-serif" font-size="13" fill="#1e293b">$11.50</text>
      <text x="650" y="260" font-family="sans-serif" font-size="13" fill="#1e293b">$230.00</text>
      <text x="70" y="300" font-family="sans-serif" font-size="13" fill="#1e293b">2. Extra Virgin Olive Oil 500ml (DOM: 2024-11-15, EXP: 2025-11-15)</text>
      <text x="360" y="300" font-family="sans-serif" font-size="13" fill="#64748b">739201948201</text>
      <text x="490" y="300" font-family="sans-serif" font-size="13" fill="#1e293b">15</text>
      <text x="560" y="300" font-family="sans-serif" font-size="13" fill="#1e293b">$15.00</text>
      <text x="650" y="300" font-family="sans-serif" font-size="13" fill="#1e293b">$225.00</text>
      <text x="70" y="340" font-family="sans-serif" font-size="13" fill="#1e293b">3. Raw Organic Honey 500g (PKD: 2025-01-10, BB: 2027-01-10)</text>
      <text x="360" y="340" font-family="sans-serif" font-size="13" fill="#64748b">890123849102</text>
      <text x="490" y="340" font-family="sans-serif" font-size="13" fill="#1e293b">10</text>
      <text x="560" y="340" font-family="sans-serif" font-size="13" fill="#1e293b">$9.20</text>
      <text x="650" y="340" font-family="sans-serif" font-size="13" fill="#1e293b">$92.00</text>
      <line x1="70" y1="380" x2="730" y2="380" stroke="#cbd5e1" stroke-width="1"/>
      <text x="500" y="415" font-family="sans-serif" font-size="13" fill="#64748b">Sub Total:</text>
      <text x="650" y="415" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0f172a">$547.00</text>
      <text x="500" y="445" font-family="sans-serif" font-size="13" fill="#64748b">Tax / GST (5%):</text>
      <text x="650" y="445" font-family="sans-serif" font-size="13" fill="#0f172a">$27.35</text>
      <text x="500" y="475" font-family="sans-serif" font-size="15" font-weight="bold" fill="#0f172a">GRAND TOTAL:</text>
      <text x="650" y="475" font-family="sans-serif" font-size="16" font-weight="bold" fill="#4f46e5">$574.35</text>
    </svg>`;

    const dataUrl = `data:image/svg+xml;base64,${btoa(sampleSvg)}`;
    setCapturedPhotos([
      {
        id: `sample_${Date.now()}`,
        dataUrl,
        label: 'Apex Wholesale Invoice #8849',
        source: 'sample',
        timestamp: Date.now(),
      },
    ]);
  };

  // Perform AI extraction with Gemini Vision
  const handleExtractInvoice = async () => {
    if (capturedPhotos.length === 0) {
      setExtractError('Please capture or upload at least one invoice image first.');
      return;
    }

    setIsExtracting(true);
    setExtractError(null);
    setConfirmationStatus(null);
    stopCameraStream();

    try {
      const extracted: ExtractedInvoiceData = await extractInvoiceFromImages(
        capturedPhotos.map((p) => p.dataUrl)
      );

      const items: InvoiceLineItem[] = extracted.items.map((item, idx) => ({
        id: `item_${idx}_${Date.now()}`,
        productName: item.productName || `Item #${idx + 1}`,
        barcode: item.barcode || '',
        quantity: item.quantity || 1,
        unit: item.unit || 'units',
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || (item.quantity || 1) * (item.unitPrice || 0),
        taxRate: item.taxRate || 0,
        discount: item.discount || 0,
        mfd: item.mfd || '',
        exp: item.exp || '',
        batchNumber: item.batchNumber || '',
        sellingPrice: Math.round((item.unitPrice || 0) * 1.35 * 100) / 100,
      }));

      setInvoiceForm({
        invoiceNumber: extracted.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
        invoiceDate: extracted.invoiceDate || new Date().toISOString().split('T')[0],
        supplier: extracted.supplier || 'Vendor Supplier',
        customerName: extracted.customerName || '',
        items,
        subtotal: extracted.subtotal || items.reduce((sum, i) => sum + i.totalPrice, 0),
        taxAmount: extracted.taxAmount || 0,
        discountAmount: extracted.discountAmount || 0,
        grandTotal: extracted.grandTotal || extracted.subtotal || items.reduce((sum, i) => sum + i.totalPrice, 0),
        paymentStatus: 'paid',
        paymentMethod: 'bank_transfer',
        notes: `Extracted via Gemini Vision from ${capturedPhotos.length} photo(s).`,
      });
    } catch (err: unknown) {
      console.error('Invoice extraction failed:', err);
      setExtractError(
        (err as Error)?.message || 'Failed to process invoice images. Please retry or adjust photos.'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  // Line item table helpers
  const handleItemChange = (index: number, field: keyof InvoiceLineItem, value: any) => {
    if (!invoiceForm) return;

    const updatedItems = [...invoiceForm.items];
    const currentItem = { ...updatedItems[index], [field]: value };

    // Auto-calculate total price for row
    if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
      const qty = Number(field === 'quantity' ? value : currentItem.quantity) || 0;
      const rate = Number(field === 'unitPrice' ? value : currentItem.unitPrice) || 0;
      const disc = Number(field === 'discount' ? value : currentItem.discount) || 0;
      currentItem.totalPrice = Math.max(0, qty * rate - disc);
    }

    updatedItems[index] = currentItem;

    const subtotal = updatedItems.reduce((acc, i) => acc + (Number(i.totalPrice) || 0), 0);
    const grandTotal = subtotal + (Number(invoiceForm.taxAmount) || 0) - (Number(invoiceForm.discountAmount) || 0);

    setInvoiceForm({
      ...invoiceForm,
      items: updatedItems,
      subtotal,
      grandTotal,
    });
  };

  const handleAddItem = () => {
    if (!invoiceForm) return;
    const newItem: InvoiceLineItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productName: '',
      barcode: '',
      quantity: 1,
      unit: 'units',
      unitPrice: 0,
      totalPrice: 0,
      sellingPrice: 0,
    };
    setInvoiceForm({
      ...invoiceForm,
      items: [...invoiceForm.items, newItem],
    });
  };

  const handleRemoveItem = (index: number) => {
    if (!invoiceForm) return;
    const updatedItems = invoiceForm.items.filter((_, i) => i !== index);
    const subtotal = updatedItems.reduce((acc, i) => acc + (Number(i.totalPrice) || 0), 0);
    const grandTotal = subtotal + (Number(invoiceForm.taxAmount) || 0) - (Number(invoiceForm.discountAmount) || 0);

    setInvoiceForm({
      ...invoiceForm,
      items: updatedItems,
      subtotal,
      grandTotal,
    });
  };

  // Final Confirmation: updates Purchase Record + Inventory Stock + Accounting Entry
  const handleConfirmAndSave = () => {
    if (!invoiceForm) return;

    if (!invoiceForm.supplier.trim()) {
      alert('Please specify a supplier/vendor name.');
      return;
    }

    if (invoiceForm.items.length === 0) {
      alert('Please add at least one line item.');
      return;
    }

    const payload: InvoiceData = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      invoiceNumber: invoiceForm.invoiceNumber.trim() || `INV-${Date.now().toString().slice(-6)}`,
      invoiceDate: invoiceForm.invoiceDate,
      supplier: invoiceForm.supplier.trim(),
      customerName: invoiceForm.customerName.trim(),
      items: invoiceForm.items,
      subtotal: invoiceForm.subtotal,
      taxAmount: invoiceForm.taxAmount,
      discountAmount: invoiceForm.discountAmount,
      grandTotal: invoiceForm.grandTotal,
      paymentStatus: invoiceForm.paymentStatus,
      paymentMethod: invoiceForm.paymentMethod,
      notes: invoiceForm.notes,
      images: capturedPhotos.map((p) => p.dataUrl),
      createdAt: new Date().toISOString(),
    };

    const res = confirmPurchaseInvoice(payload);

    if (res.success) {
      setConfirmationStatus({
        success: true,
        message: res.message,
      });
      // Clear form after 2.5s or allow user to navigate
    } else {
      setConfirmationStatus({
        success: false,
        message: res.message,
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 sm:p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
            <span>Dedicated OCR Pipeline</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Scan Purchase Invoice &amp; Bills
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Capture vendor bills or tax invoices. Gemini Vision parses line items, rates, dates (MFD/EXP), and automatically updates your Inventory Stock &amp; Accounting Ledger upon confirmation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSampleInvoice}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1.5 border border-white/10"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Load Sample Bill</span>
          </button>
        </div>
      </div>

      {/* STEP 1: Image Capture & Upload Section */}
      {!invoiceForm && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Camera Feed / Photo Grid */}
          <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-600" />
                <span>1. Capture or Upload Invoice Pages ({capturedPhotos.length} Added)</span>
              </h2>

              {isCameraActive && (
                <button
                  type="button"
                  onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg bg-slate-100 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Flip</span>
                </button>
              )}
            </div>

            {/* Live Camera Viewport */}
            {isCameraActive ? (
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-4/3 sm:aspect-16/9 flex items-center justify-center border border-slate-800">
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Overlay Framing Box */}
                <div className="absolute inset-6 sm:inset-10 border-2 border-indigo-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                  <div className="text-[11px] font-bold text-white bg-slate-900/80 px-2 py-1 rounded-md self-start backdrop-blur-xs">
                    Align invoice edges inside box
                  </div>
                  <div className="text-[10px] text-slate-300 bg-slate-900/70 px-2 py-0.5 rounded-md self-end">
                    Supports Multi-page capture
                  </div>
                </div>

                {/* Camera Actions Bar */}
                <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={stopCameraStream}
                    className="px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-bold backdrop-blur-xs"
                  >
                    Close Camera
                  </button>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="w-14 h-14 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow-xl border-4 border-indigo-600 hover:scale-105 active:scale-95 transition-transform"
                    aria-label="Capture page"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                      <Camera className="w-5 h-5" />
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 sm:p-10 flex flex-col items-center justify-center text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Ready to capture or upload invoice images
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                  Take photos of all invoice pages, or upload PDF/JPG/PNG bill images.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 flex items-center gap-2 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Open Device Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300 flex items-center gap-2 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span>Upload Image Files</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {cameraError && (
                  <p className="text-xs text-rose-600 font-semibold mt-3 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {cameraError}
                  </p>
                )}
              </div>
            )}

            {/* Thumbnails of Captured Pages */}
            {capturedPhotos.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Captured Invoice Pages ({capturedPhotos.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {capturedPhotos.map((photo, idx) => (
                    <div
                      key={photo.id}
                      className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-3/4 flex items-center justify-center shadow-xs"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={`Page ${idx + 1}`}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                          title="Remove photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="absolute bottom-1.5 left-1.5 text-[10px] font-bold text-white bg-slate-900/80 px-1.5 py-0.5 rounded-md">
                        Page {idx + 1}
                      </span>
                    </div>
                  ))}

                  {/* Add more button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isCameraActive) startCamera();
                    }}
                    className="rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/50 aspect-3/4 flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 transition-all text-xs font-bold gap-1"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add Page</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Actions & Pipeline Status */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>AI Vision Supervisor</span>
              </h3>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100/80 space-y-1">
                  <p className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Automated Relational Sync
                  </p>
                  <p className="text-[11px] text-indigo-900/80 leading-relaxed">
                    Once confirmed, items are added to <strong>Catalog</strong>, stock increments automatically, and an <strong>Inventory Accounting</strong> transaction is logged.
                  </p>
                </div>

                <ul className="space-y-1.5 text-slate-600 text-[11px]">
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Detects MFD, EXP, B.No, QTY, RATE, TAX, AMT</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Allows manual review &amp; edits before saving</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Prevents duplicate entries of the same invoice</span>
                  </li>
                </ul>
              </div>

              {extractError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
                  {extractError}
                </div>
              )}

              <button
                type="button"
                disabled={capturedPhotos.length === 0 || isExtracting}
                onClick={handleExtractInvoice}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gemini Processing ({capturedPhotos.length} Images)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Process Invoice with AI ({capturedPhotos.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Review, Verification & Line-Item Table Editor */}
      {invoiceForm && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/80 shadow-md space-y-6 animate-in fade-in duration-300">
          {/* Header Status & Top Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Extracted &amp; Ready for Review
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 mt-1">
                Review Extracted Invoice Data
              </h2>
              <p className="text-xs text-slate-500">
                Inspect and correct any details before confirming into Inventory &amp; Accounting.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setInvoiceForm(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
              >
                Re-scan / Back
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSave}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Confirm &amp; Update Inventory</span>
              </button>
            </div>
          </div>

          {/* Success Banner if confirmed */}
          {confirmationStatus && (
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                confirmationStatus.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {confirmationStatus.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-bold">{confirmationStatus.message}</p>
                </div>
              </div>

              {confirmationStatus.success && onSuccessNavigate && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSuccessNavigate('inventory', 'accounting')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
                  >
                    View Accounting Ledger
                  </button>
                  <button
                    type="button"
                    onClick={() => onSuccessNavigate('inventory', 'products')}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
                  >
                    View Products
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Invoice Header Details Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <Hash className="w-3 h-3 text-slate-500" /> Invoice Number *
              </label>
              <input
                type="text"
                value={invoiceForm.invoiceNumber}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                placeholder="e.g. INV-8849"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" /> Invoice Date *
              </label>
              <input
                type="date"
                value={invoiceForm.invoiceDate}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })}
                className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <Building className="w-3 h-3 text-slate-500" /> Supplier / Vendor *
              </label>
              <input
                type="text"
                value={invoiceForm.supplier}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, supplier: e.target.value })}
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                placeholder="e.g. Apex Wholesale LLC"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-500" /> Customer / Consignee
              </label>
              <input
                type="text"
                value={invoiceForm.customerName}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, customerName: e.target.value })}
                className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Billed to (optional)"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <span>Line Items ({invoiceForm.items.length})</span>
              </h3>

              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/90 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Product Description</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Barcode / SKU</th>
                    <th className="py-2.5 px-3 min-w-[80px]">Qty</th>
                    <th className="py-2.5 px-3 min-w-[100px]">Purchase Rate</th>
                    <th className="py-2.5 px-3 min-w-[100px]">Line Total</th>
                    <th className="py-2.5 px-3 min-w-[100px]">Target Selling Price</th>
                    <th className="py-2.5 px-3 min-w-[110px]">EXP Date</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {invoiceForm.items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 text-slate-500 font-bold">{index + 1}</td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                          className="w-full px-2 py-1 text-xs font-semibold bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-md"
                          placeholder="Product Name"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.barcode || ''}
                          onChange={(e) => handleItemChange(index, 'barcode', e.target.value)}
                          className="w-full px-2 py-1 text-xs font-mono bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-md"
                          placeholder="Barcode"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-20 px-2 py-1 text-xs font-bold bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-md"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-bold">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                            className="w-20 px-2 py-1 text-xs font-bold bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-md"
                          />
                        </div>
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        ${Number(item.totalPrice).toFixed(2)}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-bold">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.sellingPrice || ''}
                            onChange={(e) => handleItemChange(index, 'sellingPrice', e.target.value)}
                            className="w-20 px-2 py-1 text-xs font-bold text-emerald-700 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-md"
                            placeholder="Selling Price"
                          />
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.exp || ''}
                          onChange={(e) => handleItemChange(index, 'exp', e.target.value)}
                          className="w-24 px-2 py-1 text-xs bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-md"
                          placeholder="YYYY-MM-DD"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals and Payment Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
            {/* Left: Payment info */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Payment &amp; Additional Notes
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={invoiceForm.paymentStatus}
                    onChange={(e) =>
                      setInvoiceForm({
                        ...invoiceForm,
                        paymentStatus: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="paid">Paid in Full</option>
                    <option value="pending">Pending / On Credit</option>
                    <option value="partial">Partial Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={invoiceForm.paymentMethod}
                    onChange={(e) =>
                      setInvoiceForm({
                        ...invoiceForm,
                        paymentMethod: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="bank_transfer">Bank Transfer / NEFT</option>
                    <option value="cash">Cash</option>
                    <option value="card">Credit / Debit Card</option>
                    <option value="upi">UPI / Instant Pay</option>
                    <option value="credit">Vendor Credit Account</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Notes / Internal Ref
                </label>
                <textarea
                  rows={2}
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Optional notes or batch details..."
                />
              </div>
            </div>

            {/* Right: Grand Totals Breakdown */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Sub Total ({invoiceForm.items.length} items):</span>
                <span className="font-bold text-slate-900">${Number(invoiceForm.subtotal).toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Total Tax / VAT / GST:</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={invoiceForm.taxAmount}
                    onChange={(e) =>
                      setInvoiceForm({
                        ...invoiceForm,
                        taxAmount: Number(e.target.value) || 0,
                        grandTotal:
                          Number(invoiceForm.subtotal) + (Number(e.target.value) || 0) - Number(invoiceForm.discountAmount),
                      })
                    }
                    className="w-20 px-2 py-0.5 text-xs text-right font-bold bg-white border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Total Discount:</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={invoiceForm.discountAmount}
                    onChange={(e) =>
                      setInvoiceForm({
                        ...invoiceForm,
                        discountAmount: Number(e.target.value) || 0,
                        grandTotal:
                          Number(invoiceForm.subtotal) + Number(invoiceForm.taxAmount) - (Number(e.target.value) || 0),
                      })
                    }
                    className="w-20 px-2 py-0.5 text-xs text-right font-bold bg-white border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="text-sm font-extrabold text-slate-900">Grand Total:</span>
                <span className="text-lg font-black text-indigo-600">
                  ${Number(invoiceForm.grandTotal).toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleConfirmAndSave}
                className="w-full mt-3 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Purchase &amp; Increase Stock</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
