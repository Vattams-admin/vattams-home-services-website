import { useState, useEffect } from 'react';
import { Loader, CheckCircle, Calendar, User, Phone, MapPin, Wrench, FileText, Clock, ArrowRight, LucideIcon } from 'lucide-react';
import { supabase, ServiceCategory } from '@/lib/supabase';
import { useRouter } from '@/lib/router';

const tamilNaduCities = [
  'Chennai', 'Coimbatore', 'Madurai', 'Trichy', 'Salem',
  'Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi', 'Namakkal',
  'Thanjavur', 'Dindigul', 'Tiruppur', 'Hosur', 'Nagercoil',
  'Kanchipuram', 'Kumbakonam', 'Cuddalore', 'Puducherry', 'Villupuram',
  'Other',
];

const timeSlots = ['07:00 - 09:00', '09:00 - 11:00', '11:00 - 13:00', '13:00 - 15:00', '15:00 - 17:00', '17:00 - 19:00', '19:00 - 21:00'];

export default function Booking() {
  const { navigate } = useRouter();
  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ number: string } | null>(null);

  const [form, setForm] = useState({
    customer_name: '', mobile_number: '', city: 'Chennai', address: '',
    service_category: '', problem_description: '', preferred_date: '', preferred_time: '',
  });

  useEffect(() => {
    supabase.from('service_categories').select('*').order('created_at').then(({ data }) => {
      if (data) {
        setServices(data);
        if (data[0]) setForm((f) => ({ ...f, service_category: data[0].name }));
      }
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        customer_name: form.customer_name,
        mobile_number: form.mobile_number,
        city: form.city,
        address: form.address,
        service_category: form.service_category,
        problem_description: form.problem_description,
        preferred_date: form.preferred_date || null,
        preferred_time: form.preferred_time || null,
        status: 'pending',
      })
      .select('booking_number')
      .single();

    setSubmitting(false);
    if (error) {
      alert('Booking failed. Please try again or call us.');
      return;
    }
    setSuccess({ number: data.booking_number });
  };

  if (success) {
    return (
      <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-500 mb-4">Your service request has been received. Our team will contact you shortly.</p>
          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Your Booking Number</div>
            <div className="text-xl font-extrabold text-blue-700">{success.number}</div>
          </div>
          <p className="text-sm text-gray-500 mb-6">Save this number to track your booking status.</p>
          <div className="flex flex-col gap-3">
            <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors">
              Share on WhatsApp
            </a>
            <button onClick={() => navigate('home')}
              className="py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 md:pt-24">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Book a Service</h1>
          <p className="text-blue-200 max-w-lg mx-auto">
            Fill in the details below and our team will reach out to confirm your booking.
          </p>
        </div>
      </section>

      <section className="py-12 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader className="animate-spin text-blue-600" size={32} />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field icon={User} label="Customer Name *">
                    <input type="text" required value={form.customer_name}
                      onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      placeholder="Your full name" />
                  </Field>
                  <Field icon={Phone} label="Mobile Number *">
                    <input type="tel" required pattern="[0-9]{10}" value={form.mobile_number}
                      onChange={(e) => setForm({ ...form, mobile_number: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      placeholder="10-digit mobile number" />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field icon={MapPin} label="City *">
                    <select required value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white">
                      {tamilNaduCities.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field icon={Wrench} label="Service Category *">
                    <select required value={form.service_category}
                      onChange={(e) => setForm({ ...form, service_category: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white">
                      {services.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </Field>
                </div>

                <Field icon={MapPin} label="Address *">
                  <textarea required rows={2} value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
                    placeholder="Full address with landmark" />
                </Field>

                <Field icon={FileText} label="Problem Description">
                  <textarea rows={3} value={form.problem_description}
                    onChange={(e) => setForm({ ...form, problem_description: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
                    placeholder="Describe the issue you're facing..." />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field icon={Calendar} label="Preferred Date">
                    <input type="date" value={form.preferred_date} min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setForm({ ...form, preferred_date: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                  </Field>
                  <Field icon={Clock} label="Preferred Time">
                    <select value={form.preferred_time}
                      onChange={(e) => setForm({ ...form, preferred_time: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white">
                      <option value="">Any time</option>
                      {timeSlots.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                </div>

                <button type="submit" disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-200">
                  {submitting ? (
                    <><Loader size={18} className="animate-spin" /> Confirming...</>
                  ) : (
                    <>Confirm Booking <ArrowRight size={16} /></>
                  )}
                </button>
                <p className="text-center text-xs text-gray-400">
                  By booking, you agree to our terms. No payment required now — pay after service.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <Icon size={16} className="absolute left-3 top-3.5 text-gray-400 pointer-events-none" />
        {children}
      </div>
    </div>
  );
}
