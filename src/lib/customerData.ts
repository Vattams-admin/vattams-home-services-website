import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase';

export async function customerData<T>(action:string, extra:Record<string,unknown>={}) : Promise<T|null> {
  if (typeof sessionStorage === 'undefined') return null;

  const sessionToken = sessionStorage.getItem('vattams_customer_session');
  const expiresAt = Number(sessionStorage.getItem('vattams_customer_expires'));
  if (!sessionToken || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    sessionStorage.removeItem('vattams_customer');
    sessionStorage.removeItem('vattams_customer_session');
    sessionStorage.removeItem('vattams_customer_expires');
    return null;
  }

  const res=await fetch(`${SUPABASE_URL}/functions/v1/customer-data`,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${SUPABASE_ANON_KEY}`},
    body:JSON.stringify({...extra,action,session_token:sessionToken})
  });
  if(!res.ok) return null;
  try {
    return await res.json() as T;
  } catch {
    // Treat empty or malformed API responses as unavailable data so callers
    // can show their existing retry/error state instead of crashing on JSON parsing.
    return null;
  }
}