/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { expiryAlertManager, ExpiryAlertItem } from './expiryAlertManager';

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
  /**
   * Delegates to expiryAlertManager
   */
  public parseExpiryToDate(dateStr: string): Date | null {
    return expiryAlertManager.parseExpiryToDate(dateStr);
  }

  public checkInventoryExpiry(): ExpiryToastNotification[] {
    const { active } = expiryAlertManager.recomputeAlerts();
    return active.map((a) => ({
      id: a.alertKey,
      productId: a.productId,
      productName: a.productName,
      expiryDateStr: a.expiryDateStr,
      daysRemaining: a.daysRemaining,
      isExpired: a.isExpired,
      timestamp: a.triggeredAt,
    }));
  }

  public subscribe(listener: ExpiryNotificationListener): () => void {
    return expiryAlertManager.subscribeToast((item) => {
      listener({
        id: item.alertKey,
        productId: item.productId,
        productName: item.productName,
        expiryDateStr: item.expiryDateStr,
        daysRemaining: item.daysRemaining,
        isExpired: item.isExpired,
        timestamp: item.triggeredAt,
      });
    });
  }

  public startMonitoring(): void {
    expiryAlertManager.init();
  }

  public stopMonitoring(): void {
    // Keep alive through manager
  }

  public resetNotificationCache(): void {
    expiryAlertManager.resetAllDismissals();
  }
}

export const expiryNotificationService = new ExpiryNotificationService();
