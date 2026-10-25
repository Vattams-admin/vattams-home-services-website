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
  'customer-profile', 'customer-bookings', 'customer-dashboard',
  'customer-payments', 'customer-reviews', 'customer-support',
]);
const TECHNICIAN_PROTECTED_PAGES = new Set<Page>(['technician-dashboard']);
const ADMIN_PROTECTED_PAGES = new Set<Page>(['admin-dashboard']);

interface RouteState {
  page: Page;
  citySlug?: string;
}
interface RouterContextValue extends RouteState {
  navigate: (page: Page, slug?: string) => void;
}
const RouterContext = createContext<RouterContextValue | undefined>(undefined);

function hasSession(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(window.sessionStorage.getItem(key));
  } catch {
    // Fail closed: protected routes must not become public when storage is blocked.
    return false;
  }
}
function guardRoute(route: RouteState): RouteState {
  if (CUSTOMER_PROTECTED_PAGES.has(route.page) && !hasSession('vattams_customer_session')) return { page: 'customer-login' };
  if (TECHNICIAN_PROTECTED_PAGES.has(route.page) && !hasSession('vattams_technician_session')) return { page: 'technician-login' };
  if (ADMIN_PROTECTED_PAGES.has(route.page) && !hasSession('vattams_admin')) return { page: 'admin-login' };
  return route;
}

function parseHash(rawHash: string): RouteState {
  let hash = rawHash.replace(/^#\/?/, '').trim();
  if (!hash) return { page: 'home' };
  try { hash = decodeURIComponent(hash); } catch { /* keep malformed fragment as-is */ }
  if ((KNOWN_PAGES as string[]).includes(hash)) return guardRoute({ page: hash as Page });
  if (hash.startsWith('city-')) {
    const citySlug = hash.slice('city-'.length);
    return citySlug ? { page: 'city-landing', citySlug } : { page: 'not-found' };
  }
  return { page: 'not-found' };
}

const PUBLIC_PATHS: Record<string, Page> = {
  '/': 'home',
  '/services': 'services',
  '/about': 'about',
  '/founder': 'founder',
  '/contact': 'contact',
  '/booking': 'booking',
  '/ai-assistant': 'ai-assistant',
  '/join-technician': 'join-technician',
};

function parseCurrentRoute(): RouteState {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  if (pathname === '/' && window.location.hash) return parseHash(window.location.hash);
  if (PUBLIC_PATHS[pathname]) return { page: PUBLIC_PATHS[pathname] };
  const cityMatch = pathname.match(/^\/areas\/([a-z0-9-]+)$/i);
  if (cityMatch) return { page: 'city-landing', citySlug: cityMatch[1] };
  if (window.location.hash) return parseHash(window.location.hash);
  return { page: 'not-found' };
}

function publicPathFor(route: RouteState): string | null {
  if (route.page === 'city-landing' && route.citySlug) return `/areas/${encodeURIComponent(route.citySlug)}`;
  const paths: Partial<Record<Page, string>> = {
    home: '/', services: '/services', about: '/about', founder: '/founder',
    contact: '/contact', booking: '/booking', 'ai-assistant': '/ai-assistant',
    'join-technician': '/join-technician',
  };
  return paths[route.page] ?? null;
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<RouteState>(() =>
    typeof window !== 'undefined' ? parseCurrentRoute() : { page: 'home' }
  );

  useEffect(() => {
    const handleLocationChange = () => setRoute(parseCurrentRoute());
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const navigate = (page: Page, slug?: string) => {
    const guarded = guardRoute({ page, ...(slug ? { citySlug: slug } : {}) });
    const publicPath = publicPathFor(guarded);
    if (publicPath !== null) {
      if (window.location.pathname !== publicPath || window.location.hash) {
        window.history.pushState({}, '', publicPath);
      }
      setRoute(guarded);
    } else {
      if (window.location.pathname !== '/' || window.location.hash) {
        window.history.pushState({}, '', '/');
      }
      const nextHash = guarded.page === 'city-landing' && guarded.citySlug
        ? `city-${guarded.citySlug}`
        : guarded.page;
      if (window.location.hash.replace(/^#\/?/, '') !== nextHash) {
        window.location.hash = nextHash;
      } else {
        setRoute(guarded);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return <RouterContext.Provider value={{ ...route, navigate }}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within a RouterProvider');
  return ctx;
}
