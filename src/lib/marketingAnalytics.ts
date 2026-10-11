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
  window.gtag('event', name, params);
}

export function trackMarketingPageView(path: string, title: string) {
  trackMarketingEvent('page_view', { page_path: path, page_title: title });
}
