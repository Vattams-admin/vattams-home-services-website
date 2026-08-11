import { useEffect, useState } from 'react';
import { Facebook, Instagram, Twitter, Youtube, MessageCircle, Globe, Map, LucideIcon } from 'lucide-react';
import { fetchSiteSettings, SiteSettings } from '@/lib/siteSettings';

type Variant = 'footer' | 'hero' | 'contact' | 'mobile';

interface SocialLinksProps {
  variant?: Variant;
}

interface SocialItem {
  key: keyof SiteSettings;
  icon: LucideIcon;
  label: string;
  bgClass: string;
  hoverClass: string;
}

const SOCIAL_ITEMS: SocialItem[] = [
  { key: 'google_business_url', icon: Map, label: 'Google Business', bgClass: 'bg-blue-600', hoverClass: 'hover:bg-blue-500' },
  { key: 'facebook_url', icon: Facebook, label: 'Facebook', bgClass: 'bg-blue-700', hoverClass: 'hover:bg-blue-600' },
  { key: 'instagram_url', icon: Instagram, label: 'Instagram', bgClass: 'bg-pink-700', hoverClass: 'hover:bg-pink-600' },
  { key: 'twitter_url', icon: Twitter, label: 'X (Twitter)', bgClass: 'bg-sky-700', hoverClass: 'hover:bg-sky-600' },
  { key: 'youtube_url', icon: Youtube, label: 'YouTube', bgClass: 'bg-red-700', hoverClass: 'hover:bg-red-600' },
  { key: 'website_url', icon: Globe, label: 'Website', bgClass: 'bg-gray-700', hoverClass: 'hover:bg-gray-600' },
];

let cachedSettings: SiteSettings | null = null;
let fetchPromise: Promise<SiteSettings> | null = null;

async function getSettings(): Promise<SiteSettings> {
  if (cachedSettings) return cachedSettings;
  if (!fetchPromise) {
    fetchPromise = fetchSiteSettings().then((s) => {
      cachedSettings = s;
      fetchPromise = null;
      return s;
    });
  }
  return fetchPromise;
}

export function refreshSocialLinksCache() {
  cachedSettings = null;
  fetchPromise = null;
}

export default function SocialLinks({ variant = 'footer' }: SocialLinksProps) {
  const [settings, setSettings] = useState<SiteSettings | null>(cachedSettings);

  useEffect(() => {
    if (cachedSettings) return;
    getSettings().then(setSettings);
  }, []);

  if (!settings) return null;

  const items = SOCIAL_ITEMS.filter((item) => {
    const val = settings[item.key];
    return typeof val === 'string' && val.trim().length > 0;
  });

  const whatsapp = settings.whatsapp_number?.trim();
  const showWhatsapp = whatsapp && whatsapp.length > 0;

  if (items.length === 0 && !showWhatsapp) return null;

  const sizeClass = variant === 'hero' || variant === 'contact' ? 'w-11 h-11' : 'w-9 h-9';
  const iconSize = variant === 'hero' || variant === 'contact' ? 18 : 16;

  if (variant === 'mobile') {
    return (
      <div className="flex flex-wrap gap-2 justify-center pt-2">
        {showWhatsapp && (
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" aria-label="WhatsApp"
            className={`${sizeClass} rounded-full bg-green-500 ${'hover:bg-green-400'} flex items-center justify-center transition-colors`}>
            <MessageCircle size={iconSize} className="text-white" aria-hidden="true" />
          </a>
        )}
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <a key={item.key} href={settings[item.key] as string} target="_blank" rel="noreferrer" aria-label={item.label}
              className={`${sizeClass} rounded-full ${item.bgClass} ${item.hoverClass} flex items-center justify-center transition-colors`}>
              <Icon size={iconSize} className="text-white" aria-hidden="true" />
            </a>
          );
        })}
      </div>
    );
  }

  if (variant === 'contact') {
    return (
      <div className="flex flex-wrap gap-3 mt-6">
        {showWhatsapp && (
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" title="WhatsApp" aria-label="WhatsApp"
            className={`${sizeClass} rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors shadow-sm`}>
            <MessageCircle size={iconSize} className="text-white" aria-hidden="true" />
          </a>
        )}
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <a key={item.key} href={settings[item.key] as string} target="_blank" rel="noreferrer" title={item.label} aria-label={item.label}
              className={`${sizeClass} rounded-full ${item.bgClass} ${item.hoverClass} flex items-center justify-center transition-colors shadow-sm`}>
              <Icon size={iconSize} className="text-white" aria-hidden="true" />
            </a>
          );
        })}
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div className="flex flex-wrap gap-3 mt-6">
        {showWhatsapp && (
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" title="WhatsApp" aria-label="WhatsApp"
            className={`${sizeClass} rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors`}>
            <MessageCircle size={iconSize} className="text-white" aria-hidden="true" />
          </a>
        )}
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <a key={item.key} href={settings[item.key] as string} target="_blank" rel="noreferrer" title={item.label} aria-label={item.label}
              className={`${sizeClass} rounded-full ${item.bgClass} ${item.hoverClass} flex items-center justify-center transition-colors`}>
              <Icon size={iconSize} className="text-white" aria-hidden="true" />
            </a>
          );
        })}
      </div>
    );
  }

  // footer variant (default)
  return (
    <div className="flex gap-3 mt-5">
      {showWhatsapp && (
        <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" title="WhatsApp"
          className={`${sizeClass} rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors`}>
          <MessageCircle size={iconSize} className="text-white" aria-hidden="true" />
        </a>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <a key={item.key} href={settings[item.key] as string} target="_blank" rel="noreferrer" title={item.label}
            className={`${sizeClass} rounded-full ${item.bgClass} ${item.hoverClass} flex items-center justify-center transition-colors`}>
            <Icon size={iconSize} className="text-white" aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}