import { useState, useEffect, useRef } from 'react';
import { Mail, MapPin, Send, Loader, Headphones, ChevronRight } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { Customer } from '@/lib/supabase';
import { customerData } from '@/lib/customerData';
import CommunicationCenter, { SUPPORT_PHONE } from '@/components/CommunicationCenter';

const SUPPORT_EMAIL = 'support@vattams.net';

export default function CustomerSupport() {
  const { navigate } = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const clearSession = () => {
      try {
        sessionStorage.removeItem('vattams_customer');
        sessionStorage.removeItem('vattams_customer_session');
        sessionStorage.removeItem('vattams_customer_expires');
      } catch {
        // Keep the redirect path available if storage cleanup is blocked.
      }
    };

    let stored: string | null;
    let sessionToken: string | null;
    let expiresAt: number;
    try {
      stored = sessionStorage.getItem('vattams_customer');
      sessionToken = sessionStorage.getItem('vattams_customer_session');
      expiresAt = Number(sessionStorage.getItem('vattams_customer_expires'));
    } catch {
      clearSession();
      navigate('customer-login');
      return;
    }

    if (!stored || !sessionToken || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      clearSession();
      navigate('customer-login');
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Partial<Customer>;
      if (typeof parsed.id !== 'string' || !parsed.id.trim()
        || typeof parsed.mobile !== 'string' || !parsed.mobile.trim()
        || typeof parsed.full_name !== 'string' || !parsed.full_name.trim()) {
        throw new Error('Incomplete customer profile');
      }
      setCustomer(parsed as Customer);
    } catch {
      clearSession();
      navigate('customer-login');
    }
  }, [navigate]);

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearToastTimeout = () => {
    if (toastTimeoutRef.current !== null) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
  };

  useEffect(() => () => clearToastTimeout(), []);

  const showToast = (type: 'success' | 'error', text: string) => {
    clearToastTimeout();
    setToast({ type, text });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || sending) return;
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();
    if (!cleanSubject || !cleanMessage) { showToast('error', 'Please fill in all fields.'); return; }
    if (cleanSubject.length > 120 || cleanMessage.length > 2000) {
      showToast('error', 'Please shorten your subject or message and try again.');
      return;
    }

    setSending(true);
    try {
      const result = await customerData<{ success?: unknown }>('support', {
        subject: cleanSubject,
        message: cleanMessage,
      });
      if (!result || typeof result !== 'object' || result.success !== true) {
        throw new Error('Failed to send support message');
      }
      showToast('success', 'Message sent! Our team will get back to you shortly.');
      setSubject('');
      setMessage('');
    } catch {
      showToast('error', 'Failed to send message. Please try WhatsApp or call us directly.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="pt-20 md:pt-24 min-h-screen bg-ivory-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6 flex items-center gap-2"><Headphones size={24} className="text-gold-700" /> Customer Support</h1>

        {toast && (
          <div role={toast.type === 'error' ? 'alert' : 'status'} aria-live={toast.type === 'error' ? 'assertive' : 'polite'} className={`rounded-xl p-3 text-sm mb-4 ${toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{toast.text}</div>
        )}

        {/* Quick Support Options */}
        <div className="mb-6">
          <CommunicationCenter variant="full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
          <a href={`mailto:${SUPPORT_EMAIL}`} className="bg-white rounded-2xl border border-gold-200/60 shadow-[0_12px_35px_rgba(5,10,23,0.06)] p-5 hover:shadow-md hover:border-gold-300 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-gold-100 flex items-center justify-center mb-3 group-hover:bg-gold-500 transition-colors">
              <Mail size={20} className="text-gold-700 group-hover:text-white transition-colors" />
            </div>
            <div className="font-bold text-gray-900 text-sm">Email Support</div>
            <div className="text-xs text-gray-500 mt-1">{SUPPORT_EMAIL}</div>
          </a>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-2xl border border-gold-200/60 shadow-[0_12px_35px_rgba(5,10,23,0.06)] p-6">
          <h2 className="font-bold text-gray-900 text-sm mb-4">Send Us a Message</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="support-subject" className="block text-sm font-semibold text-gray-700 mb-1.5">Subject</label>
              <input id="support-subject" name="subject" type="text" required maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)}
                placeholder="What do you need help with?"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none text-sm" />
            </div>
            <div>
              <label htmlFor="support-message" className="block text-sm font-semibold text-gray-700 mb-1.5">Message</label>
              <textarea id="support-message" name="message" required maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} rows={5}
                placeholder="Describe your issue in detail..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none text-sm resize-none" />
            </div>
            <button type="submit" disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-3 bg-navy-950 hover:bg-navy-900 disabled:opacity-60 text-white font-bold rounded-xl transition-colors">
              {sending ? <Loader size={18} className="animate-spin" /> : <Send size={18} />} Send Message
            </button>
          </form>
        </div>

        {/* Business Info */}
        <div className="bg-white rounded-2xl border border-gold-200/60 shadow-[0_12px_35px_rgba(5,10,23,0.06)] p-6 mt-6">
          <h2 className="font-bold text-gray-900 text-sm mb-4">Business Information</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="font-semibold">{SUPPORT_PHONE}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Mail size={16} className="text-gray-400" /> {SUPPORT_EMAIL}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <MapPin size={16} className="text-gray-400" /> Tamil Nadu, India
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Quick Links</div>
            <div className="space-y-1">
              <button onClick={() => navigate('customer-dashboard')} className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gold-700 py-1">
                <span>Dashboard</span><ChevronRight size={16} />
              </button>
              <button onClick={() => navigate('customer-bookings')} className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gold-700 py-1">
                <span>My Bookings</span><ChevronRight size={16} />
              </button>
              <button onClick={() => navigate('customer-payments')} className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gold-700 py-1">
                <span>Payments</span><ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
