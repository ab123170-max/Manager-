/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  BookOpen,
  Clock,
  Calendar,
  User,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Camera,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { updateDocumentSeo } from '../../../utils/seoHelper';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { GUIDES_ARTICLES, GuideArticle } from '../../../data/guidesData';
import { AdSenseSlot } from '../../ads/AdSenseSlot';

interface PublicGuideDetailPageProps {
  slug: string;
  onNavigatePath: (path: string) => void;
  onLaunchApp: () => void;
}

export const PublicGuideDetailPage: React.FC<PublicGuideDetailPageProps> = ({
  slug,
  onNavigatePath,
  onLaunchApp,
}) => {
  const article: GuideArticle =
    GUIDES_ARTICLES.find((a) => a.slug === slug) || GUIDES_ARTICLES[0];

  useEffect(() => {
    updateDocumentSeo({
      title: `${article.title} | ScanMe AI Guide`,
      description: article.shortSummary,
      canonicalUrl: `https://scanme-ai.vercel.app/guides/${article.slug}`,
      ogTitle: `${article.title} | ScanMe AI`,
      ogDescription: article.shortSummary,
      ogType: 'article',
      schemaJson: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description: article.shortSummary,
        author: {
          '@type': 'Organization',
          name: article.author,
          url: 'https://scanme-ai.vercel.app/',
        },
        publisher: {
          '@type': 'Organization',
          name: 'ScanMe AI',
          url: 'https://scanme-ai.vercel.app/',
        },
        datePublished: '2026-10-01',
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `https://scanme-ai.vercel.app/guides/${article.slug}`,
        },
      },
    });
  }, [article]);

  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    onNavigatePath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const otherGuides = GUIDES_ARTICLES.filter((g) => g.slug !== article.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans flex flex-col">
      <PublicNavbar
        currentPath={`/guides/${article.slug}`}
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 space-y-10">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <a href="/" onClick={(e) => handleLink(e, '/')} className="hover:text-[#1473EA] transition-colors">
            Home
          </a>
          <ChevronRight className="w-3.5 h-3.5" />
          <a href="/guides" onClick={(e) => handleLink(e, '/guides')} className="hover:text-[#1473EA] transition-colors">
            Guides
          </a>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-600 truncate max-w-xs">{article.title}</span>
        </nav>

        {/* Article Header */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
              {article.category}
            </span>
            <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>{article.readTime}</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              <span>Published {article.publishedDate}</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#092B4C] tracking-tight leading-tight">
            {article.title}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium pt-1">
            {article.shortSummary}
          </p>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80 text-xs text-slate-500">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Author: <strong className="text-slate-700">{article.author}</strong></span>
          </div>
        </header>

        {/* Safe Non-Intrusive AdSense Slot within editorial flow */}
        <AdSenseSlot currentPath={`/guides/${article.slug}`} />

        {/* Article Body Content */}
        <article className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-10 shadow-sm space-y-8">
          {article.sections.map((section, idx) => (
            <div key={idx} className="space-y-3">
              <h2 className="text-lg sm:text-xl font-black text-[#092B4C] tracking-tight">
                {section.heading}
              </h2>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                {section.content.map((p, pIdx) => (
                  <p key={pIdx}>{p}</p>
                ))}
              </div>

              {section.callout && (
                <div className="my-4 p-5 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs sm:text-sm text-slate-700 space-y-1">
                  <div className="font-bold text-[#1473EA] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>{section.callout.title}</span>
                  </div>
                  <p className="leading-relaxed">{section.callout.text}</p>
                </div>
              )}
            </div>
          ))}

          {/* Actionable Practical Checklist */}
          {article.practicalChecklist && (
            <div className="mt-8 p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h3 className="font-bold text-sm text-[#092B4C] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Actionable Store Checklist</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
                {article.practicalChecklist.map((item, cIdx) => (
                  <li key={cIdx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Article Conclusion */}
          <div className="pt-6 border-t border-slate-100 space-y-2">
            <h3 className="font-bold text-base text-[#092B4C]">Conclusion &amp; Next Steps</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {article.conclusion}
            </p>
          </div>

          {/* Related ScanMe Feature Callout Banner */}
          <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-[#1473EA] tracking-wider">
                Related ScanMe AI Capability
              </span>
              <div className="text-sm font-bold text-[#092B4C]">
                {article.relatedFeatureName}
              </div>
              <p className="text-xs text-slate-500">
                Implement the steps from this guide directly in your store today.
              </p>
            </div>

            <button
              type="button"
              onClick={onLaunchApp}
              className="px-5 py-2.5 rounded-xl bg-[#1473EA] hover:bg-blue-600 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Try This in ScanMe Free</span>
            </button>
          </div>
        </article>

        {/* Read More Guides */}
        <section className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-[#092B4C]">
              More Retail &amp; Inventory Guides
            </h3>
            <a
              href="/guides"
              onClick={(e) => handleLink(e, '/guides')}
              className="text-xs font-bold text-[#1473EA] hover:underline"
            >
              View All 10 Articles →
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {otherGuides.map((other) => (
              <a
                key={other.slug}
                href={`/guides/${other.slug}`}
                onClick={(e) => handleLink(e, `/guides/${other.slug}`)}
                className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-[#1473EA] transition-all space-y-2 block"
              >
                <span className="text-[9px] font-bold uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                  {other.category}
                </span>
                <h4 className="text-xs font-bold text-[#092B4C] line-clamp-2">
                  {other.title}
                </h4>
                <div className="text-[11px] text-[#1473EA] font-semibold flex items-center gap-1 pt-1">
                  <span>Read Article</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>

      <PublicFooter
        currentPath={`/guides/${article.slug}`}
        onNavigatePath={onNavigatePath}
        onLaunchApp={onLaunchApp}
      />
    </div>
  );
};
