import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Page =
  | 'home'
  | 'services'
  | 'about'
  | 'founder'
  | 'contact'
  | 'booking'
  | 'ai-assistant'
  | 'city-landing'
  | 'customer-login'
  | 'customer-register'
  | 'customer-forgot'
  | 'customer-profile'
  | 'customer-bookings'
  | 'customer-dashboard'
  | 'customer-payments'
  | 'customer-reviews'
  | 'customer-support'
  | 'technician-register'
  | 'technician-login'
  | 'technician-status'
  | 'technician-dashboard'
  | 'join-technician'
  | 'admin-login'
  | 'admin-dashboard'
  | 'not-found';

const KNOWN_PAGES: Page[] = [
  'home', 'services', 'about', 'founder', 'contact', 'booking', 'ai-assistant',
  'city-landing',
  'customer-login', 'customer-register', 'customer-forgot', 'customer-profile',
  'customer-bookings', 'customer-dashboard', 'customer-payments', 'customer-reviews',
  'customer-support',
  'technician-register', 'technician-login', 'technician-status', 'technician-dashboard',
  'join-technician',
  'admin-login', 'admin-dashboard',
  'not-found',
];

const CUSTOMER_PROTECTED_PAGES = new Set<Page>([
  'customer-profile',
  'customer-bookings',
  'customer-dashboard',
  'customer-payments',
  'customer-reviews',
  'customer-support',
]);

const TECHNICIAN_PROTECTED_PAGES = new Set<Page>([
  'technician-dashboard',
]);

const ADMIN_PROTECTED_PAGES = new Set<Page>([
  'admin-dashboard',
]);

interface RouteState {
  page: Page;
  citySlug?: string;
}

interface RouterContextValue extends RouteState {
  navigate: (page: Page, slug?: string) => void;
}

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

function hasSession(key: string): boolean {
  return typeof window !== 'undefined' && Boolean(sessionStorage.getItem(key));
}

function guardRoute(route: RouteState): RouteState {
  if (CUSTOMER_PROTECTED_PAGES.has(route.page) && !hasSession('vattams_customer_session')) {
    return { page: 'customer-login' };
  }

  if (TECHNICIAN_PROTECTED_PAGES.has(route.page) && !hasSession('vattams_technician_session')) {
    return { page: 'technician-login' };
  }

  if (ADMIN_PROTECTED_PAGES.has(route.page) && !hasSession('vattams_admin')) {
    return { page: 'admin-login' };
  }

  return route;
}

function parseHash(rawHash: string): RouteState {
  let hash = rawHash.replace(/^#\/?/, '').trim();

  if (!hash) {
    return { page: 'home' };
  }

  try {
    hash = decodeURIComponent(hash);
  } catch {
    // ignore malformed URI components and use the raw hash
  }

  if ((KNOWN_PAGES as string[]).includes(hash)) {
    return guardRoute({ page: hash as Page });
  }

  if (hash.startsWith('city-')) {
    const citySlug = hash.slice('city-'.length);
    return citySlug ? { page: 'city-landing', citySlug } : { page: 'not-found' };
  }

  return { page: 'not-found' };
}

function buildHash(page: Page, slug?: string): string {
  if (page === 'city-landing' && slug) {
    return `city-${slug}`;
  }
  return page;
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<RouteState>(() =>
    typeof window !== 'undefined' ? parseHash(window.location.hash) : { page: 'home' }
  );

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash(window.location.hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (page: Page, slug?: string) => {
    const guarded = guardRoute({ page, ...(slug ? { citySlug: slug } : {}) });
    const nextHash = buildHash(guarded.page, guarded.citySlug);

    if (window.location.hash.replace(/^#/, '') === nextHash) {
      setRoute(guarded);
    } else {
      window.location.hash = nextHash;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <RouterContext.Provider value={{ ...route, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return ctx;
}
