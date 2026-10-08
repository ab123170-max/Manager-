/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  Search,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { GUIDES_ARTICLES } from '../../../data/guidesData';
import { AdSenseSlot } from '../../ads/AdSenseSlot';

interface PublicGuidesIndexPageProps {
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicGuidesIndexPage: React.FC<PublicGuidesIndexPageProps> = ({
  onNavigatePath,
  onLaunchApp,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    updateDocumentSeo({
      title: 'Retail & Inventory Guides for Small Businesses | ScanMe AI',
      description:
        '10 practical, comprehensive guides on retail expiry date management, pharmacy stock organization, barcode scanning, FEFO stocking, and inventory modernization.',
      canonicalUrl: 'https://scanme-ai.vercel.app/guides',
      ogTitle: 'Retail & Inventory Guides for Small Businesses',
      ogDescription:
        'Original, practical guides on retail stock control, expiry date science, FEFO shelving, and computer vision camera scanning for small store owners.',
    });
  }, []);

  const categories = [
    'All',
    'Expiry Management',
    'Inventory Control',
    'Scanning Technology',
    'Retail Best Practices',
  ];

  const filteredGuides = GUIDES_ARTICLES.filter((article) => {
    const matchesCategory =
      selectedCategory === 'All' || article.category === selectedCategory;
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.shortSummary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    onNavigatePath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath="/guides"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-black">
            <BookOpen className="w-3.5 h-3.5" />
            <span>ORIGINAL RETAIL KNOWLEDGE BASE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#092B4C] tracking-tight">
            Practical Guides for Small Business Inventory Management
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Written specifically for neighborhood shopkeepers, retail pharmacists, grocers, and restaurant managers. No abstract corporate theory—just actionable steps to eliminate waste and run tighter operations.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#1473EA] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search guides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1473EA]"
            />
          </div>
        </div>

        {/* Guide Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredGuides.map((guide, idx) => (
            <article
              key={guide.slug}
              className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-6 hover:border-[#1473EA] hover:shadow-md transition-all group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                    {guide.category}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{guide.readTime}</span>
                  </div>
                </div>

                <h2 className="text-lg font-black text-[#092B4C] tracking-tight group-hover:text-[#1473EA] transition-colors">
                  <a
                    href={`/guides/${guide.slug}`}
                    onClick={(e) => handleLink(e, `/guides/${guide.slug}`)}
                  >
                    {guide.title}
                  </a>
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {guide.shortSummary}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold">
                  {guide.publishedDate}
                </span>

                <a
                  href={`/guides/${guide.slug}`}
                  onClick={(e) => handleLink(e, `/guides/${guide.slug}`)}
                  className="text-xs font-bold text-[#1473EA] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                >
                  <span>Read Article</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </article>
          ))}
        </div>

        {/* Safe Ad Placement between Content Sections */}
        <div className="pt-4">
          <AdSenseSlot currentPath="/guides" />
        </div>
      </main>

      <PublicFooter
        currentPath="/guides"
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
