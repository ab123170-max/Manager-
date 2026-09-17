/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

export const ViewLoadingSkeleton: React.FC<{ label?: string }> = ({
  label = 'Loading view...',
}) => {
  return (
    <div className="w-full space-y-5 animate-pulse py-2">
      {/* Skeleton Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="space-y-2 max-w-sm w-full">
          <div className="h-3 w-28 bg-slate-200 rounded-md" />
          <div className="h-5 w-52 bg-slate-300 rounded-lg" />
          <div className="h-3 w-64 bg-slate-200 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 bg-slate-200 rounded-xl" />
          <div className="h-9 w-9 bg-slate-200 rounded-xl" />
        </div>
      </div>

      {/* Skeleton Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-slate-200 rounded-md" />
              <div className="w-8 h-8 rounded-xl bg-slate-100" />
            </div>
            <div className="h-6 w-24 bg-slate-300 rounded-lg" />
            <div className="h-2.5 w-32 bg-slate-100 rounded-md" />
          </div>
        ))}
      </div>

      {/* Skeleton Main View Block */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs min-h-[320px] flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
        <p className="text-xs font-semibold text-slate-600">{label}</p>
      </div>
    </div>
  );
};
