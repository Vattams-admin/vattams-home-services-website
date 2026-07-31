 export default function Schema() {
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
          "@type": "State",
          "name": "Tamil Nadu"
        },
        "sameAs": []
      },
      {
        "@type": "WebSite",
        "@id": "https://vattams.net/#website",
        "url": "https://vattams.net",
        "name": "VATTAMS Home Services"
     …
[18:37, 31/07/2026] Venkatesan Ponniah: import Schema from "./components/schema";
[18:41, 31/07/2026] Venkatesan Ponniah: function App() {
  return (
    <>
      <Schema />
      <RouterProvider>
        <Pages />
      </RouterProvider>
    </>
  );
}
[18:51, 31/07/2026] Venkatesan Ponniah: cd "C:\Users\Sys\vattams-home-services-website"
[19:00, 31/07/2026] Venkatesan Ponniah: dir C:\Users\Sys\Downloads
[19:02, 31/07/2026] Venkatesan Ponniah: dir C:\Users\Sys\Downloads
[19:02, 31/07/2026] Venkatesan Ponniah: cd "C:\Users\Sys\Downloads\vattams-home-services-website-main"
[19:05, 31/07/2026] Venkatesan Ponniah: cd "C:\Users\Sys\Downloads\vattams-home-services-website-main\vattams-home-services-website-main"
[19:06, 31/07/2026] Venkatesan Ponniah: npm run build
[19:17, 31/07/2026] Venkatesan Ponniah: git add .
git commit -m "Add Schema.org JSON-LD"
git push
[19:22, 31/07/2026] Venkatesan Ponniah: cd "C:\Users\Sys\Downloads\vattams-home-services-website-main\vattams-home-services-website-main"
[19:23, 31/07/2026] Venkatesan Ponniah: git status
[19:25, 31/07/2026] Venkatesan Ponniah: Add Schema.org JSON-LD
[19:43, 31/07/2026] Venkatesan Ponniah: import { RouterProvider, useRouter } from '@/lib/router';
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
import CustomerReviews from '@/pages…
[19:45, 31/07/2026] Venkatesan Ponniah: import { RouterProvider, useRouter } from '@/lib/router';
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
[19:51, 31/07/2026] Venkatesan Ponniah: C:\Users\Sys\Downloads\vattams-home-services-website-main\vattams-home-services-website-main
[19:52, 31/07/2026] Venkatesan Ponniah: Schema.org source code moolama commit and push
[20:01, 31/07/2026] Venkatesan Ponniah: Add Schema.org JSON-LD
[20:03, 31/07/2026] Venkatesan Ponniah: Schema. Org folder naama create pannala
[20:28, 31/07/2026] Venkatesan Ponniah: import { RouterProvider, useRouter } from '@/lib/router';
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
          "@type": "State",
          "name": "Tamil Nadu"
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
      <main className="flex-1">{renderPage()}</main>
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