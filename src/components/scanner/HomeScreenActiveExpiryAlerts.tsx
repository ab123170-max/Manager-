/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  X,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { expiryAlertManager, ExpiryAlertItem } from '../../utils/expiryAlertManager';

interface HomeScreenActiveExpiryAlertsProps {
  onNavigateToAlerts?: () => void;
  onNavigateToStockOut?: (productId: string) => void;
}

interface AlertRowProps {
  alert: ExpiryAlertItem;
  onDismiss: (alertKey: string) => void;
  onAction?: (productId: string) => void;
}

const AlertRow: React.FC<AlertRowProps> = ({ alert, onDismiss, onAction }) => {
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const isExp = alert.isExpired;

  const triggerDismiss = (direction: number = -1) => {
    setIsDismissing(true);
    setSwipeOffset(direction * 400);
    setTimeout(() => {
      onDismiss(alert.alertKey);
    }, 180);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartX === null) return;
    const diff = e.touches[0].clientX - dragStartX;
    setSwipeOffset(diff);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (Math.abs(swipeOffset) > 60) {
      triggerDismiss(swipeOffset > 0 ? 1 : -1);
    } else {
      setSwipeOffset(0);
    }
    setDragStartX(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with left click, ignore on buttons
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    setDragStartX(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || dragStartX === null) return;
    const diff = e.clientX - dragStartX;
    setSwipeOffset(diff);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (Math.abs(swipeOffset) > 60) {
      triggerDismiss(swipeOffset > 0 ? 1 : -1);
    } else {
      setSwipeOffset(0);
    }
    setDragStartX(null);
  };

  return (
    <div
      style={{
        transform: `translateX(${swipeOffset}px)`,
        opacity: Math.max(0, 1 - Math.abs(swipeOffset) / 240),
        transition: isDragging ? 'none' : 'transform 0.22s ease-out, opacity 0.22s ease-out',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`p-3.5 rounded-2xl border select-none transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isExp
          ? 'bg-rose-50/90 border-rose-200 text-rose-950'
          : alert.daysRemaining <= 7
          ? 'bg-orange-50/90 border-orange-200 text-orange-950'
          : 'bg-amber-50/90 border-amber-200 text-amber-950'
      } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            isExp
              ? 'bg-rose-600 text-white'
              : alert.daysRemaining <= 7
              ? 'bg-orange-500 text-white'
              : 'bg-amber-500 text-white'
          }`}
        >
          {isExp ? <ShieldAlert className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
              {alert.productName}
            </h4>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isExp
                  ? 'bg-rose-200 text-rose-800'
                  : alert.daysRemaining <= 7
                  ? 'bg-orange-200 text-orange-800'
                  : 'bg-amber-200 text-amber-800'
              }`}
            >
              {isExp
                ? 'EXPIRED'
                : alert.daysRemaining === 0
                ? 'EXPIRES TODAY'
                : `${alert.daysRemaining} days left`}
            </span>
          </div>

          <p className="text-[11px] text-slate-600 mt-0.5">
            Expiry: <strong className="font-semibold">{alert.expiryDateStr}</strong> · Stock:{' '}
            <strong>
              {alert.quantity} {alert.unit}
            </strong>{' '}
            {alert.barcode && <span className="opacity-80">· Code: {alert.barcode}</span>}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/5">
        {onAction && (
          <button
            type="button"
            onClick={() => onAction(alert.productId)}
            className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
          >
            <span>Resolve</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}

        {/* Explicit "Dismiss" action */}
        <button
          type="button"
          onClick={() => triggerDismiss(-1)}
          disabled={isDismissing}
          className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
          title="Dismiss this alert"
        >
          Dismiss
        </button>

        {/* X close button */}
        <button
          type="button"
          onClick={() => triggerDismiss(-1)}
          disabled={isDismissing}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-black/5 transition-colors cursor-pointer disabled:opacity-50"
          title="Dismiss Alert"
          aria-label="Dismiss Alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const HomeScreenActiveExpiryAlerts: React.FC<HomeScreenActiveExpiryAlertsProps> = ({
  onNavigateToAlerts,
  onNavigateToStockOut,
}) => {
  const [activeAlerts, setActiveAlerts] = useState<ExpiryAlertItem[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    // Subscribe to active alerts from central manager
    const unsubscribe = expiryAlertManager.subscribeAlerts((alerts) => {
      setActiveAlerts(alerts);
    });
    return unsubscribe;
  }, []);

  const handleDismiss = (alertKey: string) => {
    expiryAlertManager.dismissAlert(alertKey);
  };

  const handleDismissAll = () => {
    const keys = activeAlerts.map((a) => a.alertKey);
    expiryAlertManager.dismissAllAlerts(keys);
  };

  // If no active alerts, show nothing on starting screen
  if (activeAlerts.length === 0) {
    return null;
  }

  const expiredCount = activeAlerts.filter((a) => a.isExpired).length;
  const soonCount = activeAlerts.length - expiredCount;

  return (
    <section
      id="home-active-expiry-alerts-banner"
      aria-label="Active Expiry Alerts"
      className="bg-white rounded-2xl p-3 border border-amber-200 shadow-2xs space-y-2 transition-all"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                Active Expiry Alerts
              </h3>
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800">
                {activeAlerts.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {expiredCount > 0 && <span>{expiredCount} expired · </span>}
              {soonCount > 0 && <span>{soonCount} expiring soon</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="text-xs font-semibold px-2 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {isExpanded ? 'Hide' : 'Show details'}
          </button>

          {onNavigateToAlerts && (
            <button
              type="button"
              onClick={onNavigateToAlerts}
              className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Radar</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-2 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[11px] text-slate-500 pb-0.5">
            <span>Tap dismiss to clear alert item</span>
            {activeAlerts.length > 1 && (
              <button
                type="button"
                onClick={handleDismissAll}
                className="text-slate-600 hover:text-slate-900 font-bold"
              >
                Dismiss All
              </button>
            )}
          </div>
          {activeAlerts.map((alert) => (
            <AlertRow
              key={alert.alertKey}
              alert={alert}
              onDismiss={handleDismiss}
              onAction={onNavigateToStockOut}
            />
          ))}
        </div>
      )}
    </section>
  );
};
