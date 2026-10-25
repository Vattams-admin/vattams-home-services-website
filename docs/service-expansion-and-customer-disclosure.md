# VATTAMS Home Services — Service Expansion & Customer Disclosure

## Product positioning

VATTAMS Home Services is a service-personnel discovery, connection, and booking platform. VATTAMS may facilitate a request or connect a customer with an independent service professional or partner. Do not imply that VATTAMS itself performs every job, that every request is guaranteed to be fulfilled, or that an immediate response is guaranteed.

Display the customer disclosure before booking submission, on the booking confirmation screen, and in the Help/Terms area. Require the customer to acknowledge it before submitting a booking.

### Customer-facing disclosure (plain English)

**Important service notice:** VATTAMS is a platform that helps customers request and connect with service personnel. Service delivery is subject to professional availability, service-area coverage, and confirmation of your request. Submitting a request does not guarantee acceptance, an immediate response, a fixed arrival time, or completion of the work. The assigned service professional or partner may contact you to confirm the scope, timing, and final quote. Please do not treat a booking request as confirmed until you receive confirmation.

VATTAMS's role, responsibilities, fees, cancellation/refund rules, and any applicable guarantees must be described accurately in the Terms and at checkout. Do not use this disclosure to waive responsibilities that VATTAMS is legally required to retain.

### Short version for booking screens

**Please note:** VATTAMS connects you with service personnel. Requests depend on availability and confirmation; an immediate response or service completion is not guaranteed. Your request is not confirmed until confirmation is sent.

### Tamil/Tanglish helper copy

**Mukkiya kurippu:** VATTAMS customer-ai service personnel-oda connect panna help pannum platform. Service personnel availability, unga city coverage, request confirmation poruthu service kidaikkum. Booking request submit pannradhu mattum immediate response, fixed arrival time, illa service completion guarantee illa. Confirmation message varum varai booking confirmed-nu consider panna vendam.

## Service catalogue expansion

All services must be individually configurable in the admin console. New catalogue entries default to inactive until pricing, service-area coverage, fulfillment capability, and any required qualifications are configured.

### Home services
- AC service, installation, cleaning, gas/refrigerant diagnosis and repair
- Refrigerator, washing machine, microwave, dishwasher, geyser, chimney and other appliance repair
- Electrical wiring, switches, lighting, fans, MCB/distribution board, earthing and fault diagnosis
- Plumbing, taps, pipes, drainage, leak repair and fixtures
- RO purifier, water filters, softeners, water quality testing
- Water pumps, motors, tanks, sump and tank cleaning
- UPS, inverter, battery testing/replacement and backup systems
- Solar panel, solar inverter, maintenance and battery-storage servicing
- CCTV, video doorphones, smart locks, networking and smart-home setup
- TV mounting, DTH, home theatre and audio equipment
- Carpentry, furniture assembly, door/lock/hinge, shelves and curtain rods
- Home deep cleaning, kitchen/bathroom cleaning, sofa/mattress cleaning and move-in/move-out cleaning
- Pest control, termite inspection and treatment
- Painting touch-ups, waterproofing inspection, tile/grout and minor property repairs
- EV charger installation/maintenance by appropriately qualified electrical professionals
- Garden irrigation, outdoor lighting, appliance installation and moving/assembly services

### Commercial and property services
- Office/shop electrical and plumbing maintenance
- Commercial and apartment common-area cleaning
- CCTV, LAN/Wi-Fi and access-control installation
- Preventive maintenance contracts
- Generator and lift maintenance through qualified specialist providers
- Fire-safety equipment services through appropriately qualified/licensed providers

### Insurance-related category (carefully scoped)
- Insurance policy information/referral through authorized insurers or licensed intermediaries
- Home-appliance protection-plan information and authorized service referrals
- Home/property insurance referral requests
- Claim-document checklist and appointment/referral assistance, where permitted
- Inspection/repair estimates or reports only where the insurer accepts them and the provider is qualified
- Insurance claim status support only through an authorized integration or partner

**Compliance guardrail:** VATTAMS must not represent itself as an insurer, insurance broker, corporate agent, web aggregator, loss assessor, or claims decision-maker unless the relevant entity holds the required authorization/licence. Do not sell, recommend, compare, solicit or distribute insurance products, collect premiums, promise claim approval, or provide regulated insurance advice unless legally permitted and appropriately authorized. For launch, prefer a clearly labelled “Insurance assistance / partner referral” category with vetted authorized partners and legal/compliance review before enabling it.

## Required admin controls for every service
- Service name, description, icon and category
- Active/inactive state
- Customer-facing price/quote model, applicable taxes and platform fees
- Technician/service-partner payout kept separate from customer price
- City/area-level availability
- Required qualifications, licenses, equipment and safety checklist
- Booking fields, scheduling rules and service-level expectations
- Partner confirmation state and customer notifications
- Cancellation, refund, dispute and escalation handling

## City availability and booking safeguards
- Admin can enable/disable each service for each supported city/area.
- Only services enabled for the customer's selected city can be requested.
- Validate availability again server-side when the booking is submitted; hiding a service in the UI alone is not sufficient.
- Do not mark a request confirmed until the service professional/partner or authorized workflow confirms it.
- Keep customer/technician test records and dummy financial activity out of production.

## Implementation acceptance checklist
- [ ] Service catalogue can be extended without a code deployment for ordinary category additions.
- [ ] New service defaults to inactive.
- [ ] Admin can set customer price and provider payout independently.
- [ ] Admin can toggle availability per city/area.
- [ ] Booking form filters unavailable services and server rejects unavailable combinations.
- [ ] Customer disclosure is visible and acknowledgement required before submission.
- [ ] Disclosure appears in confirmation/help/terms locations.
- [ ] Booking status clearly distinguishes requested, pending confirmation, confirmed, unavailable, cancelled and completed.
- [ ] Insurance category remains disabled until authorized partner and compliance approval are recorded.
- [ ] Safety-sensitive work is routed only to suitably qualified professionals.
