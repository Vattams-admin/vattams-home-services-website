import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Priya Rajan',
    city: 'Chennai',
    rating: 5,
    text: 'Excellent service! The AC technician arrived on time and fixed the issue in under an hour. Very professional.',
    service: 'AC Repair',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
  {
    name: 'Karthik Murali',
    city: 'Coimbatore',
    rating: 5,
    text: 'Used VATTAMS for washing machine repair. Transparent pricing, genuine parts. Highly recommend!',
    service: 'Washing Machine Repair',
    avatar: 'https://images.pexels.com/photos/1212984/pexels-photo-1212984.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
  {
    name: 'Meena Sundaram',
    city: 'Madurai',
    rating: 5,
    text: 'Same-day service for refrigerator repair. The technician was very knowledgeable and polite. 5 stars!',
    service: 'Refrigerator Repair',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
  {
    name: 'Suresh Kumar',
    city: 'Salem',
    rating: 5,
    text: 'AC deep cleaning made such a difference in cooling efficiency. Worth every rupee!',
    service: 'AC Deep Cleaning',
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
  {
    name: 'Lakshmi Nair',
    city: 'Trichy',
    rating: 5,
    text: 'Plumbing work done neatly and quickly. No mess left behind. Very impressed with the service.',
    service: 'Plumbing Services',
    avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
  {
    name: 'Arun Selvam',
    city: 'Tirunelveli',
    rating: 5,
    text: 'Booked RO purifier service online. Smooth process, on-time arrival, great workmanship.',
    service: 'RO Water Purifier',
    avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
];

export default function Testimonials() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            Customer Reviews
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
            What Our Customers Say
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Thousands of happy customers across Tamil Nadu trust VATTAMS for their home service needs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md p-6 transition-all duration-300 hover:-translate-y-0.5 relative"
            >
              <Quote className="absolute top-4 right-4 text-blue-100" size={32} />
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-11 h-11 rounded-full object-cover"
                />
                <div>
                  <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                  <div className="text-gray-400 text-xs">{t.city}</div>
                </div>
              </div>
              <div className="flex gap-0.5 mb-3">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} size={13} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">"{t.text}"</p>
              <span className="inline-block bg-blue-50 text-blue-600 text-xs font-medium px-2.5 py-1 rounded-full">
                {t.service}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
