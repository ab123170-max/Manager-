/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getProducts, subscribeToStore } from './unifiedDataStore';
import { parseDateComponents } from './productDateCalculator';
import { SavedInventoryItem } from '../types';

export type ExpiryAlertCondition = 'expired' | 'critical' | 'soon';

export interface ExpiryAlertItem {
  alertKey: string; // Composite unique key: `${productId}::${expiryDateStr}::${condition}`
  productId: string;
  productName: string;
  brand?: string;
  category?: string;
  barcode?: string;
  sku?: string;
  expiryDateStr: string;
  daysRemaining: number;
  isExpired: boolean;
  quantity: number;
  unit: string;
  sellingPrice?: string;
  condition: ExpiryAlertCondition;
  triggeredAt: number;
  dismissed: boolean;
  dismissedAt?: number;
}

export type ExpiryAlertListener = (activeAlerts: ExpiryAlertItem[]) => void;
export type ExpiryToastListener = (newAlert: ExpiryAlertItem) => void;

const STORAGE_KEY_DISMISSED = 'scanme_dismissed_expiry_alerts_v1';

class ExpiryAlertManager {
  private activeAlerts: ExpiryAlertItem[] = [];
  private allAlerts: ExpiryAlertItem[] = [];
  private dismissedAlertMap: Record<string, number> = {}; // alertKey -> dismissedAt timestamp
  private toastedKeysInSession = new Set<string>();
  private alertListeners = new Set<ExpiryAlertListener>();
  private toastListeners = new Set<ExpiryToastListener>();
  private unsubscribeStore: (() => void) | null = null;
  private checkIntervalId: number | null = null;
  private isInitialized = false;

  constructor() {
    this.loadDismissedState();
  }

  /**
   * Initializes store subscription and background timer
   */
  public init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.recomputeAlerts();

    // Listen to changes in unifiedDataStore (product added, updated, deleted, quantity changed)
    this.unsubscribeStore = subscribeToStore(() => {
      this.recomputeAlerts();
    });

    // Background interval check every 30 seconds
    this.checkIntervalId = window.setInterval(() => {
      this.recomputeAlerts();
    }, 30000);
  }

  /**
   * Destroy and clean up listeners
   */
  public destroy(): void {
    if (this.unsubscribeStore) {
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }
    if (this.checkIntervalId !== null) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
    this.isInitialized = false;
  }

  /**
   * Loads persisted dismissal map from localStorage
   */
  private loadDismissedState(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DISMISSED);
      if (raw) {
        this.dismissedAlertMap = JSON.parse(raw);
      } else {
        this.dismissedAlertMap = {};
      }
    } catch (err) {
      console.warn('Failed to load dismissed expiry alerts from storage:', err);
      this.dismissedAlertMap = {};
    }
  }

  /**
   * Saves dismissal map to localStorage
   */
  private saveDismissedState(): void {
    try {
      localStorage.setItem(STORAGE_KEY_DISMISSED, JSON.stringify(this.dismissedAlertMap));
    } catch (err) {
      console.warn('Failed to save dismissed expiry alerts to storage:', err);
    }
  }

  /**
   * Parses expiry string into a valid Date object
   */
  public parseExpiryToDate(dateStr: string): Date | null {
    if (!dateStr || typeof dateStr !== 'string') return null;

    const parsed = parseDateComponents(dateStr);
    if (parsed && parsed.year && parsed.month) {
      const day = parsed.day || 28; // Default to end-of-month if only MM/YYYY
      return new Date(parsed.year, parsed.month - 1, day, 23, 59, 59);
    }

    const timestamp = Date.parse(dateStr);
    if (!isNaN(timestamp)) {
      return new Date(timestamp);
    }

    return null;
  }

  /**
   * Generates the composite alert identity: product ID + expiry condition
   */
  public getAlertIdentity(productId: string, expiryDateStr: string, daysRemaining: number): {
    alertKey: string;
    condition: ExpiryAlertCondition;
  } {
    const condition: ExpiryAlertCondition =
      daysRemaining <= 0 ? 'expired' : daysRemaining <= 7 ? 'critical' : 'soon';
    const alertKey = `${productId}::${expiryDateStr.trim()}::${condition}`;
    return { alertKey, condition };
  }

  /**
   * Recomputes all active & dismissed alerts from the real inventory database
   */
  public recomputeAlerts(): { active: ExpiryAlertItem[]; all: ExpiryAlertItem[] } {
    const products = getProducts();
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const activeList: ExpiryAlertItem[] = [];
    const allList: ExpiryAlertItem[] = [];
    const existingProductIds = new Set<string>();

    for (const p of products) {
      existingProductIds.add(p.id);

      // Requirement 4: Automatically remove/hide an alert when:
      // - Product quantity becomes 0 or out of stock
      // - Product is deleted (handled because p won't exist in products)
      const rawQty =
        p.stockQuantity !== undefined
          ? Number(p.stockQuantity)
          : parseFloat(String(p.quantity || '0').replace(/[^0-9.-]/g, ''));
      const qty = isNaN(rawQty) ? 0 : rawQty;
      if (qty <= 0 || p.status === 'out_of_stock') {
        continue;
      }

      // Check expiry date
      const expStr = p.expiryDate;
      if (!expStr || typeof expStr !== 'string' || !expStr.trim()) {
        continue;
      }

      const expDate = this.parseExpiryToDate(expStr);
      if (!expDate) continue;

      const expMidnight = new Date(
        expDate.getFullYear(),
        expDate.getMonth(),
        expDate.getDate()
      ).getTime();

      const diffMs = expMidnight - todayMidnight;
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Requirement 4 & 5: Check if product requires an alert (within 30 days or expired)
      if (daysRemaining > 30) {
        // Expiry date updated or far in future: product no longer requires an alert
        continue;
      }

      // Compute alert key
      const { alertKey, condition } = this.getAlertIdentity(p.id, expStr, daysRemaining);
      const isDismissed = Boolean(this.dismissedAlertMap[alertKey]);
      const dismissedAt = this.dismissedAlertMap[alertKey];

      const alertItem: ExpiryAlertItem = {
        alertKey,
        productId: p.id,
        productName: p.productName || 'Unknown Product',
        brand: p.brand,
        category: p.category,
        barcode: p.barcode,
        sku: p.sku,
        expiryDateStr: expStr,
        daysRemaining,
        isExpired: daysRemaining <= 0,
        quantity: qty,
        unit: p.unit || 'units',
        sellingPrice: p.sellingPrice || p.mrp,
        condition,
        triggeredAt: Date.now(),
        dismissed: isDismissed,
        dismissedAt,
      };

      allList.push(alertItem);

      if (!isDismissed) {
        activeList.push(alertItem);

        // If this alert has never been toasted in this browser session, trigger a toast notification
        if (!this.toastedKeysInSession.has(alertKey)) {
          this.toastedKeysInSession.add(alertKey);
          this.emitToast(alertItem);
        }
      }
    }

    // Sort: expired first, then ascending by daysRemaining
    activeList.sort((a, b) => a.daysRemaining - b.daysRemaining);
    allList.sort((a, b) => a.daysRemaining - b.daysRemaining);

    this.activeAlerts = activeList;
    this.allAlerts = allList;

    // Prune orphan dismissals for products that no longer exist
    this.pruneStaleDismissals(existingProductIds);

    this.emitAlertsChange();
    return { active: activeList, all: allList };
  }

  /**
   * Prune dismissals of products that were completely deleted from inventory
   */
  private pruneStaleDismissals(existingProductIds: Set<string>): void {
    let changed = false;
    for (const key of Object.keys(this.dismissedAlertMap)) {
      const [productId] = key.split('::');
      if (productId && !existingProductIds.has(productId)) {
        delete this.dismissedAlertMap[key];
        changed = true;
      }
    }
    if (changed) {
      this.saveDismissedState();
    }
  }

  /**
   * Dismiss an alert by its composite identity
   * Immediately removes it from active list and persists dismissal
   */
  public dismissAlert(alertKey: string): void {
    if (!alertKey) return;
    this.dismissedAlertMap[alertKey] = Date.now();
    this.saveDismissedState();
    this.recomputeAlerts();
  }

  /**
   * Dismiss multiple alerts at once
   */
  public dismissAllAlerts(alertKeys: string[]): void {
    if (!alertKeys || alertKeys.length === 0) return;
    const now = Date.now();
    for (const key of alertKeys) {
      this.dismissedAlertMap[key] = now;
    }
    this.saveDismissedState();
    this.recomputeAlerts();
  }

  /**
   * Restore/Un-dismiss an alert so it becomes active again
   */
  public restoreAlert(alertKey: string): void {
    if (!alertKey || !this.dismissedAlertMap[alertKey]) return;
    delete this.dismissedAlertMap[alertKey];
    this.saveDismissedState();
    this.recomputeAlerts();
  }

  /**
   * Reset all dismissals
   */
  public resetAllDismissals(): void {
    this.dismissedAlertMap = {};
    this.saveDismissedState();
    this.recomputeAlerts();
  }

  /**
   * Get currently active, non-dismissed alerts
   */
  public getActiveAlerts(): ExpiryAlertItem[] {
    return [...this.activeAlerts];
  }

  /**
   * Get all alerts (active and dismissed)
   */
  public getAllAlerts(): ExpiryAlertItem[] {
    return [...this.allAlerts];
  }

  /**
   * Get dismissed alerts only
   */
  public getDismissedAlerts(): ExpiryAlertItem[] {
    return this.allAlerts.filter((a) => a.dismissed);
  }

  /**
   * Counts
   */
  public getActiveCount(): number {
    return this.activeAlerts.length;
  }

  public getDismissedCount(): number {
    return this.allAlerts.filter((a) => a.dismissed).length;
  }

  /**
   * Subscription for active alerts changes
   */
  public subscribeAlerts(listener: ExpiryAlertListener): () => void {
    this.alertListeners.add(listener);
    // Immediately call listener with current state
    listener(this.activeAlerts);
    return () => {
      this.alertListeners.delete(listener);
    };
  }

  /**
   * Subscription for new toast events
   */
  public subscribeToast(listener: ExpiryToastListener): () => void {
    this.toastListeners.add(listener);
    return () => {
      this.toastListeners.delete(listener);
    };
  }

  private emitAlertsChange(): void {
    this.alertListeners.forEach((listener) => {
      try {
        listener(this.activeAlerts);
      } catch (err) {
        console.error('Error in expiry alert listener:', err);
      }
    });
  }

  private emitToast(alertItem: ExpiryAlertItem): void {
    this.toastListeners.forEach((listener) => {
      try {
        listener(alertItem);
      } catch (err) {
        console.error('Error in expiry toast listener:', err);
      }
    });
  }
}

export const expiryAlertManager = new ExpiryAlertManager();
// Automatically initialize upon load
expiryAlertManager.init();
