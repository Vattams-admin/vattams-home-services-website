import { useEffect } from 'react';
import { Home as HomeIcon, Briefcase, ArrowRight } from 'lucide-react';
import { useRouter } from '@/lib/router';
import JoinTechnicianButton from '@/components/JoinTechnicianButton';

export default function NotFound() {
  const { navigate } = useRouter();

  useEffect(() => {
    document.title = 'Page Not Found | VATTAMS Home Services';
  }, []);

  return (
    <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full text-center">
        <div className="text-8xl font-extrabold text-orange-500 mb-4">404</div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Page Not Found</h1>
        <p className="text-gray-500 mb-8">
          The page you're looking for doesn't exist or has been moved. But while you're here —
          are you a skilled technician looking for work?
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('home')}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
          >
            <HomeIcon size={18} /> Back to Home
          </button>
          <JoinTechnicianButton size="lg" />
        </div>
      </div>
    </div>
  );
}
