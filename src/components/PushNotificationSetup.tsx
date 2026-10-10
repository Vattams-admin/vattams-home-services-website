import { useState } from 'react';
import { BellRing, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { initFCM } from '@/lib/fcm';

type PushNotificationSetupProps = {
  userType: 'customer' | 'technician' | 'admin';
  userId: string;
};

export default function PushNotificationSetup({
  userType,
  userId,
}: PushNotificationSetupProps) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [connected, setConnected] = useState(false);

  const connectThisDevice = async () => {
    setMessage('');
    setBusy(true);

    try {
      // initFCM requests permission before its first await, preserving the
      // browser's user-gesture requirement for the notification prompt.
      const token = await initFCM(userType, userId);
      const currentPermission =
        typeof window !== 'undefined' && 'Notification' in window
          ? Notification.permission
          : 'unsupported';
      setPermission(currentPermission);
      setConnected(Boolean(token));

      if (token) {
        setMessage('This device is registered for push notifications.');
      } else if (currentPermission === 'denied') {
        setMessage('Notifications are blocked by your browser. Allow them in this site’s browser settings, then retry.');
      } else if (currentPermission === 'unsupported') {
        setMessage('This browser does not support web push notifications. Try an updated browser.');
      } else {
        setMessage('This device could not be registered. Check your connection and try again.');
      }
    } catch {
      setConnected(false);
      setMessage('This device could not be registered. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  if (permission === 'unsupported') return null;

  return (
    <section
      aria-label="Push notification settings"
      className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#e8e1d2] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f8f4e8] text-[#a47c00]">
          {connected ? <CheckCircle2 size={21} /> : <BellRing size={21} />}
        </div>
        <div>
          <h2 className="font-bold text-gray-900">
            {connected ? 'Push notifications are enabled' : 'Get service updates on this device'}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Receive booking, job assignment, and important account updates even when this page is not open.
          </p>
          {message && (
            <p role="status" aria-live="polite" className="mt-2 text-sm text-gray-700">
              {message}
            </p>
          )}
          {permission === 'granted' && !connected && (
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
              <ShieldCheck size={13} /> Browser permission is allowed; connect this device to finish registration.
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={connectThisDevice}
        disabled={busy || connected}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#17365b] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <BellRing size={16} />}
        {busy ? 'Connecting…' : connected ? 'Device connected' : permission === 'denied' ? 'Check browser settings' : 'Enable notifications'}
      </button>
    </section>
  );
}
