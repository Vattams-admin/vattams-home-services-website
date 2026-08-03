import { useState, useEffect } from 'react';
import { Tag, Loader, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchActiveCoupons, type Coupon } from '@/lib/coupons';

interface CouponForm {
  code: string;
  description: string;
  discount_type: 'percentage' | 'flat';
  discount_value: string;
  max_uses: string;
  min_order_amount: string;
  valid_until: string;
}

const EMPTY_FORM: CouponForm = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '10',
  max_uses: '',
  min_order_amount: '0',
  valid_until: '',
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await fetchActiveCoupons();
    setCoupons(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.code.trim()) return;
    setSaving(true);
    await supabase.from('coupons').insert({
      code: form.code.toUpperCase().trim(),
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      min_order_amount: Number(form.min_order_amount),
      valid_until: form.valid_until || null,
      is_active: true,
    });
    setSaving(false);
    setShowForm(false);
    setForm(EMPTY_FORM);
    load();
  };

  const handleToggle = async (id: string, current: boolean) => {
    await supabase.from('coupons').update({ is_active: !current, updated_at: new Date().toISOString() }).eq('id', id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1 flex items-center gap-2">
            <Tag size={24} className="text-blue-600" /> Coupons
          </h2>
          <p className="text-gray-500 text-sm">Create and manage discount coupons for the AI Price Calculator.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
          <Plus size={16} /> New Coupon
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-gray-900 text-sm">Create New Coupon</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Coupon Code</label>
              <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SUMMER20"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. 20% off summer special"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Discount Type</label>
              <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'percentage' | 'flat' })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500">
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Discount Value</label>
              <input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Max Uses (blank = unlimited)</label>
              <input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Min Order Amount (₹)</label>
              <input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Valid Until (blank = no expiry)</label>
              <input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.code.trim()}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors">
              {saving ? 'Saving...' : 'Create Coupon'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader className="animate-spin text-blue-600" size={24} /></div>
      ) : coupons.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Tag size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No coupons yet. Create one to offer discounts to customers!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-extrabold text-gray-900 text-lg font-mono">{c.code}</div>
                  <div className="text-xs text-gray-500">{c.description}</div>
                </div>
                <button onClick={() => handleToggle(c.id, c.is_active)}
                  className={'px-2 py-1 rounded-full text-xs font-semibold ' + (c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>
              <div className="text-sm text-blue-600 font-bold mb-2">
                {c.discount_type === 'percentage' ? `${c.discount_value}% off` : `₹${c.discount_value} off`}
              </div>
              <div className="text-xs text-gray-400 space-y-0.5">
                {c.max_uses && <div>Max uses: {c.max_uses} (used: {c.used_count})</div>}
                {c.min_order_amount > 0 && <div>Min order: ₹{c.min_order_amount}</div>}
                {c.valid_until && <div>Valid until: {new Date(c.valid_until).toLocaleDateString('en-IN')}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
