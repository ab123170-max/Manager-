/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Boxes,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  Printer,
} from 'lucide-react';
import {
  getProducts,
  getInventoryValuation,
  subscribeToStore,
} from '../../utils/unifiedDataStore';

export const InventoryReportsView: React.FC = () => {
  const [products, setProducts] = useState(getProducts());
  const [metrics, setMetrics] = useState(getInventoryValuation());

  useEffect(() => {
    return subscribeToStore(() => {
      setProducts(getProducts());
      setMetrics(getInventoryValuation());
    });
  }, []);

  const exportValuationCSV = () => {
    const headers = [
      'Product Name',
      'Category',
      'Barcode',
      'SKU',
      'Stock Quantity',
      'Unit',
      'Purchase Price',
      'Total Purchase Value',
      'Selling Price',
      'Estimated Selling Value',
      'Potential Profit',
      'MFD',
      'EXP',
      'Status',
    ];

    const rows = products.map((p) => {
      const pCost = parseFloat(p.purchasePrice?.replace(/[^0-9.]/g, '') || '0') || 0;
      const sPrice = parseFloat(p.sellingPrice?.replace(/[^0-9.]/g, '') || p.mrp?.replace(/[^0-9.]/g, '') || '0') || 0;
      const totalCost = p.stockQuantity * pCost;
      const totalSell = p.stockQuantity * sPrice;
      const profit = totalSell - totalCost;

      return [
        `"${p.productName.replace(/"/g, '""')}"`,
        p.category,
        p.barcode || '',
        p.sku || '',
        p.stockQuantity,
        p.unit || 'units',
        pCost,
        totalCost,
        sPrice,
        totalSell,
        profit,
        p.manufactureDate || '',
        p.expiryDate || '',
        p.status,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Inventory_Valuation_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            <span>Valuation &amp; Stock Audit</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Comprehensive Inventory Report
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official valuation snapshot, gross margin projections, and health indicators for audit reporting.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={exportValuationCSV}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report (CSV)</span>
          </button>
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
            Total Capital In Inventory
          </span>
          <div className="text-2xl font-black text-slate-900">
            ${metrics.totalPurchaseValue.toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 font-medium">{metrics.totalStockQuantity} total physical units</p>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
            Projected Selling Value
          </span>
          <div className="text-2xl font-black text-emerald-600">
            ${metrics.estimatedSellingValue.toFixed(2)}
          </div>
          <p className="text-xs text-emerald-700 font-medium">Expected sales revenue</p>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
            Projected Gross Margin
          </span>
          <div className="text-2xl font-black text-indigo-600">
            ${metrics.expectedProfit.toFixed(2)}
          </div>
          <p className="text-xs text-indigo-600 font-medium">
            {metrics.totalPurchaseValue > 0
              ? `${((metrics.expectedProfit / metrics.totalPurchaseValue) * 100).toFixed(1)}% ROI margin`
              : '0% margin'}
          </p>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
            Catalog Risk Factor
          </span>
          <div className="text-2xl font-black text-amber-600">
            {metrics.lowStockCount + metrics.expiringSoonCount + metrics.expiredCount} Alerts
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {metrics.expiredCount} expired • {metrics.lowStockCount} low stock
          </p>
        </div>
      </div>
    </div>
  );
};
