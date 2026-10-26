import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase';

export async function customerData<T>(action:string, extra:Record<string,unknown>={}) : Promise<T|null> {
  if (typeof action !== 'string') return null;
  const cleanAction = action.trim();
  if (!cleanAction || cleanAction.length > 100) return null;
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) return null;
  if (typeof sessionStorage === 'undefined') return null;

  let sessionToken: string | null;
  let expiresAt: number;
  try {
    sessionToken = sessionStorage.getItem('vattams_customer_session');
    expiresAt = Number(sessionStorage.getItem('vattams_customer_expires'));
  } catch {
    // Storage can be blocked by browser privacy settings or quota/security policy.
    return null;
  }

  if (!sessionToken || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    try {
      sessionStorage.removeItem('vattams_customer');
      sessionStorage.removeItem('vattams_customer_session');
      sessionStorage.removeItem('vattams_customer_expires');
    } catch {
      // Invalid sessions are rejected even if the browser blocks cleanup.
    }
    return null;
  }

  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/customer-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      // Send a canonical action and keep the authenticated session token authoritative.
      body: JSON.stringify({ ...extra, action: cleanAction, session_token: sessionToken }),
    });
  } catch {
    // Network failures should follow the same unavailable-data path as HTTP errors.
    return null;
  }
  if (!res.ok) return null;
  try {
    const parsed: unknown = await res.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as T;
  } catch {
    // Treat empty or malformed API responses as unavailable data so callers
    // can show their existing retry/error state instead of crashing on JSON parsing.
    return null;
  }
}