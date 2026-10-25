import {
  useMemo,
  useState } from 'react';
import {
  Wind,
  BatteryCharging,
  Sun,
  Zap,
  ShieldCheck,
  Refrigerator,
  WashingMachine,
  Droplets,
  Hammer,
  Sparkles,
  Bug,
  Tv,
  Car,
  Laptop,
  Trees,
  HeartHandshake,
  Camera,
  Briefcase,
  Wifi,
  Package,
  Building2,
  Paintbrush,
  Utensils,
  Scissors,
  FileCheck,
  ArrowRight,
  MapPin,
  Search,
  PlugZap,
  Wrench,
  Sofa,
  Shirt,
  Flower2,
  Monitor,
  CookingPot,
  Truck,
  Shield,
  Home,
  BadgeCheck,
  Thermometer,
  Router,
  Fan,
  ClipboardCheck,
  HelpCircle,
  Star,
} from 'lucide-react';
import { useRouter } from '@/lib/router';

type ServiceCategory = {
  name: string;
  detail: string;
  group: string;
  icon: typeof Wind;
  available?: boolean;
  partnerOnly?: boolean;
};

const categories: ServiceCategory[] = [
  { name: 'AC Service & Repair', detail: 'Cleaning, installation, cooling faults and maintenance', group: 'Home essentials', icon: Wind, available: true },
  { name: 'Refrigerator Repair', detail: 'Cooling, compressor diagnosis and appliance maintenance', group: 'Home essentials', icon: Refrigerator, available: true },
  { name: 'Washing Machine Repair', detail: 'Washer, spin, drainage and installation assistance', group: 'Home essentials', icon: WashingMachine, available: true },
  { name: 'Microwave & Kitchen Appliances', detail: 'Microwave, chimney, dishwasher and kitchen appliances', group: 'Home essentials', icon: CookingPot },
  { name: 'Geyser & Water Heater', detail: 'Water heater diagnosis, installation and servicing', group: 'Home essentials', icon: Thermometer },
  { name: 'Electrical & Wiring', detail: 'Switches, lights, fans, wiring and fault diagnosis', group: 'Home essentials', icon: Zap },
  { name: 'Plumbing & Leak Repair', detail: 'Pipes, taps, drainage, fixtures and leak repairs', group: 'Home essentials', icon: Wrench },
  { name: 'Water Pump & Motor', detail: 'Pump, motor, pressure and water-flow troubleshooting', group: 'Home essentials', icon: Fan },
  { name: 'Water Tank & Sump Cleaning', detail: 'Overhead tanks, sumps and water-storage cleaning', group: 'Home essentials', icon: Droplets },
  { name: 'RO & Water Purification', detail: 'Purifier maintenance, filters, softeners and water testing', group: 'Home essentials', icon: Droplets },
  { name: 'UPS, Inverter & Battery', detail: 'Backup power, battery checks and inverter service', group: 'Power & technology', icon: BatteryCharging },
  { name: 'Solar Energy Systems', detail: 'Solar panels, inverters, maintenance and storage', group: 'Power & technology', icon: Sun, partnerOnly: true },
  { name: 'EV Charger Installation', detail: 'Home charging setup and inspection by qualified professionals', group: 'Power & technology', icon: PlugZap, partnerOnly: true },
  { name: 'CCTV & Smart Security', detail: 'Cameras, video doorphones, smart locks and access systems', group: 'Power & technology', icon: ShieldCheck },
  { name: 'Wi-Fi & Networking', detail: 'Router setup, Wi-Fi coverage, LAN and troubleshooting', group: 'Power & technology', icon: Router },
  { name: 'Computer, Laptop & Printer', detail: 'Device setup, repair coordination and printer support', group: 'Power & technology', icon: Laptop },
  { name: 'TV & Home Entertainment', detail: 'TV mounting, DTH, soundbars and home-theatre setup', group: 'Power & technology', icon: Tv },
  { name: 'Carpentry & Furniture', detail: 'Doors, cupboards, shelves, fittings and furniture assembly', group: 'Home improvement', icon: Hammer },
  { name: 'Painting & Wall Repairs', detail: 'Painting, touch-ups, drilling and minor wall repairs', group: 'Home improvement', icon: Paintbrush },
  { name: 'Waterproofing & Damp Inspection', detail: 'Dampness checks and suitable specialist referrals', group: 'Home improvement', icon: Home, partnerOnly: true },
  { name: 'Tile, Grout & Fixture Repair', detail: 'Minor tile, grout, drilling and fixture installation', group: 'Home improvement', icon: Wrench },
  { name: 'Locksmith & Door Repair', detail: 'Door locks, hinges and lockout assistance through verified providers', group: 'Home improvement', icon: ShieldCheck },
  { name: 'Home Deep Cleaning', detail: 'Full-home, kitchen, bathroom and move-in/move-out cleaning', group: 'Cleaning & outdoor', icon: Sparkles },
  { name: 'Sofa & Mattress Cleaning', detail: 'Upholstery, mattress and fabric-care services', group: 'Cleaning & outdoor', icon: Sofa },
  { name: 'Pest Control', detail: 'Pest inspection and treatment through eligible providers', group: 'Cleaning & outdoor', icon: Bug, partnerOnly: true },
  { name: 'Garden & Lawn Care', detail: 'Gardening, lawn care, irrigation and outdoor upkeep', group: 'Cleaning & outdoor', icon: Trees },
  { name: 'Tree Trimming & Outdoor Work', detail: 'Outdoor maintenance through suitably equipped providers', group: 'Cleaning & outdoor', icon: Flower2, partnerOnly: true },
  { name: 'Laundry & Ironing', detail: 'Laundry, ironing and garment-care services', group: 'Home & lifestyle', icon: Shirt },
  { name: 'Home Help & Household Assistance', detail: 'Household support and non-medical domestic assistance', group: 'Home & lifestyle', icon: HeartHandshake },
  { name: 'Home Cooking & Meal Preparation', detail: 'In-home cooking and meal-preparation providers', group: 'Home & lifestyle', icon: Utensils },
  { name: 'Beauty & Grooming at Home', detail: 'Salon, barber, makeup and grooming service listings', group: 'Home & lifestyle', icon: Scissors },
  { name: 'Moving, Packing & Assembly', detail: 'Packing assistance, small moves and furniture assembly', group: 'Home & lifestyle', icon: Package },
  { name: 'Car & Bike Wash', detail: 'Vehicle wash, detailing and cleaning services', group: 'Vehicle services', icon: Car },
  { name: 'Doorstep Mechanic', detail: 'Vehicle diagnostics and repairs through qualified mechanics', group: 'Vehicle services', icon: Wrench, partnerOnly: true },
  { name: 'Tyre & Battery Roadside Help', detail: 'Tyre assistance and vehicle battery support', group: 'Vehicle services', icon: Truck, partnerOnly: true },
  { name: 'Photography & Event Support', detail: 'Photography, decoration and event-service providers', group: 'Business & professional', icon: Camera },
  { name: 'Office & Commercial Maintenance', detail: 'Office, shop, apartment and small-business maintenance', group: 'Business & professional', icon: Building2 },
  { name: 'Preventive Maintenance Contracts', detail: 'Scheduled property and equipment maintenance plans', group: 'Business & professional', icon: ClipboardCheck },
  { name: 'Generator Maintenance', detail: 'Generator checks and service by qualified specialists', group: 'Business & professional', icon: Zap, partnerOnly: true },
  { name: 'Lift & Elevator Maintenance', detail: 'Specialist coordination for licensed lift maintenance', group: 'Business & professional', icon: Building2, partnerOnly: true },
  { name: 'Fire Safety Equipment', detail: 'Eligible inspection and servicing through authorised specialists', group: 'Business & professional', icon: Shield, partnerOnly: true },
  { name: 'Design, Translation & Content', detail: 'Creative, language, writing and digital-content services', group: 'Business & professional', icon: Sparkle },
  { name: 'Website & Virtual Assistance', detail: 'Website support, online admin and virtual assistance', group: 'Business & professional', icon: Monitor },
  { name: 'Accounting & Tax Assistance', detail: 'Administrative help from appropriately qualified providers', group: 'Business & professional', icon: Briefcase, partnerOnly: true },
  { name: 'Insurance Information & Referrals', detail: 'Permitted information and referrals to authorised partners only', group: 'Protection & assistance', icon: Shield, partnerOnly: true },
  { name: 'Warranty & Protection Plans', detail: 'Warranty information and eligible partner referrals', group: 'Protection & assistance', icon: BadgeCheck, partnerOnly: true },
  { name: 'Claim Document Assistance', detail: 'Help organising documents; insurer or issuer decides claims', group: 'Protection & assistance', icon: FileCheck, partnerOnly: true },
  { name: 'Accessible Home Support', detail: 'Non-clinical home assistance and accessibility setup', group: 'Protection & assistance', icon: HeartHandshake },
  { name: 'Other Local Services', detail: 'Discover additional categories as vetted local partners join', group: 'More services', icon: HelpCircle },
];

const groups = ['All services', 'Home essentials', 'Power & technology', 'Home improvement', 'Cleaning & outdoor', 'Home & lifestyle', 'Vehicle services', 'Business & professional', 'Protection & assistance', 'More services'];

export default function ServicesExpansionGrid() {
  const { navigate } = useRouter();
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState('All services');
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return categories.filter((item) =>
      (activeGroup === 'All services' || item.group === activeGroup) &&
      (!normalized || `${item.name} ${item.detail} ${item.group}`.toLowerCase().includes(normalized)),
    );
  }, [query, activeGroup]);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-amber-50/40 to-white py-14 md:py-20" aria-labelledby="more-services-heading">
      <div className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-amber-200/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-10 h-72 w-72 rounded-full bg-sky-200/20 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-9 max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/90 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-800 shadow-sm"><MapPin size={14} /> VATTAMS service marketplace</p>
          <h2 id="more-services-heading" className="mt-5 font-display text-3xl font-extrabold tracking-tight text-navy-950 md:text-5xl">One marketplace. <span className="text-amber-700">More ways to get help.</span></h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-gray-600 md:text-base">Explore {categories.length} service categories across home care, repairs, technology, mobility and professional support. Availability depends on your city and participating independent providers.</p>
          <div className="mx-auto mt-6 flex max-w-xl items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-100">
            <Search size={19} className="shrink-0 text-gray-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search service categories" placeholder="Search AC, plumbing, solar, cleaning…" className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400" />
            <span className="shrink-0 rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-500">{filtered.length}</span>
          </div>
        </div>
        <div className="mb-7 flex gap-2 overflow-x-auto pb-2" aria-label="Filter service categories">
          {groups.map((group) => <button key={group} type="button" onClick={() => setActiveGroup(group)} aria-pressed={activeGroup === group} className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all ${activeGroup === group ? 'border-navy-900 bg-navy-900 text-white shadow-md' : 'border-gray-200 bg-white text-gray-600 hover:border-amber-300 hover:text-navy-900'}`}>{group}</button>)}
        </div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gray-600">Showing <span className="text-navy-900">{filtered.length}</span> categories</p>
          <p className="hidden items-center gap-1.5 text-xs font-medium text-gray-500 sm:flex"><Star size={13} className="text-amber-500" /> Provider availability is confirmed per request</p>
        </div>
        {filtered.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((service) => {
            const Icon = service.icon;
            return <button key={service.name} type="button" onClick={() => {
              if (service.available) {
                navigate('booking');
                return;
              }
              const message = `Hi VATTAMS, I would like to enquire about: ${service.name}. Please let me know whether this service is available in my city and how to proceed.`;
              window.open(`https://wa.me/916374068296?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
            }} className="group relative flex min-h-[172px] items-start gap-4 overflow-hidden rounded-2xl border border-gray-200/90 bg-white/95 p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2">
              <span className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-amber-400 to-yellow-600 transition-transform duration-300 group-hover:scale-x-100" />
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-900 to-slate-700 text-amber-300 shadow-md transition duration-200 group-hover:scale-105 group-hover:from-amber-400 group-hover:to-yellow-500 group-hover:text-navy-950"><Icon size={22} strokeWidth={1.9} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 font-bold leading-snug text-navy-950">{service.name}</span>
                <span className="mt-2 block text-sm leading-6 text-gray-600">{service.detail}</span>
                <span className="mt-4 flex flex-wrap items-center gap-2">
                  {service.available ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Booking flow available</span> : <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">Enquiry / availability check</span>}
                  {service.partnerOnly && <span className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-500">Qualified partner</span>}
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-amber-800 group-hover:text-amber-950">{service.available ? 'Check booking options' : 'Enquire on WhatsApp'} <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></span>
              </span>
            </button>;
          })}
        </div> : <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center"><Search className="mx-auto text-gray-400" size={28} /><p className="mt-3 font-semibold text-gray-800">No matching categories</p><p className="mt-1 text-sm text-gray-500">Try another service name or select a different group.</p><button type="button" onClick={() => { setQuery(''); setActiveGroup('All services'); }} className="mt-4 rounded-full bg-navy-900 px-4 py-2 text-sm font-semibold text-white">Show all services</button></div>}
        <div className="mt-9 rounded-3xl border border-navy-800 bg-gradient-to-br from-navy-950 via-navy-900 to-slate-800 p-6 text-white shadow-xl md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-navy-950"><ShieldCheck size={24} /></span>
            <div>
              <h3 className="text-lg font-extrabold md:text-xl">Clear expectations. Trusted connections.</h3>
              <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-200">VATTAMS is a marketplace that helps customers discover and contact independent service personnel and partner businesses. VATTAMS does not itself perform every listed service. Submitting an enquiry does not guarantee a response, booking acceptance, provider assignment, fixed arrival time or job completion. A request is confirmed only after confirmation is sent; confirm scope, price, timing, qualifications and warranty with the provider.</p>
              <p className="mt-3 text-xs leading-6 text-slate-300">Insurance-related listings are limited to permitted information, document assistance and referrals to authorised partners. Regulated insurance sales, advice or arrangement remain restricted to appropriately authorised parties. Specialist work is subject to provider qualifications, local availability and applicable law.</p>
            </div>
          </div>
        </div>
        <p className="mt-5 text-center text-xs leading-5 text-gray-500">Service listings can expand as approved providers join. We will not display an unavailable service as confirmed bookable inventory.</p>
      </div>
    </section>
  );
}
