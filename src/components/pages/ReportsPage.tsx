/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Boxes,
  Clock,
  AlertTriangle,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { SavedInventoryItem } from '../../types';

interface ReportsPageProps {
  products: SavedInventoryItem[];
  valuation: {
    totalInventoryValue: number;
    totalRetailValue: number;
    potentialProfit: number;
    marginPercent: number;
    totalUnits: number;
    productCount: number;
    lowStockCount: number;
    expiringCount: number;
    expiredCount: number;
  };
  userCurrency?: string;
  onGoToStockIn?: () => void;
  onGoToStockOut?: () => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  products,
  valuation,
  userCurrency = 'NPR',
  onGoToStockIn,
  onGoToStockOut,
}) => {
  const currencySymbol = userCurrency === 'NPR' ? 'Rs. ' : '$';

  const freshCount = Math.max(
    0,
    valuation.productCount - valuation.expiringCount - valuation.expiredCount
  );

  const freshPercent =
    valuation.productCount > 0 ? Math.round((freshCount / valuation.productCount) * 100) : 100;
  const expiringPercent =
    valuation.productCount > 0
      ? Math.round((valuation.expiringCount / valuation.productCount) * 100)
      : 0;
  const expiredPercent =
    valuation.productCount > 0
      ? Math.round((valuation.expiredCount / valuation.productCount) * 100)
      : 0;

  return (
    <div className="space-y-4 font-sans text-slate-900 pb-2">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-1">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#1473EA]" />
          <h1 className="text-base font-black text-slate-900">
            Inventory Analytics &amp; Health Reports
          </h1>
        </div>
        <p className="text-xs text-slate-500">
          Real-time summary of stock valuation, turnover, and expiry status.
        </p>
      </div>

      {/* 2. Primary Financial Valuation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-[#1473EA]" />
            <span>Stock Valuation</span>
          </div>
          <div className="text-lg font-black text-slate-900 truncate">
            {currencySymbol}
            {valuation.totalInventoryValue.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Cost value</div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Retail Value</span>
          </div>
          <div className="text-lg font-black text-emerald-700 truncate">
            {currencySymbol}
            {valuation.totalRetailValue.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Est. sales return</div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1">
            <Percent className="w-3.5 h-3.5 text-indigo-600" />
            <span>Est. Profit</span>
          </div>
          <div className="text-lg font-black text-indigo-700 truncate">
            {currencySymbol}
            {valuation.potentialProfit.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            Margin: {valuation.marginPercent}%
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1">
            <Boxes className="w-3.5 h-3.5 text-slate-700" />
            <span>Total Stock</span>
          </div>
          <div className="text-lg font-black text-slate-900 truncate">
            {valuation.totalUnits} <span className="text-xs font-normal text-slate-500">units</span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            Across {valuation.productCount} products
          </div>
        </div>
      </div>

      {/* 3. Expiry Radar Health Breakdown */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Expiry Risk Distribution</span>
          </h2>
          <span className="text-xs font-bold text-slate-500">
            {valuation.productCount} Total Items
          </span>
        </div>

        {/* Visual Progress Stack Bar */}
        <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${freshPercent}%` }}
            className="bg-emerald-500 h-full transition-all duration-300"
            title={`Fresh: ${freshCount} (${freshPercent}%)`}
          />
          <div
            style={{ width: `${expiringPercent}%` }}
            className="bg-amber-400 h-full transition-all duration-300"
            title={`Expiring: ${valuation.expiringCount} (${expiringPercent}%)`}
          />
          <div
            style={{ width: `${expiredPercent}%` }}
            className="bg-rose-500 h-full transition-all duration-300"
            title={`Expired: ${valuation.expiredCount} (${expiredPercent}%)`}
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200/80">
            <div className="flex items-center gap-1.5 font-extrabold text-emerald-900">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>In Date</span>
            </div>
            <div className="text-base font-black text-emerald-800 mt-0.5">
              {freshCount} <span className="text-[10px] font-normal text-emerald-700">({freshPercent}%)</span>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-amber-50 border border-amber-200/80">
            <div className="flex items-center gap-1.5 font-extrabold text-amber-900">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Expiring Soon</span>
            </div>
            <div className="text-base font-black text-amber-800 mt-0.5">
              {valuation.expiringCount}{' '}
              <span className="text-[10px] font-normal text-amber-700">({expiringPercent}%)</span>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-rose-50 border border-rose-200/80">
            <div className="flex items-center gap-1.5 font-extrabold text-rose-900">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Expired</span>
            </div>
            <div className="text-base font-black text-rose-800 mt-0.5">
              {valuation.expiredCount}{' '}
              <span className="text-[10px] font-normal text-rose-700">({expiredPercent}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Quick Stock Movement Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
          Stock Operations Ledger
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {onGoToStockIn && (
            <button
              type="button"
              onClick={onGoToStockIn}
              className="p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-extrabold text-xs transition-colors flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <span>Record Stock In</span>
              </span>
            </button>
          )}

          {onGoToStockOut && (
            <button
              type="button"
              onClick={onGoToStockOut}
              className="p-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 font-extrabold text-xs transition-colors flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>Record Stock Out</span>
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
