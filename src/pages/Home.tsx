import Hero from '@/components/home/Hero';
import TrustStrip from '@/components/home/TrustStrip';
import ServicesGrid from '@/components/home/ServicesGrid';
import HowItWorks from '@/components/home/HowItWorks';
import Features from '@/components/home/Features';
import TechnicianCTA from '@/components/home/TechnicianCTA';
import TuitionSection from '@/components/home/TuitionSection';
import CoverageArea from '@/components/home/CoverageArea';
import Testimonials from '@/components/home/Testimonials';
import CTASection from '@/components/home/CTASection';
import { useSEO } from '@/lib/seo';

export default function Home() {
  useSEO({
    title: 'VATTAMS | Home Services & Online Tuition Across India',
    description:
      'VATTAMS is an India-wide platform for home services and online tuition, connecting customers and students with service professionals and tutors.',
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
      <TuitionSection />
      <CoverageArea />
      <Testimonials />
      <CTASection />
    </>
  );
}