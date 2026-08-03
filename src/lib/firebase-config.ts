import { initializeApp } from 'firebase/app';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);

export const firebaseVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

let messagingInstance: Messaging | null = null;

export async function getMessagingInstance(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    messagingInstance = getMessaging(firebaseApp);
    return messagingInstance;
  } catch {
    return null;
  }
}
