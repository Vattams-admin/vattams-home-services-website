import { supabase } from './supabase';

export interface AIConversation {
  id: string;
  session_id: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  extracted_data: Record<string, unknown>;
  status: string;
}

export interface ExtractedBookingData {
  service?: string;
  category?: string;
  problem?: string;
  location?: string;
  preferredTime?: string;
  urgency?: 'low' | 'normal' | 'high' | 'emergency';
}

const SERVICE_KEYWORDS: Record<string, string[]> = {
  'AC Repair': ['ac', 'air conditioner', 'air conditioning', 'aircon', 'split ac', 'window ac'],
  'Washing Machine Repair': ['washing machine', 'washer', 'spin cycle', 'washer drum'],
  'Refrigerator Repair': ['fridge', 'refrigerator', 'freezer', 'fridge cooling'],
};

const URGENCY_KEYWORDS: Record<string, string[]> = {
  'emergency': ['emergency', 'urgent', 'asap', 'immediately', 'critical', 'fire', 'flood', 'short circuit'],
  'high': ['important', 'soon', 'today', 'quickly', 'fast'],
  'low': ['whenever', 'no rush', 'convenient', 'flexible'],
};

export function detectService(userInput: string): string | null {
  const lower = userInput.toLowerCase();
  for (const [service, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return service;
    }
  }
  return null;
}

export function detectUrgency(userInput: string): 'low' | 'normal' | 'high' | 'emergency' {
  const lower = userInput.toLowerCase();
  for (const [level, keywords] of Object.entries(URGENCY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return level as 'low' | 'normal' | 'high' | 'emergency';
    }
  }
  return 'normal';
}

export function detectProblem(userInput: string, service: string | null): string {
  const lower = userInput.toLowerCase();
  if (service && lower.includes(service.toLowerCase())) {
    const afterService = lower.split(service.toLowerCase())[1] ?? '';
    if (afterService.trim()) return afterService.trim().replace(/^(is|has|the|a|an)\s+/, '').trim();
  }
  return userInput.trim();
}

export interface AIAssistantState {
  step: 'initial' | 'ask_location' | 'ask_time' | 'confirm' | 'done';
  extracted: ExtractedBookingData;
  messages: { role: 'user' | 'assistant'; content: string }[];
}

export function getAssistantResponse(
  state: AIAssistantState,
  userInput: string,
): { reply: string; newState: AIAssistantState } {
  const messages = [...state.messages, { role: 'user' as const, content: userInput }];
  const extracted = { ...state.extracted };
  let step = state.step;
  let reply = '';

  if (step === 'initial') {
    const service = detectService(userInput);
    const urgency = detectUrgency(userInput);
    if (service) {
      extracted.service = service;
      extracted.category = service;
      extracted.problem = detectProblem(userInput, service);
      extracted.urgency = urgency;
      step = 'ask_location';
      reply = `I see you need help with ${service}. I've noted the issue: "${extracted.problem}". Could you please share your city or area so I can find the nearest technician?`;
    } else {
      reply = "I'd be happy to help you book a service! Could you describe the appliance issue? For example: 'My AC is not cooling', 'My washing machine won't spin', or 'My refrigerator is not cold'.";
    }
  } else if (step === 'ask_location') {
    extracted.location = userInput.trim();
    extracted.urgency = extracted.urgency ?? 'normal';
    step = 'ask_time';
    reply = `Got it, ${userInput.trim()}. When would you prefer the technician to visit? You can say things like 'today evening', 'tomorrow morning', or a specific date/time.`;
  } else if (step === 'ask_time') {
    extracted.preferredTime = userInput.trim();
    step = 'confirm';
    reply = `Here's a summary of your booking request:\n\n• Service: ${extracted.service}\n• Problem: ${extracted.problem}\n• Location: ${extracted.location}\n• Preferred Time: ${extracted.preferredTime}\n• Urgency: ${extracted.urgency}\n\nWould you like to continue to the Booking page to submit this request? Reply "yes" to confirm or "no" to start over.`;
  } else if (step === 'confirm') {
    if (userInput.toLowerCase().includes('yes') || userInput.toLowerCase().includes('confirm')) {
      step = 'done';
      reply = 'Your appliance-service request is ready to submit. Please open the Booking page to confirm the service details and create your booking.';
    } else {
      step = 'initial';
      extracted.service = undefined;
      extracted.category = undefined;
      extracted.problem = undefined;
      extracted.location = undefined;
      extracted.preferredTime = undefined;
      extracted.urgency = undefined;
      reply = "Let's start over. What issue are you facing?";
    }
  }

  return {
    reply,
    newState: { step, extracted, messages: [...messages, { role: 'assistant', content: reply }] },
  };
}

export async function saveConversation(sessionId: string, state: AIAssistantState, customerId?: string) {
  return supabase.from('ai_conversations').insert({
    session_id: sessionId,
    customer_id: customerId ?? null,
    messages: state.messages,
    extracted_data: state.extracted,
    status: state.step === 'done' ? 'completed' : 'active',
  });
}
