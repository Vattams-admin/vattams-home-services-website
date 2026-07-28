import { Target, Eye, Heart, ShieldCheck, Users, Award, TrendingUp, Handshake } from 'lucide-react';

export default function About() {
  return (
    <div className="pt-20 md:pt-24">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-blue-200 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            About Us
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
            Service With Care
          </h1>
          <p className="text-blue-200 max-w-xl mx-auto text-base md:text-lg">
            VATTAMS Home Services is Tamil Nadu's trusted home appliance repair and maintenance platform.
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
                Founded with a mission to bring reliable home services to every household in Tamil Nadu,
                VATTAMS Home Services has grown into a trusted platform connecting customers with
                verified technicians across the state.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                We believe that home appliance repair should be hassle-free, transparent, and affordable.
                Our platform makes it easy to book a service, track the technician, and pay only after satisfaction.
              </p>
              <p className="text-gray-600 leading-relaxed">
                From AC installation to plumbing, our certified technicians handle it all —
                with genuine spare parts and a service warranty on every job.
              </p>
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

      {/* Mission Vision Values */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Target, title: 'Our Mission', text: 'To make home services accessible, affordable, and reliable for every household in Tamil Nadu.', gradient: 'from-blue-500 to-blue-700' },
              { icon: Eye, title: 'Our Vision', text: 'To be Tamil Nadu\'s most trusted home service platform, known for quality and care.', gradient: 'from-amber-500 to-orange-500' },
              { icon: Heart, title: 'Our Values', text: 'Trust, transparency, and customer-first thinking in everything we do.', gradient: 'from-emerald-500 to-teal-600' },
            ].map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
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
              { icon: Award, value: '30+', label: 'Cities Covered' },
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
    </div>
  );
}
