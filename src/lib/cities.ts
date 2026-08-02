export interface CityData {
  slug: string;
  name: string;
  seoTitle: string;
  metaDescription: string;
  h1: string;
  tagline: string;
  intro: string;
  population: string;
  districts: string;
  knownFor: string;
  nearbyAreas: string[];
  faqs: { q: string; a: string }[];
  testimonials: { name: string; area: string; rating: number; text: string }[];
  contentSections: { heading: string; body: string }[];
  geo: { lat: string; lng: string };
}

const services = [
  'AC Repair', 'AC Service', 'Electrician', 'Plumbing',
  'Washing Machine Repair', 'Refrigerator Repair',
  'RO Water Purifier', 'Microwave Repair', 'CCTV Installation',
];

export const SERVICE_CATEGORIES = services;

function generateFAQs(cityName: string): { q: string; a: string }[] {
  return [
    {
      q: `How do I book a home service in ${cityName} with VATTAMS?`,
      a: `Booking a service in ${cityName} is simple. Click the "Book Now" button, fill in your details including your address in ${cityName}, select the service you need, and choose a preferred time slot. Our verified technician in ${cityName} will be assigned to you promptly.`,
    },
    {
      q: `Are VATTAMS technicians in ${cityName} verified and background-checked?`,
      a: `Yes, every technician serving ${cityName} undergoes a thorough background verification, identity check, and skill assessment. We verify their ID proofs, check their experience, and ensure they meet our quality standards before they can accept bookings in ${cityName}.`,
    },
    {
      q: `What areas of ${cityName} does VATTAMS cover?`,
      a: `VATTAMS covers all major residential and commercial areas within ${cityName} and its surrounding neighborhoods. Our technicians are locally based, ensuring quick response times across the entire ${cityName} region.`,
    },
    {
      q: `How much does AC repair cost in ${cityName}?`,
      a: `AC repair costs in ${cityName} start from ₹299 for basic servicing. The final price depends on the issue, parts needed, and the type of AC unit. You'll receive a transparent price breakdown before any work begins, with no hidden charges.`,
    },
    {
      q: `Do you offer same-day service in ${cityName}?`,
      a: `Yes, VATTAMS offers same-day service across ${cityName} for most bookings made before 2 PM. Emergency electrical and plumbing services are available with priority dispatch to ${cityName} residents.`,
    },
    {
      q: `What is the warranty on repairs done in ${cityName}?`,
      a: `All repairs performed by VATTAMS technicians in ${cityName} come with a 30-day service warranty. If the same issue recurs within the warranty period, we'll fix it free of charge.`,
    },
    {
      q: `Can I get a washing machine repaired on weekends in ${cityName}?`,
      a: `Absolutely. VATTAMS operates 7 days a week in ${cityName}, including weekends and public holidays. You can book a weekend slot that suits your convenience.`,
    },
    {
      q: `How do I pay for services in ${cityName}?`,
      a: `Customers in ${cityName} can pay via UPI, cash, or online payment after the service is completed. You'll receive a digital invoice with a complete price breakdown including GST.`,
    },
    {
      q: `Do you provide CCTV installation services for businesses in ${cityName}?`,
      a: `Yes, we provide professional CCTV installation for both homes and businesses throughout ${cityName}. Our technicians handle everything from site assessment to camera placement, wiring, and configuration.`,
    },
    {
      q: `What makes VATTAMS different from local repair shops in ${cityName}?`,
      a: `VATTAMS brings verified technicians, transparent pricing with GST invoices, a 30-day service warranty, OTP-verified job start and completion, in-app chat with your technician, and dedicated customer support — all designed for ${cityName} residents who value reliability and professionalism.`,
    },
    {
      q: `How quickly can a technician reach my home in ${cityName}?`,
      a: `Our average response time in ${cityName} is 60–90 minutes for standard bookings. For emergency electrical or plumbing issues, we prioritize dispatch and aim to reach ${cityName} homes within 45 minutes.`,
    },
    {
      q: `Can I reschedule my booking in ${cityName}?`,
      a: `Yes, you can reschedule any booking in ${cityName} through your customer dashboard or by contacting our support team via WhatsApp. We offer flexible rescheduling with no penalty if done at least 2 hours before the scheduled time.`,
    },
  ];
}

function generateTestimonials(cityName: string, areas: string[]): { name: string; area: string; rating: number; text: string }[] {
  const names = ['Rajesh Kumar', 'Priya Sundaram', 'Murugan S', 'Lakshmi N', 'Karthik R', 'Deepa V', 'Senthil Kumar', 'Anitha R'];
  const texts = [
    `Excellent service! The technician arrived on time and fixed my AC quickly. Very professional and the pricing was transparent. Highly recommend VATTAMS for anyone in`,
    `Booked a plumber through VATTAMS and was impressed by how smooth the whole process was. The OTP verification gave me confidence that the job was done properly. Best home service in`,
    `My washing machine stopped working suddenly. VATTAMS sent a technician the same day and he diagnosed and fixed the issue within an hour. Great service for residents of`,
    `Very transparent pricing and professional technicians. The in-app chat feature was very convenient for communicating with the technician. A game-changer for home services in`,
    `I've used VATTAMS three times now — for AC service, electrical work, and RO repair. Each time the service was excellent. They truly are the best home service provider in`,
    `The technician who came for my refrigerator repair was very knowledgeable. He explained the problem clearly and didn't overcharge. VATTAMS is reliable for anyone living in`,
  ];
  return texts.slice(0, 6).map((t, i) => ({
    name: names[i],
    area: areas[i % areas.length],
    rating: 5,
    text: t + ` ${cityName}.`,
  }));
}

function generateContentSections(cityName: string, knownFor: string, population: string): { heading: string; body: string }[] {
  return [
    {
      heading: `Professional Home Services in ${cityName}`,
      body: `${cityName} is a vibrant city with a growing population of over ${population} residents. As ${cityName} continues to expand, the demand for reliable, professional home services has never been higher. VATTAMS Home Services brings certified, background-verified technicians directly to your doorstep in ${cityName}, ensuring that your home appliances and electrical and plumbing systems are always in perfect working condition. Whether you need urgent AC repair during ${cityName}'s hot summer months or a routine RO water purifier service, our local ${cityName} technicians are ready to help.`,
    },
    {
      heading: `Why Choose VATTAMS in ${cityName}?`,
      body: `VATTAMS stands apart from local repair shops in ${cityName} through our commitment to transparency, quality, and customer satisfaction. Every technician serving ${cityName} undergoes a rigorous verification process including ID proof checks, skill assessments, and background screening. Our unique OTP-based job verification system ensures that both the start and completion of your service in ${cityName} are properly documented. With transparent pricing that includes GST, a 30-day service warranty, and dedicated customer support, ${cityName} residents can trust VATTAMS for all their home service needs.`,
    },
    {
      heading: `AC Repair and Service in ${cityName}`,
      body: `${cityName}'s climate makes air conditioning essential for most of the year. Our AC repair technicians in ${cityName} are trained to handle all major brands including Daikin, LG, Samsung, Voltas, Blue Star, and Carrier. From gas refilling and compressor repair to deep cleaning and installation, VATTAMS provides comprehensive AC services across ${cityName}. Regular AC servicing not only improves cooling efficiency but also reduces electricity bills — a significant benefit for ${cityName} households running ACs for extended periods.`,
    },
    {
      heading: `Electrical and Plumbing Services in ${cityName}`,
      body: `Electrical and plumbing issues can disrupt daily life and pose safety risks. VATTAMS provides licensed electricians and experienced plumbers throughout ${cityName} for everything from switchboard repairs and fan installations to pipe leaks and bathroom fitting work. Our ${cityName} technicians arrive with the right tools and genuine spare parts, ensuring lasting solutions rather than temporary fixes. Emergency electrical services in ${cityName} are available with priority dispatch for safety-critical situations.`,
    },
    {
      heading: `Home Appliance Repair in ${cityName}`,
      body: `From washing machines and refrigerators to microwaves and water heaters, VATTAMS covers all major home appliance repairs in ${cityName}. Our technicians are brand-certified and stay updated with the latest appliance technologies. We understand that a broken refrigerator or malfunctioning washing machine can cause significant inconvenience for ${cityName} families, which is why we prioritize same-day service for appliance repairs across ${cityName}.`,
    },
    {
      heading: `RO Water Purifier Service in ${cityName}`,
      body: `Clean drinking water is essential for every household in ${cityName}. VATTAMS provides comprehensive RO water purifier services including filter replacement, membrane cleaning, tank cleaning, and complete unit servicing. Our ${cityName} technicians service all major RO brands and ensure your water purifier delivers safe, clean water for your family. Regular RO servicing in ${cityName} is recommended every 6 months for optimal performance.`,
    },
    {
      heading: `CCTV Installation and Security Solutions in ${cityName}`,
      body: `As ${cityName} grows, home and business security becomes increasingly important. VATTAMS offers professional CCTV installation services across ${cityName}, including site assessment, camera placement planning, wiring, configuration, and mobile app setup. Whether you need a single-camera setup for your ${cityName} apartment or a multi-camera system for your business, our technicians deliver reliable, clean installations with minimal disruption.`,
    },
    {
      heading: `Booking Process for ${cityName} Residents`,
      body: `Booking a home service in ${cityName} with VATTAMS takes less than 2 minutes. Simply click "Book Now," enter your ${cityName} address, select the service category, describe your issue, and choose a convenient time slot. You'll receive a booking confirmation with your unique booking number. Our system automatically matches your request with the nearest qualified technician in ${cityName}. You can track your booking, chat with your technician, and make payments — all through our platform designed for ${cityName} customers.`,
    },
    {
      heading: `Service Areas and Coverage in ${cityName}`,
      body: `VATTAMS proudly serves all neighborhoods and surrounding areas of ${cityName}. Our technicians are strategically located across ${cityName} to ensure quick response times wherever you are. From the city center to the outskirts of ${cityName}, we cover residential apartments, independent houses, commercial establishments, and industrial areas. Our coverage of ${cityName} is continuously expanding as we onboard more verified technicians.`,
    },
    {
      heading: `Customer Satisfaction in ${cityName}`,
      body: `Our commitment to ${cityName} customers goes beyond just fixing appliances. We believe in building long-term trust with every service call in ${cityName}. After each job, customers can rate their experience and leave reviews, helping us maintain our high service standards. Our ${cityName} customer support team is available via WhatsApp and phone to address any concerns. With hundreds of satisfied customers across ${cityName}, VATTAMS has become the trusted name in home services.`,
    },
  ];
}

const cityConfigs: { name: string; population: string; knownFor: string; nearbyAreas: string[]; geo: { lat: string; lng: string } }[] = [
  { name: 'Chennai', population: '4.6 million', knownFor: 'the capital city of Tamil Nadu and a major metropolitan hub', nearbyAreas: ['T. Nagar', 'Adyar', 'Velachery', 'Anna Nagar', 'Tambaram', 'Porur', 'Mylapore', 'Besant Nagar', 'Nungambakkam', 'Perambur', 'Tiruvanmiyur', 'Sholinganallur', 'Medavakkam', 'Madhavaram'], geo: { lat: '13.0827', lng: '80.2707' } },
  { name: 'Coimbatore', population: '1.6 million', knownFor: 'the Manchester of South India and a major industrial city', nearbyAreas: ['RS Puram', 'Saibaba Colony', 'Gandhipuram', 'Race Course', 'Saravanampatti', 'Vadavalli', 'Singanallur', 'Peelamedu', 'Kovaipudur', 'Ukkadam', 'Town Hall', 'Trichy Road', 'Avinashi Road', 'Sulur'], geo: { lat: '11.0168', lng: '76.9558' } },
  { name: 'Madurai', population: '1.5 million', knownFor: 'the Temple City and one of the oldest continuously inhabited cities in India', nearbyAreas: ['Tallakulam', 'KK Nagar', 'Anna Nagar', 'Bypass Road', 'Thirunagar', 'Arappalayam', 'Goripalayam', 'Kamarajar Salai', 'Melur Road', 'Vaigai Colony', 'Thallakulam', 'Periyar', 'Sellur', 'Anuppanadi'], geo: { lat: '9.9252', lng: '78.1198' } },
  { name: 'Trichy', population: '0.9 million', knownFor: 'the Rock Fort city and a major educational and industrial hub in central Tamil Nadu', nearbyAreas: ['Srirangam', 'Thillai Nagar', 'Cantonment', 'K.K. Nagar', 'Woraiyur', 'Manapparai', 'Thiruverumbur', 'Golden Rock', 'Ponmalai', 'Karumandapam', 'Sangam Hotel Area', 'Chathram Bus Stand', 'Woriyur', 'Puthur'], geo: { lat: '10.7905', lng: '78.7047' } },
  { name: 'Salem', population: '0.8 million', knownFor: 'the Steel City of South India and a major agricultural and industrial center', nearbyAreas: ['Hasthampatti', 'Fairlands', 'Alagapuram', 'Kondalampatti', 'Ammapet', 'Suramangalam', 'Chinnappampatti', 'Veeranam', 'Omalur', 'Meyyanur', 'Gugai', 'Seelanaickenpatti', 'Kannankurichi', 'Maravari'], geo: { lat: '11.6643', lng: '78.1460' } },
  { name: 'Erode', population: '0.5 million', knownFor: 'the Turmeric City and a major textile and agricultural trading hub', nearbyAreas: ['PS Park', 'Thindal', 'Periyar Nagar', 'B.P. Agraharam', 'Solar', 'Chithode', 'Kodumudi', 'Gobichettipalayam Road', 'Mettur Road', 'Sathy Road', 'Perundurai', 'Modakurichi', 'Lakkampatti', 'Vijayamangalam'], geo: { lat: '11.3410', lng: '77.7172' } },
  { name: 'Tiruppur', population: '0.5 million', knownFor: 'the Knitwear Capital of India and a major textile export hub', nearbyAreas: ['Kumaran Nagar', 'Avinashi Road', 'Palladam Road', 'Uthukuli', 'Mangalam', 'Avinashilingampalayam', 'Kangeyam', 'Dharapuram', 'Udumalpet', 'Perumanallur', 'Vijayapuram', 'Kunnathur', 'Theethampalayam', 'Nallur'], geo: { lat: '11.1085', lng: '77.3411' } },
  { name: 'Vellore', population: '0.5 million', knownFor: 'the city of forts and a renowned medical and educational hub', nearbyAreas: ['Katpadi', 'Sathuvachari', 'Gandhi Nagar', 'Bagayam', 'Allapuram', 'Kangeyanellur', 'Virupakshipuram', 'Thorapadi', 'Pennathur', 'Adukkamparai', 'Srinivasa Nagar', 'Brahmapuram', 'Palamner', 'Kaniyambadi'], geo: { lat: '12.9165', lng: '79.1325' } },
  { name: 'Thoothukudi', population: '0.4 million', knownFor: 'the Pearl City and a major port and industrial hub in southern Tamil Nadu', nearbyAreas: ['Bryant Nagar', 'Juvenile Road', 'Third Mile', 'TSP Camp', 'Mapilaiyurani', 'Sawypuram', 'Muthiapuram', 'Sterlite', 'Meelavittan', 'Milavittan', 'Tattaparai', 'Vellappatti', 'Punnakayal', 'Aralvaimozhi', 'Therespuram'], geo: { lat: '8.7642', lng: '78.1348' } },
  { name: 'Nagercoil', population: '0.3 million', knownFor: 'the southern gateway to Tamil Nadu and a major city in the Kanyakumari district', nearbyAreas: ['Vadacherry', 'Kottar', 'Meenakshipuram', 'Vadasery', 'Cape Road', 'Parvathipuram', 'Chettikulam', 'Suchindram', 'Konam', 'Mylaudy', 'Thengamam', 'Rajakkamangalam', 'Colachel', 'Manavalakurichi'], geo: { lat: '8.1804', lng: '77.4320' } },
  { name: 'Karur', population: '0.3 million', knownFor: 'a major textile and carpet manufacturing hub in central Tamil Nadu', nearbyAreas: ['Gandhi Nagar', 'Thiruvilangudi', 'Pugalur', 'Kulithalai', 'Krishnarayapuram', 'Puliyur', 'Kadavur', 'Manmangalam', 'Thanthoni', 'Sevvur', 'Vangal', 'Nerur', 'Shanmuganathi', 'Mohanur'], geo: { lat: '10.9577', lng: '78.0809' } },
  { name: 'Namakkal', population: '0.2 million', knownFor: 'the Egg City of India and a major poultry and transport hub', nearbyAreas: ['Kamarajar Salai', 'Salem Road', 'Tiruchengode Road', 'Paramathi Road', 'Mohanur Road', 'Senthamangalam', 'Puduchatram', 'Erumapatti', 'Mallasamudram', 'Kolli Hills', 'Vennpudur', 'Periyamanadi', 'Pettanayakkanpatti', 'Nallipalayam'], geo: { lat: '11.2453', lng: '78.1676' } },
  { name: 'Dharmapuri', population: '0.1 million', knownFor: 'a major agricultural and mango-producing region in western Tamil Nadu', nearbyAreas: ['Nethaji Road', 'Salem Road', 'Bommidi', 'Hogenakkal Road', 'Kambainallur', 'Marappadi', 'Thoppur', 'Palacode', 'Pennagaram', 'Karimangalam', 'Bodamalai', 'Eriyur', 'Pappireddipatti', 'Harur'], geo: { lat: '12.1216', lng: '78.1379' } },
  { name: 'Krishnagiri', population: '0.2 million', knownFor: 'a major mango cultivation hub and a growing industrial town near Bangalore', nearbyAreas: ['Bypass Road', 'Hosur Road', 'Denkanikottai', 'Thally', 'Kelamangalam', 'Shoolagiri', 'Bargur', 'Uthangarai', 'Pochampalli', 'Kaveripattinam', 'Mathigiri', 'Mookandapalli', 'Karumanthur', 'Achettipalli'], geo: { lat: '12.5266', lng: '78.2150' } },
  { name: 'Thanjavur', population: '0.3 million', knownFor: 'the Rice Bowl of Tamil Nadu and home to the iconic Brihadeeswarar Temple', nearbyAreas: ['Medical College Road', 'Gandhi Nagar', 'Rajah Serfoji Nagar', 'Nanjikottai', 'Vallam', 'Orathanadu', 'Papanasam', 'Kumbakonam Road', 'Tiruchirappalli Road', 'Thiruvaiyaru', 'Papanasam', 'Ayyampettai', 'Thirukkarugavur', 'Punnaipallivasal'], geo: { lat: '10.7870', lng: '79.1378' } },
  { name: 'Kumbakonam', population: '0.1 million', knownFor: 'the Temple Town of Tamil Nadu and a major cultural and religious center', nearbyAreas: ['Town Hall', 'Head Post Office', 'Big Street', 'Srinivasa Nagar', 'Braghampalayam', 'Mahamaham Tank Area', 'Tirubhuvanam', 'Darasuram', 'Swamimalai', 'Nachiyarkovil', 'Pateeswaram', 'Thirunageswaram', 'Valangaiman', 'Kodavasal'], geo: { lat: '10.9616', lng: '79.3882' } },
  { name: 'Mayiladuthurai', population: '0.1 million', knownFor: 'a historic temple town on the banks of the Cauvery River', nearbyAreas: ['Kamarajar Salai', 'Tiruvarur Road', 'Kumbakonam Road', 'Sirkazhi Road', 'Tharangambadi', 'Poompuhar', 'Sirkazhi', 'Vaitheeswarankovil', 'Thirukkadaiyur', 'Kuttalam', 'Sembanarkovil', 'Kollumangudi', 'Mangalamedu', 'Anandamangalam'], geo: { lat: '11.1036', lng: '79.6553' } },
  { name: 'Tirunelveli', population: '0.5 million', knownFor: 'the Halwa City and a major educational and cultural hub in southern Tamil Nadu', nearbyAreas: ['Palayamkottai', 'Tirunelveli Junction', 'Vannarpettai', 'Thatchanallur', 'Maharaja Nagar', 'Sankar Nagar', 'Kawilpalayam', 'Tirunelveli Town', 'Pettaikulam', 'Moolakaraipatti', 'Cheranmahadevi', 'Ambasamudram', 'Vikramasingapuram', 'Kallidaikurichi'], geo: { lat: '8.7139', lng: '77.7567' } },
  { name: 'Dindigul', population: '0.3 million', knownFor: 'the Lock City and a major agricultural and textile hub in central Tamil Nadu', nearbyAreas: ['Nagaraj Nagar', 'Bharathi Nagar', 'Kamarajar Nagar', 'MSP Nagar', 'R.M.S. Colony', 'Thilagar Nagar', 'Periakottai', 'Natham', 'Vadipatti', 'Batlagundu', 'Nilakottai', 'Palani', 'Oddanchatram', 'Vedasandur'], geo: { lat: '10.3673', lng: '77.9803' } },
  { name: 'Cuddalore', population: '0.2 million', knownFor: 'a coastal city and a major port and industrial hub on the Coromandel Coast', nearbyAreas: ['Manjakuppam', 'Thirupadiripuliyur', 'Devanampattinam', 'Nellikuppam', 'Cuddalore Port', 'Semmandalam', 'Pudupalayam', 'Reddiyarpalayam', 'Pethanaickanpalayam', 'Kurinjipadi', 'Bhuvanagiri', 'Parangipettai', 'Annamalai Nagar', 'Panthanallur'], geo: { lat: '11.7460', lng: '79.7627' } },
  { name: 'Villupuram', population: '0.2 million', knownFor: 'a major junction city and gateway to southern Tamil Nadu', nearbyAreas: ['Gingee Salai', 'Thiruvennainallur Road', 'Koliyanur', 'Kandamangalam', 'Marakanam', 'Tindivanam', 'Gingee', 'Tirukovilur', 'Sankarapuram', 'Kallakurichi', 'Ulundurpet', 'Vallam', 'Thirunavalur', 'Rishivandiyam'], geo: { lat: '11.9398', lng: '79.4913' } },
  { name: 'Sivakasi', population: '0.1 million', knownFor: 'the Fireworks Capital of India and a major printing and matchbox hub', nearbyAreas: ['Ayyanar Kovil Street', 'Sattur Road', 'Virudhunagar Road', 'Tiruthangal', 'Alangulam', 'Mamsapuram', 'Ettayapuram', 'Pallapatti', 'Satur', 'Tiruvengadam', 'Kariyapatti', 'Aruppukkottai Road', 'Edaichi', 'Kunnur'], geo: { lat: '9.4500', lng: '77.7980' } },
  { name: 'Virudhunagar', population: '0.2 million', knownFor: 'a major trading hub and the birthplace of K. Kamaraj', nearbyAreas: ['Kamarajar Salai', 'Sivakasi Road', 'Aruppukkottai Road', 'Rajaji Road', 'Sattur', 'Sivakasi', 'Tiruchuli', 'Kariapatti', 'Aruppukkottai', 'Watrap', 'Srivilliputhur', 'Rajapalayam', 'Sankarankovil', 'Pattukottai'], geo: { lat: '9.5600', lng: '77.9600' } },
  { name: 'Pudukkottai', population: '0.1 million', knownFor: 'a historic princely state town in central Tamil Nadu', nearbyAreas: ['Raja Street', 'Tirugokarnam', 'Kulathur', 'Karambakudi', 'Alangudi', 'Aranthangi', 'Avudaiyarkovil', 'Manamelkudi', 'Kodumangalam', 'Vellanur', 'Ponnamaravathi', 'Kunnandarkovil', 'Thiruvarankulam', 'Kudimiyanmalai'], geo: { lat: '10.3825', lng: '78.8213' } },
  { name: 'Ranipet', population: '0.1 million', knownFor: 'a major leather industry hub and a growing industrial town near Vellore', nearbyAreas: ['Ranipet Bazaar', 'Arcot Road', 'Walajapet', 'Walaja Road', 'Arcot', 'Timiri', 'Sholingur', 'Kaveripakkam', 'Panapakkam', 'Nemili', 'Pallikonda', 'Gudiyatham', 'Vaniyambadi', 'Ambur'], geo: { lat: '12.9280', lng: '79.3355' } },
  { name: 'Hosur', population: '0.3 million', knownFor: 'a major industrial hub bordering Bangalore and one of Tamil Nadu\'s fastest-growing cities', nearbyAreas: ['Hosur Main Road', 'Bagalur', 'Mathigiri', 'Shoolagiri', 'Kelamangalam', 'Thally', 'Denkanikottai', 'Marasandiram', 'Kothur', 'Achettipalli', 'Mookandapalli', 'Sulagiri', 'Uddanapalli', 'Nerigapalli'], geo: { lat: '12.7409', lng: '77.8253' } },
];

export const cities: CityData[] = cityConfigs.map((c) => {
  const slug = c.name.toLowerCase().replace(/\s+/g, '-');
  return {
    slug,
    name: c.name,
    seoTitle: `${c.name} Home Services | AC Repair, Electrician, Plumbing | VATTAMS`,
    metaDescription: `Professional home services in ${c.name}. AC repair, electrician, plumbing, washing machine, refrigerator, RO, CCTV installation. Verified technicians, same-day service, transparent pricing. Book now!`,
    h1: `Home Services in ${c.name} — AC Repair, Electrician, Plumbing & More`,
    tagline: `Trusted home appliance repair and maintenance services across ${c.name}`,
    intro: `VATTAMS brings verified, professional technicians to every neighborhood in ${c.name}. From AC repair to electrical work, plumbing to appliance servicing — get same-day, reliable home services with transparent pricing and a 30-day warranty.`,
    population: c.population,
    districts: c.name,
    knownFor: c.knownFor,
    nearbyAreas: c.nearbyAreas,
    faqs: generateFAQs(c.name),
    testimonials: generateTestimonials(c.name, c.nearbyAreas),
    contentSections: generateContentSections(c.name, c.knownFor, c.population),
    geo: c.geo,
  };
});

export function getCityBySlug(slug: string): CityData | undefined {
  return cities.find((c) => c.slug === slug);
}
