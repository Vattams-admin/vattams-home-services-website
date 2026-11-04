import { fetchSiteSettings, type SiteSettings } from '@/lib/siteSettings';

let cachedSettings: SiteSettings | null = null;
let fetchPromise: Promise<SiteSettings> | null = null;

export async function getSocialLinksSettings(): Promise<SiteSettings> {
  if (cachedSettings) return cachedSettings;
  if (!fetchPromise) {
    fetchPromise = fetchSiteSettings().then((settings) => {
      cachedSettings = settings;
      fetchPromise = null;
      return settings;
    }).catch((error: unknown) => {
      fetchPromise = null;
      throw error;
    });
  }
  return fetchPromise;
}

export function refreshSocialLinksCache(): void {
  cachedSettings = null;
  fetchPromise = null;
}
