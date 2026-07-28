import { Phone, Mail, MapPin, MessageCircle, Facebook, Instagram, Twitter } from 'lucide-react';
import { useRouter, Page } from '@/lib/router';

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
    { label: 'Technician Registration', page: 'technician-register' },
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
              Tamil Nadu's most trusted home appliance repair and maintenance service. 
              Certified technicians at your doorstep.
            </p>
            <div className="flex gap-3 mt-5">
              <a href="#" className="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center hover:bg-blue-600 transition-colors">
                <Facebook size={16} />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-pink-700 flex items-center justify-center hover:bg-pink-600 transition-colors">
                <Instagram size={16} />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-sky-700 flex items-center justify-center hover:bg-sky-600 transition-colors">
                <Twitter size={16} />
              </a>
            </div>
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

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Phone size={15} className="text-blue-400 mt-0.5 shrink-0" />
                <a href="tel:+919876543210" className="text-gray-400 hover:text-white text-sm transition-colors">
                  +91 98765 43210
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MessageCircle size={15} className="text-green-400 mt-0.5 shrink-0" />
                <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer"
                  className="text-gray-400 hover:text-white text-sm transition-colors">
                  WhatsApp Support
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Mail size={15} className="text-blue-400 mt-0.5 shrink-0" />
                <a href="mailto:support@vattams.in" className="text-gray-400 hover:text-white text-sm transition-colors">
                  support@vattams.in
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={15} className="text-red-400 mt-0.5 shrink-0" />
                <span className="text-gray-400 text-sm">
                  Serving across Tamil Nadu
                </span>
              </li>
            </ul>
            <div className="mt-5">
              <button
                onClick={() => navigate('booking')}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Book a Service
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <span>© 2026 VATTAMS HOME SERVICES. All rights reserved.</span>
          <span className="italic text-amber-500/70">Service With Care</span>
        </div>
      </div>
    </footer>
  );
}
