import Hero from '@/components/home/Hero';
import TrustStrip from '@/components/home/TrustStrip';
import ServicesGrid from '@/components/home/ServicesGrid';
import HowItWorks from '@/components/home/HowItWorks';
import Features from '@/components/home/Features';
import TechnicianCTA from '@/components/home/TechnicianCTA';
import CoverageArea from '@/components/home/CoverageArea';
import Testimonials from '@/components/home/Testimonials';
import CTASection from '@/components/home/CTASection';
import { useSEO } from '@/lib/seo';

export default function Home() {
  useSEO({
    title: 'AC Service, Washing Machine Repair & Refrigerator Service | VATTAMS',
    description:
      'Request AC service, washing machine service and refrigerator service with VATTAMS Home Services. Review listed base prices, see checkout charges and check appointment options for your address.',
    path: '/',
  });

  return (
    <>
      <Hero />
      <TrustStrip />
      <ServicesGrid />
      <HowItWorks />
      <Features />
      <TechnicianCTA />
      <CoverageArea />
      <Testimonials />
      <CTASection />
    </>
  );
}