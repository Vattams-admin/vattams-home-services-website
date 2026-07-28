import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://nitlpxztktgjcjxdgiqm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pdGxweHp0a3RnamNqeGRnaXFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxODM5ODcsImV4cCI6MjEwMDc1OTk4N30.mKbYeKEf7u2DjDpPtiVmNasfEx7sH0nwuuNrN_30GiM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type TechnicianStatus = 'pending' | 'active' | 'inactive';
export type JobStatus = 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'rejected';

export interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  price_range: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  booking_number: string;
  customer_name: string;
  mobile_number: string;
  city: string;
  address: string;
  service_category: string;
  problem_description: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  status: BookingStatus;
  assigned_technician_id: string | null;
  technician_notes: string | null;
  amount: number | null;
  created_at: string;
  updated_at: string;
}

export interface Technician {
  id: string;
  full_name: string;
  mobile: string;
  email: string | null;
  city: string;
  specializations: string[];
  experience_years: number;
  status: TechnicianStatus;
  rating: number;
  total_jobs: number;
  earnings: number;
  id_proof_type: string | null;
  id_proof_number: string | null;
  created_at: string;
  wallet_balance: number;
  locked_deposit: number;
  available_balance: number;
  commission_due: number;
  deposit_released: boolean;
  completed_jobs_count: number;
  wallet_locked: boolean;
  registration_fee_paid: boolean;
}

export interface TechnicianJob {
  id: string;
  booking_id: string;
  technician_id: string;
  status: JobStatus;
  notes: string | null;
  service_photo_urls: string[];
  customer_signature: string | null;
  job_amount: number | null;
  assigned_at: string;
  completed_at: string | null;
}

export type WalletTxnType = 'registration_fee' | 'deposit_lock' | 'deposit_release' | 'commission_deduction' | 'recharge_credit' | 'recharge_debit' | 'adjustment';

export interface WalletTransaction {
  id: string;
  technician_id: string;
  type: WalletTxnType;
  amount: number;
  balance_after: number | null;
  description: string | null;
  booking_id: string | null;
  recharge_id: string | null;
  created_at: string;
}

export type RechargeStatus = 'pending' | 'approved' | 'rejected';

export interface WalletRecharge {
  id: string;
  technician_id: string;
  amount: number;
  status: RechargeStatus;
  payment_ref: string | null;
  admin_notes: string | null;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export type NotificationType = 'registration_fee' | 'deposit_released' | 'wallet_low' | 'account_locked' | 'account_unlocked' | 'recharge_approved' | 'commission_deducted';

export interface TechnicianNotification {
  id: string;
  technician_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface WalletSettings {
  id: string;
  registration_fee: number;
  commission_rate: number;
  deposit_release_job_threshold: number;
  lock_threshold: number;
  low_balance_threshold: number;
  updated_at: string;
}
