/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, X, ArrowRight, ShieldAlert } from 'lucide-react';
import { expiryNotificationService, ExpiryToastNotification } from '../../utils/expiryNotificationService';

interface ToastContainerProps {
  onNavigateToInventory?: () => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ onNavigateToInventory }) => {
  const [toasts, setToasts] = useState<ExpiryToastNotification[]>([]);

  useEffect(() => {
    // Start the periodic monitoring
    expiryNotificationService.startMonitoring(60000);

    // Subscribe to incoming alerts
    const unsubscribe = expiryNotificationService.subscribe((newToast) => {
      setToasts((prev) => {
        // Prevent duplicate IDs
        if (prev.some((t) => t.id === newToast.id)) return prev;
        // Keep max 3 toasts visible at a time
        return [newToast, ...prev].slice(0, 3);
      });

      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== newToast.id));
      }, 8000);
    });

    return () => {
      unsubscribe();
      expiryNotificationService.stopMonitoring();
    };
  }, []);

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      id="expiry-toast-container"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full px-3 sm:px-0 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const isExp = toast.isExpired;

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto rounded-2xl p-4 shadow-lg border backdrop-blur-sm transition-all animate-in slide-in-from-top-3 duration-200 ${
              isExp
                ? 'bg-rose-50/95 border-rose-200 text-rose-950'
                : 'bg-amber-50/95 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isExp ? 'bg-rose-200/70 text-rose-700' : 'bg-amber-200/70 text-amber-700'
                }`}
              >
                {isExp ? (
                  <ShieldAlert className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold truncate">{toast.productName}</h4>
                  <button
                    type="button"
                    onClick={() => handleDismiss(toast.id)}
                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                    aria-label="Dismiss notification"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[11px] font-medium mt-0.5 opacity-90">
                  {isExp ? (
                    <span className="font-bold text-rose-700">
                      Expired on {toast.expiryDateStr}
                    </span>
                  ) : toast.daysRemaining === 0 ? (
                    <span className="font-bold text-rose-600">
                      Expires today! ({toast.expiryDateStr})
                    </span>
                  ) : toast.daysRemaining === 1 ? (
                    <span className="font-bold text-amber-700">
                      Expires tomorrow! ({toast.expiryDateStr})
                    </span>
                  ) : (
                    <span className="text-amber-800">
                      Expires in <strong className="font-bold">{toast.daysRemaining} days</strong> ({toast.expiryDateStr})
                    </span>
                  )}
                </p>

                {onNavigateToInventory && (
                  <div className="mt-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        handleDismiss(toast.id);
                        onNavigateToInventory();
                      }}
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${
                        isExp
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                    >
                      <span>View Inventory</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
