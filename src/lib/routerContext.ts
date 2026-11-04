import { createContext, useContext } from 'react';
import type { Page } from './router';

export interface RouteState {
  page: Page;
  citySlug?: string;
}

export interface RouterContextValue extends RouteState {
  navigate: (page: Page, slug?: string) => void;
}

export const RouterContext = createContext<RouterContextValue | undefined>(undefined);

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within a RouterProvider');
  return ctx;
}
