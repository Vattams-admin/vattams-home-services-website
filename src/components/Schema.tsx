export default function Schema() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": "https://vattams.net/#business",
        "name": "VATTAMS Home Services",
        "url": "https://vattams.net",
        "logo": "https://vattams.net/logo.svg",
        "image": "https://vattams.net/logo.svg",
        "telephone": "+91-81898-00757",
        "email": "support@vattams.net",
        "priceRange": "₹₹",
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
        "name": "VATTAMS Home Services"
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