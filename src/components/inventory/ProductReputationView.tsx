/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Star,
  ShieldCheck,
  Award,
  ThumbsUp,
  AlertCircle,
  Search,
  Filter,
  CheckCircle2,
  Edit,
  X,
  Save,
  MessageSquare,
  Sparkles,
  Package,
} from 'lucide-react';
import { SavedInventoryItem } from '../../types';
import {
  getProducts,
  getProductReputationSummary,
  updateProductReputation,
  subscribeToStore,
  ProductReputationSummary,
} from '../../utils/unifiedDataStore';

export const ProductReputationView: React.FC = () => {
  const [products, setProducts] = useState<SavedInventoryItem[]>(getProducts());
  const [summary, setSummary] = useState<ProductReputationSummary>(getProductReputationSummary());
  const [search, setSearch] = useState('');
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'Top Rated' | 'Customer Favorite' | 'Quality Verified' | 'Needs Attention'>('all');
  const [editingProduct, setEditingProduct] = useState<SavedInventoryItem | null>(null);

  // Edit form state
  const [editRating, setEditRating] = useState<number>(5.0);
  const [editScore, setEditScore] = useState<number>(95);
  const [editBadge, setEditBadge] = useState<'Top Rated' | 'Customer Favorite' | 'Quality Verified' | 'Needs Attention'>('Top Rated');
  const [editReturnRate, setEditReturnRate] = useState<number>(0.5);
  const [editFeedback, setEditFeedback] = useState<string>('');

  useEffect(() => {
    return subscribeToStore(() => {
      setProducts(getProducts());
      setSummary(getProductReputationSummary());
    });
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !search ||
        p.productName.toLowerCase().includes(search.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(search.toLowerCase())) ||
        (p.barcode && p.barcode.includes(search));

      const matchBadge =
        badgeFilter === 'all' || p.reputationBadge === badgeFilter;

      return matchSearch && matchBadge;
    }).sort((a, b) => {
      return (b.reputationRating || 0) - (a.reputationRating || 0);
    });
  }, [products, search, badgeFilter]);

  const handleOpenEdit = (prod: SavedInventoryItem) => {
    setEditingProduct(prod);
    setEditRating(prod.reputationRating || 4.8);
    setEditScore(prod.reputationScore || 95);
    setEditBadge(prod.reputationBadge || 'Top Rated');
    setEditReturnRate(prod.returnRate || 0.6);
    setEditFeedback(prod.customerFeedbackSummary || '');
  };

  const handleSaveReputation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    updateProductReputation(editingProduct.id, {
      reputationRating: editRating,
      reputationScore: editScore,
      reputationBadge: editBadge,
      returnRate: editReturnRate,
      customerFeedbackSummary: editFeedback.trim(),
    });

    setEditingProduct(null);
  };

  const renderStars = (rating: number = 5) => {
    const rounded = Math.round(rating);
    return (
      <div className="flex items-center gap-0.5 text-amber-400">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-3.5 h-3.5 ${
              s <= rounded ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
            }`}
          />
        ))}
        <span className="ml-1 text-xs font-bold text-slate-800">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const getReputationBadge = (badge?: string) => {
    switch (badge) {
      case 'Top Rated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Award className="w-3 h-3 text-amber-500" />
            Top Rated
          </span>
        );
      case 'Customer Favorite':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <ThumbsUp className="w-3 h-3 text-indigo-600" />
            Customer Favorite
          </span>
        );
      case 'Quality Verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Quality Verified
          </span>
        );
      case 'Needs Attention':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Needs Attention
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Product Quality &amp; Customer Trust</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Product Reputation &amp; Ratings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor customer satisfaction ratings, return rates, defect feedback, and quality assurance badges across your catalog.
          </p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            Average Rating
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-500">
              {summary.averageRating}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">/ 5.0 ★</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Across {summary.totalReviews} verified reviews
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            Store Trust Score
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-indigo-600">
              {summary.averageScore}%
            </span>
            <span className="text-[11px] text-slate-400 font-medium">overall</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Quality &amp; satisfaction score
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            Avg Return Rate
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-600">
              {summary.averageReturnRate}%
            </span>
            <span className="text-[11px] text-slate-400 font-medium">returns</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
            🛡️ Low defect incidence
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            Top Rated Products
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">
              {summary.topRatedCount}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">items</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Rated 4.8+ with zero defects
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products, brands, or categories..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/50"
          />
        </div>

        {/* Badge Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {(['all', 'Top Rated', 'Customer Favorite', 'Quality Verified', 'Needs Attention'] as const).map((badge) => (
            <button
              key={badge}
              type="button"
              onClick={() => setBadgeFilter(badge)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                badgeFilter === badge
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {badge === 'all' ? 'All Products' : badge}
            </button>
          ))}
        </div>
      </div>

      {/* Products Reputation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((prod) => (
          <div
            key={prod.id}
            className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-4"
          >
            <div>
              {/* Card Top Header */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  {prod.imageThumbnail ? (
                    <img
                      src={prod.imageThumbnail}
                      alt=""
                      className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-500 font-bold text-sm">
                      {prod.productName.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate" title={prod.productName}>
                      {prod.productName}
                    </h3>
                    <p className="text-[11px] text-slate-500">{prod.category || 'General'}</p>
                  </div>
                </div>

                <div>
                  {getReputationBadge(prod.reputationBadge)}
                </div>
              </div>

              {/* Rating and Reputation Score Meters */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
                    Customer Rating
                  </span>
                  <div className="mt-0.5">
                    {renderStars(prod.reputationRating)}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
                    Trust Score
                  </span>
                  <span className="text-sm font-black text-indigo-600">
                    {prod.reputationScore || 95}/100
                  </span>
                </div>
              </div>

              {/* Defect / Return Rate & Reviews */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] bg-slate-50/80 p-2.5 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[10px]">Return / Defect Rate</span>
                  <span className="font-bold text-emerald-700">{prod.returnRate ?? 0.6}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Verified Feedback</span>
                  <span className="font-bold text-slate-700">{prod.reputationReviewsCount ?? 28} reviews</span>
                </div>
              </div>

              {/* Customer Feedback Summary Quote */}
              {prod.customerFeedbackSummary && (
                <div className="mt-3 flex items-start gap-2 text-xs text-slate-600 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/60">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="italic text-[11px] leading-relaxed">
                    &ldquo;{prod.customerFeedbackSummary}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Card Action */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Stock: <strong className="text-slate-700">{prod.stockQuantity} {prod.unit || 'pcs'}</strong>
              </span>

              <button
                type="button"
                onClick={() => handleOpenEdit(prod)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Edit className="w-3 h-3" />
                <span>Edit Rating</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Reputation Dialog Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Update Reputation &amp; Rating
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-semibold truncate">
              {editingProduct.productName}
            </p>

            <form onSubmit={handleSaveReputation} className="space-y-3.5 text-xs">
              {/* Star Rating Slider */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Customer Star Rating: <strong className="text-amber-500">{editRating.toFixed(1)} ★</strong>
                </label>
                <input
                  type="range"
                  min="1.0"
                  max="5.0"
                  step="0.1"
                  value={editRating}
                  onChange={(e) => setEditRating(parseFloat(e.target.value))}
                  className="w-full cursor-pointer accent-amber-500"
                />
              </div>

              {/* Score Slider */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Quality Trust Score: <strong className="text-indigo-600">{editScore}/100</strong>
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="1"
                  value={editScore}
                  onChange={(e) => setEditScore(parseInt(e.target.value, 10))}
                  className="w-full cursor-pointer accent-indigo-600"
                />
              </div>

              {/* Badge Selection */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Reputation Badge</label>
                <select
                  value={editBadge}
                  onChange={(e) => setEditBadge(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  <option value="Top Rated">Top Rated (★ 4.8+)</option>
                  <option value="Customer Favorite">Customer Favorite</option>
                  <option value="Quality Verified">Quality Verified</option>
                  <option value="Needs Attention">Needs Attention</option>
                </select>
              </div>

              {/* Return Rate */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Return / Defect Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={editReturnRate}
                  onChange={(e) => setEditReturnRate(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-semibold"
                />
              </div>

              {/* Customer Feedback Summary */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer Feedback / Quality Notes</label>
                <textarea
                  rows={2}
                  value={editFeedback}
                  onChange={(e) => setEditFeedback(e.target.value)}
                  placeholder="e.g., Very high customer repeat rate, fresh batches, zero defects."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
