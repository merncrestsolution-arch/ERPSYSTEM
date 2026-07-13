import { useEffect, useState } from 'react';
import { Truck, Fuel, Wrench } from 'lucide-react';
import { getErpApi } from '../lib/erpApi';

export default function FleetOps() {
  const api = getErpApi();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [fuel, setFuel] = useState<any[]>([]);
  const [maint, setMaint] = useState<any[]>([]);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [expType, setExpType] = useState('General');
  const [expAmount, setExpAmount] = useState('');
  const [liters, setLiters] = useState('');
  const [fuelAmount, setFuelAmount] = useState('');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintAmount, setMaintAmount] = useState('');
  const [geoName, setGeoName] = useState('');
  const [geoLat, setGeoLat] = useState('');
  const [geoLng, setGeoLng] = useState('');
  const [geoRadius, setGeoRadius] = useState('100');

  const load = async () => {
    setVehicles(await api.getVehicles());
    setExpenses(await api.getVehicleExpenses());
    setFuel(await api.getVehicleFuel());
    setMaint(await api.getVehicleMaintenance());
    setGeofences(await api.getGeofences());
  };
  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const expiring = vehicles.filter((v) => {
    const ins = v.insurance_expiry ? new Date(v.insurance_expiry) : null;
    const lic = v.revenue_license_expiry ? new Date(v.revenue_license_expiry) : null;
    const soon = Date.now() + 30 * 86400000;
    return (ins && ins.getTime() < soon) || (lic && lic.getTime() < soon);
  });

  return (
    <div className="p-4 md:p-8 space-y-6 w-full">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Truck /> Fleet Operations</h2>
        <p className="text-slate-500">Fuel, maintenance, expenses, geofences, and expiry alerts.</p>
      </div>
      {expiring.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
          Expiring insurance/license: {expiring.map((v) => v.registration_number).join(', ')}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <form className="bg-white border rounded-xl p-4 space-y-2" onSubmit={async (e) => {
          e.preventDefault();
          await api.addVehicleExpense({ vehicle_id: Number(vehicleId), expense_type: expType, amount: parseFloat(expAmount) || 0, expense_date: today });
          setExpAmount(''); load();
        }}>
          <h3 className="font-semibold flex items-center gap-1"><Wrench size={16} /> Expense</h3>
          <select required value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full border rounded-md px-3 py-2"><option value="">Vehicle</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_number}</option>)}</select>
          <input value={expType} onChange={(e) => setExpType(e.target.value)} className="w-full border rounded-md px-3 py-2" />
          <input required type="number" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="Amount" />
          <button className="bg-blue-600 text-white w-full py-2 rounded-md">Save</button>
        </form>
        <form className="bg-white border rounded-xl p-4 space-y-2" onSubmit={async (e) => {
          e.preventDefault();
          await api.addVehicleFuel({ vehicle_id: Number(vehicleId), liters: parseFloat(liters) || 0, amount: parseFloat(fuelAmount) || 0, fuel_date: today });
          setLiters(''); setFuelAmount(''); load();
        }}>
          <h3 className="font-semibold flex items-center gap-1"><Fuel size={16} /> Fuel</h3>
          <select required value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full border rounded-md px-3 py-2"><option value="">Vehicle</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_number}</option>)}</select>
          <input type="number" value={liters} onChange={(e) => setLiters(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="Liters" />
          <input type="number" value={fuelAmount} onChange={(e) => setFuelAmount(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="Amount" />
          <button className="bg-emerald-600 text-white w-full py-2 rounded-md">Save</button>
        </form>
        <form className="bg-white border rounded-xl p-4 space-y-2" onSubmit={async (e) => {
          e.preventDefault();
          await api.addVehicleMaintenance({ vehicle_id: Number(vehicleId), description: maintDesc, amount: parseFloat(maintAmount) || 0, service_date: today });
          setMaintDesc(''); setMaintAmount(''); load();
        }}>
          <h3 className="font-semibold">Maintenance</h3>
          <select required value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full border rounded-md px-3 py-2"><option value="">Vehicle</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_number}</option>)}</select>
          <input required value={maintDesc} onChange={(e) => setMaintDesc(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="Description" />
          <input type="number" value={maintAmount} onChange={(e) => setMaintAmount(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="Amount" />
          <button className="bg-slate-800 text-white w-full py-2 rounded-md">Save</button>
        </form>
      </div>
      <form className="bg-white border rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3" onSubmit={async (e) => {
        e.preventDefault();
        await api.addGeofence({ name: geoName, latitude: parseFloat(geoLat), longitude: parseFloat(geoLng), radius_meters: parseFloat(geoRadius) || 100 });
        setGeoName(''); load();
      }}>
        <input required value={geoName} onChange={(e) => setGeoName(e.target.value)} className="border rounded-md px-3 py-2" placeholder="Geofence name" />
        <input required value={geoLat} onChange={(e) => setGeoLat(e.target.value)} className="border rounded-md px-3 py-2" placeholder="Lat" />
        <input required value={geoLng} onChange={(e) => setGeoLng(e.target.value)} className="border rounded-md px-3 py-2" placeholder="Lng" />
        <input value={geoRadius} onChange={(e) => setGeoRadius(e.target.value)} className="border rounded-md px-3 py-2" placeholder="Radius m" />
        <button className="bg-blue-600 text-white rounded-md">Add Geofence</button>
      </form>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="bg-white border rounded-xl p-4"><h3 className="font-semibold mb-2">Recent fuel</h3><ul className="divide-y">{fuel.slice(0, 8).map((f) => <li key={f.id} className="py-1">{f.registration_number || f.vehicle_id}: {f.liters}L / {f.amount}</li>)}</ul></div>
        <div className="bg-white border rounded-xl p-4"><h3 className="font-semibold mb-2">Geofences</h3><ul className="divide-y">{geofences.map((g) => <li key={g.id} className="py-1">{g.name} — {g.radius_meters}m</li>)}</ul></div>
        <div className="bg-white border rounded-xl p-4"><h3 className="font-semibold mb-2">Expenses</h3><ul className="divide-y">{expenses.slice(0, 8).map((e) => <li key={e.id} className="py-1">{e.registration_number || e.vehicle_id}: {e.expense_type} {e.amount}</li>)}</ul></div>
        <div className="bg-white border rounded-xl p-4"><h3 className="font-semibold mb-2">Maintenance</h3><ul className="divide-y">{maint.slice(0, 8).map((m) => <li key={m.id} className="py-1">{m.registration_number || m.vehicle_id}: {m.description}</li>)}</ul></div>
      </div>
    </div>
  );
}
