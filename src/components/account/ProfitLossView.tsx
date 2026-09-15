/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Skull,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import {
  getProfitAndLossSummary,
  getLossRecords,
  getExpenseRecords,
  subscribeToStore,
} from '../../utils/unifiedDataStore';

export const ProfitLossView: React.FC = () => {
  const [pnl, setPnl] = useState(getProfitAndLossSummary());
  const [losses, setLosses] = useState(getLossRecords());
  const [expenses, setExpenses] = useState(getExpenseRecords());

  useEffect(() => {
    return subscribeToStore(() => {
      setPnl(getProfitAndLossSummary());
      setLosses(getLossRecords());
      setExpenses(getExpenseRecords());
    });
  }, []);

  const isNetProfitable = pnl.netProfit >= 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Financial Statements</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Profit &amp; Loss Statement (P&amp;L)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Accurate revenue, cost of sales, operating expenses, and inventory loss write-offs.
          </p>
        </div>

        {/* Big Net Indicator */}
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 self-start sm:self-auto ${
            isNetProfitable
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
              isNetProfitable ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}
          >
            {isNetProfitable ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
              Net Bottom Line
            </span>
            <span className="text-xl font-black">
              {isNetProfitable ? `+$${pnl.netProfit.toFixed(2)}` : `-$${Math.abs(pnl.netProfit).toFixed(2)}`}
            </span>
          </div>
        </div>
      </div>

      {/* Main P&L Statement Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
          Standard Income &amp; Expense Schedule
        </h2>

        <div className="space-y-3 font-medium text-xs">
          {/* Revenue */}
          <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
            <span className="font-extrabold text-slate-900 text-sm">1. Gross Sales Revenue</span>
            <span className="font-black text-slate-900 text-sm">${pnl.salesRevenue.toFixed(2)}</span>
          </div>

          {/* Cost of Goods Sold */}
          <div className="flex justify-between items-center py-2 text-slate-600 pl-4 border-b border-slate-50">
            <span>Less: Cost of Goods Sold (COGS)</span>
            <span className="font-bold text-rose-700">-${pnl.costOfGoodsSold.toFixed(2)}</span>
          </div>

          {/* Gross Profit */}
          <div className="flex justify-between items-center py-3 bg-slate-50 px-4 rounded-xl font-bold">
            <span className="text-slate-900">Gross Profit (Margin: {pnl.salesRevenue > 0 ? ((pnl.grossProfit / pnl.salesRevenue) * 100).toFixed(1) : 0}%)</span>
            <span className="text-emerald-700 font-black text-sm">+${pnl.grossProfit.toFixed(2)}</span>
          </div>

          {/* Operating Expenses */}
          <div className="flex justify-between items-center py-2 text-slate-600 pl-4 border-b border-slate-50">
            <span>Less: Operating Expenses (Rent, Logistics, Utilities)</span>
            <span className="font-bold text-rose-700">-${pnl.totalExpenses.toFixed(2)}</span>
          </div>

          {/* Inventory Losses */}
          <div className="flex justify-between items-center py-2 text-slate-600 pl-4 border-b border-slate-100">
            <span>Less: Inventory Losses (Expired / Damaged Goods)</span>
            <span className="font-bold text-rose-700">-${pnl.totalLosses.toFixed(2)}</span>
          </div>

          {/* Net Profit */}
          <div
            className={`flex justify-between items-center py-4 px-5 rounded-2xl font-black text-base ${
              isNetProfitable ? 'bg-emerald-600 text-white shadow-md' : 'bg-rose-600 text-white shadow-md'
            }`}
          >
            <span>NET {isNetProfitable ? 'PROFIT' : 'LOSS'}</span>
            <span>
              {isNetProfitable ? `+$${pnl.netProfit.toFixed(2)}` : `-$${Math.abs(pnl.netProfit).toFixed(2)}`}
            </span>
          </div>
        </div>
      </div>

      {/* Inventory Loss Log Section */}
      {losses.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
            <Skull className="w-4 h-4 text-rose-600" />
            <span>Itemized Inventory Loss Write-Offs ({losses.length})</span>
          </h3>

          <div className="divide-y divide-slate-100 text-xs">
            {losses.map((l) => (
              <div key={l.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">{l.productName}</span>
                  <span className="text-slate-400 block text-[11px]">
                    {new Date(l.date).toLocaleDateString()} • Reason: <strong className="uppercase">{l.reason}</strong>
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-black text-rose-700">-${Number(l.totalLoss).toFixed(2)}</span>
                  <span className="text-[10px] text-slate-400 block">
                    {l.quantity} units @ ${Number(l.unitCost).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
