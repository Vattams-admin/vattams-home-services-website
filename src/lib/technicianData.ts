import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase';

export async function technicianData<T = any>(action: string, extra: Record<string, unknown> = {}): Promise<T | null> {
  const sessionToken = sessionStorage.getItem('vattams_technician_session');
  if (!sessionToken) throw new Error('Technician session expired. Please sign in again.');
  const response = await fetch(`${SUPABASE_URL}/functions/v1/technician-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ action, session_token: sessionToken, ...extra }),
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || 'Technician request failed');
  return data as T;
}
