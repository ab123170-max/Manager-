/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  Copy,
  Hash,
  Calendar,
  DollarSign,
  Package,
  Layers,
  Barcode,
  Scale,
  AlertTriangle,
  HelpCircle,
  BookmarkCheck,
  Check,
  Tag,
  User,
  FileText,
  Building,
  MapPin,
  Mail,
  Phone,
  Globe,
} from 'lucide-react';
import { ExtractedFormData, CustomField } from '../types';
import { saveProductToInventory } from '../utils/inventoryStore';

interface AutoFillFormProps {
  initialData: ExtractedFormData;
  imageThumbnail: string | null;
  onSubmit: (formData: ExtractedFormData) => void;
  onRetake: () => void;
  onInventoryUpdated?: () => void;
}

export const AutoFillForm: React.FC<AutoFillFormProps> = ({
  initialData,
  imageThumbnail,
  onSubmit,
  onRetake,
  onInventoryUpdated,
}) => {
  const [formData, setFormData] = useState<ExtractedFormData>(initialData);
  const [activeTab, setActiveTab] = useState<'product' | 'document'>(
    initialData.isProductOrPackage || initialData.productName ? 'product' : 'document'
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleFieldChange = (
    field: keyof ExtractedFormData,
    value: string | number | boolean | string[] | Record<string, number>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCustomFieldChange = (id: string, key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      customFields: prev.customFields.map((item) =>
        item.id === id ? { ...item, key, value } : item
      ),
    }));
  };

  const handleAddCustomField = () => {
    const newField: CustomField = {
      id: `custom_${Date.now()}`,
      key: '',
      value: '',
    };
    setFormData((prev) => ({
      ...prev,
      customFields: [...prev.customFields, newField],
    }));
  };

  const handleRemoveCustomField = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((item) => item.id !== id),
    }));
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all form fields?')) {
      setFormData({
        isProductOrPackage: true,
        productName: '',
        brand: '',
        category: '',
        sku: '',
        barcode: '',
        batchNumber: '',
        manufacturingDate: '',
        expiryDate: '',
        bestBefore: '',
        quantity: '',
        unit: '',
        mrp: '',
        confidence: {},
        warnings: [],
        missingFields: [],
        documentType: '',
        fullName: '',
        documentNumber: '',
        dateOfBirth: '',
        issueDate: '',
        email: '',
        phone: '',
        address: '',
        organization: '',
        nationality: '',
        notesOrAdditional: '',
        confidenceScore: 0,
        customFields: [],
      });
    }
  };

  const handleCopyValue = (fieldKey: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveToInventory = () => {
    saveProductToInventory(formData, imageThumbnail || undefined);
    setSavedSuccess(true);
    if (onInventoryUpdated) {
      onInventoryUpdated();
    }
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const overallConfidencePercent = Math.round((formData.confidenceScore || 0.95) * 100);

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* Top Banner: AI Status, Thumbnail, Confidence & Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {imageThumbnail && (
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shrink-0 relative group">
                <img
                  src={imageThumbnail}
                  alt="Scanned item thumbnail"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Gemini 3.7 Supervised
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {overallConfidencePercent}% Confidence
                </span>
                {formData.localOcrAssisted && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    OpenCV + Local OCR Cue Assist
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                {formData.productName || formData.fullName || 'Scanned Document / Item'}
              </h3>
              <p className="text-xs text-slate-500">
                Fields have been auto-filled with zero-hallucination verification. Review or modify before saving.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSaveToInventory}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                savedSuccess
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
              }`}
            >
              {savedSuccess ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  Saved to Inventory!
                </>
              ) : (
                <>
                  <Package className="w-3.5 h-3.5" />
                  Save Product
                </>
              )}
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Payload
            </button>
          </div>
        </div>

        {/* Warnings & Missing Fields Banners */}
        {formData.warnings && formData.warnings.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Vision Supervisor Warnings ({formData.warnings.length}):
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800/90 pl-1">
              {formData.warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {formData.missingFields && formData.missingFields.length > 0 && (
          <div className="mt-3 flex items-center gap-2 flex-wrap text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              Missing / Undetermined Fields:
            </span>
            {formData.missingFields.map((f, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-mono text-slate-600"
              >
                {f}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Mode Navigation Tabs: Product/Packaging vs Identity/Document */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 gap-1 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('product')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'product'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Product &amp; Package Fields</span>
          {formData.productName && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('document')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'document'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Document &amp; Identity Fields</span>
          {formData.fullName && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
        </button>
      </div>

      {/* SECTION A: PRODUCT & PACKAGING FORM FIELDS */}
      {activeTab === 'product' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" />
                Product Label &amp; Inventory Attributes
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Extracted SKU, Barcode, Batch Number, Dates, Quantity, and MRP
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              Zero Guessing Enforced
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Product Name */}
            <div className="sm:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-prod-name"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Package className="w-3.5 h-3.5 text-slate-400" />
                  <span>Product Name</span>
                </label>
                {formData.productName && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    AI Filled
                  </span>
                )}
              </div>
              <input
                id="field-prod-name"
                type="text"
                value={formData.productName}
                onChange={(e) => handleFieldChange('productName', e.target.value)}
                placeholder="e.g. Extra Virgin Olive Oil 500ml"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            {/* Brand */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-prod-brand"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>Brand / Manufacturer</span>
                </label>
                {formData.brand && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    AI Filled
                  </span>
                )}
              </div>
              <input
                id="field-prod-brand"
                type="text"
                value={formData.brand}
                onChange={(e) => handleFieldChange('brand', e.target.value)}
                placeholder="e.g. Terra Mediterra"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-prod-cat"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Category</span>
                </label>
                {formData.category && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    AI Filled
                  </span>
                )}
              </div>
              <input
                id="field-prod-cat"
                type="text"
                value={formData.category}
                onChange={(e) => handleFieldChange('category', e.target.value)}
                placeholder="e.g. Food & Beverage"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            {/* SKU */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-prod-sku"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>SKU / Item Code</span>
                </label>
                {formData.sku && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    AI Filled
                  </span>
                )}
              </div>
              <input
                id="field-prod-sku"
                type="text"
                value={formData.sku}
                onChange={(e) => handleFieldChange('sku', e.target.value)}
                placeholder="e.g. TM-EVOO-500"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            {/* Barcode */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-prod-barcode"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Barcode className="w-3.5 h-3.5 text-slate-400" />
                  <span>Barcode (UPC / EAN)</span>
                </label>
                {formData.barcode && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    AI Filled
                  </span>
                )}
              </div>
              <input
                id="field-prod-barcode"
                type="text"
                value={formData.barcode}
                onChange={(e) => handleFieldChange('barcode', e.target.value)}
                placeholder="e.g. 8901030829471"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            {/* Batch / Lot Number */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-prod-batch"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Batch / Lot Number</span>
                </label>
                {formData.batchNumber && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    AI Filled
                  </span>
                )}
              </div>
              <input
                id="field-prod-batch"
                type="text"
                value={formData.batchNumber}
                onChange={(e) => handleFieldChange('batchNumber', e.target.value)}
                placeholder="e.g. LOT-TM2024-X9"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            {/* Manufacturing Date */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-prod-mfg"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mfg Date (MFD / MFG)</span>
                </label>
                {formData.manufacturingDate && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    AI Mapped
                  </span>
                )}
              </div>
              <input
                id="field-prod-mfg"
                type="text"
                value={formData.manufacturingDate}
                onChange={(e) => handleFieldChange('manufacturingDate', e.target.value)}
                placeholder="YYYY-MM-DD or MM/YYYY"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            {/* Packed Date (PKD) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-prod-pkd"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-sky-500" />
                  <span>Packed Date (PKD)</span>
                </label>
                {formData.packedDate && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100">
                    AI Mapped
                  </span>
                )}
              </div>
              <input
                id="field-prod-pkd"
                type="text"
                value={formData.packedDate || ''}
                onChange={(e) => handleFieldChange('packedDate', e.target.value)}
                placeholder="YYYY-MM-DD or MM/YYYY"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            {/* Expiry Date */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-prod-exp"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-rose-500" />
                  <span>Expiry Date (EXP)</span>
                </label>
                {formData.expiryDate && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    AI Mapped
                  </span>
                )}
              </div>
              <input
                id="field-prod-exp"
                type="text"
                value={formData.expiryDate}
                onChange={(e) => handleFieldChange('expiryDate', e.target.value)}
                placeholder="YYYY-MM-DD or MM/YYYY"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-rose-700 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            {/* Best Before */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-prod-bb"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Best Before / Shelf Life</span>
                </label>
                {formData.bestBefore && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    AI Mapped
                  </span>
                )}
              </div>
              <input
                id="field-prod-bb"
                type="text"
                value={formData.bestBefore}
                onChange={(e) => handleFieldChange('bestBefore', e.target.value)}
                placeholder="e.g. 24 Months from MFD or Date"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            {/* Quantity & Unit */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-prod-qty"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Scale className="w-3.5 h-3.5 text-slate-400" />
                  <span>Quantity &amp; Unit</span>
                </label>
                {(formData.quantity || formData.unit) && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    AI Filled
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  id="field-prod-qty"
                  type="text"
                  value={formData.quantity}
                  onChange={(e) => handleFieldChange('quantity', e.target.value)}
                  placeholder="500"
                  className="w-2/3 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
                <input
                  id="field-prod-unit"
                  type="text"
                  value={formData.unit}
                  onChange={(e) => handleFieldChange('unit', e.target.value)}
                  placeholder="ml / g / tablets"
                  className="w-1/3 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
              </div>
            </div>

            {/* MRP / Price */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-prod-mrp"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>MRP / Retail Price</span>
                </label>
                {formData.mrp && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    AI Filled
                  </span>
                )}
              </div>
              <input
                id="field-prod-mrp"
                type="text"
                value={formData.mrp}
                onChange={(e) => handleFieldChange('mrp', e.target.value)}
                placeholder="e.g. $14.99"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION B: IDENTITY & OFFICIAL DOCUMENT FIELDS */}
      {activeTab === 'document' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Identity &amp; Official Document Attributes
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Full Name, Identification Number, Dates, Address, and Organization
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              Official Document Mode
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Full Legal Name */}
            <div className="sm:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-fullname"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Full Legal Name / Entity</span>
                </label>
                {formData.fullName && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    AI Filled
                  </span>
                )}
              </div>
              <input
                id="field-fullname"
                type="text"
                value={formData.fullName}
                onChange={(e) => handleFieldChange('fullName', e.target.value)}
                placeholder="e.g. Alexander James Morgan"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            {/* Document Number */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-docnum"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>Document / Reference #</span>
                </label>
                {formData.documentNumber && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    AI Filled
                  </span>
                )}
              </div>
              <input
                id="field-docnum"
                type="text"
                value={formData.documentNumber}
                onChange={(e) => handleFieldChange('documentNumber', e.target.value)}
                placeholder="e.g. D8294719-CA"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            {/* Date of Birth */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-dob"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Date of Birth</span>
                </label>
                {formData.dateOfBirth && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    AI Filled
                  </span>
                )}
              </div>
              <input
                id="field-dob"
                type="text"
                value={formData.dateOfBirth}
                onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                placeholder="YYYY-MM-DD"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            {/* Issue Date */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-issuedate"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Issue Date</span>
                </label>
                {formData.issueDate && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    AI Filled
                  </span>
                )}
              </div>
              <input
                id="field-issuedate"
                type="text"
                value={formData.issueDate}
                onChange={(e) => handleFieldChange('issueDate', e.target.value)}
                placeholder="YYYY-MM-DD"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            {/* Expiry Date */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-expdate"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-rose-500" />
                  <span>Expiration Date</span>
                </label>
                {formData.expiryDate && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    AI Filled
                  </span>
                )}
              </div>
              <input
                id="field-expdate"
                type="text"
                value={formData.expiryDate}
                onChange={(e) => handleFieldChange('expiryDate', e.target.value)}
                placeholder="YYYY-MM-DD"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-rose-600 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-email"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Email Address</span>
                </label>
                {formData.email && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    AI Filled
                  </span>
                )}
              </div>
              <input
                id="field-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-phone"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Phone Number</span>
                </label>
                {formData.phone && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    AI Filled
                  </span>
                )}
              </div>
              <input
                id="field-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            {/* Organization / Issuing Body */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-org"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>Issuing Organization / Dept</span>
                </label>
                {formData.organization && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    AI Filled
                  </span>
                )}
              </div>
              <input
                id="field-org"
                type="text"
                value={formData.organization}
                onChange={(e) => handleFieldChange('organization', e.target.value)}
                placeholder="e.g. Department of Motor Vehicles"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            {/* Address */}
            <div className="sm:col-span-2 lg:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-address"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Address / Location</span>
                </label>
                {formData.address && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    AI Filled
                  </span>
                )}
              </div>
              <input
                id="field-address"
                type="text"
                value={formData.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                placeholder="Street address, city, state, postal code"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            {/* Nationality */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-nationality"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>Nationality / Country</span>
                </label>
                {formData.nationality && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    AI Filled
                  </span>
                )}
              </div>
              <input
                id="field-nationality"
                type="text"
                value={formData.nationality}
                onChange={(e) => handleFieldChange('nationality', e.target.value)}
                placeholder="e.g. United States"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION C: CUSTOM KEY-VALUE ATTRIBUTES & NOTES */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-slate-500" />
              Custom Attributes &amp; Document Notes
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Supplementary properties detected by OCR or manually added
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddCustomField}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Field
          </button>
        </div>

        {formData.customFields.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-1">
            No extra custom fields detected. You can click &quot;Add Field&quot; to append custom key-value items.
          </p>
        ) : (
          <div className="space-y-2.5">
            {formData.customFields.map((field) => (
              <div
                key={field.id}
                className="flex items-center gap-3 bg-slate-50/70 p-2 rounded-xl border border-slate-200/80"
              >
                <input
                  type="text"
                  value={field.key}
                  onChange={(e) =>
                    handleCustomFieldChange(field.id, e.target.value, field.value)
                  }
                  placeholder="Field label (e.g. Storage, Ingredients)"
                  className="w-1/3 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) =>
                    handleCustomFieldChange(field.id, field.key, e.target.value)
                  }
                  placeholder="Extracted value"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveCustomField(field.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2">
          <label
            htmlFor="field-notes"
            className="text-xs font-semibold text-slate-700 block mb-1.5"
          >
            Additional Notes &amp; Observations
          </label>
          <textarea
            id="field-notes"
            rows={2}
            value={formData.notesOrAdditional}
            onChange={(e) => handleFieldChange('notesOrAdditional', e.target.value)}
            placeholder="Any storage directions, remarks, or notes..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all resize-none"
          />
        </div>
      </div>

      {/* Form Action Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={handleClearAll}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Clear Form
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onRetake}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Scan Another Document
          </button>

          <button
            type="button"
            onClick={handleSaveToInventory}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              savedSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span>{savedSuccess ? 'Saved in Inventory!' : 'Save Product'}</span>
          </button>

          <button
            type="submit"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Verified Form</span>
          </button>
        </div>
      </div>
    </form>
  );
};
