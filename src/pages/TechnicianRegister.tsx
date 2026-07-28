import { useState } from 'react';
import { Loader, Wrench, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';

const tamilNaduCities = [
  'Chennai', 'Coimbatore', 'Madurai', 'Trichy', 'Salem',
  'Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi', 'Namakkal',
  'Thanjavur', 'Dindigul', 'Tiruppur', 'Hosur', 'Nagercoil', 'Other',
];

const specializations = [
  'AC Installation', 'AC Deep Cleaning', 'AC Gas Refill',
  'Refrigerator Repair', 'Washing Machine Repair', 'Microwave Repair',
  'Water Heater Repair', 'RO Water Purifier', 'Electrical Services', 'Plumbing Services',
];

export default function TechnicianRegister() {
  const { navigate } = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    full_name: '', mobile: '', email: '', city: 'Chennai',
    experience_years: '0', id_proof_type: 'Aadhaar', id_proof_number: '',
    specializations: [] as string[],
  });

  const toggleSpec = (spec: string) => {
    setForm((f) => ({
      ...f,
      specializations: f.specializations.includes(spec)
        ? f.specializations.filter((s) => s !== spec)
        : [...f.specializations, spec],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from('technicians').insert({
      full_name: form.full_name,
      mobile: form.mobile,
      email: form.email || null,
      city: form.city,
      specializations: form.specializations,
      experience_years: parseInt(form.experience_years) || 0,
      id_proof_type: form.id_proof_type,
      id_proof_number: form.id_proof_number,
      status: 'pending',
    });
    setSubmitting(false);
    if (error) {
      alert('Registration failed. Please try again.');
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Registration Submitted!</h2>
          <p className="text-gray-500 mb-6">
            Thank you for applying. Our team will verify your details and contact you within 48 hours.
          </p>
          <button onClick={() => navigate('home')}
            className="py-3 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 md:pt-24">
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-blue-200 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            <img src="/logo.svg" alt="VATTAMS" className="h-8 w-auto rounded-md" /> Join Our Team
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Technician Registration</h1>
          <p className="text-blue-200 max-w-lg mx-auto">
            Become a VATTAMS certified technician. Get steady jobs, fair pay, and grow your career.
          </p>
        </div>
      </section>

      <section className="py-12 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                  <input type="text" required value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="Your full name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile Number *</label>
                  <input type="tel" required pattern="[0-9]{10}" value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="10-digit mobile" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input type="email" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="you@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">City *</label>
                  <select required value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white">
                    {tamilNaduCities.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specializations *</label>
                <div className="flex flex-wrap gap-2">
                  {specializations.map((s) => (
                    <button key={s} type="button" onClick={() => toggleSpec(s)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        form.specializations.includes(s)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Experience (Years)</label>
                  <input type="number" min="0" value={form.experience_years}
                    onChange={(e) => setForm({ ...form, experience_years: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">ID Proof Type</label>
                  <select value={form.id_proof_type}
                    onChange={(e) => setForm({ ...form, id_proof_type: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white">
                    <option>Aadhaar</option>
                    <option>PAN</option>
                    <option>Driving License</option>
                    <option>Voter ID</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">ID Proof Number</label>
                  <input type="text" value={form.id_proof_number}
                    onChange={(e) => setForm({ ...form, id_proof_number: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="ID number" />
                </div>
              </div>

              <button type="submit" disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-200">
                {submitting ? <Loader size={18} className="animate-spin" /> : 'Submit Application'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
