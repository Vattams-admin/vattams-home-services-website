import {
  Wind, BatteryCharging, Sun, Zap, ShieldCheck, Refrigerator, WashingMachine,
  Droplets, Hammer, Sparkles, Bug, Tv, Car, Laptop, Trees, HeartHandshake,
  Camera, BriefcaseBusiness, Wifi, Package, Building2, Paintbrush, Utensils,
  Scissors, FileCheck, ArrowRight, MapPin,
} from 'lucide-react';
import { useRouter } from '@/lib/router';

const categories = [
  { name: 'AC & Cooling', detail: 'AC service, installation, cleaning, gas and coil work', icon: Wind, available: true },
  { name: 'UPS, Inverter & Battery', detail: 'Backup power, battery checks and inverter service', icon: BatteryCharging, available: false },
  { name: 'Solar Energy', detail: 'Solar panel maintenance and qualified installation partners', icon: Sun, available: false },
  { name: 'Electrical & EV Charging', detail: 'Electrical faults, wiring and EV charger installation', icon: Zap, available: false },
  { name: 'CCTV & Smart Security', detail: 'Cameras, video doorphones and access systems', icon: ShieldCheck, available: false },
  { name: 'Home Appliances', detail: 'Refrigerator, washing machine, microwave and geyser', icon: Refrigerator, available: true },
  { name: 'Plumbing & Water', detail: 'Pipes, leaks, pumps, RO and water tanks', icon: Droplets, available: false },
  { name: 'Carpentry & Furniture', detail: 'Doors, cupboards, furniture assembly and fixtures', icon: Hammer, available: false },
  { name: 'Home & Deep Cleaning', detail: 'Kitchen, bathroom, sofa, mattress and move-out cleaning', icon: Sparkles, available: false },
  { name: 'Pest Control', detail: 'General pest treatment through eligible providers', icon: Bug, available: false },
  { name: 'TV & Entertainment', detail: 'TV mounting, DTH and home-theatre setup', icon: Tv, available: false },
  { name: 'Vehicle Services', detail: 'Car/bike care, battery assistance and detailing', icon: Car, available: false },
  { name: 'Computer & IT Support', detail: 'Laptop, printer, Wi-Fi and network support', icon: Laptop, available: false },
  { name: 'Garden & Outdoor', detail: 'Gardening, irrigation and outdoor maintenance', icon: Trees, available: false },
  { name: 'Care & Home Assistance', detail: 'Non-medical assistance through screened providers', icon: HeartHandshake, available: false },
  { name: 'Events & Lifestyle', detail: 'Photography, decoration, catering and home cooking', icon: Camera, available: false },
  { name: 'Commercial Maintenance', detail: 'Office, shop and apartment maintenance', icon: Building2, available: false },
  { name: 'Painting & Waterproofing', detail: 'Painting, dampness inspection and minor repairs', icon: Paintbrush, available: false },
  { name: 'Laundry & Kitchen Help', detail: 'Laundry, ironing and eligible kitchen support', icon: Utensils, available: false },
  { name: 'Professional & Digital Services', detail: 'Design, translation, accounting and online assistance', icon: BriefcaseBusiness, available: false },
  { name: 'Moving & Assembly', detail: 'Packing assistance and furniture assembly', icon: Package, available: false },
  { name: 'Insurance Assistance', detail: 'Information, document guidance and authorised partner referrals only', icon: FileCheck, available: false },
  { name: 'Warranty & Claim Support', detail: 'Appliance warranty guidance and claim document organisation', icon: ShieldCheck, available: false },
  { name: 'Water Quality & Treatment', detail: 'Water testing, softeners and filtration systems', icon: Droplets, available: false },
  { name: 'Fire Safety & Specialist Maintenance', detail: 'Qualified specialist providers where legally permitted', icon: ShieldCheck, available: false },
  { name: 'Future Services', detail: 'More local services can be added by the platform admin', icon: Wifi, available: false },
];

export default function ServicesExpansionGrid() {
  const { navigate } = useRouter();
  return (
    <section className="py-14 md:py-20 bg-white" aria-labelledby="more-services-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="inline-flex items-center gap-2 rounded-full bg-gold-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gold-800"><MapPin size={14} /> Service marketplace</p>
          <h2 id="more-services-heading" className="mt-4 font-display text-2xl md:text-4xl font-bold text-navy-900">More Services. One Place to Discover.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm md:text-base text-gray-600">Explore service categories and request availability. Listings depend on city coverage and participating service personnel.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((service) => {
            const Icon = service.icon;
            return (
              <button key={service.name} type="button" onClick={() => navigate(service.available ? 'booking' : 'contact')} className="group flex h-full items-start gap-4 rounded-2xl border border-gold-100 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gold-500">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-300 transition-colors group-hover:bg-gold-500 group-hover:text-navy-950"><Icon size={22} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 font-bold text-navy-900">{service.name}{service.available ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Existing booking flow</span> : <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">Enquire / future</span>}</span>
                  <span className="mt-2 block text-sm leading-relaxed text-gray-600">{service.detail}</span>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-gold-800">{service.available ? 'Check booking options' : 'Enquire about availability'} <ArrowRight size={14} /></span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-8 rounded-2xl border border-navy-200 bg-navy-50 p-5 md:p-6">
          <h3 className="font-bold text-navy-900">Important: How VATTAMS works</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">VATTAMS is a service-personnel listing and connection platform. Independent service personnel may list services and service areas. VATTAMS does not itself perform every listed service and cannot guarantee that every enquiry will receive a response, booking acceptance, technician assignment or completion. Confirm scope, price, timing, qualifications and warranty directly with the provider before proceeding.</p>
          <p className="mt-2 text-xs leading-relaxed text-gray-600">Insurance-related listings are limited to general information, document assistance and referrals to authorised providers. Regulated insurance sales, advice or arrangement require appropriate authorisation.</p>
        </div>
      </div>
    </section>
  );
}
