import { supabase } from '@/lib/supabase';
import { adminData } from '@/lib/adminData';
import { sendPushNotification } from '@/lib/fcm';

export type NotificationRecipientType = 'customer' | 'technician' | 'admin';
export type NotificationStatus = 'sent' | 'delivered' | 'read' | 'failed';

async function sendPushForNotification(
  input: CreateNotificationInput,
): Promise<void> {
  if (input.recipientType === 'admin') return;
  try {
    await sendPushNotification(
      input.recipientType,
      input.recipientId,
      input.title,
      input.message,
      {
        type: input.type,
        referenceType: input.referenceType ?? '',
        referenceId: input.referenceId ?? '',
      },
    );
  } catch (err) {
    console.error('[notifications] push send error:', err);
  }
}

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
  try {
    const sessionKey =
      input.recipientType === 'admin' ? 'vattams_admin' :
      input.recipientType === 'technician' ? 'vattams_technician_session' :
      'vattams_customer_session';
    const token = input.bookingActionToken || sessionStorage.getItem(sessionKey) || '';
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
    const data = await response.json();
    if (!response.ok || data.error) {
      console.error('[notifications] gateway error:', data.error);
      return null;
    }
    void sendPushForNotification(input);
    return data.notification as NotificationRow;
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
  if (recipientType === 'admin') {
    try {
      const { notifications } = await adminData<{ notifications: NotificationRow[] }>('notifications', { limit });
      return notifications ?? [];
    } catch {
      return [];
    }
  }
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_type', recipientType)
    .eq('recipient_id', recipientId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[notifications] fetch error:', error);
    return [];
  }
  return (data ?? []) as NotificationRow[];
}

export async function fetchUnreadCount(recipientType: NotificationRecipientType, recipientId: string): Promise<number> {
  if (recipientType === 'admin') {
    try {
      const { notifications } = await adminData<{ notifications: NotificationRow[] }>('notifications', { limit: 1000 });
      return (notifications ?? []).filter((n) => !n.is_read).length;
    } catch {
      return 0;
    }
  }
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_type', recipientType)
    .eq('recipient_id', recipientId)
    .eq('is_read', false);
  if (error) return 0;
  return count ?? 0;
}

export async function markAsRead(notificationId: string): Promise<boolean> {
  if (sessionStorage.getItem('vattams_admin')) {
    try { await adminData('notification_read', { notification_id: notificationId }); return true; } catch { return false; }
  }
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString(), status: 'read' })
    .eq('id', notificationId);
  if (error) console.error('[notifications] markAsRead error:', error);
  return !error;
}

export async function markAllAsRead(recipientType: NotificationRecipientType, recipientId: string): Promise<boolean> {
  if (recipientType === 'admin') {
    try { await adminData('notifications_read_all'); return true; } catch { return false; }
  }
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString(), status: 'read' })
    .eq('recipient_type', recipientType)
    .eq('recipient_id', recipientId)
    .eq('is_read', false);
  if (error) console.error('[notifications] markAllAsRead error:', error);
  return !error;
}

export async function deleteNotification(notificationId: string): Promise<boolean> {
  if (sessionStorage.getItem('vattams_admin')) {
    try { await adminData('notification_delete', { notification_id: notificationId }); return true; } catch { return false; }
  }
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);
  if (error) console.error('[notifications] delete error:', error);
  return !error;
}

export function subscribeToNotifications(
  recipientType: NotificationRecipientType,
  recipientId: string,
  onNew: (notification: NotificationRow) => void,
): (() => void) | null {
  // Custom admin sessions are not represented by Supabase Auth; do not expose
  // the notifications table through a client Realtime subscription.
  if (recipientType === 'admin') return null;
  const channel = supabase
    .channel(`notifications:${recipientType}:${recipientId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_type=eq.${recipientType}`,
      },
      (payload) => {
        const row = payload.new as NotificationRow;
        if (row.recipient_id === recipientId) {
          onNew(row);
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ---- Typed notification creators for each event ----

export const notifyCustomer = {
  bookingReceived: (mobile: string, bookingNumber: string, bookingId: string) =>
    createNotification({
      recipientType: 'customer', recipientId: mobile,
      title: 'Booking Received',
      message: `Your booking ${bookingNumber} has been received. We'll assign a technician shortly.`,
      type: 'booking_received', referenceType: 'booking', referenceId: bookingId,
    }),
  technicianAssigned: (mobile: string, bookingNumber: string, techName: string, bookingId: string) =>
    createNotification({
      recipientType: 'customer', recipientId: mobile,
      title: 'Technician Assigned',
      message: `${techName} has been assigned to your booking ${bookingNumber}.`,
      type: 'technician_assigned', referenceType: 'booking', referenceId: bookingId,
    }),
  technicianOnWay: (mobile: string, bookingNumber: string, techName: string, bookingId: string) =>
    createNotification({
      recipientType: 'customer', recipientId: mobile,
      title: 'Technician On the Way',
      message: `${techName} is on the way to your location for booking ${bookingNumber}.`,
      type: 'technician_on_way', referenceType: 'booking', referenceId: bookingId,
    }),
  serviceStarted: (mobile: string, bookingNumber: string, bookingId: string) =>
    createNotification({
      recipientType: 'customer', recipientId: mobile,
      title: 'Service Started',
      message: `Work has started on your booking ${bookingNumber}.`,
      type: 'service_started', referenceType: 'booking', referenceId: bookingId,
    }),
  serviceCompleted: (mobile: string, bookingNumber: string, bookingId: string) =>
    createNotification({
      recipientType: 'customer', recipientId: mobile,
      title: 'Service Completed',
      message: `Your service for booking ${bookingNumber} has been completed. Thank you for choosing VATTAMS!`,
      type: 'service_completed', referenceType: 'booking', referenceId: bookingId,
    }),
  paymentReceived: (mobile: string, bookingNumber: string, amount: number, bookingId: string) =>
    createNotification({
      recipientType: 'customer', recipientId: mobile,
      title: 'Payment Received',
      message: `We've received your payment of ₹${amount.toLocaleString('en-IN')} for booking ${bookingNumber}.`,
      type: 'payment_received', referenceType: 'booking', referenceId: bookingId,
    }),
  bookingCancelled: (mobile: string, bookingNumber: string, bookingId: string) =>
    createNotification({
      recipientType: 'customer', recipientId: mobile,
      title: 'Booking Cancelled',
      message: `Your booking ${bookingNumber} has been cancelled. If this was unexpected, please contact us.`,
      type: 'booking_cancelled', referenceType: 'booking', referenceId: bookingId,
    }),
  bookingAccepted: (mobile: string, bookingNumber: string, techName: string, bookingId: string) =>
    createNotification({
      recipientType: 'customer', recipientId: mobile,
      title: 'Booking Accepted',
      message: `${techName} has accepted your booking ${bookingNumber}. They will be on their way shortly.`,
      type: 'booking_accepted', referenceType: 'booking', referenceId: bookingId,
    }),
  jobStarted: (mobile: string, bookingNumber: string, bookingId: string) =>
    createNotification({
      recipientType: 'customer', recipientId: mobile,
      title: 'Job Started',
      message: `The technician has started work on your booking ${bookingNumber}.`,
      type: 'job_started', referenceType: 'booking', referenceId: bookingId,
    }),
  jobCompleted: (mobile: string, bookingNumber: string, bookingId: string) =>
    createNotification({
      recipientType: 'customer', recipientId: mobile,
      title: 'Job Completed',
      message: `Your booking ${bookingNumber} has been completed. Please rate your experience!`,
      type: 'job_completed', referenceType: 'booking', referenceId: bookingId,
    }),
  otpGenerated: (mobile: string, bookingNumber: string, otp: string, purpose: string, bookingId: string) =>
    createNotification({
      recipientType: 'customer', recipientId: mobile,
      title: `OTP for ${purpose}`,
      message: `Your OTP for booking ${bookingNumber} is ${otp}. Share it with the technician to ${purpose.toLowerCase()}.`,
      type: 'otp_generated', referenceType: 'booking', referenceId: bookingId,
    }),
};

export const notifyTechnician = {
  registrationSubmitted: (techId: string, techName: string) =>
    createNotification({
      recipientType: 'technician', recipientId: techId,
      title: 'Registration Submitted',
      message: `Hello ${techName}, your registration has been submitted. Our team will review it shortly.`,
      type: 'registration_submitted', referenceType: 'technician', referenceId: techId,
    }),
  registrationApproved: (techId: string, techName: string) =>
    createNotification({
      recipientType: 'technician', recipientId: techId,
      title: 'Registration Approved!',
      message: `Congratulations ${techName}! Your registration has been approved. You can now start accepting jobs.`,
      type: 'registration_approved', referenceType: 'technician', referenceId: techId,
    }),
  registrationRejected: (techId: string, techName: string) =>
    createNotification({
      recipientType: 'technician', recipientId: techId,
      title: 'Registration Update',
      message: `Hello ${techName}, your registration was not approved at this time. Please contact us for details.`,
      type: 'registration_rejected', referenceType: 'technician', referenceId: techId,
    }),
  jobAssigned: (techId: string, bookingNumber: string, jobId: string) =>
    createNotification({
      recipientType: 'technician', recipientId: techId,
      title: 'New Job Assigned',
      message: `You've been assigned a new job for booking ${bookingNumber}. Check your dashboard for details.`,
      type: 'job_assigned', referenceType: 'job', referenceId: jobId,
    }),
  jobCancelled: (techId: string, bookingNumber: string) =>
    createNotification({
      recipientType: 'technician', recipientId: techId,
      title: 'Job Cancelled',
      message: `The job for booking ${bookingNumber} has been cancelled.`,
      type: 'job_cancelled', referenceType: 'booking', referenceId: bookingNumber,
    }),
  walletRechargeApproved: (techId: string, amount: number) =>
    createNotification({
      recipientType: 'technician', recipientId: techId,
      title: 'Wallet Recharge Approved',
      message: `Your wallet recharge of ₹${amount.toLocaleString('en-IN')} has been approved and credited to your wallet.`,
      type: 'wallet_recharge_approved', referenceType: 'wallet', referenceId: techId,
    }),
  walletRechargeRejected: (techId: string, amount: number) =>
    createNotification({
      recipientType: 'technician', recipientId: techId,
      title: 'Wallet Recharge Rejected',
      message: `Your wallet recharge request of ₹${amount.toLocaleString('en-IN')} was rejected. Please contact admin.`,
      type: 'wallet_recharge_rejected', referenceType: 'wallet', referenceId: techId,
    }),
  depositReleased: (techId: string, amount: number) =>
    createNotification({
      recipientType: 'technician', recipientId: techId,
      title: 'Security Deposit Released',
      message: `Your ₹${amount.toLocaleString('en-IN')} security deposit has been released after completing 3 jobs. It's now available in your wallet.`,
      type: 'deposit_released', referenceType: 'wallet', referenceId: techId,
    }),
  commissionDeducted: (techId: string, amount: number) =>
    createNotification({
      recipientType: 'technician', recipientId: techId,
      title: 'Commission Deducted',
      message: `A commission of ₹${amount.toLocaleString('en-IN')} has been deducted from your wallet.`,
      type: 'commission_deducted', referenceType: 'wallet', referenceId: techId,
    }),
  accountLocked: (techId: string) =>
    createNotification({
      recipientType: 'technician', recipientId: techId,
      title: 'Account Locked',
      message: `Your account has been locked due to pending commission. Please recharge your wallet to unlock.`,
      type: 'account_locked', referenceType: 'technician', referenceId: techId,
    }),
  accountUnlocked: (techId: string) =>
    createNotification({
      recipientType: 'technician', recipientId: techId,
      title: 'Account Unlocked',
      message: `Your account has been unlocked. You can now accept new jobs.`,
      type: 'account_unlocked', referenceType: 'technician', referenceId: techId,
    }),
  newBooking: (techId: string, bookingNumber: string, serviceCategory: string, jobId: string) =>
    createNotification({
      recipientType: 'technician', recipientId: techId,
      title: 'New Booking Available',
      message: `New ${serviceCategory} booking ${bookingNumber} is available. Accept it before others do!`,
      type: 'new_booking', referenceType: 'job', referenceId: jobId,
    }),
};

export const notifyAdmin = {
  newBooking: (bookingNumber: string, customerName: string, service: string, bookingId: string) =>
    createNotification({
      recipientType: 'admin', recipientId: 'admin',
      title: 'New Customer Booking',
      message: `New booking ${bookingNumber} from ${customerName} for ${service}.`,
      type: 'new_booking', referenceType: 'booking', referenceId: bookingId,
    }),
  newTechnicianRegistration: (techName: string, techId: string) =>
    createNotification({
      recipientType: 'admin', recipientId: 'admin',
      title: 'New Technician Registration',
      message: `${techName} has registered as a technician. Review their application.`,
      type: 'new_technician_registration', referenceType: 'technician', referenceId: techId,
    }),
  newWalletRechargeRequest: (techName: string, amount: number, rechargeId: string) =>
    createNotification({
      recipientType: 'admin', recipientId: 'admin',
      title: 'New Wallet Recharge Request',
      message: `${techName} requested a wallet recharge of ₹${amount.toLocaleString('en-IN')}.`,
      type: 'new_wallet_recharge', referenceType: 'wallet_recharge', referenceId: rechargeId,
    }),
  paymentReceived: (payerName: string, amount: number, paymentId: string) =>
    createNotification({
      recipientType: 'admin', recipientId: 'admin',
      title: 'Payment Received',
      message: `Payment of ₹${amount.toLocaleString('en-IN')} received from ${payerName}.`,
      type: 'admin_payment_received', referenceType: 'payment', referenceId: paymentId,
    }),
  newReview: (customerName: string, techName: string, rating: number) =>
    createNotification({
      recipientType: 'admin', recipientId: 'admin',
      title: 'New Customer Review',
      message: `${customerName} rated ${techName} ${rating}/5.`,
      type: 'new_review',
    }),
  failedPayment: (payerName: string, amount: number, paymentId: string) =>
    createNotification({
      recipientType: 'admin', recipientId: 'admin',
      title: 'Failed Payment',
      message: `Payment of ₹${amount.toLocaleString('en-IN')} from ${payerName} has failed.`,
      type: 'failed_payment', referenceType: 'payment', referenceId: paymentId,
    }),
  systemError: (errorMessage: string) =>
    createNotification({
      recipientType: 'admin', recipientId: 'admin',
      title: 'System Error',
      message: errorMessage,
      type: 'system_error',
    }),
};

export async function sendAnnouncementToTechnicians(technicians: { id: string; full_name: string }[], title: string, message: string): Promise<number> {
  const count = await createNotificationsBatch(
    technicians.map((t) => ({
      recipientType: 'technician' as const,
      recipientId: t.id,
      title,
      message,
      type: 'announcement',
      referenceType: 'announcement',
    })),
  );
  for (const t of technicians) void sendPushNotification('technician', t.id, title, message, { type: 'announcement' });
  return count;
}

export async function sendAnnouncementToCustomers(mobiles: string[], title: string, message: string): Promise<number> {
  const count = await createNotificationsBatch(
    mobiles.map((m) => ({
      recipientType: 'customer' as const,
      recipientId: m,
      title,
      message,
      type: 'announcement',
      referenceType: 'announcement',
    })),
  );
  for (const m of mobiles) void sendPushNotification('customer', m, title, message, { type: 'announcement' });
  return count;
}
