/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  PieChart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Boxes,
  CreditCard,
  Skull,
  Download,
  ShieldCheck,
} from 'lucide-react';
import {
  getProfitAndLossSummary,
  getInventoryValuation,
  getProducts,
  getAccountingEntries,
  subscribeToStore,
} from '../../utils/unifiedDataStore';

export const AccountSummaryView: React.FC = () => {
  const [pnl, setPnl] = useState(getProfitAndLossSummary());
  const [val, setVal] = useState(getInventoryValuation());
  const [products, setProducts] = useState(getProducts());

  useEffect(() => {
    return subscribeToStore(() => {
      setPnl(getProfitAndLossSummary());
      setVal(getInventoryValuation());
      setProducts(getProducts());
    });
  }, []);

  const totalBusinessAssets = val.totalPurchaseValue + Math.max(0, pnl.netProfit);

  const exportFinancialReport = () => {
    const summaryData = [
      ['SMARTSTOCK AI - CONSOLIDATED FINANCIAL SUMMARY'],
      ['Generated On', new Date().toISOString()],
      [''],
      ['METRIC', 'AMOUNT (USD)'],
      ['Total Inventory Assets (Cost Basis)', `$${val.totalPurchaseValue.toFixed(2)}`],
      ['Total Stock Units', val.totalStockQuantity],
      ['Gross Sales Revenue', `$${pnl.salesRevenue.toFixed(2)}`],
      ['Cost of Goods Sold (COGS)', `$${pnl.costOfGoodsSold.toFixed(2)}`],
      ['Gross Profit', `$${pnl.grossProfit.toFixed(2)}`],
      ['Operating Expenses', `$${pnl.totalExpenses.toFixed(2)}`],
      ['Inventory Loss Write-Offs', `$${pnl.totalLosses.toFixed(2)}`],
      ['NET OPERATING PROFIT', `$${pnl.netProfit.toFixed(2)}`],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      summaryData.map((row) => row.join(',')).join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Consolidated_Financial_Summary_${Date.now()}.csv`);
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
            <PieChart className="w-4 h-4" />
            <span>Executive Financial Health</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Account &amp; Financial Summary
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Consolidated balance sheet, gross margin health, asset valuation, and bottom-line audit.
          </p>
        </div>

        <button
          type="button"
          onClick={exportFinancialReport}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Summary (CSV)</span>
        </button>
      </div>

      {/* Grid of Key Financial Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Inventory Assets */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
            Inventory Holding Assets
          </span>
          <div className="text-2xl font-black text-slate-900">
            ${val.totalPurchaseValue.toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 font-medium">Physical stock cost basis</p>
        </div>

        {/* Realized Gross Profit */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
            Gross Trading Profit
          </span>
          <div className="text-2xl font-black text-emerald-600">
            +${pnl.grossProfit.toFixed(2)}
          </div>
          <p className="text-xs text-emerald-700 font-medium">Sales minus product costs</p>
        </div>

        {/* Total Overhead & Losses */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
            Overhead + Loss Deductions
          </span>
          <div className="text-2xl font-black text-rose-600">
            -${(pnl.totalExpenses + pnl.totalLosses).toFixed(2)}
          </div>
          <p className="text-xs text-rose-700 font-medium">Expenses &amp; write-offs</p>
        </div>

        {/* Net Business Profit */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
            Net Business Profit
          </span>
          <div
            className={`text-2xl font-black ${
              pnl.netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'
            }`}
          >
            {pnl.netProfit >= 0 ? `+$${pnl.netProfit.toFixed(2)}` : `-$${Math.abs(pnl.netProfit).toFixed(2)}`}
          </div>
          <p className="text-xs text-slate-500 font-medium">Final retained earnings</p>
        </div>
      </div>
    </div>
  );
};
