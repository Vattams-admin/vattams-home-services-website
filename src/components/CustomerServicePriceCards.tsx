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
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .from('customer_service_prices')
      .select('service_category,service_type,base_price,price_label,is_active')
      .eq('is_active', true)
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setLoadFailed(true);
          setPrices([]);
        } else {
          setPrices(data as CustomerServicePrice[]);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoadFailed(true);
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const priceGroups = useMemo(() => groups.map((group) => {
    const rows = prices
      .filter((price) => price.service_category === group.category && price.is_active)
      .sort((a, b) => group.order.indexOf(a.service_type) - group.order.indexOf(b.service_type));
    return { ...group, rows, startingPrice: rows.length ? Math.min(...rows.map((row) => Number(row.base_price))) : null };
  }), [prices]);

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
              <article key={group.category} className={`relative overflow-hidden rounded-2xl border border-gold-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${cardPadding}`}>
                <div className={`absolute -right-5 -top-5 h-24 w-24 rounded-full bg-gradient-to-br ${group.accent} opacity-[0.08]`} />
                <div className={`relative mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${group.accent} shadow-md`}>
                  <Icon size={23} className="text-white" />
                </div>
                <h3 className="relative text-lg font-extrabold text-navy-900">{group.title}</h3>
                <p className="relative mt-2 min-h-[3rem] text-sm leading-6 text-gray-500">{group.description}</p>
                {group.startingPrice !== null ? (
                  <div className="relative mt-4 rounded-xl border border-gold-100 bg-gold-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Service price from</p>
                    <p className="mt-0.5 text-2xl font-extrabold text-gold-700">{formatINR(group.startingPrice)}</p>
                  </div>
                ) : (
                  <div className="relative mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Price currently unavailable
                  </div>
                )}
                <div className="relative mt-4 space-y-2">
                  {group.rows.map((row) => (
                    <div key={row.service_type} className="flex items-start justify-between gap-3 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                      <span className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-gold-600" />
                        {row.service_type}
                      </span>
                      <span className="shrink-0 text-sm font-bold text-navy-900">{formatINR(Number(row.base_price))}</span>
                    </div>
                  ))}
                </div>
                <p className="relative mt-4 text-xs leading-5 text-gray-500">
                  Listed service price before GST and platform fee. Any parts or additional work are quoted separately and require your approval.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('booking')}
                  className="relative mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-navy-800"
                >
                  Book {group.title} <ArrowRight size={15} />
                </button>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
