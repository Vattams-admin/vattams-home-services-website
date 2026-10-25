-- VATTAMS Home Services: expandable service catalogue.
-- This migration adds catalogue entries only. It does not create technician,
-- customer, booking, payment, or wallet records.
-- Prices below are deliberately NOT seeded: admins must configure and verify
-- customer pricing, taxes/fees, technician payouts, and city coverage before activation.

ALTER TABLE public.service_categories
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS service_group text,
  ADD COLUMN IF NOT EXISTS requires_qualified_provider boolean NOT NULL DEFAULT false;

-- Existing categories are retained. New entries remain inactive until an admin
-- has configured pricing and coverage in the service management workflow.
WITH catalogue(name, description, icon, service_group, qualified) AS (
  VALUES
  ('UPS & Inverter Installation and Repair','UPS/inverter installation, diagnostics, servicing and backup-power troubleshooting','battery','Power & Energy',true),
  ('Battery Testing and Replacement','Battery health testing, replacement and maintenance','battery-charging','Power & Energy',true),
  ('Solar Panel Installation and Maintenance','Rooftop solar installation, cleaning, inspection and maintenance','sun','Power & Energy',true),
  ('Solar Inverter and Storage Systems','Solar inverter, controller and battery-storage servicing','sun','Power & Energy',true),
  ('Electrical Wiring and Repairs','Wiring, switches, lighting, fans, MCB and fault diagnosis','zap','Electrical',true),
  ('EV Charger Installation and Service','Home EV charger installation, inspection and repair','plug-zap','EV & Mobility',true),
  ('CCTV and Security Systems','CCTV, video doorbells, smart locks and recording systems','camera','Security & Smart Home',false),
  ('Home Networking and Wi-Fi','Router, Wi-Fi, LAN cabling and connectivity support','wifi','Digital & IT',false),
  ('Computer, Laptop and Printer Support','Computer troubleshooting, setup, printer and peripheral support','laptop','Digital & IT',false),
  ('TV and Home Entertainment','TV mounting, diagnosis, soundbar, home theatre and DTH setup','tv','Electronics',false),
  ('Carpentry and Furniture','Door, lock, hinge, furniture assembly, shelf and cupboard repairs','hammer','Home Repairs',false),
  ('Home Deep Cleaning','Full-home, kitchen, bathroom and move-in/move-out cleaning','sparkles','Cleaning',false),
  ('Sofa and Mattress Cleaning','Upholstery, mattress and stain-cleaning services','sofa','Cleaning',false),
  ('Pest Control','General pest, cockroach, ant, termite and rodent treatment by eligible providers','bug','Cleaning & Hygiene',true),
  ('Water Tank and Sump Cleaning','Overhead/underground tank and sump cleaning','droplets','Water Services',false),
  ('Water Pump and Motor Service','Water pump, pressure pump and motor diagnostics and repair','gauge','Water Services',true),
  ('Water Quality Testing and Treatment','Water testing, softener, filtration and whole-house water treatment','droplets','Water Services',true),
  ('Plumbing and Leak Repairs','Pipe, tap, drainage, fixture and leak repairs','wrench','Plumbing',false),
  ('Dishwasher and Kitchen Appliance Repair','Dishwasher, chimney and kitchen-appliance service','cooking-pot','Appliances',true),
  ('Geyser and Water Heater Service','Water heater installation, repair and maintenance','thermometer','Appliances',true),
  ('Refrigerator Repair','Refrigerator diagnostics and repairs','refrigerator','Appliances',true),
  ('Washing Machine Repair','Washer diagnostics, repair and maintenance','washing-machine','Appliances',true),
  ('Microwave Repair','Microwave oven diagnostics and repair','microwave','Appliances',true),
  ('AC Installation and Repair','AC installation, servicing, cleaning and fault diagnosis','wind','Appliances',true),
  ('AC Gas and Cooling System Service','Refrigerant-related service by suitably qualified personnel','thermometer','Appliances',true),
  ('Painting and Wall Touch-ups','Painting, touch-ups and minor wall finishing','paint-roller','Property Maintenance',false),
  ('Waterproofing and Damp Inspection','Terrace waterproofing and dampness inspection','house','Property Maintenance',true),
  ('Tile, Grout and Fixture Repairs','Minor tile, grout, drilling and fixture installation','grid-2x2','Property Maintenance',false),
  ('Garden and Lawn Maintenance','Gardening, lawn care, irrigation and outdoor maintenance','flower-2','Outdoor',false),
  ('Tree Trimming and Outdoor Work','Outdoor upkeep and tree trimming through suitably equipped providers','trees','Outdoor',true),
  ('Home Cooking and Meal Preparation','In-home cooking and meal-preparation services','cooking-pot','Home & Lifestyle',false),
  ('Laundry and Ironing','Laundry, ironing and garment-care services','shirt','Home & Lifestyle',false),
  ('Home Help and Household Assistance','Household help and non-medical domestic assistance','house','Home & Lifestyle',false),
  ('Beauty and Grooming at Home','Salon, barber, makeup, mehndi and grooming services','scissors','Beauty & Personal Care',false),
  ('Car and Bike Wash','Vehicle washing, cleaning and detailing','car-front','Vehicle Services',false),
  ('Doorstep Vehicle Mechanic','Vehicle diagnostics and repair through qualified mechanics','car-front','Vehicle Services',true),
  ('Tyre and Battery Roadside Assistance','Tyre support and vehicle battery jump-start/replacement','truck','Vehicle Services',true),
  ('Packers, Movers and Furniture Assembly','Moving support, packing and furniture assembly','package','Moving & Assembly',false),
  ('Photography and Event Services','Photography, decoration, catering and event support','camera','Events',false),
  ('Office and Commercial Maintenance','Commercial cleaning, electrical, plumbing and routine maintenance','building-2','Commercial Services',true),
  ('Apartment Maintenance Contracts','Scheduled common-area and property maintenance','building','Commercial Services',true),
  ('Elder Companion and Non-medical Assistance','Companionship and non-medical home assistance','heart-handshake','Care & Assistance',false),
  ('Accessible Home Support','Non-clinical assistance and accessibility-related home setup','accessibility','Care & Assistance',false),
  ('Accounting and Tax Filing Assistance','Administrative accounting and tax-filing assistance by qualified providers where required','calculator','Professional Services',true),
  ('Design, Translation and Content Services','Graphic design, translation, writing and digital marketing','palette','Online & Professional',false),
  ('Website and Virtual Assistant Services','Website support, online administration and virtual assistance','monitor','Online & Professional',false),
  ('Fire Safety Equipment Services','Eligible fire-safety equipment inspection and installation through authorised providers','shield-check','Safety & Compliance',true),
  ('Generator Maintenance','Generator inspection and servicing by qualified specialists','zap','Commercial Services',true),
  ('Lift and Elevator Maintenance','Lift maintenance through licensed/specialist providers','arrow-up-down','Commercial Services',true),
  ('Automatic Gate and Access Control','Gate motors, access-control and automation servicing','door-open','Security & Smart Home',true),
  ('Home Insurance Information and Referrals','Permitted information and referrals to authorised insurers/intermediaries only; no unlicensed insurance sale or advice','shield','Insurance Assistance',true),
  ('Vehicle Insurance Renewal Assistance','Administrative renewal reminders and authorised partner referrals only','file-check','Insurance Assistance',true),
  ('Appliance Warranty and Protection Assistance','Warranty information and eligible protection-plan partner referrals','badge-check','Protection & Warranty',false),
  ('Damage Inspection and Claim Documentation Support','Connect customers to eligible inspectors and help organise supporting documents; insurers decide claims','clipboard-check','Insurance Assistance',true),
  ('General Home Maintenance','Minor repairs and scheduled preventive maintenance','wrench','Property Maintenance',false)
)
INSERT INTO public.service_categories (name, description, icon, service_group, requires_qualified_provider, is_active)
SELECT c.name, c.description, c.icon, c.service_group, c.qualified, false
FROM catalogue c
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_categories existing
  WHERE lower(trim(existing.name)) = lower(trim(c.name))
);

-- Never activate new catalogue services or invent prices automatically.
-- Existing service_prices records are preserved without modification.
