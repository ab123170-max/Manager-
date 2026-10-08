/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ReactNode } from 'react';
import { isAdSenseAllowedOnPath } from '../../config/adsenseConfig';

interface AdSenseContentGuardProps {
  /**
   * Current pathname. If omitted, window.location.pathname will be evaluated.
   */
  currentPath?: string;
  /**
   * Children components (typically <AdSenseSlot />) to render when approved.
   */
  children?: ReactNode;
  /**
   * Optional fallback when ads are blocked (defaults to null).
   */
  fallback?: ReactNode;
}

/**
 * AdSenseContentGuard
 *
 * Enforces strict compliance with Google AdSense Policies:
 * - Ads are DISABLED BY DEFAULT.
 * - Ads are NEVER rendered on screens without substantial publisher content.
 * - Ads are NEVER rendered on camera, scanner, dashboard, auth, or interactive tools.
 */
export const AdSenseContentGuard: React.FC<AdSenseContentGuardProps> = ({
  currentPath,
  children,
  fallback = null,
}) => {
  const activePath =
    currentPath || (typeof window !== 'undefined' ? window.location.pathname : '');

  const isAllowed = isAdSenseAllowedOnPath(activePath);

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
