import { useEffect } from 'react';
import { useRouter } from '@/lib/router';
import { trackMarketingEvent, trackMarketingPageView } from '@/lib/marketingAnalytics';

const PUBLIC_PAGE_PATHS: Record<string, string> = {
  home: '/',
  services: '/services',
  about: '/about',
  founder: '/founder',
  contact: '/contact',
  booking: '/booking',
  'ai-assistant': '/ai-assistant',
  'join-technician': '/join-technician',
};

const PRIVATE_PAGES = new Set([
  'customer-login', 'customer-register', 'customer-forgot', 'customer-profile',
  'customer-bookings', 'customer-dashboard', 'customer-payments', 'customer-reviews',
  'customer-support', 'technician-register', 'technician-login', 'technician-status',
  'technician-dashboard', 'admin-login', 'admin-dashboard',
]);

export default function MarketingAnalytics() {
  const { page, citySlug } = useRouter();

  useEffect(() => {
    if (PRIVATE_PAGES.has(page)) return;
    const path = page === 'city-landing' && citySlug
      ? `/areas/${citySlug}`
      : PUBLIC_PAGE_PATHS[page];
    if (!path) return;

    trackMarketingPageView(path, document.title);
    if (page === 'booking') trackMarketingEvent('booking_start');
    if (page === 'services') trackMarketingEvent('view_service_prices');
    if (page === 'join-technician') trackMarketingEvent('technician_join_page_view');

    return undefined;
  }, [page, citySlug]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href') ?? '';
      if (href.startsWith('tel:')) {
        trackMarketingEvent('contact_click', { contact_method: 'phone' });
      } else if (href.includes('wa.me/')) {
        trackMarketingEvent('contact_click', { contact_method: 'whatsapp' });
      }
    };
    document.addEventListener('click', onDocumentClick, true);
    return () => document.removeEventListener('click', onDocumentClick, true);
  }, []);

  return null;
}
