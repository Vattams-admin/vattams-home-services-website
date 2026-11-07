import { fetchSiteSettings, type SiteSettings } from '@/lib/siteSettings';

let cachedSettings: SiteSettings | null = null;
let fetchPromise: Promise<SiteSettings> | null = null;
let cacheGeneration = 0;

export async function getSocialLinksSettings(): Promise<SiteSettings> {
  if (cachedSettings) return cachedSettings;
  if (!fetchPromise) {
    const generation = cacheGeneration;
    let pending: Promise<SiteSettings>;
    pending = fetchSiteSettings().then((settings) => {
      // A refresh may have happened while this request was in flight. An older
      // response must never repopulate the cache after that invalidation.
      if (generation === cacheGeneration) {
        cachedSettings = settings;
        if (fetchPromise === pending) fetchPromise = null;
      }
      return settings;
    }).catch((error: unknown) => {
      if (generation === cacheGeneration && fetchPromise === pending) {
        fetchPromise = null;
      }
      throw error;
    });
    fetchPromise = pending;
  }
  return fetchPromise;
}

export function refreshSocialLinksCache(): void {
  // Fence every request started before this refresh from mutating current state.
  cacheGeneration += 1;
  cachedSettings = null;
  fetchPromise = null;
}
