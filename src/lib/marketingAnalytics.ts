type AnalyticsValue = string | number | boolean;
type AnalyticsParams = Record<string, AnalyticsValue>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** Send privacy-conscious GA4 events; never pass names, phone numbers or addresses. */
export function trackMarketingEvent(name: string, params: AnalyticsParams = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  if (typeof name !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_]{0,99}$/.test(name)) return;
  const candidateParams = params && typeof params === 'object' && !Array.isArray(params)
    ? params
    : {};
  const safeParams = Object.fromEntries(
    Object.entries(candidateParams).filter(([key, value]) =>
      /^[a-zA-Z][a-zA-Z0-9_]{0,99}$/.test(key)
      && (typeof value === 'string' ? value.length <= 500
        : typeof value === 'number' ? Number.isFinite(value)
          : typeof value === 'boolean')),
  ) as AnalyticsParams;
  window.gtag('event', name, safeParams);
}

export function trackMarketingPageView(path: string, title: string) {
  trackMarketingEvent('page_view', { page_path: path, page_title: title });
}
