import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import { useRouter, Page } from '@/lib/router';
import SocialLinks from '@/components/SocialLinks';

export default function Footer() {
  const { navigate } = useRouter();
  const year = new Date().getFullYear();

  const quickLinks: { label: string; page: Page }[] = [
    { label: 'Home', page: 'home' },
    { label: 'Services', page: 'services' },
    { label: 'About Us', page: 'about' },
    { label: 'Founder', page: 'founder' },
    { label: 'Contact', page: 'contact' },
    { label: 'Book a Service', page: 'booking' },
    { label: 'Join as a Technician', page: 'join-technician' },
  ];

  const serviceLinks = ['AC Service & Maintenance', 'Washing Machine Service', 'Refrigerator Service'];

  return (
    <footer className="bg-[#050A17] text-gray-300 border-t border-orange-400/20">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-14 pb-8">
        <div className="mb-10 rounded-3xl border border-orange-400/20 bg-gradient-to-r from-[#0A132A] via-[#101A2E] to-[#11100D] p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,.28)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.28em] text-orange-400">VATTAMS Ecosystem</p>
              <h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">Premium care for the appliances your home relies on.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">Focused on three essential appliances: air conditioners, washing machines and refrigerators.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="https://academia.vattams.net" className="rounded-full border border-blue-400/40 bg-blue-400/10 px-4 py-2 text-sm font-semibold text-blue-200">Academia</a>
              <a href="https://vattams.net" className="rounded-full border border-orange-400/50 bg-orange-400/10 px-4 py-2 text-sm font-semibold text-orange-200">Home Services</a>
              <a href="https://callpilot.vattams.net" className="rounded-full border border-green-400/40 bg-green-400/10 px-4 py-2 text-sm font-semibold text-green-200">CallPilot</a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <button type="button" onClick={() => navigate('home')} className="text-left">
              <img src="/vattams-mark.png" alt="VATTAMS Home Services" className="h-16 w-auto object-contain rounded-xl" />
            </button>
            <p className="mt-4 max-w-sm text-sm leading-6 text-gray-400">Dedicated AC, washing machine and refrigerator care — with convenient booking and a professional service network.</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[.2em] text-orange-400">Live Easier. Get It Done.</p>
            <SocialLinks variant="footer" />
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[.22em] text-orange-400 mb-4">Home Services</h4>
            <ul className="space-y-2.5 text-sm text-gray-400">
              {serviceLinks.map((label) => (
                <li key={label}><button onClick={() => navigate('services')} className="hover:text-white transition-colors">{label}</button></li>
              ))}
              <li><button onClick={() => navigate('booking')} className="hover:text-white transition-colors">Book a Service</button></li>
              <li><button onClick={() => navigate('join-technician')} className="hover:text-white transition-colors">Call Rate Jobs • Join for ₹49</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[.22em] text-orange-400 mb-4">Company</h4>
            <ul className="space-y-2.5 text-sm text-gray-400">
              {quickLinks.slice(0, 5).map((l) => (
                <li key={l.page}><button onClick={() => navigate(l.page)} className="hover:text-white transition-colors">{l.label}</button></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[.22em] text-orange-400 mb-4">Contact</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-3"><Phone size={15} className="mt-0.5 text-orange-400" /><a href="tel:+916374068296" className="hover:text-white">+91 63740 68296</a></li>
              <li className="flex items-start gap-3"><MessageCircle size={15} className="mt-0.5 text-green-400" /><a href="https://wa.me/918189800757" target="_blank" rel="noreferrer" className="hover:text-white">WhatsApp Support</a></li>
              <li className="flex items-start gap-3"><Mail size={15} className="mt-0.5 text-orange-400" /><a href="mailto:admin@vattams.net" className="hover:text-white">admin@vattams.net</a></li>
              <li className="flex items-start gap-3"><MapPin size={15} className="mt-0.5 text-orange-400" /><span>Serving across India</span></li>
            </ul>
            <button onClick={() => navigate('booking')} className="mt-5 w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-[#050A17] transition hover:bg-orange-400">Book a Service</button>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 flex flex-col gap-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} VATTAMS Global Technologies Private Limited. All rights reserved.</span>
          <span className="font-semibold uppercase tracking-[.18em] text-orange-400/80">Home Services</span>
        </div>
      </div>
    </footer>
  );
}
