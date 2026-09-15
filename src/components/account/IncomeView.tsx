/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Plus,
  Calendar,
} from 'lucide-react';
import {
  getSalesRecords,
  getProfitAndLossSummary,
  subscribeToStore,
} from '../../utils/unifiedDataStore';

export const IncomeView: React.FC = () => {
  const [sales, setSales] = useState(getSalesRecords());
  const [pnl, setPnl] = useState(getProfitAndLossSummary());

  useEffect(() => {
    return subscribeToStore(() => {
      setSales(getSalesRecords());
      setPnl(getProfitAndLossSummary());
    });
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
            <DollarSign className="w-4 h-4" />
            <span>Revenue Streams</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Income Streams &amp; Inflows
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Detailed breakdown of gross trading income, customer settlements, and profit contributions.
          </p>
        </div>

        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <span className="text-[10px] font-bold uppercase text-emerald-800 block">Total Inflow</span>
          <span className="text-xl font-black text-emerald-950">${pnl.salesRevenue.toFixed(2)}</span>
        </div>
      </div>

      {/* Income Stream Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Direct Product Sales ({sales.length} transactions)
            </h3>
            <span className="font-black text-emerald-600">${pnl.salesRevenue.toFixed(2)}</span>
          </div>
          <p className="text-xs text-slate-500">
            Realized revenue from registered product checkouts across all payment methods.
          </p>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Realized Gross Margin
            </h3>
            <span className="font-black text-indigo-600">+${pnl.grossProfit.toFixed(2)}</span>
          </div>
          <p className="text-xs text-slate-500">
            Net capital added after deducting direct product procurement cost of goods.
          </p>
        </div>
      </div>
    </div>
  );
};
