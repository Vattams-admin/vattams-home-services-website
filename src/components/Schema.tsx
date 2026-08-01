export default function Schema() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": "https://vattams.net/#business",
        "name": "VATTAMS Home Services",
        "url": "https://vattams.net",
        "logo": "https://vattams.net/logo.png",
        "image": "https://vattams.net/logo.png",
        "telephone": "+91-XXXXXXXXXX",
        "email": "info@vattams.net",
        "priceRange": "₹₹",
        "areaServed": {
          "@type": "State",
          "name": "Tamil Nadu"
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
