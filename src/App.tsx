import { Suspense, lazy } from 'react';
import { RouterProvider, useRouter } from '@/lib/router';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Schema from '@/components/Schema';
import { Loader } from 'lucide-react';

const Home = lazy(() => import('@/pages/Home'));
const Services = lazy(() => import('@/pages/Services'));
const About = lazy(() => import('@/pages/About'));
const Contact = lazy(() => import('@/pages/Contact'));
const Booking = lazy(() => import('@/pages/Booking'));
const AIAssistant = lazy(() => import('@/pages/AIAssistant'));
const CustomerLogin = lazy(() => import('@/pages/CustomerLogin'));
const CustomerRegister = lazy(() => import('@/pages/CustomerRegister'));
const CustomerForgot = lazy(() => import('@/pages/CustomerForgot'));
const CustomerProfile = lazy(() => import('@/pages/CustomerProfile'));
const CustomerBookings = lazy(() => import('@/pages/CustomerBookings'));
const CustomerDashboard = lazy(() => import('@/pages/CustomerDashboard'));
const CustomerPayments = lazy(() => import('@/pages/CustomerPayments'));
const CustomerReviews = lazy(() => import('@/pages/CustomerReviews'));
const CustomerSupport = lazy(() => import('@/pages/CustomerSupport'));
const AdminLogin = lazy(() => import('@/pages/AdminLogin'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const TechnicianRegister = lazy(() => import('@/pages/TechnicianRegister'));
const TechnicianLogin = lazy(() => import('@/pages/TechnicianLogin'));
const TechnicianDashboard = lazy(() => import('@/pages/TechnicianDashboard'));
const CityLanding = lazy(() => import('@/pages/CityLanding'));

import { getCityBySlug } from '@/lib/cities';

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader className="animate-spin text-blue-600" size={32} />
    </div>
  );
}

function Pages() {
  const { page, citySlug } = useRouter();

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <Home />;
      case 'services':
        return <Services />;
      case 'about':
        return <About />;
      case 'contact':
        return <Contact />;
      case 'booking':
        return <Booking />;
      case 'ai-assistant':
        return <AIAssistant />;
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
      case 'admin-login':
        return <AdminLogin />;
      case 'admin-dashboard':
        return <AdminDashboard />;
      case 'technician-register':
        return <TechnicianRegister />;
      case 'technician-login':
        return <TechnicianLogin />;
      case 'technician-dashboard':
        return <TechnicianDashboard />;
      case 'city-landing': {
        const city = citySlug ? getCityBySlug(citySlug) : undefined;
        return city ? <CityLanding city={city} /> : <Home />;
      }
      default:
        return <Home />;
    }
  };

  const hideFooter =
    page === 'admin-login' ||
    page === 'admin-dashboard' ||
    page === 'customer-login' ||
    page === 'customer-register' ||
    page === 'customer-forgot' ||
    page === 'customer-dashboard' ||
    page === 'customer-payments' ||
    page === 'customer-reviews' ||
    page === 'customer-support' ||
    page === 'technician-login' ||
    page === 'technician-dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          {renderPage()}
        </Suspense>
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}

function App() {
  return (
    <>
      <Schema />
      <RouterProvider>
        <Pages />
      </RouterProvider>
    </>
  );
}

export default App;
