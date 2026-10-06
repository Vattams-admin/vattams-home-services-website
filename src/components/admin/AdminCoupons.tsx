import { useEffect, useMemo, useState } from 'react';
import {
  Tag,
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  Loader,
  X,
  Save,
} from 'lucide-react';

import {
  fetchActiveCoupons,
  validateCoupon,
  type Coupon,
} from '@/lib/coupons';

type CouponForm = {
  code: string;
  description: string;
  discount_type: 'percentage' | 'flat';
  discount_value: string;
  min_order_amount: string;
  max_discount_amount: string;
  usage_limit: string;
  expires_at: string;
  is_active: boolean;
};

const emptyForm: CouponForm = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  min_order_amount: '',
  max_discount_amount: '',
  usage_limit: '',
  expires_at: '',
  is_active: true,
};

export default function AdminCoupon() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [editingCoupon, setEditingCoupon] =
    useState<Coupon | null>(null);

  const [form, setForm] =
    useState<CouponForm>(emptyForm);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const loadCoupons = async () => {
    setLoading(true);

    try {
      const data = await fetchActiveCoupons();
      setCoupons(data ?? []);
    } catch (error) {
      console.error(
        '[AdminCoupon] Failed to load coupons:',
        error
      );

      setMessage({
        type: 'error',
        text: 'Failed to load coupons.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const filteredCoupons = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) {
      return coupons;
    }

    return coupons.filter((coupon) =>
      String(
        (coupon as Coupon & { code?: string }).code ?? ''
      )
        .toLowerCase()
        .includes(q)
    );
  }, [coupons, search]);

  const openCreate = () => {
    setEditingCoupon(null);
    setForm(emptyForm);
    setMessage(null);
    setShowModal(true);
  };

  const openEdit = (coupon: Coupon) => {
    const c =
      coupon as Coupon & {
        code?: string;
        description?: string;
        discount_type?: string;
        discount_value?: number;
        min_order_amount?: number;
        max_discount_amount?: number;
        usage_limit?: number;
        expires_at?: string;
        is_active?: boolean;
      };

    setEditingCoupon(coupon);

    setForm({
      code: c.code ?? '',
      description: c.description ?? '',
      discount_type:
        c.discount_type === 'flat'
          ? 'flat'
          : 'percentage',
      discount_value:
        c.discount_value != null
          ? String(c.discount_value)
          : '',
      min_order_amount:
        c.min_order_amount != null
          ? String(c.min_order_amount)
          : '',
      max_discount_amount:
        c.max_discount_amount != null
          ? String(c.max_discount_amount)
          : '',
      usage_limit:
        c.usage_limit != null
          ? String(c.usage_limit)
          : '',
      expires_at: c.expires_at
        ? c.expires_at.slice(0, 16)
        : '',
      is_active:
        c.is_active ?? true,
    });

    setMessage(null);
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingCoupon(null);
    setForm(emptyForm);
  };

  const updateForm = (
    key: keyof CouponForm,
    value: string | boolean
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setMessage(null);

    if (!form.code.trim()) {
      setMessage({
        type: 'error',
        text: 'Coupon code is required.',
      });
      return;
    }

    const discount =
      Number(form.discount_value);

    if (
      !Number.isFinite(discount) ||
      discount <= 0
    ) {
      setMessage({
        type: 'error',
        text: 'Enter a valid discount value.',
      });
      return;
    }

    if (
      form.discount_type === 'percentage' &&
      discount > 100
    ) {
      setMessage({
        type: 'error',
        text: 'Percentage discount cannot exceed 100%.',
      });
      return;
    }

    setSaving(true);

    try {
      /*
       * IMPORTANT:
       * Your current coupons.ts library exposes
       * fetchActiveCoupons() and validateCoupon().
       *
       * Create/update/delete operations should be
       * connected to your Supabase coupon table here.
       *
       * This intentionally does not fake a successful
       * database write.
       */

      console.log(
        '[AdminCoupon] Coupon payload:',
        {
          id: editingCoupon
            ? (editingCoupon as Coupon & {
                id?: string;
              }).id
            : undefined,

          code: form.code
            .trim()
            .toUpperCase(),

          description:
            form.description.trim(),

          discount_type:
            form.discount_type,

          discount_value:
            discount,

          min_order_amount:
            Number(
              form.min_order_amount
            ) || 0,

          max_discount_amount:
            Number(
              form.max_discount_amount
            ) || 0,

          usage_limit:
            Number(
              form.usage_limit
            ) || null,

          expires_at:
            form.expires_at || null,

          is_active:
            form.is_active,
        },
      );

      setMessage({
        type: 'error',
        text:
          'Coupon database save function is not available in the current coupons.ts API. Connect the Supabase CRUD function before enabling save.',
      });
    } catch (error) {
      console.error(
        '[AdminCoupon] Save error:',
        error
      );

      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Failed to save coupon.',
      });
    } finally {
      setSaving(false);
    }
  };

  const testCoupon = async (code: string) => {
    const cleanCode = code.trim();

    if (!cleanCode) return;

    try {
      const result =
        await validateCoupon(
          cleanCode,
          0
        );

      if (result) {
        setMessage({
          type: 'success',
          text: `Coupon ${cleanCode} is valid.`,
        });
      } else {
        setMessage({
          type: 'error',
          text: `Coupon ${cleanCode} is not valid.`,
        });
      }
    } catch (error) {
      console.error(
        '[AdminCoupon] Coupon validation error:',
        error
      );

      setMessage({
        type: 'error',
        text: 'Unable to validate coupon.',
      });
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        <div>

          <div className="flex items-center gap-3">

            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
              <Tag
                size={21}
                className="text-blue-600"
              />
            </div>

            <div>

              <h2 className="text-2xl font-extrabold text-gray-900">
                Coupons
              </h2>

              <p className="text-sm text-gray-500">
                Manage discount coupons and offers.
              </p>

            </div>

          </div>

        </div>

        <button
          type="button"
          onClick={openCreate}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors"
        >
          <Plus size={17} />
          Create Coupon
        </button>

      </div>

      {/* Message */}
      {message && (
        <div
          className={
            'flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ' +
            (
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-100'
                : 'bg-red-50 text-red-700 border border-red-100'
            )
          }
        >
          {message.type === 'success' ? (
            <CheckCircle size={16} />
          ) : (
            <XCircle size={16} />
          )}

          {message.text}
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">

        <div className="relative max-w-md">

          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search coupon code..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

        </div>

      </div>

      {/* Coupon list */}
      {loading ? (

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 flex items-center justify-center">

          <Loader
            size={28}
            className="animate-spin text-blue-600"
          />

        </div>

      ) : (

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          {filteredCoupons.map((coupon) => {

            const c =
              coupon as Coupon & {
                id?: string;
                code?: string;
                description?: string;
                discount_type?: string;
                discount_value?: number;
                min_order_amount?: number;
                max_discount_amount?: number;
                usage_limit?: number;
                expires_at?: string;
                is_active?: boolean;
              };

            return (
              <div
                key={c.id ?? c.code}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
              >

                <div className="flex items-start justify-between gap-3">

                  <div className="flex items-center gap-3">

                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Tag
                        size={17}
                        className="text-blue-600"
                      />
                    </div>

                    <div>

                      <div className="font-extrabold text-gray-900">
                        {c.code ?? '—'}
                      </div>

                      <div className="text-xs text-gray-400">
                        {c.description ||
                          'Discount coupon'}
                      </div>

                    </div>

                  </div>

                  <span
                    className={
                      'px-2.5 py-1 rounded-full text-xs font-semibold border ' +
                      (
                        c.is_active === false
                          ? 'bg-red-50 text-red-600 border-red-100'
                          : 'bg-green-50 text-green-600 border-green-100'
                      )
                    }
                  >
                    {c.is_active === false
                      ? 'Inactive'
                      : 'Active'}
                  </span>

                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">

                  <div className="rounded-xl bg-gray-50 p-3">

                    <div className="text-xs text-gray-400">
                      Discount
                    </div>

                    <div className="text-lg font-extrabold text-gray-900">

                      {c.discount_value ?? 0}

                      {c.discount_type ===
                      'percentage'
                        ? '%'
                        : ' ₹'}

                    </div>

                  </div>

                  <div className="rounded-xl bg-gray-50 p-3">

                    <div className="text-xs text-gray-400">
                      Min Order
                    </div>

                    <div className="text-lg font-extrabold text-gray-900">
                      ₹
                      {c.min_order_amount ??
                        0}
                    </div>

                  </div>

                </div>

                <div className="mt-4 text-xs text-gray-500 space-y-1">

                  <div>
                    Usage Limit:{' '}
                    <span className="font-semibold text-gray-700">
                      {c.usage_limit ??
                        'Unlimited'}
                    </span>
                  </div>

                  <div>
                    Expires:{' '}
                    <span className="font-semibold text-gray-700">
                      {c.expires_at
                        ? new Date(
                            c.expires_at
                          ).toLocaleDateString(
                            'en-IN'
                          )
                        : 'No expiry'}
                    </span>
                  </div>

                </div>

                <div className="grid grid-cols-2 gap-2 mt-5">

                  <button
                    type="button"
                    onClick={() =>
                      testCoupon(
                        c.code ?? ''
                      )
                    }
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 hover:bg-green-100 text-green-600 text-xs font-semibold"
                  >
                    <CheckCircle size={14} />
                    Test
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openEdit(coupon)
                    }
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold"
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>

                </div>

              </div>
            );
          })}

          {filteredCoupons.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16">

              <Tag
                size={32}
                className="mx-auto text-gray-300 mb-3"
              />

              <div className="font-semibold text-gray-700">
                No coupons found
              </div>

              <div className="text-sm text-gray-400 mt-1">
                Create your first coupon to get started.
              </div>

            </div>
          )}

        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >

          <div
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">

              <div>

                <h3 className="text-lg font-extrabold text-gray-900">
                  {editingCoupon
                    ? 'Edit Coupon'
                    : 'Create Coupon'}
                </h3>

                <p className="text-xs text-gray-400 mt-1">
                  Configure your discount offer.
                </p>

              </div>

              <button
                type="button"
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>

            </div>

            {/* Form */}
            <div className="p-5 space-y-4">

              <div>

                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                  Coupon Code
                </label>

                <input
                  value={form.code}
                  onChange={(e) =>
                    updateForm(
                      'code',
                      e.target.value
                        .toUpperCase()
                    )
                  }
                  placeholder="WELCOME10"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm font-bold uppercase focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

              </div>

              <div>

                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                  Description
                </label>

                <input
                  value={
                    form.description
                  }
                  onChange={(e) =>
                    updateForm(
                      'description',
                      e.target.value
                    )
                  }
                  placeholder="10% off for new customers"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

              </div>

              <div className="grid grid-cols-2 gap-3">

                <div>

                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                    Discount Type
                  </label>

                  <select
                    value={
                      form.discount_type
                    }
                    onChange={(e) =>
                      updateForm(
                        'discount_type',
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none text-sm focus:border-blue-500"
                  >
                    <option value="percentage">
                      Percentage
                    </option>

                    <option value="flat">
                      Fixed Amount
                    </option>

                  </select>

                </div>

                <div>

                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                    Discount
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      form.discount_value
                    }
                    onChange={(e) =>
                      updateForm(
                        'discount_value',
                        e.target.value
                      )
                    }
                    placeholder={
                      form.discount_type ===
                      'percentage'
                        ? '10'
                        : '100'
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none text-sm focus:border-blue-500"
                  />

                </div>

              </div>

              <div className="grid grid-cols-2 gap-3">

                <div>

                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                    Minimum Order
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      form.min_order_amount
                    }
                    onChange={(e) =>
                      updateForm(
                        'min_order_amount',
                        e.target.value
                      )
                    }
                    placeholder="500"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none text-sm focus:border-blue-500"
                  />

                </div>

                <div>

                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                    Max Discount
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      form.max_discount_amount
                    }
                    onChange={(e) =>
                      updateForm(
                        'max_discount_amount',
                        e.target.value
                      )
                    }
                    placeholder="500"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none text-sm focus:border-blue-500"
                  />

                </div>

              </div>

              <div className="grid grid-cols-2 gap-3">

                <div>

                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                    Usage Limit
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={
                      form.usage_limit
                    }
                    onChange={(e) =>
                      updateForm(
                        'usage_limit',
                        e.target.value
                      )
                    }
                    placeholder="100"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none text-sm focus:border-blue-500"
                  />

                </div>

                <div>

                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                    Expiry
                  </label>

                  <input
                    type="datetime-local"
                    value={
                      form.expires_at
                    }
                    onChange={(e) =>
                      updateForm(
                        'expires_at',
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none text-sm focus:border-blue-500"
                  />

                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  updateForm(
                    'is_active',
                    !form.is_active
                  )
                }
                className="flex items-center gap-3 w-full text-left"
              >

                <span
                  className={
                    'w-10 h-6 rounded-full transition-colors ' +
                    (
                      form.is_active
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    )
                  }
                >

                  <span
                    className={
                      'block w-4 h-4 mt-1 bg-white rounded-full transition-transform ' +
                      (
                        form.is_active
                          ? 'translate-x-5'
                          : 'translate-x-1'
                      )
                    }
                  />

                </span>

                <span>

                  <span className="block text-sm font-semibold text-gray-800">
                    Active Coupon
                  </span>

                  <span className="block text-xs text-gray-400">
                    Customers can use this coupon
                  </span>

                </span>

              </button>

              <div className="flex gap-3 pt-2">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50"
                >

                  {saving ? (
                    <Loader
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Save size={16} />
                  )}

                  {editingCoupon
                    ? 'Update Coupon'
                    : 'Save Coupon'}

                </button>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}