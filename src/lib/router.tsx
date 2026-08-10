import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

const VALID_PAGES: Page[] = [
  'home',
  'services',
  'about',
  'founder',
  'contact',
  'booking',
  'ai-assistant',

  'customer-login',
  'customer-register',
  'customer-forgot',
  'customer-profile',
  'customer-bookings',
  'customer-dashboard',
  'customer-payments',
  'customer-reviews',
  'customer-support',

  'admin-login',
  'admin-dashboard',

  'technician-register',
  'technician-login',
  'technician-dashboard',

  'join-technician',
  'not-found',
];

function getRouteFromHash(): RouteInfo {
  const hash = window.location.hash.replace(/^#/, '').trim();

  /*
   * IMPORTANT:
   * vattams.net/ MUST always open the public HOME page.
   *
   * Previously this was returning admin-login for the root URL.
   * That caused:
   *
   * https://vattams.net/
   *        ↓
   * Admin Login
   *
   * Now:
   *
   * https://vattams.net/
   *        ↓
   * Home
   */

  if (!hash) {
    return {
      page: 'home',
      citySlug: null,
    };
  }

  /*
   * City landing pages
   *
   * Example:
   * #city-chennai
   */
  if (hash.startsWith('city-')) {
    const slug = hash.replace(/^city-/, '');

    if (slug) {
      return {
        page: 'city-landing',
        citySlug: slug,
      };
    }

    return {
      page: 'home',
      citySlug: null,
    };
  }

  /*
   * Normal hash routes
   */
  if (VALID_PAGES.includes(hash as Page)) {
    return {
      page: hash as Page,
      citySlug: null,
    };
  }

  /*
   * Unknown route
   */
  return {
    page: 'not-found',
    citySlug: null,
  };
}

export function RouterProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [route, setRoute] = useState<RouteInfo>(() => {
    return getRouteFromHash();
  });

  /*
   * Listen for browser hash changes.
   */
  useEffect(() => {
    const onHashChange = () => {
      setRoute(getRouteFromHash());

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    };

    window.addEventListener('hashchange', onHashChange);

    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  /*
   * IMPORTANT:
   *
   * Do NOT automatically redirect every Supabase session
   * to admin-dashboard.
   *
   * A logged-in customer is NOT an admin.
   * A logged-in technician is NOT an admin.
   *
   * Admin authentication should be handled by AdminLogin /
   * AdminDashboard itself.
   *
   * Therefore there is intentionally NO:
   *
   * supabase.auth.getSession()
   * navigate('admin-dashboard')
   *
   * here.
   */

  const navigate = (page: Page) => {
    /*
     * Home
     *
     * navigate('home')
     * results in:
     * #home
     *
     * The root domain without a hash also resolves to Home.
     */
    window.location.hash = page;

    setRoute({
      page,
      citySlug: null,
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <RouterContext.Provider
      value={{
        page: route.page,
        navigate,
        citySlug: route.citySlug,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}