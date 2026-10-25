import Hero from '@/components/home/Hero';
import TrustStrip from '@/components/home/TrustStrip';
import ServicesGrid from '@/components/home/ServicesGrid';
import ServicesExpansionGrid from '@/components/home/ServicesExpansionGrid';
import HowItWorks from '@/components/home/HowItWorks';
import Features from '@/components/home/Features';
import TechnicianCTA from '@/components/home/TechnicianCTA';
import CoverageArea from '@/components/home/CoverageArea';
import Testimonials from '@/components/home/Testimonials';
import CTASection from '@/components/home/CTASection';
import { useSEO } from '@/lib/seo';

export default function Home() {
  useSEO({
    title: 'VATTAMS Hybrid Service Marketplace | Discover Services & Providers',
    description:
      'Discover VATTAMS Hybrid Service Marketplace — explore service categories, compare listed starting prices, and connect with independent service professionals.',
    keywords: 'VATTAMS, Hybrid Service Marketplace, service marketplace, local services, service professionals',
    path: '/',
  });

  return (
    <>
      <Hero />
      <TrustStrip />
      <ServicesGrid />
      <ServicesExpansionGrid />
      <section className="bg-[#f7f4ed] py-14 md:py-18" aria-labelledby="home-service-details-heading">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-700">Before you request a service</p>
            <h2 id="home-service-details-heading" className="mt-2 font-display text-2xl font-bold text-navy-900 md:text-3xl">
              Clear Prices. Clear Expectations.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Review these details before submitting a booking or enquiry. Service availability depends on your location and participating provider.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                title: 'Know the checkout total',
                detail: 'Displayed service prices are starting base prices. Applicable GST, the customer platform fee and any valid discount are shown in checkout before you confirm.',
              },
              {
                title: 'Extra work needs approval',
                detail: 'Spare parts, materials and additional repairs may cost extra. Request a separate quote and approve it before the provider proceeds.',
              },
              {
                title: 'Not every listing is bookable yet',
                detail: 'AC, washing machine and refrigerator options are currently supported by the booking flow. Other catalogue services are for enquiry or availability checks unless confirmed otherwise.',
              },
              {
                title: 'A response is not guaranteed',
                detail: 'VATTAMS connects customers with independent service personnel and partner businesses. An enquiry does not guarantee a response, provider acceptance, assignment, arrival time or completion.',
              },
            ].map((item) => (
              <article key={item.title} className="rounded-2xl border border-[#e8e1d2] bg-white p-5 shadow-sm">
                <h3 className="font-bold text-navy-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <HowItWorks />
      <Features />
      <TechnicianCTA />
      <CoverageArea />
      <Testimonials />
      <CTASection />
    </>
  );
}