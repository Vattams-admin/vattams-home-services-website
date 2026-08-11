import { RouterProvider, useRouter } from '@/lib/router';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AIChatWidget from '@/components/AIChatWidget';

import Home from '@/pages/Home';
import Services from '@/pages/Services';
import About from '@/pages/About';
import Founder from '@/pages/Founder';
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
import JoinTechnician from '@/pages/JoinTechnician';
import NotFound from '@/pages/NotFound';

function Schema() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": "https://vattams.net/#business",
        "name": "VATTAMS Home Services",
        "url": "https://vattams.net",
        "logo": "https://vattams.net/logo.png",
        "image": "https://vattams.net/logo.png",
        "telephone": "+91-XXXXXXXXXX",
        "email": "info@vattams.net",
        "priceRange": "₹₹",
        "areaServed": {
          "@type": "Country",
          "name": "India"
        },
        "sameAs": []
      },
      {
        "@type": "WebSite",
        "@id": "https://vattams.net/#website",
        "url": "https://vattams.net",
        "name": "VATTAMS Home Services"
      }
    ]
  };

 return (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify(schema),
    }}
  />
);
}

function Pages() {
  const { page } = useRouter();

  const renderPage = () => {
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
      case 'join-technician':
        return <JoinTechnician />;
      case 'not-found':
        return <NotFound />;
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

  const hideChatWidget =
    page === 'admin-login' ||
    page === 'admin-dashboard' ||
    page === 'technician-login' ||
    page === 'technician-dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">{renderPage()}</main>
      {!hideFooter && <Footer />}
      {!hideChatWidget && <AIChatWidget />}
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