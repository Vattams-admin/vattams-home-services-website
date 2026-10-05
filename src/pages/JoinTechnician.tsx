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

const FAQS = [
  {
    q: 'How do I join VATTAMS as a technician?',
    a: 'Click the "Join as a Technician" button and complete the AI-guided registration with your personal details, service categories, experience, availability, and payment details. Our Admin Team will review your application within 24-48 hours.',
  },
  {
    q: 'How much can I earn as a VATTAMS technician?',
    a: 'Earnings depend on the number of jobs you accept and your service category. Technicians keep the majority of the service fee, with a small platform commission. You can track your earnings through your technician dashboard.',
  },
  {
    q: 'Which cities does VATTAMS operate in?',
    a: 'VATTAMS operates across India, including Chennai, Coimbatore, Madurai, Tiruchirappalli, Salem, Tirunelveli, Vellore, and more cities as our service network grows.',
  },
  {
    q: 'What services can I offer?',
    a: 'You can register for multiple service categories including Electrician, Plumber, AC Technician, RO Technician, Carpenter, Painter, House Cleaning, CCTV, Home Appliance Repair, Pest Control, Water Tank Cleaning, Laundry, Gardening, Packers & Movers, and Driver services.',
  },
  {
    q: 'Do I need my own vehicle and tools?',
    a: 'Having your own vehicle and tools is preferred but not mandatory. You can specify your vehicle and tools availability during registration.',
  },
  {
    q: 'How does the job assignment work?',
    a: 'Our system matches customer bookings with suitable technicians based on service category, location, availability, rating, and workload. Eligible technicians receive job notifications through the platform.',
  },
  {
    q: 'What is the technician joining fee?',
    a: 'Technician registration requires a one-time ₹49 joining fee, payable by UPI QR. Submit the UTR/reference number after payment; the application is then sent for Admin review.',
  },
  {
    q: 'How long does approval take?',
    a: 'Our Admin Team normally reviews technician applications within 24-48 hours. Once approved, you can access your technician account and start receiving eligible service requests.',
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
    title: 'AI Job Matching',
    desc: 'Our smart system helps match suitable jobs based on your service category and location.',
  },
  {
    icon: Shield,
    title: 'Secure Payments',
    desc: 'Receive your eligible earnings through your registered bank account or UPI.',
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
    desc: 'Get access to platform support and resources to help you grow your service business.',
  },
];

const SERVICE_KEYWORDS = [
  'Electrician Jobs',
  'Plumber Jobs',
  'AC Technician Jobs',
  'RO Technician Jobs',
  'Carpenter Jobs',
  'Painter Jobs',
  'House Cleaning Jobs',
  'CCTV Technician Jobs',
  'Home Appliance Repair Jobs',
  'Pest Control Jobs',
  'Water Tank Cleaning Jobs',
  'Laundry Jobs',
  'Gardening Jobs',
  'Packers & Movers Jobs',
  'Driver Jobs',
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

  useEffect(() => {
    const schemaId = 'join-technician-schema';

    const script = document.createElement('script');

    script.type = 'application/ld+json';
    script.id = schemaId;

    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'JobPosting',
          title: 'Home Service Technician — Join VATTAMS',
          description:
            'Join VATTAMS as a home service technician. Work flexibly across India providing AC repair, plumbing, electrical, cleaning, and other home services. Earn per job with secure payments.',
          hiringOrganization: {
            '@type': 'Organization',
            name: 'VATTAMS Home Services',
            sameAs: 'https://vattams.net',
          },
          jobLocation: {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              addressCountry: 'IN',
            },
          },
          employmentType: 'CONTRACTOR',
          datePosted: new Date().toISOString(),
          validThrough: new Date(
            Date.now() + 90 * 86400000
          ).toISOString(),
        },
        {
          '@type': 'FAQPage',
          mainEntity: FAQS.map((faq) => ({
            '@type': 'Question',
            name: faq.q,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.a,
            },
          })),
        },
      ],
    });

    document.head.appendChild(script);

    const oldTitle = document.title;

    document.title =
      'Join as a Technician — Technician Jobs in India | VATTAMS';

    const metaId = 'join-technician-meta';

    let metaDesc = document.getElementById(
      metaId
    ) as HTMLMetaElement | null;

    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.id = metaId;
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }

    metaDesc.content =
      'Join VATTAMS as a technician. Electrician jobs, plumber jobs, AC technician jobs, and home service jobs across India. One-time ₹49 joining fee, flexible hours, and secure payments.';

    return () => {
      document.getElementById(schemaId)?.remove();
      document.getElementById(metaId)?.remove();
      document.title = oldTitle;
    };
  }, []);

  return (
    <div className="pt-20 md:pt-24">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-wine-700 to-wine-600 text-white">
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
            Now Hiring Across India
          </div>

          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Join as a Technician
            <br />
            Earn on Your Own Schedule
          </h1>

          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Become a VATTAMS service professional. Get matched with suitable
            nearby jobs, earn per service, and grow your career.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() =>
                navigate('technician-register')
              }
              className="group flex items-center gap-2 px-8 py-4 bg-gold-500 hover:bg-gold-400 text-royal-950 font-extrabold rounded-xl shadow-2xl transition-all duration-300 hover:scale-105"
            >
              Start Registration
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
              ₹49 One-Time Fee
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-royal-900 text-center mb-4">
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
                  className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-shadow"
                >
                  <div className="w-12 h-12 rounded-xl bg-wine-50 text-wine-700 flex items-center justify-center mb-4">
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
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-royal-900 text-center mb-12">
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
                desc: 'Receive eligible payments through your registered bank account or UPI after completed services.',
              },
            ].map((step) => (
              <div
                key={step.num}
                className="flex gap-4 items-start"
              >
                <div className="w-12 h-12 rounded-full bg-wine-600 text-white font-extrabold flex items-center justify-center shrink-0 text-lg">
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
          <h2 className="font-display text-3xl font-bold text-royal-900 text-center mb-4">
            Service Categories
          </h2>

          <p className="text-gray-500 text-center mb-10">
            Choose from 15+ service categories
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            {SERVICE_KEYWORDS.map((service) => (
              <span
                key={service}
                className="px-4 py-2 bg-wine-50 text-wine-700 rounded-lg text-sm font-semibold border border-wine-100"
              >
                {service}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CITIES */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-6">
            Technician Jobs in India
          </h2>

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
          <h2 className="font-display text-3xl font-bold text-royal-900 text-center mb-10">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group bg-gray-50 rounded-xl border border-gray-100 p-4"
              >
                <summary className="font-bold text-gray-900 cursor-pointer flex items-center justify-between list-none">
                  {faq.q}

                  <span className="text-wine-600 group-open:rotate-180 transition-transform">
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
      <section className="py-16 bg-gradient-to-r from-wine-700 to-wine-600 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="font-display text-3xl font-bold mb-4">
            Ready to Start Earning?
          </h2>

          <p className="text-white/90 mb-8">
            Join technicians working with VATTAMS and start building your
            professional service career.
          </p>

          <button
            onClick={() =>
              navigate('technician-register')
            }
            className="group inline-flex items-center gap-2 px-8 py-4 bg-gold-500 hover:bg-gold-400 text-royal-950 font-extrabold rounded-xl shadow-2xl transition-all duration-300 hover:scale-105"
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
      <section className="py-12 bg-gray-50">
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