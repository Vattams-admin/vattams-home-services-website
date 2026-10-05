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
        "description": "VATTAMS Home Services connects customers with professional home service technicians across India.",
        "department": [
          { "@id": "https://vattams.net/#business" }
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
        "telephone": "+91-63740-68296",
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