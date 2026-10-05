import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

export async function adminData<T = unknown>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const adminId = sessionStorage.getItem('vattams_admin_id') || '';
  const adminSessionToken = sessionStorage.getItem('vattams_admin') || '';
  const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ action, admin_id: adminId, admin_session_token: adminSessionToken, ...payload }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Admin request failed.');
  return data as T;
}
