import { ArrowRight, Sparkles } from 'lucide-react';
import { useRouter } from '@/lib/router';
import CustomerServicePriceCards from '@/components/CustomerServicePriceCards';

export default function ServicesGrid() {
  const { navigate } = useRouter();

  return (
    <section className="relative overflow-hidden bg-[#F7F5EF] py-16 sm:py-20 lg:py-24">
      <div className="pointer-events-none absolute -right-32 top-0 h-96 w-96 rounded-full bg-[#D4AF37]/[0.08] blur-3xl" />
      <div className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-[#101D3D]/[0.06] blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/35 bg-white/70 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#806316] shadow-sm sm:text-xs">
            <Sparkles size={13} />
            A considered service experience
          </div>
          <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-[#091226] sm:text-4xl lg:text-5xl">
            Essential care, <span className="text-[#A77E1B]">beautifully simplified.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
            Explore AC, washing machine and refrigerator service options. Review listed starting prices and confirm the applicable checkout charges before submitting a request.
          </p>
        </div>

        <CustomerServicePriceCards variant="home" />

        <div className="mt-10 flex flex-col items-center gap-3 text-center sm:mt-12">
          <button
            onClick={() => navigate('services')}
            className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-[#D4AF37]/60 bg-[#091226] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition duration-300 hover:-translate-y-0.5 hover:border-[#E7CA62] hover:bg-[#142342] sm:px-8"
          >
            Explore the service catalogue
            <ArrowRight size={16} className="text-[#E5C65A] transition-transform group-hover:translate-x-1" />
          </button>
          <p className="max-w-xl text-xs leading-5 text-slate-500">Services and appointments depend on participating providers and availability in your location.</p>
        </div>
      </div>
    </section>
  );
}
