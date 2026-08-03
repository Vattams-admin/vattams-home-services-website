import { useState, useEffect } from 'react';
import { Briefcase, X } from 'lucide-react';
import { useRouter, type Page } from '@/lib/router';

export default function FloatingJoinButton() {
  const { page } = useRouter();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (dismissed || page === 'join-technician' || page === 'technician-register' || page === 'technician-login' || page === 'admin-dashboard') {
    return null;
  }

  return (
    <>
      {visible && (
        <div className="fixed bottom-5 right-4 z-50 md:hidden flex flex-col items-end gap-2">
          <button
            onClick={() => setDismissed(true)}
            className="w-7 h-7 rounded-full bg-gray-800/80 text-white flex items-center justify-center text-xs"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
          <button
            onClick={() => { (window.location.hash = 'join-technician'); }}
            className="flex items-center gap-2 px-5 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl shadow-2xl shadow-orange-900/40 transition-all duration-300 hover:scale-105"
          >
            <Briefcase size={20} />
            <span className="text-sm">Join as Technician</span>
          </button>
        </div>
      )}
    </>
  );
}
