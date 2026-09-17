/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getProducts, subscribeToStore } from './unifiedDataStore';
import { parseDateComponents } from './productDateCalculator';
import { SavedInventoryItem } from '../types';

export interface ExpiryToastNotification {
  id: string;
  productId: string;
  productName: string;
  expiryDateStr: string;
  daysRemaining: number;
  isExpired: boolean;
  timestamp: number;
}

type ExpiryNotificationListener = (notification: ExpiryToastNotification) => void;

class ExpiryNotificationService {
  private listeners = new Set<ExpiryNotificationListener>();
  private timerId: number | null = null;
  private notifiedProductIds = new Set<string>();
  private unsubscribeStore: (() => void) | null = null;
  private isRunning = false;

  /**
   * Parses product expiry date into a Date object
   */
  public parseExpiryToDate(dateStr: string): Date | null {
    if (!dateStr || typeof dateStr !== 'string') return null;

    const parsed = parseDateComponents(dateStr);
    if (parsed && parsed.year && parsed.month) {
      const day = parsed.day || 28; // Default to late in month if only MM/YYYY
      return new Date(parsed.year, parsed.month - 1, day, 23, 59, 59);
    }

    // Standard ISO/US fallback
    const timestamp = Date.parse(dateStr);
    if (!isNaN(timestamp)) {
      return new Date(timestamp);
    }

    return null;
  }

  /**
   * Checks all inventory items and triggers toast alerts for any product expiring within 30 days
   */
  public checkInventoryExpiry(): ExpiryToastNotification[] {
    const products = getProducts();
    const now = new Date();
    // Midnight today for precise day boundary calculations
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const triggeredAlerts: ExpiryToastNotification[] = [];

    for (const p of products) {
      const expStr = p.expiryDate;
      if (!expStr) continue;

      const expDate = this.parseExpiryToDate(expStr);
      if (!expDate) continue;

      const expMidnight = new Date(
        expDate.getFullYear(),
        expDate.getMonth(),
        expDate.getDate()
      ).getTime();

      const diffMs = expMidnight - todayMidnight;
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Check if product is expiring within 30 days (or is already expired)
      if (daysRemaining <= 30) {
        const alertKey = `${p.id}-${expStr}-${daysRemaining <= 0 ? 'exp' : 'soon'}`;

        // Don't notify multiple times for the exact same status in the current session
        if (!this.notifiedProductIds.has(alertKey)) {
          this.notifiedProductIds.add(alertKey);

          const notification: ExpiryToastNotification = {
            id: `expiry-toast-${p.id}-${Date.now()}`,
            productId: p.id,
            productName: p.productName || 'Unknown Product',
            expiryDateStr: expStr,
            daysRemaining,
            isExpired: daysRemaining <= 0,
            timestamp: Date.now(),
          };

          triggeredAlerts.push(notification);
          this.emitNotification(notification);
        }
      }
    }

    return triggeredAlerts;
  }

  private emitNotification(notification: ExpiryToastNotification) {
    this.listeners.forEach((listener) => {
      try {
        listener(notification);
      } catch (err) {
        console.error('Error in expiry notification listener:', err);
      }
    });
  }

  /**
   * Subscribe to toast notifications
   */
  public subscribe(listener: ExpiryNotificationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Starts periodic background monitoring of inventory expiry dates
   */
  public startMonitoring(intervalMs: number = 60000) {
    if (this.isRunning) return;
    this.isRunning = true;

    // Run initial check after a slight delay to allow app hydration
    setTimeout(() => {
      this.checkInventoryExpiry();
    }, 1500);

    // Run periodically
    this.timerId = window.setInterval(() => {
      this.checkInventoryExpiry();
    }, intervalMs);

    // Also listen to store changes so newly added products with <30 days are immediately alerted
    this.unsubscribeStore = subscribeToStore(() => {
      this.checkInventoryExpiry();
    });
  }

  /**
   * Stops periodic monitoring
   */
  public stopMonitoring() {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.unsubscribeStore) {
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }
    this.isRunning = false;
  }

  /**
   * Reset the session notification cache (e.g., if user manually clicks recheck)
   */
  public resetNotificationCache() {
    this.notifiedProductIds.clear();
  }
}

export const expiryNotificationService = new ExpiryNotificationService();
