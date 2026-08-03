import { supabase } from './supabase';
import { getMessagingInstance, firebaseVapidKey } from './firebase-config';
import { getToken, onMessage, deleteToken, Messaging } from 'firebase/messaging';

export interface FCMToken {
  id: string;
  user_type: 'customer' | 'technician' | 'admin';
  user_id: string;
  token: string;
  device_info: string | null;
  is_active: boolean;
}

type UserType = 'customer' | 'technician' | 'admin';

let foregroundCallback: ((payload: { notification?: { title?: string; body?: string }; data?: Record<string, unknown> }) => void) | null = null;

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

export async function registerFCMToken(
  userType: UserType,
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
  userType: UserType,
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

function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  return `${platform} | ${ua}`.slice(0, 200);
}

export async function initFCM(
  userType: UserType,
  userId: string,
): Promise<string | null> {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') return null;

    const vapidKey = firebaseVapidKey;
    if (!vapidKey) {
      console.error('[fcm] VAPID key not configured');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: await navigator.serviceWorker.ready,
    });

    if (!token) return null;

    await registerFCMToken(userType, userId, token, getDeviceInfo());

    onMessage(messaging, (payload) => {
      if (foregroundCallback) {
        foregroundCallback(payload);
      } else {
        const { title, body } = payload.notification ?? {};
        if (title) {
          new Notification(title, {
            body: body ?? '',
            icon: '/logo.svg',
            badge: '/favicon.svg',
          });
        }
      }
    });

    return token;
  } catch (err) {
    console.error('[fcm] init error:', err);
    return null;
  }
}

export function onForegroundMessage(
  callback: (payload: { notification?: { title?: string; body?: string }; data?: Record<string, unknown> }) => void,
): void {
  foregroundCallback = callback;
}

export async function unregisterUserFCM(userType: UserType, userId: string): Promise<void> {
  try {
    const messaging = await getMessagingInstance();
    if (messaging) {
      await deleteToken(messaging);
    }
  } catch {
    // ignore
  }
  await supabase
    .from('fcm_tokens')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_type', userType)
    .eq('user_id', userId);
}

export async function sendPushNotification(
  userType: UserType,
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

export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
  } catch (err) {
    console.error('[fcm] SW registration failed:', err);
  }
}

export type { Messaging };
