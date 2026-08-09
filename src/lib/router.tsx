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

function getRouteFromHash(): RouteInfo {
  const hash = window.location.hash.replace(/^#/, '');
  const path = window.location.pathname;

  // ROOT DOMAIN MUST ALWAYS OPEN HOME PAGE
  // Example:
  // https://vattams.net
  // https://vattams.net/
  if (!hash && (path === '/' || path === '')) {
    return {
      page: 'home',
      citySlug: null,
    };
  }

  // City landing pages
  if (hash.startsWith('city-')) {
    const slug = hash.replace('city-', '');

    return {
      page: 'city-landing',
      citySlug: slug,
    };
  }

  const validPages: Page[] = [
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

  if (validPages.includes(hash as Page)) {
    return {
      page: hash as Page,
      citySlug: null,
    };
  }

  // Unknown route → Home
  return {
    page: 'home',
    citySlug: null,
  };
}

export function RouterProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [route, setRoute] = useState<RouteInfo>(() => getRouteFromHash());

  useEffect(() => {
    const onHashChange = () => {
      setRoute(getRouteFromHash());
    };

    window.addEventListener('hashchange', onHashChange);

    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  const navigate = (page: Page) => {
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