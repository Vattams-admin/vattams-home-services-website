import { useEffect } from 'react';

const BASE_URL = 'https://vattams.net';
const DEFAULT_IMAGE = `${BASE_URL}/icons/icon-512.png`;

export interface SEOConfig {
  /** Document <title> and og:title/twitter:title. */
  title: string;
  /** Meta description and og:description/twitter:description. */
  description: string;
  /** Optional meta keywords (comma-separated). Used sparingly. */
  keywords?: string;
  /**
   * Canonical path relative to the site, e.g. '/#city-chennai' or
   * '/#city-chennai'. Combined with BASE_URL to form the full canonical
   * and og:url. Defaults to the current hash location if omitted.
   */
  path?: string;
  /** Absolute image URL for social sharing. Defaults to the VATTAMS logo icon. */
  image?: string;
  /** og:type — defaults to 'website'. */
  type?: string;
}

/**
 * Injects/updates per-page <title>, meta description/keywords, canonical
 * link, and Open Graph/Twitter tags for the lifetime of the mounted page,
 * then removes them on unmount so the next page (or the static index.html
 * defaults) takes over cleanly.
 *
 * Mirrors the existing tag-injection pattern already used for city landing
 * pages, generalized for reuse across Home Services and Home Services
 * pages. Uses a shared `data-seo` attribute namespace distinct from
 * `data-city` so both can coexist without conflicting.
 */
export function useSEO(config: SEOConfig) {
  useEffect(() => {
    const url = `${BASE_URL}${config.path ?? `/${window.location.hash || ''}`}`;
    const image = config.image ?? DEFAULT_IMAGE;
    const type = config.type ?? 'website';

    const tags: { name?: string; property?: string; content: string; key: string }[] = [
      { name: 'description', content: config.description, key: 'meta-desc' },
      { property: 'og:title', content: config.title, key: 'og-title' },
      { property: 'og:description', content: config.description, key: 'og-desc' },
      { property: 'og:type', content: type, key: 'og-type' },
      { property: 'og:url', content: url, key: 'og-url' },
      { property: 'og:image', content: image, key: 'og-image' },
      { name: 'twitter:card', content: 'summary_large_image', key: 'tw-card' },
      { name: 'twitter:title', content: config.title, key: 'tw-title' },
      { name: 'twitter:description', content: config.description, key: 'tw-desc' },
      { name: 'twitter:image', content: image, key: 'tw-image' },
    ];

    if (config.keywords) {
      tags.push({ name: 'keywords', content: config.keywords, key: 'meta-keywords' });
    }

    tags.forEach((t) => {
      let el = document.head.querySelector(`meta[data-seo="${t.key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('data-seo', t.key);
        document.head.appendChild(el);
      }
      if (t.name) el.setAttribute('name', t.name);
      if (t.property) el.setAttribute('property', t.property);
      el.setAttribute('content', t.content);
    });

    const prevTitle = document.title;
    document.title = config.title;

    let canonicalEl = document.head.querySelector('link[data-seo="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('data-seo', 'canonical');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', url);

    return () => {
      document.head.querySelectorAll('[data-seo]').forEach((el) => el.remove());
      document.title = prevTitle;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.title, config.description, config.keywords, config.path, config.image, config.type]);
}

/** Simple BreadcrumbList JSON-LD builder shared across pages. */
export function buildBreadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${BASE_URL}${item.path}`,
    })),
  };
}