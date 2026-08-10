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
 