import { Phone } from 'lucide-react';

const WEBSITE = 'https://merncrest.lk';
const PHONE = '0713838638';

export default function MadeByMernCrest({ className = '' }: { className?: string }) {
  const openSite = () => {
    window.open(WEBSITE, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`text-center text-xs text-slate-400 select-none ${className}`}>
      <button
        type="button"
        onClick={openSite}
        className="hover:text-blue-600 transition-colors font-medium"
        title="Visit merncrest.lk"
      >
        Developed by MernCrest Solution (Pvt) Ltd
      </button>
      <div className="mt-1">
        <a
          href={`tel:${PHONE}`}
          className="inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
          title={`Call ${PHONE}`}
        >
          <Phone size={11} /> {PHONE}
        </a>
      </div>
    </div>
  );
}
