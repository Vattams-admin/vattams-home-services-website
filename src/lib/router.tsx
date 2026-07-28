import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Page =
  | 'home'
  | 'services'
  | 'about'
  | 'contact'
  | 'booking'
  | 'customer-login'
  | 'admin-login'
  | 'admin-dashboard'
  | 'technician-register'
  | 'technician-dashboard';

interface RouterContextType {
  page: Page;
  navigate: (page: Page) => void;
}

const RouterContext = createContext<RouterContextType>({
  page: 'home',
  navigate: () => {},
});

function getPageFromHash(): Page {
  const hash = window.location.hash.replace('#', '') as Page;
  const valid: Page[] = [
    'home','services','about','contact','booking',
    'customer-login','admin-login','admin-dashboard',
    'technician-register','technician-dashboard',
  ];
  return valid.includes(hash) ? hash : 'home';
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>(getPageFromHash);

  useEffect(() => {
    const onHashChange = () => setPage(getPageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (p: Page) => {
    window.location.hash = p;
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <RouterContext.Provider value={{ page, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}
