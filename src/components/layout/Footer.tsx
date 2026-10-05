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
    { label: 'Founder', page: 'founder' },
    { label: 'Contact', page: 'contact' },
    { label: 'Book Service', page: 'booking' },
    { label: 'Join as a Technician', page: 'join-technician' },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-10">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <img
              src="/vattams-mark.png"
              alt="VATTAMS"
              className="h-20 w-auto object-contain mb-4 rounded-xl"
            />
            <h3 className="text-white font-bold text-lg">VATTAMS</h3>
            <p className="text-gold-400 text-sm font-medium italic mb-4">
              One Platform. Endless Possibilities.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              Trusted home services through a professional technician
              network, with convenient booking and service support.
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
                    className="text-gray-400 hover:text-gold-400 text-sm transition-colors text-left"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Home Services */}
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Home Services</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => navigate('services')}
                  className="text-gray-400 hover:text-gold-400 text-sm transition-colors text-left"
                >
                  Services
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('booking')}
                  className="text-gray-400 hover:text-gold-400 text-sm transition-colors text-left"
                >
                  Book a Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('join-technician')}
                  className="text-gray-400 hover:text-gold-400 text-sm transition-colors text-left"
                >
                  Technician Network
                </button>
              </li>
              {services.slice(0, 4).map((s) => (
                <li key={s}>
                  <button
                    onClick={() => navigate('services')}
                    className="text-gray-400 hover:text-gold-400 text-sm transition-colors text-left"
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
                <Phone size={15} className="text-gold-400 mt-0.5 shrink-0" />
                <a href="tel:+916374068296" className="text-gray-400 hover:text-white text-sm transition-colors">
                  +91 63740 68296
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
                <Mail size={15} className="text-gold-400 mt-0.5 shrink-0" />
                <a href="mailto:admin@vattams.net" className="text-gray-400 hover:text-white text-sm transition-colors">
                  admin@vattams.net
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
                className="w-full py-2.5 bg-royal-700 hover:bg-royal-800 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Book a Service
              </button>
              <button
                onClick={() => navigate('tuition-home')}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Explore Online Tuition
              </button>
              <button
                onClick={() => navigate('join-technician')}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-wine-600 hover:bg-wine-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Briefcase size={15} /> Join as a Technician
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col items-center gap-1 text-center">
          <span className="text-white font-bold text-sm tracking-wide">VATTAMS</span>
          <span className="text-gold-400 text-xs font-medium">One Platform. Endless Possibilities.</span>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <span>© 2026 VATTAMS. All rights reserved.</span>
          <span className="italic text-gold-400/80">Home Services + Online Tuition</span>
        </div>

        <div className="mt-4 text-center">
          <span className="text-gray-500 text-xs">Powered by VATTAMS Home Services</span>
        </div>

        {/* MSME Trust Badge */}
        <div className="border-t border-gray-800 mt-6 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
            <div className="inline-flex items-center gap-2 bg-gold-900/30 border border-gold-700/40 rounded-lg px-4 py-2">
              <span className="text-gold-400 text-xs font-bold uppercase tracking-wider">Govt. of India MSME Registered</span>
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