export default function Schema() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://vattams.net/#organization",
        "name": "VATTAMS",
        "url": "https://vattams.net",
        "logo": "https://vattams.net/icons/icon-512.png",
        "description": "VATTAMS is an India-wide platform for home services and online tuition, connecting customers and students with service professionals and tutors.",
        "department": [
          { "@id": "https://vattams.net/#business" },
          { "@id": "https://vattams.net/#tuition-organization" }
        ],
        "sameAs": []
      },
      {
        "@type": "LocalBusiness",
        "@id": "https://vattams.net/#business",
        "name": "VATTAMS Home Services",
        "url": "https://vattams.net/#home",
        "logo": "https://vattams.net/logo.svg",
        "image": "https://vattams.net/logo.svg",
        "telephone": "+91-81898-00757",
        "email": "support@vattams.net",
        "priceRange": "₹₹",
        "parentOrganization": { "@id": "https://vattams.net/#organization" },
        "areaServed": {
          "@type": "Country",
          "name": "India"
        },
        "sameAs": []
      },
      {
        "@type": "EducationalOrganization",
        "@id": "https://vattams.net/#tuition-organization",
        "name": "VATTAMS Online Tuition",
        "url": "https://vattams.net/#tuition-home",
        "logo": "https://vattams.net/logo.svg",
        "parentOrganization": { "@id": "https://vattams.net/#organization" },
        "areaServed": {
          "@type": "Country",
          "name": "India"
        }
      },
      {
        "@type": "WebSite",
        "@id": "https://vattams.net/#website",
        "url": "https://vattams.net",
        "name": "VATTAMS",
        "alternateName": "VATTAMS Home Services",
        "publisher": { "@id": "https://vattams.net/#organization" }
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}