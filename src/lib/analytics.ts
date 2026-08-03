import { supabase, Booking, Technician } from './supabase';
import { formatINR } from './pricing';

export interface AnalyticsSummary {
  todayRevenue: number;
  pendingBookings: number;
  cancelledJobs: number;
  availableTechnicians: number;
  inactiveCustomers: number;
  totalCustomers: number;
  totalTechnicians: number;
  newBookingsToday: number;
  completedJobsToday: number;
  avgRating: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  bookings: number;
}

export interface ServiceRevenue {
  service: string;
  revenue: number;
  count: number;
}

export interface CityRevenue {
  city: string;
  revenue: number;
  count: number;
}

export interface TechnicianPerformance {
  technician: Technician;
  completedJobs: number;
  earnings: number;
  rating: number;
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  const today = new Date().toISOString().split('T')[0];

  const [bookingsResult, techniciansResult, customersResult, reviewsResult] = await Promise.all([
    supabase.from('bookings').select('*'),
    supabase.from('technicians').select('*'),
    supabase.from('customers').select('*'),
    supabase.from('reviews').select('rating'),
  ]);

  const bookings = bookingsResult.data ?? [];
  const technicians = techniciansResult.data ?? [];
  const customers = customersResult.data ?? [];
  const reviews = reviewsResult.data ?? [];

  const todayBookings = bookings.filter((b: Record<string, unknown>) =>
    (b.created_at as string)?.startsWith(today),
  );

  const todayRevenue = todayBookings
    .filter((b: Record<string, unknown>) => b.status === 'completed')
    .reduce((sum: number, b: Record<string, unknown>) => sum + Number(b.total_amount ?? b.amount ?? 0), 0);

  const pendingBookings = bookings.filter((b: Record<string, unknown>) =>
    ['pending', 'assigned', 'in_progress', 'job_started'].includes(b.status as string),
  ).length;

  const cancelledJobs = bookings.filter((b: Record<string, unknown>) =>
    b.status === 'cancelled',
  ).length;

  const availableTechnicians = (technicians as Technician[]).filter(
    (t) => (t.status as string) === 'approved' && !t.wallet_locked,
  ).length;

  const activeCustomerIds = new Set(
    bookings
      .filter((b: Record<string, unknown>) => {
        const created = b.created_at as string;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        return created > thirtyDaysAgo;
      })
      .map((b: Record<string, unknown>) => b.customer_id ?? b.mobile_number),
  );
  const inactiveCustomers = customers.length - activeCustomerIds.size;

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum: number, r: Record<string, unknown>) => sum + Number(r.rating), 0) / reviews.length
    : 0;

  return {
    todayRevenue,
    pendingBookings,
    cancelledJobs,
    availableTechnicians,
    inactiveCustomers: Math.max(0, inactiveCustomers),
    totalCustomers: customers.length,
    totalTechnicians: technicians.length,
    newBookingsToday: todayBookings.length,
    completedJobsToday: bookings.filter((b: Record<string, unknown>) =>
      b.status === 'completed' && (b.job_completed_at as string)?.startsWith(today),
    ).length,
    avgRating: Math.round(avgRating * 10) / 10,
  };
}

export async function fetchRevenueGraph(days = 30): Promise<RevenueDataPoint[]> {
  const { data: bookings } = await supabase
    .from('bookings')
    .select('total_amount, amount, status, created_at')
    .order('created_at', { ascending: true })
    .limit(1000);

  if (!bookings) return [];

  const map = new Map<string, { revenue: number; bookings: number }>();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  for (const b of bookings as Record<string, unknown>[]) {
    const created = b.created_at as string;
    if (new Date(created) < cutoff) continue;
    const date = created.split('T')[0];
    const existing = map.get(date) ?? { revenue: 0, bookings: 0 };
    existing.bookings += 1;
    if (b.status === 'completed') {
      existing.revenue += Number(b.total_amount ?? b.amount ?? 0);
    }
    map.set(date, existing);
  }

  return Array.from(map.entries()).map(([date, v]) => ({
    date,
    revenue: v.revenue,
    bookings: v.bookings,
  }));
}

export async function fetchServiceRevenue(): Promise<ServiceRevenue[]> {
  const { data: bookings } = await supabase.from('bookings').select('service_category, total_amount, amount, status');
  if (!bookings) return [];

  const map = new Map<string, { revenue: number; count: number }>();
  for (const b of bookings as Record<string, unknown>[]) {
    const svc = b.service_category as string;
    const existing = map.get(svc) ?? { revenue: 0, count: 0 };
    existing.count += 1;
    if (b.status === 'completed') {
      existing.revenue += Number(b.total_amount ?? b.amount ?? 0);
    }
    map.set(svc, existing);
  }

  return Array.from(map.entries())
    .map(([service, v]) => ({ service, revenue: v.revenue, count: v.count }))
    .sort((a, b) => b.revenue - a.revenue);
}

export async function fetchCityRevenue(): Promise<CityRevenue[]> {
  const { data: bookings } = await supabase.from('bookings').select('city, total_amount, amount, status');
  if (!bookings) return [];

  const map = new Map<string, { revenue: number; count: number }>();
  for (const b of bookings as Record<string, unknown>[]) {
    const city = (b.city as string) || 'Unknown';
    const existing = map.get(city) ?? { revenue: 0, count: 0 };
    existing.count += 1;
    if (b.status === 'completed') {
      existing.revenue += Number(b.total_amount ?? b.amount ?? 0);
    }
    map.set(city, existing);
  }

  return Array.from(map.entries())
    .map(([city, v]) => ({ city, revenue: v.revenue, count: v.count }))
    .sort((a, b) => b.revenue - a.revenue);
}

export async function fetchTechnicianPerformance(): Promise<TechnicianPerformance[]> {
  const { data: technicians } = await supabase.from('technicians').select('*');
  if (!technicians) return [];

  return (technicians as Technician[])
    .map((t) => ({
      technician: t,
      completedJobs: t.completed_jobs_count ?? 0,
      earnings: t.earnings ?? 0,
      rating: t.rating ?? 0,
    }))
    .sort((a, b) => b.completedJobs - a.completedJobs);
}

export function predictDemand(revenueData: RevenueDataPoint[]): { nextWeek: number; trend: 'up' | 'down' | 'stable' } {
  if (revenueData.length < 3) return { nextWeek: 0, trend: 'stable' };

  const recent = revenueData.slice(-7);
  const avgBookings = recent.reduce((sum, d) => sum + d.bookings, 0) / recent.length;

  const previous = revenueData.slice(-14, -7);
  const prevAvg = previous.length > 0
    ? previous.reduce((sum, d) => sum + d.bookings, 0) / previous.length
    : avgBookings;

  const trend: 'up' | 'down' | 'stable' =
    avgBookings > prevAvg * 1.1 ? 'up' : avgBookings < prevAvg * 0.9 ? 'down' : 'stable';

  return { nextWeek: Math.round(avgBookings * 7), trend };
}

export function generateAIRecommendations(summary: AnalyticsSummary): string[] {
  const recs: string[] = [];

  if (summary.pendingBookings > summary.availableTechnicians) {
    recs.push(`High demand: ${summary.pendingBookings} pending bookings but only ${summary.availableTechnicians} available technicians. Consider onboarding more technicians.`);
  }

  if (summary.cancelledJobs > 5) {
    recs.push(`${summary.cancelledJobs} cancelled jobs detected. Review cancellation reasons and improve technician response times.`);
  }

  if (summary.inactiveCustomers > summary.totalCustomers * 0.3) {
    recs.push(`${summary.inactiveCustomers} inactive customers. Launch a re-engagement campaign with special offers.`);
  }

  if (summary.avgRating < 4.0 && summary.avgRating > 0) {
    recs.push(`Average rating is ${summary.avgRating}★. Focus on service quality training for technicians.`);
  }

  if (summary.todayRevenue > 0) {
    recs.push(`Today's revenue: ${formatINR(summary.todayRevenue)}. Keep up the momentum with promotional offers!`);
  }

  if (recs.length === 0) {
    recs.push('All metrics look healthy. Continue monitoring for trends.');
  }

  return recs;
}
