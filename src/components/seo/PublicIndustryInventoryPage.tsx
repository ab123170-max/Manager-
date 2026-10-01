import React, { useEffect } from 'react';
import { ArrowRight, Boxes, CalendarClock, Camera, CheckCircle2 } from 'lucide-react';
import { updateDocumentSeo } from '../../utils/seoHelper';
import { PublicSeoNavbar } from './PublicSeoNavbar';
import { PublicSeoFooter } from './PublicSeoFooter';

type IndustryKey = 'grocery' | 'pharmacy' | 'restaurant' | 'hotel';

const pages: Record<IndustryKey, {
  title: string; h1: string; description: string; intro: string; workflow: string[];
  sections: { title: string; text: string }[]; path: string;
}> = {
  grocery: {
    title: 'Free Grocery Store Inventory Management | ScanMe AI',
    h1: 'Free AI Inventory Management for Grocery Stores',
    description: 'Manage grocery stock with AI product scanning, barcode and QR scanning, stock-in and stock-out records, and expiry-date tracking with ScanMe AI.',
    intro: 'Grocery stores handle many products with different pack sizes, prices, batches, and expiry dates. ScanMe AI helps turn product information into organized inventory records without making staff type every field manually.',
    workflow: ['Scan a product package with the camera', 'Review name, price, MFD, EXD and shelf-life data', 'Save stock and monitor low-stock or expiry alerts'],
    sections: [
      { title: 'Built for fast grocery receiving', text: 'Use camera-based product capture and barcode or QR scanning while receiving packaged food, beverages, household goods, and other retail items. Review the extracted information before saving it to inventory.' },
      { title: 'Expiry tracking for packaged goods', text: 'Keep manufacturing and expiry information with inventory records so staff can identify products approaching expiry and plan stock movement instead of relying only on paper notes.' },
      { title: 'Simple stock control', text: 'Track stock-in and stock-out activity, product counts, inventory value, and reports from a mobile-friendly interface designed for everyday store work.' }
    ], path: '/grocery-inventory-management'
  },
  pharmacy: {
    title: 'Free Pharmacy Inventory Management | ScanMe AI',
    h1: 'Free AI Inventory Management for Pharmacies & Medical Stores',
    description: 'Organize pharmacy and medical-store inventory with AI product scanning, barcode scanning, stock records, and expiry-date tracking using ScanMe AI.',
    intro: 'Pharmacies and medical stores need accurate product names, prices, batch dates, and expiry information. ScanMe AI provides a digital workflow for recording these details and monitoring stock.',
    workflow: ['Capture medicine or healthcare product packaging', 'Verify the extracted product and date fields', 'Save inventory and monitor stock and expiry status'],
    sections: [
      { title: 'Record medicine packaging information', text: 'Use AI-assisted image scanning and barcode or QR scanning to reduce repetitive data entry. Always review extracted information against the physical package before saving or acting on it.' },
      { title: 'Keep expiry information visible', text: 'Store MFD, EXD and best-before information with products so staff can identify inventory that needs attention. ScanMe AI is an inventory aid, not a substitute for professional medicine handling or regulatory requirements.' },
      { title: 'Mobile-first storekeeping', text: 'Use the inventory, stock movement, alerts, and reporting workflow from a phone or other supported device without requiring a dedicated barcode terminal.' }
    ], path: '/pharmacy-inventory-management'
  },
  restaurant: {
    title: 'Free Restaurant Inventory Management | ScanMe AI',
    h1: 'Free AI Inventory Management for Restaurants',
    description: 'Track restaurant ingredients and packaged stock with AI-assisted product scanning, stock movement records, inventory reports, and expiry tracking.',
    intro: 'Restaurants manage ingredients, packaged products, beverages, and supplies that move quickly. ScanMe AI helps teams record incoming stock, monitor quantities, and keep date information organized.',
    workflow: ['Scan or enter incoming products', 'Record stock-in and stock-out movements', 'Review low-stock, expiry, and inventory reports'],
    sections: [
      { title: 'Faster receiving and stock entry', text: 'Capture product information from packaging or use barcode and QR scanning where available. Staff can review the information before adding it to the store inventory.' },
      { title: 'Reduce avoidable expiry losses', text: 'Keep expiry dates attached to relevant inventory records and use expiry-focused views to identify products that need attention during routine stock checks.' },
      { title: 'Useful reports for daily operations', text: 'Review inventory counts, stock movements, valuation, and turnover information in one mobile-friendly workflow.' }
    ], path: '/restaurant-inventory-management'
  },
  hotel: {
    title: 'Free Hotel Inventory Management | ScanMe AI',
    h1: 'Free AI Inventory Management for Hotels',
    description: 'Organize hotel supplies and consumable inventory with AI product scanning, barcode and QR scanning, stock movement records, expiry tracking, and reports.',
    intro: 'Hotels manage food, beverages, housekeeping supplies, amenities, and other consumables across daily operations. ScanMe AI helps keep these stock records organized in one place.',
    workflow: ['Capture or scan incoming supplies', 'Save product, quantity and date information', 'Monitor stock movement, expiry status and reports'],
    sections: [
      { title: 'Inventory for hotel operations', text: 'Use a shared digital workflow for consumable products and supplies. Camera scanning and barcode or QR tools can reduce repetitive manual entry when receiving packaged items.' },
      { title: 'Monitor dated supplies', text: 'Store manufacture and expiry information for products where dates matter, helping teams include expiry checks in routine inventory work.' },
      { title: 'Keep stock movement organized', text: 'Use stock-in, stock-out, inventory, alerts, and reporting views to maintain a clearer picture of supplies used across hotel operations.' }
    ], path: '/hotel-inventory-management'
  }
};

export const PublicIndustryInventoryPage: React.FC<{ kind: IndustryKey; onNavigatePath: (path: string) => void; onLaunchApp: () => void; onLogin: () => void; }> = ({ kind, onNavigatePath, onLaunchApp, onLogin }) => {
  const page = pages[kind];
  useEffect(() => {
    updateDocumentSeo({
      title: page.title, description: page.description, canonicalUrl: `https://scanme-ai.vercel.app${page.path}`,
      ogTitle: page.title, ogDescription: page.description,
      schemaJson: { '@context': 'https://schema.org', '@type': 'WebPage', name: page.title, url: `https://scanme-ai.vercel.app${page.path}`, description: page.description,
        breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://scanme-ai.vercel.app/' },
          { '@type': 'ListItem', position: 2, name: page.h1, item: `https://scanme-ai.vercel.app${page.path}` }
        ] }
      }
    });
  }, [page]);
  return <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col">
    <PublicSeoNavbar onNavigatePath={onNavigatePath} onLaunchApp={onLaunchApp} onLogin={onLogin} currentPath={page.path} />
    <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full space-y-8">
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500"><a href="/" onClick={e => { e.preventDefault(); onNavigatePath('/'); }}>Home</a><span className="mx-2">/</span><span className="font-semibold text-slate-900">{page.h1}</span></nav>
      <header className="space-y-4">
        <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wide"><Boxes className="w-3.5 h-3.5" /> Free storekeeping workflow</p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">{page.h1}</h1>
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-3xl">{page.intro}</p>
        <button type="button" onClick={onLaunchApp} className="px-5 py-3 rounded-xl bg-[#1473EA] text-white text-sm font-bold shadow-md inline-flex items-center gap-2"><Camera className="w-4 h-4" />Start using ScanMe AI <ArrowRight className="w-4 h-4" /></button>
      </header>
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-5">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900">A practical workflow</h2>
        <div className="grid sm:grid-cols-3 gap-4">{page.workflow.map((item, i) => <div key={item} className="p-4 rounded-2xl bg-slate-50 border border-slate-100"><div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1473EA] flex items-center justify-center font-bold">{i + 1}</div><p className="mt-3 text-sm font-semibold text-slate-800">{item}</p></div>)}</div>
      </section>
      <section className="grid md:grid-cols-3 gap-4">{page.sections.map(section => <article key={section.title} className="bg-white rounded-3xl p-6 border border-slate-200"><CheckCircle2 className="w-5 h-5 text-[#1473EA]" /><h2 className="mt-3 font-black text-slate-900">{section.title}</h2><p className="mt-2 text-sm text-slate-600 leading-relaxed">{section.text}</p></article>)}</section>
      <section className="bg-[#092B4C] text-white rounded-3xl p-6 sm:p-8"><h2 className="text-xl font-black">Related ScanMe AI tools</h2><div className="mt-4 flex flex-wrap gap-3 text-sm"><a href="/ai-product-scanner" onClick={e => { e.preventDefault(); onNavigatePath('/ai-product-scanner'); }} className="underline">AI product scanner</a><a href="/barcode-scanner" onClick={e => { e.preventDefault(); onNavigatePath('/barcode-scanner'); }} className="underline">Barcode scanner</a><a href="/expiry-date-scanner" onClick={e => { e.preventDefault(); onNavigatePath('/expiry-date-scanner'); }} className="underline">Expiry date scanner</a><a href="/inventory-management" onClick={e => { e.preventDefault(); onNavigatePath('/inventory-management'); }} className="underline">Inventory management</a></div></section>
    </main>
    <PublicSeoFooter />
  </div>;
};
