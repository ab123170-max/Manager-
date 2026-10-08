/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Official Google AdSense Configuration & Route Guard Matrix for ScanMe AI
 * Publisher ID: ca-pub-1392773083498575
 * Ad Slot ID: 2379426298
 */
export const ADSENSE_CLIENT_ID = 'ca-pub-1392773083498575';
export const ADSENSE_SLOT_ID = '2379426298';

/**
 * EXPLICIT APPROVED PUBLIC CONTENT ROUTES
 *
 * According to Google AdSense Policy:
 * "Google-served ads on screens without publisher content are strictly prohibited."
 * Ads may ONLY be placed on pages whose primary purpose is delivering meaningful,
 * original publisher content (articles, educational guides, product documentation, FAQs).
 */
export const APPROVED_PUBLIC_CONTENT_ROUTES: string[] = [
  '/',
  '/features',
  '/how-it-works',
  '/for-grocery-stores',
  '/for-pharmacies',
  '/for-medical-stores',
  '/for-restaurants',
  '/for-hotels',
  '/inventory-management',
  '/expiry-management',
  '/barcode-scanning',
  '/ai-product-scanning',
  '/guides',
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms',
  '/cookie-policy',
  '/accessibility',
  '/faq',
  // Legacy alias paths mapped to rich content pages
  '/ai-product-scanner',
  '/barcode-scanner',
  '/expiry-date-scanner',
  '/grocery-inventory-management',
  '/pharmacy-inventory-management',
  '/restaurant-inventory-management',
  '/hotel-inventory-management',
];

/**
 * EXPLICIT BLOCKED APP & INTERACTION ROUTES
 *
 * Ads are NEVER displayed on these screens:
 * - Camera scanners & live preview
 * - Product detection, tracking, or crop screens
 * - Image processing and loading screens
 * - Login, signup, password recovery
 * - User dashboard & private data
 * - Inventory editing, stock-in, stock-out, ledger
 * - Empty states, error screens, modal dialogs
 * - Navigation-only screens
 */
export const BLOCKED_APP_ROUTES: string[] = [
  '/app',
  '/scan',
  '/scanner',
  '/dashboard',
  '/inventory',
  '/stock-in',
  '/stock-out',
  '/ledger',
  '/reports',
  '/analytics',
  '/accounting',
  '/categories',
  '/catalog',
  '/login',
  '/signup',
  '/forgot-password',
  '/profile',
  '/settings',
  '/sheets-sync',
  '/customer-messages',
  '/onboarding',
  '/adsense-audit', // Dev audit route has no ads
];

export interface RouteAuditEntry {
  route: string;
  type: 'Public Content' | 'App Functionality' | 'Development Audit';
  publisherContent: boolean;
  adSenseAllowed: boolean;
  description: string;
}

/**
 * Generates the live audit matrix for compliance verification.
 */
export function getRouteAuditMatrix(): RouteAuditEntry[] {
  const list: RouteAuditEntry[] = [
    {
      route: '/',
      type: 'Public Content',
      publisherContent: true,
      adSenseAllowed: true,
      description: 'Homepage explaining ScanMe AI value proposition, workflow, and local business benefits',
    },
    {
      route: '/features',
      type: 'Public Content',
      publisherContent: true,
      adSenseAllowed: true,
      description: 'Detailed technical and operational explanation of core scanning and inventory capabilities',
    },
    {
      route: '/how-it-works',
      type: 'Public Content',
      publisherContent: true,
      adSenseAllowed: true,
      description: 'Step-by-step 9-stage visual workflow from camera capture to stock ledger',
    },
    {
      route: '/for-grocery-stores',
      type: 'Public Content',
      publisherContent: true,
      adSenseAllowed: true,
      description: 'Kirana and grocery store stock organization, fast intake, and expiry waste reduction',
    },
    {
      route: '/for-pharmacies',
      type: 'Public Content',
      publisherContent: true,
      adSenseAllowed: true,
      description: 'Retail pharmacy inventory management with batch monitoring and compliance notices',
    },
    {
      route: '/for-medical-stores',
      type: 'Public Content',
      publisherContent: true,
      adSenseAllowed: true,
      description: 'Medical and surgical supply lot tracking and shelf-life monitoring',
    },
    {
      route: '/for-restaurants',
      type: 'Public Content',
      publisherContent: true,
      adSenseAllowed: true,
      description: 'Kitchen perishable ingredient turnover and food waste prevention',
    },
    {
      route: '/for-hotels',
      type: 'Public Content',
      publisherContent: true,
      adSenseAllowed: true,
      description: 'Hotel amenities, minibar replenishment, and housekeeping stock control',
    },
    {
      route: '/inventory-management',
      type: 'Public Content',
      publisherContent: true,
      adSenseAllowed: true,
      description: 'Educational guide to digital inventory, stock valuation, and ledger accounting',
    },
    {
      route: '/expiry-management',
      type: 'Public Content',
      publisherContent: true,
      adSenseAllowed: true,
      description: 'Educational guide on MFD, EXD, best-before dates, and proactive 30-day alerts',
    },
    {
      route: '/barcode-scanning',
      type: 'Public Content',
      publisherContent: true,
      adSenseAllowed: true,
      description: 'Educational guide on 1D/2D barcodes, QR codes, and hardware-free camera intake',
    },
    {
      route: '/ai-product-scanning',
      type: 'Public Content',
      publisherContent: true,
      adSenseAllowed: true,
      description: 'Deep technical overview of computer vision, real-time tracking, and multi-shot OCR',
    },
    {
      route: '/guides',
      type: 'Public Content',
      publisherContent: true,
      adSenseAllowed: true,
      description: 'Curated index of 10 original practical business and inventory management guides',
    },
    {
      route: '/about',
      type: 'Public Content',
      publisherContent: true,
      adSenseAllowed: true,
      description: 'Authentic information about ScanMe AI mission, architecture, and small business focus',
    },
    {
      route: '/contact',
      type: 'Public Content',
      publisherContent: true,
      adSenseAllowed: true,
      description: 'Official contact details, bug reports, feature requests, and support guidance',
    },
    {
      route: '/privacy-policy',
      type: 'Public Content',
      publisherContent: true,
      adSenseAllowed: true,
      description: 'Transparent privacy policy detailing local storage, camera processing, and data rights',
    },
    {
      route: '/terms',
      type: 'Public Content',
      publisherContent: true,
      adSenseAllowed: true,
      description: 'Official terms of service and acceptable usage standards',
    },
    {
      route: '/cookie-policy',
      type: 'Public Content',
      publisherContent: true,
      adSenseAllowed: true,
      description: 'Cookie policy covering browser storage, session state, and AdSense advertising cookies',
    },
    {
      route: '/accessibility',
      type: 'Public Content',
      publisherContent: true,
      adSenseAllowed: true,
      description: 'Accessibility statement outlining WCAG standards and keyboard navigation',
    },
    {
      route: '/faq',
      type: 'Public Content',
      publisherContent: true,
      adSenseAllowed: true,
      description: 'Frequently asked questions with comprehensive factual answers',
    },
    // Application Screens (Strictly BLOCKED)
    {
      route: '/app (Interactive Scanner)',
      type: 'App Functionality',
      publisherContent: false,
      adSenseAllowed: false,
      description: 'Live Camera preview, real-time object tracking box, and multi-shot intake controls',
    },
    {
      route: '/app (Stock Dashboard)',
      type: 'App Functionality',
      publisherContent: false,
      adSenseAllowed: false,
      description: 'Private user inventory dashboard, stock valuation metrics, and slider pages',
    },
    {
      route: '/app (Stock-In & Stock-Out)',
      type: 'App Functionality',
      publisherContent: false,
      adSenseAllowed: false,
      description: 'Interactive stock transaction forms, quantity entry, and POS register',
    },
    {
      route: '/app (Inventory Reports)',
      type: 'App Functionality',
      publisherContent: false,
      adSenseAllowed: false,
      description: 'Private financial inventory reports and turnover statistics',
    },
    {
      route: '/app (Authentication & Settings)',
      type: 'App Functionality',
      publisherContent: false,
      adSenseAllowed: false,
      description: 'User login, profile setup, account settings, and Google Sheets sync modals',
    },
  ];

  return list;
}

/**
 * Checks if AdSense is permitted on the given path.
 *
 * DEFAULT BEHAVIOR: ADS STRICTLY DISABLED.
 * Returns true ONLY if path is an approved public content page.
 */
export function isAdSenseAllowedOnPath(pathname: string): boolean {
  if (!pathname) return false;

  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, '') : '/';

  // Specific check for individual guide articles under /guides/*
  if (normalized.startsWith('/guides/')) {
    return true;
  }

  return APPROVED_PUBLIC_CONTENT_ROUTES.includes(normalized);
}
