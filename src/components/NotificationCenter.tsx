import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, CheckCheck, Trash2, BellOff } from 'lucide-react';
import {
  NotificationRow, NotificationRecipientType,
  fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead, deleteNotification,
  subscribeToNotifications,
} from '@/lib/notifications';

interface NotificationCenterProps {
  recipientType: NotificationRecipientType;
  recipientId: string;
}

const typeIconColor: Record<string, string> = {
  booking_received: 'bg-blue-100 text-blue-600',
  technician_assigned: 'bg-indigo-100 text-indigo-600',
  technician_on_way: 'bg-cyan-100 text-cyan-600',
  service_started: 'bg-purple-100 text-purple-600',
  service_completed: 'bg-green-100 text-green-600',
  payment_received: 'bg-emerald-100 text-emerald-600',
  booking_cancelled: 'bg-red-100 text-red-600',
  registration_submitted: 'bg-amber-100 text-amber-600',
  registration_approved: 'bg-green-100 text-green-600',
  registration_rejected: 'bg-red-100 text-red-600',
  job_assigned: 'bg-blue-100 text-blue-600',
  job_cancelled: 'bg-red-100 text-red-600',
  wallet_recharge_approved: 'bg-green-100 text-green-600',
  wallet_recharge_rejected: 'bg-red-100 text-red-600',
  deposit_released: 'bg-emerald-100 text-emerald-600',
  commission_deducted: 'bg-orange-100 text-orange-600',
  account_locked: 'bg-red-100 text-red-600',
  account_unlocked: 'bg-green-100 text-green-600',
  new_booking: 'bg-blue-100 text-blue-600',
  new_technician_registration: 'bg-indigo-100 text-indigo-600',
  new_wallet_recharge: 'bg-amber-100 text-amber-600',
  admin_payment_received: 'bg-emerald-100 text-emerald-600',
  new_review: 'bg-yellow-100 text-yellow-600',
  failed_payment: 'bg-red-100 text-red-600',
  system_error: 'bg-red-100 text-red-600',
  announcement: 'bg-blue-100 text-blue-600',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN');
}

export default function NotificationCenter({ recipientType, recipientId }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [notifs, count] = await Promise.all([
      fetchNotifications(recipientType, recipientId, 50),
      fetchUnreadCount(recipientType, recipientId),
    ]);
    setNotifications(notifs);
    setUnreadCount(count);
    setLoading(false);
  }, [recipientType, recipientId]);

  useEffect(() => {
    load();
    const unsubscribe = subscribeToNotifications(recipientType, recipientId, () => {
      load();
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, [load, recipientType, recipientId]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMarkRead = async (id: string) => {
    const ok = await markAsRead(id);
    if (ok) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true, status: 'read' as const, read_at: new Date().toISOString() } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllRead = async () => {
    const ok = await markAllAsRead(recipientType, recipientId);
    if (ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, status: 'read' as const, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteNotification(id);
    if (ok) {
      const target = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.is_read) setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => { setOpen(!open); if (!open) load(); }}
        className="relative p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} className="text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div ref={dropdownRef} className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 max-h-[70vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Bell size={16} className="text-blue-600" /> Notifications
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">{unreadCount}</span>
              )}
            </h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} title="Mark all as read"
                  className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                  <CheckCheck size={15} />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <BellOff size={32} className="mb-2 text-gray-300" />
                <p className="text-sm">No notifications yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((n) => (
                  <div key={n.id} className={`group flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/50' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeIconColor[n.type] ?? 'bg-gray-100 text-gray-500'}`}>
                      <Bell size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-gray-800 text-sm">{n.title}</div>
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                      </div>
                      <div className="text-gray-500 text-xs mt-0.5 leading-relaxed">{n.message}</div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-gray-400">{timeAgo(n.created_at)}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!n.is_read && (
                            <button onClick={() => handleMarkRead(n.id)} title="Mark as read"
                              className="p-1 rounded hover:bg-blue-100 text-blue-600">
                              <CheckCheck size={13} />
                            </button>
                          )}
                          {recipientType === 'admin' && (
                            <button onClick={() => handleDelete(n.id)} title="Delete"
                              className="p-1 rounded hover:bg-red-100 text-red-500">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 text-center">
              <span className="text-xs text-gray-400">{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
