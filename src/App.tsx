import { RouterProvider, useRouter } from '@/lib/router';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Home from '@/pages/Home';
import Services from '@/pages/Services';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import Booking from '@/pages/Booking';
import CustomerLogin from '@/pages/CustomerLogin';
import CustomerRegister from '@/pages/CustomerRegister';
import CustomerForgot from '@/pages/CustomerForgot';
import CustomerProfile from '@/pages/CustomerProfile';
import CustomerBookings from '@/pages/CustomerBookings';
import CustomerDashboard from '@/pages/CustomerDashboard';
import CustomerPayments from '@/pages/CustomerPayments';
import CustomerReviews from '@/pages/CustomerReviews';
import CustomerSupport from '@/pages/CustomerSupport';
import AdminLogin from '@/pages/AdminLogin';
import AdminDashboard from '@/pages/AdminDashboard';
import TechnicianRegister from '@/pages/TechnicianRegister';
import TechnicianLogin from '@/pages/TechnicianLogin';
import TechnicianDashboard from '@/pages/TechnicianDashboard';

function Pages() {
  const { page } = useRouter();

  const renderPage = () => {
    switch (page) {
      case 'home': return <Home />;
      case 'services': return <Services />;
      case 'about': return <About />;
      case 'contact': return <Contact />;
      case 'booking': return <Booking />;
      case 'customer-login': return <CustomerLogin />;
      case 'customer-register': return <CustomerRegister />;
      case 'customer-forgot': return <CustomerForgot />;
      case 'customer-profile': return <CustomerProfile />;
      case 'customer-bookings': return <CustomerBookings />;
      case 'customer-dashboard': return <CustomerDashboard />;
      case 'customer-payments': return <CustomerPayments />;
      case 'customer-reviews': return <CustomerReviews />;
      case 'customer-support': return <CustomerSupport />;
      case 'admin-login': return <AdminLogin />;
      case 'admin-dashboard': return <AdminDashboard />;
      case 'technician-register': return <TechnicianRegister />;
      case 'technician-login': return <TechnicianLogin />;
      case 'technician-dashboard': return <TechnicianDashboard />;
      default: return <Home />;
    }
  };

  const hideFooter = page === 'admin-login' || page === 'admin-dashboard' ||
    page === 'customer-login' || page === 'customer-register' || page === 'customer-forgot' ||
    page === 'customer-dashboard' || page === 'customer-payments' ||
    page === 'customer-reviews' || page === 'customer-support' ||
    page === 'technician-login' || page === 'technician-dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">{renderPage()}</main>
      {!hideFooter && <Footer />}
    </div>
  );
}

function App() {
  return (
    <RouterProvider>
      <Pages />
    </RouterProvider>
  );
}

export default App;
