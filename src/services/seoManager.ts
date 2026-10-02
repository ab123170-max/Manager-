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
    title: 'Free AI Inventory Management & Product Scanner | ScanMe AI',
    description:
      'ScanMe AI is a free AI inventory management and product scanning tool for grocery stores, pharmacies, medical stores, restaurants, hotels, and other businesses.',
    path: '/',
    keywords: BASE_KEYWORDS,
  },
  '/ai-product-scanner': {
    title: 'AI Product Scanner | Scan Product Information with AI | ScanMe AI',
    description:
      'Use ScanMe AI to scan product labels and extract product name, price, MFD, EXD and best-before information for faster inventory entry.',
    path: '/ai-product-scanner',
    keywords: 'AI product scanner, product information scanner, AI OCR inventory',
  },
  '/barcode-scanner': {
    title: 'Free Barcode & QR Code Scanner for Inventory | ScanMe AI',
    description:
      'Scan barcodes and QR codes with ScanMe AI and connect product identification with your inventory workflow.',
    path: '/barcode-scanner',
    keywords: 'barcode scanner, QR scanner, inventory barcode scanner',
  },
  '/expiry-date-scanner': {
    title: 'Expiry Date Scanner & Tracker for Stores | ScanMe AI',
    description:
      'Scan and track manufacturing dates, expiry dates and best-before information to help manage time-sensitive inventory.',
    path: '/expiry-date-scanner',
    keywords: 'expiry date scanner, expiry tracker, product expiry management',
  },
  '/inventory-management': {
    title: 'Free AI Inventory Management Software | ScanMe AI',
    description:
      'Manage products, stock information and expiry dates with a free AI-powered inventory management tool.',
    path: '/inventory-management',
    keywords: 'free inventory management, AI stock management, inventory software',
  },
  '/grocery-inventory-management': {
    title: 'Grocery Inventory Management Software | ScanMe AI',
    description:
      'AI-powered inventory management for grocery stores with product scanning, stock records and expiry tracking.',
    path: '/grocery-inventory-management',
    keywords: 'grocery inventory management, grocery stock management',
  },
  '/pharmacy-inventory-management': {
    title: 'Pharmacy & Medical Store Inventory Management | ScanMe AI',
    description:
      'Manage pharmacy and medical store products with AI scanning, product information capture and expiry tracking.',
    path: '/pharmacy-inventory-management',
    keywords: 'pharmacy inventory management, medical store inventory',
  },
  '/restaurant-inventory-management': {
    title: 'Restaurant Inventory Management Software | ScanMe AI',
    description:
      'Track restaurant product inventory and expiry information with an AI-powered inventory management workflow.',
    path: '/restaurant-inventory-management',
    keywords: 'restaurant inventory management, restaurant stock management',
  },
  '/hotel-inventory-management': {
    title: 'Hotel Inventory Management Software | ScanMe AI',
    description:
      'Organize hotel inventory with AI-assisted product scanning, stock records and expiry-date tracking.',
    path: '/hotel-inventory-management',
    keywords: 'hotel inventory management, hotel stock management',
  },
  '/faq': {
    title: 'ScanMe AI FAQ | AI Scanner & Inventory Management',
    description:
      'Find answers about ScanMe AI product scanning, barcodes, QR codes, inventory management and expiry-date tracking.',
    path: '/faq',
    keywords: 'ScanMe AI FAQ, inventory scanner questions',
    type: 'FAQPage',
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
