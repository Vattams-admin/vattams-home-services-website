import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabase';

export type Page =
  | 'home'
  | 'services'
  | 'about'
  | 'founder'
  | 'contact'
  | 'booking'
  | 'ai-assistant'
  | 'customer-login'
  | 'customer-register'
  | 'customer-forgot'
  | 'customer-profile'
  | 'customer-bookings'
  | 'customer-dashboard'
  | 'customer-payments'
  | 'customer-reviews'
  | 'customer-support'
  | 'admin-login'
  | 'admin-dashboard'
  | 'technician-register'
  | 'technician-login'
  | 'technician-dashboard'
  | 'join-technician'
  | 'not-found'
  | 'city-landing';

interface RouterContextType {
  page: Page;
  navigate: (page: Page) => void;
  citySlug: string | null;
}

const RouterContext = createContext<RouterContextType>({
  page: 'home',
  navigate: () => {},
  citySlug: null,
});

interface RouteInfo {
  page: Page;
  citySlug: string | null;
}

function getRouteFromHash(): RouteInfo {
  const hash = window.location.hash.replace('#', '');
  const path = window.location.pathname;

  // Only the literal root domain (vattams.net, no path, no hash) goes to
  // admin login. Any other path-style URL (e.g. /services, /booking — used
  // by old links, search results, or the sitemap) still resolves normally
  // instead of also being swallowed by the admin redirect.
  if (!hash && (path === '/' || path === '')) {
    return { page: 'admin-login', citySlug: null };
  }

  if (hash.startsWith('city-')) {
    const slug = hash.replace('city-', '');
    return { page: 'city-landing', citySlug: slug };
  }

  const valid: Page[] = [
    'home','services','about','founder','contact','booking','ai-assistant',
    'customer-login','customer-register','customer-forgot','customer-profile','customer-bookings',
    'customer-dashboard','customer-payments','customer-reviews','customer-support',
    'admin-login','admin-dashboard',
    'technician-register','technician-login','technician-dashboard',
    'join-technician','not-found',
  ];
  return { page: valid.includes(hash as Page) ? (hash as Page) : 'home', citySlug: null };
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<RouteInfo>(getRouteFromHash);

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (p: Page) => {
    window.location.hash = p;
    setRoute({ page: p, citySlug: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        sessionStorage.setItem('vattams_admin', 'logged_in');
        navigate('admin-dashboard');
      }
    });
  }, []);

  return (
    <RouterContext.Provider value={{ page: route.page, navigate, citySlug: route.citySlug }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}