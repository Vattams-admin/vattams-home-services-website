import { ArrowRight } from 'lucide-react';
import { useRouter } from '@/lib/router';
import CustomerServicePriceCards from '@/components/CustomerServicePriceCards';

export default function ServicesGrid() {
  const { navigate } = useRouter();
  
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gold-50 text-gold-700 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold mb-4 tracking-wide uppercase">
            What We Offer
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-navy-900 mb-4">
            Our Expert Services
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base md:text-lg">
            Focused expertise in the three appliances your home depends on most.
          </p>
        </div>

        <CustomerServicePriceCards variant="home" />

        <div className="text-center mt-12">
          <button
            onClick={() => navigate('services')}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-navy-900 hover:bg-navy-950 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-navy-900/20 border border-gold-500/20"
          >
            Explore Our Services <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}