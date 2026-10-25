import { useEffect } from 'react';
import { Check, Briefcase, ChevronDown } from 'lucide-react';
import CustomerServicePriceCards from '@/components/CustomerServicePriceCards';
import ServicesExpansionGrid from '@/components/home/ServicesExpansionGrid';
import { useRouter } from '@/lib/router';
import { useSEO } from '@/lib/seo';

const SERVICE_FAQS = [
  {
    question: 'What is included in the displayed service price?',
    answer: 'The listed amount is the starting base service price for the selected job type. Applicable GST and the customer platform fee are shown separately in the checkout breakdown before you confirm your booking.',
  },
  {
    question: 'Are spare parts and additional repairs included?',
    answer: 'No. Parts, materials and additional repair work may cost extra. Ask for a separate quote and approve the additional cost before work proceeds.',
  },
  {
    question: 'How do I know the final amount before booking?',
    answer: 'Choose your appliance and exact job type in the booking form. Review the base price, applicable GST, customer platform fee and any valid discount in the checkout breakdown before submitting the request.',
  },
  {
    question: 'Which services can I request?',
    answer: 'Booking options currently depend on the service categories supported by the booking form. Other categories may be listed for enquiry or future expansion and are not necessarily bookable yet.',
  },
  {
    question: 'Is a response or appointment guaranteed?',
    answer: 'No. VATTAMS is a service-personnel listing and connection platform. Independent providers may accept or decline enquiries; response, appointment, assignment and completion are not guaranteed.',
  },
  {
    question: 'Is the technician call-rate fee added to my checkout?',
    answer: 'No. The technician-paid platform call-rate is a separate internal fee. Your customer checkout shows the customer service price, applicable GST and customer platform fee, with any valid discount applied.',
  },
];

export default function Services() {
  const { navigate } = useRouter();

  useSEO({
    title: 'Home Services, UPS, Solar & Local Service Providers | VATTAMS',
    description:
      'Discover appliance services and an expanding catalogue of independent local service providers. Check supported booking options, city availability and prices before submitting a request.',
    keywords:
      'AC service price, AC installation price, AC gas filling price, AC coil service price, washing machine service price, refrigerator service price, VATTAMS Home Services',
    path: '/services',
  });

  useEffect(() => {
    const schemaId = 'services-faq-schema';
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = schemaId;
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: SERVICE_FAQS.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    });
    document.head.appendChild(script);
    return () => document.getElementById(schemaId)?.remove();
  }, []);

  return (
    <div className="pt-20 md:pt-24">
      <section className="relative isolate overflow-hidden bg-[#070B15] py-14 text-white sm:py-20"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(212,175,55,.17),transparent_40%)]" /><div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/65 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-gold-300 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            Our Services & Pricing
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-white mb-4">
            Discover Local Services, Clearly Explained
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">
            Explore participating service-personnel listings, check available booking options and review applicable charges before submitting a request. Service availability varies by city and provider.
          </p>
        </div>
      </section>

      <section className="bg-gradient-to-b from-[#F1EEE5] to-[#F8F6F0] py-10 sm:py-16" aria-labelledby="service-prices-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 id="service-prices-heading" className="font-display text-2xl font-semibold tracking-tight text-[#091226] sm:text-4xl">
              Choose the Work You Need
            </h2>
            <p className="mt-2 text-sm md:text-base text-gray-600">
              Prices load from the current service catalogue. Checkout confirms applicable taxes, platform fees and discounts.
            </p>
          </div>
          <CustomerServicePriceCards variant="page" />
        </div>
      </section>

      <ServicesExpansionGrid />

      <section className="py-14 md:py-18 bg-white" aria-labelledby="before-booking-heading">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="before-booking-heading" className="font-display text-2xl md:text-3xl font-bold text-navy-900 text-center mb-8">
            Before You Confirm Your Booking
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              'Live starting prices for supported job types',
              'GST and customer platform fee shown separately',
              'Select the exact appliance job type',
              'Appointment options based on your address',
              'Booking status updates through the platform',
              'OTP verification at supported job checkpoints',
              'Separate quote and approval for extra work',
              'Support through the website contact options',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 p-4 bg-gold-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-royal-800 flex items-center justify-center shrink-0">
                  <Check size={16} className="text-white" />
                </div>
                <span className="text-gray-700 font-medium text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 md:py-18 bg-[#f7f4ed]" aria-labelledby="service-faq-heading">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-700">Helpful answers</p>
            <h2 id="service-faq-heading" className="mt-2 font-display text-2xl md:text-3xl font-bold text-navy-900">
              Service Marketplace & Pricing FAQs
            </h2>
          </div>
          <div className="space-y-3">
            {SERVICE_FAQS.map((faq) => (
              <details key={faq.question} className="group rounded-2xl border border-[#e8e1d2] bg-white p-5 open:shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-navy-900">
                  <span>{faq.question}</span>
                  <ChevronDown size={18} className="shrink-0 text-gold-700 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="mt-3 pr-2 text-sm leading-6 text-gray-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 md:py-18 bg-navy-950 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Briefcase size={32} className="mx-auto mb-3 text-gold-400" />
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">Are You a Skilled Appliance Technician?</h2>
          <p className="text-white/85 mb-6 max-w-xl mx-auto">
            Register for eligible AC, washing machine and refrigerator job requests. Availability depends on your service area, eligibility and demand; review the fixed job-specific platform call-rate terms before joining.
          </p>
          <button
            onClick={() => navigate('join-technician')}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gold-500 hover:bg-gold-400 text-navy-950 font-extrabold rounded-xl shadow-lg transition-all hover:-translate-y-0.5"
          >
            <Briefcase size={18} /> Join as a Technician
          </button>
        </div>
      </section>
    </div>
  );
}
