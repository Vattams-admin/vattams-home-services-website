import { supabase } from './supabase';

export interface FCMToken {
  id: string;
  user_type: 'customer' | 'technician' | 'admin';
  user_id: string;
  token: string;
  device_info: string | null;
  is_active: boolean;
}

export async function registerFCMToken(
  userType: 'customer' | 'technician' | 'admin',
  userId: string,
  token: string,
  deviceInfo?: string,
): Promise<boolean> {
  const { error } = await supabase.from('fcm_tokens').upsert(
    {
      user_type: userType,
      user_id: userId,
      token,
      device_info: deviceInfo ?? null,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_type,user_id,token' },
  );

  if (error) {
    console.error('[fcm] register token error:', error);
    return false;
  }
  return true;
}

export async function unregisterFCMToken(token: string): Promise<boolean> {
  const { error } = await supabase
    .from('fcm_tokens')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('token', token);
  return !error;
}

export async function getTokensForUser(
  userType: 'customer' | 'technician' | 'admin',
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('fcm_tokens')
    .select('token')
    .eq('user_type', userType)
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error || !data) return [];
  return data.map((r: { token: string }) => r.token);
}

export async function sendPushNotification(
  userType: 'customer' | 'technician' | 'admin',
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<boolean> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userType, userId, title, body, data }),
    });
    return response.ok;
  } catch (err) {
    console.error('[fcm] send push error:', err);
    return false;
  }
}
