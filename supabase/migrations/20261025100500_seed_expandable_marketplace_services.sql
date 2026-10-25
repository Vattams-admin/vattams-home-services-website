-- Seed an expandable catalogue. All new entries remain inactive until reviewed/configured.
INSERT INTO public.marketplace_services
  (service_key, name, description, category, customer_pricing_mode, requires_qualified_provider, requires_admin_review, is_active)
VALUES
  ('ups-inverter-battery', 'UPS, Inverter & Battery', 'UPS/inverter installation, battery testing, replacement and maintenance.', 'Power & Energy', 'quote', true, true, false),
  ('solar-energy', 'Solar Energy', 'Solar panel installation support, cleaning, maintenance and inverter checks.', 'Power & Energy', 'quote', true, true, false),
  ('electrical-ev-charging', 'Electrical & EV Charging', 'Electrical repair, wiring and EV charger installation through qualified professionals.', 'Electrical', 'quote', true, true, false),
  ('cctv-smart-security', 'CCTV & Smart Security', 'CCTV, video doorphones, smart locks and access control setup.', 'Security & Smart Home', 'quote', true, true, false),
  ('home-appliances', 'Home Appliances', 'Refrigerator, washing machine, microwave, geyser and other appliance services.', 'Appliances', 'quote', true, true, false),
  ('plumbing-water', 'Plumbing & Water', 'Pipe and leak repair, pumps, RO systems and water tank services.', 'Plumbing & Water', 'quote', true, true, false),
  ('carpentry-furniture', 'Carpentry & Furniture', 'Door, cupboard, furniture assembly, repair and fixture installation.', 'Home Maintenance', 'quote', false, true, false),
  ('home-deep-cleaning', 'Home & Deep Cleaning', 'Kitchen, bathroom, sofa, mattress and move-in/move-out cleaning.', 'Cleaning', 'quote', false, true, false),
  ('pest-control', 'Pest Control', 'General pest inspection and treatment through eligible providers.', 'Cleaning & Hygiene', 'quote', true, true, false),
  ('tv-entertainment', 'TV & Entertainment', 'TV mounting, DTH alignment and home theatre setup.', 'Electronics', 'quote', true, true, false),
  ('vehicle-services', 'Vehicle Services', 'Vehicle wash, detailing, doorstep mechanic and battery assistance.', 'Vehicle', 'quote', true, true, false),
  ('computer-it-support', 'Computer & IT Support', 'Laptop, printer, Wi-Fi, LAN and computer support.', 'Digital & IT', 'quote', false, true, false),
  ('garden-outdoor', 'Garden & Outdoor', 'Gardening, irrigation and outdoor maintenance.', 'Outdoor', 'quote', false, true, false),
  ('care-home-assistance', 'Care & Home Assistance', 'Non-medical home assistance and companionship through vetted providers.', 'Care', 'quote', true, true, false),
  ('events-lifestyle', 'Events & Lifestyle', 'Photography, decoration, catering and home cooking providers.', 'Events & Lifestyle', 'quote', false, true, false),
  ('commercial-maintenance', 'Commercial Maintenance', 'Office, shop, apartment and small-business maintenance.', 'Commercial', 'quote', true, true, false),
  ('painting-waterproofing', 'Painting & Waterproofing', 'Painting, dampness inspection and eligible waterproofing work.', 'Property Maintenance', 'quote', true, true, false),
  ('laundry-kitchen-help', 'Laundry & Kitchen Help', 'Laundry, ironing and non-specialist household assistance.', 'Home & Lifestyle', 'quote', false, true, false),
  ('professional-digital-services', 'Professional & Digital Services', 'Design, translation, content, digital marketing and virtual assistance.', 'Professional & Digital', 'quote', false, true, false),
  ('moving-assembly', 'Moving & Assembly', 'Packing assistance, small moves and furniture assembly.', 'Moving', 'quote', false, true, false),
  ('insurance-assistance', 'Insurance Information & Referrals', 'General information, document guidance and referrals to authorised insurance providers only.', 'Insurance Assistance', 'quote', true, true, false),
  ('warranty-claim-support', 'Warranty & Claim Documentation', 'Warranty information and help organising claim-support documents; decisions remain with the issuer/insurer.', 'Protection & Warranty', 'quote', false, true, false),
  ('water-quality-treatment', 'Water Quality & Treatment', 'Water testing, softeners and filtration system maintenance.', 'Water & Treatment', 'quote', true, true, false),
  ('fire-safety-specialist', 'Fire Safety & Specialist Maintenance', 'Eligible specialist services through appropriately qualified/authorised providers.', 'Safety & Specialist', 'quote', true, true, false),
  ('networking-wifi', 'Internet & Networking', 'Wi-Fi coverage, router setup, LAN cabling and network troubleshooting.', 'Digital & IT', 'quote', false, true, false),
  ('future-local-services', 'Other Local Services', 'A future expansion placeholder for admin-approved local service categories.', 'Future Services', 'quote', false, true, false)
ON CONFLICT (service_key) DO NOTHING;
