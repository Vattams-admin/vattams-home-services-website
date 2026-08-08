import { useState, useRef, useEffect } from 'react';
import { MessageSquareText, X, Send, Sparkles } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase, ServicePrice } from '@/lib/supabase';
import { formatINR } from '@/lib/pricing';
import { SERVICE_CATEGORIES, cities } from '@/lib/cities';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME: ChatMessage = {
  role: 'assistant',
  content: "Hi! I'm the VATTAMS Assistant. Ask me about our services, pricing, coverage areas, warranty, or how booking works.",
};

const SUGGESTIONS = [
  'What services do you offer?',
  'How much does AC repair cost?',
  'Do you operate in my city?',
  'How do I book a service?',
];

const FALLBACK =
  "I'm not fully sure about that one — for anything specific, our support team can help directly. Call +91 81898 00757 or WhatsApp us, or use the buttons below.";

// Rule-based intent matcher — no external AI/LLM, no API cost, works fully offline-capable.
function buildReply(userText: string, prices: Record<string, ServicePrice>): string {
  const t = userText.toLowerCase();

  const has = (...words: string[]) => words.some((w) => t.includes(w));

  if (has('hi', 'hello', 'hey', 'good morning', 'good evening')) {
    return "Hello! How can I help you today — services, pricing, booking, or coverage area?";
  }

  if (has('service', 'what do you offer', 'what services')) {
    return `We offer: ${SERVICE_CATEGORIES.join(', ')}. Which one are you interested in?`;
  }

  if (has('price', 'cost', 'charge', 'fee', 'how much')) {
    const match = SERVICE_CATEGORIES.find((s) => t.includes(s.toLowerCase().split(' ')[0]));
    if (match && prices[match]) {
      const p = prices[match];
      return `${match} starts from ${formatINR(p.base_price)} (+${p.gst_rate}% GST). Final price depends on the issue and parts needed — you'll see the full breakdown before confirming your booking.`;
    }
    const anyPrice = Object.values(prices)[0];
    return anyPrice
      ? `Prices vary by service, starting around ${formatINR(anyPrice.base_price)}. Open the Booking page and select a service to see exact live pricing with GST breakdown.`
      : `Pricing depends on the service — please check the Booking page for live rates.`;
  }

  if (has('city', 'cities', 'area', 'location', 'operate', 'available in', 'cover')) {
    const sample = cities.slice(0, 8).map((c) => c.name).join(', ');
    return `We currently serve ${sample} and more — expanding to new cities regularly. Check the Booking page to see if we're live in your city yet.`;
  }

  if (has('book', 'booking', 'schedule', 'appointment')) {
    return `Booking takes under 2 minutes: tap "Book Service", enter your details and issue, pick a time slot, and confirm. You'll get a booking number to track it.`;
  }

  if (has('warranty', 'guarantee')) {
    return `Every repair comes with a 30-day service warranty. If the same issue happens again within 30 days, we fix it free.`;
  }

  if (has('payment', 'pay', 'upi', 'cash')) {
    return `You can pay via UPI, cash, or online — payment is collected after the service is completed. You'll get a digital invoice with GST breakdown.`;
  }

  if (has('technician', 'verified', 'background', 'trust', 'safe')) {
    return `All VATTAMS technicians are background-verified, ID-checked, and skill-assessed before they can accept jobs. Job start and completion are OTP-verified for your safety.`;
  }

  if (has('same day', 'urgent', 'emergency', 'today', 'fast')) {
    return `Yes — same-day service is available for most bookings made before 2 PM. Emergency electrical/plumbing issues get priority dispatch.`;
  }

  if (has('support', 'contact', 'phone', 'call', 'whatsapp', 'help')) {
    return `Reach us anytime: call +91 81898 00757, or WhatsApp us — both linked in the buttons below.`;
  }

  if (has('technician job', 'join as', 'work with you', 'become a technician', 'hiring')) {
    return `We're hiring technicians across India! Tap "Join as a Technician" in the menu to register — it's free and takes about 5 minutes.`;
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
  const [prices, setPrices] = useState<Record<string, ServicePrice>>({});
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from('service_prices')
      .select('*')
      .eq('is_active', true)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, ServicePrice> = {};
        (data as ServicePrice[]).forEach((p) => { map[p.service_name] = p; });
        setPrices(map);
      });
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