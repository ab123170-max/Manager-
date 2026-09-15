/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  Search,
  Filter,
  Download,
  Calendar,
  Layers,
  MapPin,
  RefreshCw,
  PlusCircle,
  FileText,
  Building2,
  Share2,
  CheckCircle2,
  AlertTriangle,
  User,
  Hash,
} from 'lucide-react';
import {
  StockTransaction,
  StockTransactionType,
  StockSubtype,
  TransactionSource,
  SavedInventoryItem,
} from '../../types';
import {
  getStockTransactions,
  getProducts,
  subscribeToStore,
  transferStock,
  executeStockTransaction,
} from '../../utils/unifiedDataStore';

interface StockTransactionsLedgerViewProps {
  onBackToInventory?: () => void;
  onSelectProduct?: (productId: string) => void;
}

export const StockTransactionsLedgerView: React.FC<StockTransactionsLedgerViewProps> = ({
  onBackToInventory,
  onSelectProduct,
}) => {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [products, setProducts] = useState<SavedInventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | StockTransactionType>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | TransactionSource>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedTxn, setSelectedTxn] = useState<StockTransaction | null>(null);

  // Transfer modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferProductId, setTransferProductId] = useState('');
  const [transferFromLocation, setTransferFromLocation] = useState('');
  const [transferToLocation, setTransferToLocation] = useState('');
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [transferNotes, setTransferNotes] = useState('');
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');

  // Quick Adjustment modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustType, setAdjustType] = useState<'stock_in' | 'stock_out'>('stock_in');
  const [adjustSubType, setAdjustSubType] = useState<StockSubtype>('manual_addition');
  const [adjustQuantity, setAdjustQuantity] = useState(1);
  const [adjustSource, setAdjustSource] = useState<TransactionSource>('Manual Entry');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustError, setAdjustError] = useState('');

  useEffect(() => {
    const load = () => {
      setTransactions(getStockTransactions());
      setProducts(getProducts());
    };
    load();
    return subscribeToStore(load);
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Type filter
      if (typeFilter !== 'all' && t.transactionType !== typeFilter) return false;

      // Source filter
      if (sourceFilter !== 'all' && t.source !== sourceFilter) return false;

      // Date filter
      if (dateFilter !== 'all') {
        const itemDate = new Date(t.dateTime || t.timestamp);
        const now = new Date();
        if (dateFilter === 'today') {
          if (itemDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === 'week') {
          if (now.getTime() - itemDate.getTime() > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (dateFilter === 'month') {
          if (now.getTime() - itemDate.getTime() > 30 * 24 * 60 * 60 * 1000) return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = t.productName.toLowerCase().includes(q);
        const matchCode = (t.barcode || '').toLowerCase().includes(q) || (t.sku || '').toLowerCase().includes(q);
        const matchId = t.transactionId.toLowerCase().includes(q) || (t.referenceId || '').toLowerCase().includes(q);
        const matchLoc = (t.fromLocation || '').toLowerCase().includes(q) || (t.toLocation || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchId && !matchLoc) return false;
      }

      return true;
    });
  }, [transactions, typeFilter, sourceFilter, dateFilter, searchTerm]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let totalTransfers = 0;

    for (const t of filteredTransactions) {
      if (t.transactionType === 'stock_in') totalIn += t.quantity;
      else if (t.transactionType === 'stock_out') totalOut += t.quantity;
      else if (t.transactionType === 'stock_transfer') totalTransfers += 1;
    }

    return { totalIn, totalOut, totalTransfers, count: filteredTransactions.length };
  }, [filteredTransactions]);

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError('');
    setTransferSuccess('');

    if (!transferProductId) {
      setTransferError('Please select a product to transfer.');
      return;
    }
    if (!transferFromLocation.trim() || !transferToLocation.trim()) {
      setTransferError('Both source and destination rack/locations are required.');
      return;
    }
    if (transferQuantity <= 0) {
      setTransferError('Transfer quantity must be greater than 0.');
      return;
    }

    const res = transferStock({
      productId: transferProductId,
      fromLocation: transferFromLocation.trim(),
      toLocation: transferToLocation.trim(),
      quantity: transferQuantity,
      notes: transferNotes.trim() || `Location move from ${transferFromLocation} to ${transferToLocation}`,
      operator: 'Active Store Operator',
    });

    if (!res.success) {
      setTransferError(res.message);
    } else {
      setTransferSuccess(res.message);
      setTimeout(() => {
        setShowTransferModal(false);
        setTransferProductId('');
        setTransferFromLocation('');
        setTransferToLocation('');
        setTransferQuantity(1);
        setTransferNotes('');
        setTransferSuccess('');
      }, 1200);
    }
  };

  const handleExecuteAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError('');

    if (!adjustProductId) {
      setAdjustError('Please select a product.');
      return;
    }
    if (adjustQuantity <= 0) {
      setAdjustError('Quantity must be greater than 0.');
      return;
    }

    const res = executeStockTransaction({
      productId: adjustProductId,
      transactionType: adjustType,
      subType: adjustSubType,
      quantity: adjustQuantity,
      source: adjustSource,
      notes: adjustNotes.trim() || `Manual ${adjustType.replace('_', ' ').toUpperCase()}`,
      operator: 'Store Manager',
    });

    if (!res.success) {
      setAdjustError(res.message);
    } else {
      setShowAdjustModal(false);
      setAdjustProductId('');
      setAdjustQuantity(1);
      setAdjustNotes('');
    }
  };

  const exportCSV = () => {
    const headers = ['Transaction ID', 'Date & Time', 'Product Name', 'SKU / Barcode', 'Type', 'Subtype', 'Quantity', 'Previous Stock', 'New Stock', 'Source', 'Reference #', 'From Location', 'To Location', 'Notes'];
    const rows = filteredTransactions.map((t) => [
      t.transactionId,
      new Date(t.dateTime || t.timestamp).toLocaleString(),
      `"${t.productName.replace(/"/g, '""')}"`,
      t.sku || t.barcode || '',
      t.transactionType,
      t.subType,
      t.quantity,
      t.previousStock,
      t.newStock,
      t.source,
      t.referenceId || '',
      `"${(t.fromLocation || '').replace(/"/g, '""')}"`,
      `"${(t.toLocation || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Stock_Movement_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="stock-transactions-ledger-container" className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Top Header Card */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                  <Layers className="w-5 h-5" />
                </span>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Stock Movement History</h1>
                  <p className="text-xs text-slate-500">
                    Standardized transaction ledger across Scanner, POS, Purchases, Transfers & Social Channels
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                id="btn-open-transfer-modal"
                onClick={() => {
                  setTransferError('');
                  setShowTransferModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Location Transfer
              </button>
              <button
                id="btn-open-adjust-modal"
                onClick={() => {
                  setAdjustError('');
                  setShowAdjustModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
              >
                <PlusCircle className="w-4 h-4" />
                Record Stock In / Out
              </button>
              <button
                id="btn-export-stock-csv"
                onClick={exportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 rounded-lg transition-colors border border-slate-300 shadow-2xs"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Metric Summary Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-4 pt-3 border-t border-slate-100">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Total Ledger Events</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">{stats.count}</div>
            </div>
            <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100">
              <div className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                <ArrowDownLeft className="w-3.5 h-3.5" /> Total Stock In
              </div>
              <div className="text-lg font-bold text-emerald-900 mt-0.5">+{stats.totalIn} units</div>
            </div>
            <div className="bg-rose-50/70 p-2.5 rounded-lg border border-rose-100">
              <div className="text-xs text-rose-700 font-medium flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> Total Stock Out
              </div>
              <div className="text-lg font-bold text-rose-900 mt-0.5">-{stats.totalOut} units</div>
            </div>
            <div className="bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-100">
              <div className="text-xs text-indigo-700 font-medium flex items-center gap-1">
                <ArrowLeftRight className="w-3.5 h-3.5" /> Location Transfers
              </div>
              <div className="text-lg font-bold text-indigo-900 mt-0.5">{stats.totalTransfers} events</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-search-stock-ledger"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by product name, SKU, barcode, transaction ID, or rack..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            {/* Type selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <select
                id="select-type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Movement Types</option>
                <option value="stock_in">Stock In (+)</option>
                <option value="stock_out">Stock Out (-)</option>
                <option value="stock_transfer">Location Transfer (⇄)</option>
                <option value="stock_adjustment">Adjustment</option>
              </select>

              <select
                id="select-source-filter"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Sources</option>
                <option value="POS">POS / Store Sale</option>
                <option value="Purchase">Purchase / Invoice</option>
                <option value="Manual Entry">Manual Entry</option>
                <option value="Facebook">Facebook Marketplace</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="TikTok">TikTok</option>
                <option value="Location Transfer">Location Transfer</option>
                <option value="Damage / Loss">Damage / Loss</option>
              </select>

              <select
                id="select-date-filter"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Past 7 Days</option>
                <option value="month">Past 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Type & ID</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Product Details</th>
                  <th className="py-3.5 px-4 text-center">Movement Qty</th>
                  <th className="py-3.5 px-4 text-center">Stock Before → After</th>
                  <th className="py-3.5 px-4">Channel / Source</th>
                  <th className="py-3.5 px-4">Location / Notes</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-base font-medium text-slate-600">No stock transactions found</p>
                      <p className="text-xs text-slate-400 mt-1">Try adjusting your search terms or filters</p>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((txn) => {
                    const isStockIn = txn.transactionType === 'stock_in';
                    const isStockOut = txn.transactionType === 'stock_out';
                    const isTransfer = txn.transactionType === 'stock_transfer';

                    return (
                      <tr key={txn.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Type & ID */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`p-1.5 rounded-md ${
                                isStockIn
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : isStockOut
                                  ? 'bg-rose-100 text-rose-700'
                                  : isTransfer
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {isStockIn ? (
                                <ArrowDownLeft className="w-4 h-4" />
                              ) : isStockOut ? (
                                <ArrowUpRight className="w-4 h-4" />
                              ) : isTransfer ? (
                                <ArrowLeftRight className="w-4 h-4" />
                              ) : (
                                <SlidersHorizontal className="w-4 h-4" />
                              )}
                            </span>
                            <div>
                              <div className="font-semibold text-slate-900 text-xs">
                                {txn.transactionType.toUpperCase().replace('_', ' ')}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">{txn.transactionId}</div>
                            </div>
                          </div>
                        </td>

                        {/* Date & Time */}
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          <div className="text-xs font-medium text-slate-800">
                            {new Date(txn.dateTime || txn.timestamp).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {new Date(txn.dateTime || txn.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        {/* Product Details */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900 max-w-[200px] truncate">
                            {txn.productName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {txn.sku ? `SKU: ${txn.sku}` : txn.barcode ? `Barcode: ${txn.barcode}` : 'ID: ' + txn.productId.slice(0, 10)}
                          </div>
                        </td>

                        {/* Movement Qty */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-block font-bold text-sm px-2.5 py-0.5 rounded-full ${
                              isStockIn
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isStockOut
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : isTransfer
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isStockIn ? '+' : isStockOut ? '-' : ''}
                            {txn.quantity} {txn.unit}
                          </span>
                        </td>

                        {/* Stock Before -> After */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="text-xs text-slate-700">
                            <span className="text-slate-400">{txn.previousStock}</span>
                            <span className="mx-1 text-slate-400">→</span>
                            <span className="font-bold text-slate-900">{txn.newStock}</span>
                          </div>
                          {txn.newReservedStock > 0 && (
                            <div className="text-[10px] text-amber-600">
                              (Reserved: {txn.newReservedStock})
                            </div>
                          )}
                        </td>

                        {/* Channel / Source */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                            {txn.source}
                          </span>
                          {txn.referenceId && (
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              Ref: {txn.referenceId}
                            </div>
                          )}
                        </td>

                        {/* Location / Notes */}
                        <td className="py-3.5 px-4 max-w-[220px]">
                          {isTransfer ? (
                            <div className="text-xs text-indigo-700 font-medium">
                              <span className="text-slate-500">{txn.fromLocation || 'Rack A'}</span>
                              <span className="mx-1">→</span>
                              <span className="font-bold">{txn.toLocation || 'Rack B'}</span>
                            </div>
                          ) : txn.toLocation ? (
                            <div className="text-xs text-slate-600 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {txn.toLocation}
                            </div>
                          ) : null}
                          <p className="text-[11px] text-slate-500 truncate" title={txn.notes}>
                            {txn.notes || txn.subType}
                          </p>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedTxn(txn)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* LOCATION TRANSFER MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <ArrowLeftRight className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Stock Location Transfer</h3>
                  <p className="text-xs text-slate-500">Move inventory between racks (Zero net change to total stock)</p>
                </div>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="mt-4 space-y-4">
              {transferError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{transferError}</span>
                </div>
              )}
              {transferSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{transferSuccess}</span>
                </div>
              )}

              {/* Product selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Product to Move *
                </label>
                <select
                  value={transferProductId}
                  onChange={(e) => {
                    setTransferProductId(e.target.value);
                    const prod = products.find((p) => p.id === e.target.value);
                    if (prod && prod.rackLocation) {
                      setTransferFromLocation(prod.rackLocation);
                    }
                  }}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose from inventory --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productName} (Stock: {p.stockQuantity} {p.unit || 'units'}{p.rackLocation ? ` @ ${p.rackLocation}` : ''})
                    </option>
                  ))}
                </select>
              </div>

              {/* Transfer Locations */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    From Location (Source) *
                  </label>
                  <input
                    type="text"
                    value={transferFromLocation}
                    onChange={(e) => setTransferFromLocation(e.target.value)}
                    placeholder="e.g., Aisle 3 • Shelf B"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    To Location (Destination) *
                  </label>
                  <input
                    type="text"
                    value={transferToLocation}
                    onChange={(e) => setTransferToLocation(e.target.value)}
                    placeholder="e.g., Aisle 1 • Display Bay"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Transfer Quantity */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transfer Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(parseInt(e.target.value, 10) || 1)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transfer Reason / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g., Restocking storefront display shelves"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Rule Card */}
              <div className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-100 text-xs text-indigo-900">
                <span className="font-bold">Transfer Rule:</span> Total stock before = Total stock after. Moving stock records a transfer log and updates the product's rack location without altering aggregate accounting balances.
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK STOCK ADJUSTMENT MODAL */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <PlusCircle className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Record Stock Movement</h3>
                  <p className="text-xs text-slate-500">Apply standardized Stock In (+) or Stock Out (-)</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteAdjustment} className="mt-4 space-y-4">
              {adjustError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{adjustError}</span>
                </div>
              )}

              {/* Product */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product *
                </label>
                <select
                  value={adjustProductId}
                  onChange={(e) => setAdjustProductId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productName} (Current: {p.stockQuantity} {p.unit || 'units'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Movement Direction *
                  </label>
                  <select
                    value={adjustType}
                    onChange={(e) => {
                      const t = e.target.value as 'stock_in' | 'stock_out';
                      setAdjustType(t);
                      setAdjustSubType(t === 'stock_in' ? 'manual_addition' : 'sale');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="stock_in">Stock In (Increase +)</option>
                    <option value="stock_out">Stock Out (Decrease -)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subtype / Reason *
                  </label>
                  <select
                    value={adjustSubType}
                    onChange={(e) => setAdjustSubType(e.target.value as StockSubtype)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {adjustType === 'stock_in' ? (
                      <>
                        <option value="manual_addition">Manual Stock Addition</option>
                        <option value="purchase">Purchase from Supplier</option>
                        <option value="customer_return">Customer Return</option>
                        <option value="opening_stock">Opening Stock</option>
                        <option value="adjustment_increase">Adjustment Increase</option>
                      </>
                    ) : (
                      <>
                        <option value="sale">Direct Storefront Sale</option>
                        <option value="marketplace_order">Marketplace Order</option>
                        <option value="damaged">Damaged Product</option>
                        <option value="expired">Expired Product</option>
                        <option value="lost_missing">Lost / Missing Stock</option>
                        <option value="adjustment_decrease">Adjustment Decrease</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Quantity & Source */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(parseInt(e.target.value, 10) || 1)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Source Channel *
                  </label>
                  <select
                    value={adjustSource}
                    onChange={(e) => setAdjustSource(e.target.value as TransactionSource)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Manual Entry">Manual Entry</option>
                    <option value="POS">POS</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Facebook">Facebook</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Damage / Loss">Damage / Loss</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Optional reference, customer name, or receipt #"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
                >
                  Save Stock Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSACTION DETAIL MODAL */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Transaction Audit Record
                </span>
                <h3 className="text-lg font-bold text-slate-900">{selectedTxn.transactionId}</h3>
              </div>
              <button
                onClick={() => setSelectedTxn(null)}
                className="text-slate-400 hover:text-slate-600 p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500">Product</div>
                <div className="font-bold text-slate-900 text-base">{selectedTxn.productName}</div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  {selectedTxn.sku ? `SKU: ${selectedTxn.sku}` : ''} {selectedTxn.barcode ? `• Barcode: ${selectedTxn.barcode}` : ''}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500">Movement Type</div>
                  <div className="font-semibold text-slate-900">{selectedTxn.transactionType.toUpperCase()}</div>
                  <div className="text-xs text-slate-600">{selectedTxn.subType}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500">Quantity</div>
                  <div className="font-bold text-slate-900 text-base">
                    {selectedTxn.quantity} {selectedTxn.unit}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500">Stock Before → After</div>
                  <div className="font-semibold text-slate-900">
                    {selectedTxn.previousStock} → {selectedTxn.newStock}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500">Channel / Source</div>
                  <div className="font-semibold text-slate-900">{selectedTxn.source}</div>
                </div>
              </div>

              {selectedTxn.fromLocation || selectedTxn.toLocation ? (
                <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100">
                  <div className="text-xs text-indigo-700 font-medium">Location Movement</div>
                  <div className="font-semibold text-indigo-950 mt-0.5">
                    {selectedTxn.fromLocation || 'None'} → {selectedTxn.toLocation || 'None'}
                  </div>
                </div>
              ) : null}

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-xs text-slate-500">Date & Operator</div>
                <div className="text-xs text-slate-800 font-medium mt-0.5">
                  {new Date(selectedTxn.dateTime || selectedTxn.timestamp).toLocaleString()} • {selectedTxn.operator || 'Store Operator'}
                </div>
                {selectedTxn.notes && (
                  <div className="text-xs text-slate-600 mt-1 border-t border-slate-200 pt-1">
                    <span className="font-semibold">Notes:</span> {selectedTxn.notes}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
              <button
                onClick={() => setSelectedTxn(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
