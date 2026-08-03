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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'notification_click', url: targetUrl });
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
