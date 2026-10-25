-- VATTAMS Home Services: expandable service catalogue and city-level availability.
-- New catalogue entries are staged in a registry and are NOT customer-bookable by default.
-- No customer, technician, booking, payment, or wallet records are inserted.

CREATE TABLE IF NOT EXISTS public.service_catalog_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  service_group text NOT NULL,
  description text NOT NULL DEFAULT '',
  listing_mode text NOT NULL DEFAULT 'request_quote'
    CHECK (listing_mode IN ('fixed_price', 'request_quote', 'provider_contact')),
  requires_qualification boolean NOT NULL DEFAULT false,
  regulated_or_partner_only boolean NOT NULL DEFAULT false,
  is_enabled boolean NOT NULL DEFAULT false,
  customer_price_configured boolean NOT NULL DEFAULT false,
  technician_payout_configured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_service_catalog_registry_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS service_catalog_registry_updated_at ON public.service_catalog_registry;
CREATE TRIGGER service_catalog_registry_updated_at
  BEFORE UPDATE ON public.service_catalog_registry
  FOR EACH ROW EXECUTE FUNCTION public.set_service_catalog_registry_updated_at();

ALTER TABLE public.service_catalog_registry ENABLE ROW LEVEL SECURITY;
-- Deliberately no anon/authenticated policies: changes must go through a verified
-- super-admin edge-function path using the service role, never a public client.

CREATE TABLE IF NOT EXISTS public.city_service_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_slug text NOT NULL REFERENCES public.service_catalog_registry(slug) ON UPDATE CASCADE ON DELETE CASCADE,
  city text NOT NULL,
  is_available boolean NOT NULL DEFAULT false,
  service_area_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_slug, lower(city))
);

CREATE OR REPLACE FUNCTION public.set_city_service_availability_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS city_service_availability_updated_at ON public.city_service_availability;
CREATE TRIGGER city_service_availability_updated_at
  BEFORE UPDATE ON public.city_service_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_city_service_availability_updated_at();

ALTER TABLE public.city_service_availability ENABLE ROW LEVEL SECURITY;
-- Deliberately no public write/read policies until a server-side availability
-- endpoint is wired to the booking flow and admin dashboard.

INSERT INTO public.service_catalog_registry
  (slug, name, service_group, description, listing_mode, requires_qualification, regulated_or_partner_only)
VALUES
  ('ac-installation', 'AC Installation', 'AC & Cooling', 'Split/window AC installation and relocation', 'request_quote', true, false),
  ('ac-service-repair', 'AC Service & Repair', 'AC & Cooling', 'AC servicing, cleaning, fault diagnosis and repair', 'request_quote', true, false),
  ('ac-gas-refill', 'AC Gas Refill', 'AC & Cooling', 'Refrigerant diagnosis and refill by qualified personnel', 'request_quote', true, false),
  ('refrigerator-repair', 'Refrigerator Repair', 'Home Appliances', 'Refrigerator diagnosis and repair', 'request_quote', true, false),
  ('washing-machine-repair', 'Washing Machine Repair', 'Home Appliances', 'Washer diagnosis and repair', 'request_quote', true, false),
  ('microwave-repair', 'Microwave Repair', 'Home Appliances', 'Microwave oven diagnosis and repair', 'request_quote', true, false),
  ('geyser-water-heater', 'Geyser & Water Heater', 'Home Appliances', 'Water heater installation and repair', 'request_quote', true, false),
  ('ro-water-purifier', 'RO Water Purifier', 'Water & Pumps', 'Purifier installation, servicing and filter replacement', 'request_quote', true, false),
  ('electrical-services', 'Electrical Services', 'Electrical & Power', 'Wiring, switches, fans, lighting and electrical fault checks', 'request_quote', true, false),
  ('plumbing-services', 'Plumbing Services', 'Plumbing & Water', 'Pipe, tap, leak and drainage repairs', 'request_quote', true, false),
  ('ups-inverter-battery', 'UPS, Inverter & Battery', 'Backup Power', 'Installation, battery testing, replacement and servicing', 'request_quote', true, false),
  ('solar-installation-maintenance', 'Solar Installation & Maintenance', 'Solar Energy', 'Solar panels, inverter checks and maintenance', 'request_quote', true, false),
  ('cctv-security', 'CCTV & Security Systems', 'Security & Smart Home', 'CCTV, video doorbells and recording-system setup', 'request_quote', true, false),
  ('carpentry-furniture', 'Carpentry & Furniture', 'Home Maintenance', 'Door, lock, hinge, furniture assembly and repairs', 'request_quote', false, false),
  ('home-deep-cleaning', 'Home Deep Cleaning', 'Cleaning', 'Home, kitchen, bathroom and move-in/move-out cleaning', 'request_quote', false, false),
  ('sofa-mattress-cleaning', 'Sofa & Mattress Cleaning', 'Cleaning', 'Upholstery and mattress cleaning', 'request_quote', false, false),
  ('pest-control', 'Pest Control', 'Cleaning & Hygiene', 'Pest inspection and treatment through eligible providers', 'request_quote', true, true),
  ('water-tank-cleaning', 'Water Tank Cleaning', 'Water & Pumps', 'Overhead and underground tank cleaning', 'request_quote', false, false),
  ('water-pump-motor', 'Water Pump & Motor', 'Water & Pumps', 'Pump and motor installation, repair and maintenance', 'request_quote', true, false),
  ('tv-entertainment', 'TV & Entertainment Setup', 'Electronics', 'TV mounting, DTH alignment and home theatre setup', 'request_quote', true, false),
  ('ev-charger-installation', 'EV Charger Installation', 'EV & Mobility', 'Home charger installation and fault diagnosis', 'request_quote', true, false),
  ('water-quality-treatment', 'Water Quality & Treatment', 'Water & Pumps', 'Water testing, softeners and filtration systems', 'request_quote', true, false),
  ('smart-home-automation', 'Smart Home & Access', 'Security & Smart Home', 'Smart switches, sensors, locks and gate automation', 'request_quote', true, false),
  ('waterproofing-property', 'Waterproofing & Property Repair', 'Property Maintenance', 'Terrace waterproofing, dampness and minor repairs', 'request_quote', true, false),
  ('commercial-maintenance', 'Commercial Property Maintenance', 'Commercial Services', 'Office/shop maintenance and preventive service requests', 'request_quote', true, false),
  ('internet-networking', 'Internet & Networking', 'Digital & IT', 'Wi-Fi, router setup, LAN cabling and troubleshooting', 'request_quote', true, false),
  ('computer-printer-support', 'Computer & Printer Support', 'Digital & IT', 'Computer troubleshooting and printer setup/repair', 'request_quote', true, false),
  ('dishwasher-chimney', 'Dishwasher & Kitchen Equipment', 'Home Appliances', 'Dishwasher, kitchen chimney and related appliance servicing', 'request_quote', true, false),
  ('gardening-irrigation', 'Gardening & Irrigation', 'Outdoor Services', 'Garden care, irrigation and outdoor lighting', 'request_quote', false, false),
  ('moving-assembly', 'Moving & Furniture Assembly', 'Moving & Setup', 'Furniture assembly and small-item moving assistance', 'request_quote', false, false),
  ('fire-safety-equipment', 'Fire Safety Equipment', 'Safety Services', 'Eligible fire-safety equipment checks and servicing', 'request_quote', true, true),
  ('lift-generator-maintenance', 'Lift & Generator Maintenance', 'Commercial Services', 'Specialist maintenance via qualified/licensed providers', 'request_quote', true, true),
  ('home-cooking-meal-prep', 'Home Cooking & Meal Preparation', 'Home & Lifestyle', 'Home cook and meal preparation listings', 'provider_contact', false, false),
  ('laundry-ironing', 'Laundry & Ironing', 'Home & Lifestyle', 'Laundry, ironing and pickup/drop-off requests', 'request_quote', false, false),
  ('beauty-personal-care', 'Beauty & Personal Care', 'Personal Care', 'At-home grooming, salon, makeup and mehndi listings', 'provider_contact', false, false),
  ('vehicle-doorstep-services', 'Vehicle Doorstep Services', 'Vehicle Services', 'Vehicle wash, detailing, battery and eligible roadside assistance', 'request_quote', true, false),
  ('vehicle-mechanic', 'Car & Bike Mechanic', 'Vehicle Services', 'Vehicle inspection, maintenance and repair listings', 'request_quote', true, false),
  ('elder-companion-nonmedical', 'Elder Companion & Non-medical Assistance', 'Care & Assistance', 'Non-medical companion and household support', 'provider_contact', true, false),
  ('event-photography-decoration', 'Photography & Event Services', 'Events & Local Professionals', 'Photography, decoration and event support listings', 'provider_contact', false, false),
  ('professional-accounting-tax', 'Accounting & Tax Assistance', 'Professional Services', 'Administrative support and referrals to qualified professionals', 'provider_contact', true, true),
  ('design-writing-translation', 'Design, Writing & Translation', 'Online & Digital Services', 'Graphic design, writing, translation and digital content', 'provider_contact', false, false),
  ('insurance-information-referral', 'Insurance Information & Partner Referral', 'Insurance & Protection', 'Permitted general information and referrals to authorised insurers/intermediaries only', 'provider_contact', true, true),
  ('home-property-insurance-assistance', 'Home & Property Insurance Assistance', 'Insurance & Protection', 'Document guidance and authorised partner referrals; no unlicensed solicitation or advice', 'provider_contact', true, true),
  ('vehicle-insurance-assistance', 'Vehicle Insurance Assistance', 'Insurance & Protection', 'Renewal reminders and authorised partner referrals', 'provider_contact', true, true),
  ('appliance-warranty-protection', 'Appliance Warranty & Protection', 'Insurance & Protection', 'Warranty information and eligible protection-plan partner referrals', 'provider_contact', true, true),
  ('damage-inspection-claim-docs', 'Damage Inspection & Claim Documentation', 'Insurance & Protection', 'Connect customers with eligible inspection professionals; insurer decides claims', 'provider_contact', true, true),
  ('professional-home-care', 'Professional Home Care', 'Care & Assistance', 'Qualified care and support listings; medical tasks only by licensed providers', 'provider_contact', true, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  service_group = EXCLUDED.service_group,
  description = EXCLUDED.description,
  listing_mode = EXCLUDED.listing_mode,
  requires_qualification = EXCLUDED.requires_qualification,
  regulated_or_partner_only = EXCLUDED.regulated_or_partner_only;
