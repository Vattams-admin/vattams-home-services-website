import { useEffect, useMemo } from 'react';
import {
  Phone, MessageCircle, MapPin, Star, ChevronRight, Wrench,
  Wind, Snowflake, WashingMachine,
  CheckCircle, ArrowRight, Clock, ShieldCheck, Award, ThumbsUp, Briefcase,
} from 'lucide-react';
import { CityData, SERVICE_CATEGORIES, cities } from '@/lib/cities';
import { useRouter } from '@/lib/router';

const serviceIcons: Record<string, typeof Wrench> = {
  'AC Repair': Wind,
  'AC Service': Snowflake,
  'Washing Machine Repair': WashingMachine,
  'Refrigerator Repair': Snowflake,
};

function buildSchema(city: CityData) {
  const baseUrl = 'https://vattams.net';
  const cityUrl = `${baseUrl}/areas/${city.slug}`;
  const providerId = `${baseUrl}/#organization`;

  const organizationSchema = {
    '@type': 'Organization',
    '@id': providerId,
    name: 'VATTAMS Home Services',
    url: baseUrl,
    logo: `${baseUrl}/VATTAMS_HOME_SERVICES_logo.svg`,
    image: `${baseUrl}/VATTAMS_HOME_SERVICES_logo.svg`,
    telephone: '+91-63740-68296',
    email: 'support@vattams.net',
    ...(city.isCurrentlyServed ? {
      areaServed: { '@type': 'City', name: city.name, containedInPlace: { '@type': 'State', name: city.state } },
    } : {}),
  };

  const serviceSchema = city.isCurrentlyServed ? SERVICE_CATEGORIES.map((serviceName) => ({
    '@type': 'Service',
    name: `${serviceName} in ${city.name}`,
    serviceType: serviceName,
    provider: { '@id': providerId },
    areaServed: { '@type': 'City', name: city.name },
    url: cityUrl,
  })) : [];

  const faqSchema = {
    '@type': 'FAQPage',
    mainEntity: city.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };

  const breadcrumbSchema = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'Services', item: `${baseUrl}/services` },
      { '@type': 'ListItem', position: 3, name: city.name, item: cityUrl },
    ],
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [organizationSchema, ...serviceSchema, faqSchema, breadcrumbSchema],
  };
}

function injectMetaTags(city: CityData) {
  const baseUrl = 'https://vattams.net';
  const cityUrl = `${baseUrl}/areas/${city.slug}`;

  const tags: { name?: string; property?: string; content: string; key: string }[] = [
    
    { name: 'description', content: city.metaDescription, key: 'meta-desc' },
    { name: 'robots', content: city.isCurrentlyServed ? 'index,follow' : 'noindex,follow', key: 'meta-robots' },
    { name: 'keywords', content: `${city.name} appliance service, AC repair ${city.name}, washing machine repair ${city.name}, refrigerator repair ${city.name}, VATTAMS ${city.name}`, key: 'meta-keywords' },
    { property: 'og:title', content: city.seoTitle, key: 'og-title' },
    { property: 'og:description', content: city.metaDescription, key: 'og-desc' },
    { property: 'og:type', content: 'website', key: 'og-type' },
    { property: 'og:url', content: cityUrl, key: 'og-url' },
    { property: 'og:image', content: `${baseUrl}/icons/icon-512.png`, key: 'og-image' },
    { name: 'twitter:card', content: 'summary_large_image', key: 'tw-card' },
    { name: 'twitter:title', content: city.seoTitle, key: 'tw-title' },
    { name: 'twitter:description', content: city.metaDescription, key: 'tw-desc' },
    { name: 'twitter:image', content: `${baseUrl}/icons/icon-512.png`, key: 'tw-image' },
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
      <nav className="bg-[#f7f4ed] border-b border-[#e8e1d2]">
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
                <span className="text-sm font-medium text-gold-100">{city.isCurrentlyServed ? `Current booking area: ${city.name}` : `Check appointment availability: ${city.name}`}</span>
              </div>
              <span className="inline-flex items-center bg-gold-500/20 border border-gold-400/30 rounded-full px-3 py-1.5 text-xs font-semibold text-gold-200 capitalize">
                {city.tier} city
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold leading-tight mb-4">{city.h1}</h1>
            <p className="text-lg text-[#e8dcc0] mb-8 leading-relaxed">{city.intro}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => navigate('booking')}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gold-500 hover:bg-gold-400 text-[#071426] font-bold rounded-xl transition-colors shadow-lg shadow-gold-500/20">
                Book Now <ArrowRight size={18} />
              </button>
              <a href="https://wa.me/916374068296" target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors">
                <MessageCircle size={18} /> WhatsApp
              </a>
              <a href="tel:+916374068296"
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors border border-white/20">
                <Phone size={18} /> Call Now
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="bg-white border-b border-[#e8e1d2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: ShieldCheck, label: 'OTP Job Checks', desc: 'At supported checkpoints' },
              { icon: Clock, label: 'Appointment Options', desc: 'Check local availability' },
              { icon: Award, label: 'Price Breakdown', desc: 'See charges before confirming' },
              { icon: ThumbsUp, label: 'Extra Work Approval', desc: 'Request a quote first' },
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
          {city.contentSections.filter((sec) => /AC|Air Conditioner|Washing Machine|Refrigerator|Appliance/i.test(sec.heading)).map((sec, idx) => (
            <div key={idx} className="mb-10">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-[#0b1f3a] mb-4">{sec.heading}</h2>
              <p className="text-gray-600 leading-relaxed text-base">{sec.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Service categories */}
      <section className="bg-[#f7f4ed] py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-[#0b1f3a] text-center mb-4">Our Services in {city.name}</h2>
          <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">
            Premium AC, washing machine and refrigerator service in {city.name}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICE_CATEGORIES.map((svc) => {
              const Icon = serviceIcons[svc] ?? Wrench;
              return (
                <div key={svc} className="bg-white rounded-2xl border border-[#e8e1d2] shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-gold-50 flex items-center justify-center mb-4">
                    <Icon size={24} className="text-gold-700" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{svc} in {city.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Request {svc.toLowerCase()} in {city.name}. Review listed base prices and check appointment availability for your address.
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
          <h2 className="font-display text-3xl font-bold text-[#0b1f3a] text-center mb-4">Service Area Reference: {city.name}</h2>
          <p className="text-gray-500 text-center mb-8">Map reference for {city.name}. Actual appointment availability is checked for your address during booking.</p>
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
      <section className="bg-[#f7f4ed] py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-[#0b1f3a] text-center mb-4">Neighbourhood References in {city.name}</h2>
          <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">
            These neighbourhood names help identify your location. Service availability for your exact address is confirmed during booking.
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

      {/* Only render genuine reviews when approved review data exists. */}
      {city.testimonials.length > 0 && (
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-3xl font-bold text-[#0b1f3a] text-center mb-4">Customer Feedback in {city.name}</h2>
            <p className="text-gray-500 text-center mb-12">Customer experiences shared with VATTAMS</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {city.testimonials.filter((t) => /AC|washing machine|refrigerator|appliance/i.test(t.text)).map((t, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-[#e8e1d2] shadow-sm p-6">
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} size={16} className="text-gold-500 fill-gold-500" />
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
                    <div className="w-10 h-10 rounded-full bg-royal-100 flex items-center justify-center font-bold text-[#0b1f3a]">
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
  
  
      )}

      {/* FAQ */}
      <section className="bg-[#f7f4ed] py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-[#0b1f3a] text-center mb-4">Frequently Asked Questions — {city.name}</h2>
          <p className="text-gray-500 text-center mb-12">Everything you need to know about appliance service in {city.name}</p>
          <div className="space-y-3">
            {city.faqs.filter((faq) => !/CCTV|electrical|plumbing|RO water|water purifier|microwave|electrician/i.test(`${faq.q} ${faq.a}`)).map((faq, idx) => (
              <details key={idx} className="group bg-white rounded-xl border border-[#e8e1d2] shadow-sm overflow-hidden">
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
          <h2 className="font-display text-3xl font-bold text-[#0b1f3a] text-center mb-4">Explore Availability in Other Cities in {city.state}</h2>
          <p className="text-gray-500 text-center mb-12">Select a city to read service information; appointment availability is checked for the address during booking.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {otherCities.map((c) => (
              <button key={c.slug} onClick={() => { navigate('city-landing', c.slug); }}
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
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">{city.isCurrentlyServed ? `Ready to Request a Service in ${city.name}?` : `Check Service Availability in ${city.name}`}</h2>
          <p className="text-[#e8dcc0] mb-8 text-lg">{city.isCurrentlyServed ? `Request AC, washing machine or refrigerator service in ${city.name}. Check available appointments and current pricing before you confirm.` : `Enter your address and preferred time to check whether a technician is available for your request in ${city.name}.`}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate('booking')}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-gold-500 hover:bg-gold-400 text-[#071426] font-bold rounded-xl transition-colors shadow-lg">
              Book Now <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate('join-technician')}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-[#0b1f3a] hover:bg-[#132d50] text-white font-bold rounded-xl transition-colors shadow-lg">
              <Briefcase size={18} /> Join as Technician
            </button>
            <a href="https://wa.me/916374068296" target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors">
              <MessageCircle size={18} /> WhatsApp Us
            </a>
            <a href="tel:+916374068296"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors border border-white/20">
              <Phone size={18} /> Call Now
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}