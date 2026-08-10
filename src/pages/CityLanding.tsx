import { useEffect, useMemo } from 'react';
import {
  Phone, MessageCircle, MapPin, Star, ChevronRight, Wrench,
  Zap, Droplet, Wind, Camera, Snowflake, WashingMachine, Microwave,
  CheckCircle, ArrowRight, Clock, ShieldCheck, Award, ThumbsUp, Briefcase,
} from 'lucide-react';
import { CityData, SERVICE_CATEGORIES, cities } from '@/lib/cities';
import { useRouter } from '@/lib/router';

const serviceIcons: Record<string, typeof Wrench> = {
  'AC Repair': Wind,
  'AC Service': Snowflake,
  'Electrician': Zap,
  'Plumbing': Droplet,
  'Washing Machine Repair': WashingMachine,
  'Refrigerator Repair': Snowflake,
  'RO Water Purifier': Droplet,
  'Microwave Repair': Microwave,
  'CCTV Installation': Camera,
};

function buildSchema(city: CityData) {
  const baseUrl = 'https://vattams.net';
  const cityUrl = `${baseUrl}/#city-${city.slug}`;

  const localBusinessSchema = {
    '@type': 'LocalBusiness',
    '@id': `${cityUrl}#business`,
    name: `VATTAMS Home Services — ${city.name}`,
    url: cityUrl,
    logo: `${baseUrl}/logo.svg`,
    image: `${baseUrl}/logo.svg`,
    telephone: '+91-81898-00757',
    email: 'admin@vattams.net',
    priceRange: '₹₹',
    address: {
      '@type': 'PostalAddress',
      addressLocality: city.name,
      addressRegion: city.state,
      addressCountry: 'IN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: city.geo.lat,
      longitude: city.geo.lng,
    },
    areaServed: city.nearbyAreas.map((a) => ({ '@type': 'Place', name: `${a}, ${city.name}` })),
    sameAs: [],
  };

  const serviceSchema = SERVICE_CATEGORIES.map((svc) => ({
    '@type': 'Service',
    name: `${svc} in ${city.name}`,
    provider: { '@type': 'LocalBusiness', '@id': `${cityUrl}#business` },
    areaServed: { '@type': 'City', name: city.name },
  }));

  const faqSchema = {
    '@type': 'FAQPage',
    mainEntity: city.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const breadcrumbSchema = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/#home` },
      { '@type': 'ListItem', position: 2, name: 'Services', item: `${baseUrl}/#services` },
      { '@type': 'ListItem', position: 3, name: city.name, item: cityUrl },
    ],
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [localBusinessSchema, ...serviceSchema, faqSchema, breadcrumbSchema],
  };
}

function injectMetaTags(city: CityData) {
  const baseUrl = 'https://vattams.net';
  const cityUrl = `${baseUrl}/#city-${city.slug}`;

  const tags: { name?: string; property?: string; content: string; key: string }[] = [
    { name: 'title', content: city.seoTitle, key: 'meta-title' },
    { name: 'description', content: city.metaDescription, key: 'meta-desc' },
    { name: 'keywords', content: `${city.name} home services, AC repair ${city.name}, electrician ${city.name}, plumbing ${city.name}, washing machine repair ${city.name}, refrigerator repair ${city.name}, RO service ${city.name}, CCTV installation ${city.name}, VATTAMS ${city.name}`, key: 'meta-keywords' },
    { property: 'og:title', content: city.seoTitle, key: 'og-title' },
    { property: 'og:description', content: city.metaDescription, key: 'og-desc' },
    { property: 'og:type', content: 'website', key: 'og-type' },
    { property: 'og:url', content: cityUrl, key: 'og-url' },
    { property: 'og:image', content: `${baseUrl}/logo.svg`, key: 'og-image' },
    { name: 'twitter:card', content: 'summary_large_image', key: 'tw-card' },
    { name: 'twitter:title', content: city.seoTitle, key: 'tw-title' },
    { name: 'twitter:description', content: city.metaDescription, key: 'tw-desc' },
    { name: 'twitter:image', content: `${baseUrl}/logo.svg`, key: 'tw-image' },
  ];

  tags.forEach((t) => {
    let el = document.head.querySelector(`meta[data-city="${t.key}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('data-city', t.key);
      document.head.appendChild(el);
    }
    if (t.name) el.setAttribute('name', t.name);
    if (t.property) el.setAttribute('property', t.property);
    el.setAttribute('content', t.content);
  });

  let titleEl = document.head.querySelector('title[data-city="page-title"]') as HTMLTitleElement | null;
  if (!titleEl) {
    titleEl = document.createElement('title');
    titleEl.setAttribute('data-city', 'page-title');
    document.head.appendChild(titleEl);
  }
  titleEl.textContent = city.seoTitle;

  let canonicalEl = document.head.querySelector('link[data-city="canonical"]') as HTMLLinkElement | null;
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('data-city', 'canonical');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', cityUrl);
}

function cleanupMetaTags() {
  document.head.querySelectorAll('[data-city]').forEach((el) => el.remove());
}

export default function CityLanding({ city }: { city: CityData }) {
  const { navigate } = useRouter();

  useEffect(() => {
    injectMetaTags(city);
    return () => cleanupMetaTags();
  }, [city]);

  const schema = useMemo(() => buildSchema(city), [city]);

  const otherCities = cities.filter((c) => c.slug !== city.slug && c.state === city.state).slice(0, 12);

  return (
    <div className="pt-16 md:pt-20">
      {/* Schema */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* Breadcrumb */}
      <nav className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <ol className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
            <li><button onClick={() => navigate('home')} className="hover:text-gold-700">Home</button></li>
            <li><ChevronRight size={12} /></li>
            <li><button onClick={() => navigate('services')} className="hover:text-gold-700">Services</button></li>
            <li><ChevronRight size={12} /></li>
            <li className="text-gray-900 font-medium">{city.name}</li>
          </ol>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-royal-950 via-royal-900 to-royal-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-gold-400/30 rounded-full px-4 py-1.5">
                <MapPin size={14} className="text-gold-400" />
                <span className="text-sm font-medium text-gold-100">Serving {city.name}, {city.state}</span>
              </div>
              <span className="inline-flex items-center bg-gold-500/20 border border-gold-400/30 rounded-full px-3 py-1.5 text-xs font-semibold text-gold-200 capitalize">
                {city.tier} city
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold leading-tight mb-4">{city.h1}</h1>
            <p className="text-lg text-royal-100 mb-8 leading-relaxed">{city.intro}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => navigate('booking')}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gold-500 hover:bg-gold-400 text-royal-950 font-bold rounded-xl transition-colors shadow-lg shadow-gold-500/20">
                Book Now <ArrowRight size={18} />
              </button>
              <a href="https://wa.me/918189800757" target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors">
                <MessageCircle size={18} /> WhatsApp
              </a>
              <a href="tel:+918189800757"
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors border border-white/20">
                <Phone size={18} /> Call Now
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: ShieldCheck, label: 'Verified Technicians', desc: 'Background-checked' },
              { icon: Clock, label: 'Same-Day Service', desc: 'Book before 2 PM' },
              { icon: Award, label: '30-Day Warranty', desc: 'On all repairs' },
              { icon: ThumbsUp, label: '4.8/5 Rating', desc: '500+ reviews' },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.label} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gold-50 flex items-center justify-center shrink-0">
                    <Icon size={22} className="text-gold-700" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{t.label}</div>
                    <div className="text-xs text-gray-400">{t.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Content sections */}
      <section className="py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {city.contentSections.map((sec, idx) => (
            <div key={idx} className="mb-10">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-royal-900 mb-4">{sec.heading}</h2>
              <p className="text-gray-600 leading-relaxed text-base">{sec.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Service categories */}
      <section className="bg-gray-50 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-royal-900 text-center mb-4">Our Services in {city.name}</h2>
          <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">
            Comprehensive home repair and maintenance services by certified technicians across {city.name}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICE_CATEGORIES.map((svc) => {
              const Icon = serviceIcons[svc] ?? Wrench;
              return (
                <div key={svc} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-gold-50 flex items-center justify-center mb-4">
                    <Icon size={24} className="text-gold-700" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{svc} in {city.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Professional {svc.toLowerCase()} services in {city.name} by verified, experienced technicians. Transparent pricing with GST invoice.
                  </p>
                  <button onClick={() => navigate('booking')}
                    className="text-gold-700 font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                    Book {svc} <ArrowRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Embedded map */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-royal-900 text-center mb-4">Find Us in {city.name}</h2>
          <p className="text-gray-500 text-center mb-8">VATTAMS technicians serve all areas of {city.name}</p>
          <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm h-80">
            <iframe
              title={`Map of ${city.name}`}
              src={`https://www.google.com/maps?q=${city.geo.lat},${city.geo.lng}&z=11&output=embed`}
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${city.geo.lat},${city.geo.lng}`}
              target="_blank" rel="noreferrer"
              className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-white shadow-md rounded-full px-4 py-2 text-gold-700 font-semibold text-xs hover:text-gold-800"
            >
              Open in Google Maps <ArrowRight size={12} />
            </a>
          </div>
        </div>
      </section>

      {/* Nearby areas */}
      <section className="bg-gray-50 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-royal-900 text-center mb-4">Areas We Cover in {city.name}</h2>
          <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">
            VATTAMS provides home services across all neighborhoods and surrounding areas of {city.name}
          </p>
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {city.nearbyAreas.map((area) => (
              <span key={area} className="inline-flex items-center gap-1.5 px-4 py-2 bg-white rounded-full border border-gray-200 text-sm text-gray-700 shadow-sm">
                <MapPin size={12} className="text-gold-600" /> {area}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-royal-900 text-center mb-4">Customer Reviews in {city.name}</h2>
          <p className="text-gray-500 text-center mb-12">Real reviews from {city.name} customers who trusted VATTAMS</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {city.testimonials.map((t, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} size={16} className="text-gold-500 fill-gold-500" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
                  <div className="w-10 h-10 rounded-full bg-royal-100 flex items-center justify-center font-bold text-royal-700">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.area}, {city.name}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-royal-900 text-center mb-4">Frequently Asked Questions — {city.name}</h2>
          <p className="text-gray-500 text-center mb-12">Everything you need to know about home services in {city.name}</p>
          <div className="space-y-3">
            {city.faqs.map((faq, idx) => (
              <details key={idx} className="group bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer p-5 font-semibold text-gray-900 text-sm list-none">
                  {faq.q}
                  <ChevronRight size={18} className="text-gray-400 group-open:rotate-90 transition-transform shrink-0" />
                </summary>
                <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Other cities */}
      {otherCities.length > 0 && (
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-royal-900 text-center mb-4">Also Serving Other Cities in {city.state}</h2>
          <p className="text-gray-500 text-center mb-12">VATTAMS provides home services across {city.state}</p>
          <div className="flex flex-wrap justify-center gap-3">
            {otherCities.map((c) => (
              <button key={c.slug} onClick={() => { window.location.hash = `city-${c.slug}`; window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white rounded-full border border-gray-200 text-sm text-gray-700 shadow-sm hover:border-gold-300 hover:text-gold-700 transition-colors">
                <MapPin size={12} className="text-gold-600" /> {c.name}
              </button>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* CTA */}
      <section className="bg-gradient-to-br from-royal-950 to-royal-800 py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Ready to Book a Service in {city.name}?</h2>
          <p className="text-royal-100 mb-8 text-lg">Get verified technicians at your doorstep in {city.name} with transparent pricing and a 30-day warranty.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate('booking')}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-gold-500 hover:bg-gold-400 text-royal-950 font-bold rounded-xl transition-colors shadow-lg">
              Book Now <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate('join-technician')}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-wine-600 hover:bg-wine-500 text-white font-bold rounded-xl transition-colors shadow-lg">
              <Briefcase size={18} /> Join as Technician
            </button>
            <a href="https://wa.me/918189800757" target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors">
              <MessageCircle size={18} /> WhatsApp Us
            </a>
            <a href="tel:+918189800757"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors border border-white/20">
              <Phone size={18} /> Call Now
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}