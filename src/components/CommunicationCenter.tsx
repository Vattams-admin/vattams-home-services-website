import { Phone, MessageCircle } from 'lucide-react';

export const SUPPORT_PHONE = '+916374068296';
export const SUPPORT_WHATSAPP = '918189800757';

export interface CommunicationCenterProps {
  bookingNumber?: string;
  customerName?: string;
  serviceCategory?: string;
  variant?: 'compact' | 'full';
  className?: string;
}

function buildWhatsAppMessage(bookingNumber?: string, customerName?: string, serviceCategory?: string): string {
  if (!bookingNumber && !customerName && !serviceCategory) {
    return encodeURIComponent('Hello VATTAMS, I need help regarding my booking.');
  }
  const lines = [
    'Hello VATTAMS,',
    bookingNumber ? `Booking Number: ${bookingNumber}` : '',
    customerName ? `Customer: ${customerName}` : '',
    serviceCategory ? `Service: ${serviceCategory}` : '',
    'Please connect me with the assigned technician.',
  ].filter(Boolean);
  return encodeURIComponent(lines.join('\n'));
}

export default function CommunicationCenter({
  bookingNumber,
  customerName,
  serviceCategory,
  variant = 'compact',
  className = '',
}: CommunicationCenterProps) {
  const waMessage = buildWhatsAppMessage(bookingNumber, customerName, serviceCategory);
  const waLink = `https://wa.me/${SUPPORT_WHATSAPP}?text=${waMessage}`;

  if (variant === 'full') {
    return (
    <div className={'grid grid-cols-1 sm:grid-cols-2 gap-3 ' + className}>
      <a
        href={`tel:${SUPPORT_PHONE}`}
        className="flex items-center gap-3 px-5 py-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition-colors border border-blue-200"
      >
        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <Phone size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-sm">Call VATTAMS Support</div>
          <div className="text-xs text-blue-500 truncate">{SUPPORT_PHONE}</div>
        </div>
      </a>
      <a
        href={waLink}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 px-5 py-4 bg-green-50 hover:bg-green-100 text-green-700 font-bold rounded-xl transition-colors border border-green-200"
      >
        <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center shrink-0">
          <MessageCircle size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-sm">Chat with VATTAMS</div>
          <div className="text-xs text-green-500 truncate">WhatsApp us instantly</div>
        </div>
      </a>
    </div>
    );
  }

  return (
    <div className={'flex flex-wrap gap-2 ' + className}>
      <a
        href={`tel:${SUPPORT_PHONE}`}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors border border-blue-200"
      >
        <Phone size={14} /> Call VATTAMS Support
      </a>
      <a
        href={waLink}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded-lg transition-colors border border-green-200"
      >
        <MessageCircle size={14} /> Chat with VATTAMS
      </a>
    </div>
  );
}