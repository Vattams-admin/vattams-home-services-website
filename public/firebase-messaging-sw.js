self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const requestedUrl = (event.notification.data && event.notification.data.url) || '/';
  let targetUrl = `${self.location.origin}/`;
  try {
    const candidateUrl = new URL(requestedUrl, self.location.origin);
    // Push payloads must never turn a notification click into an external redirect.
    if (candidateUrl.origin === self.location.origin) targetUrl = candidateUrl.href;
  } catch {
    // Keep the safe same-origin home URL for malformed notification destinations.
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          if ('navigate' in client && client.url !== targetUrl) {
            await client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: self.FIREBASE_API_KEY,
  authDomain: self.FIREBASE_AUTH_DOMAIN,
  projectId: self.FIREBASE_PROJECT_ID,
  storageBucket: self.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID,
  appId: self.FIREBASE_APP_ID,
  measurementId: self.FIREBASE_MEASUREMENT_ID,
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  self.registration.showNotification(title ?? 'VATTAMS', {
    body: body ?? '',
    icon: '/logo.svg',
    badge: '/favicon.svg',
    data: payload.data ?? {},
  });
});
