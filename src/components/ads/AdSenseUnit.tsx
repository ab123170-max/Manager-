/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

/**
 * Official Google AdSense Publisher Client ID for ScanMe AI
 */
export const ADSENSE_CLIENT_ID = 'ca-pub-1392773083498575';

export interface AdSenseUnitProps {
  /**
   * AdSense ad unit slot ID (e.g. '1234567890').
   * If not provided, falls back to import.meta.env.VITE_ADSENSE_SLOT_ID.
   */
  slotId?: string;

  /**
   * Ad format: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical'. Defaults to 'auto'.
   */
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';

  /**
   * Enable responsive full-width behavior. Defaults to true.
   */
  fullWidthResponsive?: boolean;

  /**
   * Additional CSS classes for the outer container.
   */
  className?: string;

  /**
   * Optional custom inline styles for the ins element.
   */
  style?: React.CSSProperties;

  /**
   * Show "Advertisement" disclosure label above the unit. Defaults to true for AdSense policy compliance.
   */
  showLabel?: boolean;

  /**
   * Custom label text (defaults to 'Advertisement').
   */
  labelText?: string;
}

export const AdSenseUnit: React.FC<AdSenseUnitProps> = ({
  slotId,
  format = 'auto',
  fullWidthResponsive = true,
  className = '',
  style,
  showLabel = true,
  labelText = 'Advertisement',
}) => {
  const adRef = useRef<HTMLModElement | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  // Resolve slot ID from prop or environment variable
  const resolvedSlotId = (slotId || import.meta.env.VITE_ADSENSE_SLOT_ID || '').trim();

  useEffect(() => {
    // If no slot ID is configured or already initialized, do nothing
    if (!resolvedSlotId || isInitializedRef.current) {
      return;
    }

    // Prevent duplicate push to the same ins tag if already processed
    if (adRef.current && adRef.current.getAttribute('data-adsbygoogle-status')) {
      isInitializedRef.current = true;
      return;
    }

    try {
      if (typeof window !== 'undefined') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isInitializedRef.current = true;
      }
    } catch (err) {
      // Gracefully catch any AdSense push error (e.g. ad-blocker enabled or double push)
      // Never crash the React app or throw uncaught errors.
      console.debug('[AdSense] Ad unit push handled gracefully:', err);
      setHasError(true);
    }
  }, [resolvedSlotId]);

  // If slot ID is not configured yet:
  if (!resolvedSlotId) {
    // In development mode, display a helpful guide placeholder
    if (import.meta.env.DEV) {
      return (
        <aside
          aria-label="AdSense Preview"
          className={`w-full my-4 p-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 text-center transition-all ${className}`}
        >
          <div className="flex flex-col items-center justify-center space-y-1.5 text-xs text-slate-500">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
              Google AdSense Placement ({ADSENSE_CLIENT_ID})
            </span>
            <p className="max-w-md text-[11px] text-slate-500 leading-relaxed">
              Ad slot ID is not yet configured. Once your AdSense unit is approved, add{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-[10px]">
                VITE_ADSENSE_SLOT_ID
              </code>{' '}
              in your environment or pass the <code className="font-mono text-[10px]">slotId</code> prop.
            </p>
          </div>
        </aside>
      );
    }

    // In production without slot ID, remain hidden without disrupting layout
    return null;
  }

  if (hasError) {
    return null;
  }

  return (
    <aside
      aria-label="Sponsored Advertisement"
      className={`w-full my-4 overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-2xs p-3 transition-all ${className}`}
    >
      {showLabel && (
        <div className="text-center mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {labelText}
          </span>
        </div>
      )}

      <div className="flex justify-center items-center w-full min-h-[90px] overflow-hidden">
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{
            display: 'block',
            width: '100%',
            minHeight: '90px',
            textAlign: 'center',
            ...style,
          }}
          data-ad-client={ADSENSE_CLIENT_ID}
          data-ad-slot={resolvedSlotId}
          data-ad-format={format}
          data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
        />
      </div>
    </aside>
  );
};
