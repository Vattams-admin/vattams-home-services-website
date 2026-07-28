import { useState } from 'react';
import { Phone, Mail, MapPin, MessageCircle, Send, Loader } from 'lucide-react';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    // Simulate send
    await new Promise((r) => setTimeout(r, 1200));
    setStatus('sent');
    setForm({ name: '', email: '', phone: '', message: '' });
    setTimeout(() => setStatus('idle'), 4000);
  };

  return (
    <div className="pt-20 md:pt-24">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-blue-200 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            Get in Touch
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">Contact Us</h1>
          <p className="text-blue-200 max-w-xl mx-auto text-base md:text-lg">
            Have a question? We're here to help. Reach out and we'll respond within 24 hours.
          </p>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-6">Contact Information</h2>
              <div className="space-y-4">
                {[
                  { icon: Phone, label: 'Call Us', value: '+91 98765 43210', href: 'tel:+919876543210', color: 'bg-blue-600' },
                  { icon: MessageCircle, label: 'WhatsApp', value: 'Chat with us', href: 'https://wa.me/919876543210', color: 'bg-green-500' },
                  { icon: Mail, label: 'Email', value: 'support@vattams.in', href: 'mailto:support@vattams.in', color: 'bg-amber-500' },
                  { icon: MapPin, label: 'Service Area', value: 'Across Tamil Nadu', href: '#', color: 'bg-rose-500' },
                ].map((c) => {
                  const Icon = c.icon;
                  return (
                    <a
                      key={c.label}
                      href={c.href}
                      target={c.href.startsWith('http') ? '_blank' : undefined}
                      rel="noreferrer"
                      className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
                    >
                      <div className={`w-12 h-12 rounded-xl ${c.color} flex items-center justify-center shrink-0`}>
                        <Icon size={22} className="text-white" />
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs font-medium uppercase tracking-wider">{c.label}</div>
                        <div className="text-gray-900 font-semibold">{c.value}</div>
                      </div>
                    </a>
                  );
                })}
              </div>

              <div className="mt-8 bg-blue-50 rounded-2xl p-6">
                <h3 className="font-bold text-gray-900 mb-2">Business Hours</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between"><span>Monday - Saturday</span><span className="font-medium">7:00 AM - 9:00 PM</span></div>
                  <div className="flex justify-between"><span>Sunday</span><span className="font-medium">8:00 AM - 6:00 PM</span></div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <h2 className="text-2xl font-extrabold text-gray-900 mb-6">Send a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
                  <input
                    type="text" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="Enter your name"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input
                      type="email" required value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                    <input
                      type="tel" required value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                  <textarea
                    required rows={5} value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
                    placeholder="How can we help you?"
                  />
                </div>
                <button
                  type="submit" disabled={status === 'sending'}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-200"
                >
                  {status === 'sending' ? (
                    <><Loader size={18} className="animate-spin" /> Sending...</>
                  ) : status === 'sent' ? (
                    <>Message Sent!</>
                  ) : (
                    <>Send Message <Send size={16} /></>
                  )}
                </button>
                {status === 'sent' && (
                  <p className="text-green-600 text-sm text-center font-medium">
                    Thank you! We'll get back to you within 24 hours.
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
