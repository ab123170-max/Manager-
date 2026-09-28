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
 * Official Google AdSense Configuration for ScanMe AI
 * Publisher ID: ca-pub-1392773083498575
 * Ad Unit: Scame
 * Ad Slot ID: 2379426298
 */
export const ADSENSE_CLIENT_ID = 'ca-pub-1392773083498575';
export const ADSENSE_SLOT_ID = '2379426298';

export interface AdSenseUnitProps {
  /**
   * Optional custom slot ID override. Defaults to ADSENSE_SLOT_ID ('2379426298').
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
  slotId = ADSENSE_SLOT_ID,
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

  const activeSlotId = slotId || ADSENSE_SLOT_ID;

  useEffect(() => {
    // Prevent duplicate push to the same ins element across re-renders
    if (isInitializedRef.current) {
      return;
    }

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
  }, [activeSlotId]);

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
          data-ad-slot={activeSlotId}
          data-ad-format={format}
          data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
        />
      </div>
    </aside>
  );
};
