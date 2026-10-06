import { useEffect, useState } from 'react';

export default function NetworkStatus() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const [reconnected, setReconnected] = useState(false);

  useEffect(() => {
    const onOffline = () => {
      setOffline(true);
      setReconnected(false);
    };
    const onOnline = () => {
      setOffline(false);
      setReconnected(true);
      window.setTimeout(() => setReconnected(false), 3000);
    };

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  if (!offline && !reconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '10px 16px',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: 600,
        background: offline ? '#7f1d1d' : '#166534',
        color: '#fff',
      }}
    >
      {offline
        ? 'You are offline. Your current page remains available; reconnect before submitting bookings or payments.'
        : 'Connection restored. You can continue safely.'}
    </div>
  );
}
