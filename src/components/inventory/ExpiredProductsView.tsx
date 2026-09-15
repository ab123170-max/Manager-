/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Skull,
  AlertOctagon,
  Trash2,
  DollarSign,
  Package,
  CheckCircle2,
} from 'lucide-react';
import { SavedInventoryItem } from '../../types';
import {
  getProducts,
  recordLoss,
  subscribeToStore,
} from '../../utils/unifiedDataStore';

export const ExpiredProductsView: React.FC = () => {
  const [products, setProducts] = useState<SavedInventoryItem[]>(getProducts());
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToStore(() => {
      setProducts(getProducts());
    });
  }, []);

  const expiredItems = products.filter((p) => p.status === 'expired');

  const handleWriteOff = (prod: SavedInventoryItem) => {
    const cost = parseFloat(prod.purchasePrice?.replace(/[^0-9.]/g, '') || '0') || 0;
    const lossValue = prod.stockQuantity * cost;

    if (
      !confirm(
        `Write off ${prod.stockQuantity} expired unit(s) of "${prod.productName}" to the Loss Account? (Estimated Loss: $${lossValue.toFixed(2)})`
      )
    ) {
      return;
    }

    recordLoss({
      productId: prod.id,
      quantity: prod.stockQuantity,
      unitPrice: cost,
      reason: 'expired',
      notes: `Batch expired on ${prod.expiryDate}. Disposed & written off to loss.`,
    });

    setFeedback(`Successfully written off ${prod.productName} to Loss Account.`);
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Skull className="w-4 h-4" />
            <span>Hazard &amp; Write-Offs</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Expired Products ({expiredItems.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Goods that have passed their safe expiry date. Immediately write-off expired stock to synchronize the Loss ledger and remove unfit items from sellable inventory.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {expiredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {expiredItems.map((p) => {
            const cost = parseFloat(p.purchasePrice?.replace(/[^0-9.]/g, '') || '0') || 0;
            const lossVal = p.stockQuantity * cost;

            return (
              <div
                key={p.id}
                className="bg-white p-5 rounded-3xl border border-rose-200 shadow-xs space-y-3 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                      Expired {p.expiryDate}
                    </span>
                    <h3 className="font-black text-slate-900 text-sm mt-1.5">{p.productName}</h3>
                    <p className="text-xs text-slate-500 font-medium">{p.brand || 'General'}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-rose-600 block">
                      {p.stockQuantity} {p.unit || 'units'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Unsellable</span>
                  </div>
                </div>

                <div className="p-3 bg-rose-50/60 rounded-xl grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Unit Cost:</span>
                    <span className="font-bold text-slate-800">${cost.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Total Loss Value:</span>
                    <span className="font-black text-rose-700">${lossVal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleWriteOff(p)}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Write-Off to Loss Account</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
          <p className="text-sm font-bold text-slate-700">Zero Expired Inventory</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All stored inventory is fresh and safe for customer distribution.
          </p>
        </div>
      )}
    </div>
  );
};
