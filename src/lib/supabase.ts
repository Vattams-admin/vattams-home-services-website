import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nfcibyprftnowaiwlxxc.supabase.co';
const supabaseAnonKey ='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mY2lieXByZnRub3dhaXdseHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4ODMzOTgsImV4cCI6MjA5OTQ1OTM5OH0.5ZMjWYOuRBKNKG3ZonXXOBAfBapm54naphNXrHxq16k';

// Exported so other modules (e.g. technicianRegistration.ts) can reuse the
// same project URL / anon key instead of hardcoding a second copy. This is
// the public anon key — safe to expose client-side. NEVER add the
// service_role key here or anywhere in frontend code.
export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;

  export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})
export type BookingStatus = 'pending' | 'confirmed' | 'assigned' | 'accepted' | 'on_the_way' | 'in_progress' | 'job_started' | 'job_completed' | 'completed' | 'cancelled';
export type TechnicianStatus = 'pending' | 'active' | 'inactive' | 'rejected' | 'suspended';
export type JobStatus = 'assigned' | 'accepted' | 'on_the_way' | 'in_progress' | 'job_started' | 'job_completed' | 'completed' | 'rejected';

export interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  price_range: string | null;
  base_price: number;
  gst_rate: number;
  platform_fee: number;
  commission_rate: number;
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
  customer_id: string | null;
  base_price: number | null;
  gst_amount: number | null;
  platform_fee: number | null;
  commission_amount: number | null;
  total_amount: number | null;
  start_otp: string | null;
  complete_otp: string | null;
  otp_verified_at: string | null;
  job_started_at: string | null;
  job_completed_at: string | null;
  rescheduled_from: string | null;
  created_at: string;
  updated_at: string;
  otp_verification_status: string | null;
  job_duration_minutes: number | null;
  ai_booking: boolean | null;
  urgency: string | null;
  coupon_code: string | null;
  discount_amount: number | null;
  invoice_number: string | null;
}

export interface Customer {
  id: string;
  full_name: string;
  mobile: string;
  email: string | null;
  city: string | null;
  address: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface Technician {
  id: string;
  full_name: string;
  mobile: string;
  email: string | null;
  city: string;
  service_categories: string[];
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
  latitude: number | null;
  longitude: number | null;
  radius_km: number;
  acceptance_rate: number;
  current_workload: number;
  is_online: boolean;
  profile_photo_url: string | null;
  last_active_at: string | null;
  whatsapp_number: string | null;
  area: string | null;
  pincode: string | null;
  available_days: string[];
  working_time: string | null;
  has_vehicle: boolean;
  has_tools: boolean;
  upi_id: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
  bank_holder_name: string | null;
  aadhaar_url: string | null;
  pan_url: string | null;
  dl_url: string | null;
  profile_score: number;
  rejection_reason: string | null;
  suspend_reason: string | null;
  mobile_verified: boolean;
  whatsapp_verified: boolean;
  employee_id: string | null;
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
  assignment_radius_km: number;
  updated_at: string;
}

export interface ServicePrice {
  id: string;
  service_name: string;
  base_price: number;
  gst_rate: number;
  platform_fee: number;
  commission_rate: number;
  is_active: boolean;
  updated_at: string;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  customer_id: string | null;
  customer_name: string;
  technician_id: string | null;
  rating: number;
  review_text: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  booking_id: string;
  sender_type: 'customer' | 'technician' | 'admin';
  sender_id: string;
  sender_name: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}