import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

export const TECHNICIAN_SERVICES = [
  'Electrician',
  'Plumber',
  'AC Technician',
  'RO Technician',
  'Carpenter',
  'Painter',
  'House Cleaning',
  'CCTV',
  'Home Appliance Repair',
  'Pest Control',
  'Water Tank Cleaning',
  'Laundry',
  'Gardening',
  'Packers & Movers',
  'Driver',
];

export const AVAILABLE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const TIME_SLOTS = [
  'Full Day (9 AM - 6 PM)',
  'Morning (9 AM - 12 PM)',
  'Afternoon (12 PM - 4 PM)',
  'Evening (4 PM - 8 PM)',
  'Night (8 PM - 12 AM)',
  '24 Hours Available',
];

export interface TechnicianFormData {
  full_name: string;
  mobile: string;
  whatsapp_number: string;
  email: string;
  city: string;
  area: string;
  pincode: string;
  service_categories: string[];
  experience_years: string;
  available_days: string[];
  working_time: string;
  has_vehicle: boolean | null;
  has_tools: boolean | null;
  aadhaar_url: string;
  pan_url: string;
  dl_url: string;
  profile_photo_url: string;
  bank_account_number: string;
  bank_ifsc: string;
  bank_name: string;
  bank_holder_name: string;
  upi_id: string;
  password: string;
  // OTP removed;
}

export const EMPTY_FORM: TechnicianFormData = {
  full_name: '',
  mobile: '',
  whatsapp_number: '',
  email: '',
  city: '',
  area: '',
  pincode: '',
  service_categories: [],
  experience_years: '',
  available_days: [],
  working_time: '',
  has_vehicle: null,
  has_tools: null,
  aadhaar_url: '',
  pan_url: '',
  dl_url: '',
  profile_photo_url: '',
  bank_account_number: '',
  bank_ifsc: '',
  bank_name: '',
  bank_holder_name: '',
  upi_id: '',
  password: '',
  
};

export type StepKey =
  | 'full_name' | 'mobile' | 'whatsapp_number' | 'email' | 'city'
  | 'area' | 'pincode' | 'service_categories' | 'experience_years'
  | 'available_days' | 'working_time' | 'has_vehicle' | 'has_tools'
  | 'aadhaar' | 'pan' | 'dl' | 'profile_photo'
  | 'bank_name' | 'bank_holder_name' | 'bank_account_number' | 'bank_ifsc'
  | 'upi_id' | 'password' | 'review' | 'done';

export interface StepDef {
  key: StepKey;
  question: string;
  field: keyof TechnicianFormData | null;
  type: 'text' | 'tel' | 'email' | 'number' | 'select' | 'multiselect' | 'boolean' | 'upload' | 'password' | 'review';
  placeholder?: string;
  options?: string[];
  optional?: boolean;
  validate?: (value: string, form: TechnicianFormData) => string | null;
}

export const STEPS: StepDef[] = [
  {
    key: 'full_name',
    question: "Welcome to VATTAMS! I'm here to guide you through the technician registration process step by step. Let's start — what's your full name?",
    field: 'full_name',
    type: 'text',
    placeholder: 'Enter your full name',
    validate: (v) => v.trim().length < 2 ? 'Name must be at least 2 characters' : null,
  },
  {
    key: 'mobile',
    question: 'Great! What is your mobile number?',
    field: 'mobile',
    type: 'tel',
    placeholder: '10-digit mobile number',
    validate: (v) => !/^[6-9]\d{9}$/.test(v.trim()) ? 'Enter a valid 10-digit Indian mobile number' : null,
  },
  {
    key: 'whatsapp_number',
    question: 'What is your WhatsApp number? (Enter same as mobile if identical)',
    field: 'whatsapp_number',
    type: 'tel',
    placeholder: '10-digit WhatsApp number',
    validate: (v) => !/^[6-9]\d{9}$/.test(v.trim()) ? 'Enter a valid 10-digit WhatsApp number' : null,
  },
  {
    key: 'email',
    question: 'What is your email address? (Optional — you can skip by typing "skip")',
    field: 'email',
    type: 'email',
    placeholder: 'your@email.com',
    optional: true,
    validate: (v) => v.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? 'Enter a valid email or type "skip"' : null,
  },
  {
    key: 'city',
    question: 'Which city are you located in?',
    field: 'city',
    type: 'select',
    options: [
      'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Vellore', 'Thoothukudi', 'Erode', 'Dindigul', 'Thanjavur', 'Karur', 'Kumbakonam', 'Sivakasi',
      'Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Pune',
      'Ahmedabad', 'Surat', 'Vadodara', 'Jaipur', 'Jodhpur', 'Udaipur',
      'Lucknow', 'Kanpur', 'Varanasi', 'Patna', 'Gaya', 'Kolkata', 'Siliguri',
      'Bhubaneswar', 'Chandigarh', 'Ludhiana', 'Amritsar', 'Gurugram', 'Faridabad',
      'Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Visakhapatnam', 'Vijayawada',
      'Guwahati', 'Ranchi', 'Raipur', 'Dehradun', 'Shimla', 'Panaji',
      'Other',
    ],
    validate: (v) => !v ? 'Please select your city' : null,
  },
  {
    key: 'area',
    question: 'What area or locality do you work in?',
    field: 'area',
    type: 'text',
    placeholder: 'e.g. T Nagar, Anna Nagar',
    validate: (v) => v.trim().length < 2 ? 'Please enter your area' : null,
  },
  {
    key: 'pincode',
    question: 'What is your PIN code?',
    field: 'pincode',
    type: 'text',
    placeholder: '6-digit PIN code',
    validate: (v) => !/^\d{6}$/.test(v.trim()) ? 'Enter a valid 6-digit PIN code' : null,
  },
  {
    key: 'service_categories',
    question: 'Which services can you provide? Select all that apply.',
    field: 'service_categories',
    type: 'multiselect',
    options: TECHNICIAN_SERVICES,
    validate: (v, form) => form.service_categories.length === 0 ? 'Select at least one service' : null,
  },
  {
    key: 'experience_years',
    question: 'How many years of experience do you have?',
    field: 'experience_years',
    type: 'number',
    placeholder: 'e.g. 5',
    validate: (v) => { const n = Number(v); return (isNaN(n) || n < 0 || n > 50) ? 'Enter a valid number (0-50)' : null; },
  },
  {
    key: 'available_days',
    question: 'Which days are you available to work?',
    field: 'available_days',
    type: 'multiselect',
    options: AVAILABLE_DAYS,
    validate: (_v, form) => form.available_days.length === 0 ? 'Select at least one day' : null,
  },
  {
    key: 'working_time',
    question: 'What are your preferred working hours?',
    field: 'working_time',
    type: 'select',
    options: TIME_SLOTS,
    validate: (v) => !v ? 'Please select your working time' : null,
  },
  {
    key: 'has_vehicle',
    question: 'Do you have your own vehicle for travel?',
    field: 'has_vehicle',
    type: 'boolean',
  },
  {
    key: 'has_tools',
    question: 'Do you have your own tools?',
    field: 'has_tools',
    type: 'boolean',
  },
  {
    key: 'aadhaar',
    question: 'Please upload a photo of your Aadhaar card. This is required for verification.',
    field: 'aadhaar_url',
    type: 'upload',
    validate: (_v, form) => !form.aadhaar_url ? 'Aadhaar upload is required' : null,
  },
  {
    key: 'pan',
    question: 'Please upload a photo of your PAN card. This is required for tax compliance.',
    field: 'pan_url',
    type: 'upload',
    validate: (_v, form) => !form.pan_url ? 'PAN upload is required' : null,
  },
  {
    key: 'dl',
    question: 'Do you have a driving license? Upload it if you do. (Optional — you can skip)',
    field: 'dl_url',
    type: 'upload',
    optional: true,
  },
  {
    key: 'profile_photo',
    question: 'Please upload a clear profile photo of yourself.',
    field: 'profile_photo_url',
    type: 'upload',
    validate: (_v, form) => !form.profile_photo_url ? 'Profile photo is required' : null,
  },
  {
    key: 'bank_name',
    question: "Let's collect your bank details for payments. What is your bank name?",
    field: 'bank_name',
    type: 'text',
    placeholder: 'e.g. State Bank of India',
    validate: (v) => v.trim().length < 2 ? 'Please enter your bank name' : null,
  },
  {
    key: 'bank_holder_name',
    question: 'What is the account holder name?',
    field: 'bank_holder_name',
    type: 'text',
    placeholder: 'Name as per bank records',
    validate: (v) => v.trim().length < 2 ? 'Please enter account holder name' : null,
  },
  {
    key: 'bank_account_number',
    question: 'What is your bank account number?',
    field: 'bank_account_number',
    type: 'text',
    placeholder: 'Account number',
    validate: (v) => !/^\d{9,18}$/.test(v.trim()) ? 'Enter a valid bank account number (9-18 digits, numbers only)' : null,
  },
  {
    key: 'bank_ifsc',
    question: 'What is the IFSC code for your bank branch?',
    field: 'bank_ifsc',
    type: 'text',
    placeholder: 'e.g. SBIN0001234',
    validate: (v) => !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.trim().toUpperCase()) ? 'Enter a valid IFSC code (e.g. SBIN0001234)' : null,
  },
  {
    key: 'upi_id',
    question: 'What is your UPI ID for quick payments? (Optional — type "skip" if not available)',
    field: 'upi_id',
    type: 'text',
    placeholder: 'e.g. yourname@paytm',
    optional: true,
    validate: (v) => v.trim() && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,64}$/.test(v.trim()) ? 'Enter a valid UPI ID (e.g. yourname@paytm) or type "skip"' : null,
  },
  {
    key: 'password',
    question: 'Finally, create a password for your technician account (min 6 characters). You will use this to log in.',
    field: 'password',
    type: 'password',
    placeholder: 'Create a password',
    validate: (v) => v.length < 6 ? 'Password must be at least 6 characters' : null,
  },
  {
    key: 'review',
    question: 'Please review your details below and submit your application.',
    field: null,
    type: 'review',
  },
];

export function calculateProfileScore(form: TechnicianFormData): { score: number; missing: string[] } {
  const checks: { label: string; done: boolean }[] = [
    { label: 'Full Name', done: !!form.full_name },
    { label: 'Mobile Number', done: !!form.mobile },
    
    { label: 'WhatsApp Number', done: !!form.whatsapp_number },
    { label: 'Email', done: !!form.email },
    { label: 'City', done: !!form.city },
    { label: 'Area', done: !!form.area },
    { label: 'PIN Code', done: !!form.pincode },
    { label: 'Service Categories', done: form.service_categories.length > 0 },
    { label: 'Experience', done: !!form.experience_years },
    { label: 'Available Days', done: form.available_days.length > 0 },
    { label: 'Working Time', done: !!form.working_time },
    { label: 'Vehicle Info', done: form.has_vehicle !== null },
    { label: 'Tools Info', done: form.has_tools !== null },
    { label: 'Aadhaar Upload', done: !!form.aadhaar_url },
    { label: 'PAN Upload', done: !!form.pan_url },
    { label: 'Profile Photo', done: !!form.profile_photo_url },
    { label: 'Bank Details', done: !!form.bank_account_number && !!form.bank_ifsc },
    { label: 'UPI ID', done: !!form.upi_id },
  ];
  const completed = checks.filter((c) => c.done).length;
  const score = Math.round((completed / checks.length) * 100);
  const missing = checks.filter((c) => !c.done).map((c) => c.label);
  return { score, missing };
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function validateFile(file: File): string | null {
  if (!file) return 'Please choose a file';
  if (file.size === 0) return 'This file appears to be empty. Please choose another file';
  if (file.size > MAX_FILE_SIZE) return 'File size must be under 10MB';
  if (!ALLOWED_MIME_TYPES.includes(file.type)) return 'Only JPG, PNG, WebP, and PDF files are allowed';
  return null;
}

// Documents split across two buckets:
// - `technician-docs`   → PRIVATE (Aadhaar, PAN, Driving Licence). Never
//   exposed via public URL. We store the object PATH in the technician
//   record, not a URL. Only the service_role (used by edge functions /
//   admin tooling) can read these back, via a signed URL.
// - `technician-photos` → PUBLIC (profile photo only). This is displayed
//   directly as <img src> in the technician dashboard/admin, so it stays
//   on a public bucket and we store the full public URL for it.
export type DocType = 'aadhaar' | 'pan' | 'dl' | 'profile_photo';

const PRIVATE_DOC_TYPES: DocType[] = ['aadhaar', 'pan', 'dl'];

function bucketForDocType(docType: DocType): string {
  return docType === 'profile_photo' ? 'technician-photos' : 'technician-docs';
}

/**
 * Uploads a document/photo directly to Supabase Storage using a raw XHR
 * request so we can report real upload progress (the supabase-js client
 * does not expose progress events). Uses only the public anon key — the
 * upload is permitted by a scoped Storage RLS policy (see migrations),
 * never a service_role key.
 *
 * Returns:
 *  - the storage object PATH for private docs (aadhaar/pan/dl)
 *  - the public URL for the profile photo
 */
export function uploadDocumentWithProgress(
  file: File,
  technicianMobile: string,
  docType: DocType,
  onProgress?: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const validationError = validateFile(file);
    if (validationError) {
      reject(new Error(validationError));
      return;
    }

    const mobile = (technicianMobile || '').trim();
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      reject(new Error('We need your mobile number before uploading documents. Please go back and complete that step first.'));
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const bucket = bucketForDocType(docType);
    const path = `${mobile}/${docType}.${ext}`;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURIComponent(path).replace(/%2F/g, '/')}`);
    xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);

        if (PRIVATE_DOC_TYPES.includes(docType)) {
          resolve(path);
        } else {
          const { data } = supabase.storage.from(bucket).getPublicUrl(path);
          resolve(data.publicUrl);
        }
      } else {
        let message = `Upload failed (${xhr.status}). Please try again.`;
        try {
          const parsed = JSON.parse(xhr.responseText);
          message = parsed.message || parsed.error || message;
        } catch {
          // ignore parse errors, keep default message
        }
        reject(new Error(message));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during upload. Check your connection and try again.'));
    };

    xhr.send(file);
  });
}

// ---------------------------------------------------------------------------
// Registration draft persistence — lets a technician resume registration
// after closing the tab or refreshing the page. Stored in localStorage on
// the same device/browser (there is no authenticated session yet at this
// point in the flow, so a server-side session isn't available). The
// password is intentionally never persisted.
// ---------------------------------------------------------------------------

const DRAFT_KEY = 'vattams_technician_registration_draft_v1';

export interface RegistrationDraft {
  stepIndex: number;
  form: Omit<TechnicianFormData, 'password'>;
  chatHistory: { role: 'ai' | 'user'; text: string }[];
  savedAt: number;
}

export function saveRegistrationDraft(
  stepIndex: number,
  form: TechnicianFormData,
  chatHistory: { role: 'ai' | 'user'; text: string }[]
): void {
  try {
    const { password: _password, ...rest } = form;
    const payload: RegistrationDraft = {
      stepIndex,
      form: rest,
      chatHistory,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.) —
    // registration should still work without resume support.
  }
}

export function loadRegistrationDraft(): RegistrationDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (typeof parsed?.stepIndex !== 'number' || !parsed?.form) return null;

    return parsed as RegistrationDraft;
  } catch {
    return null;
  }
}

export function clearRegistrationDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
export async function submitTechnicianApplication(
  form: TechnicianFormData,
  registrationPaymentId?: string
): Promise<any> {
  const { score } = calculateProfileScore(form);

  const response = await fetch(
    'https://nfcibyprftnowaiwlxxc.supabase.co/functions/v1/technician-auth/register',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mY2lieXByZnRub3dhaXdseHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4ODMzOTgsImV4cCI6MjA5OTQ1OTM5OH0.5ZMjWYOuRBKNKG3ZonXXOBAfBapm54naphNXrHxq16k',
      },
      body: JSON.stringify({
        full_name: form.full_name,
        mobile: form.mobile,
        email: form.email || undefined,
        city: form.city,
        service_categories: form.service_categories,
        experience_years: Number(form.experience_years),
        password: form.password,
        whatsapp_number: form.whatsapp_number,
        area: form.area,
        pincode: form.pincode,
        available_days: form.available_days,
        working_time: form.working_time,
        has_vehicle: form.has_vehicle,
        has_tools: form.has_tools,
        aadhaar_url: form.aadhaar_url,
        pan_url: form.pan_url,
        dl_url: form.dl_url || undefined,
        profile_photo_url: form.profile_photo_url,
        bank_name: form.bank_name,
        bank_holder_name: form.bank_holder_name,
        bank_account_number: form.bank_account_number,
        bank_ifsc: form.bank_ifsc,
        upi_id: form.upi_id || undefined,
        profile_score: score,
        registration_payment_id: registrationPaymentId,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Registration failed.');
  }

  return result.technician;
}