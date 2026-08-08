import { Phone, Mail, MapPin, MessageCircle, Briefcase } from 'lucide-react';
import { useRouter, Page } from '@/lib/router';
import SocialLinks from '@/components/SocialLinks';

export default function Footer() {
  const { navigate } = useRouter();

  const services = [
    'AC Installation', 'AC Deep Cleaning', 'AC Gas Refill',
    'Refrigerator Repair', 'Washing Machine Repair', 'Microwave Repair',
    'Water Heater Repair', 'RO Water Purifier', 'Electrical Services', 'Plumbing Services',
  ];

  const quickLinks: { label: string; page: Page }[] = [
    { label: 'Home', page: 'home' },
    { label: 'Services', page: 'services' },
    { label: 'About Us', page: 'about' },
    { label: 'Contact', page: 'contact' },
    { label: 'Book Service', page: 'booking' },
    { label: 'Join as a Technician', page: 'join-technician' },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <img
              src="/logo.svg"
              alt="VATTAMS HOME SERVICES"
              className="h-20 w-auto object-contain mb-4 rounded-xl"
            />
            <h3 className="text-white font-bold text-lg">VATTAMS HOME SERVICES</h3>
            <p className="text-amber-400 text-sm font-medium italic mb-4">Service With Care</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              India's most trusted home appliance repair and maintenance service. 
              Certified technicians at your doorstep.
            </p>
            <SocialLinks variant="footer" />
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((l) => (
                <li key={l.page}>
                  <button
                    onClick={() => navigate(l.page)}
                    className="text-gray-400 hover:text-blue-400 text-sm transition-colors text-left"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Our Services</h4>
            <ul className="space-y-2">
              {services.map((s) => (
                <li key={s}>
                  <button
                    onClick={() => navigate('services')}
                    className="text-gray-400 hover:text-blue-400 text-sm transition-colors text-left"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Cities Served */}
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Cities We Serve</h4>
            <ul className="space-y-2">
              {['Chennai','Coimbatore','Madurai','Trichy','Salem','Delhi','Mumbai','Bangalore','Hyderabad','Pune'].map((c) => (
                <li key={c}>
                  <a
                    href={`#city-${c.toLowerCase()}`}
                    className="text-gray-400 hover:text-blue-400 text-sm transition-colors"
                  >
                    {c}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Phone size={15} className="text-blue-400 mt-0.5 shrink-0" />
                <a href="tel:+918189800757" className="text-gray-400 hover:text-white text-sm transition-colors">
                  +91 81898 00757
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MessageCircle size={15} className="text-green-400 mt-0.5 shrink-0" />
                <a href="https://wa.me/918189800757" target="_blank" rel="noreferrer"
                  className="text-gray-400 hover:text-white text-sm transition-colors">
                  WhatsApp Support
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Mail size={15} className="text-blue-400 mt-0.5 shrink-0" />
                <a href="mailto:support@vattams.net" className="text-gray-400 hover:text-white text-sm transition-colors">
                  support@vattams.net
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={15} className="text-red-400 mt-0.5 shrink-0" />
                <span className="text-gray-400 text-sm">
                  Serving across India
                </span>
              </li>
            </ul>
            <div className="mt-5 space-y-2">
              <button
                onClick={() => navigate('booking')}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Book a Service
              </button>
              <button
                onClick={() => navigate('join-technician')}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Briefcase size={15} /> Join as a Technician
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <span>© 2026 VATTAMS HOME SERVICES. All rights reserved.</span>
          <span className="italic text-amber-500/70">Service With Care</span>
        </div>

        {/* MSME Trust Badge */}
        <div className="border-t border-gray-800 mt-6 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
            <div className="inline-flex items-center gap-2 bg-amber-900/30 border border-amber-700/40 rounded-lg px-4 py-2">
              <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">Govt. of India MSME Registered</span>
            </div>
            <p className="text-gray-500 text-xs">
              Udyam Registration No: <span className="font-bold text-gray-400">UDYAM-TN-02-0274720</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}