import { useEffect, useState, type FormEvent } from 'react';
import { QrCode, Camera, MapPin } from 'lucide-react';
import { getErpApi } from '../lib/erpApi';
import { useAuth } from '../context/AuthContext';
import QrImage from '../components/QrImage';
import PdfActions from '../components/PdfActions';
import { COMPANY } from '../lib/companyProfile';

export default function VisitCheckIn() {
  const api = getErpApi();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [reason, setReason] = useState('Sales Call');
  const [method, setMethod] = useState<'qr' | 'manual'>('manual');
  const [photoUrl, setPhotoUrl] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [stickerCustomer, setStickerCustomer] = useState<any>(null);
  const [selectedStickerId, setSelectedStickerId] = useState('');
  const [message, setMessage] = useState('');
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    try {
      setCustomers(await api.getCustomers());
      setVisits(await api.getCustomerVisits({}));
    } catch (e: any) {
      console.error(e);
      setMessage(e?.message || 'Failed to load data');
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords(null),
      { enableHighAccuracy: true }
    );
  }, []);

  const resolveQr = async () => {
    const code = qrInput.trim();
    if (!code) { setMessage('Enter or scan a QR code first'); return; }
    try {
      const c = await api.getCustomerByQr(code);
      if (!c) { setMessage('QR not found — generate a sticker for this shop first'); return; }
      setCustomerId(String(c.id));
      setMethod('qr');
      setMessage(`Matched: ${c.shop_name}`);
    } catch (e: any) {
      setMessage(e?.message || 'QR lookup failed');
    }
  };

  const ensureQr = async (id: number) => {
    if (!id) return;
    setGenerating(true);
    setMessage('');
    try {
      if (!api?.ensureCustomerQr) {
        throw new Error('QR API is not available in this environment');
      }
      const code = await api.ensureCustomerQr(id);
      if (!code) throw new Error('Could not generate QR code');
      const list = await api.getCustomers();
      setCustomers(list);
      const c = list.find((x: any) => x.id === id);
      setStickerCustomer({ ...(c || { id, shop_name: `Customer #${id}` }), qr_code: code });
      setMessage(`QR ready for ${c?.shop_name || id}`);
    } catch (e: any) {
      console.error(e);
      setMessage(e?.message || 'Failed to generate QR. Run supabase_schema_phases.sql if qr_code column is missing.');
      setStickerCustomer(null);
    } finally {
      setGenerating(false);
    }
  };

  const submitVisit = async (e: FormEvent) => {
    e.preventDefault();
    if (!customerId) return;
    try {
      await api.addCustomerVisit({
        customer_id: Number(customerId),
        user_id: user?.id || null,
        method,
        reason,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        photo_url: photoUrl || null
      });
      setMessage('Visit recorded');
      setPhotoUrl('');
      await load();
    } catch (err: any) {
      setMessage(err?.message || 'Failed to save visit');
    }
  };

  const onPhoto = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 w-full">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><QrCode /> QR Visit Check-In</h2>
        <p className="text-slate-500">Generate a scannable QR sticker, then scan or manually check in with GPS.</p>
      </div>

      {message && <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-md text-sm">{message}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={submitVisit} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="flex gap-2">
            <input value={qrInput} onChange={(e) => setQrInput(e.target.value)} placeholder="Enter / scan QR code" className="flex-1 border border-slate-300 rounded-md px-3 py-2" />
            <button type="button" onClick={resolveQr} className="bg-slate-800 text-white px-3 py-2 rounded-md">Verify QR</button>
          </div>
          <select required value={customerId} onChange={(e) => { setCustomerId(e.target.value); setMethod('manual'); }} className="w-full border border-slate-300 rounded-md px-3 py-2">
            <option value="">Select customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.shop_name}{c.qr_code ? ' · QR' : ''}</option>)}
          </select>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2">
            {['Sales Call', 'Delivery', 'Collection', 'New Lead', 'Complaint', 'Other'].map((r) => <option key={r}>{r}</option>)}
          </select>
          <div className="text-sm text-slate-600 flex items-center gap-2">
            <MapPin size={16} />
            {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'GPS unavailable — visit still allowed'}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <Camera size={16} />
            <span>Optional shop photo</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
          </label>
          {photoUrl && <img src={photoUrl} alt="Shop" className="h-24 rounded border object-cover" />}
          <div className="text-xs text-slate-500">Method: {method}</div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md w-full">Check In</button>
        </form>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          <h3 className="font-semibold">Generate QR Sticker</h3>
          <div className="flex gap-2">
            <select
              value={selectedStickerId}
              onChange={(e) => setSelectedStickerId(e.target.value)}
              className="flex-1 border border-slate-300 rounded-md px-3 py-2"
            >
              <option value="">Select customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.shop_name}</option>)}
            </select>
            <button
              type="button"
              disabled={!selectedStickerId || generating}
              onClick={() => ensureQr(Number(selectedStickerId))}
              className="bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-md whitespace-nowrap"
            >
              {generating ? 'Generating…' : 'Generate QR'}
            </button>
          </div>

          {stickerCustomer?.qr_code && (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-slate-300 p-6 text-center bg-white" id="qr-sticker">
                <div className="text-xs text-slate-500 mb-1">{COMPANY.displayName}</div>
                <div className="shop font-bold text-lg mb-3">{stickerCustomer.shop_name}</div>
                <QrImage value={String(stickerCustomer.qr_code)} size={220} />
                <div className="code font-mono text-xs mt-3 text-slate-600 break-all">{stickerCustomer.qr_code}</div>
                <div className="text-xs text-slate-500 mt-2">Scan to verify customer visit</div>
              </div>
              <PdfActions
                targetId="qr-sticker"
                filename={`QR-${stickerCustomer.shop_name?.replace(/\s+/g, '-') || stickerCustomer.id}.pdf`}
                printTitle={`QR Sticker - ${stickerCustomer.shop_name}`}
                size="sm"
                className="justify-center"
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 font-semibold">Visit History</div>
        <div className="overflow-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2">Shop</th>
                <th className="text-left px-4 py-2">Reason</th>
                <th className="text-left px-4 py-2">Method</th>
                <th className="text-left px-4 py-2">When</th>
                <th className="text-left px-4 py-2">GPS</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visits.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-2">{v.shop_name}</td>
                  <td className="px-4 py-2">{v.reason}</td>
                  <td className="px-4 py-2 uppercase text-xs">{v.method}</td>
                  <td className="px-4 py-2">{v.visited_at ? new Date(v.visited_at).toLocaleString() : '-'}</td>
                  <td className="px-4 py-2">{v.latitude != null ? `${Number(v.latitude).toFixed(4)}, ${Number(v.longitude).toFixed(4)}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
