import { RouterProvider, useRouter } from '@/lib/router';
import { getCityBySlug } from '@/lib/cities';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AIChatWidget from '@/components/AIChatWidget';
import Schema from '@/components/Schema';

import Home from '@/pages/Home';
import Services from '@/pages/Services';
import About from '@/pages/About';
import Founder from '@/pages/Founder';
import Contact from '@/pages/Contact';
import Booking from '@/pages/Booking';
import AIAssistant from '@/pages/AIAssistant';
import CityLanding from '@/pages/CityLanding';
import NotFound from '@/pages/NotFound';

import CustomerLogin from '@/pages/CustomerLogin';
import CustomerRegister from '@/pages/CustomerRegister';
import CustomerForgot from '@/pages/CustomerForgot';
import CustomerProfile from '@/pages/CustomerProfile';
import CustomerBookings from '@/pages/CustomerBookings';
import CustomerDashboard from '@/pages/CustomerDashboard';
import CustomerPayments from '@/pages/CustomerPayments';
import CustomerReviews from '@/pages/CustomerReviews';
import CustomerSupport from '@/pages/CustomerSupport';

import TechnicianRegister from '@/pages/TechnicianRegister';
import TechnicianLogin from '@/pages/TechnicianLogin';
import TechnicianApplicationStatus from '@/pages/TechnicianApplicationStatus';
import TechnicianDashboard from '@/pages/TechnicianDashboard';
import JoinTechnician from '@/pages/JoinTechnician';

import AdminLogin from '@/pages/AdminLogin';
import AdminDashboard from '@/pages/AdminDashboard';

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
      if (!city) {
        return <NotFound />;
      }
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
  return (
    <div className="min-h-screen flex flex-col">
      <Schema />
      <Header />
      <main className="flex-1">
        <PageContent />
      </main>
      <Footer />
      <AIChatWidget />
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