import { Target, Eye, Heart, ShieldCheck, Users, Award, TrendingUp, Handshake, MapPin } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { cities } from '@/lib/cities';

const galleryItems = [
  {
    img: 'https://images.pexels.com/photos/33671149/pexels-photo-33671149.jpeg?auto=compress&cs=tinysrgb&w=600&q=80',
    label: 'AC Repair & Service',
  },
  {
    img: 'https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg?auto=compress&cs=tinysrgb&w=600&q=80',
    label: 'Electrician Services',
  },
  {
    img: 'https://images.pexels.com/photos/29226620/pexels-photo-29226620.jpeg?auto=compress&cs=tinysrgb&w=600&q=80',
    label: 'Plumbing Services',
  },
];

export default function About() {
  const { navigate } = useRouter();

  const citiesByState = cities.reduce((acc, c) => {
    (acc[c.state] ||= []).push(c);
    return acc;
  }, {} as Record<string, typeof cities>);

  const goToCity = (slug: string) => {
    window.location.hash = `city-${slug}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="pt-20 md:pt-24">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img
            src="https://images.pexels.com/photos/8961065/pexels-photo-8961065.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-blue-200 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            About Us
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
            Service With Care
          </h1>
          <p className="text-blue-200 max-w-xl mx-auto text-base md:text-lg">
            VATTAMS Home Services is India's trusted home appliance repair and maintenance platform.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4">Our Story</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Founded with a mission to bring reliable home services to every household in India,
                VATTAMS Home Services has grown into a trusted platform connecting customers with
                verified technicians across the country.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                We believe that home appliance repair should be hassle-free, transparent, and affordable.
                Our platform makes it easy to book a service, track the technician, and pay only after satisfaction.
              </p>
              <p className="text-gray-600 leading-relaxed">
                From AC installation to plumbing, our certified technicians handle it all —
                with genuine spare parts and a service warranty on every job.
              </p>
              <button
                onClick={() => navigate('founder')}
                className="mt-4 inline-flex items-center gap-2 text-blue-700 font-semibold hover:text-blue-800"
              >
                Meet Our Founder →
              </button>
            </div>
            <div className="relative">
              <img
                src="https://images.pexels.com/photos/8961065/pexels-photo-8961065.jpeg?auto=compress&cs=tinysrgb&w=800&q=80"
                alt="Technician at work"
                className="rounded-2xl shadow-xl w-full object-cover aspect-[4/3]"
              />
              <div className="absolute -bottom-4 -left-4 bg-blue-600 text-white rounded-xl p-4 shadow-lg hidden sm:block">
                <div className="text-2xl font-extrabold">10,000+</div>
                <div className="text-xs text-blue-100">Services Completed</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Fix — image gallery */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-3">What We Fix</h2>
          <p className="text-gray-500 text-center mb-10 max-w-xl mx-auto">
            A glimpse of our certified technicians at work across homes in India
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {galleryItems.map((g) => (
              <div key={g.label} className="relative rounded-2xl overflow-hidden shadow-sm group aspect-[4/3]">
                <img
                  src={g.img}
                  alt={g.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <span className="text-white font-bold text-sm">{g.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Vision Values */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Target, title: 'Our Mission', text: 'To make home services accessible, affordable, and reliable for every household in India.', gradient: 'from-blue-500 to-blue-700' },
              { icon: Eye, title: 'Our Vision', text: 'To be India\'s most trusted home service platform, known for quality and care.', gradient: 'from-amber-500 to-orange-500' },
              { icon: Heart, title: 'Our Values', text: 'Trust, transparency, and customer-first thinking in everything we do.', gradient: 'from-emerald-500 to-teal-600' },
            ].map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="bg-gray-50 rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${v.gradient} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                    <Icon size={26} className="text-white" />
                  </div>
                  <h3 className="font-extrabold text-gray-900 text-lg mb-2">{v.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{v.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Users, value: '10,000+', label: 'Happy Customers' },
              { icon: ShieldCheck, value: '500+', label: 'Verified Technicians' },
              { icon: Award, value: `${cities.length}+`, label: 'Cities Covered' },
              { icon: TrendingUp, value: '4.9★', label: 'Average Rating' },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="text-center">
                  <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
                    <Icon size={24} className="text-blue-200" />
                  </div>
                  <div className="text-3xl font-extrabold text-white">{s.value}</div>
                  <div className="text-blue-200 text-sm mt-1">{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Trust Us */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-10">
            Why Customers Trust Us
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { icon: ShieldCheck, title: 'Verified Technicians', text: 'Every technician is background-checked and certified.' },
              { icon: Handshake, title: 'Transparent Pricing', text: 'Know the cost before the work begins. No surprises.' },
              { icon: Award, title: 'Service Warranty', text: 'Up to 30-day warranty on all repairs and installations.' },
              { icon: Heart, title: 'Customer First', text: 'Pay only after you are satisfied with the service.' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-4 p-6 bg-blue-50 rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                    <Icon size={22} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cities We Serve — full directory linking to every city page */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-3">Cities We Serve</h2>
          <p className="text-gray-500 text-center mb-10 max-w-xl mx-auto">
            VATTAMS operates in {cities.length}+ cities across India — tap a city to see local services
          </p>
          <div className="space-y-8 max-w-5xl mx-auto">
            {Object.entries(citiesByState).map(([state, list]) => (
              <div key={state}>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">{state}</h3>
                <div className="flex flex-wrap gap-2.5">
                  {list.map((c) => (
                    <button
                      key={c.slug}
                      onClick={() => goToCity(c.slug)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white rounded-full border border-gray-200 text-sm text-gray-700 shadow-sm hover:border-blue-300 hover:text-blue-700 transition-colors"
                    >
                      <MapPin size={12} className="text-blue-500" /> {c.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MSME Trust Badge */}
      <section className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex flex-col items-center gap-2 bg-gray-50 rounded-2xl border border-amber-200 shadow-sm px-8 py-6">
            <div className="inline-flex items-center gap-2 text-amber-600">
              <ShieldCheck size={20} />
              <span className="font-bold text-sm uppercase tracking-wider">Government of India MSME Registered</span>
            </div>
            <p className="text-gray-500 text-sm">Udyam Registration No: <span className="font-bold text-gray-700">UDYAM-TN-02-0274720</span></p>
          </div>
        </div>
      </section>
    </div>
  );
}