export interface CityData {
  slug: string;
  name: string;
  state: string;
  tier: 'metropolitan' | 'metro' | 'urban' | 'semi-urban';
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
  'AC Service', 'Washing Machine Service', 'Refrigerator Service',
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
      a: `Yes, VATTAMS offers same-day service across ${cityName} for most bookings made before 2 PM. Priority dispatch options depend on local technician availability.`,
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
      q: `Which appliance services can I book in ${cityName}?`,
      a: `You can request AC, washing machine and refrigerator service in ${cityName}. Availability is confirmed during booking.`,
    },
    {
      q: `What makes VATTAMS different from local repair shops in ${cityName}?`,
      a: `VATTAMS brings verified technicians, transparent pricing with GST invoices, a 30-day service warranty, OTP-verified job start and completion, in-app chat with your technician, and dedicated customer support — all designed for ${cityName} residents who value reliability and professionalism.`,
    },
    {
      q: `How quickly can a technician reach my home in ${cityName}?`,
      a: `Our average response time in ${cityName} is 60–90 minutes for standard bookings. For appliance issues, available appointment times are shown during booking.`,
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
    `I've used VATTAMS for appliance service. The booking experience was convenient and the technician was professional. They are a reliable appliance-care provider in`,
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
      body: `${cityName} is a vibrant city with a growing population of over ${population} residents. As ${cityName} continues to expand, the demand for reliable, professional home services has never been higher. VATTAMS Home Services focuses on doorstep AC, washing machine and refrigerator service in ${cityName}. Whether you need AC repair during ${cityName}'s hot summer months or help with a washing machine or refrigerator, check available appointments through our booking flow.`,
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
      heading: `Appliance Service Support in ${cityName}`,
      body: `VATTAMS focuses on AC, washing machine and refrigerator servicing in ${cityName}. Share your appliance issue and preferred time through the booking page to check local availability.`,
    },
    {
      heading: `Home Appliance Repair in ${cityName}`,
      body: `From washing machines and refrigerators to microwaves and water heaters, VATTAMS covers all major home appliance repairs in ${cityName}. Our technicians are brand-certified and stay updated with the latest appliance technologies. We understand that a broken refrigerator or malfunctioning washing machine can cause significant inconvenience for ${cityName} families, which is why we prioritize same-day service for appliance repairs across ${cityName}.`,
    },
    {
      heading: `Refrigerator Service in ${cityName}`,
      body: `Clean drinking water is essential for every household in ${cityName}. VATTAMS provides comprehensive RO water purifier services including filter replacement, membrane cleaning, tank cleaning, and complete unit servicing. Our ${cityName} technicians service all major RO brands and ensure your water purifier delivers safe, clean water for your family. Regular RO servicing in ${cityName} is recommended every 6 months for optimal performance.`,
    },
    {
      heading: `Washing Machine Service in ${cityName}`,
      body: `VATTAMS helps customers in ${cityName} request washing machine service and repair. Describe the symptoms and choose an available appointment through the booking form.`,
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

const cityConfigs: { name: string; state: string; tier: CityData['tier']; population: string; knownFor: string; nearbyAreas: string[]; geo: { lat: string; lng: string } }[] = [{ name: 'Chennai', state: 'Tamil Nadu', tier: 'metro', population: '4.6 million', knownFor: 'the capital city of Tamil Nadu and a major metropolitan hub', nearbyAreas: ['T. Nagar', 'Adyar', 'Velachery', 'Anna Nagar', 'Tambaram', 'Porur', 'Mylapore', 'Besant Nagar', 'Nungambakkam', 'Perambur', 'Tiruvanmiyur', 'Sholinganallur', 'Medavakkam', 'Madhavaram'], geo: { lat: '13.0827', lng: '80.2707' } },
  { name: 'Coimbatore', state: 'Tamil Nadu', tier: 'metropolitan', population: '1.6 million', knownFor: 'the Manchester of South India and a major industrial city', nearbyAreas: ['RS Puram', 'Saibaba Colony', 'Gandhipuram', 'Race Course', 'Saravanampatti', 'Vadavalli', 'Singanallur', 'Peelamedu', 'Kovaipudur', 'Ukkadam', 'Town Hall', 'Trichy Road', 'Avinashi Road', 'Sulur'], geo: { lat: '11.0168', lng: '76.9558' } },
  { name: 'Madurai', state: 'Tamil Nadu', tier: 'metropolitan', population: '1.5 million', knownFor: 'the Temple City and one of the oldest continuously inhabited cities in India', nearbyAreas: ['Tallakulam', 'KK Nagar', 'Anna Nagar', 'Bypass Road', 'Thirunagar', 'Arappalayam', 'Goripalayam', 'Kamarajar Salai', 'Melur Road', 'Vaigai Colony', 'Thallakulam', 'Periyar', 'Sellur', 'Anuppanadi'], geo: { lat: '9.9252', lng: '78.1198' } },
  { name: 'Trichy', state: 'Tamil Nadu', tier: 'metropolitan', population: '0.9 million', knownFor: 'the Rock Fort city and a major educational and industrial hub in central Tamil Nadu', nearbyAreas: ['Srirangam', 'Thillai Nagar', 'Cantonment', 'K.K. Nagar', 'Woraiyur', 'Manapparai', 'Thiruverumbur', 'Golden Rock', 'Ponmalai', 'Karumandapam', 'Sangam Hotel Area', 'Chathram Bus Stand', 'Woriyur', 'Puthur'], geo: { lat: '10.7905', lng: '78.7047' } },
  { name: 'Salem', state: 'Tamil Nadu', tier: 'metropolitan', population: '0.8 million', knownFor: 'the Steel City of South India and a major agricultural and industrial center', nearbyAreas: ['Hasthampatti', 'Fairlands', 'Alagapuram', 'Kondalampatti', 'Ammapet', 'Suramangalam', 'Chinnappampatti', 'Veeranam', 'Omalur', 'Meyyanur', 'Gugai', 'Seelanaickenpatti', 'Kannankurichi', 'Maravari'], geo: { lat: '11.6643', lng: '78.1460' } },
  { name: 'Erode', state: 'Tamil Nadu', tier: 'urban', population: '0.5 million', knownFor: 'the Turmeric City and a major textile and agricultural trading hub', nearbyAreas: ['PS Park', 'Thindal', 'Periyar Nagar', 'B.P. Agraharam', 'Solar', 'Chithode', 'Kodumudi', 'Gobichettipalayam Road', 'Mettur Road', 'Sathy Road', 'Perundurai', 'Modakurichi', 'Lakkampatti', 'Vijayamangalam'], geo: { lat: '11.3410', lng: '77.7172' } },
  { name: 'Tiruppur', state: 'Tamil Nadu', tier: 'urban', population: '0.5 million', knownFor: 'the Knitwear Capital of India and a major textile export hub', nearbyAreas: ['Kumaran Nagar', 'Avinashi Road', 'Palladam Road', 'Uthukuli', 'Mangalam', 'Avinashilingampalayam', 'Kangeyam', 'Dharapuram', 'Udumalpet', 'Perumanallur', 'Vijayapuram', 'Kunnathur', 'Theethampalayam', 'Nallur'], geo: { lat: '11.1085', lng: '77.3411' } },
  { name: 'Vellore', state: 'Tamil Nadu', tier: 'urban', population: '0.5 million', knownFor: 'the city of forts and a renowned medical and educational hub', nearbyAreas: ['Katpadi', 'Sathuvachari', 'Gandhi Nagar', 'Bagayam', 'Allapuram', 'Kangeyanellur', 'Virupakshipuram', 'Thorapadi', 'Pennathur', 'Adukkamparai', 'Srinivasa Nagar', 'Brahmapuram', 'Palamner', 'Kaniyambadi'], geo: { lat: '12.9165', lng: '79.1325' } },
  { name: 'Thoothukudi', state: 'Tamil Nadu', tier: 'urban', population: '0.4 million', knownFor: 'the Pearl City and a major port and industrial hub in southern Tamil Nadu', nearbyAreas: ['Bryant Nagar', 'Juvenile Road', 'Third Mile', 'TSP Camp', 'Mapilaiyurani', 'Sawypuram', 'Muthiapuram', 'Sterlite', 'Meelavittan', 'Milavittan', 'Tattaparai', 'Vellappatti', 'Punnakayal', 'Aralvaimozhi', 'Therespuram'], geo: { lat: '8.7642', lng: '78.1348' } },
  { name: 'Nagercoil', state: 'Tamil Nadu', tier: 'urban', population: '0.3 million', knownFor: 'the southern gateway to Tamil Nadu and a major city in the Kanyakumari district', nearbyAreas: ['Vadacherry', 'Kottar', 'Meenakshipuram', 'Vadasery', 'Cape Road', 'Parvathipuram', 'Chettikulam', 'Suchindram', 'Konam', 'Mylaudy', 'Thengamam', 'Rajakkamangalam', 'Colachel', 'Manavalakurichi'], geo: { lat: '8.1804', lng: '77.4320' } },
  { name: 'Karur', state: 'Tamil Nadu', tier: 'urban', population: '0.3 million', knownFor: 'a major textile and carpet manufacturing hub in central Tamil Nadu', nearbyAreas: ['Gandhi Nagar', 'Thiruvilangudi', 'Pugalur', 'Kulithalai', 'Krishnarayapuram', 'Puliyur', 'Kadavur', 'Manmangalam', 'Thanthoni', 'Sevvur', 'Vangal', 'Nerur', 'Shanmuganathi', 'Mohanur'], geo: { lat: '10.9577', lng: '78.0809' } },
  { name: 'Namakkal', state: 'Tamil Nadu', tier: 'semi-urban', population: '0.2 million', knownFor: 'the Egg City of India and a major poultry and transport hub', nearbyAreas: ['Kamarajar Salai', 'Salem Road', 'Tiruchengode Road', 'Paramathi Road', 'Mohanur Road', 'Senthamangalam', 'Puduchatram', 'Erumapatti', 'Mallasamudram', 'Kolli Hills', 'Vennpudur', 'Periyamanadi', 'Pettanayakkanpatti', 'Nallipalayam'], geo: { lat: '11.2453', lng: '78.1676' } },
  { name: 'Dharmapuri', state: 'Tamil Nadu', tier: 'semi-urban', population: '0.1 million', knownFor: 'a major agricultural and mango-producing region in western Tamil Nadu', nearbyAreas: ['Nethaji Road', 'Salem Road', 'Bommidi', 'Hogenakkal Road', 'Kambainallur', 'Marappadi', 'Thoppur', 'Palacode', 'Pennagaram', 'Karimangalam', 'Bodamalai', 'Eriyur', 'Pappireddipatti', 'Harur'], geo: { lat: '12.1216', lng: '78.1379' } },
  { name: 'Krishnagiri', state: 'Tamil Nadu', tier: 'semi-urban', population: '0.2 million', knownFor: 'a major mango cultivation hub and a growing industrial town near Bangalore', nearbyAreas: ['Bypass Road', 'Hosur Road', 'Denkanikottai', 'Thally', 'Kelamangalam', 'Shoolagiri', 'Bargur', 'Uthangarai', 'Pochampalli', 'Kaveripattinam', 'Mathigiri', 'Mookandapalli', 'Karumanthur', 'Achettipalli'], geo: { lat: '12.5266', lng: '78.2150' } },
  { name: 'Thanjavur', state: 'Tamil Nadu', tier: 'urban', population: '0.3 million', knownFor: 'the Rice Bowl of Tamil Nadu and home to the iconic Brihadeeswarar Temple', nearbyAreas: ['Medical College Road', 'Gandhi Nagar', 'Rajah Serfoji Nagar', 'Nanjikottai', 'Vallam', 'Orathanadu', 'Papanasam', 'Kumbakonam Road', 'Tiruchirappalli Road', 'Thiruvaiyaru', 'Papanasam', 'Ayyampettai', 'Thirukkarugavur', 'Punnaipallivasal'], geo: { lat: '10.7870', lng: '79.1378' } },
  { name: 'Kumbakonam', state: 'Tamil Nadu', tier: 'semi-urban', population: '0.1 million', knownFor: 'the Temple Town of Tamil Nadu and a major cultural and religious center', nearbyAreas: ['Town Hall', 'Head Post Office', 'Big Street', 'Srinivasa Nagar', 'Braghampalayam', 'Mahamaham Tank Area', 'Tirubhuvanam', 'Darasuram', 'Swamimalai', 'Nachiyarkovil', 'Pateeswaram', 'Thirunageswaram', 'Valangaiman', 'Kodavasal'], geo: { lat: '10.9616', lng: '79.3882' } },
  { name: 'Mayiladuthurai', state: 'Tamil Nadu', tier: 'semi-urban', population: '0.1 million', knownFor: 'a historic temple town on the banks of the Cauvery River', nearbyAreas: ['Kamarajar Salai', 'Tiruvarur Road', 'Kumbakonam Road', 'Sirkazhi Road', 'Tharangambadi', 'Poompuhar', 'Sirkazhi', 'Vaitheeswarankovil', 'Thirukkadaiyur', 'Kuttalam', 'Sembanarkovil', 'Kollumangudi', 'Mangalamedu', 'Anandamangalam'], geo: { lat: '11.1036', lng: '79.6553' } },
  { name: 'Tirunelveli', state: 'Tamil Nadu', tier: 'urban', population: '0.5 million', knownFor: 'the Halwa City and a major educational and cultural hub in southern Tamil Nadu', nearbyAreas: ['Palayamkottai', 'Tirunelveli Junction', 'Vannarpettai', 'Thatchanallur', 'Maharaja Nagar', 'Sankar Nagar', 'Kawilpalayam', 'Tirunelveli Town', 'Pettaikulam', 'Moolakaraipatti', 'Cheranmahadevi', 'Ambasamudram', 'Vikramasingapuram', 'Kallidaikurichi'], geo: { lat: '8.7139', lng: '77.7567' } },
  { name: 'Dindigul', state: 'Tamil Nadu', tier: 'urban', population: '0.3 million', knownFor: 'the Lock City and a major agricultural and textile hub in central Tamil Nadu', nearbyAreas: ['Nagaraj Nagar', 'Bharathi Nagar', 'Kamarajar Nagar', 'MSP Nagar', 'R.M.S. Colony', 'Thilagar Nagar', 'Periakottai', 'Natham', 'Vadipatti', 'Batlagundu', 'Nilakottai', 'Palani', 'Oddanchatram', 'Vedasandur'], geo: { lat: '10.3673', lng: '77.9803' } },
  { name: 'Cuddalore', state: 'Tamil Nadu', tier: 'semi-urban', population: '0.2 million', knownFor: 'a coastal city and a major port and industrial hub on the Coromandel Coast', nearbyAreas: ['Manjakuppam', 'Thirupadiripuliyur', 'Devanampattinam', 'Nellikuppam', 'Cuddalore Port', 'Semmandalam', 'Pudupalayam', 'Reddiyarpalayam', 'Pethanaickanpalayam', 'Kurinjipadi', 'Bhuvanagiri', 'Parangipettai', 'Annamalai Nagar', 'Panthanallur'], geo: { lat: '11.7460', lng: '79.7627' } },
  { name: 'Villupuram', state: 'Tamil Nadu', tier: 'semi-urban', population: '0.2 million', knownFor: 'a major junction city and gateway to southern Tamil Nadu', nearbyAreas: ['Gingee Salai', 'Thiruvennainallur Road', 'Koliyanur', 'Kandamangalam', 'Marakanam', 'Tindivanam', 'Gingee', 'Tirukovilur', 'Sankarapuram', 'Kallakurichi', 'Ulundurpet', 'Vallam', 'Thirunavalur', 'Rishivandiyam'], geo: { lat: '11.9398', lng: '79.4913' } },
  { name: 'Sivakasi', state: 'Tamil Nadu', tier: 'semi-urban', population: '0.1 million', knownFor: 'the Fireworks Capital of India and a major printing and matchbox hub', nearbyAreas: ['Ayyanar Kovil Street', 'Sattur Road', 'Virudhunagar Road', 'Tiruthangal', 'Alangulam', 'Mamsapuram', 'Ettayapuram', 'Pallapatti', 'Satur', 'Tiruvengadam', 'Kariyapatti', 'Aruppukkottai Road', 'Edaichi', 'Kunnur'], geo: { lat: '9.4500', lng: '77.7980' } },
  { name: 'Virudhunagar', state: 'Tamil Nadu', tier: 'semi-urban', population: '0.2 million', knownFor: 'a major trading hub and the birthplace of K. Kamaraj', nearbyAreas: ['Kamarajar Salai', 'Sivakasi Road', 'Aruppukkottai Road', 'Rajaji Road', 'Sattur', 'Sivakasi', 'Tiruchuli', 'Kariapatti', 'Aruppukkottai', 'Watrap', 'Srivilliputhur', 'Rajapalayam', 'Sankarankovil', 'Pattukottai'], geo: { lat: '9.5600', lng: '77.9600' } },
  { name: 'Pudukkottai', state: 'Tamil Nadu', tier: 'semi-urban', population: '0.1 million', knownFor: 'a historic princely state town in central Tamil Nadu', nearbyAreas: ['Raja Street', 'Tirugokarnam', 'Kulathur', 'Karambakudi', 'Alangudi', 'Aranthangi', 'Avudaiyarkovil', 'Manamelkudi', 'Kodumangalam', 'Vellanur', 'Ponnamaravathi', 'Kunnandarkovil', 'Thiruvarankulam', 'Kudimiyanmalai'], geo: { lat: '10.3825', lng: '78.8213' } },
  { name: 'Ranipet', state: 'Tamil Nadu', tier: 'semi-urban', population: '0.1 million', knownFor: 'a major leather industry hub and a growing industrial town near Vellore', nearbyAreas: ['Ranipet Bazaar', 'Arcot Road', 'Walajapet', 'Walaja Road', 'Arcot', 'Timiri', 'Sholingur', 'Kaveripakkam', 'Panapakkam', 'Nemili', 'Pallikonda', 'Gudiyatham', 'Vaniyambadi', 'Ambur'], geo: { lat: '12.9280', lng: '79.3355' } },
  { name: 'Hosur', state: 'Tamil Nadu', tier: 'urban', population: '0.3 million', knownFor: 'a major industrial hub bordering Bangalore and one of Tamil Nadu\'s fastest-growing cities', nearbyAreas: ['Hosur Main Road', 'Bagalur', 'Mathigiri', 'Shoolagiri', 'Kelamangalam', 'Thally', 'Denkanikottai', 'Marasandiram', 'Kothur', 'Achettipalli', 'Mookandapalli', 'Sulagiri', 'Uddanapalli', 'Nerigapalli'], geo: { lat: '12.7409', lng: '77.8253' } },
  { name: 'Delhi', state: 'Delhi', tier: 'metro', population: '19 million', knownFor: 'the capital of India and one of the largest metropolitan areas in the world', nearbyAreas: ['Connaught Place', 'Dwarka', 'Rohini', 'Saket', 'Karol Bagh', 'Lajpat Nagar', 'Vasant Kunj', 'Janakpuri', 'Pitampura', 'Mayur Vihar', 'Rajouri Garden', 'Chandni Chowk', 'Greater Kailash', 'Laxmi Nagar'], geo: { lat: '28.7041', lng: '77.1025' } },
  { name: 'Mumbai', state: 'Maharashtra', tier: 'metro', population: '20 million', knownFor: 'the financial capital of India and home to Bollywood', nearbyAreas: ['Andheri', 'Bandra', 'Borivali', 'Powai', 'Malad', 'Thane', 'Dadar', 'Goregaon', 'Chembur', 'Kandivali', 'Vile Parle', 'Juhu', 'Worli', 'Ghatkopar'], geo: { lat: '19.0760', lng: '72.8777' } },
  { name: 'Bangalore', state: 'Karnataka', tier: 'metro', population: '13 million', knownFor: 'the Silicon Valley of India and a major IT and startup hub', nearbyAreas: ['Koramangala', 'Indiranagar', 'Whitefield', 'HSR Layout', 'Jayanagar', 'Electronic City', 'Marathahalli', 'BTM Layout', 'Rajajinagar', 'Malleshwaram', 'Yelahanka', 'JP Nagar', 'Hebbal', 'Bellandur'], geo: { lat: '12.9716', lng: '77.5946' } },
  { name: 'Hyderabad', state: 'Telangana', tier: 'metro', population: '10 million', knownFor: 'the City of Pearls and a major IT and pharmaceutical hub', nearbyAreas: ['Gachibowli', 'Banjara Hills', 'Jubilee Hills', 'Madhapur', 'Kukatpally', 'Secunderabad', 'Hitech City', 'Kondapur', 'Ameerpet', 'Dilsukhnagar', 'Miyapur', 'Begumpet', 'LB Nagar', 'Uppal'], geo: { lat: '17.3850', lng: '78.4867' } },
  { name: 'Pune', state: 'Maharashtra', tier: 'metro', population: '7 million', knownFor: 'the Oxford of the East and a major educational and IT hub', nearbyAreas: ['Kothrud', 'Hinjewadi', 'Viman Nagar', 'Baner', 'Aundh', 'Hadapsar', 'Wakad', 'Kharadi', 'Camp', 'Kondhwa', 'Pimpri-Chinchwad', 'Magarpatta', 'Wagholi', 'Katraj'], geo: { lat: '18.5204', lng: '73.8567' } },{ name: 'Ahmedabad', state: 'Gujarat', tier: 'metro', population: '8.4 million', knownFor: 'the largest city in Gujarat and a major textile and industrial hub', nearbyAreas: ['Navrangpura', 'Satellite', 'Bopal', 'Vastrapur', 'Maninagar', 'Chandkheda', 'Prahladnagar', 'Bodakdev', 'Naranpura', 'Thaltej', 'Gota', 'Paldi', 'Ellisbridge', 'Sabarmati'], geo: { lat: '23.0225', lng: '72.5714' } },
  { name: 'Surat', state: 'Gujarat', tier: 'urban', population: '4.5 million', knownFor: 'the Diamond City of India and a major textile trading hub', nearbyAreas: ['Adajan', 'Vesu', 'Athwa', 'Piplod', 'City Light', 'Katargam', 'Varachha', 'Ghod Dod Road', 'Rander', 'Pal', 'Nanpura', 'Udhna', 'Sarthana', 'Dumas Road'], geo: { lat: '21.1702', lng: '72.8311' } },
  { name: 'Vadodara', state: 'Gujarat', tier: 'semi-urban', population: '2.1 million', knownFor: 'the cultural capital of Gujarat, known for its palaces and gardens', nearbyAreas: ['Alkapuri', 'Gotri', 'Manjalpur', 'Fatehgunj', 'Sayajigunj', 'Karelibaug', 'Waghodia Road', 'Vasna', 'Akota', 'Old Padra Road', 'Nizampura', 'Subhanpura', 'Harni', 'Tarsali'], geo: { lat: '22.3072', lng: '73.1812' } },
  { name: 'Jaipur', state: 'Rajasthan', tier: 'metro', population: '3.9 million', knownFor: 'the Pink City and capital of Rajasthan, a major tourism and heritage hub', nearbyAreas: ['Malviya Nagar', 'Vaishali Nagar', 'C-Scheme', 'Mansarovar', 'Jagatpura', 'Raja Park', 'Tonk Road', 'Bani Park', 'Sanganer', 'Jhotwara', 'Civil Lines', 'Amer Road', 'Vidhyadhar Nagar', 'Jawahar Nagar'], geo: { lat: '26.9124', lng: '75.7873' } },
  { name: 'Jodhpur', state: 'Rajasthan', tier: 'urban', population: '1.3 million', knownFor: 'the Blue City, known for Mehrangarh Fort and its historic old town', nearbyAreas: ['Ratanada', 'Shastri Nagar', 'Paota', 'Sardarpura', 'Chopasni Road', 'Basni', 'Pal Road', 'Jalori Gate', 'Airport Road', 'Mandore', 'Sojati Gate', 'Residency Road', 'Kudi Bhagtasani', 'Chhoti Khatu'], geo: { lat: '26.2389', lng: '73.0243' } },
  { name: 'Udaipur', state: 'Rajasthan', tier: 'semi-urban', population: '0.6 million', knownFor: 'the City of Lakes, a major tourism destination in Rajasthan', nearbyAreas: ['Fatehpura', 'Hiran Magri', 'Sector 14', 'Ambamata', 'Sukhadia Circle', 'Bhuwana', 'Chetak Circle', 'Rangwasa', 'City Palace Road', 'Surajpole', 'Savina', 'Bhatt Ji Ki Bari', 'Titardi', 'Sector 11'], geo: { lat: '24.5854', lng: '73.7125' } },
  { name: 'Lucknow', state: 'Uttar Pradesh', tier: 'metro', population: '3.6 million', knownFor: 'the City of Nawabs and capital of Uttar Pradesh, known for its culture and cuisine', nearbyAreas: ['Gomti Nagar', 'Hazratganj', 'Aliganj', 'Indira Nagar', 'Alambagh', 'Mahanagar', 'Chowk', 'Vikas Nagar', 'Aashiyana', 'Jankipuram', 'Rajajipuram', 'Vibhuti Khand', 'Sushant Golf City', 'Kapoorthala'], geo: { lat: '26.8467', lng: '80.9462' } },
  { name: 'Kanpur', state: 'Uttar Pradesh', tier: 'urban', population: '2.9 million', knownFor: 'the industrial and leather manufacturing hub of Uttar Pradesh', nearbyAreas: ['Swaroop Nagar', 'Kakadeo', 'Civil Lines', 'Kalyanpur', 'Govind Nagar', 'Arya Nagar', 'Rawatpur', 'Panki', 'Kidwai Nagar', 'Naubasta', 'Barra', 'Vikas Nagar', 'Shastri Nagar', 'Yashoda Nagar'], geo: { lat: '26.4499', lng: '80.3319' } },
  { name: 'Varanasi', state: 'Uttar Pradesh', tier: 'semi-urban', population: '1.4 million', knownFor: 'one of the oldest continuously inhabited cities and a major spiritual center on the Ganges', nearbyAreas: ['Lanka', 'Sigra', 'Cantonment', 'Bhelupur', 'Assi Ghat', 'Mahmoorganj', 'Sarnath', 'Godowlia', 'Lahurabir', 'Chetganj', 'Nadesar', 'Shivpurwa', 'Manduadih', 'BHU Area'], geo: { lat: '25.3176', lng: '82.9739' } },
  { name: 'Patna', state: 'Bihar', tier: 'metro', population: '2.5 million', knownFor: 'the capital of Bihar and one of the oldest continuously inhabited cities in the world', nearbyAreas: ['Boring Road', 'Kankarbagh', 'Patliputra', 'Rajendra Nagar', 'Bailey Road', 'Kurji', 'Danapur', 'Fraser Road', 'Ashiana Nagar', 'Anisabad', 'Digha', 'Gandhi Maidan', 'Phulwari Sharif', 'Punaichak'], geo: { lat: '25.5941', lng: '85.1376' } },
  { name: 'Gaya', state: 'Bihar', tier: 'semi-urban', population: '0.5 million', knownFor: 'a major pilgrimage city known for Bodh Gaya and Buddhist heritage', nearbyAreas: ['Civil Lines', 'AP Colony', 'Rampur', 'Chandauti', 'Buniyadganj', 'Sherghati Road', 'Delha', 'Bodh Gaya Road', 'Manpur', 'Station Road', 'Kashinath Nagar', 'Kadwadih', 'Ramna', 'Pachhati'], geo: { lat: '24.7955', lng: '84.9994' } },
  { name: 'Kolkata', state: 'West Bengal', tier: 'metro', population: '14.9 million', knownFor: 'the cultural capital of India and a major historic port city', nearbyAreas: ['Salt Lake', 'Park Street', 'Ballygunge', 'Howrah', 'New Town', 'Behala', 'Garia', 'Dum Dum', 'Alipore', 'Jadavpur', 'Tollygunge', 'Rajarhat', 'Gariahat', 'Shyambazar'], geo: { lat: '22.5726', lng: '88.3639' } },
  { name: 'Siliguri', state: 'West Bengal', tier: 'semi-urban', population: '0.7 million', knownFor: 'the gateway to Northeast India and Darjeeling hills', nearbyAreas: ['Sevoke Road', 'Hill Cart Road', 'Matigara', 'Pradhan Nagar', 'Bagdogra', 'Champasari', 'Sukna', 'Salugara', 'Ashram Para', 'Deshbandhu Para', 'Khalpara', 'Bidhannagar', 'Netaji More', 'Air View More'], geo: { lat: '26.7271', lng: '88.3953' } },
  { name: 'Bhubaneswar', state: 'Odisha', tier: 'metropolitan', population: '1.2 million', knownFor: 'the Temple City of India and capital of Odisha', nearbyAreas: ['Saheed Nagar', 'Chandrasekharpur', 'Patia', 'Jaydev Vihar', 'Nayapalli', 'Khandagiri', 'Old Town', 'Bomikhal', 'Rasulgarh', 'Kalinga Nagar', 'Sailashree Vihar', 'Vani Vihar', 'Baramunda', 'Damana'], geo: { lat: '20.2961', lng: '85.8245' } },
  { name: 'Chandigarh', state: 'Chandigarh', tier: 'metropolitan', population: '1.2 million', knownFor: "India's first planned city, jointly serving as capital of Punjab and Haryana", nearbyAreas: ['Sector 17', 'Sector 22', 'Sector 35', 'Sector 43', 'Manimajra', 'Sector 8', 'Sector 15', 'Sector 21', 'Industrial Area', 'Sector 40', 'Sector 45', 'Sector 9', 'Panchkula Extension', 'Sector 26'], geo: { lat: '30.7333', lng: '76.7794' } },
  { name: 'Ludhiana', state: 'Punjab', tier: 'urban', population: '1.8 million', knownFor: "Punjab's largest city and a major industrial and manufacturing hub", nearbyAreas: ['Model Town', 'Sarabha Nagar', 'Civil Lines', 'Ferozepur Road', 'Dugri', 'Pakhowal Road', 'Gill Road', 'BRS Nagar', 'Rajguru Nagar', 'Haibowal', 'Jamalpur', 'Sherpur', 'Focal Point', 'Ghumar Mandi'], geo: { lat: '30.9010', lng: '75.8573' } },
  { name: 'Amritsar', state: 'Punjab', tier: 'semi-urban', population: '1.2 million', knownFor: 'home to the Golden Temple and a major spiritual and border trade hub', nearbyAreas: ['Ranjit Avenue', 'Lawrence Road', 'Court Road', 'Mall Road', 'Batala Road', 'Green Avenue', 'Majitha Road', 'Chheharta', 'Putlighar', 'Gopal Nagar', 'Green Avenue', 'Fatehgarh Churian Road', 'Cantt', 'Golden Avenue'], geo: { lat: '31.6340', lng: '74.8723' } },
  { name: 'Gurugram', state: 'Haryana', tier: 'metro', population: '1.2 million', knownFor: 'a major IT, finance, and corporate hub in the National Capital Region', nearbyAreas: ['DLF Phase 1', 'Sohna Road', 'Golf Course Road', 'Sector 29', 'MG Road', 'Cyber City', 'Sushant Lok', 'Sector 56', 'Palam Vihar', 'Sector 14', 'Udyog Vihar', 'South City', 'Sector 49', 'New Colony'], geo: { lat: '28.4595', lng: '77.0266' } },
  { name: 'Faridabad', state: 'Haryana', tier: 'urban', population: '1.4 million', knownFor: 'a major industrial city in the National Capital Region', nearbyAreas: ['Sector 15', 'NIT', 'Ballabgarh', 'Sector 21', 'Old Faridabad', 'Sector 37', 'Neelam Chowk', 'Sector 46', 'Greenfield Colony', 'Sector 16', 'Ajronda', 'Sector 28', 'Badkhal', 'Sector 31'], geo: { lat: '28.4089', lng: '77.3178' } },
  { name: 'Kochi', state: 'Kerala', tier: 'metropolitan', population: '2.1 million', knownFor: 'the Queen of the Arabian Sea and a major port and commercial hub of Kerala', nearbyAreas: ['Kakkanad', 'Edappally', 'Vyttila', 'Kadavanthra', 'Fort Kochi', 'Panampilly Nagar', 'Palarivattom', 'Marine Drive', 'Thrikkakara', 'Kaloor', 'Aluva', 'Thevara', 'Mattancherry', 'Elamkulam'], geo: { lat: '9.9312', lng: '76.2673' } },
  { name: 'Thiruvananthapuram', state: 'Kerala', tier: 'urban', population: '1.7 million', knownFor: 'the capital of Kerala, known for its beaches and IT sector', nearbyAreas: ['Kowdiar', 'Pattom', 'Vazhuthacaud', 'Kazhakkoottam', 'Sasthamangalam', 'Ulloor', 'Kesavadasapuram', 'Vellayambalam', 'Peroorkada', 'Thampanoor', 'Nemom', 'Kudappanakunnu', 'Kaimanam', 'Poojappura'], geo: { lat: '8.5241', lng: '76.9366' } },
  { name: 'Kozhikode', state: 'Kerala', tier: 'semi-urban', population: '0.6 million', knownFor: 'a historic spice trading port city, also known as Calicut', nearbyAreas: ['Mananchira', 'Nadakkavu', 'West Hill', 'Eranhipalam', 'Kovoor', 'Chevayur', 'Mavoor Road', 'Palayam', 'Cherooty Road', 'Puthiyara', 'Kallai', 'Medical College', 'Ramanattukara', 'Beypore'], geo: { lat: '11.2588', lng: '75.7804' } },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', tier: 'metropolitan', population: '2.2 million', knownFor: 'a major port city and industrial hub on the east coast', nearbyAreas: ['MVP Colony', 'Dwaraka Nagar', 'Gajuwaka', 'Madhurawada', 'Seethammadhara', 'Rushikonda', 'Pendurthi', 'Akkayyapalem', 'Siripuram', 'Beach Road', 'PM Palem', 'Marripalem', 'Old Gajuwaka', 'Isukathota'], geo: { lat: '17.6868', lng: '83.2185' } },
  { name: 'Vijayawada', state: 'Andhra Pradesh', tier: 'urban', population: '1.5 million', knownFor: 'a major commercial and business hub of Andhra Pradesh on the Krishna river', nearbyAreas: ['Benz Circle', 'Governorpet', 'Labbipet', 'Auto Nagar', 'Patamata', 'Vidyadharapuram', 'Bhavanipuram', 'Gunadala', 'Ramavarappadu', 'Poranki', 'Krishna Lanka', 'Suryaraopet', 'Machavaram', 'Gollapudi'], geo: { lat: '16.5062', lng: '80.6480' } },
  { name: 'Guwahati', state: 'Assam', tier: 'metropolitan', population: '1.1 million', knownFor: 'the gateway to Northeast India, on the banks of the Brahmaputra', nearbyAreas: ['Ganeshguri', 'Zoo Road', 'Beltola', 'Dispur', 'Paltan Bazaar', 'Chandmari', 'Six Mile', 'Guwahati Club', 'Bhangagarh', 'Hatigaon', 'Basistha', 'Maligaon', 'Fancy Bazaar', 'Rukminigaon'], geo: { lat: '26.1445', lng: '91.7362' } },
  { name: 'Ranchi', state: 'Jharkhand', tier: 'urban', population: '1.1 million', knownFor: 'the capital of Jharkhand, known as the City of Waterfalls', nearbyAreas: ['Lalpur', 'Harmu', 'Doranda', 'Kanke Road', 'Ashok Nagar', 'Hinoo', 'Bariatu', 'Circular Road', 'Kokar', 'Booty More', 'Ratu Road', 'Morabadi', 'Argora', 'Chutia'], geo: { lat: '23.3441', lng: '85.3096' } },
  { name: 'Raipur', state: 'Chhattisgarh', tier: 'urban', population: '1.1 million', knownFor: 'the capital of Chhattisgarh and a growing steel and commercial hub', nearbyAreas: ['Shankar Nagar', 'Civil Lines', 'Telibandha', 'Pandri', 'Devendra Nagar', 'Amanaka', 'Tatibandh', 'Vidhan Sabha Road', 'Byron Bazaar', 'Samta Colony', 'Kota', 'Mowa', 'Shailendra Nagar', 'Gudhiyari'], geo: { lat: '21.2514', lng: '81.6296' } },
  { name: 'Dehradun', state: 'Uttarakhand', tier: 'semi-urban', population: '0.7 million', knownFor: 'the capital of Uttarakhand, known for its educational institutions and scenic location', nearbyAreas: ['Rajpur Road', 'Clock Tower', 'Race Course', 'Dalanwala', 'Prem Nagar', 'Vasant Vihar', 'Chakrata Road', 'Ballupur', 'Malsi', 'Sahastradhara Road', 'Nehru Colony', 'GMS Road', 'Clement Town', 'Jakhan'], geo: { lat: '30.3165', lng: '78.0322' } },
  { name: 'Shimla', state: 'Himachal Pradesh', tier: 'semi-urban', population: '0.2 million', knownFor: 'the capital of Himachal Pradesh, a major hill station and tourism destination', nearbyAreas: ['Mall Road', 'Sanjauli', 'Lakkar Bazaar', 'Chotta Shimla', 'Summer Hill', 'Kasumpti', 'New Shimla', 'Boileauganj', 'Tutikandi', 'Khalini', 'Vikasnagar', 'Totu', 'Dhalli', 'Panthaghati'], geo: { lat: '31.1048', lng: '77.1734' } },
  { name: 'Panaji', state: 'Goa', tier: 'semi-urban', population: '0.1 million', knownFor: 'the capital of Goa, known for its Portuguese heritage and beaches', nearbyAreas: ['Miramar', 'Dona Paula', 'Altinho', 'Campal', 'Fontainhas', 'Caranzalem', 'Taleigao', 'St. Inez', 'Ribandar', 'Bambolim', 'Porvorim', 'Merces', 'Panjim Market', 'Santa Cruz'], geo: { lat: '15.4909', lng: '73.8278' } },];

export const cities: CityData[] = cityConfigs.map((c) => {
  const slug = c.name.toLowerCase().replace(/\s+/g, '-');
  return {
    slug,
    name: c.name,
    state: c.state,
    tier: c.tier,
    seoTitle: `${c.name} Appliance Service | AC, Washing Machine & Refrigerator | VATTAMS`,
    metaDescription: `Book AC, washing machine and refrigerator service in ${c.name} with VATTAMS. Check appointment availability and request doorstep appliance care.`,
    h1: `Appliance Service in ${c.name} — AC, Washing Machine & Refrigerator`,
    tagline: `Trusted home appliance repair and maintenance services across ${c.name}`,
    intro: `VATTAMS focuses on AC, washing machine and refrigerator service in ${c.name}. Request doorstep appliance care and check available appointment times online.`,
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