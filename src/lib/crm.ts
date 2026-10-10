import { adminData } from './adminData';

export interface CRMReminder {
  id: string;
  reminder_type: string;
  recipient_type: 'customer' | 'technician';
  recipient_id: string;
  recipient_name: string | null;
  title: string;
  message: string;
  scheduled_for: string;
  sent_at: string | null;
  status: string;
}

async function createReminder(input: Record<string, unknown>) {
  return adminData<{ reminder: CRMReminder }>('crm_reminder_create', { input });
}

export async function scheduleBookingReminder(bookingId: string, customerMobile: string, customerName: string, scheduledFor: string) {
  return createReminder({
    reminder_type: 'booking_reminder',
    recipient_type: 'customer',
    recipient_id: customerMobile,
    recipient_name: customerName,
    title: 'Booking Reminder',
    message: `Dear ${customerName}, this is a reminder for your upcoming VATTAMS booking.`,
    scheduled_for: scheduledFor,
    metadata: { booking_id: bookingId },
  });
}

export async function scheduleReviewRequest(bookingId: string, customerMobile: string, customerName: string) {
  return createReminder({
    reminder_type: 'review_request',
    recipient_type: 'customer',
    recipient_id: customerMobile,
    recipient_name: customerName,
    title: 'How was your service?',
    message: `Dear ${customerName}, please rate your recent VATTAMS service experience.`,
    scheduled_for: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    metadata: { booking_id: bookingId },
  });
}

export async function scheduleAMCReminder(customerMobile: string, customerName: string, serviceName: string, scheduledFor: string) {
  return createReminder({
    reminder_type: 'amc_reminder',
    recipient_type: 'customer',
    recipient_id: customerMobile,
    recipient_name: customerName,
    title: 'AMC Renewal Due',
    message: `Dear ${customerName}, your Annual Maintenance Contract for ${serviceName} is due for renewal.`,
    scheduled_for: scheduledFor,
  });
}

export async function scheduleWarrantyReminder(customerMobile: string, customerName: string, serviceName: string, scheduledFor: string) {
  return createReminder({
    reminder_type: 'warranty_reminder',
    recipient_type: 'customer',
    recipient_id: customerMobile,
    recipient_name: customerName,
    title: 'Warranty Expiring Soon',
    message: `Dear ${customerName}, your warranty for ${serviceName} is expiring soon.`,
    scheduled_for: scheduledFor,
  });
}

export async function scheduleFestivalOffer(customerMobile: string, customerName: string, festivalName: string, offerDetails: string) {
  return createReminder({
    reminder_type: 'festival_offer',
    recipient_type: 'customer',
    recipient_id: customerMobile,
    recipient_name: customerName,
    title: `${festivalName} Special Offer!`,
    message: `Dear ${customerName}, ${offerDetails}`,
    scheduled_for: new Date().toISOString(),
  });
}

export async function scheduleInactiveFollowup(customerMobile: string, customerName: string, lastBookingDate: string) {
  return createReminder({
    reminder_type: 'inactive_followup',
    recipient_type: 'customer',
    recipient_id: customerMobile,
    recipient_name: customerName,
    title: 'We miss you!',
    message: `Dear ${customerName}, we noticed you haven't booked with us since ${lastBookingDate}. Here's a special discount for your next service!`,
    scheduled_for: new Date().toISOString(),
  });
}

export async function scheduleBirthdayGreeting(customerMobile: string, customerName: string, birthday: string) {
  return createReminder({
    reminder_type: 'birthday_greeting',
    recipient_type: 'customer',
    recipient_id: customerMobile,
    recipient_name: customerName,
    title: 'Happy Birthday!',
    message: `Dear ${customerName}, VATTAMS wishes you a very Happy Birthday! Enjoy a special discount on your next booking.`,
    scheduled_for: birthday,
  });
}

export async function scheduleTechnicianRenewal(techId: string, techName: string, renewalDate: string) {
  return createReminder({
    reminder_type: 'technician_renewal',
    recipient_type: 'technician',
    recipient_id: techId,
    recipient_name: techName,
    title: 'Registration Renewal Due',
    message: `Dear ${techName}, your technician registration is due for renewal on ${renewalDate}.`,
    scheduled_for: renewalDate,
  });
}

export async function fetchPendingReminders(): Promise<CRMReminder[]> {
  try {
    const result = await adminData<{ reminders: CRMReminder[] }>('crm_reminders_list', { status: 'pending', limit: 250 });
    return result.reminders ?? [];
  } catch {
    return [];
  }
}

export async function fetchAllReminders(limit = 100): Promise<CRMReminder[]> {
  try {
    const result = await adminData<{ reminders: CRMReminder[] }>('crm_reminders_list', { limit });
    return result.reminders ?? [];
  } catch {
    return [];
  }
}

export async function markReminderSent(reminderId: string) {
  return adminData<{ reminder: CRMReminder }>('crm_reminder_mark_sent', { reminder_id: reminderId });
}
