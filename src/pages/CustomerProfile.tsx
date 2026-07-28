import { useState, useEffect } from 'react';
import { Loader, User, Phone, Mail, MapPin, Home, Save, LogOut, Calendar, Briefcase, CheckCircle } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase, Customer } from '@/lib/supabase';

export default function CustomerProfile() {
  const { navigate } = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ full_name: '', email: '', city: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [bookingCount, setBookingCount] = useState(0);

  useEffect(() => {
    const stored = sessionStorage.getItem('vattams_customer');
    if (!stored) { navigate('customer-login'); return; }
    try {
      const c = JSON.parse(stored) as Customer;
      setCustomer(c);
      setForm({ full_name: c.full_name, email: c.email ?? '', city: c.city ?? '', address: c.address ?? '' });
      loadBookingCount(c.id);
    } catch { navigate('customer-login'); }
    setLoading(false);
  }, []);

  const loadBookingCount = async (customerId: string) => {
    const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('customer_id', customerId);
    setBookingCount(count ?? 0);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setSaving(true);
    setMsg(null);
    try {
      const { data, error } = await supabase.from('customers')
        .update({ full_name: form.full_name, email: form.email || null, city: form.city || null, address: form.address || null, updated_at: new Date().toISOString() })
        .eq('id', customer.id)
        .select('id, full_name, mobile, email, city, address, created_at, updated_at')
        .single();
      if (error) throw error;
      if (data) {
        setCustomer(data);
        sessionStorage.setItem('vattams_customer', JSON.stringify(data));
        setMsg({ type: 'success', text: 'Profile updated successfully!' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Failed to update profile. Please try again.' });
    }
    setSaving(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('vattams_customer');
    navigate('home');
  };

  if (loading || !customer) {
    return <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-gray-50"><Loader className="animate-spin text-blue-600" size={32} /></div>;
  }

  return (
    <div className="pt-20 md:pt-24 min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">My Profile</h1>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3"><Briefcase size={18} className="text-blue-600" /></div>
            <div className="text-2xl font-extrabold text-gray-900">{bookingCount}</div>
            <div className="text-xs text-gray-400 font-medium">Total Bookings</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-3"><CheckCircle size={18} className="text-green-600" /></div>
            <div className="text-2xl font-extrabold text-gray-900">{customer.mobile}</div>
            <div className="text-xs text-gray-400 font-medium">Mobile Number</div>
          </div>
        </div>

        {msg && <div className={'rounded-xl p-3 text-sm mb-4 ' + (msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}>{msg.text}</div>}

        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center"><User size={22} className="text-blue-600" /></div>
            <div>
              <div className="font-bold text-gray-900">{customer.full_name}</div>
              <div className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={11} /> Joined {new Date(customer.created_at).toLocaleDateString('en-IN')}</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mobile Number (cannot change)</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input value={customer.mobile} disabled className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">City</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Address</label>
            <div className="relative">
              <Home size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors">
            {saving ? <Loader size={18} className="animate-spin" /> : <Save size={18} />} Save Changes
          </button>
        </form>

        <button onClick={() => navigate('customer-bookings')} className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors">
          <Briefcase size={18} /> View My Bookings
        </button>
      </div>
    </div>
  );
}
