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
      q: `How do I book appliance service in ${cityName} with VATTAMS?`,
      a: `Choose Book Now, select your appliance category and job type, enter your service address in ${cityName}, and choose from the appointment options shown. Availability is confirmed through the booking flow.`,
    },
    {
      q: `Which appliance services can I request in ${cityName}?`,
      a: `VATTAMS accepts requests for AC general service, installation, gas filling, pump water service and coil service, plus washing machine and refrigerator service. The exact options shown during booking determine what you can request.`,
    },
    {
      q: `How much does appliance service cost in ${cityName}?`,
      a: `View the current listed base prices on the Services page. The checkout displays the applicable GST and platform fee before you confirm. Any parts or additional work should be quoted separately for your approval.`,
    },
    {
      q: `Is service available at my address in ${cityName}?`,
      a: `Enter your address and preferred time in the booking form to check the available appointment options. Availability can vary by neighbourhood, job type and technician schedule.`,
    },
    {
      q: `Can I book same-day appliance service in ${cityName}?`,
      a: `Same-day appointments depend on technician availability. Check the date and time options shown during booking for the latest availability at your address.`,
    },
    {
      q: `Will I know the price before extra work is started?`,
      a: `The website lists base prices for supported job types and shows applicable checkout charges. Parts and additional work are separate; ask for a quote and approve it before the extra work begins.`,
    },
    {
      q: `How can I follow my booking after I submit it?`,
      a: `Use the booking details and customer account features available on VATTAMS to follow status updates. For help, contact the support team using the contact options on the website.`,
    },
  ];
}

function generateTestimonials(_cityName: string, _areas: string[]): { name: string; area: string; rating: number; text: string }[] {
  // Never invent customer identities, ratings or testimonials for SEO pages.
  // The section remains data-driven and can be populated from approved real reviews later.
  return [];
}

function generateContentSections(cityName: string, _knownFor: string, _population: string): { heading: string; body: string }[] {
  return [
    {
      heading: `Appliance Service in ${cityName}`,
      body: `VATTAMS Home Services lets residents in ${cityName} request doorstep service for air conditioners, washing machines and refrigerators. Select the appliance and describe the issue to check the appointment options currently available for your address.`,
    },
    {
      heading: `AC Service and Repair in ${cityName}`,
      body: `For AC service in ${cityName}, available job types include general service, installation, gas filling, pump water service and coil service. Choose the exact job type in the booking form so the request can be routed correctly. Final diagnosis and any extra parts or work should be discussed before additional charges are approved.`,
    },
    {
      heading: `Washing Machine Service in ${cityName}`,
      body: `Residents of ${cityName} can submit washing machine service requests through VATTAMS. Describe the symptoms—such as drainage, spinning, noise or starting issues—and select an available appointment. Parts and repair work beyond the listed service are quoted separately.`,
    },
    {
      heading: `Refrigerator Service in ${cityName}`,
      body: `Use VATTAMS to request refrigerator service in ${cityName} for cooling problems, unusual noises, leaks or other appliance issues. Provide a clear description and check appointment availability for your address. A technician may need to inspect the appliance before confirming any additional repair cost.`,
    },
    {
      heading: `Service Pricing in ${cityName}`,
      body: `VATTAMS publishes base prices for supported appliance job types on its Services page. Applicable GST and the platform fee are displayed in the checkout breakdown. If diagnosis reveals parts or additional work are needed, request a separate quote and approve it before proceeding.`,
    },
    {
      heading: `How to Book Appliance Service in ${cityName}`,
      body: `Start from the booking page, select AC, washing machine or refrigerator, choose the specific job type where available, enter your address and preferred time, and submit the request. Appointment options depend on local technician availability and the selected work.`,
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