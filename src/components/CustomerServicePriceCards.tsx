import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader, Refrigerator, WashingMachine, Wind, type LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatINR } from '@/lib/pricing';
import { useRouter } from '@/lib/router';

interface CustomerServicePrice {
  service_category: string;
  service_type: string;
  base_price: number;
  price_label: string;
  is_active: boolean;
}

interface CheckoutFee {
  service_name: string;
  gst_rate: number;
  platform_fee: number;
}

const moneyBreakdown = (basePrice: number, gstRate: number, platformFee: number) => {
  const gstAmount = Math.round((basePrice * gstRate / 100) * 100) / 100;
  const total = Math.round((basePrice + gstAmount + platformFee) * 100) / 100;
  return { gstAmount, platformFee, total };
};

const groups: Array<{
  category: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  order: string[];
}> = [
  {
    category: 'AC Service',
    title: 'Air Conditioner (AC)',
    description: 'Routine service, installation, gas filling, pump water service and coil cleaning.',
    icon: Wind,
    accent: 'from-navy-800 to-navy-950',
    order: ['General Service', 'Installation', 'Gas Filling', 'Pump Water Service', 'Coil Service'],
  },
  {
    category: 'Washing Machine',
    title: 'Washing Machine',
    description: 'Professional service for your washing machine, with any parts or extra work quoted first.',
    icon: WashingMachine,
    accent: 'from-gold-500 to-gold-700',
    order: ['Washing Machine Service'],
  },
  {
    category: 'Refrigerator',
    title: 'Refrigerator',
    description: 'Reliable refrigerator service to help keep your food fresh and your appliance running.',
    icon: Refrigerator,
    accent: 'from-navy-700 to-navy-900',
    order: ['Refrigerator Service'],
  },
];

export default function CustomerServicePriceCards({ variant = 'home' }: { variant?: 'home' | 'page' }) {
  const { navigate } = useRouter();
  const [prices, setPrices] = useState<CustomerServicePrice[]>([]);
  const [checkoutFees, setCheckoutFees] = useState<Record<string, CheckoutFee>>({});
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;

    const loadPrices = async () => {
      try {
        const [customerResult, feeResult] = await Promise.all([
          supabase
            .from('customer_service_prices')
            .select('service_category,service_type,base_price,price_label,is_active')
            .eq('is_active', true),
          supabase
            .from('service_prices')
            .select('service_name,gst_rate,platform_fee')
            .eq('is_active', true),
        ]);

        if (!active) return;
        if (customerResult.error || !customerResult.data || feeResult.error || !feeResult.data) {
          setLoadFailed(true);
          setPrices([]);
          setCheckoutFees({});
        } else {
          setPrices(customerResult.data as CustomerServicePrice[]);
          const feeMap: Record<string, CheckoutFee> = {};
          (feeResult.data as CheckoutFee[]).forEach((fee) => {
            feeMap[fee.service_name] = fee;
          });
          setCheckoutFees(feeMap);
        }
      } catch {
        if (!active) return;
        setLoadFailed(true);
        setPrices([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPrices();
    return () => { active = false; };
  }, []);

  const priceGroups = useMemo(() => groups.map((group) => {
    const rows = prices
      .filter((price) => price.service_category === group.category && price.is_active)
      .sort((a, b) => group.order.indexOf(a.service_type) - group.order.indexOf(b.service_type))
      .map((row) => {
        const fee = checkoutFees[group.category];
        const basePrice = Number(row.base_price);
        const breakdown = fee
          ? moneyBreakdown(basePrice, Number(fee.gst_rate), Number(fee.platform_fee))
          : null;
        return { ...row, breakdown };
      });
    const startingRow = rows.length
      ? [...rows].sort((a, b) => Number(a.base_price) - Number(b.base_price))[0]
      : null;
    return {
      ...group,
      rows,
      startingPrice: startingRow ? Number(startingRow.base_price) : null,
      startingTotal: startingRow?.breakdown?.total ?? null,
    };
  }), [prices, checkoutFees]);

  const cardPadding = variant === 'page' ? 'p-7' : 'p-6';

  return (
    <>
      {loading ? (
        <div className="flex justify-center py-14">
          <Loader className="animate-spin text-navy-700" size={30} aria-label="Loading service prices" />
        </div>
      ) : loadFailed ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-900">
          Service prices are temporarily unavailable. Please try again shortly or contact our team.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {priceGroups.map((group) => {
            const Icon = group.icon;
            return (
              <article key={group.category} className={`group relative overflow-hidden rounded-[1.35rem] border border-[#E7E0CC] bg-white shadow-[0_14px_45px_rgba(7,11,21,.055)] transition-all duration-300 hover:-translate-y-1 hover:border-[#D4AF37]/55 hover:shadow-[0_24px_60px_rgba(7,11,21,.12)] ${cardPadding}`}>
                <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${group.accent} opacity-[0.07] transition-transform duration-500 group-hover:scale-125`} /><div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent opacity-70" />
                <div className={`relative mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${group.accent} shadow-md`}>
                  <Icon size={23} className="text-white" />
                </div>
                <h3 className="relative text-lg font-extrabold text-navy-900">{group.title}</h3>
                <p className="relative mt-2 min-h-[3rem] text-sm leading-6 text-gray-500">{group.description}</p>
                {group.startingPrice !== null ? (
                  <div className="relative mt-4 rounded-xl border border-gold-100 bg-gold-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Starting base price</p>
                    <p className="mt-0.5 text-2xl font-extrabold text-gold-700">{formatINR(group.startingPrice)}</p>
                    {group.startingTotal !== null && (
                      <p className="mt-1 text-xs font-semibold text-navy-800">
                        Estimated checkout from {formatINR(group.startingTotal)} including GST and platform fee
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="relative mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Pricing temporarily unavailable
                  </div>
                )}
                <div className="relative mt-4 space-y-2">
                  {group.rows.map((row) => (
                    <div key={row.service_type} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex items-start gap-2 text-sm font-semibold text-gray-800">
                          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-gold-600" />
                          {row.service_type}
                        </span>
                        <span className="shrink-0 text-sm font-bold text-navy-900">{formatINR(Number(row.base_price))}</span>
                      </div>
                      {row.breakdown && (
                        <div className="ml-6 mt-1.5 space-y-1 text-xs text-gray-500">
                          <div className="flex justify-between gap-3">
                            <span>GST</span><span>{formatINR(row.breakdown.gstAmount)}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span>Platform fee</span><span>{formatINR(row.breakdown.platformFee)}</span>
                          </div>
                          <div className="flex justify-between gap-3 border-t border-gray-100 pt-1 font-extrabold text-navy-900">
                            <span>Estimated checkout total</span><span>{formatINR(row.breakdown.total)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="relative mt-4 text-xs leading-5 text-gray-500">
                  Estimates use the current listed base price, GST and platform fee. Final checkout shows the applicable charges and discounts. Parts or additional work are quoted separately and require your approval.
                </p>
                {group.rows.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => navigate('booking')}
                    className="relative mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/35 bg-gradient-to-r from-[#101D3D] to-[#070B15] px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:border-[#D4AF37]/70 hover:shadow-lg"
                  >
                    Request {group.title} <ArrowRight size={15} />
                  </button>
                ) : (
                  <a
                    href="tel:+916374068296"
                    className="relative mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/45 bg-[#F8F4E5] px-4 py-3 text-sm font-bold text-[#101D3D] transition-all hover:bg-[#F1E8C9]"
                  >
                    Ask about availability <ArrowRight size={15} />
                  </a>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
