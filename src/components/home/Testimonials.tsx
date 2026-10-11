import { CalendarClock, CheckCircle, ClipboardCheck, MessageCircle, ReceiptText, Wrench } from 'lucide-react';

const customerBenefits = [
  {
    icon: ReceiptText,
    title: 'See service prices first',
    description: 'Review the listed base price and the applicable checkout charges before confirming your booking.',
  },
  {
    icon: Wrench,
    title: 'Choose the exact job',
    description: 'Select the appliance and specific work needed, from AC service types to washing machine and refrigerator service.',
  },
  {
    icon: CalendarClock,
    title: 'Check appointment options',
    description: 'Choose from the date and time options shown for your address and requested job.',
  },
  {
    icon: ClipboardCheck,
    title: 'Clear job milestones',
    description: 'Booking and technician job steps use status updates and OTP verification where required in the workflow.',
  },
  {
    icon: MessageCircle,
    title: 'Get support when needed',
    description: 'Use the website contact and WhatsApp options if you need help with a booking.',
  },
  {
    icon: CheckCircle,
    title: 'Approve extra work',
    description: 'Ask for a separate quote for parts or additional repairs and approve the cost before proceeding.',
  },
];

export default function Testimonials() {
  return (
    <section className="py-20 md:py-28 bg-ivory" aria-labelledby="customer-benefits-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 bg-gold-50 text-gold-700 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold mb-4 tracking-wide uppercase">
            A clearer booking experience
          </div>
          <h2 id="customer-benefits-heading" className="font-display text-3xl md:text-4xl font-bold text-navy-900 mb-4">
            Appliance Service, With More Clarity
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            VATTAMS helps you choose the right job, review pricing and follow the booking process for AC, washing machine and refrigerator service.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {customerBenefits.map(({ icon: Icon, title, description }) => (
            <article key={title} className="bg-white rounded-2xl border border-gold-100 p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <div className="w-11 h-11 rounded-xl bg-gold-50 text-gold-700 flex items-center justify-center mb-4">
                <Icon size={21} aria-hidden="true" />
              </div>
              <h3 className="font-bold text-navy-900 mb-2">{title}</h3>
              <p className="text-gray-600 text-sm leading-6">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
