import { useEffect, useState } from 'react';
import { Download, X, Loader2 } from 'lucide-react';
import { checkForUpdate, runUpdate, type UpdateInfo } from '../lib/appUpdater';

export default function UpdateBanner() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let active = true;
    const run = async () => {
      const result = await checkForUpdate();
      if (active && result?.available) setInfo(result);
    };
    run();
    // Re-check periodically while the app is open.
    const id = setInterval(run, 60 * 60 * 1000);
    return () => { active = false; clearInterval(id); };
  }, []);

  if (!info || !info.available || dismissed) return null;

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await runUpdate(info.apkUrl);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-blue-600 text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-md z-40">
      <div className="flex items-center gap-2 min-w-0">
        <Download size={18} className="shrink-0" />
        <div className="min-w-0">
          <span className="font-semibold">Update available</span>
          <span className="hidden sm:inline text-blue-100"> — v{info.version}. {info.notes || 'Please update to the latest version.'}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleUpdate}
          disabled={updating}
          className="bg-white text-blue-700 hover:bg-blue-50 disabled:opacity-70 px-3 py-1.5 rounded-md font-semibold text-sm flex items-center gap-1.5"
        >
          {updating ? <><Loader2 size={15} className="animate-spin" /> Updating…</> : <>Update</>}
        </button>
        <button onClick={() => setDismissed(true)} className="text-blue-100 hover:text-white p-1" aria-label="Dismiss">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
