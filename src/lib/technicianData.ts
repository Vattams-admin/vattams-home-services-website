import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase';

export async function technicianData<T = any>(action: string, extra: Record<string, unknown> = {}): Promise<T | null> {
  let sessionToken = '';
  try {
    if (typeof sessionStorage === 'undefined') {
      throw new Error('Technician session expired. Please sign in again.');
    }
    sessionToken = sessionStorage.getItem('vattams_technician_session') || '';
  } catch {
    throw new Error('Technician session unavailable. Please sign in again.');
  }
  if (!sessionToken) throw new Error('Technician session expired. Please sign in again.');
  if (typeof action !== 'string' || !action.trim() || action.length > 100) {
    throw new Error('Invalid technician request. Please try again.');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/technician-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    // Do not allow caller-supplied fields to replace the action or session token.
    body: JSON.stringify({ ...extra, action, session_token: sessionToken }),
  });
  const parsed: unknown = await response.json().catch(() => null);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Technician service returned an invalid response (HTTP ${response.status}).`);
  }
  const data = parsed as Record<string, unknown>;
  if (!response.ok || typeof data.error === 'string') {
    const message = typeof data.error === 'string' && data.error.trim()
      ? data.error
      : 'Technician request failed';
    throw new Error(message);
  }
  return data as T;
}
