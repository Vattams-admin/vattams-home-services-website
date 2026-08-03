import { supabase, ServicePrice } from './supabase';

export interface PricingBreakdown {
  basePrice: number;
  gstAmount: number;
  platformFee: number;
  commissionAmount: number;
  totalAmount: number;
  technicianEarnings: number;
  discountAmount: number;
  finalAmount: number;
}

export function calculatePricing(
  basePrice: number,
  gstRate: number,
  platformFee: number,
  commissionRate: number,
  discountAmount: number = 0,
): PricingBreakdown {
  const gstAmount = Math.round((basePrice * gstRate / 100) * 100) / 100;
  const totalAmount = Math.round((basePrice + gstAmount + platformFee) * 100) / 100;
  const commissionAmount = Math.round((basePrice * commissionRate / 100) * 100) / 100;
  const technicianEarnings = Math.round((basePrice - commissionAmount) * 100) / 100;
  const finalAmount = Math.max(0, Math.round((totalAmount - discountAmount) * 100) / 100);

  return {
    basePrice,
    gstAmount,
    platformFee,
    commissionAmount,
    totalAmount,
    technicianEarnings,
    discountAmount,
    finalAmount,
  };
}

export async function fetchServicePrices(): Promise<ServicePrice[]> {
  const { data, error } = await supabase
    .from('service_prices')
    .select('*')
    .eq('is_active', true)
    .order('service_name');
  if (error) {
    console.error('Failed to fetch service prices:', error);
    return [];
  }
  return (data ?? []) as ServicePrice[];
}

export async function fetchAllServicePrices(): Promise<ServicePrice[]> {
  const { data, error } = await supabase
    .from('service_prices')
    .select('*')
    .order('service_name');
  if (error) {
    console.error('Failed to fetch service prices:', error);
    return [];
  }
  return (data ?? []) as ServicePrice[];
}

export async function getPricingForService(serviceName: string): Promise<PricingBreakdown | null> {
  const { data, error } = await supabase
    .from('service_prices')
    .select('*')
    .eq('service_name', serviceName)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    console.error('Failed to fetch pricing for service:', serviceName, error);
    return null;
  }

  const sp = data as ServicePrice;
  return calculatePricing(
    Number(sp.base_price),
    Number(sp.gst_rate),
    Number(sp.platform_fee),
    Number(sp.commission_rate),
  );
}

export function getPricingFromServicePrice(sp: ServicePrice): PricingBreakdown {
  return calculatePricing(
    Number(sp.base_price),
    Number(sp.gst_rate),
    Number(sp.platform_fee),
    Number(sp.commission_rate),
  );
}

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
