import { useCallback, useEffect, useState } from 'react';
import { Loader, RefreshCw, Save, MapPin, ShieldCheck } from 'lucide-react';
import { adminData } from '@/lib/adminData';

type Service = {
  id: string; service_key: string; name: string; description: string | null; category: string;
  customer_pricing_mode: 'fixed' | 'starting_at' | 'quote'; customer_base_price: number | null; gst_rate: number;
  customer_platform_fee: number; technician_payout_mode: 'fixed' | 'per_job' | 'quote';
  technician_payout: number | null; requires_qualified_provider: boolean; requires_admin_review: boolean;
  is_active: boolean;
};
type CityAvailability = { id: string; service_id: string; city: string; is_available: boolean; admin_note: string | null };

const money = (value: number | null | undefined) => value == null ? '' : String(value);

export default function MarketplaceServiceManager() {
  const [services, setServices] = useState<Service[]>([]);
  const [cities, setCities] = useState<CityAvailability[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [city, setCity] = useState('');
  const [cityNote, setCityNote] = useState('');
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await adminData<{ services: Service[] }>('marketplace_services_list');
      const rows = result.services ?? [];
      setServices(rows);
      const current = rows.find((row) => row.id === selectedId) ?? rows[0];
      if (current) {
        setSelectedId(current.id);
        setForm({
          name: current.name, description: current.description ?? '', category: current.category,
          customer_pricing_mode: current.customer_pricing_mode, customer_base_price: money(current.customer_base_price),
          gst_rate: money(current.gst_rate), customer_platform_fee: money(current.customer_platform_fee),
          technician_payout_mode: current.technician_payout_mode, technician_payout: money(current.technician_payout),
          requires_qualified_provider: current.requires_qualified_provider, requires_admin_review: current.requires_admin_review,
          is_active: current.is_active,
        });
        const availability = await adminData<{ availability: CityAvailability[] }>('marketplace_city_availability_list', { service_id: current.id });
        setCities(availability.availability ?? []);
      } else {
        setCities([]);
      }
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Could not load marketplace services.' });
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => { void load(); }, [load]);

  const chooseService = async (id: string) => {
    const row = services.find((item) => item.id === id);
    if (!row) return;
    setSelectedId(id);
    setForm({
      name: row.name, description: row.description ?? '', category: row.category,
      customer_pricing_mode: row.customer_pricing_mode, customer_base_price: money(row.customer_base_price),
      gst_rate: money(row.gst_rate), customer_platform_fee: money(row.customer_platform_fee),
      technician_payout_mode: row.technician_payout_mode, technician_payout: money(row.technician_payout),
      requires_qualified_provider: row.requires_qualified_provider, requires_admin_review: row.requires_admin_review,
      is_active: row.is_active,
    });
    try {
      const result = await adminData<{ availability: CityAvailability[] }>('marketplace_city_availability_list', { service_id: id });
      setCities(result.availability ?? []);
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Could not load city availability.' });
    }
  };

  const setField = (key: string, value: string | boolean) => setForm((old) => ({ ...old, [key]: value }));

  const saveService = async () => {
    const activating = Boolean(form.is_active) && !services.find((row) => row.id === selectedId)?.is_active;
    if (activating && !window.confirm('Confirm provider coverage, qualification requirements and operational readiness have been reviewed before activating this service?')) return;
    setSaving(true); setMessage(null);
    try {
      await adminData('marketplace_service_save', { input: {
        id: selectedId, service_key: services.find((row) => row.id === selectedId)?.service_key,
        name: form.name, description: form.description, category: form.category,
        customer_pricing_mode: form.customer_pricing_mode, customer_base_price: form.customer_base_price === '' ? null : Number(form.customer_base_price),
        gst_rate: Number(form.gst_rate), customer_platform_fee: Number(form.customer_platform_fee),
        technician_payout_mode: form.technician_payout_mode, technician_payout: form.technician_payout === '' ? null : Number(form.technician_payout),
        requires_qualified_provider: Boolean(form.requires_qualified_provider), requires_admin_review: Boolean(form.requires_admin_review),
        is_active: Boolean(form.is_active), admin_review_confirmed: activating,
      } });
      setMessage({ ok: true, text: 'Service settings saved.' });
      await load();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Save failed.' });
    } finally { setSaving(false); }
  };

  const saveCity = async (available: boolean) => {
    if (!selectedId || !city.trim()) { setMessage({ ok: false, text: 'Enter a city name first.' }); return; }
    setSaving(true); setMessage(null);
    try {
      await adminData('marketplace_city_availability_save', {
        service_id: selectedId, city: city.trim(), is_available: available, admin_note: cityNote.trim() || null,
      });
      setCity(''); setCityNote('');
      setMessage({ ok: true, text: available ? 'City availability enabled.' : 'City availability disabled.' });
      const result = await adminData<{ availability: CityAvailability[] }>('marketplace_city_availability_list', { service_id: selectedId });
      setCities(result.availability ?? []);
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Could not update city availability.' });
    } finally { setSaving(false); }
  };

  if (loading && !services.length) return <div className="p-8 flex items-center gap-3"><Loader className="animate-spin" /> Loading service catalogue…</div>;

  return <div className="space-y-6">
    <div><h2 className="text-2xl font-extrabold text-gray-900">Marketplace Service Catalogue</h2>
      <p className="text-sm text-gray-600 mt-1">Manage service activation, customer pricing, technician payout settings and city-by-city availability. New services remain inactive until reviewed.</p></div>
    {message && <div role="status" className={`rounded-xl border p-3 text-sm ${message.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{message.text}</div>}
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.7fr)] gap-5">
      <div className="rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between mb-3"><h3 className="font-bold">Services ({services.length})</h3><button type="button" onClick={() => void load()} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Refresh"><RefreshCw size={16}/></button></div>
        <div className="space-y-2 max-h-[65vh] overflow-y-auto">{services.map((item) => <button key={item.id} type="button" onClick={() => void chooseService(item.id)} className={`w-full text-left rounded-xl border p-3 ${selectedId === item.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}><span className="block font-semibold text-sm">{item.name}</span><span className="text-xs text-gray-500">{item.category} · {item.is_active ? 'Active' : 'Inactive'}</span></button>)}</div>
      </div>
      {selectedId && <div className="space-y-5">
        <div className="rounded-2xl border bg-white p-5 space-y-4">
          <h3 className="font-bold text-lg">Service settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm font-medium">Service name<input value={String(form.name ?? '')} onChange={(e) => setField('name', e.target.value)} className="mt-1 w-full rounded-lg border p-2.5"/></label>
            <label className="text-sm font-medium">Category<input value={String(form.category ?? '')} onChange={(e) => setField('category', e.target.value)} className="mt-1 w-full rounded-lg border p-2.5"/></label>
            <label className="text-sm font-medium">Customer pricing<select value={String(form.customer_pricing_mode ?? 'quote')} onChange={(e) => setField('customer_pricing_mode', e.target.value)} className="mt-1 w-full rounded-lg border p-2.5"><option value="quote">Quote required</option><option value="starting_at">Starting at</option><option value="fixed">Fixed price</option></select></label>
            <label className="text-sm font-medium">Customer price (₹)<input type="number" min="0" value={String(form.customer_base_price ?? '')} onChange={(e) => setField('customer_base_price', e.target.value)} className="mt-1 w-full rounded-lg border p-2.5"/></label>
            <label className="text-sm font-medium">GST rate (%)<input type="number" min="0" max="100" value={String(form.gst_rate ?? '0')} onChange={(e) => setField('gst_rate', e.target.value)} className="mt-1 w-full rounded-lg border p-2.5"/></label>
            <label className="text-sm font-medium">Customer platform fee (₹)<input type="number" min="0" value={String(form.customer_platform_fee ?? '0')} onChange={(e) => setField('customer_platform_fee', e.target.value)} className="mt-1 w-full rounded-lg border p-2.5"/></label>
            <label className="text-sm font-medium">Technician payout mode<select value={String(form.technician_payout_mode ?? 'quote')} onChange={(e) => setField('technician_payout_mode', e.target.value)} className="mt-1 w-full rounded-lg border p-2.5"><option value="quote">Agreed per job</option><option value="fixed">Fixed payout</option><option value="per_job">Per job</option></select></label>
            <label className="text-sm font-medium">Technician payout amount / %<input type="number" min="0" value={String(form.technician_payout ?? '')} onChange={(e) => setField('technician_payout', e.target.value)} className="mt-1 w-full rounded-lg border p-2.5"/></label>
          </div>
          <label className="block text-sm font-medium">Description<textarea value={String(form.description ?? '')} onChange={(e) => setField('description', e.target.value)} rows={3} className="mt-1 w-full rounded-lg border p-2.5"/></label>
          <div className="flex flex-wrap gap-5 text-sm">{[['requires_qualified_provider','Qualification required'],['requires_admin_review','Admin review required'],['is_active','Service active']].map(([key,label]) => <label key={key} className="inline-flex items-center gap-2"><input type="checkbox" checked={Boolean(form[key])} onChange={(e) => setField(key, e.target.checked)}/>{label}</label>)}</div>
          <button type="button" disabled={saving} onClick={() => void saveService()} className="inline-flex items-center gap-2 rounded-xl bg-navy-900 text-white px-4 py-2.5 font-semibold disabled:opacity-50"><Save size={16}/>{saving ? 'Saving…' : 'Save service settings'}</button>
        </div>
        <div className="rounded-2xl border bg-white p-5 space-y-4">
          <div className="flex items-center gap-2"><MapPin size={18}/><h3 className="font-bold text-lg">City availability</h3></div>
          <p className="text-sm text-gray-600">Only enable a city when operational coverage is confirmed. City availability alone does not connect this catalogue to the live booking form yet.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City name" className="rounded-lg border p-2.5"/><input value={cityNote} onChange={(e) => setCityNote(e.target.value)} placeholder="Admin note (optional)" className="rounded-lg border p-2.5"/></div>
          <div className="flex flex-wrap gap-2"><button disabled={saving || !form.is_active} onClick={() => void saveCity(true)} className="rounded-lg bg-green-700 px-3 py-2 text-white text-sm disabled:opacity-50">Enable city</button><button disabled={saving} onClick={() => void saveCity(false)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Disable city</button></div>
          {!form.is_active && <p className="text-xs text-amber-700">Activate the service after review before enabling a city.</p>}
          <div className="divide-y">{cities.map((item) => <div key={item.id} className="py-3 flex items-center justify-between gap-3"><div><div className="font-medium text-sm">{item.city}</div>{item.admin_note && <div className="text-xs text-gray-500">{item.admin_note}</div>}</div><span className={`text-xs font-semibold ${item.is_available ? 'text-green-700' : 'text-gray-500'}`}>{item.is_available ? 'Available' : 'Unavailable'}</span></div>)}</div>
          <p className="text-xs text-gray-500 flex gap-2"><ShieldCheck size={14}/> Admin settings only; public booking enforcement must be completed before production use.</p>
        </div>
      </div>}
    </div>
  </div>;
}
