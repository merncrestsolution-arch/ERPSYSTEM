import { useEffect, useState, type FormEvent } from 'react';
import { Plus, MapPinned, Route as RouteIcon } from 'lucide-react';
import { getErpApi } from '../lib/erpApi';
import { useAuth } from '../context/AuthContext';

export default function RoutesPage() {
  const api = getErpApi();
  const { user } = useAuth();
  const [routes, setRoutes] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [stops, setStops] = useState<any[]>([]);
  const [completion, setCompletion] = useState<any>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [stopCustomerId, setStopCustomerId] = useState('');
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().slice(0, 10));
  const [scheduleRouteId, setScheduleRouteId] = useState('');

  const load = async () => {
    setRoutes(await api.getRoutes());
    setCustomers(await api.getCustomers());
    setUsers(await api.getUsers());
    setSchedules(await api.getDailySchedules());
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selectedRoute) { setStops([]); return; }
    api.getRouteStops(selectedRoute).then(setStops);
  }, [selectedRoute]);

  const createRoute = async (e: FormEvent) => {
    e.preventDefault();
    await api.addRoute({
      name,
      description,
      assigned_user_id: assignedUserId ? Number(assignedUserId) : null,
      status: 'Active',
      stops: []
    });
    setName(''); setDescription(''); setAssignedUserId('');
    await load();
  };

  const addStop = async () => {
    if (!selectedRoute || !stopCustomerId) return;
    const next = [...stops, { customer_id: Number(stopCustomerId), sequence_no: stops.length + 1 }];
    await api.updateRouteStops(selectedRoute, next.map((s, i) => ({ customer_id: s.customer_id, sequence_no: i + 1 })));
    setStops(await api.getRouteStops(selectedRoute));
    setStopCustomerId('');
  };

  const createSchedule = async (e: FormEvent) => {
    e.preventDefault();
    if (!scheduleRouteId) return;
    const route = routes.find((r) => r.id === Number(scheduleRouteId));
    await api.addDailySchedule({
      route_id: Number(scheduleRouteId),
      schedule_date: scheduleDate,
      assigned_user_id: route?.assigned_user_id || user?.id || null,
      status: 'Planned'
    });
    setSchedules(await api.getDailySchedules());
  };

  const checkCompletion = async (scheduleId: number) => {
    setCompletion(await api.getRouteCompletion(scheduleId));
  };

  return (
    <div className="p-4 md:p-8 space-y-6 w-full">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><RouteIcon /> Route Management</h2>
        <p className="text-slate-500">Plan routes, assign shops, and track daily completion.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={createRoute} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
          <h3 className="font-semibold text-slate-800">New Route</h3>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Route name" className="w-full border border-slate-300 rounded-md px-3 py-2" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="w-full border border-slate-300 rounded-md px-3 py-2" />
          <select value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2">
            <option value="">Assign officer (optional)</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.username}</option>)}
          </select>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2"><Plus size={16} /> Create Route</button>
        </form>

        <form onSubmit={createSchedule} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
          <h3 className="font-semibold text-slate-800">Daily Schedule</h3>
          <select required value={scheduleRouteId} onChange={(e) => setScheduleRouteId(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2">
            <option value="">Select route</option>
            {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <input type="date" required value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2" />
          <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-md flex items-center gap-2"><MapPinned size={16} /> Schedule Day</button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-50 font-semibold">Routes</div>
          <ul className="divide-y max-h-80 overflow-auto">
            {routes.map((r) => (
              <li key={r.id} className={`px-4 py-3 cursor-pointer hover:bg-slate-50 ${selectedRoute === r.id ? 'bg-blue-50' : ''}`} onClick={() => setSelectedRoute(r.id)}>
                <div className="font-medium text-slate-800">{r.name}</div>
                <div className="text-sm text-slate-500">{r.assigned_user_name || 'Unassigned'} · {r.status}</div>
              </li>
            ))}
          </ul>
          {selectedRoute && (
            <div className="p-4 border-t space-y-2">
              <h4 className="font-medium">Stops</h4>
              <div className="flex gap-2">
                <select value={stopCustomerId} onChange={(e) => setStopCustomerId(e.target.value)} className="flex-1 border border-slate-300 rounded-md px-3 py-2">
                  <option value="">Add customer stop</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.shop_name}</option>)}
                </select>
                <button type="button" onClick={addStop} className="bg-slate-800 text-white px-3 py-2 rounded-md">Add</button>
              </div>
              <ol className="list-decimal pl-5 text-sm space-y-1">
                {stops.map((s) => <li key={s.id || s.customer_id}>{s.shop_name}</li>)}
              </ol>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-50 font-semibold">Schedules & Completion</div>
          <ul className="divide-y max-h-80 overflow-auto">
            {schedules.map((s) => (
              <li key={s.id} className="px-4 py-3 flex justify-between items-center gap-2">
                <div>
                  <div className="font-medium">{s.route_name}</div>
                  <div className="text-sm text-slate-500">{s.schedule_date} · {s.status}</div>
                </div>
                <button onClick={() => checkCompletion(s.id)} className="text-blue-600 text-sm font-medium">Completion</button>
              </li>
            ))}
          </ul>
          {completion && (
            <div className="p-4 border-t bg-emerald-50 text-sm">
              <div className="font-semibold text-emerald-800">{completion.percent}% complete ({completion.visited}/{completion.total})</div>
              {completion.missed?.length > 0 && (
                <div className="mt-2 text-amber-700">Missed: {completion.missed.map((m: any) => m.shop_name).join(', ')}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
