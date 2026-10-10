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
    title: 'VATTAMS Home Services | Premium Appliance Care',
    description:
      'Premium doorstep AC, washing machine and refrigerator service from VATTAMS Home Services. Book appliance care with confidence.',
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