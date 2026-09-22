/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, useAnimation, PanInfo } from 'motion/react';
import {
  Trash2,
  Edit,
  ShoppingBag,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Tag,
  AlertTriangle,
  ChevronLeft,
} from 'lucide-react';
import { SavedInventoryItem } from '../../types';

interface SwipeableInventoryItemProps {
  product: SavedInventoryItem;
  onDelete: (product: SavedInventoryItem) => void;
  onQuickStock?: (id: string, delta: number) => void;
  onStockIn?: (productId?: string) => void;
  onStockOut?: (productId?: string) => void;
  onRecordSale?: (product: SavedInventoryItem) => void;
  onEditProduct?: (product: SavedInventoryItem) => void;
  onSelectProduct?: (product: SavedInventoryItem) => void;
}

export const SwipeableInventoryItem: React.FC<SwipeableInventoryItemProps> = ({
  product,
  onDelete,
  onQuickStock,
  onStockIn,
  onStockOut,
  onRecordSale,
  onEditProduct,
  onSelectProduct,
}) => {
  const controls = useAnimation();
  const [isRevealed, setIsRevealed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const pPrice = parseFloat(product.purchasePrice?.replace(/[^0-9.]/g, '') || '0') || 0;
  const sPrice = parseFloat(product.sellingPrice?.replace(/[^0-9.]/g, '') || product.mrp?.replace(/[^0-9.]/g, '') || '0') || 0;
  const totalVal = (product.stockQuantity || 0) * pPrice;

  const handleDragEnd = async (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // If dragged past threshold or swiped with high leftward velocity: auto-delete
    if (info.offset.x < -130 || info.velocity.x < -600) {
      triggerDelete();
      return;
    }

    // If dragged enough to reveal action button (-45px to -130px)
    if (info.offset.x < -45) {
      await controls.start({ x: -96, transition: { type: 'spring', stiffness: 400, damping: 30 } });
      setIsRevealed(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
    } else {
      // Snap back closed
      await controls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } });
      setIsRevealed(false);
    }
  };

  const triggerDelete = async () => {
    setIsDeleting(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30, 50, 30]);
    }
    // Animate item sliding off screen to the left
    await controls.start({ x: -400, opacity: 0, transition: { duration: 0.25, ease: 'easeInOut' } });
    onDelete(product);
  };

  const closeSwipe = () => {
    if (isRevealed) {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } });
      setIsRevealed(false);
    }
  };

  const getStatusBadge = () => {
    if (product.status === 'expired') {
      return <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white">Expired</span>;
    }
    if (product.status === 'expiring_soon') {
      return <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-orange-500 text-white">Expiring</span>;
    }
    if (product.status === 'low_stock') {
      return <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white">Low Stock</span>;
    }
    if (product.status === 'out_of_stock') {
      return <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-white">Out of Stock</span>;
    }
    return <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white">In Stock</span>;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-rose-600 select-none touch-pan-y shadow-xs">
      {/* Background Revealed Action: Swipe-to-Delete Container */}
      <div className="absolute inset-y-0 right-0 w-24 flex flex-col items-center justify-center bg-rose-600 text-white font-bold text-xs z-0">
        <button
          type="button"
          onClick={triggerDelete}
          className="w-full h-full flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
          aria-label={`Delete ${product.productName}`}
        >
          <Trash2 className="w-5 h-5 text-white animate-pulse" />
          <span className="text-[11px] font-black tracking-wider uppercase">Delete</span>
        </button>
      </div>

      {/* Foreground Swipeable Card */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={{ left: 0.15, right: 0.05 }}
        onDragEnd={handleDragEnd}
        animate={controls}
        onClick={closeSwipe}
        className="relative z-10 bg-white p-4 border border-slate-200/80 rounded-2xl cursor-grab active:cursor-grabbing transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Title & Category Row */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[10px]">
                {product.category || 'General'}
              </span>
              {getStatusBadge()}
              {product.turnoverVelocity === 'fast' && (
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                  ⚡ Fast
                </span>
              )}
            </div>

            <h3
              onClick={() => onSelectProduct?.(product)}
              className="font-black text-slate-900 text-sm leading-snug line-clamp-1 hover:text-indigo-600 cursor-pointer"
            >
              {product.productName}
            </h3>

            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2 mt-0.5">
              <span>{product.brand || product.supplier || 'No Brand'}</span>
              {(product.barcode || product.sku) && (
                <>
                  <span>•</span>
                  <span className="font-mono text-slate-600">{product.barcode || product.sku}</span>
                </>
              )}
            </div>
          </div>

          {/* Stock Badge */}
          <div className="text-right flex flex-col items-end flex-shrink-0">
            <span
              className={`font-black text-xs px-2.5 py-1 rounded-lg ${
                product.stockQuantity <= 0
                  ? 'bg-rose-100 text-rose-800'
                  : product.stockQuantity <= (product.minStockAlert || 5)
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {product.stockQuantity} {product.unit || 'pcs'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-1">
              Val: ${totalVal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Pricing & Expiry Meta */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Selling</span>
              <span className="font-black text-emerald-700 text-sm">${sPrice.toFixed(2)}</span>
            </div>
            {pPrice > 0 && (
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Cost</span>
                <span className="font-bold text-slate-600 text-xs">${pPrice.toFixed(2)}</span>
              </div>
            )}
            {product.expiryDate && (
              <div className="hidden sm:block">
                <span className="text-[10px] text-slate-400 block font-medium">Expiry</span>
                <span className={`text-[11px] font-semibold ${product.status === 'expired' ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                  {product.expiryDate}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons & Swipe Cue */}
          <div className="flex items-center gap-1.5">
            {onQuickStock && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickStock(product.id, 1);
                }}
                className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-extrabold text-[11px] transition-colors"
                title="Quick +1 Stock"
              >
                +1
              </button>
            )}

            {onStockIn && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStockIn(product.id);
                }}
                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                title="Stock In (+)"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
              </button>
            )}

            {onStockOut && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStockOut(product.id);
                }}
                className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                title="Stock Out (-)"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}

            {onRecordSale && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRecordSale(product);
                }}
                className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                title="Sell Product"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
              </button>
            )}

            {onEditProduct && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditProduct(product);
                }}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                title="Edit Product"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Subtle swipe hint indicator icon */}
            <div className="flex items-center text-slate-300 ml-1" title="Swipe left to delete">
              <ChevronLeft className="w-4 h-4 animate-pulse" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
