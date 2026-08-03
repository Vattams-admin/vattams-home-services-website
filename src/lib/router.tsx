import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Page =
  | 'home'
  | 'services'
  | 'about'
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

  if (hash.startsWith('city-')) {
    const slug = hash.replace('city-', '');
    return { page: 'city-landing', citySlug: slug };
  }

  const valid: Page[] = [
    'home','services','about','contact','booking','ai-assistant',
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

  return (
    <RouterContext.Provider value={{ page: route.page, navigate, citySlug: route.citySlug }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}
