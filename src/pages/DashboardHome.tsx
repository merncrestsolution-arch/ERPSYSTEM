import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart as LucideBarChart, Activity, ShoppingCart, DollarSign, Package, AlertTriangle, Truck, Users, FileText, CheckCircle, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', value: 85 },
  { name: 'Feb', value: 92 },
  { name: 'Mar', value: 78 },
  { name: 'Apr', value: 95 },
  { name: 'May', value: 88 },
  { name: 'Jun', value: 98 },
];

export default function DashboardHome() {
  const { user } = useAuth();
  
  if (!user) return <div className="p-8">Loading...</div>;

  switch (user.role) {
    case 'Admin': return <AdminDashboard />;
    case 'Director': return <DirectorDashboard />;
    case 'Accountant': return <AccountantDashboard />;
    case 'Store Manager': return <StoreManagerDashboard />;
    case 'Sales Officer': return <SalesOfficerDashboard />;
    case 'Driver': return <DriverDashboard />;
    default: return <AdminDashboard />;
  }
}

// --------------------------------------------------------
// ADMIN DASHBOARD
// --------------------------------------------------------
function AdminDashboard() {
  return (
    <div className="p-8 space-y-8 fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">System Overview (Admin)</h2>
        <p className="text-slate-500">Complete bird's-eye view of all operations.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Sales Today" value="Rs 124,500" icon={<ShoppingCart />} color="blue" />
        <StatCard title="Total Revenue (MTD)" value="Rs 3.2M" icon={<Activity />} color="green" />
        <StatCard title="Total Expenses" value="Rs 840K" icon={<DollarSign />} color="red" />
        <StatCard title="Profit Summary" value="Rs 2.36M" icon={<LucideBarChart />} color="emerald" />
        <StatCard title="Current Stock Value" value="Rs 5.4M" icon={<Package />} color="indigo" />
        <StatCard title="Pending Cheques" value="12" icon={<Clock />} color="orange" />
        <StatCard title="Customer Outstanding" value="Rs 1.1M" icon={<Users />} color="amber" />
        <StatCard title="Supplier Balances" value="Rs 450K" icon={<Truck />} color="slate" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[300px]">
          <h3 className="font-semibold text-slate-700 mb-4">Vehicle Status & Active Employees</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
              <span className="flex items-center gap-2"><Truck size={16} className="text-blue-500"/> Fleet Active</span>
              <span className="font-bold">4 / 5 Vehicles</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
              <span className="flex items-center gap-2"><Users size={16} className="text-green-500"/> Employees Logged In</span>
              <span className="font-bold">12 Active Users</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[300px] flex flex-col">
          <h3 className="font-semibold text-slate-700 mb-4">System Health & Audit</h3>
          <div className="flex-1 w-full h-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                  formatter={(value: any) => [`${value}%`, 'Health Score']}
                />
                <Area type="monotone" dataKey="value" stroke="#10b981" fill="#d1fae5" strokeWidth={3} activeDot={{ r: 8, strokeWidth: 0, fill: '#10b981' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------
// DIRECTOR DASHBOARD
// --------------------------------------------------------
function DirectorDashboard() {
  return (
    <div className="p-8 space-y-8 fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Business Performance (Director)</h2>
        <p className="text-slate-500">Financial insights and high-level KPIs.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Monthly Sales" value="Rs 3.2M" icon={<LucideBarChart />} color="blue" />
        <StatCard title="Profit & Loss" value="+14%" icon={<Activity />} color="green" />
        <StatCard title="Bank Balances" value="Rs 8.5M" icon={<DollarSign />} color="indigo" />
        <StatCard title="Cash Flow" value="Healthy" icon={<CheckCircle />} color="emerald" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[350px] flex flex-col">
          <h3 className="font-semibold text-slate-700 mb-4">Revenue Growth</h3>
          <div className="flex-1 w-full h-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                  formatter={(value: any) => [`${value}%`, 'Growth']}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#dbeafe" strokeWidth={3} activeDot={{ r: 8, strokeWidth: 0, fill: '#3b82f6' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500"/> Attention Required</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b pb-2"><span className="text-slate-600">Pending Approvals</span><span className="font-bold text-red-500">8 Items</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-slate-600">Pending Payments</span><span className="font-bold">Rs 450K</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Outstanding Receivables</span><span className="font-bold text-amber-600">Rs 1.1M</span></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="font-semibold text-slate-700 mb-2">Top Performers</h3>
             <p className="text-sm text-slate-500">[Top Customers & Products List]</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------
// ACCOUNTANT DASHBOARD
// --------------------------------------------------------
function AccountantDashboard() {
  return (
    <div className="p-8 space-y-8 fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Financial Center (Accountant)</h2>
        <p className="text-slate-500">Cash, banks, and ledgers.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Cash In Hand" value="Rs 125,000" icon={<DollarSign />} color="emerald" />
        <StatCard title="Bank Balances" value="Rs 8,500,000" icon={<DollarSign />} color="blue" />
        <StatCard title="Pending Cheques (Uncleared)" value="12 Cheques" icon={<Clock />} color="amber" />
        <StatCard title="Daily Income" value="Rs 142,000" icon={<Activity />} color="green" />
        <StatCard title="Daily Expenses" value="Rs 15,400" icon={<Activity />} color="red" />
        <StatCard title="Net Cashflow Today" value="+ Rs 126,600" icon={<LucideBarChart />} color="indigo" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><Users size={18}/> Outstanding Ledgers</h3>
           <div className="flex justify-between items-center p-4 bg-red-50 text-red-800 rounded mb-3">
              <span>Customer Outstanding (Receivables)</span>
              <span className="font-bold">Rs 1,100,000</span>
           </div>
           <div className="flex justify-between items-center p-4 bg-orange-50 text-orange-800 rounded">
              <span>Supplier Outstanding (Payables)</span>
              <span className="font-bold">Rs 450,000</span>
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center text-center text-slate-500">
          <FileText size={48} className="mx-auto mb-4 text-slate-300" />
          <p>Generate Trial Balance, General Ledger, or P&L from the Reports module.</p>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------
// STORE MANAGER DASHBOARD
// --------------------------------------------------------
function StoreManagerDashboard() {
  return (
    <div className="p-8 space-y-8 fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Warehouse Operations (Store Manager)</h2>
        <p className="text-slate-500">Inventory flow and stock health.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Products" value="1,245" icon={<Package />} color="blue" />
        <StatCard title="Low Stock Alerts" value="28 Items" icon={<AlertTriangle />} color="red" />
        <StatCard title="GRN Pending" value="5" icon={<Clock />} color="amber" />
        <StatCard title="Goods Return Pending" value="2" icon={<Clock />} color="orange" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[300px]">
           <h3 className="font-semibold text-slate-700 mb-4">Stock Health</h3>
           <div className="space-y-4">
             <div className="w-full bg-slate-100 rounded-full h-4"><div className="bg-green-500 h-4 rounded-full" style={{width: '85%'}}></div></div>
             <p className="text-sm text-slate-600">85% of inventory is available and healthy.</p>
             <div className="flex gap-4 mt-6">
                <div className="p-3 border rounded-lg flex-1 text-center border-red-200 bg-red-50 text-red-700">
                  <div className="text-2xl font-bold">12</div><div className="text-xs">Expiry Alerts</div>
                </div>
                <div className="p-3 border rounded-lg flex-1 text-center border-orange-200 bg-orange-50 text-orange-700">
                  <div className="text-2xl font-bold">4</div><div className="text-xs">Damaged Products</div>
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------
// SALES OFFICER DASHBOARD
// --------------------------------------------------------
function SalesOfficerDashboard() {
  return (
    <div className="p-8 space-y-8 fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Sales Hub (Sales Officer)</h2>
        <p className="text-slate-500">Your daily targets and customer metrics.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Today's Sales" value="Rs 45,000" icon={<ShoppingCart />} color="emerald" />
        <StatCard title="Monthly Sales" value="Rs 680,000" icon={<Activity />} color="blue" />
        <StatCard title="Daily Target Progress" value="85%" icon={<LucideBarChart />} color="indigo" />
        <StatCard title="Customer Visits" value="14 / 20" icon={<Users />} color="green" />
        <StatCard title="Outstanding Customers" value="8" icon={<AlertTriangle />} color="amber" />
        <StatCard title="Collection Summary" value="Rs 25,000" icon={<DollarSign />} color="slate" />
      </div>
    </div>
  );
}

// --------------------------------------------------------
// DRIVER DASHBOARD
// --------------------------------------------------------
function DriverDashboard() {
  return (
    <div className="p-8 space-y-8 fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Delivery Route (Driver)</h2>
      </div>
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-slate-500 text-center">Delivery module mobile view coming soon.</p>
      </div>
    </div>
  );
}

// --------------------------------------------------------
// SHARED WIDGETS
// --------------------------------------------------------
function StatCard({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    red: 'bg-red-100 text-red-600',
    amber: 'bg-amber-100 text-amber-600',
    orange: 'bg-orange-100 text-orange-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`p-4 rounded-full ${colorMap[color] || colorMap.blue}`}>
        {icon}
      </div>
      <div>
        <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
        <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      </div>
    </div>
  );
}
