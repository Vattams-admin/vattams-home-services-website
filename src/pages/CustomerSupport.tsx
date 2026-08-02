import { useState, useEffect } from 'react';
import { Mail, MapPin, Send, Loader, Headphones, ChevronRight } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase, Customer } from '@/lib/supabase';
import CommunicationCenter, { SUPPORT_PHONE, SUPPORT_WHATSAPP } from '@/components/CommunicationCenter';

const SUPPORT_EMAIL = 'support@vattams.net';

export default function CustomerSupport() {
  const { navigate } = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('vattams_customer');
    if (!stored) { navigate('customer-login'); return; }
    try { setCustomer(JSON.parse(stored) as Customer); } catch { navigate('customer-login'); }
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    if (!subject.trim() || !message.trim()) { showToast('error', 'Please fill in all fields.'); return; }

    setSending(true);
    try {
      const { error } = await supabase.from('support_messages').insert({
        customer_id: customer.id,
        customer_name: customer.full_name,
        customer_mobile: customer.mobile,
        subject: subject.trim(),
        message: message.trim(),
        status: 'open',
      });
      if (error) throw error;
      showToast('success', 'Message sent! Our team will get back to you shortly.');
      setSubject('');
      setMessage('');
    } catch {
      showToast('error', 'Failed to send message. Please try WhatsApp or call us directly.');
    }
    setSending(false);
  };

  return (
    <div className="pt-20 md:pt-24 min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6 flex items-center gap-2"><Headphones size={24} className="text-blue-600" /> Customer Support</h1>

        {toast && (
          <div className={`rounded-xl p-3 text-sm mb-4 ${toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{toast.text}</div>
        )}

        {/* Quick Support Options */}
        <div className="mb-6">
          <CommunicationCenter variant="full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
          <a href={`mailto:${SUPPORT_EMAIL}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-amber-200 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-3 group-hover:bg-amber-500 transition-colors">
              <Mail size={20} className="text-amber-600 group-hover:text-white transition-colors" />
            </div>
            <div className="font-bold text-gray-900 text-sm">Email Support</div>
            <div className="text-xs text-gray-500 mt-1">{SUPPORT_EMAIL}</div>
          </a>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 text-sm mb-4">Send Us a Message</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subject</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                placeholder="What do you need help with?"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5}
                placeholder="Describe your issue in detail..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm resize-none" />
            </div>
            <button type="submit" disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors">
              {sending ? <Loader size={18} className="animate-spin" /> : <Send size={18} />} Send Message
            </button>
          </form>
        </div>

        {/* Business Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-6">
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
              <button onClick={() => navigate('customer-dashboard')} className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-blue-600 py-1">
                <span>Dashboard</span><ChevronRight size={16} />
              </button>
              <button onClick={() => navigate('customer-bookings')} className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-blue-600 py-1">
                <span>My Bookings</span><ChevronRight size={16} />
              </button>
              <button onClick={() => navigate('customer-payments')} className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-blue-600 py-1">
                <span>Payments</span><ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
