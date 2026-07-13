import { useEffect, useState } from 'react';
import { Cloud, RefreshCw, WifiOff, Bell } from 'lucide-react';
import { getErpApi } from '../lib/erpApi';
import { enqueueOffline, flushLocalOutbox, getLocalOutbox, registerPushPlaceholder, type OfflineOutboxItem } from '../lib/offlineStore';
import { useAuth } from '../context/AuthContext';

export default function OfflineSync() {
  const api = getErpApi();
  const { user } = useAuth();
  const [outbox, setOutbox] = useState<any[]>([]);
  const [localOutbox, setLocalOutbox] = useState<OfflineOutboxItem[]>([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [result, setResult] = useState<any>(null);
  const [entityType, setEntityType] = useState('order');
  const [payload, setPayload] = useState('{"note":"offline demo"}');
  const [pushMsg, setPushMsg] = useState('');

  const load = async () => {
    if (api?.getSyncOutbox) setOutbox(await api.getSyncOutbox());
    setLocalOutbox(await getLocalOutbox());
  };

  useEffect(() => {
    load();
    const on = () => { setOnline(true); flushLocalOutbox().then(load); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const enqueue = async () => {
    let parsed: any = {};
    try { parsed = JSON.parse(payload); } catch { alert('Invalid JSON'); return; }
    const res = await enqueueOffline(entityType, parsed);
    if ((res as any)?.duplicate) alert('Duplicate prevented');
    load();
  };

  const flush = async () => {
    const local = await flushLocalOutbox();
    const remote = api?.flushSyncOutbox ? await api.flushSyncOutbox() : null;
    setResult({ ...local, remote });
    load();
  };

  return (
    <div className="p-4 md:p-8 space-y-6 w-full">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Cloud /> Offline Sync Queue</h2>
        <p className="text-slate-500">Local encrypted outbox + server queue, duplicate prevention, auto-flush when online.</p>
      </div>
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${online ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
        {online ? <RefreshCw size={14} /> : <WifiOff size={14} />}
        {online ? 'Online' : 'Offline — queue locally'}
      </div>
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold">Enqueue offline change</h3>
        <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="border rounded-md px-3 py-2 w-full">
          <option value="order">Order</option>
          <option value="invoice">Invoice</option>
          <option value="payment">Payment</option>
          <option value="visit">Visit</option>
          <option value="customer">Customer</option>
          <option value="gps">GPS</option>
        </select>
        <textarea value={payload} onChange={(e) => setPayload(e.target.value)} className="w-full border rounded-md px-3 py-2 font-mono text-sm h-24" />
        <div className="flex flex-wrap gap-2">
          <button onClick={enqueue} className="bg-slate-800 text-white px-4 py-2 rounded-md">Queue</button>
          <button onClick={flush} className="bg-blue-600 text-white px-4 py-2 rounded-md">Flush / Sync Now</button>
          <button
            onClick={async () => {
              const r = await registerPushPlaceholder(user?.id);
              setPushMsg(`FCM placeholder token: ${r.token}`);
            }}
            className="bg-amber-600 text-white px-4 py-2 rounded-md flex items-center gap-1"
          >
            <Bell size={16} /> Register Push (FCM stub)
          </button>
        </div>
        {result && <div className="text-sm text-emerald-700">Synced {result.synced} · conflicts {result.conflicts ?? 0}</div>}
        {pushMsg && <div className="text-xs text-slate-600">{pushMsg}</div>}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border rounded-xl overflow-hidden text-sm">
          <div className="px-4 py-3 bg-slate-50 font-semibold">Device outbox</div>
          <table className="w-full"><thead><tr><th className="text-left px-4 py-2">Type</th><th className="text-left px-4 py-2">Status</th><th className="text-left px-4 py-2">UUID</th></tr></thead>
            <tbody className="divide-y">{localOutbox.map((o) => <tr key={o.client_uuid}><td className="px-4 py-2">{o.entity_type}</td><td className="px-4 py-2">{o.status}</td><td className="px-4 py-2 font-mono text-xs">{o.client_uuid.slice(0, 8)}…</td></tr>)}
              {localOutbox.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">Empty</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="bg-white border rounded-xl overflow-hidden text-sm">
          <div className="px-4 py-3 bg-slate-50 font-semibold">Server outbox</div>
          <table className="w-full"><thead><tr><th className="text-left px-4 py-2">Type</th><th className="text-left px-4 py-2">Status</th><th className="text-left px-4 py-2">Created</th></tr></thead>
            <tbody className="divide-y">{outbox.map((o) => <tr key={o.id}><td className="px-4 py-2">{o.entity_type}</td><td className="px-4 py-2">{o.status}</td><td className="px-4 py-2">{o.created_at}</td></tr>)}
              {outbox.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">Empty</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
