import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Send, Sparkles } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { getAssistantResponse, type AIAssistantState } from '@/lib/aiAssistant';

const INITIAL_STATE: AIAssistantState = {
  step: 'initial',
  extracted: {},
  messages: [
    { role: 'assistant', content: "Hi! I'm your VATTAMS AI Assistant. Tell me what appliance issue you're facing and I'll help you prepare a booking. For example: 'My AC is not cooling' or 'My washing machine won't spin'." },
  ],
};

const SUGGESTIONS = [
  'My AC is not cooling',
  'My refrigerator is not working',
  'Need AC gas filling',
  'My washing machine is making noise',
  'Need AC installation',
  'My washing machine is making noise',
];

export default function AIAssistant() {
  const { navigate } = useRouter();
  const [state, setState] = useState<AIAssistantState>(INITIAL_STATE);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  const handleSend = (text?: string) => {
    const userText = (text ?? input).trim();
    if (!userText || state.step === 'done') return;

    const { reply, newState } = getAssistantResponse(state, userText);
    setState(newState);
    setInput('');

    if (newState.step === 'done') {
      // The assistant prepares a draft only. Customers review the exact job
      // type, address, and current customer price on the booking form.
      sessionStorage.setItem('vattams_ai_booking_draft', JSON.stringify({
        service_category: newState.extracted.service,
        problem_description: newState.extracted.problem,
        city: newState.extracted.location,
        preferred_time: newState.extracted.preferredTime,
        urgency: newState.extracted.urgency,
      }));
    }
  };

  const reset = () => {
    sessionStorage.removeItem('vattams_ai_booking_draft');
    setState(INITIAL_STATE);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
            <Sparkles className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">AI Booking Assistant</h1>
            <p className="text-sm text-gray-500">Describe your problem — we'll handle the rest</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="h-96 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {state.messages.map((msg, i) => (
            <div key={i} className={'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ' +
                (msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm')}>
                {msg.content}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {state.step === 'initial' && state.messages.length === 1 && (
          <div className="px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => handleSend(s)}
                  className="px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {state.step === 'done' && (
          <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => navigate('booking')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0b1f3a] px-5 py-3 text-sm font-bold text-white hover:bg-[#17365b]"
            >
              Continue to booking <ArrowRight size={16} />
            </button>
            <button onClick={reset} className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Start over
            </button>
          </div>
        )}

        {state.step !== 'done' && (
          <div className="p-4 border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              disabled={creating}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || creating}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="mt-6">
        <CommunicationCenter variant="full" />
      </div>
    </div>
  );
}
