const SITE_URL = 'https://scanme-ai.vercel.app';

type SeoConfig = {
  title: string;
  description: string;
  path: string;
  keywords?: string;
  type?: 'WebSite' | 'WebPage' | 'SoftwareApplication' | 'FAQPage';
};

const BASE_KEYWORDS =
  'AI inventory management, AI product scanner, barcode scanner, expiry date tracker, stock management, grocery inventory, pharmacy inventory, restaurant inventory, hotel inventory';

const pages: Record<string, SeoConfig> = {
  '/': {
    title: 'ScanMe AI – AI Inventory Management & Product Scanner for Small Business',
    description:
      'Scan products, track inventory, and never miss an expiry date. Free AI camera scanner, barcode reader, and stock ledger for grocery stores, pharmacies, and small retailers.',
    path: '/',
    keywords: BASE_KEYWORDS,
    type: 'SoftwareApplication',
  },
  '/features': {
    title: 'ScanMe AI Features – AI Scanner, Barcode Reader & Stock Ledger',
    description:
      'Explore ScanMe AI features: AI packaging recognition, multi-shot OCR, real-time object tracking, 1D/2D barcode reader, 30-day expiry radar, and Google Sheets sync.',
    path: '/features',
    keywords: 'AI product scanner features, barcode scanner, expiry tracking features, retail inventory features',
    type: 'WebPage',
  },
  '/how-it-works': {
    title: 'How ScanMe AI Works – 9-Step Camera to Stock Workflow',
    description:
      'Discover the 9 simple steps of ScanMe AI: from pointing your camera at packaging, real-time object tracking, and smart cropping to AI extraction and expiry radar.',
    path: '/how-it-works',
    keywords: 'how AI product scanning works, camera inventory scanner guide, product tracking workflow',
    type: 'WebPage',
  },
  '/for-grocery-stores': {
    title: 'ScanMe AI for Grocery & Kirana Stores – Inventory & Expiry Control',
    description:
      'Eliminate expired food waste, automate stock intake, and track FMCG packaged goods with ScanMe AI. Built for grocery shops, Kirana stores, and local supermarkets.',
    path: '/for-grocery-stores',
    keywords: 'grocery inventory management, Kirana store inventory, grocery expiry tracker, FMCG scanner',
    type: 'WebPage',
  },
  '/for-pharmacies': {
    title: 'ScanMe AI for Retail Pharmacies – Medicine Batch & Expiry Tracker',
    description:
      'Track medicine batches, monitor drug shelf lives, and streamline distributor returns with ScanMe AI. Built for retail chemists, dispensaries, and community pharmacies.',
    path: '/for-pharmacies',
    keywords: 'pharmacy inventory management, medicine expiry tracker, chemist batch tracker, FEFO dispensing',
    type: 'WebPage',
  },
  '/for-medical-stores': {
    title: 'ScanMe AI for Medical Supply Stores – Surgical Goods & Lot Tracking',
    description:
      'Manage sterile surgical supplies, diagnostic consumables, and medical equipment shelf lives with ScanMe AI. Barcode and camera tracking for healthcare supply retailers.',
    path: '/for-medical-stores',
    keywords: 'medical store inventory, surgical consumable expiry, lot tracking medical devices',
    type: 'WebPage',
  },
  '/for-restaurants': {
    title: 'ScanMe AI for Restaurants & Cafes – Kitchen Ingredient & Expiry Control',
    description:
      'Cut kitchen food waste, track perishable dairy and pantry supplies, and manage restaurant ingredient stock-in with ScanMe AI. Free for cafes and commercial kitchens.',
    path: '/for-restaurants',
    keywords: 'restaurant inventory management, kitchen food waste prevention, chef pantry stock',
    type: 'WebPage',
  },
  '/for-hotels': {
    title: 'ScanMe AI for Hotels & Lodges – Amenities & Minibar Inventory',
    description:
      'Track housekeeping amenities, minibar beverages, and hotel guest supplies with ScanMe AI. Mobile stock scanning for boutique hotels, resorts, and lodges.',
    path: '/for-hotels',
    keywords: 'hotel inventory management, minibar expiry tracker, housekeeping supply stock',
    type: 'WebPage',
  },
  '/inventory-management': {
    title: 'Digital Inventory Management for Small Retailers | ScanMe AI',
    description:
      'Master inventory control without expensive hardware. Learn stock-in and stock-out ledger tracking, valuation calculations, low-stock reordering, and Google Sheets sync.',
    path: '/inventory-management',
    keywords: 'free inventory management, digital stock ledger, retail inventory software, small business stock control',
    type: 'WebPage',
  },
  '/expiry-management': {
    title: 'Retail Expiry Management Guide – MFD, EXD & Shelf-Life | ScanMe AI',
    description:
      'Comprehensive guide to retail expiry date tracking: MFD vs EXD vs Best-Before, First-Expired First-Out (FEFO) shelf rotation, 30-day radar warnings, and food waste reduction.',
    path: '/expiry-management',
    keywords: 'expiry management, MFD vs EXD, best before date difference, 30 day expiry alert, FEFO restocking',
    type: 'WebPage',
  },
  '/barcode-scanning': {
    title: 'Free Barcode & QR Code Scanner for Retail Inventory | ScanMe AI',
    description:
      'Transform your phone into a high-speed barcode reader. Scan EAN-13, UPC-A, Code 128, and QR codes directly in your browser. No expensive handheld scanner guns needed.',
    path: '/barcode-scanning',
    keywords: 'barcode scanner, QR scanner, free inventory barcode reader, EAN-13 UPC reader',
    type: 'WebPage',
  },
  '/ai-product-scanning': {
    title: 'AI Product Scanner – Multimodal Packaging Vision & OCR | ScanMe AI',
    description:
      'Discover how AI product scanning works: real-time bounding box tracking, smart cropping, multi-shot synthesis, and multimodal OCR extracting brand names, prices, MFD, and EXP.',
    path: '/ai-product-scanning',
    keywords: 'AI product scanner, computer vision packaging, retail OCR, product date reader',
    type: 'WebPage',
  },
  '/guides': {
    title: 'Retail & Inventory Guides for Small Businesses | ScanMe AI',
    description:
      '10 practical, comprehensive guides on retail expiry date management, pharmacy stock organization, barcode scanning, FEFO stocking, and inventory modernization.',
    path: '/guides',
    keywords: 'retail guides, small shop inventory guides, pharmacy stock management handbook',
    type: 'WebPage',
  },
  '/about': {
    title: 'About ScanMe AI – Smart Retail & Inventory Management',
    description:
      'Learn about ScanMe AI: our mission to empower independent retailers with accessible computer vision, eliminate expired stock losses, and protect business privacy.',
    path: '/about',
    keywords: 'about ScanMe AI, retail mission, privacy conscious inventory software',
    type: 'WebPage',
  },
  '/contact': {
    title: 'Contact & Support | ScanMe AI Retail Assistant',
    description:
      'Get in touch with the ScanMe AI team for product support, bug reports, feature suggestions, or business inquiries. Official contact information and feedback form.',
    path: '/contact',
    keywords: 'contact ScanMe AI, customer support, retail scanner bug report',
    type: 'WebPage',
  },
  '/privacy-policy': {
    title: 'Privacy Policy | ScanMe AI Retail Assistant',
    description:
      'Official Privacy Policy for ScanMe AI: transparent details on camera stream processing, on-device local storage, authentication, and zero third-party sale of user data.',
    path: '/privacy-policy',
    keywords: 'privacy policy, camera data privacy, inventory data protection',
    type: 'WebPage',
  },
  '/terms': {
    title: 'Terms of Service | ScanMe AI Retail Assistant',
    description:
      'Official Terms of Service for ScanMe AI: user responsibilities, optical recognition accuracy limitations, inventory tool disclaimers, and acceptable use.',
    path: '/terms',
    keywords: 'terms of service, user agreement, inventory disclaimer',
    type: 'WebPage',
  },
  '/cookie-policy': {
    title: 'Cookie Policy | ScanMe AI Retail Assistant',
    description:
      'Official Cookie Policy for ScanMe AI: details on local storage, session cookies, analytics, and Google AdSense advertising cookies.',
    path: '/cookie-policy',
    keywords: 'cookie policy, local storage usage, advertising cookies',
    type: 'WebPage',
  },
  '/accessibility': {
    title: 'Accessibility Statement | ScanMe AI Retail Assistant',
    description:
      'Official Accessibility Statement for ScanMe AI: our commitment to WCAG 2.1 standards, keyboard navigation, color contrast, and screen reader accessibility.',
    path: '/accessibility',
    keywords: 'accessibility statement, WCAG compliance, keyboard accessible scanner',
    type: 'WebPage',
  },
  '/faq': {
    title: 'ScanMe AI Frequently Asked Questions (FAQ) | Retail Scanner',
    description:
      'Find accurate answers to common questions about ScanMe AI: camera scanning, barcode reader, medicine expiry tracking, offline storage, and supported businesses.',
    path: '/faq',
    keywords: 'ScanMe AI FAQ, inventory scanner questions, expiry tracking help',
    type: 'FAQPage',
  },
  // Legacy paths
  '/ai-product-scanner': {
    title: 'AI Product Scanner – Multimodal Packaging Vision & OCR | ScanMe AI',
    description:
      'Scan product labels and extract product name, price, MFD, EXD and best-before information for faster inventory entry.',
    path: '/ai-product-scanner',
    keywords: 'AI product scanner, product information scanner, AI OCR inventory',
    type: 'WebPage',
  },
  '/barcode-scanner': {
    title: 'Free Barcode & QR Code Scanner for Retail Inventory | ScanMe AI',
    description:
      'Scan barcodes and QR codes with ScanMe AI and connect product identification with your inventory workflow.',
    path: '/barcode-scanner',
    keywords: 'barcode scanner, QR scanner, inventory barcode scanner',
    type: 'WebPage',
  },
  '/expiry-date-scanner': {
    title: 'Expiry Date Scanner & Tracker for Stores | ScanMe AI',
    description:
      'Scan and track manufacturing dates, expiry dates and best-before information to help manage time-sensitive inventory.',
    path: '/expiry-date-scanner',
    keywords: 'expiry date scanner, expiry tracker, product expiry management',
    type: 'WebPage',
  },
  '/grocery-inventory-management': {
    title: 'Grocery Inventory Management Software | ScanMe AI',
    description:
      'AI-powered inventory management for grocery stores with product scanning, stock records and expiry tracking.',
    path: '/grocery-inventory-management',
    keywords: 'grocery inventory management, grocery stock management',
    type: 'WebPage',
  },
  '/pharmacy-inventory-management': {
    title: 'Pharmacy & Medical Store Inventory Management | ScanMe AI',
    description:
      'Manage pharmacy and medical store products with AI scanning, product information capture and expiry tracking.',
    path: '/pharmacy-inventory-management',
    keywords: 'pharmacy inventory management, medical store inventory',
    type: 'WebPage',
  },
  '/restaurant-inventory-management': {
    title: 'Restaurant Inventory Management Software | ScanMe AI',
    description:
      'Track restaurant product inventory and expiry information with an AI-powered inventory management workflow.',
    path: '/restaurant-inventory-management',
    keywords: 'restaurant inventory management, restaurant stock management',
    type: 'WebPage',
  },
  '/hotel-inventory-management': {
    title: 'Hotel Inventory Management Software | ScanMe AI',
    description:
      'Organize hotel inventory with AI-assisted product scanning, stock records and expiry-date tracking.',
    path: '/hotel-inventory-management',
    keywords: 'hotel inventory management, hotel stock management',
    type: 'WebPage',
  },
};

function upsertMeta(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertProperty(property: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertSchema(id: string, data: Record<string, unknown>) {
  let el = document.head.querySelector<HTMLScriptElement>(`script[data-scanme-schema="${id}"]`);
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-scanme-schema', id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function applySeoForPath(pathname = window.location.pathname) {
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, '') : '/';
  const config = pages[normalized] ?? pages['/'];
  const canonical = `${SITE_URL}${config.path === '/' ? '/' : config.path}`;

  document.title = config.title;
  document.documentElement.lang = 'en';

  upsertMeta('description', config.description);
  upsertMeta('keywords', config.keywords ?? BASE_KEYWORDS);
  upsertMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');

  upsertProperty('og:title', config.title);
  upsertProperty('og:description', config.description);
  upsertProperty('og:url', canonical);
  upsertProperty('og:type', 'website');
  upsertProperty('og:site_name', 'ScanMe AI');

  upsertMeta('twitter:title', config.title);
  upsertMeta('twitter:description', config.description);
  upsertMeta('twitter:card', 'summary_large_image');

  upsertLink('canonical', canonical);

  upsertSchema('page', {
    '@context': 'https://schema.org',
    '@type': config.type === 'SoftwareApplication' ? ['WebApplication', 'SoftwareApplication'] : config.type,
    name: config.title,
    description: config.description,
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: 'ScanMe AI', url: SITE_URL },
  });
}

export function startSeoManager() {
  applySeoForPath();

  let previous = window.location.href;
  const check = () => {
    if (window.location.href !== previous) {
      previous = window.location.href;
      applySeoForPath();
    }
  };

  window.addEventListener('popstate', check);
  window.addEventListener('hashchange', check);

  const timer = window.setInterval(check, 500);
  return () => {
    window.removeEventListener('popstate', check);
    window.removeEventListener('hashchange', check);
    window.clearInterval(timer);
  };
}
