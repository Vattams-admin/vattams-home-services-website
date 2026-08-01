import { ServiceCategory } from './supabase';

export interface PricingBreakdown {
  basePrice: number;
  gstAmount: number;
  platformFee: number;
  commissionAmount: number;
  totalAmount: number;
  technicianEarnings: number;
}

export function calculatePricing(
  basePrice: number,
  gstRate: number,
  platformFee: number,
  commissionRate: number,
): PricingBreakdown {
  const gstAmount = Math.round((basePrice * gstRate / 100) * 100) / 100;
  const totalAmount = Math.round((basePrice + gstAmount + platformFee) * 100) / 100;
  const commissionAmount = Math.round((basePrice * commissionRate / 100) * 100) / 100;
  const technicianEarnings = Math.round((basePrice - commissionAmount) * 100) / 100;

  return {
    basePrice,
    gstAmount,
    platformFee,
    commissionAmount,
    totalAmount,
    technicianEarnings,
  };
}

export function getPricingFromService(svc: ServiceCategory | undefined): PricingBreakdown {
  if (!svc) return calculatePricing(299, 18, 49, 10);
  return calculatePricing(
    svc.base_price ?? 299,
    svc.gst_rate ?? 18,
    svc.platform_fee ?? 49,
    svc.commission_rate ?? 10,
  );
}

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
