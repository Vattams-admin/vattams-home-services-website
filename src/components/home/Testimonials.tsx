import { useState } from 'react';
import { Star, Quote } from 'lucide-react';

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function Avatar({ name, avatar }: { name: string; avatar: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="w-11 h-11 rounded-full ring-2 ring-gold-100 bg-navy-800 text-gold-300 flex items-center justify-center text-sm font-bold shrink-0">
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={avatar}
      alt={name}
      loading="lazy"
      className="w-11 h-11 rounded-full object-cover ring-2 ring-gold-100"
      onError={() => setFailed(true)}
    />
  );
}

const testimonials = [
  { name: 'Priya Rajan', city: 'Chennai', rating: 5, text: 'Excellent service! The AC technician arrived on time and fixed the issue in under an hour. Very professional.', service: 'AC Repair', avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100' },
  { name: 'Karthik Murali', city: 'Coimbatore', rating: 5, text: 'Used VATTAMS for washing machine repair. Transparent pricing, genuine parts. Highly recommend!', service: 'Washing Machine Repair', avatar: 'https://images.pexels.com/photos/1212984/pexels-photo-1212984.jpeg?auto=compress&cs=tinysrgb&w=100' },
  { name: 'Meena Sundaram', city: 'Madurai', rating: 5, text: 'Same-day service for refrigerator repair. The technician was very knowledgeable and polite. 5 stars!', service: 'Refrigerator Repair', avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100' },
  { name: 'Suresh Kumar', city: 'Salem', rating: 5, text: 'AC deep cleaning made such a difference in cooling efficiency. Worth every rupee!', service: 'AC Deep Cleaning', avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100' },
  { name: 'Lakshmi Nair', city: 'Trichy', rating: 5, text: 'Plumbing work done neatly and quickly. No mess left behind. Very impressed with the service.', service: 'Plumbing Services', avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100' },
  { name: 'Arun Selvam', city: 'Tirunelveli', rating: 5, text: 'Booked RO purifier service online. Smooth process, on-time arrival, great workmanship.', service: 'RO Water Purifier', avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100' },
];

export default function Testimonials() {
  return (
    <section className="py-20 md:py-28 bg-ivory">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gold-50 text-gold-700 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold mb-4 tracking-wide uppercase">
            Customer Reviews
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-navy-900 mb-4">
            What Our Customers Say
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Thousands of happy customers across India trust VATTAMS for their home service needs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-white rounded-2xl border border-gold-100 shadow-sm hover:shadow-lg hover:border-gold-300 p-6 transition-all duration-300 hover:-translate-y-0.5 relative"
            >
              <Quote className="absolute top-4 right-4 text-gold-100" size={32} />
              <div className="flex items-center gap-3 mb-4">
                <Avatar name={t.name} avatar={t.avatar} />
                <div>
                  <div className="font-bold text-navy-900 text-sm">{t.name}</div>
                  <div className="text-gray-400 text-xs">{t.city}</div>
                </div>
              </div>
              <div className="flex gap-0.5 mb-3">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} size={13} className="text-gold-500 fill-gold-500" />
                ))}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">"{t.text}"</p>
              <span className="inline-block bg-navy-50 text-navy-800 text-xs font-medium px-2.5 py-1 rounded-full">
                {t.service}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}