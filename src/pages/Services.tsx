import { ArrowRight, Check, Briefcase } from 'lucide-react';
import CustomerServicePriceCards from '@/components/CustomerServicePriceCards';
import { useRouter } from '@/lib/router';
import JoinTechnicianButton from '@/components/JoinTechnicianButton';
import { useSEO } from '@/lib/seo';

export default function Services() {
  const { navigate } = useRouter();
    useSEO({
    title: 'AC, Washing Machine & Refrigerator Service Prices | VATTAMS',
    description:
      'Explore listed base prices for AC service, installation, gas filling, coil service, washing machine service and refrigerator service. Check appointment availability and checkout charges before confirming with VATTAMS.',
    path: '/services',
  });

  return (
    <div className="pt-20 md:pt-24">
      {/* Hero */}
      <section className="bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-gold-300 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            Our Services
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-white mb-4">
            Premium Appliance Services
          </h1>
          <p className="text-navy-100 max-w-xl mx-auto text-base md:text-lg">
            Specialist care for air conditioners, washing machines and refrigerators — with a booking experience designed around your home.
          </p>
        </div>
      </section>

      {/* Services List */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CustomerServicePriceCards variant="page" />
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-navy-900 text-center mb-10">
            Before You Confirm Your Booking
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              'Listed base prices for supported job types',
              'Applicable GST and platform fee shown at checkout',
              'Choose the exact appliance job type',
              'Appointment options based on your address',
              'Booking status updates through the platform',
              'OTP verification at supported job checkpoints',
              'Separate quote for parts or additional work',
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

      {/* Join as Technician CTA */}
      <section className="py-14 md:py-18 bg-navy-950 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Briefcase size={32} className="mx-auto mb-3" />
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">Are You a Skilled Technician?</h2>
          <p className="text-white/90 mb-6 max-w-xl mx-auto">Join VATTAMS and start receiving job requests near you. Professional onboarding, flexible working, secure payouts.</p>
          <button onClick={() => navigate('join-technician')} className="inline-flex items-center gap-2 px-8 py-3.5 bg-gold-500 hover:bg-gold-400 text-navy-950 font-extrabold rounded-xl shadow-lg transition-all hover:-translate-y-0.5">
            <Briefcase size={18} /> Join as a Technician
          </button>
        </div>
      </section>
    </div>
  );
}