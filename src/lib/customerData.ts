import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase';

export async function customerData<T>(action:string, extra:Record<string,unknown>={}) : Promise<T|null> {
  const sessionToken=sessionStorage.getItem('vattams_customer_session');
  if(!sessionToken) return null;
  const res=await fetch(`${SUPABASE_URL}/functions/v1/customer-data`,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${SUPABASE_ANON_KEY}`},
    body:JSON.stringify({action,session_token:sessionToken,...extra})
  });
  if(!res.ok) return null;
  return await res.json() as T;
}