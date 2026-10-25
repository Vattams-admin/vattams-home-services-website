import { useEffect } from 'react';
import { Check, Briefcase, ChevronDown } from 'lucide-react';
import CustomerServicePriceCards from '@/components/CustomerServicePriceCards';
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
    question: 'Which appliance services can I request?',
    answer: 'You can request AC general service, installation, gas filling, pump water service or coil service, plus washing machine service and refrigerator service.',
  },
  {
    question: 'Is an appointment guaranteed in every location?',
    answer: 'No. Available appointment options depend on your address, the selected job type and technician schedules. Confirm the options displayed during booking.',
  },
  {
    question: 'Is the technician call-rate fee added to my checkout?',
    answer: 'No. The technician-paid platform call-rate is a separate internal fee. Your customer checkout shows the customer service price, applicable GST and customer platform fee, with any valid discount applied.',
  },
];

export default function Services() {
  const { navigate } = useRouter();

  useSEO({
    title: 'AC, Washing Machine & Refrigerator Service Prices | VATTAMS',
    description:
      'Compare current starting prices for AC general service, installation, gas filling, pump water service, coil service, washing machine service and refrigerator service. See GST and platform fees before confirming a booking.',
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
      <section className="bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-gold-300 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            Our Services & Pricing
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-white mb-4">
            Appliance Service Prices, Clearly Explained
          </h1>
          <p className="text-navy-100 max-w-2xl mx-auto text-base md:text-lg">
            Compare starting prices for AC, washing machine and refrigerator services. Review the estimated checkout total, then confirm the charges and appointment options for your address.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-gray-50" aria-labelledby="service-prices-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 id="service-prices-heading" className="font-display text-2xl md:text-3xl font-bold text-navy-900">
              Choose the Work You Need
            </h2>
            <p className="mt-2 text-sm md:text-base text-gray-600">
              Prices load from the current service catalogue. Checkout confirms applicable taxes, platform fees and discounts.
            </p>
          </div>
          <CustomerServicePriceCards variant="page" />
        </div>
      </section>

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
              Appliance Service & Pricing FAQs
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
