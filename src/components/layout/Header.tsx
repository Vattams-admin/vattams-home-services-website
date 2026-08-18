import { useEffect, useState } from 'react';
import {
  Menu,
  X,
  User,
  UserCircle2,
  UserPlus,
  LogIn,
  LogOut,
  ShieldCheck,
  Wrench,
  Home,
  Briefcase,
  Phone,
  MessageCircle,
  ChevronDown,
  LayoutDashboard,
  CreditCard,
  Star,
  Headphones,
  CalendarCheck,
} from 'lucide-react';

import { useRouter, type Page } from '@/lib/router';

interface CustomerSession {
  id?: string;
  full_name?: string;
  name?: string;
  email?: string;
  mobile?: string;
  phone?: string;
}

const navLinks: {
  label: string;
  page: Page;
}[] = [
  {
    label: 'Home',
    page: 'home',
  },
  {
    label: 'Services',
    page: 'services',
  },
  {
    label: 'AI Assistant',
    page: 'ai-assistant',
  },
  {
    label: 'About',
    page: 'about',
  },
  {
    label: 'Founder',
    page: 'founder',
  },
  {
    label: 'Contact',
    page: 'contact',
  },
];

export default function Header() {
  const { page, navigate } = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [customer, setCustomer] =
    useState<CustomerSession | null>(null);

  useEffect(() => {
    try {
      const raw =
        sessionStorage.getItem('vattams_customer');

      if (!raw) {
        setCustomer(null);
        return;
      }

      const parsed =
        JSON.parse(raw) as CustomerSession;

      setCustomer(parsed);
    } catch {
      setCustomer(null);
    }
  }, [page]);

  const closeMenus = () => {
    setMobileOpen(false);
    setAccountOpen(false);
  };

  const goTo = (target: Page) => {
    closeMenus();
    navigate(target);
  };

  const logoutCustomer = () => {
    try {
      sessionStorage.removeItem('vattams_customer');
    } catch {
      // Ignore storage errors.
    }

    setCustomer(null);
    closeMenus();
    navigate('home');
  };

  const customerName =
    customer?.full_name ||
    customer?.name ||
    'Account';

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-b border-blue-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 md:h-20 flex items-center justify-between gap-3">

          {/* LOGO */}
          <button
            type="button"
            onClick={() => goTo('home')}
            className="flex items-center gap-2 shrink-0"
            aria-label="VATTAMS Home"
          >
            <img
              src="/logo.svg"
              alt="VATTAMS"
              className="h-10 md:h-12 w-auto object-contain"
            />

            <div className="hidden sm:block text-left">
              <div className="font-extrabold text-blue-900 text-base md:text-lg leading-tight">
                VATTAMS
              </div>

              <div className="text-[10px] md:text-xs font-semibold text-amber-600 tracking-wider uppercase">
                Home Services
              </div>
            </div>
          </button>

          {/* DESKTOP NAV */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {navLinks.map((item) => (
              <button
                key={item.page}
                type="button"
                onClick={() => goTo(item.page)}
                className={[
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  page === item.page
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700',
                ].join(' ')}
              >
                {item.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => goTo('join-technician')}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-orange-600 hover:bg-orange-50"
            >
              Join as a Technician
            </button>
          </nav>

          {/* DESKTOP RIGHT */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">

            <a
              href="tel:+916374068296"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-50"
            >
              <Phone size={15} />
              Call
            </a>

            <a
              href="https://wa.me/918189800757"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600"
            >
              <MessageCircle size={15} />
              WhatsApp
            </a>

            {/* DESKTOP ACCOUNT */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setAccountOpen((value) => !value)
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              >
                <User size={15} />

                <span className="max-w-[100px] truncate">
                  {customer ? customerName : 'Account'}
                </span>

                <ChevronDown size={14} />
              </button>

              {accountOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-blue-100 rounded-xl shadow-xl overflow-hidden">

                  {customer ? (
                    <>
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="font-bold text-gray-900 text-sm truncate">
                          {customerName}
                        </p>

                        <p className="text-xs text-gray-500 truncate">
                          {customer.mobile ||
                            customer.phone ||
                            customer.email ||
                            ''}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          goTo('customer-dashboard')
                        }
                        className="account-item"
                      >
                        <LayoutDashboard size={16} />
                        Dashboard
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          goTo('customer-bookings')
                        }
                        className="account-item"
                      >
                        <Briefcase size={16} />
                        My Bookings
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          goTo('customer-payments')
                        }
                        className="account-item"
                      >
                        <CreditCard size={16} />
                        Payments
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          goTo('customer-reviews')
                        }
                        className="account-item"
                      >
                        <Star size={16} />
                        Reviews
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          goTo('customer-support')
                        }
                        className="account-item"
                      >
                        <Headphones size={16} />
                        Support
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          goTo('customer-profile')
                        }
                        className="account-item"
                      >
                        <UserCircle2 size={16} />
                        My Profile
                      </button>

                      <div className="border-t border-gray-100">
                        <button
                          type="button"
                          onClick={logoutCustomer}
                          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          goTo('customer-login')
                        }
                        className="account-item"
                      >
                        <LogIn size={16} />
                        Customer Login
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          goTo('customer-register')
                        }
                        className="account-item"
                      >
                        <UserPlus size={16} />
                        Customer Registration
                      </button>

                      <div className="border-t border-gray-100" />

                      <button
                        type="button"
                        onClick={() =>
                          goTo('admin-login')
                        }
                        className="account-item"
                      >
                        <ShieldCheck size={16} />
                        Admin Login
                      </button>

                      <div className="border-t border-gray-100" />

                      <button
                        type="button"
                        onClick={() =>
                          goTo('technician-register')
                        }
                        className="account-item"
                      >
                        <UserPlus size={16} />
                        Technician Registration
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          goTo('technician-login')
                        }
                        className="account-item"
                      >
                        <LogIn size={16} />
                        Technician Login
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* MOBILE CONTROLS */}
          <div className="lg:hidden flex items-center gap-2">

            {/* ALWAYS VISIBLE ACCOUNT BUTTON */}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(true);
                setAccountOpen(false);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold shadow-sm"
              aria-label="Open Account"
            >
              <User size={16} />
              <span>Account</span>
            </button>

            {/* MENU */}
            <button
              type="button"
              onClick={() =>
                setMobileOpen((value) => !value)
              }
              className="p-2 rounded-lg text-gray-700 hover:bg-blue-50"
              aria-label={
                mobileOpen
                  ? 'Close menu'
                  : 'Open menu'
              }
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <X size={23} />
              ) : (
                <Menu size={23} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-blue-100 shadow-lg">
          <div className="max-h-[calc(100vh-64px)] overflow-y-auto px-4 py-3">

            {/* NAVIGATION */}
            <div className="space-y-1">
              {navLinks.map((item) => (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => goTo(item.page)}
                  className={[
                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium',
                    page === item.page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-blue-50',
                  ].join(' ')}
                >
                  {item.page === 'home' ? (
                    <Home size={17} />
                  ) : item.page === 'services' ? (
                    <Wrench size={17} />
                  ) : (
                    <span className="w-[17px]" />
                  )}

                  {item.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() =>
                  goTo('join-technician')
                }
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-semibold text-orange-600 hover:bg-orange-50"
              >
                <Briefcase size={17} />
                Join as a Technician
              </button>
            </div>

            {/* ACCOUNT */}
            <div className="mt-4 border border-blue-100 rounded-xl overflow-hidden bg-blue-50/50">

              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                <User size={18} className="text-blue-600" />

                <span className="font-bold text-blue-900">
                  Account
                </span>
              </div>

              {customer ? (
                <>
                  <div className="px-4 py-3 bg-white">
                    <p className="font-bold text-gray-900 text-sm">
                      {customerName}
                    </p>

                    <p className="text-xs text-gray-500 mt-0.5">
                      {customer.mobile ||
                        customer.phone ||
                        customer.email ||
                        ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      goTo('customer-dashboard')
                    }
                    className="mobile-account-item"
                  >
                    <LayoutDashboard size={17} />
                    Dashboard
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      goTo('customer-bookings')
                    }
                    className="mobile-account-item"
                  >
                    <Briefcase size={17} />
                    My Bookings
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      goTo('customer-payments')
                    }
                    className="mobile-account-item"
                  >
                    <CreditCard size={17} />
                    Payments
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      goTo('customer-reviews')
                    }
                    className="mobile-account-item"
                  >
                    <Star size={17} />
                    Reviews
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      goTo('customer-support')
                    }
                    className="mobile-account-item"
                  >
                    <Headphones size={17} />
                    Support
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      goTo('customer-profile')
                    }
                    className="mobile-account-item"
                  >
                    <UserCircle2 size={17} />
                    My Profile
                  </button>

                  <button
                    type="button"
                    onClick={logoutCustomer}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 border-t border-gray-100"
                  >
                    <LogOut size={17} />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      goTo('customer-login')
                    }
                    className="mobile-account-item"
                  >
                    <LogIn size={17} />
                    Customer Login
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      goTo('customer-register')
                    }
                    className="mobile-account-item"
                  >
                    <UserPlus size={17} />
                    Customer Registration
                  </button>

                  <div className="border-t border-gray-100" />

                  <button
                    type="button"
                    onClick={() =>
                      goTo('admin-login')
                    }
                    className="mobile-account-item"
                  >
                    <ShieldCheck size={17} />
                    Admin Login
                  </button>

                  <div className="border-t border-gray-100" />

                  <button
                    type="button"
                    onClick={() =>
                      goTo('technician-register')
                    }
                    className="mobile-account-item"
                  >
                    <UserPlus size={17} />
                    Technician Registration
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      goTo('technician-login')
                    }
                    className="mobile-account-item"
                  >
                    <LogIn size={17} />
                    Technician Login
                  </button>
                </>
              )}
            </div>

            {/* BOOK SERVICE */}
            <button
              type="button"
              onClick={() => goTo('booking')}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
            >
              <CalendarCheck size={17} />
              Book a Service
            </button>

            {/* CONTACT */}
            <div className="flex gap-2 mt-3">
              <a
                href="tel:+916374068296"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-lg border border-blue-200 text-blue-700 text-sm font-semibold"
              >
                <Phone size={16} />
                Call
              </a>

              <a
                href="https://wa.me/918189800757"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-green-500 text-white text-sm font-semibold"
              >
                <MessageCircle size={16} />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* COMPONENT-LOCAL UTILITY CLASSES */}
      <style>{`
        .account-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.7rem 1rem;
          text-align: left;
          font-size: 0.875rem;
          color: #374151;
        }

        .account-item:hover {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .mobile-account-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.8rem 1rem;
          text-align: left;
          font-size: 0.875rem;
          color: #374151;
          background: white;
        }

        .mobile-account-item:hover {
          background: #eff6ff;
          color: #1d4ed8;
        }
      `}</style>
    </header>
  );
}