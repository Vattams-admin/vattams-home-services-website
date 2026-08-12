import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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
  | 'city-landing'
  | 'tuition-home'
  | 'tuition-courses'
  | 'tuition-course-detail';

interface RouterContextType {
  page: Page;
  navigate: (page: Page, tuitionCourseSlug?: string) => void;
  citySlug: string | null;
  tuitionCourseSlug: string | null;
}

const RouterContext = createContext<RouterContextType>({
  page: 'home',
  navigate: () => {},
  citySlug: null,
  tuitionCourseSlug: null,
});

interface RouteInfo {
  page: Page;
  citySlug: string | null;
  tuitionCourseSlug: string | null;
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
  'tuition-home',
  'tuition-courses',
  'tuition-course-detail',
];

function getRouteFromHash(): RouteInfo {
  const hash = window.location.hash.replace(/^#/, '').trim();

  // ROOT WEBSITE
  // https://vattams.net/
  // Always opens HOME.
  if (!hash) {
    return {
      page: 'home',
      citySlug: null,
      tuitionCourseSlug: null,
    };
  }

  // CITY LANDING PAGE
  // Example: #city-chennai
  if (hash.startsWith('city-')) {
    const slug = hash.replace(/^city-/, '');

    if (slug) {
      return {
        page: 'city-landing',
        citySlug: slug,
        tuitionCourseSlug: null,
      };
    }

    return {
      page: 'home',
      citySlug: null,
      tuitionCourseSlug: null,
    };
  }

  // TUITION COURSE DETAIL PAGE
  // Example: #tuition-course-detail-maths
  if (hash.startsWith('tuition-course-detail-')) {
    const slug = hash.replace(/^tuition-course-detail-/, '');

    if (slug) {
      return {
        page: 'tuition-course-detail',
        citySlug: null,
        tuitionCourseSlug: slug,
      };
    }

    return {
      page: 'tuition-courses',
      citySlug: null,
      tuitionCourseSlug: null,
    };
  }

  // NORMAL HASH ROUTES
  if (VALID_PAGES.includes(hash as Page)) {
    return {
      page: hash as Page,
      citySlug: null,
      tuitionCourseSlug: null,
    };
  }

  // UNKNOWN ROUTE
  return {
    page: 'not-found',
    citySlug: null,
    tuitionCourseSlug: null,
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

  useEffect(() => {
    const handleHashChange = () => {
      const nextRoute = getRouteFromHash();

      setRoute(nextRoute);

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const navigate = (page: Page, tuitionCourseSlug?: string) => {
    const hash =
      page === 'tuition-course-detail' && tuitionCourseSlug
        ? `tuition-course-detail-${tuitionCourseSlug}`
        : page;

    window.location.hash = hash;

    setRoute({
      page,
      citySlug: null,
      tuitionCourseSlug: tuitionCourseSlug ?? null,
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
        tuitionCourseSlug: route.tuitionCourseSlug,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}