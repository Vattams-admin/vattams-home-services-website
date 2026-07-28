import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
