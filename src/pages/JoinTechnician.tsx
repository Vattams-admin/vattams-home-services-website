import { useEffect } from 'react';
import {
  Briefcase,
  TrendingUp,
  Shield,
  Wallet,
  Star,
  Clock,
  CheckCircle,
  ArrowRight,
  Phone,
  MapPin,
  Users,
  Award,
  ShieldCheck,
} from 'lucide-react';
import { useRouter } from '@/lib/router';
import JoinTechnicianButton from '@/components/JoinTechnicianButton';
import { useSEO } from '@/lib/seo';

const FAQS = [
  {
    q: 'How do I join VATTAMS as a technician?',
    a: 'Click the "Join as a Technician" button and complete the guided registration with your personal details, service categories, experience, availability, and payment details. The admin team reviews applications; timing can vary.',
  },
  {
    q: 'How much can I earn as a VATTAMS technician?',
    a: 'Earnings depend on the jobs you complete. The fixed call-rate fee is shown on each job and applied only after completion. There is no percentage commission; the customer platform fee is shown separately at checkout. Track completed jobs and call-rate dues in your dashboard.',
  },
  {
    q: 'How does call-rate pricing work?',
    a: 'Every eligible job shows its fixed call-rate fee before you accept it. The fee is recorded only after the job is completed; rejected, cancelled, or uncompleted jobs are not charged. There is no percentage commission on these appliance jobs, and the customer platform fee is shown separately at checkout.',
  },
  {
    q: 'Which cities currently have technician coverage?',
    a: 'Active technician records currently show coverage in Chennai and Coimbatore. Applicants from other cities may register as the network expands, but customer appointment availability must be confirmed for each address during booking.',
  },
  {
    q: 'What services can I offer?',
    a: 'You can register for AC service, washing machine service, or refrigerator service. Select the appliance categories that match your skills.',
  },
  {
    q: 'Do I need my own vehicle and tools?',
    a: 'Having your own vehicle and tools is preferred but not mandatory. You can specify your vehicle and tools availability during registration.',
  },
  {
    q: 'How does the job assignment work?',
    a: 'The platform matches requests based on service category, location, availability, rating and workload. Eligible technicians receive job notifications through the platform.',
  },
  {
    q: 'What is the technician joining fee?',
    a: 'Technician registration requires a one-time ₹49 joining fee, payable by UPI QR. Submit the UTR/reference number after payment; the application is then sent for Admin review.',
  },
  {
    q: 'How long does approval take?',
    a: 'The admin team reviews applications. Once approved, you can access your technician account; eligible job requests depend on service area, availability and demand.',
  },
];

const BENEFITS = [
  {
    icon: Wallet,
    title: 'Flexible Earnings',
    desc: 'Work on your own schedule and earn per completed job. Track your earnings through your dashboard.',
  },
  {
    icon: TrendingUp,
    title: 'Job Matching',
    desc: 'The platform matches eligible requests based on service category and location.',
  },
  {
    icon: Shield,
    title: 'Secure Payments',
    desc: 'Review eligible earnings and call-rate dues in your dashboard; payout details are handled through the platform.',
  },
  {
    icon: Star,
    title: 'Build Your Reputation',
    desc: 'Earn ratings and reviews from customers and build a strong professional profile.',
  },
  {
    icon: Clock,
    title: 'Work Anytime',
    desc: 'Choose your available days and preferred working hours during registration.',
  },
  {
    icon: Award,
    title: 'Training & Support',
    desc: 'Use platform support and booking updates as you manage assigned requests.',
  },
];

const SERVICE_KEYWORDS = [
  'AC Technician Jobs',
  'Washing Machine Technician Jobs',
  'Refrigerator Technician Jobs',
];

const CITIES = [
  'Chennai',
  'Coimbatore',
  'Madurai',
  'Tiruchirappalli',
  'Salem',
  'Tirunelveli',
  'Vellore',
];

export default function JoinTechnician() {
  const { navigate } = useRouter();

  useSEO({
    title: 'Appliance Technician Network Registration | VATTAMS',
    description: 'Join the VATTAMS technician network for AC, washing machine and refrigerator job requests. One-time ₹49 registration fee; job availability depends on location, eligibility and demand.',
    path: '/join-technician',
  });

  useEffect(() => {
    const schemaId = 'join-technician-schema';
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = schemaId;
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
      })),
    });
    document.head.appendChild(script);
    return () => document.getElementById(schemaId)?.remove();
  }, []);

  return (
    <div className="pt-20 md:pt-24">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#071426] via-[#0b1f3a] to-[#071426] text-white">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 rounded-full text-sm font-semibold mb-6">
            <Briefcase size={16} />
            Expanding the Technician Network
          </div>

          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Call Rate Jobs for Technicians
            <br />
            Grow with VATTAMS
          </h1>

          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join the VATTAMS technician network for eligible call-rate job opportunities in AC, washing machine and refrigerator services. Manage assigned requests and track eligible earnings in your dashboard.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() =>
                navigate('technician-register')
              }
              className="group flex items-center gap-2 px-8 py-4 bg-gold-500 hover:bg-gold-400 text-[#071426] font-extrabold rounded-xl shadow-2xl transition-all duration-300 hover:scale-105"
            >
              Join for ₹49
              <ArrowRight
                size={18}
                className="group-hover:translate-x-1 transition-transform"
              />
            </button>

            <a
              href="tel:+916374068296"
              className="flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border-2 border-white/30 transition-all"
            >
              <Phone size={18} />
              Call to Learn More
            </a>
          </div>

          <div className="flex flex-wrap gap-6 justify-center mt-10 text-sm">
            <div className="flex items-center gap-2">
              <Users size={18} />
              Growing Technician Network
            </div>

            <div className="flex items-center gap-2">
              <MapPin size={18} />
              Multi-City Coverage
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle size={18} />
              ₹49 One-Time Joining Fee
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-[#0b1f3a] text-center mb-4">
            Why Join VATTAMS?
          </h2>

          <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">
            Everything you need to succeed as a home service professional.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <div
                  key={benefit.title}
                  className="bg-[#f7f4ed] rounded-2xl p-6 border border-[#e8e1d2] hover:shadow-lg transition-shadow"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#f8f4e8] text-[#0b1f3a] flex items-center justify-center mb-4">
                    <Icon size={24} />
                  </div>

                  <h3 className="font-bold text-gray-900 mb-2">
                    {benefit.title}
                  </h3>

                  <p className="text-sm text-gray-500">
                    {benefit.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16 md:py-20 bg-[#f7f4ed]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-[#0b1f3a] text-center mb-12">
            How It Works
          </h2>

          <div className="space-y-8">
            {[
              {
                num: '1',
                title: 'Register Online',
                desc: 'Complete the AI-guided registration with your personal details, service categories, experience, availability, and payment details.',
              },
              {
                num: '2',
                title: 'Get Approved',
                desc: 'Our Admin Team reviews your application and profile details within 24-48 hours.',
              },
              {
                num: '3',
                title: 'Start Receiving Jobs',
                desc: 'Once approved, eligible customer service requests can be matched with your profile based on service category, location, availability, rating, and workload.',
              },
              {
                num: '4',
                title: 'Get Paid',
                desc: 'Collect the customer-approved service amount under the job terms. VATTAMS applies the disclosed fixed call-rate fee only after the job is completed.',
              },
            ].map((step) => (
              <div
                key={step.num}
                className="flex gap-4 items-start"
              >
                <div className="w-12 h-12 rounded-full bg-[#0b1f3a] text-white font-extrabold flex items-center justify-center shrink-0 text-lg">
                  {step.num}
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">
                    {step.title}
                  </h3>

                  <p className="text-gray-500">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <JoinTechnicianButton size="lg" />
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-[#0b1f3a] text-center mb-4">
            Service Categories
          </h2>

          <p className="text-gray-500 text-center mb-10">
            Choose the appliance categories that match your skills
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            {SERVICE_KEYWORDS.map((service) => (
              <span
                key={service}
                className="px-4 py-2 bg-[#f8f4e8] text-[#0b1f3a] rounded-lg text-sm font-semibold border border-[#e7dcc0]"
              >
                {service}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CITIES */}
      <section className="py-12 bg-[#f7f4ed]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-3">
            Technician Applications by City
          </h2>
          <p className="text-sm text-gray-600 mb-6">You may register from these cities as the network expands. Customer appointment coverage is confirmed separately and depends on active technician availability.</p>

          <div className="flex flex-wrap gap-3 justify-center">
            {CITIES.map((city) => (
              <span
                key={city}
                className="px-4 py-2 bg-white text-gray-700 rounded-lg text-sm font-semibold border border-gray-200"
              >
                Technician Jobs in {city}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-[#0b1f3a] text-center mb-10">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group bg-[#f7f4ed] rounded-xl border border-[#e8e1d2] p-4"
              >
                <summary className="font-bold text-gray-900 cursor-pointer flex items-center justify-between list-none">
                  {faq.q}

                  <span className="text-[#a47c00] group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>

                <p className="text-gray-500 mt-3 text-sm">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-[#071426] via-[#0b1f3a] to-[#071426] text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="font-display text-3xl font-bold mb-4">
            Ready to Start Earning?
          </h2>

          <p className="text-white/90 mb-8">
            Register for the VATTAMS technician network to be considered for eligible AC, washing machine and refrigerator call-rate jobs.
          </p>

          <button
            onClick={() =>
              navigate('technician-register')
            }
            className="group inline-flex items-center gap-2 px-8 py-4 bg-gold-500 hover:bg-gold-400 text-[#071426] font-extrabold rounded-xl shadow-2xl transition-all duration-300 hover:scale-105"
          >
            Register Now — ₹49 Joining Fee

            <ArrowRight
              size={18}
              className="group-hover:translate-x-1 transition-transform"
            />
          </button>
        </div>
      </section>

      {/* MSME TRUST */}
      <section className="py-12 bg-[#f7f4ed]">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex flex-col items-center gap-2 bg-white rounded-2xl border border-gold-200 shadow-sm px-8 py-6">
            <div className="inline-flex items-center gap-2 text-gold-700">
              <ShieldCheck size={20} />

              <span className="font-bold text-sm uppercase tracking-wider">
                Government of India MSME Registered
              </span>
            </div>

            <p className="text-gray-500 text-sm">
              Udyam Registration No:{' '}
              <span className="font-bold text-gray-700">
                UDYAM-TN-02-0274720
              </span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}