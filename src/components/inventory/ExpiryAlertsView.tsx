/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  X,
  RotateCcw,
  ArrowRight,
  Package,
  Calendar,
  DollarSign,
  Tag,
  ArrowUpRight,
  Filter,
  Check,
} from 'lucide-react';
import { expiryAlertManager, ExpiryAlertItem } from '../../utils/expiryAlertManager';

interface ExpiryAlertsViewProps {
  onResolveStockOut?: (productId: string) => void;
  onNavigateToCatalog?: () => void;
}

export const ExpiryAlertsView: React.FC<ExpiryAlertsViewProps> = ({
  onResolveStockOut,
  onNavigateToCatalog,
}) => {
  const [activeAlerts, setActiveAlerts] = useState<ExpiryAlertItem[]>([]);
  const [allAlerts, setAllAlerts] = useState<ExpiryAlertItem[]>([]);
  const [filterTab, setFilterTab] = useState<'active' | 'dismissed' | 'all'>('active');

  const refreshData = () => {
    setActiveAlerts(expiryAlertManager.getActiveAlerts());
    setAllAlerts(expiryAlertManager.getAllAlerts());
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = expiryAlertManager.subscribeAlerts(() => {
      refreshData();
    });
    return unsubscribe;
  }, []);

  const handleDismiss = (alertKey: string) => {
    expiryAlertManager.dismissAlert(alertKey);
    refreshData();
  };

  const handleRestore = (alertKey: string) => {
    expiryAlertManager.restoreAlert(alertKey);
    refreshData();
  };

  const handleResetAllDismissals = () => {
    if (window.confirm('Restore all dismissed expiry alerts to active status?')) {
      expiryAlertManager.resetAllDismissals();
      refreshData();
    }
  };

  const handleDismissAllActive = () => {
    const keys = activeAlerts.map((a) => a.alertKey);
    expiryAlertManager.dismissAllAlerts(keys);
    refreshData();
  };

  const dismissedAlerts = allAlerts.filter((a) => a.dismissed);
  const expiredCount = allAlerts.filter((a) => a.isExpired && !a.dismissed).length;
  const criticalCount = allAlerts.filter((a) => !a.isExpired && a.daysRemaining <= 7 && !a.dismissed).length;

  const displayList =
    filterTab === 'active'
      ? activeAlerts
      : filterTab === 'dismissed'
      ? dismissedAlerts
      : allAlerts;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-14 font-sans text-slate-900">
      {/* View Header */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-600 text-xs font-bold uppercase tracking-wider mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span>Inventory Lifecycle Notifications</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Expiry Alerts ({activeAlerts.length} Active)
            </h1>
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayList.map((item) => {
            const isExp = item.isExpired;

            return (
              <div
                key={item.alertKey}
                className={`bg-white rounded-3xl p-5 border shadow-xs space-y-4 relative transition-all ${
                  item.dismissed
                    ? 'border-slate-200 opacity-75'
                    : isExp
                    ? 'border-rose-300 ring-1 ring-rose-300/40'
                    : item.daysRemaining <= 7
                    ? 'border-orange-300 ring-1 ring-orange-300/40'
                    : 'border-amber-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                        isExp
                          ? 'bg-rose-600 text-white'
                          : item.daysRemaining <= 7
                          ? 'bg-orange-500 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {isExp ? <ShieldAlert className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isExp
                              ? 'bg-rose-100 text-rose-800'
                              : item.daysRemaining <= 7
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isExp
                            ? 'EXPIRED'
                            : item.daysRemaining === 0
                            ? 'EXPIRES TODAY'
                            : `${item.daysRemaining} DAYS REMAINING`}
                        </span>

                        {item.dismissed && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            DISMISSED
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 mt-1">
                        {item.productName}
                      </h3>
                      {item.brand && (
                        <p className="text-xs text-slate-500 font-medium">Brand: {item.brand}</p>
                      )}
                    </div>
                  </div>

                  {/* Dismiss / Restore Quick Button */}
                  {item.dismissed ? (
                    <button
                      type="button"
                      onClick={() => handleRestore(item.alertKey)}
                      className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                      title="Restore alert to active"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDismiss(item.alertKey)}
                      className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                      title="Dismiss alert"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Dismiss</span>
                    </button>
                  )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Expiry Date
                    </span>
                    <span className="font-bold text-slate-800">{item.expiryDateStr}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Stock Quantity
                    </span>
                    <span className="font-bold text-slate-800">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  {item.category && (
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Category
                      </span>
                      <span className="font-medium text-slate-700">{item.category}</span>
                    </div>
                  )}
                  {item.barcode && (
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Barcode
                      </span>
                      <span className="font-mono text-slate-700">{item.barcode}</span>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="text-[11px] text-slate-400">
                    {item.dismissed ? (
                      <span>Dismissed from starting screen</span>
                    ) : (
                      <span>Active on starting screen</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {onResolveStockOut && (
                      <button
                        type="button"
                        onClick={() => onResolveStockOut(item.productId)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all shadow-2xs flex items-center gap-1 cursor-pointer ${
                          isExp
                            ? 'bg-rose-600 hover:bg-rose-700'
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        <span>{isExp ? 'Write Off' : 'Stock Out'}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
