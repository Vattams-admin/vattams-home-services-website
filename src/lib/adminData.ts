import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

export async function adminData<T = unknown>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
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

  if (!adminId || !adminSessionToken) {
    throw new Error('Admin session unavailable. Please sign in again.');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    // Keep trusted session fields and the requested action authoritative.
    body: JSON.stringify({ ...payload, action, admin_id: adminId, admin_session_token: adminSessionToken }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Admin request failed.');
  return data as T;
}
