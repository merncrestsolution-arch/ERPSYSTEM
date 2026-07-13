import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, RefreshCw, Users, Navigation } from 'lucide-react';

// Default center: Colombo, Sri Lanka.
const DEFAULT_CENTER: [number, number] = [6.9271, 79.8612];

function makeIcon(color: string, label: string) {
  return L.divIcon({
    className: 'erp-marker',
    html: `<div style="background:${color};width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
            <span style="transform:rotate(45deg);color:#fff;font-size:11px;font-weight:700;">${label}</span>
           </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 28],
    popupAnchor: [0, -28],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 16 });
    }
  }, [points, map]);
  return null;
}

function timeAgo(iso: string) {
  if (!iso) return 'unknown';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} d ago`;
}

export default function LiveTracking() {
  const [locations, setLocations] = useState<any[]>([]);
  const [trail, setTrail] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playFrom, setPlayFrom] = useState(new Date(Date.now() - 86400000).toISOString().slice(0, 16));
  const [playTo, setPlayTo] = useState(new Date().toISOString().slice(0, 16));
  const [stats, setStats] = useState<{ distanceKm: number; points: number; avgSpeedKmh: number; workingHours: number } | null>(null);
  const refreshRef = useRef<any>(null);

  const loadLocations = async () => {
    try {
      // @ts-ignore
      const api = window.electronAPI;
      if (!api?.getLatestLocations) {
        setError('Location tracking is not available in this environment.');
        setLoading(false);
        return;
      }
      const data = await api.getLatestLocations();
      setLocations(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const loadTrail = async (userId: number) => {
    try {
      // @ts-ignore
      const api = window.electronAPI;
      if (!api?.getLocationTrail) return;
      const data = await api.getLocationTrail(userId, 200);
      setTrail(Array.isArray(data) ? data : []);
      setStats(null);
    } catch (e) {
      console.error(e);
    }
  };

  const loadPlayback = async () => {
    if (!selectedUser) return;
    try {
      // @ts-ignore
      const api = window.electronAPI;
      if (!api?.getLocationPlayback) return;
      const fromIso = new Date(playFrom).toISOString();
      const toIso = new Date(playTo).toISOString();
      const data = await api.getLocationPlayback(selectedUser, fromIso, toIso);
      const pts = Array.isArray(data) ? data : [];
      setTrail(pts);
      let dist = 0;
      let movingSeconds = 0;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]; const b = pts[i];
        if (!a.latitude || !b.latitude) continue;
        const R = 6371;
        const dLat = (b.latitude - a.latitude) * Math.PI / 180;
        const dLon = (b.longitude - a.longitude) * Math.PI / 180;
        const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        dist += 2 * R * Math.asin(Math.sqrt(x));
        const t0 = new Date(a.recorded_at).getTime();
        const t1 = new Date(b.recorded_at).getTime();
        if (t1 > t0) movingSeconds += (t1 - t0) / 1000;
      }
      const workingHours = pts.length >= 2
        ? Math.max(0, (new Date(pts[pts.length - 1].recorded_at).getTime() - new Date(pts[0].recorded_at).getTime()) / 3600000)
        : 0;
      const avgSpeedKmh = movingSeconds > 0 ? dist / (movingSeconds / 3600) : 0;
      setStats({
        distanceKm: Math.round(dist * 100) / 100,
        points: pts.length,
        avgSpeedKmh: Math.round(avgSpeedKmh * 10) / 10,
        workingHours: Math.round(workingHours * 100) / 100,
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadLocations();
    refreshRef.current = setInterval(() => {
      loadLocations();
      if (selectedUser) loadTrail(selectedUser);
    }, 20000);
    return () => clearInterval(refreshRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedUser) loadTrail(selectedUser);
    else setTrail([]);
  }, [selectedUser]);

  const trailPoints = useMemo<[number, number][]>(
    () => trail.filter(t => t.latitude && t.longitude).map(t => [t.latitude, t.longitude] as [number, number]).reverse(),
    [trail]
  );

  const markerPoints = useMemo<[number, number][]>(
    () => (selectedUser
      ? trailPoints.slice(-1)
      : locations.filter(l => l.latitude && l.longitude).map(l => [l.latitude, l.longitude] as [number, number])),
    [locations, selectedUser, trailPoints]
  );

  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Navigation size={24} className="text-blue-600" /> Live Tracking</h2>
          <p className="text-slate-500">Live map, route playback, distance, and working trail.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {selectedUser && (
            <>
              <input type="datetime-local" value={playFrom} onChange={(e) => setPlayFrom(e.target.value)} className="border rounded-md px-2 py-2 text-sm" />
              <input type="datetime-local" value={playTo} onChange={(e) => setPlayTo(e.target.value)} className="border rounded-md px-2 py-2 text-sm" />
              <button onClick={loadPlayback} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium">Playback</button>
            </>
          )}
          <button
            onClick={() => { loadLocations(); if (selectedUser) loadTrail(selectedUser); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <RefreshCw size={18} /> Refresh
          </button>
        </div>
      </div>

      {stats && (
        <div className="mb-4 text-sm bg-slate-100 text-slate-700 px-4 py-2 rounded-md flex flex-wrap gap-4">
          <span>Playback: {stats.points} points</span>
          <span>~{stats.distanceKm} km</span>
          <span>Avg speed ~{stats.avgSpeedKmh} km/h</span>
          <span>Working window ~{stats.workingHours} h</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded">{error}</div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Officer list */}
        <div className="w-full lg:w-72 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden shrink-0 max-h-60 lg:max-h-none">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 font-semibold text-slate-700 flex items-center gap-2">
            <Users size={18} /> Sales Officers ({locations.length})
          </div>
          <div className="overflow-y-auto flex-1">
            <button
              onClick={() => setSelectedUser(null)}
              className={`w-full text-left px-4 py-3 border-b border-slate-100 text-sm ${!selectedUser ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-slate-50'}`}
            >
              Show all
            </button>
            {locations.map((l) => (
              <button
                key={l.user_id ?? l.username}
                onClick={() => setSelectedUser(l.user_id)}
                className={`w-full text-left px-4 py-3 border-b border-slate-100 ${selectedUser === l.user_id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
              >
                <div className="font-medium text-slate-800 text-sm flex items-center gap-1">
                  <MapPin size={14} className="text-blue-600" /> {l.full_name || l.username}
                </div>
                <div className="text-xs text-slate-400 ml-5">{timeAgo(l.recorded_at)}</div>
              </button>
            ))}
            {locations.length === 0 && !loading && (
              <div className="px-4 py-8 text-center text-sm text-slate-500">No location data yet. It appears once a sales officer logs in on the mobile app and grants location permission.</div>
            )}
          </div>
        </div>

        {/* Map (isolate keeps Leaflet's internal z-index below the sidebar/header) */}
        <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden min-h-[320px] isolate relative z-0">
          <MapContainer center={DEFAULT_CENTER} zoom={11} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {!selectedUser && locations.filter(l => l.latitude && l.longitude).map((l, i) => (
              <Marker key={l.user_id ?? i} position={[l.latitude, l.longitude]} icon={makeIcon('#2563eb', (l.full_name || l.username || '?').substring(0, 2).toUpperCase())}>
                <Popup>
                  <strong>{l.full_name || l.username}</strong><br />
                  {timeAgo(l.recorded_at)}<br />
                  {l.latitude.toFixed(5)}, {l.longitude.toFixed(5)}
                </Popup>
              </Marker>
            ))}
            {selectedUser && trailPoints.length > 0 && (
              <>
                <Polyline positions={trailPoints} pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.7 }} />
                <Marker position={trailPoints[trailPoints.length - 1]} icon={makeIcon('#16a34a', 'NOW')}>
                  <Popup>Latest position</Popup>
                </Marker>
                {trailPoints.length > 1 && (
                  <Marker position={trailPoints[0]} icon={makeIcon('#64748b', 'IN')}>
                    <Popup>Start of trail</Popup>
                  </Marker>
                )}
              </>
            )}
            <FitBounds points={markerPoints} />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
