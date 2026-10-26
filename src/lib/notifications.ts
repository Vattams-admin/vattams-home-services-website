import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { adminData } from '@/lib/adminData';

export type NotificationRecipientType = 'customer' | 'technician' | 'admin';
export type NotificationStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface NotificationRow {
  id: string;
  recipient_type: NotificationRecipientType;
  recipient_id: string;
  title: string;
  message: string;
  type: string;
  reference_type: string | null;
  reference_id: string | null;
  channels: string[];
  status: NotificationStatus;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationInput {
  recipientType: NotificationRecipientType;
  recipientId: string;
  title: string;
  message: string;
  type: string;
  referenceType?: string;
  referenceId?: string;
  channels?: string[];
  bookingActionToken?: string;
}

export async function createNotification(input: CreateNotificationInput): Promise<NotificationRow | null> {
  if (!input || typeof input !== 'object'
    || !['customer', 'technician', 'admin'].includes(input.recipientType)
    || typeof input.recipientId !== 'string' || !input.recipientId.trim() || input.recipientId.length > 200
    || typeof input.title !== 'string' || !input.title.trim() || input.title.length > 200
    || typeof input.message !== 'string' || !input.message.trim() || input.message.length > 5000
    || typeof input.type !== 'string' || !input.type.trim() || input.type.length > 100
    || (input.referenceType !== undefined && (typeof input.referenceType !== 'string' || input.referenceType.length > 100))
    || (input.referenceId !== undefined && (typeof input.referenceId !== 'string' || input.referenceId.length > 200))
    || (input.bookingActionToken !== undefined && (typeof input.bookingActionToken !== 'string' || !input.bookingActionToken.trim() || input.bookingActionToken.length > 2000))
    || (input.channels !== undefined && (!Array.isArray(input.channels) || input.channels.some((channel) => !['in_app', 'push', 'email', 'sms'].includes(channel)))) {
    return null;
  }
  try {
    const sessionKey =
      input.recipientType === 'admin' ? 'vattams_admin' :
      input.recipientType === 'technician' ? 'vattams_technician_session' :
      'vattams_customer_session';
    if (typeof sessionStorage === 'undefined') return null;
    const token = input.bookingActionToken || sessionStorage.getItem(sessionKey) || '';
    if (!token.trim()) return null;
    const body: Record<string, unknown> = {
      input: {
        recipientType: input.recipientType,
        recipientId: input.recipientId,
        title: input.title,
        message: input.message,
        type: input.type,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        channels: input.channels ?? ['in_app', 'push'],
      },
      ...(input.bookingActionToken ? { booking_action_token: input.bookingActionToken } : {}),
      ...(input.recipientType === 'admin' ? {
        admin_session_token: token,
        admin_id: sessionStorage.getItem('vattams_admin_id'),
      } : input.recipientType === 'technician' ? {
        technician_session_token: token,
      } : {
        customer_session_token: token,
      }),
    };
    const response = await fetch(`${SUPABASE_URL}/functions/v1/notification-ops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify(body),
    });
    const parsed: unknown = await response.json().catch(() => null);
    const data = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, any>
      : {};
    if (!response.ok || typeof data.error === 'string') {
      console.error('[notifications] gateway error:', data.error ?? `HTTP ${response.status}`);
      return null;
    }

    // A 2xx response alone does not prove a notification was persisted.
    // Require the gateway to return a minimally identifiable notification
    // before callers treat this operation as successful.
    const notification = data?.notification;
    if (!notification
      || typeof notification.id !== 'string'
      || !notification.id.trim()
      || typeof notification.recipient_type !== 'string'
      || typeof notification.recipient_id !== 'string'
      || typeof notification.title !== 'string'
      || typeof notification.type !== 'string') {
      console.error('[notifications] gateway returned an incomplete notification response');
      return null;
    }
    return notification as NotificationRow;
  } catch (err) {
    console.error('[notifications] gateway error:', err);
    return null;
  }
}

export async function createNotificationsBatch(inputs: CreateNotificationInput[]): Promise<number> {
  let count = 0;
  for (const input of inputs) {
    if (await createNotification(input)) count++;
  }
  return count;
}

export async function fetchNotifications(recipientType: NotificationRecipientType, recipientId: string, limit = 50): Promise<NotificationRow[]> {
  if (!['customer', 'technician', 'admin'].includes(recipientType)
    || typeof recipientId !== 'string' || !recipientId.trim() || recipientId.length > 200) {
    return [];
  }
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(1000, Math.floor(limit))) : 50;
  try {
    if (recipientType === 'admin') {
      const { notifications } = await adminData<{ notifications: NotificationRow[] }>('notifications', { limit: safeLimit });
      return Array.isArray(notifications) ? notifications.slice(0, safeLimit) : [];
    }
    const endpoint = recipientType === 'technician' ? 'technician-data' : 'customer-data';
    const sessionKey = recipientType === 'technician' ? 'vattams_technician_session' : 'vattams_customer_session';
    const token = sessionStorage.getItem(sessionKey);
    if (!token) return [];
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ action: 'account', session_token: token }),
    });
    if (!response.ok) return [];
    const parsed: unknown = await response.json().catch(() => null);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
    const data = parsed as Record<string, unknown>;
    const rows = recipientType === 'technician' ? data.jobNotifications : data.notifications;
    return Array.isArray(rows) ? rows.filter((row): row is NotificationRow =>
      Boolean(row && typeof row === 'object'
        && typeof (row as NotificationRow).id === 'string'
        && typeof (row as NotificationRow).title === 'string'
        && typeof (row as NotificationRow).is_read === 'boolean')
    ).slice(0, safeLimit) : [];
  } catch { return []; }
}

export async function fetchUnreadCount(recipientType: NotificationRecipientType, recipientId: string): Promise<number> {
  const rows = await fetchNotifications(recipientType, recipientId, 1000);
  return rows.filter((n) => !n.is_read).length;
}

export async function markAsRead(notificationId: string): Promise<boolean> {
  if (typeof notificationId !== 'string' || !notificationId.trim() || notificationId.length > 200) {
    return false;
  }
  try {
    const adminToken = sessionStorage.getItem('vattams_admin');
    if (adminToken) { await adminData('notification_read', { notification_id: notificationId }); return true; }
    const techToken = sessionStorage.getItem('vattams_technician_session');
    if (techToken) {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/technician-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'notification_read',
          session_token: techToken,
          notification_id: notificationId,
          source: 'job',
        }),
      });
      return res.ok;
    }
    const customerToken = sessionStorage.getItem('vattams_customer_session');
    if (customerToken) {
      const res=await fetch(`${SUPABASE_URL}/functions/v1/customer-data`, { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${SUPABASE_ANON_KEY}`}, body:JSON.stringify({action:'notification_read',session_token:customerToken,notification_id:notificationId}) });
      return res.ok;
    }
  } catch {}
  return false;
}

export async function markAllAsRead(recipientType: NotificationRecipientType, recipientId: string): Promise<boolean> {
  if (!['customer', 'technician', 'admin'].includes(recipientType)
    || typeof recipientId !== 'string' || !recipientId.trim() || recipientId.length > 200) {
    return false;
  }
  try {
    if (recipientType === 'admin') {
      // adminData throws for HTTP failures and gateway error payloads.
      await adminData('notifications_read_all');
      return true;
    }
    const endpoint=recipientType==='technician'?'technician-data':'customer-data';
    const token=sessionStorage.getItem(recipientType==='technician'?'vattams_technician_session':'vattams_customer_session');
    if(!token) return false;
    const res=await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${SUPABASE_ANON_KEY}`},body:JSON.stringify({action:'notifications_read_all',session_token:token})});
    return res.ok;
  } catch { return false; }
}

export async function deleteNotification(notificationId: string): Promise<boolean> {
  if (typeof notificationId !== 'string' || !notificationId.trim() || notificationId.length > 200) {
    return false;
  }
  try {
    if (typeof sessionStorage === 'undefined' || !sessionStorage.getItem('vattams_admin')) {
      return false;
    }
    await adminData('notification_delete', { notification_id: notificationId });
    return true;
  } catch {
    return false;
  }
  // Notification deletion is intentionally not exposed to customer/technician clients.
}

export function subscribeToNotifications(
  _recipientType: NotificationRecipientType,
  _recipientId: string,
  _onNew: (notification: NotificationRow) => void,
): (() => void) | null {
  // Custom session authentication is not represented by Supabase Auth.
  // Do not expose notification rows through client Realtime.
  return null;
}


async function notify(
  recipientType: NotificationRecipientType,
  recipientId: string,
  title: string,
  message: string,
  type: string,
  referenceId?: string,
): Promise<NotificationRow | null> {
  return createNotification({
    recipientType,
    recipientId,
    title,
    message,
    type,
    referenceType: referenceId ? 'booking' : undefined,
    referenceId,
    channels: ['in_app', 'push'],
  });
}

export const notifyCustomer = {
  serviceStarted: (mobile: string, bookingNumber: string, bookingId: string) =>
    notify('customer', mobile, 'Service Started', `Service for booking ${bookingNumber} has started.`, 'service_started', bookingId),
  serviceCompleted: (mobile: string, bookingNumber: string, bookingId: string) =>
    notify('customer', mobile, 'Service Completed', `Service for booking ${bookingNumber} has been completed.`, 'service_completed', bookingId),
  bookingCancelled: (mobile: string, bookingNumber: string, bookingId: string) =>
    notify('customer', mobile, 'Booking Cancelled', `Booking ${bookingNumber} has been cancelled.`, 'booking_cancelled', bookingId),
  technicianAssigned: (mobile: string, bookingNumber: string, technicianName: string, bookingId: string) =>
    notify('customer', mobile, 'Technician Assigned', `${technicianName} has been assigned to booking ${bookingNumber}.`, 'technician_assigned', bookingId),
  bookingReceived: (mobile: string, bookingNumber: string, bookingId: string, bookingActionToken?: string) =>
    createNotification({ recipientType: 'customer', recipientId: mobile, title: 'Booking Received', message: 'Booking ' + bookingNumber + ' has been received.', type: 'booking_received', referenceType: 'booking', referenceId: bookingId, channels: ['in_app', 'push'], bookingActionToken }),
};

export const notifyTechnician = {
  jobAssigned: (technicianId: string, bookingNumber: string, jobId: string) =>
    notify('technician', technicianId, 'New Job Assigned', `Booking ${bookingNumber} has been assigned to you.`, 'job_assigned', jobId),
  jobCancelled: (technicianId: string, bookingNumber: string) =>
    notify('technician', technicianId, 'Job Cancelled', `Booking ${bookingNumber} has been cancelled.`, 'job_cancelled'),
  registrationApproved: (technicianId: string, name: string) =>
    notify('technician', technicianId, 'Registration Approved', `Welcome ${name}. Your technician registration is approved.`, 'registration_approved'),
  registrationRejected: (technicianId: string, name: string) =>
    notify('technician', technicianId, 'Registration Update', `Your technician registration for ${name} was not approved.`, 'registration_rejected'),
  walletRechargeApproved: (technicianId: string, amount: number) =>
    notify('technician', technicianId, 'Wallet Recharge Approved', `Your wallet recharge of ₹${amount} was approved.`, 'wallet_recharge_approved'),
  walletRechargeRejected: (technicianId: string, amount: number) =>
    notify('technician', technicianId, 'Wallet Recharge Rejected', `Your wallet recharge of ₹${amount} was rejected.`, 'wallet_recharge_rejected'),
};


export async function sendAnnouncementToTechnicians(
  recipients: Array<{ id: string }>,
  title: string,
  message: string,
): Promise<number> {
  return createNotificationsBatch(recipients.map((r) => ({
    recipientType: 'technician',
    recipientId: r.id,
    title,
    message,
    type: 'announcement',
  })));
}

export async function sendAnnouncementToCustomers(
  recipients: string[],
  title: string,
  message: string,
): Promise<number> {
  return createNotificationsBatch(recipients.map((id) => ({
    recipientType: 'customer',
    recipientId: id,
    title,
    message,
    type: 'announcement',
  })));
}
