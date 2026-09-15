/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  FileSpreadsheet,
  Calendar,
  Building,
  Hash,
  Download,
  Receipt,
  FileText,
} from 'lucide-react';
import { InventoryAccountingEntry } from '../../types';
import {
  getAccountingEntries,
  subscribeToStore,
} from '../../utils/unifiedDataStore';

export const InventoryAccountingView: React.FC = () => {
  const [entries, setEntries] = useState<InventoryAccountingEntry[]>(getAccountingEntries());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedEntry, setSelectedEntry] = useState<InventoryAccountingEntry | null>(null);

  useEffect(() => {
    return subscribeToStore(() => {
      setEntries(getAccountingEntries());
    });
  }, []);

  const filteredEntries = useMemo(() => {
    return entries.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTxn = item.transactionId.toLowerCase().includes(q);
        const matchesProd = item.productName.toLowerCase().includes(q);
        const matchesSupp = item.supplier?.toLowerCase().includes(q);
        const matchesInv = item.invoiceNumber?.toLowerCase().includes(q);
        if (!matchesTxn && !matchesProd && !matchesSupp && !matchesInv) return false;
      }
      return true;
    });
  }, [entries, searchTerm, typeFilter]);

  // Aggregate metrics
  const totalPurchaseValueLogged = useMemo(() => {
    return entries
      .filter((e) => e.type === 'purchase_invoice' || e.type === 'stock_in')
      .reduce((sum, e) => sum + (Number(e.totalPurchaseValue) || 0), 0);
  }, [entries]);

  const exportCSV = () => {
    const headers = [
      'Transaction ID',
      'Date',
      'Type',
      'Invoice #',
      'Supplier',
      'Product',
      'Qty',
      'Purchase Price',
      'Total Value',
      'Selling Price',
      'Prev Stock',
      'Stock Added',
      'New Stock',
      'Payment Status',
      'Notes',
    ];

    const rows = filteredEntries.map((e) => [
      e.transactionId,
      e.date,
      e.type,
      e.invoiceNumber || '',
      e.supplier || '',
      `"${e.productName.replace(/"/g, '""')}"`,
      e.quantity,
      e.purchasePrice,
      e.totalPurchaseValue,
      e.sellingPrice,
      e.previousStock,
      e.stockAdded,
      e.newStock,
      e.paymentStatus,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inventory_Accounting_Ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Audit &amp; Double-Entry Ledger</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Inventory Accounting Ledger ({entries.length} Entries)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Historical transaction ledger tracking all stock movements, purchase costs, and valuation changes.
          </p>
        </div>

        <button
          type="button"
          onClick={exportCSV}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Ledger (CSV)</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            Total Inflow Recorded
          </span>
          <div className="text-xl font-black text-slate-900 mt-1">
            ${totalPurchaseValueLogged.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Cumulative purchase cost of stock
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            Total Transactions
          </span>
          <div className="text-xl font-black text-indigo-600 mt-1">{entries.length}</div>
          <span className="text-[10px] text-slate-400 font-medium">Logged stock events</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            Purchases &amp; Invoices
          </span>
          <div className="text-xl font-black text-emerald-600 mt-1">
            {entries.filter((e) => e.type === 'purchase_invoice').length}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Confirmed invoice lines</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Txn ID, Product, Supplier, or Invoice #..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
          >
            <option value="all">All Transaction Types</option>
            <option value="purchase_invoice">Purchase Invoice</option>
            <option value="stock_in">Stock In</option>
            <option value="stock_out">Stock Out</option>
            <option value="sale">Customer Sale</option>
            <option value="loss_adjustment">Loss Write-off</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Txn ID / Date</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Invoice / Supplier</th>
                <th className="py-3 px-4 text-center">Stock Movement</th>
                <th className="py-3 px-4 text-center">Prev → New</th>
                <th className="py-3 px-4">Purchase Rate</th>
                <th className="py-3 px-4">Total Value</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredEntries.length > 0 ? (
                filteredEntries.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => setSelectedEntry(e)}
                    className="hover:bg-slate-50/90 cursor-pointer transition-colors"
                  >
                    {/* Txn ID and Date */}
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900 text-xs">
                        {e.transactionId}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(e.date).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Event Type Badge */}
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          e.type === 'purchase_invoice'
                            ? 'bg-indigo-100 text-indigo-800'
                            : e.type === 'stock_in'
                            ? 'bg-emerald-100 text-emerald-800'
                            : e.type === 'sale'
                            ? 'bg-blue-100 text-blue-800'
                            : e.type === 'loss_adjustment'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {e.type.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Product */}
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900 text-xs">{e.productName}</div>
                      {e.barcode && (
                        <div className="text-[10px] font-mono text-slate-400">{e.barcode}</div>
                      )}
                    </td>

                    {/* Invoice / Supplier */}
                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      {e.invoiceNumber ? (
                        <div className="font-bold text-indigo-900">#{e.invoiceNumber}</div>
                      ) : null}
                      <div>{e.supplier || '-'}</div>
                    </td>

                    {/* Stock Movement */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-black text-xs px-2 py-0.5 rounded-md ${
                          e.stockAdded > 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : e.stockAdded < 0
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-50 text-slate-700'
                        }`}
                      >
                        {e.stockAdded > 0 ? `+${e.stockAdded}` : `${e.stockAdded}`} units
                      </span>
                    </td>

                    {/* Prev -> New Stock */}
                    <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-600">
                      {e.previousStock} → <strong className="text-slate-900">{e.newStock}</strong>
                    </td>

                    {/* Purchase Rate */}
                    <td className="py-3 px-4 font-bold text-slate-700">
                      ${Number(e.purchasePrice).toFixed(2)}
                    </td>

                    {/* Total Value */}
                    <td className="py-3 px-4 font-extrabold text-slate-900">
                      ${Number(e.totalPurchaseValue).toFixed(2)}
                    </td>

                    {/* Payment Status */}
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full uppercase">
                        {e.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-700">No accounting entries recorded</p>
                    <p className="text-[11px] text-slate-500">
                      Scan invoices or record stock adjustments to build the transaction ledger.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Transaction Details Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase">
                  Transaction Detail
                </span>
                <h3 className="text-base font-black text-slate-900">{selectedEntry.transactionId}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Product</span>
                <strong className="text-slate-900">{selectedEntry.productName}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Event Type</span>
                <strong className="text-indigo-600 uppercase">{selectedEntry.type}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Date</span>
                <strong>{new Date(selectedEntry.date).toLocaleString()}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Invoice / Supplier</span>
                <strong>{selectedEntry.invoiceNumber ? `#${selectedEntry.invoiceNumber}` : 'N/A'} • {selectedEntry.supplier || 'N/A'}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Stock Movement</span>
                <strong className="text-emerald-700">{selectedEntry.previousStock} → {selectedEntry.newStock} (Delta: {selectedEntry.stockAdded})</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Valuation</span>
                <strong className="text-slate-900">{selectedEntry.quantity} @ ${Number(selectedEntry.purchasePrice).toFixed(2)} = ${Number(selectedEntry.totalPurchaseValue).toFixed(2)}</strong>
              </div>
            </div>

            {selectedEntry.notes && (
              <div className="p-3 bg-indigo-50/50 rounded-xl text-xs text-slate-700">
                <span className="text-[10px] text-indigo-700 font-bold block uppercase mb-0.5">Notes:</span>
                {selectedEntry.notes}
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedEntry(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
