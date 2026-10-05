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
  const { summary } = await import('@/lib/adminData').then(({ adminData }) =>
    adminData<{ summary: AnalyticsSummary }>('analytics_summary')
  );
  return summary;
}

export async function fetchRevenueGraph(days = 30): Promise<RevenueDataPoint[]> {
  const { revenueData } = await import('@/lib/adminData').then(({ adminData }) =>
    adminData<{ revenueData: RevenueDataPoint[] }>('analytics_revenue', { days })
  );
  return revenueData ?? [];
}

export async function fetchServiceRevenue(): Promise<ServiceRevenue[]> {
  const { data } = await import('@/lib/adminData').then(({ adminData }) =>
    adminData<{ data: ServiceRevenue[] }>('analytics_service_revenue')
  );
  return data ?? [];
}

export async function fetchCityRevenue(): Promise<CityRevenue[]> {
  const { data } = await import('@/lib/adminData').then(({ adminData }) =>
    adminData<{ data: CityRevenue[] }>('analytics_city_revenue')
  );
  return data ?? [];
}

export async function fetchTechnicianPerformance(): Promise<TechnicianPerformance[]> {
  const { data } = await import('@/lib/adminData').then(({ adminData }) =>
    adminData<{ data: TechnicianPerformance[] }>('analytics_technician_performance')
  );
  return data ?? [];
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