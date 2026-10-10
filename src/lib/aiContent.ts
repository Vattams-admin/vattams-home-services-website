import { adminData } from './adminData';

export interface ContentDraft {
  id: string;
  content_type: string;
  title: string;
  caption: string | null;
  hashtags: string[] | null;
  voice_over_script: string | null;
  video_script: string | null;
  thumbnail_text: string | null;
  poster_text: string | null;
  body_content: string | null;
  meta_description: string | null;
  target_keywords: string[] | null;
  status: string;
  platform_url: string | null;
  created_at: string;
}

const SERVICE_HASHTAGS: Record<string, string[]> = {
  'AC Service': ['#ACService', '#ACRepair', '#ApplianceCare', '#VATTAMS'],
  'AC Repair': ['#ACService', '#ACRepair', '#ApplianceCare', '#VATTAMS'],
  'Refrigerator Service': ['#RefrigeratorService', '#FridgeRepair', '#ApplianceCare', '#VATTAMS'],
  'Refrigerator Repair': ['#RefrigeratorService', '#FridgeRepair', '#ApplianceCare', '#VATTAMS'],
  'Washing Machine Service': ['#WashingMachineService', '#WashingMachineRepair', '#ApplianceCare', '#VATTAMS'],
  'Washing Machine Repair': ['#WashingMachineService', '#WashingMachineRepair', '#ApplianceCare', '#VATTAMS'],
};

const COMMON_HASHTAGS = ['#VATTAMS', '#ApplianceCare', '#ACService', '#WashingMachineService', '#RefrigeratorService'];

export function generateSocialContent(
  contentType: string,
  service: string,
  city?: string,
  offer?: string,
): Omit<ContentDraft, 'id' | 'created_at' | 'status' | 'platform_url'> {
  const tags = SERVICE_HASHTAGS[service] ?? COMMON_HASHTAGS;
  const locationTag = city ? ` in ${city}` : '';
  const offerText = offer ? ` Special offer: ${offer}!` : '';

  const captions: Record<string, string> = {
    instagram_reel: `Is your ${service} giving trouble${locationTag}? Watch how our VATTAMS experts fix it in minutes!${offerText} Book now and get same-day service. #ReelItFeelIt`,
    facebook_post: `Need reliable ${service}${locationTag}? VATTAMS brings you certified technicians at your doorstep.${offerText} Book your service today!`,
    youtube_short: `${service} Quick Fix!${offerText} Watch our technician solve a common ${service} problem in under 60 seconds. Subscribe for more home service tips!`,
    linkedin_post: `VATTAMS is focused on professional appliance care with ${service}${locationTag}.${offerText} Our certified technicians ensure quality, safety, and customer satisfaction. Connect with us for B2B service partnerships.`,
    x_post: `Need ${service}${locationTag}? VATTAMS has you covered!${offerText} Book now: https://vattams.net #ApplianceCare`,
  };

  const voiceOverScripts: Record<string, string> = {
    instagram_reel: `[Hook - 3s] Is your ${service} broken again? [Problem - 5s] Don't waste your weekend trying to fix it yourself. [Solution - 7s] VATTAMS certified technicians come to your door, diagnose the issue, and fix it fast. [CTA - 3s] Book now at vattams.net${offerText ? ` ${offerText}` : ''}`,
    youtube_short: `[Intro - 2s] ${service} hack! [Demo - 15s] Here's how our expert handles a ${service} repair step by step. [CTA - 3s] Book your service at vattams.net`,
  };

  const videoScripts: Record<string, string> = {
    instagram_reel: `Scene 1: Customer looking frustrated at broken ${service}\nScene 2: VATTAMS app booking screen\nScene 3: Technician arriving with tools\nScene 4: Quick repair demonstration\nScene 5: Happy customer, VATTAMS logo\nDuration: 30 seconds`,
    youtube_short: `Scene 1: Problem introduction\nScene 2: Tools and parts laid out\nScene 3: Step-by-step fix\nScene 4: Before/after comparison\nScene 5: Call to action with logo\nDuration: 60 seconds`,
  };

  return {
    content_type: contentType,
    title: `${service} ${locationTag ? `- ${city}` : ''} | VATTAMS`,
    caption: captions[contentType] ?? captions.facebook_post,
    hashtags: tags,
    voice_over_script: voiceOverScripts[contentType] ?? null,
    video_script: videoScripts[contentType] ?? null,
    thumbnail_text: `${service} Fix in 60s!`,
    poster_text: `VATTAMS ${service}\n${offer ?? 'Same-Day Service'}\n${city ?? 'Available near you'}`,
    body_content: null,
    meta_description: `Professional ${service} service${locationTag} by VATTAMS. Certified technicians, same-day service, affordable pricing.`,
    target_keywords: [service, 'appliance service', city ?? '', 'VATTAMS', 'repair', 'maintenance'].filter(Boolean),
  };
}

export function generateBlogPost(topic: string, service?: string): Omit<ContentDraft, 'id' | 'created_at' | 'status' | 'platform_url'> {
  const title = topic;
  const intro = `When it comes to ${service ?? 'home maintenance'}, having a reliable service provider can make all the difference. In this guide, we'll walk you through everything you need to know about ${topic.toLowerCase()}.`;
  const sections = [
    `## Why ${topic} Matters\n\nRegular maintenance of your ${service ?? 'home appliances'} ensures longevity, efficiency, and safety. Neglecting small issues can lead to costly repairs down the line.`,
    `## Common Issues\n\nSome of the most frequent problems include unusual noises, reduced efficiency, and complete breakdowns. VATTAMS technicians are trained to diagnose and fix these issues quickly.`,
    `## DIY vs Professional Service\n\nWhile some minor issues can be handled yourself, professional service ensures the job is done right the first time. Our certified technicians use genuine parts and follow safety protocols.`,
    `## Why Choose VATTAMS?\n\n- Certified and background-verified technicians\n- Same-day service available\n- Transparent pricing with no hidden charges\n- Appliance-service warranty details are provided with the booking\n- Contact support for assistance`,
  ];
  const body = `${intro}\n\n${sections.join('\n\n')}\n\n## Conclusion\n\nDon't wait for small problems to become big ones. Book your ${service ?? 'service'} with VATTAMS today and experience hassle-free home maintenance.`;

  return {
    content_type: 'blog_post',
    title,
    caption: null,
    hashtags: null,
    voice_over_script: null,
    video_script: null,
    thumbnail_text: title,
    poster_text: title,
    body_content: body,
    meta_description: `Learn about ${topic.toLowerCase()} and how VATTAMS professional ${service ?? 'home'} services can help.`,
    target_keywords: [topic, service ?? 'appliance care', 'VATTAMS', 'repair', 'guide', 'tips'],
  };
}

export function generateCityPage(city: string, services: string[]): Omit<ContentDraft, 'id' | 'created_at' | 'status' | 'platform_url'> {
  const allowedServices = services.filter((s) => /^(AC (Repair|Service)|Washing Machine( Repair| Service)?|Refrigerator( Repair| Service)?)$/i.test(s));
  const serviceList = allowedServices.map((s) => `- ${s} in ${city}`).join('\n');
  const body = `# Appliance Service in ${city}\n\nVATTAMS focuses on AC, washing machine and refrigerator service in ${city}. Appointment availability depends on local technician coverage.\n\n## Services Available\n\n${serviceList}\n\n## Why Choose VATTAMS in ${city}?\n\n- Local technicians familiar with ${city} neighborhoods\n- Fast response times across ${city}\n- Transparent pricing\n- Quality service guaranteed\n\n## Service Areas in ${city}\n\nWe cover all major areas in ${city}. Book your service today and experience the VATTAMS difference.`;

  return {
    content_type: 'city_page',
    title: `Appliance Service in ${city} | VATTAMS`,
    caption: null,
    hashtags: null,
    voice_over_script: null,
    video_script: null,
    thumbnail_text: `Appliance Service in ${city}`,
    poster_text: `VATTAMS ${city}\nPremium Appliance Care`,
    body_content: body,
    meta_description: `AC, washing machine and refrigerator service in ${city} by VATTAMS. Check appointment availability through the booking page.`,
    target_keywords: [city, 'appliance service', 'VATTAMS', ...allowedServices],
  };
}

export function generateFAQ(service: string): Omit<ContentDraft, 'id' | 'created_at' | 'status' | 'platform_url'> {
  const faqs = [
    { q: `How much does ${service} cost?`, a: `The cost of ${service} depends on the specific issue and parts required. VATTAMS offers transparent pricing with no hidden charges. Contact us for a free estimate.` },
    { q: `How long does ${service} take?`, a: `Most ${service} jobs are completed within 1-2 hours. Complex repairs may take longer, but our technicians work efficiently to minimize disruption.` },
    { q: `Do you offer warranty on ${service}?`, a: `Yes, VATTAMS provides a service warranty on all ${service} repairs. The warranty period varies by service type and parts used.` },
    { q: `Can I book ${service} for same-day?`, a: `Yes! VATTAMS offers same-day ${service} in most areas. Book before 2 PM for same-day service.` },
    { q: `Are your technicians certified?`, a: `All VATTAMS technicians are background-verified, certified, and experienced in ${service} and other home maintenance tasks.` },
  ];

  const body = faqs.map((f) => `### ${f.q}\n\n${f.a}`).join('\n\n');

  return {
    content_type: 'faq',
    title: `${service} FAQ - Frequently Asked Questions | VATTAMS`,
    caption: null,
    hashtags: null,
    voice_over_script: null,
    video_script: null,
    thumbnail_text: `${service} FAQ`,
    poster_text: `${service} FAQ`,
    body_content: body,
    meta_description: `Common questions about ${service} answered by VATTAMS experts. Cost, duration, warranty, and more.`,
    target_keywords: [service, 'FAQ', 'questions', 'VATTAMS', 'service guide'],
  };
}

export function generateOfferPoster(festivalName: string, offer: string, service?: string): Omit<ContentDraft, 'id' | 'created_at' | 'status' | 'platform_url'> {
  return {
    content_type: 'festival_poster',
    title: `${festivalName} Special Offer - VATTAMS`,
    caption: `Celebrate ${festivalName} with VATTAMS! ${offer}${service ? ` on all ${service} bookings` : ''}. Book now and save big!`,
    hashtags: [`#${festivalName.replace(/\s+/g, '')}`, '#VATTAMS', '#FestivalOffer', '#ApplianceCare', '#SpecialDiscount'],
    voice_over_script: null,
    video_script: null,
    thumbnail_text: `${festivalName} Offer!`,
    poster_text: `${festivalName} Special!\n${offer}\n${service ? `${service} - ` : ''}Book Now!\nVATTAMS Home Services`,
    body_content: null,
    meta_description: `${festivalName} special offer from VATTAMS. ${offer} on AC, washing machine or refrigerator service.`,
    target_keywords: [festivalName, 'offer', 'discount', 'VATTAMS', service ?? 'appliance service'],
  };
}

export async function saveContentDraft(draft: Omit<ContentDraft, 'id' | 'created_at' | 'status' | 'platform_url'>) {
  return adminData<{ draft: ContentDraft }>('ai_content_draft_create', { input: draft });
}

export async function fetchContentDrafts(contentType?: string, limit = 50): Promise<ContentDraft[]> {
  try {
    const result = await adminData<{ drafts: ContentDraft[] }>('ai_content_drafts_list', { content_type: contentType, limit });
    return result.drafts ?? [];
  } catch {
    return [];
  }
}

export async function updateContentDraftStatus(id: string, status: string, platformUrl?: string) {
  return adminData<{ draft: ContentDraft }>('ai_content_draft_update', {
    id,
    status,
    platform_url: platformUrl ?? null,
  });
}
