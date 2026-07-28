import { useState } from 'react';
import { Menu, X, Phone, MessageCircle, ChevronDown } from 'lucide-react';
import { useRouter, Page } from '@/lib/router';

const navLinks: { label: string; page: Page }[] = [
  { label: 'Home', page: 'home' },
  { label: 'Services', page: 'services' },
  { label: 'About', page: 'about' },
  { label: 'Contact', page: 'contact' },
];

export default function Header() {
  const { navigate, page } = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const close = () => { setMobileOpen(false); setAccountOpen(false); };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-lg border-b border-blue-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <button
            onClick={() => { navigate('home'); close(); }}
            className="flex items-center gap-3 group"
          >
            <img
              src="/logo.svg"
              alt="VATTAMS HOME SERVICES"
              className="h-10 md:h-12 w-auto object-contain"
            />
            <div className="hidden sm:block text-left">
              <div className="text-base md:text-lg font-extrabold text-blue-900 leading-tight tracking-wide">
                VATTAMS
              </div>
              <div className="text-xs text-amber-600 font-semibold tracking-widest uppercase">
                Home Services
              </div>
            </div>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <button
                key={l.page}
                onClick={() => navigate(l.page)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  page === l.page
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                {l.label}
              </button>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-2">
            <a
              href="tel:+919876543210"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              <Phone size={15} /> Call
            </a>
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
            >
              <MessageCircle size={15} /> WhatsApp
            </a>

            {/* Account Dropdown */}
            <div className="relative">
              <button
                onClick={() => setAccountOpen(!accountOpen)}
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Account <ChevronDown size={14} />
              </button>
              {accountOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-blue-100 py-1 z-50">
                  <button onClick={() => { navigate('customer-login'); close(); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700">
                    Customer Login
                  </button>
                  <button onClick={() => { navigate('admin-login'); close(); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700">
                    Admin Login
                  </button>
                  <button onClick={() => { navigate('technician-register'); close(); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700">
                    Technician Registration
                  </button>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button onClick={() => { navigate('booking'); close(); }}
                      className="w-full text-left px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                      Book a Service
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-blue-50"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-blue-100 pb-4">
          <nav className="px-4 pt-2 space-y-1">
            {navLinks.map((l) => (
              <button
                key={l.page}
                onClick={() => { navigate(l.page); close(); }}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  page === l.page ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-blue-50'
                }`}
              >
                {l.label}
              </button>
            ))}
            <div className="border-t border-gray-100 pt-2 space-y-1">
              <button onClick={() => { navigate('booking'); close(); }}
                className="w-full text-left px-4 py-3 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700">
                Book a Service
              </button>
              <button onClick={() => { navigate('customer-login'); close(); }}
                className="w-full text-left px-4 py-3 rounded-lg text-sm text-gray-700 hover:bg-blue-50">
                Customer Login
              </button>
              <button onClick={() => { navigate('admin-login'); close(); }}
                className="w-full text-left px-4 py-3 rounded-lg text-sm text-gray-700 hover:bg-blue-50">
                Admin Login
              </button>
              <button onClick={() => { navigate('technician-register'); close(); }}
                className="w-full text-left px-4 py-3 rounded-lg text-sm text-gray-700 hover:bg-blue-50">
                Technician Registration
              </button>
            </div>
            <div className="flex gap-2 pt-2">
              <a href="tel:+919876543210"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-blue-200 text-blue-700 text-sm font-medium">
                <Phone size={15} /> Call
              </a>
              <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-500 text-white text-sm font-medium">
                <MessageCircle size={15} /> WhatsApp
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
