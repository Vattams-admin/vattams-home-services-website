import Hero from '@/components/home/Hero';
import ServicesGrid from '@/components/home/ServicesGrid';
import Features from '@/components/home/Features';
import Testimonials from '@/components/home/Testimonials';
import CTASection from '@/components/home/CTASection';
import HowItWorks from '@/components/home/HowItWorks';
import CoverageArea from '@/components/home/CoverageArea';

export default function Home() {
  return (
    <>
      <Hero />
      <ServicesGrid />
      <HowItWorks />
      <Features />
      <CoverageArea />
      <Testimonials />
      <CTASection />
    </>
  );
}
