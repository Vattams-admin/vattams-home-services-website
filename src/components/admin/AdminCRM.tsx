import { useState, useEffect } from 'react';
import { Calendar, Loader, Send, Bell, CheckCircle, Clock, X } from 'lucide-react';
import { fetchAllReminders, markReminderSent, type CRMReminder } from '@/lib/crm';

const REMINDER_TYPES: Record<string, { label: string; color: string }> = {
  booking_reminder: { label: 'Booking Reminder', color: 'bg-blue-100 text-blue-700' },
  review_request: { label: 'Review Request', color: 'bg-purple-100 text-purple-700' },
  amc_reminder: { label: 'AMC Reminder', color: 'bg-green-100 text-green-700' },
  warranty_reminder: { label: 'Warranty Reminder', color: 'bg-amber-100 text-amber-700' },
  festival_offer: { label: 'Festival Offer', color: 'bg-pink-100 text-pink-700' },
  inactive_followup: { label: 'Inactive Follow-up', color: 'bg-orange-100 text-orange-700' },
  birthday_greeting: { label: 'Birthday Greeting', color: 'bg-red-100 text-red-700' },
  technician_renewal: { label: 'Technician Renewal', color: 'bg-cyan-100 text-cyan-700' },
};

export default function AdminCRM() {
  const [reminders, setReminders] = useState<CRMReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent'>('all');

  const load = async () => {
    setLoading(true);
    const data = await fetchAllReminders(100);
    setReminders(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSend = async (id: string) => {
    await markReminderSent(id);
    load();
  };

  const filtered = reminders.filter((r) => filter === 'all' || r.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-1 flex items-center gap-2">
          <Calendar size={24} className="text-blue-600" /> AI CRM
        </h2>
        <p className="text-gray-500 text-sm">Automated customer engagement: reminders, reviews, offers, and follow-ups.</p>
      </div>

      <div className="flex gap-2">
        {(['all', 'pending', 'sent'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={'px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ' +
              (filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-blue-50')}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader className="animate-spin text-blue-600" size={24} /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Bell size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No CRM reminders found. Reminders are auto-generated when bookings are completed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const typeInfo = REMINDER_TYPES[r.reminder_type] ?? { label: r.reminder_type, color: 'bg-gray-100 text-gray-700' };
            return (
              <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
                <div className={'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ' + typeInfo.color}>
                  <Bell size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-gray-900">{r.title}</span>
                    <span className={'px-2 py-0.5 rounded-full text-xs font-semibold ' + typeInfo.color}>{typeInfo.label}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{r.message}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>To: {r.recipient_name ?? r.recipient_id}</span>
                    <span>•</span>
                    <span>{new Date(r.scheduled_for).toLocaleDateString('en-IN')}</span>
                    {r.status === 'sent' && (
                      <span className="flex items-center gap-1 text-green-600"><CheckCircle size={12} /> Sent</span>
                    )}
                    {r.status === 'pending' && (
                      <span className="flex items-center gap-1 text-amber-600"><Clock size={12} /> Pending</span>
                    )}
                  </div>
                </div>
                {r.status === 'pending' && (
                  <button onClick={() => handleSend(r.id)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0">
                    <Send size={14} /> Send Now
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
