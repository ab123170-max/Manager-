/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Building,
  Calendar,
  DollarSign,
  Download,
  Package,
} from 'lucide-react';
import { PurchaseRecord } from '../../types';
import { getPurchaseRecords, subscribeToStore } from '../../utils/unifiedDataStore';

export const PurchasesView: React.FC = () => {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(getPurchaseRecords());

  useEffect(() => {
    return subscribeToStore(() => {
      setPurchases(getPurchaseRecords());
    });
  }, []);

  const totalSpent = purchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Procurement &amp; Vendor Invoices</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Purchases Ledger ({purchases.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Detailed log of all vendor bills, purchase orders, and wholesale acquisitions.
          </p>
        </div>

        <div className="p-3 bg-slate-900 text-white rounded-2xl flex items-center gap-3">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Outlay:</span>
          <span className="text-base font-black text-white">${totalSpent.toFixed(2)}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Invoice # / Date</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Product Line</th>
                <th className="py-3 px-4 text-center">Quantity</th>
                <th className="py-3 px-4">Unit Rate</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {purchases.length > 0 ? (
                purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-indigo-900">
                        {p.invoiceNumber ? `#${p.invoiceNumber}` : p.id.slice(0, 8)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(p.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{p.supplier || 'Direct'}</td>
                    <td className="py-3 px-4 font-extrabold text-slate-900">{p.productName}</td>
                    <td className="py-3 px-4 text-center font-black text-slate-900">{p.quantity}</td>
                    <td className="py-3 px-4 font-bold text-slate-600">
                      ${Number(p.purchasePrice).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-black text-slate-950">
                      ${Number(p.totalAmount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-full uppercase">
                        {p.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No purchase records found. Scan purchase invoices to automatically populate this ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
