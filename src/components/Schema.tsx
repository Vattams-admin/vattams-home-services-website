export default function Schema() {
  const baseUrl = 'https://vattams.net';
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: 'VATTAMS Hybrid Service Marketplace',
        url: baseUrl,
        logo: `${baseUrl}/VATTAMS_HOME_SERVICES_logo.svg`,
        image: `${baseUrl}/icons/icon-512.png`,
        description: 'VATTAMS Hybrid Service Marketplace helps customers request AC, washing machine and refrigerator service, with listed base prices and appointment options confirmed during booking.',
        telephone: '+91-63740-68296',
        email: 'admin@vattams.net',
        areaServed: [
          { '@type': 'City', name: 'Chennai', containedInPlace: { '@type': 'State', name: 'Tamil Nadu' } },
          { '@type': 'City', name: 'Coimbatore', containedInPlace: { '@type': 'State', name: 'Tamil Nadu' } },
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: 'VATTAMS Hybrid Service Marketplace',
        alternateName: 'VATTAMS',
        publisher: { '@id': `${baseUrl}/#organization` },
        inLanguage: 'en-IN',
      },
    ],
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  );
}
