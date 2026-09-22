/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Clock, X, ArrowRight, ShieldAlert, Check } from 'lucide-react';
import { expiryAlertManager, ExpiryAlertItem } from '../../utils/expiryAlertManager';

interface ToastContainerProps {
  onNavigateToInventory?: () => void;
  onNavigateToAlerts?: () => void;
}

interface ToastCardProps {
  toast: ExpiryAlertItem;
  onDismiss: (alertKey: string) => void;
  onAction?: () => void;
}

const ToastCard: React.FC<ToastCardProps> = ({ toast, onDismiss, onAction }) => {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const isExp = toast.isExpired;

  // Touch Swipe to Dismiss Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX;
    // Allow dragging in either direction
    setSwipeOffset(diff);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (Math.abs(swipeOffset) > 75) {
      // Swiped past threshold -> trigger dismiss
      const exitDir = swipeOffset > 0 ? 300 : -300;
      setSwipeOffset(exitDir);
      setTimeout(() => {
        onDismiss(toast.alertKey);
      }, 150);
    } else {
      // Reset position if threshold wasn't met
      setSwipeOffset(0);
    }
    setTouchStartX(null);
  };

  return (
    <div
      ref={cardRef}
      id={`toast-${toast.alertKey}`}
      role="alert"
      style={{
        transform: `translateX(${swipeOffset}px)`,
        opacity: Math.max(0, 1 - Math.abs(swipeOffset) / 200),
        transition: isSwiping ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`pointer-events-auto rounded-2xl p-4 shadow-xl border backdrop-blur-md transition-all select-none ${
        isExp
          ? 'bg-rose-50/98 border-rose-200 text-rose-950 shadow-rose-900/10'
          : toast.daysRemaining <= 7
          ? 'bg-orange-50/98 border-orange-200 text-orange-950 shadow-orange-900/10'
          : 'bg-amber-50/98 border-amber-200 text-amber-950 shadow-amber-900/10'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
            isExp
              ? 'bg-rose-600 text-white'
              : toast.daysRemaining <= 7
              ? 'bg-orange-600 text-white'
              : 'bg-amber-500 text-white'
          }`}
        >
          {isExp ? <ShieldAlert className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-extrabold truncate text-slate-900">
              {toast.productName}
            </h4>
            {/* 1. X / Close button */}
            <button
              type="button"
              onClick={() => onDismiss(toast.alertKey)}
              className="text-slate-400 hover:text-slate-700 p-1 -mr-1 -mt-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
              title="Dismiss Alert"
              aria-label="Dismiss Alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] font-medium mt-0.5 leading-snug">
            {isExp ? (
              <span className="font-bold text-rose-700">
                Product expired ({toast.expiryDateStr}) · Qty: {toast.quantity} {toast.unit}
              </span>
            ) : toast.daysRemaining === 0 ? (
              <span className="font-bold text-rose-600">
                Expires today! ({toast.expiryDateStr}) · Qty: {toast.quantity} {toast.unit}
              </span>
            ) : toast.daysRemaining === 1 ? (
              <span className="font-bold text-orange-700">
                Expires tomorrow! ({toast.expiryDateStr}) · Qty: {toast.quantity} {toast.unit}
              </span>
            ) : toast.daysRemaining <= 7 ? (
              <span className="font-bold text-orange-800">
                Critical: expires in {toast.daysRemaining} days ({toast.expiryDateStr})
              </span>
            ) : (
              <span className="text-amber-800">
                Expires in <strong>{toast.daysRemaining} days</strong> ({toast.expiryDateStr})
              </span>
            )}
          </p>

          {/* Swipe indicator hint for mobile touch */}
          <div className="text-[9px] text-slate-400 mt-1 flex items-center justify-between">
            <span className="hidden sm:inline">Swipe card to dismiss</span>
            <span className="sm:hidden">Swipe to dismiss</span>
          </div>

          {/* Actions: Dismiss & View Inventory */}
          <div className="mt-2.5 pt-2 border-t border-black/5 flex items-center justify-end gap-2">
            {/* 2. Explicit "Dismiss" action */}
            <button
              type="button"
              onClick={() => onDismiss(toast.alertKey)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-black/5 transition-colors cursor-pointer"
              title="Dismiss this alert"
            >
              Dismiss
            </button>

            {onAction && (
              <button
                type="button"
                onClick={onAction}
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-lg text-white shadow-2xs transition-all cursor-pointer ${
                  isExp
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : toast.daysRemaining <= 7
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                <span>View</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({
  onNavigateToInventory,
  onNavigateToAlerts,
}) => {
  const [toasts, setToasts] = useState<ExpiryAlertItem[]>([]);

  useEffect(() => {
    // Subscribe to new incoming alert toasts
    const unsubscribeToast = expiryAlertManager.subscribeToast((newAlert) => {
      setToasts((prev) => {
        // Prevent duplicate keys
        if (prev.some((t) => t.alertKey === newAlert.alertKey)) return prev;
        // Keep max 3 toasts visible at a time
        return [newAlert, ...prev].slice(0, 3);
      });

      // Auto-dismiss from screen after 10 seconds if user doesn't interact,
      // Note: this auto-clears the toast banner from view
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.alertKey !== newAlert.alertKey));
      }, 10000);
    });

    // Subscribe to active alerts changes in store:
    // If a product is deleted, quantity becomes 0, or expiry date updated,
    // automatically prune the toast!
    const unsubscribeAlerts = expiryAlertManager.subscribeAlerts((activeAlerts) => {
      const activeKeys = new Set(activeAlerts.map((a) => a.alertKey));
      setToasts((current) => current.filter((t) => activeKeys.has(t.alertKey)));
    });

    return () => {
      unsubscribeToast();
      unsubscribeAlerts();
    };
  }, []);

  const handleDismiss = (alertKey: string) => {
    // 1. Immediately remove from visible toasts
    setToasts((prev) => prev.filter((t) => t.alertKey !== alertKey));
    // 2. Persist dismissal in manager so it never reappears on reload
    expiryAlertManager.dismissAlert(alertKey);
  };

  const handleAction = () => {
    if (onNavigateToAlerts) {
      onNavigateToAlerts();
    } else if (onNavigateToInventory) {
      onNavigateToInventory();
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div
      id="expiry-toast-container"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full px-3 sm:px-0 pointer-events-none"
      aria-live="polite"
      aria-label="Expiry Alerts Notifications"
    >
      {toasts.map((toast) => (
        <ToastCard
          key={toast.alertKey}
          toast={toast}
          onDismiss={handleDismiss}
          onAction={handleAction}
        />
      ))}
    </div>
  );
};
