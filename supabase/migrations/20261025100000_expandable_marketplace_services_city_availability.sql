-- Expandable service marketplace catalogue and per-city availability.
-- All new entries are enquiry-only/inactive until an admin enables them.
-- Writes are performed only through the authenticated admin-data Edge Function.
CREATE TABLE IF NOT EXISTS public.marketplace_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL,
  customer_pricing_mode text NOT NULL DEFAULT 'quote'
    CHECK (customer_pricing_mode IN ('fixed', 'starting_at', 'quote')),
  customer_base_price numeric(10,2),
  gst_rate numeric(5,2) NOT NULL DEFAULT 18 CHECK (gst_rate >= 0 AND gst_rate <= 100),
  customer_platform_fee numeric(10,2) NOT NULL DEFAULT 0 CHECK (customer_platform_fee >= 0),
  technician_payout_mode text NOT NULL DEFAULT 'per_job'
    CHECK (technician_payout_mode IN ('fixed', 'per_job', 'quote')),
  technician_payout numeric(10,2) CHECK (technician_payout IS NULL OR technician_payout >= 0),
  requires_qualified_provider boolean NOT NULL DEFAULT false,
  requires_admin_review boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_service_city_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.marketplace_services(id) ON DELETE CASCADE,
  city text NOT NULL,
  is_available boolean NOT NULL DEFAULT false,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_service_city_availability_city_nonempty CHECK (length(trim(city)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS marketplace_service_city_availability_unique
  ON public.marketplace_service_city_availability (service_id, lower(city));

CREATE INDEX IF NOT EXISTS marketplace_services_active_idx
  ON public.marketplace_services (is_active, category);
CREATE INDEX IF NOT EXISTS marketplace_service_city_city_idx
  ON public.marketplace_service_city_availability (lower(city), is_available);

ALTER TABLE public.marketplace_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_service_city_availability ENABLE ROW LEVEL SECURITY;

-- Public can only read active service records and explicitly enabled city mappings.
DROP POLICY IF EXISTS marketplace_services_public_read ON public.marketplace_services;
CREATE POLICY marketplace_services_public_read ON public.marketplace_services
  FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS marketplace_city_availability_public_read ON public.marketplace_service_city_availability;
CREATE POLICY marketplace_city_availability_public_read ON public.marketplace_service_city_availability
  FOR SELECT TO anon, authenticated USING (
    is_available = true AND EXISTS (
      SELECT 1 FROM public.marketplace_services s
      WHERE s.id = service_id AND s.is_active = true
    )
  );

-- No anon/authenticated write policies: admin-data uses service role after session validation.
