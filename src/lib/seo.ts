import { useEffect } from 'react';

const BASE_URL = 'https://vattams.net';
const DEFAULT_IMAGE = `${BASE_URL}/icons/icon-512.png`;

export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string;
  path?: string;
  image?: string;
  type?: string;
}

/**
 * Updates the existing document metadata instead of adding duplicate title,
 * description, Open Graph or canonical tags. Original static metadata is
 * restored when the route unmounts.
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
    if (config.keywords) tags.push({ name: 'keywords', content: config.keywords, key: 'meta-keywords' });

    const changed: Array<{
      element: HTMLMetaElement;
      created: boolean;
      content: string | null;
      name: string | null;
      property: string | null;
      dataSeo: string | null;
    }> = [];

    tags.forEach((tag) => {
      let element = document.head.querySelector(`meta[data-seo="${tag.key}"]`) as HTMLMetaElement | null;
      let created = false;
      if (!element) {
        const selector = tag.name
          ? `meta[name="${tag.name}"]`
          : `meta[property="${tag.property}"]`;
        element = document.head.querySelector(selector) as HTMLMetaElement | null;
      }
      if (!element) {
        element = document.createElement('meta');
        created = true;
        document.head.appendChild(element);
      }

      changed.push({
        element,
        created,
        content: element.getAttribute('content'),
        name: element.getAttribute('name'),
        property: element.getAttribute('property'),
        dataSeo: element.getAttribute('data-seo'),
      });
      element.setAttribute('data-seo', tag.key);
      if (tag.name) element.setAttribute('name', tag.name);
      if (tag.property) element.setAttribute('property', tag.property);
      element.setAttribute('content', tag.content);
    });

    const prevTitle = document.title;
    document.title = config.title;

    let canonical = document.head.querySelector('link[data-seo="canonical"]') as HTMLLinkElement | null;
    let canonicalCreated = false;
    if (!canonical) canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
      canonicalCreated = true;
    }
    const previousCanonicalHref = canonical.getAttribute('href');
    const previousCanonicalDataSeo = canonical.getAttribute('data-seo');
    canonical.setAttribute('data-seo', 'canonical');
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', url);

    return () => {
      changed.forEach((entry) => {
        if (entry.created) {
          entry.element.remove();
          return;
        }
        if (entry.content === null) entry.element.removeAttribute('content');
        else entry.element.setAttribute('content', entry.content);
        if (entry.name === null) entry.element.removeAttribute('name');
        else entry.element.setAttribute('name', entry.name);
        if (entry.property === null) entry.element.removeAttribute('property');
        else entry.element.setAttribute('property', entry.property);
        if (entry.dataSeo === null) entry.element.removeAttribute('data-seo');
        else entry.element.setAttribute('data-seo', entry.dataSeo);
      });

      if (canonicalCreated) {
        canonical.remove();
      } else {
        if (previousCanonicalHref === null) canonical.removeAttribute('href');
        else canonical.setAttribute('href', previousCanonicalHref);
        if (previousCanonicalDataSeo === null) canonical.removeAttribute('data-seo');
        else canonical.setAttribute('data-seo', previousCanonicalDataSeo);
      }
      document.title = prevTitle;
    };
  }, [config.title, config.description, config.keywords, config.path, config.image, config.type]);
}

/** Simple BreadcrumbList JSON-LD builder shared across pages. */
export function buildBreadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.path}`,
    })),
  };
}
