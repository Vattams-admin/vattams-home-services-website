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
    title: 'VATTAMS | Home Services Across India',
    description:
      'VATTAMS is a trusted home services platform connecting customers with professional service technicians across India.',
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