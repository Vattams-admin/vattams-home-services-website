import { useState, useRef, useEffect } from 'react';
import { MessageSquareText, X, Send, Sparkles } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { formatINR } from '@/lib/pricing';
import { cities } from '@/lib/cities';

interface CustomerServicePrice {
  service_category: string;
  service_type: string;
  base_price: number;
  price_label: string;
  is_active: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME: ChatMessage = {
  role: 'assistant',
  content: "Hi! I'm the VATTAMS Assistant. Ask me about our services, pricing, appointment availability, or how booking works.",
};

const SUGGESTIONS = [
  'What services do you offer?',
  'How much does AC repair cost?',
  'Do you operate in my city?',
  'How do I book a service?',
];

const FALLBACK =
  "I'm not fully sure about that one — for anything specific, our support team can help directly. Call +91 63740 68296 or WhatsApp us, or use the buttons below.";

// Rule-based intent matcher — no external AI/LLM, no API cost, works fully offline-capable.
function buildReply(userText: string, prices: CustomerServicePrice[]): string {
  const t = userText.toLowerCase();

  const has = (...words: string[]) => words.some((w) => t.includes(w));

  if (has('hi', 'hello', 'hey', 'good morning', 'good evening')) {
    return "Hello! How can I help you today — services, pricing, booking, or coverage area?";
  }

  if (has('service', 'what do you offer', 'what services')) {
    const activeServices = Object.keys(prices);
    if (activeServices.length > 0) {
      return `We focus on three services: AC service, washing machine service and refrigerator service. Which one are you interested in?`;
    }
    return `We focus on AC service, washing machine service and refrigerator service. Which one are you interested in?`;
  }

  if (has('price', 'cost', 'charge', 'fee', 'how much')) {
    const requested = [
      { type: 'Gas Filling', words: ['gas filling', 'gas refill', 'refrigerant'] },
      { type: 'Coil Service', words: ['coil service', 'coil cleaning', 'coil'] },
      { type: 'Pump Water Service', words: ['pump water', 'water pump', 'pump service'] },
      { type: 'Installation', words: ['installation', 'install', 'fitting'] },
      { type: 'General Service', words: ['general service', 'ac service', 'ac repair', 'air conditioner'] },
      { type: 'Washing Machine Service', words: ['washing machine', 'washer'] },
      { type: 'Refrigerator Service', words: ['refrigerator', 'fridge'] },
    ].find((item) => item.words.some((word) => t.includes(word)));
    const matched = requested ? prices.find((price) => price.service_type === requested.type) : undefined;
    if (matched) {
      return `${matched.service_type} has a listed base price of ${formatINR(Number(matched.base_price))}. Applicable GST and platform fees are shown at checkout. Parts or extra work are quoted separately for approval.`;
    }
    const minimum = (category: string) => {
      const values = prices.filter((price) => price.service_category === category);
      return values.length ? Math.min(...values.map((price) => Number(price.base_price))) : null;
    };
    const ac = minimum('AC Service');
    const washing = minimum('Washing Machine');
    const refrigerator = minimum('Refrigerator');
    const summary = [
      ac !== null ? `AC from ${formatINR(ac)}` : null,
      washing !== null ? `washing machine from ${formatINR(washing)}` : null,
      refrigerator !== null ? `refrigerator from ${formatINR(refrigerator)}` : null,
    ].filter(Boolean).join('; ');
    return summary
      ? `Current listed base prices: ${summary}. Applicable GST and platform fees are shown at checkout. Open Service Prices for the exact job type.`
      : `Current prices are temporarily unavailable. Open the Services page or contact VATTAMS to check the latest listed rates.`;
  }

  if (has('city', 'cities', 'area', 'location', 'operate', 'available in', 'cover')) {
    const currentCities = cities.filter((city) => city.isCurrentlyServed).map((city) => city.name);
    return `Current active technician coverage is recorded in ${currentCities.join(' and ')}. Appointment availability still depends on your address, job type and technician schedule. Check the Booking page for your location.`;
  }

  if (has('book', 'booking', 'schedule', 'appointment')) {
    return `Tap Book Service, select the appliance and exact job type, enter your address and preferred time, then review the price breakdown before submitting. You'll receive a booking number if the request succeeds.`;
  }

  if (has('warranty', 'guarantee')) {
    return `Warranty terms can vary by job and are not guaranteed for every service. Please ask support or the assigned technician for the applicable terms before approving the work.`;
  }

  if (has('payment', 'pay', 'upi', 'cash')) {
    return `Please review the payment options and total shown in the booking or checkout flow. Applicable GST and platform fees are shown in the price breakdown before you confirm.`;
  }

  if (has('technician', 'verified', 'background', 'trust', 'safe')) {
    return `Check the assigned technician and booking details in your account. The supported job workflow uses OTP verification at job checkpoints; contact support if you need help confirming an assignment.`;
  }

  if (has('same day', 'urgent', 'emergency', 'today', 'fast')) {
    return `Appointment availability varies by address, job type and technician schedule. Please check the Booking page for the current options available for your request.`;
  }

  if (has('support', 'contact', 'phone', 'call', 'whatsapp', 'help')) {
    return `Call or WhatsApp VATTAMS at +91 63740 68296 using the contact buttons below, or visit the Contact page for support options.`;
  }

  if (has('technician job', 'join as', 'work with you', 'become a technician', 'hiring')) {
    return `Interested in joining as a technician? Open Join as a Technician to review the current eligibility and registration terms. Job availability depends on your service area and demand.`;
  }

  if (has('thank', 'thanks', 'ok', 'okay', 'great')) {
    return `You're welcome! Anything else I can help with?`;
  }

  return FALLBACK;
}

export default function AIChatWidget() {
  const { navigate } = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [prices, setPrices] = useState<CustomerServicePrice[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from('customer_service_prices')
      .select('service_category,service_type,base_price,price_label,is_active')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) setPrices(data as CustomerServicePrice[]);
      });
  }, []);

  useEffect(() => {
    const openHandler = () => setOpen(true);
    window.addEventListener('vattams:open-chat', openHandler);
    return () => window.removeEventListener('vattams:open-chat', openHandler);
  }, []);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = (text?: string) => {
    const userText = (text ?? input).trim();
    if (!userText) return;

    const reply = buildReply(userText, prices);
    setMessages((prev) => [...prev, { role: 'user', content: userText }, { role: 'assistant', content: reply }]);
    setInput('');
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-2xl shadow-blue-900/30 flex items-center justify-center transition-transform hover:scale-105"
        aria-label="Open chat assistant"
      >
        {open ? <X size={24} /> : <MessageSquareText size={24} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[90vw] max-w-sm h-[70vh] max-h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3.5 bg-blue-600 text-white shrink-0">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="font-bold text-sm">VATTAMS Assistant</div>
              <div className="text-blue-100 text-xs">Usually replies instantly</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={'flex ' + (m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={
                    'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line ' +
                    (m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm')
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Suggestions (only before first user message) */}
          {messages.length === 1 && (
            <div className="px-3 py-2 border-t border-gray-100 shrink-0">
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="px-2.5 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick action */}
          <div className="px-3 pt-2 shrink-0">
            <button
              onClick={() => { setOpen(false); navigate('booking'); }}
              className="w-full text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg py-2 transition-colors"
            >
              Book a Service Now →
            </button>
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 flex gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
              placeholder="Ask a question..."
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim()}
              className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl transition-colors"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}