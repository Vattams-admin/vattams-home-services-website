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

// Narrow, non-navigable scope for the Firebase Cloud Messaging service worker.
// Keeping it off the root scope prevents it from competing with the main
// caching service worker (/sw.js) for control of page fetches, while it can
// still receive push events regardless of scope.
const FCM_SW_SCOPE = '/firebase-cloud-messaging-push-scope';

let foregroundCallback: ((payload: { notification?: { title?: string; body?: string }; data?: Record<string, unknown> }) => void) | null = null;

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

function sessionFor(userType: UserType): { token: string; id: string } | null {
  if (typeof sessionStorage === 'undefined') return null;
  if (userType === 'admin') return {
    token: sessionStorage.getItem('vattams_admin') || '',
    id: sessionStorage.getItem('vattams_admin_id') || '',
  };
  if (userType === 'technician') return {
    token: sessionStorage.getItem('vattams_technician_session') || '',
    id: sessionStorage.getItem('vattams_technician_id') || '',
  };
  let id = '';
  try {
    const customer = sessionStorage.getItem('vattams_customer');
    id = customer ? String(JSON.parse(customer).id || '') : '';
  } catch {}
  return {
    token: sessionStorage.getItem('vattams_customer_session') || '',
    id,
  };
}

async function fcmData(body: Record<string, unknown>): Promise<any> {
  const response = await fetch(\`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fcm-data\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: \`Bearer \${import.meta.env.VITE_SUPABASE_ANON_KEY}\`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'FCM request failed');
  return data;
}

export async function registerFCMToken(
  userType: UserType,
  userId: string,
  token: string,
  deviceInfo?: string,
): Promise<boolean> {
  try {
    const session = sessionFor(userType);
    if (!session?.token) return false;
    await fcmData({
      action: 'register', user_type: userType, user_id: userId, token,
      device_info: deviceInfo ?? null, session_token: session.token,
      admin_id: userType === 'admin' ? session.id : undefined,
    });
    return true;
  } catch (error) {
    console.error('[fcm] register token error:', error);
    return false;
  }
}

export async function unregisterFCMToken(token: string): Promise<boolean> {
  for (const userType of ['customer', 'technician', 'admin'] as UserType[]) {
    const session = sessionFor(userType);
    if (!session?.token) continue;
    try {
      await fcmData({
        action: 'unregister', user_type: userType, token,
        session_token: session.token,
        admin_id: userType === 'admin' ? session.id : undefined,
      });
      return true;
    } catch {}
  }
  return false;
}

export async function getTokensForUser(
  userType: UserType,
  userId: string,
): Promise<string[]> {
  try {
    const session = sessionFor(userType);
    if (!session?.token) return [];
    const data = await fcmData({
      action: 'list', user_type: userType, user_id: userId,
      session_token: session.token,
      admin_id: userType === 'admin' ? session.id : undefined,
    });
    return Array.isArray(data.tokens) ? data.tokens.map((r: { token: string }) => r.token) : [];
  } catch {
    return [];
  }
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

    const fcmRegistration =
      (await navigator.serviceWorker.getRegistration(FCM_SW_SCOPE)) ??
      (await navigator.serviceWorker.ready);

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: fcmRegistration,
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
    if (messaging) await deleteToken(messaging);
  } catch {}
  const session = sessionFor(userType);
  if (!session?.token) return;
  try {
    await fcmData({
      action: 'unregister_user', user_type: userType, user_id: userId,
      session_token: session.token,
      admin_id: userType === 'admin' ? session.id : undefined,
    });
  } catch (error) {
    console.error('[fcm] unregister user error:', error);
  }
}

export async function sendPushNotification(
  _userType: UserType,
  _userId: string,
  _title: string,
  _body: string,
  _data?: Record<string, string>,
): Promise<boolean> {
  console.warn('[fcm] direct client push dispatch is disabled; use notification-ops');
  return false;
}

export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  // Main service worker: handles offline caching and PWA installability
  // for the whole app at the root scope.
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (err) {
    console.error('[sw] registration failed:', err);
  }

  // Firebase Cloud Messaging service worker: registered at a dedicated
  // narrow scope so it never takes control of page fetches away from
  // /sw.js. It still receives push notifications regardless of scope.
  try {
    await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: FCM_SW_SCOPE,
    });
  } catch (err) {
    console.error('[fcm] SW registration failed:', err);
  }
}

export type { Messaging };