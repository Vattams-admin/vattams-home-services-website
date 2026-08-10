import Hero from '@/components/home/Hero';
import TrustStrip from '@/components/home/TrustStrip';
import ServicesGrid from '@/components/home/ServicesGrid';
import HowItWorks from '@/components/home/HowItWorks';
import Features from '@/components/home/Features';
import TechnicianCTA from '@/components/home/TechnicianCTA';
import CoverageArea from '@/components/home/CoverageArea';
import Testimonials from '@/components/home/Testimonials';
import CTASection from '@/components/home/CTASection';

export default function Home() {
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