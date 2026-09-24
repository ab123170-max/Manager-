/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PageSeoConfig {
  title: string;
  description: string;
  canonicalUrl?: string;
  robots?: 'index, follow' | 'noindex, nofollow';
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  schemaJson?: object | object[];
}

const DEFAULT_CANONICAL = 'https://scanme-ai.vercel.app/';
const DEFAULT_OG_IMAGE = 'https://scanme-ai.vercel.app/og-image.png';

/**
 * Updates head metadata dynamically based on current route/mode.
 * Safe for client-side navigation without full page reloads.
 */
export function updateDocumentSeo(config: PageSeoConfig): void {
  if (typeof document === 'undefined') return;

  // 1. Page Title
  document.title = config.title;

  // 2. Meta Description
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute('content', config.description);

  // 3. Robots
  const robotsSetting =
    config.robots || 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  let metaRobots = document.querySelector('meta[name="robots"]');
  if (!metaRobots) {
    metaRobots = document.createElement('meta');
    metaRobots.setAttribute('name', 'robots');
    document.head.appendChild(metaRobots);
  }
  metaRobots.setAttribute('content', robotsSetting);

  // 4. Canonical URL
  const canonicalUrl = config.canonicalUrl || DEFAULT_CANONICAL;
  let linkCanonical = document.querySelector('link[rel="canonical"]');
  if (!linkCanonical) {
    linkCanonical = document.createElement('link');
    linkCanonical.setAttribute('rel', 'canonical');
    document.head.appendChild(linkCanonical);
  }
  linkCanonical.setAttribute('href', canonicalUrl);

  // 5. Open Graph tags
  const setMetaProperty = (property: string, content: string) => {
    let el = document.querySelector(`meta[property="${property}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', property);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  setMetaProperty('og:title', config.ogTitle || config.title);
  setMetaProperty('og:description', config.ogDescription || config.description);
  setMetaProperty('og:url', canonicalUrl);
  setMetaProperty('og:type', config.ogType || 'website');
  setMetaProperty('og:image', config.ogImage || DEFAULT_OG_IMAGE);

  // 6. Twitter Card tags
  const setMetaName = (name: string, content: string) => {
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  setMetaName('twitter:title', config.twitterTitle || config.ogTitle || config.title);
  setMetaName('twitter:description', config.twitterDescription || config.ogDescription || config.description);
  setMetaName('twitter:image', config.twitterImage || config.ogImage || DEFAULT_OG_IMAGE);

  // 7. Schema.org JSON-LD structured data
  if (config.schemaJson) {
    let scriptTag = document.getElementById('dynamic-page-schema') as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'dynamic-page-schema';
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(config.schemaJson);
  }
}

/**
 * Sets private page noindex robots tag for authenticated/protected views
 */
export function setPrivatePageSeo(pageName = 'Dashboard'): void {
  updateDocumentSeo({
    title: `${pageName} | ScanMe AI`,
    description: 'ScanMe AI private user workspace and inventory management.',
    robots: 'noindex, nofollow',
  });
}
