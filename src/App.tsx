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