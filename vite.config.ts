import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function configureFcmServiceWorker() {
  const keys = {
    FIREBASE_API_KEY: 'VITE_FIREBASE_API_KEY',
    FIREBASE_AUTH_DOMAIN: 'VITE_FIREBASE_AUTH_DOMAIN',
    FIREBASE_PROJECT_ID: 'VITE_FIREBASE_PROJECT_ID',
    FIREBASE_STORAGE_BUCKET: 'VITE_FIREBASE_STORAGE_BUCKET',
    FIREBASE_MESSAGING_SENDER_ID: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
    FIREBASE_APP_ID: 'VITE_FIREBASE_APP_ID',
    FIREBASE_MEASUREMENT_ID: 'VITE_FIREBASE_MEASUREMENT_ID',
  } as const;

  return {
    name: 'configure-fcm-service-worker',
    apply: 'build' as const,
    closeBundle() {
      const workerPath = resolve(process.cwd(), 'dist/firebase-messaging-sw.js');
      let worker: string;
      try {
        worker = readFileSync(workerPath, 'utf8');
      } catch {
        throw new Error('FCM service worker was not emitted to dist/');
      }

      for (const [workerKey, envKey] of Object.entries(keys)) {
        // Firebase web configuration is public client configuration, not a server secret.
        // Embed the same build-time values used by firebase-config.ts in the worker.
        const value = JSON.stringify(process.env[envKey] ?? '');
        worker = worker.replaceAll('self.' + workerKey, value);
      }

      writeFileSync(workerPath, worker, 'utf8');
    },
  };
}

export default defineConfig({
  plugins: [react(), configureFcmServiceWorker()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: false,
  },
});
