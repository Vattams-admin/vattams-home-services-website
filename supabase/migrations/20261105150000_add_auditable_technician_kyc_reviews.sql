-- Auditable per-document KYC decisions. Service-role Edge Functions only.
CREATE TABLE IF NOT EXISTS public.technician_kyc_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('aadhaar','pan')),
  document_path text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved','rejected')),
  reviewer_admin_id uuid NOT NULL REFERENCES public.admin_users(id),
  review_reason text,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_technician_kyc_reviews_latest
  ON public.technician_kyc_reviews (technician_id, document_type, reviewed_at DESC, id DESC);
ALTER TABLE public.technician_kyc_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.technician_kyc_reviews FROM anon, authenticated;
