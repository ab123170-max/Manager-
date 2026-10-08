/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AdSenseUnit, AdSenseUnitProps } from './AdSenseUnit';
import { AdSenseContentGuard } from './AdSenseContentGuard';

export interface AdSenseSlotProps extends AdSenseUnitProps {
  currentPath?: string;
}

/**
 * AdSenseSlot
 *
 * Safe AdSense placement wrapper that automatically passes through <AdSenseContentGuard>.
 *
 * Guarantees:
 * 1. Default state: ADS DISABLED.
 * 2. Only active on explicitly approved public publisher content routes.
 * 3. Never loads or executes on camera, dashboard, forms, or empty states.
 */
export const AdSenseSlot: React.FC<AdSenseSlotProps> = ({
  currentPath,
  className = '',
  format = 'auto',
  showLabel = true,
  labelText = 'Advertisement',
  ...restProps
}) => {
  return (
    <AdSenseContentGuard currentPath={currentPath}>
      <div className="w-full flex justify-center items-center my-6">
        <AdSenseUnit
          className={`max-w-4xl mx-auto ${className}`}
          format={format}
          showLabel={showLabel}
          labelText={labelText}
          {...restProps}
        />
      </div>
    </AdSenseContentGuard>
  );
};
