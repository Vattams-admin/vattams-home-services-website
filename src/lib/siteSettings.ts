import { supabase } from '@/lib/supabase';

export interface SiteSettings {
  id: number;
  google_business_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  whatsapp_number: string | null;
  website_url: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

const EMPTY: SiteSettings = {
  id: 1,
  google_business_url: null,
  facebook_url: null,
  instagram_url: null,
  twitter_url: null,
  youtube_url: null,
  whatsapp_number: null,
  website_url: null,
  updated_at: null,
  updated_by: null,
};

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    console.error('[siteSettings] fetch error:', error);
    return EMPTY;
  }
  return data ?? EMPTY;
}

export type SiteSettingsInput = {
  google_business_url: string;
  facebook_url: string;
  instagram_url: string;
  twitter_url: string;
  youtube_url: string;
  whatsapp_number: string;
  website_url: string;
};

export function validateUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol)) return 'URL must start with http:// or https://';
    return null;
  } catch {
    return 'Please enter a valid URL (e.g. https://example.com)';
  }
}

export function validateWhatsapp(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return 'Enter a valid phone number (10-15 digits)';
  return null;
}

export function validateSettings(input: SiteSettingsInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const urlFields: (keyof SiteSettingsInput)[] = [
    'google_business_url', 'facebook_url', 'instagram_url',
    'twitter_url', 'youtube_url', 'website_url',
  ];
  for (const field of urlFields) {
    const err = validateUrl(input[field]);
    if (err) errors[field] = err;
  }
  const waErr = validateWhatsapp(input.whatsapp_number);
  if (waErr) errors.whatsapp_number = waErr;
  return errors;
}

function clean(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

export async function saveSiteSettings(
  input: SiteSettingsInput,
  updatedBy: string = 'admin',
): Promise<{ success: boolean; error?: string }> {
  const errors = validateSettings(input);
  if (Object.keys(errors).length > 0) {
    return { success: false, error: 'Please fix the validation errors before saving.' };
  }

  const payload = {
    id: 1,
    google_business_url: clean(input.google_business_url),
    facebook_url: clean(input.facebook_url),
    instagram_url: clean(input.instagram_url),
    twitter_url: clean(input.twitter_url),
    youtube_url: clean(input.youtube_url),
    whatsapp_number: clean(input.whatsapp_number),
    website_url: clean(input.website_url),
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };

  const { error } = await supabase
    .from('site_settings')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('[siteSettings] save error:', error);
    const detail = [error.message, error.details, error.hint].filter(Boolean).join(' — ');
    return {
      success: false,
      error: detail ? `Save failed: ${detail}` : 'Save failed: unknown error. Check the browser console for details.',
    };
  }

  return { success: true };
}