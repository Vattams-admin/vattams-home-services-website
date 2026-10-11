import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';
import { cities } from './src/lib/cities';

function configureFcmServiceWorker(env: Record<string, string>) {
  const keys = {
    FIREBASE_API_KEY: 'VITE_FIREBASE_API_KEY',
    FIREBASE_AUTH_DOMAIN: 'VITE_FIREBASE_AUTH_DOMAIN',
    FIREBASE_PROJECT_ID: 'VITE_FIREBASE_PROJECT_ID',
    FIREBASE_STORAGE_BUCKET: 'VITE_FIREBASE_STORAGE_BUCKET',
    FIREBASE_MESSAGING_SENDER_ID: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
    FIREBASE_APP_ID: 'VITE_FIREBASE_APP_ID',
    FIREBASE_MEASUREMENT_ID: 'VITE_FIREBASE_MEASUREMENT_ID',
  } as const;

  return {
    name: 'configure-fcm-service-worker',
    apply: 'build' as const,
    closeBundle() {
      const workerPath = resolve(process.cwd(), 'dist/firebase-messaging-sw.js');
      let worker: string;
      try {
        worker = readFileSync(workerPath, 'utf8');
      } catch {
        throw new Error('FCM service worker was not emitted to dist/');
      }

      for (const [workerKey, envKey] of Object.entries(keys)) {
        // Firebase web configuration is public client configuration, not a server secret.
        // Embed the same build-time values used by firebase-config.ts in the worker.
        const value = JSON.stringify(env[envKey] ?? process.env[envKey] ?? '');
        worker = worker.replaceAll('self.' + workerKey, value);
      }

      writeFileSync(workerPath, worker, 'utf8');
    },
  };
}


function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function prerenderSeoPages() {
  return {
    name: 'prerender-public-seo-pages',
    apply: 'build' as const,
    closeBundle() {
      const outputDir = resolve(process.cwd(), 'dist');
      const template = readFileSync(resolve(outputDir, 'index.html'), 'utf8');

      const renderPage = (options: {
        title: string;
        description: string;
        canonical: string;
        body: string;
        schema?: unknown;
      }) => {
        const attr = (value: string) => escapeHtml(value);
        let html = template
          .replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(options.title)}</title>`)
          .replace(/<meta name="description" content="[^"]*"\s*\/>/i, `<meta name="description" content="${attr(options.description)}" />`)
          .replace(/<meta property="og:title" content="[^"]*"\s*\/>/i, `<meta property="og:title" content="${attr(options.title)}" />`)
          .replace(/<meta property="og:description" content="[^"]*"\s*\/>/i, `<meta property="og:description" content="${attr(options.description)}" />`)
          .replace(/<meta property="og:url" content="[^"]*"\s*\/>/i, `<meta property="og:url" content="${attr(options.canonical)}" />`)
          .replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/i, `<meta name="twitter:title" content="${attr(options.title)}" />`)
          .replace(/<meta name="twitter:description" content="[^"]*"\s*\/>/i, `<meta name="twitter:description" content="${attr(options.description)}" />`)
          .replace(/<link rel="canonical" href="[^"]*"\s*\/>/i, `<link rel="canonical" href="${attr(options.canonical)}" />`)
          .replace(/<div id="root"><\/div>/i, `<div id="root">${options.body}</div>`);
        if (options.schema) {
          const json = JSON.stringify(options.schema).replaceAll('<', '\\u003c');
          html = html.replace('</head>', `<script type="application/ld+json">${json}</script>\\n</head>`);
        }
        return html;
      };

      const baseUrl = 'https://vattams.net';
      const serviceLinks = '<nav aria-label="Primary"><a href="/">Home</a> · <a href="/services">Service prices</a> · <a href="/booking">Book a service</a> · <a href="/contact">Contact</a></nav>';
      for (const city of cities) {
        const canonical = `${baseUrl}/areas/${city.slug}`;
        const providerId = `${baseUrl}/#organization`;
        const schema = {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Organization',
              '@id': providerId,
              name: 'VATTAMS Home Services',
              url: baseUrl,
              logo: `${baseUrl}/VATTAMS_HOME_SERVICES_logo.svg`,
              telephone: '+91-63740-68296',
              email: 'support@vattams.net',
              areaServed: { '@type': 'City', name: city.name, containedInPlace: { '@type': 'State', name: city.state } },
            },
            ...['AC Service', 'Washing Machine Service', 'Refrigerator Service'].map((serviceName) => ({
              '@type': 'Service',
              name: `${serviceName} in ${city.name}`,
              serviceType: serviceName,
              provider: { '@id': providerId },
              areaServed: { '@type': 'City', name: city.name },
              url: canonical,
            })),
            {
              '@type': 'FAQPage',
              mainEntity: city.faqs.map((faq) => ({
                '@type': 'Question',
                name: faq.q,
                acceptedAnswer: { '@type': 'Answer', text: faq.a },
              })),
            },
          ],
        };
        const body = `<header><a href="/">VATTAMS Home Services</a>${serviceLinks}</header>
          <main><nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/services">Services</a> / <span>${escapeHtml(city.name)}</span></nav>
          <h1>${escapeHtml(city.h1)}</h1><p>${escapeHtml(city.intro)}</p>
          <p>Appointment availability depends on your address, selected job type and technician schedule. Confirm availability in the booking flow.</p>
          <p><a href="/services">View service categories and prices</a> · <a href="/booking">Check appointment options</a></p>
          ${city.contentSections.map((section) => `<section><h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.body)}</p></section>`).join('')}
          <section><h2>Frequently Asked Questions</h2>${city.faqs.map((faq) => `<details><summary>${escapeHtml(faq.q)}</summary><p>${escapeHtml(faq.a)}</p></details>`).join('')}</section>
          <section><h2>Neighbourhood references</h2><p>${escapeHtml(city.nearbyAreas.join(', '))}. Availability for any address is confirmed during booking.</p></section>
          <p><a href="/booking">Book appliance service</a></p></main><footer><a href="/contact">Contact VATTAMS</a></footer>`;
        const pageHtml = renderPage({ title: city.seoTitle, description: city.metaDescription, canonical, body, schema });
        const cityDir = resolve(outputDir, 'areas', city.slug);
        mkdirSync(cityDir, { recursive: true });
        writeFileSync(resolve(cityDir, 'index.html'), pageHtml, 'utf8');
      }

      const servicesCanonical = `${baseUrl}/services`;
      const servicesBody = `<header><a href="/">VATTAMS Home Services</a>${serviceLinks}</header><main>
        <h1>AC, Washing Machine and Refrigerator Service Prices</h1>
        <p>Explore AC general service, installation, gas filling, pump water service and coil service, plus washing machine and refrigerator service.</p>
        <p>Listed base prices and supported job types are loaded from the current service catalogue. Applicable GST and platform fees are displayed at checkout. Parts and additional work should be quoted separately and approved before proceeding.</p>
        <section><h2>Air Conditioner Service</h2><p>Choose general service, installation, gas filling, pump water service or coil service.</p></section>
        <section><h2>Washing Machine Service</h2><p>Request service for a washing machine and describe the issue during booking.</p></section>
        <section><h2>Refrigerator Service</h2><p>Request refrigerator service and describe the symptoms to help route the job.</p></section>
        <p><a href="/booking">Check appointment options and book</a></p></main>`;
      const servicesSchema = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'VATTAMS Home Services',
        url: servicesCanonical,
        itemListElement: ['AC Service', 'Washing Machine Service', 'Refrigerator Service'].map((name, index) => ({
          '@type': 'ListItem', position: index + 1, name,
        })),
      };
      const servicesDir = resolve(outputDir, 'services');
      mkdirSync(servicesDir, { recursive: true });
      writeFileSync(resolve(servicesDir, 'index.html'), renderPage({
        title: 'AC, Washing Machine & Refrigerator Service Prices | VATTAMS',
        description: 'Explore listed base prices for AC service, installation, gas filling, coil service, washing machine service and refrigerator service. Check appointment availability and checkout charges before confirming.',
        canonical: servicesCanonical,
        body: servicesBody,
        schema: servicesSchema,
      }), 'utf8');
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
  plugins: [react(), configureFcmServiceWorker(env), prerenderSeoPages()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: false,
  },
  };
});
