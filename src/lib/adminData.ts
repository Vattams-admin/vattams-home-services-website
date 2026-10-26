import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

export async function adminData<T = unknown>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (typeof action !== 'string' || !action.trim() || action.length > 100) {
    throw new Error('Invalid admin request. Please try again.');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Invalid admin request data. Please try again.');
  }

  let adminId = '';
  let adminSessionToken = '';
  try {
    if (typeof sessionStorage === 'undefined') {
      throw new Error('Admin session unavailable. Please sign in again.');
    }
    adminId = sessionStorage.getItem('vattams_admin_id') || '';
    adminSessionToken = sessionStorage.getItem('vattams_admin') || '';
  } catch {
    throw new Error('Admin session unavailable. Please sign in again.');
  }

  adminId = adminId.trim();
  adminSessionToken = adminSessionToken.trim();
  if (!adminId || !adminSessionToken) {
    throw new Error('Admin session unavailable. Please sign in again.');
  }
  const cleanAction = action.trim();

  const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    // Keep trusted session fields and the requested action authoritative.
    body: JSON.stringify({ ...payload, action: cleanAction, admin_id: adminId, admin_session_token: adminSessionToken }),
  });
  const parsed: unknown = await response.json().catch(() => null);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Admin service returned an invalid response (HTTP ${response.status}).`);
  }
  const data = parsed as Record<string, unknown>;
  if (!response.ok || typeof data.error === 'string') {
    throw new Error(typeof data.error === 'string' && data.error.trim() ? data.error : 'Admin request failed.');
  }
  return data as T;
}
