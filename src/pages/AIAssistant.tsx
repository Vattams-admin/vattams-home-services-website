import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, CheckCircle, Loader } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { getAssistantResponse, type AIAssistantState } from '@/lib/aiAssistant';
import CommunicationCenter from '@/components/CommunicationCenter';

const INITIAL_STATE: AIAssistantState = {
  step: 'initial',
  extracted: {},
  messages: [
    { role: 'assistant', content: "Hi! I'm your VATTAMS AI Assistant. Tell me what issue you're facing and I'll help you book a service. For example: 'My AC is not cooling' or 'My kitchen tap is leaking'." },
  ],
};

const SUGGESTIONS = [
  'My AC is not cooling',
  'My refrigerator is not working',
  'Kitchen tap is leaking',
  'My washing machine is making noise',
  'Need electrical wiring fixed',
  'My TV screen is blank',
];

export default function AIAssistant() {
  const { navigate } = useRouter();
  const [state, setState] = useState<AIAssistantState>(INITIAL_STATE);
  const [input, setInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [bookingNumber, setBookingNumber] = useState<string | null>(null);
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
      createBooking(newState.extracted as Record<string, unknown>);
    }
  };

  const createBooking = async (data: Record<string, unknown>) => {
    setCreating(true);
    const sessionId = `ai-${Date.now()}`;
    const customer = sessionStorage.getItem('vattams_customer');
    const customerId = customer ? JSON.parse(customer).id : null;
    const customerName = customer ? JSON.parse(customer).full_name : 'Guest User';
    const customerMobile = customer ? JSON.parse(customer).mobile : '';

    const { data: booking } = await supabase.from('bookings').insert({
      customer_name: customerName,
      mobile_number: customerMobile,
      customer_id: customerId,
      city: (data.location as string) ?? '',
      address: (data.location as string) ?? '',
      service_category: (data.service as string) ?? 'General Service',
      problem_description: (data.problem as string) ?? '',
      preferred_date: new Date().toISOString().split('T')[0],
      preferred_time: (data.preferredTime as string) ?? 'Flexible',
      status: 'pending',
      ai_booking: true,
      urgency: (data.urgency as string) ?? 'normal',
    }).select().single();

    if (booking) {
      setBookingNumber(booking.booking_number);
      await supabase.from('ai_conversations').insert({
        session_id: sessionId,
        customer_id: customerId,
        messages: state.messages,
        extracted_data: data,
        status: 'completed',
        created_booking_id: booking.id,
      });
    }
    setCreating(false);
  };

  const reset = () => {
    setState(INITIAL_STATE);
    setBookingNumber(null);
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

          {creating && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm flex items-center gap-2">
                <Loader size={14} className="animate-spin text-blue-600" />
                <span className="text-sm text-gray-500">Creating your booking...</span>
              </div>
            </div>
          )}

          {bookingNumber && (
            <div className="flex justify-center">
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
                <CheckCircle className="text-green-600 mx-auto mb-1" size={20} />
                <p className="text-sm font-semibold text-green-800">Booking Created!</p>
                <p className="text-xs text-green-600">Booking Number: <span className="font-mono font-bold">{bookingNumber}</span></p>
                <button onClick={() => navigate('customer-bookings')} className="mt-2 text-xs text-blue-600 font-semibold hover:underline">
                  View My Bookings →
                </button>
              </div>
            </div>
          )}

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
          <div className="px-4 py-3 border-t border-gray-100 text-center">
            <button onClick={reset} className="text-sm text-blue-600 font-semibold hover:underline">
              Book another service
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
