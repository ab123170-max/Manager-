/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Camera,
  Boxes,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { SavedInventoryItem, UserProfile } from '../../types';
import { HomeScreenActiveExpiryAlerts } from '../scanner/HomeScreenActiveExpiryAlerts';
import { recordVisitAndGetCount } from '../../services/visitorService';

interface HomePageProps {
  userProfile?: UserProfile | null;
  userEmail?: string;
  products: SavedInventoryItem[];
  valuation: {
    totalInventoryValue: number;
    totalUnits: number;
    productCount: number;
    lowStockCount: number;
    expiringCount: number;
    expiredCount: number;
  };
  activeExpiryAlertsCount: number;
  visitorCount?: number | null;
  onGoToScan: () => void;
  onGoToInventory: () => void;
  onGoToReports: () => void;
  onGoToAlerts: () => void;
  onSelectProduct?: (product: SavedInventoryItem) => void;
  onStockIn?: (productId?: string) => void;
  onStockOut?: (productId?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  userProfile,
  userEmail,
  products,
  valuation,
  activeExpiryAlertsCount,
  visitorCount,
  onGoToScan,
  onGoToInventory,
  onGoToReports,
  onGoToAlerts,
  onSelectProduct,
  onStockIn,
  onStockOut,
}) => {
  const userName = userProfile?.full_name || userEmail?.split('@')[0] || 'User';
  const currencySymbol = userProfile?.preferred_currency === 'NPR' ? 'Rs. ' : '$';

  const [displayVisitorCount, setDisplayVisitorCount] = useState<number | null>(
    visitorCount ?? null
  );

  useEffect(() => {
    if (visitorCount !== undefined && visitorCount !== null) {
      setDisplayVisitorCount(visitorCount);
    } else {
      recordVisitAndGetCount()
        .then((count) => setDisplayVisitorCount(count))
        .catch(() => setDisplayVisitorCount(1));
    }
  }, [visitorCount]);

  // Recent 4 products
  const recentProducts = [...products]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-4 font-sans text-slate-900 pb-2">
      {/* 1. Android Native Welcome Header & Quick Action */}
      <div className="bg-gradient-to-r from-[#092B4C] via-[#0E3D6C] to-[#1473EA] text-white rounded-2xl p-4 sm:p-5 shadow-md relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-12 -top-10 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-white/20 text-white rounded-full backdrop-blur-xs">
                ScanMe AI Dashboard
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Welcome back, <span className="text-blue-200">{userName}</span>!
            </h1>
            <p className="text-xs text-blue-100/90 mt-0.5 max-w-sm">
              Scan, track, and manage inventory with AI precision.
            </p>
          </div>

          <button
            type="button"
            onClick={onGoToScan}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white text-[#1473EA] hover:bg-blue-50 font-black text-sm shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shrink-0"
            id="home-quick-scan-btn"
          >
            <Camera className="w-5 h-5 text-[#1473EA]" />
            <span>Quick Scan Product</span>
          </button>
        </div>
      </div>

      {/* 2. Critical Active Alerts Banner */}
      <HomeScreenActiveExpiryAlerts
        onNavigateToAlerts={onGoToAlerts}
        onNavigateToStockOut={(prodId) => onStockOut?.(prodId)}
      />

      {/* 3. Live Supabase Visitor Counter */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1473EA] flex items-center justify-center font-bold shrink-0">
            <Users className="w-5 h-5 text-[#1473EA]" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <span>👥 Visitors</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-[#092B4C] leading-none mt-0.5">
              {displayVisitorCount !== null ? displayVisitorCount.toLocaleString() : '...'}
            </div>
          </div>
        </div>
        <div className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
          Supabase Live
        </div>
      </div>

      {/* 3. Metric Cards Row (Total Products, Expiring Soon, Expired) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {/* Total Products */}
        <button
          type="button"
          onClick={onGoToInventory}
          className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1473EA] flex items-center justify-center font-bold">
              <Boxes className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#1473EA]">View</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-[#092B4C] leading-none">
            {valuation.productCount}
          </div>
          <div className="text-[11px] font-bold text-slate-500 mt-1 truncate">
            Total Products
          </div>
        </button>

        {/* Expiring Soon */}
        <button
          type="button"
          onClick={onGoToAlerts}
          className={`bg-white rounded-2xl p-3 sm:p-4 border shadow-2xs transition-all text-left group cursor-pointer ${
            valuation.expiringCount > 0 ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
              valuation.expiringCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
            {valuation.expiringCount > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900">
                Warn
              </span>
            )}
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-900 leading-none">
            {valuation.expiringCount}
          </div>
          <div className="text-[11px] font-bold text-slate-600 mt-1 truncate">
            Expiring Soon
          </div>
        </button>

        {/* Expired Products */}
        <button
          type="button"
          onClick={onGoToAlerts}
          className={`bg-white rounded-2xl p-3 sm:p-4 border shadow-2xs transition-all text-left group cursor-pointer ${
            valuation.expiredCount > 0 ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
              valuation.expiredCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            {valuation.expiredCount > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-rose-200 text-rose-900">
                Action
              </span>
            )}
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-900 leading-none">
            {valuation.expiredCount}
          </div>
          <div className="text-[11px] font-bold text-slate-600 mt-1 truncate">
            Expired
          </div>
        </button>
      </div>

      {/* 4. Quick Actions Hub */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2 px-0.5">
          Quick Actions
        </h2>
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={onGoToScan}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-200 transition-colors text-center cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#1473EA] text-white flex items-center justify-center mb-1 group-hover:scale-105 transition-transform shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">Scan</span>
          </button>

          <button
            type="button"
            onClick={onGoToInventory}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-200 transition-colors text-center cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center mb-1 group-hover:scale-105 transition-transform shadow-xs">
              <Boxes className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">Catalog</span>
          </button>

          <button
            type="button"
            onClick={() => onStockIn?.()}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-200 transition-colors text-center cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-1 group-hover:scale-105 transition-transform shadow-xs">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">Stock In</span>
          </button>

          <button
            type="button"
            onClick={() => onStockOut?.()}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 transition-colors text-center cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center mb-1 group-hover:scale-105 transition-transform shadow-xs">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">Stock Out</span>
          </button>
        </div>
      </div>

      {/* 5. Recent Inventory Activity */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-[#1473EA]" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#092B4C]">
              Recent Inventory
            </h2>
          </div>
          <button
            type="button"
            onClick={onGoToInventory}
            className="text-xs font-bold text-[#1473EA] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentProducts.length === 0 ? (
          <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
            <Boxes className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-medium text-slate-500">No products added yet.</p>
            <button
              type="button"
              onClick={onGoToScan}
              className="px-4 py-2 rounded-xl bg-[#1473EA] text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan First Product</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentProducts.map((prod) => {
              const isExpired = prod.expiry_date
                ? new Date(prod.expiry_date).getTime() < new Date().getTime()
                : false;

              return (
                <div
                  key={prod.id}
                  onClick={() => onSelectProduct?.(prod)}
                  className="p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-slate-50/80 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-400">
                      {prod.image_url ? (
                        <img
                          src={prod.image_url}
                          alt={prod.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Boxes className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-extrabold text-slate-900 truncate group-hover:text-[#1473EA]">
                        {prod.product_name}
                      </h3>
                      <p className="text-[11px] text-slate-500 truncate">
                        Qty: <strong className="text-slate-800">{prod.quantity || 1} {prod.unit || 'pcs'}</strong>
                        {prod.price ? ` · ${currencySymbol}${prod.price}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isExpired ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                        Expired
                      </span>
                    ) : prod.expiry_date ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {prod.expiry_date}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400">No EXD</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#1473EA]" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
