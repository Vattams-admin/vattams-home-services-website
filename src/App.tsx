import { lazy, Suspense } from 'react';
import { RouterProvider } from '@/lib/router';
import { useRouter } from '@/lib/routerContext';
import './styles/PremiumExperience.css';
import { getCityBySlug } from '@/lib/cities';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AIChatWidget from '@/components/AIChatWidget';
import Schema from '@/components/Schema';
import MarketingAnalytics from '@/components/MarketingAnalytics';

// Keep route-specific code out of the initial application bundle. In particular,
// the admin dashboard and its data clients should only load on admin routes.
const Home = lazy(() => import('@/pages/Home'));
const Services = lazy(() => import('@/pages/Services'));
const About = lazy(() => import('@/pages/About'));
const Founder = lazy(() => import('@/pages/Founder'));
const Contact = lazy(() => import('@/pages/Contact'));
const Booking = lazy(() => import('@/pages/Booking'));
const AIAssistant = lazy(() => import('@/pages/AIAssistant'));
const CityLanding = lazy(() => import('@/pages/CityLanding'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const CustomerLogin = lazy(() => import('@/pages/CustomerLogin'));
const CustomerRegister = lazy(() => import('@/pages/CustomerRegister'));
const CustomerForgot = lazy(() => import('@/pages/CustomerForgot'));
const CustomerProfile = lazy(() => import('@/pages/CustomerProfile'));
const CustomerBookings = lazy(() => import('@/pages/CustomerBookings'));
const CustomerDashboard = lazy(() => import('@/pages/CustomerDashboard'));
const CustomerPayments = lazy(() => import('@/pages/CustomerPayments'));
const CustomerReviews = lazy(() => import('@/pages/CustomerReviews'));
const CustomerSupport = lazy(() => import('@/pages/CustomerSupport'));

const TechnicianRegister = lazy(() => import('@/pages/TechnicianRegister'));
const TechnicianLogin = lazy(() => import('@/pages/TechnicianLogin'));
const TechnicianApplicationStatus = lazy(() => import('@/pages/TechnicianApplicationStatus'));
const TechnicianDashboard = lazy(() => import('@/pages/TechnicianDashboard'));
const JoinTechnician = lazy(() => import('@/pages/JoinTechnician'));

const AdminLogin = lazy(() => import('@/pages/AdminLogin'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));

function PageContent() {
  const { page, citySlug } = useRouter();

  switch (page) {
    case 'home':
      return <Home />;
    case 'services':
      return <Services />;
    case 'about':
      return <About />;
    case 'founder':
      return <Founder />;
    case 'contact':
      return <Contact />;
    case 'booking':
      return <Booking />;
    case 'ai-assistant':
      return <AIAssistant />;
    case 'city-landing': {
      const city = citySlug ? getCityBySlug(citySlug) : undefined;
      if (!city) return <NotFound />;
      return <CityLanding city={city} />;
    }
    case 'customer-login':
      return <CustomerLogin />;
    case 'customer-register':
      return <CustomerRegister />;
    case 'customer-forgot':
      return <CustomerForgot />;
    case 'customer-profile':
      return <CustomerProfile />;
    case 'customer-bookings':
      return <CustomerBookings />;
    case 'customer-dashboard':
      return <CustomerDashboard />;
    case 'customer-payments':
      return <CustomerPayments />;
    case 'customer-reviews':
      return <CustomerReviews />;
    case 'customer-support':
      return <CustomerSupport />;
    case 'technician-register':
      return <TechnicianRegister />;
    case 'technician-login':
      return <TechnicianLogin />;
    case 'technician-status':
      return <TechnicianApplicationStatus />;
    case 'technician-dashboard':
      return <TechnicianDashboard />;
    case 'join-technician':
      return <JoinTechnician />;
    case 'admin-login':
      return <AdminLogin />;
    case 'admin-dashboard':
      return <AdminDashboard />;
    case 'not-found':
      return <NotFound />;
    default:
      return <NotFound />;
  }
}

function AppShell() {
  const { page } = useRouter();
  const isAdminRoute = page === 'admin-login' || page === 'admin-dashboard';

  return (
    <div className="min-h-screen flex flex-col">
      <Schema />
      <MarketingAnalytics />
      {!isAdminRoute && <Header />}
      <main className={isAdminRoute ? 'flex-1' : 'flex-1 premium-experience'}>
        <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">Loading page…</div>}>
          <PageContent />
        </Suspense>
      </main>
      {!isAdminRoute && <Footer />}
      {!isAdminRoute && <AIChatWidget />}
    </div>
  );
}

function App() {
  return (
    <RouterProvider>
      <AppShell />
    </RouterProvider>
  );
}

export default App;
