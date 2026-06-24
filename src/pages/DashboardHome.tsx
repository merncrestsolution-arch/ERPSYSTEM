import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart as LucideBarChart, Activity, ShoppingCart, DollarSign, Package, AlertTriangle, Truck, Users, FileText, CheckCircle, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ReportData {
  totalSales: number;
  totalCustomerDebt: number;
  totalSupplierDebt: number;
  todaySales: number;
  salesChart: { date: string; total: number }[];
  topProducts: { name: string; qty_sold: number; revenue: number }[];
}

interface DashboardData {
  report: ReportData;
  totalProducts: number;
  lowStockCount: number;
  stockValue: number;
  pendingChequeCount: number;
  pendingChequeValue: number;
  pendingApprovalCount: number;
  pendingGrnCount: number;
  pendingGrtnCount: number;
}

const LOW_STOCK_THRESHOLD = 10;

const NA = '—';

function fmtCurrency(n: number | null | undefined): string {
  return `Rs ${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function useDashboardData(): { data: DashboardData | null; loading: boolean } {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        // @ts-ignore - electronAPI is provided by the preload bridge (desktop) or Supabase shim (web)
        const api = window.electronAPI;
        if (!api) {
          setLoading(false);
          return;
        }

        const [report, products, cheques, approvals] = await Promise.all([
          api.getReportData(),
          api.getProducts(),
          api.getCheques(),
          api.getPendingApprovals(),
        ]);

        if (cancelled) return;

        const productList = products || [];
        const chequeList = cheques || [];
        const approvalList = approvals || [];

        setData({
          report: report || {
            totalSales: 0,
            totalCustomerDebt: 0,
            totalSupplierDebt: 0,
            todaySales: 0,
            salesChart: [],
            topProducts: [],
          },
          totalProducts: productList.length,
          lowStockCount: productList.filter((p: any) => (p.stock_quantity || 0) <= LOW_STOCK_THRESHOLD).length,
          stockValue: productList.reduce((sum: number, p: any) => sum + (p.stock_quantity || 0) * (p.cost_price || 0), 0),
          pendingChequeCount: chequeList.filter((c: any) => c.status === 'Pending').length,
          pendingChequeValue: chequeList.filter((c: any) => c.status === 'Pending').reduce((sum: number, c: any) => sum + (c.amount || 0), 0),
          pendingApprovalCount: approvalList.length,
          pendingGrnCount: approvalList.filter((a: any) => a.type === 'GRN').length,
          pendingGrtnCount: approvalList.filter((a: any) => a.type === 'GRTN').length,
        });
      } catch (e) {
        console.error('Failed to load dashboard data', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}

export default function DashboardHome() {
  const { user } = useAuth();
  const { data, loading } = useDashboardData();

  if (!user) return <div className="p-8">Loading...</div>;
  if (loading || !data) return <div className="p-8 text-slate-500">Loading dashboard...</div>;

  switch (user.role) {
    case 'Admin': return <AdminDashboard data={data} />;
    case 'Director': return <DirectorDashboard data={data} />;
    case 'Accountant': return <AccountantDashboard data={data} />;
    case 'Store Manager': return <StoreManagerDashboard data={data} />;
    case 'Sales Officer': return <SalesOfficerDashboard data={data} />;
    case 'Driver': return <DriverDashboard />;
    default: return <AdminDashboard data={data} />;
  }
}

// Converts the report's sales-by-day series into chart-friendly points.
function toChartData(salesChart: { date: string; total: number }[]) {
  return salesChart.map((point) => ({
    name: new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    value: point.total,
  }));
}

function SalesChart({ data, color }: { data: { name: string; value: number }[]; color: string }) {
  if (data.length === 0) {
    return (
      <div className="flex-1 w-full flex items-center justify-center text-slate-400 text-sm">
        No sales recorded yet.
      </div>
    );
  }
  const fill = color === 'blue' ? '#dbeafe' : '#d1fae5';
  const stroke = color === 'blue' ? '#3b82f6' : '#10b981';
  return (
    <div className="flex-1 w-full h-full min-h-0 chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            itemStyle={{ color: '#0f172a', fontWeight: 600 }}
            formatter={(value: any) => [fmtCurrency(value), 'Sales']}
          />
          <Area type="monotone" dataKey="value" stroke={stroke} fill={fill} strokeWidth={3} activeDot={{ r: 8, strokeWidth: 0, fill: stroke }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// --------------------------------------------------------
// ADMIN DASHBOARD
// --------------------------------------------------------
function AdminDashboard({ data }: { data: DashboardData }) {
  const { report } = data;
  return (
    <div className="p-4 md:p-8 space-y-8 fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">System Overview (Admin)</h2>
        <p className="text-slate-500">Complete bird's-eye view of all operations.</p>
      </div>
      <div className="kpi-grid md:gap-6">
        <StatCard title="Total Sales Today" value={fmtCurrency(report.todaySales)} icon={<ShoppingCart />} color="blue" />
        <StatCard title="Total Revenue (All-Time)" value={fmtCurrency(report.totalSales)} icon={<Activity />} color="green" />
        <StatCard title="Current Stock Value" value={fmtCurrency(data.stockValue)} icon={<Package />} color="indigo" />
        <StatCard title="Pending Cheques" value={`${data.pendingChequeCount}`} icon={<Clock />} color="orange" />
        <StatCard title="Customer Outstanding" value={fmtCurrency(report.totalCustomerDebt)} icon={<Users />} color="amber" />
        <StatCard title="Supplier Balances" value={fmtCurrency(report.totalSupplierDebt)} icon={<Truck />} color="slate" />
        <StatCard title="Pending Approvals" value={`${data.pendingApprovalCount}`} icon={<CheckCircle />} color="red" />
        <StatCard title="Total Products" value={`${data.totalProducts}`} icon={<Package />} color="emerald" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[300px]">
          <h3 className="font-semibold text-slate-700 mb-4">Top Selling Products</h3>
          <TopProducts products={report.topProducts} />
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[300px] flex flex-col">
          <h3 className="font-semibold text-slate-700 mb-4">Recent Sales Trend</h3>
          <SalesChart data={toChartData(report.salesChart)} color="green" />
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------
// DIRECTOR DASHBOARD
// --------------------------------------------------------
function DirectorDashboard({ data }: { data: DashboardData }) {
  const { report } = data;
  return (
    <div className="p-4 md:p-8 space-y-8 fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Business Performance (Director)</h2>
        <p className="text-slate-500">Financial insights and high-level KPIs.</p>
      </div>
      <div className="kpi-grid md:gap-6">
        <StatCard title="Total Sales" value={fmtCurrency(report.totalSales)} icon={<LucideBarChart />} color="blue" />
        <StatCard title="Sales Today" value={fmtCurrency(report.todaySales)} icon={<Activity />} color="green" />
        <StatCard title="Receivables" value={fmtCurrency(report.totalCustomerDebt)} icon={<Users />} color="amber" />
        <StatCard title="Payables" value={fmtCurrency(report.totalSupplierDebt)} icon={<Truck />} color="indigo" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[350px] flex flex-col">
          <h3 className="font-semibold text-slate-700 mb-4">Revenue Trend</h3>
          <SalesChart data={toChartData(report.salesChart)} color="blue" />
        </div>
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> Attention Required</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b pb-2"><span className="text-slate-600">Pending Approvals</span><span className="font-bold text-red-500">{data.pendingApprovalCount} Items</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-slate-600">Supplier Payables</span><span className="font-bold">{fmtCurrency(report.totalSupplierDebt)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Outstanding Receivables</span><span className="font-bold text-amber-600">{fmtCurrency(report.totalCustomerDebt)}</span></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-700 mb-2">Top Selling Products</h3>
            <TopProducts products={report.topProducts} />
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------
// ACCOUNTANT DASHBOARD
// --------------------------------------------------------
function AccountantDashboard({ data }: { data: DashboardData }) {
  const { report } = data;
  return (
    <div className="p-4 md:p-8 space-y-8 fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Financial Center (Accountant)</h2>
        <p className="text-slate-500">Cash, banks, and ledgers.</p>
      </div>
      <div className="kpi-grid md:gap-6">
        <StatCard title="Sales Today" value={fmtCurrency(report.todaySales)} icon={<Activity />} color="green" />
        <StatCard title="Total Sales" value={fmtCurrency(report.totalSales)} icon={<LucideBarChart />} color="blue" />
        <StatCard title="Pending Cheques (Uncleared)" value={`${data.pendingChequeCount} Cheques`} icon={<Clock />} color="amber" />
        <StatCard title="Pending Cheque Value" value={fmtCurrency(data.pendingChequeValue)} icon={<DollarSign />} color="emerald" />
        <StatCard title="Receivables" value={fmtCurrency(report.totalCustomerDebt)} icon={<Users />} color="red" />
        <StatCard title="Payables" value={fmtCurrency(report.totalSupplierDebt)} icon={<Truck />} color="orange" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><Users size={18} /> Outstanding Ledgers</h3>
          <div className="flex justify-between items-center p-4 bg-red-50 text-red-800 rounded mb-3">
            <span>Customer Outstanding (Receivables)</span>
            <span className="font-bold">{fmtCurrency(report.totalCustomerDebt)}</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-orange-50 text-orange-800 rounded">
            <span>Supplier Outstanding (Payables)</span>
            <span className="font-bold">{fmtCurrency(report.totalSupplierDebt)}</span>
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
function StoreManagerDashboard({ data }: { data: DashboardData }) {
  const healthyPct = data.totalProducts > 0
    ? Math.round(((data.totalProducts - data.lowStockCount) / data.totalProducts) * 100)
    : 0;
  return (
    <div className="p-4 md:p-8 space-y-8 fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Warehouse Operations (Store Manager)</h2>
        <p className="text-slate-500">Inventory flow and stock health.</p>
      </div>
      <div className="kpi-grid md:gap-6">
        <StatCard title="Total Products" value={`${data.totalProducts}`} icon={<Package />} color="blue" />
        <StatCard title="Low Stock Alerts" value={`${data.lowStockCount} Items`} icon={<AlertTriangle />} color="red" />
        <StatCard title="GRN Pending" value={`${data.pendingGrnCount}`} icon={<Clock />} color="amber" />
        <StatCard title="Goods Return Pending" value={`${data.pendingGrtnCount}`} icon={<Clock />} color="orange" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[300px]">
          <h3 className="font-semibold text-slate-700 mb-4">Stock Health</h3>
          <div className="space-y-4">
            <div className="w-full bg-slate-100 rounded-full h-4"><div className="bg-green-500 h-4 rounded-full" style={{ width: `${healthyPct}%` }}></div></div>
            <p className="text-sm text-slate-600">{healthyPct}% of products are above the low-stock threshold ({LOW_STOCK_THRESHOLD} units).</p>
            <div className="flex gap-4 mt-6">
              <div className="p-3 border rounded-lg flex-1 text-center border-red-200 bg-red-50 text-red-700">
                <div className="text-2xl font-bold">{data.lowStockCount}</div><div className="text-xs">Low Stock</div>
              </div>
              <div className="p-3 border rounded-lg flex-1 text-center border-blue-200 bg-blue-50 text-blue-700">
                <div className="text-2xl font-bold">{data.totalProducts}</div><div className="text-xs">Total SKUs</div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[300px]">
          <h3 className="font-semibold text-slate-700 mb-4">Stock Value</h3>
          <p className="text-3xl font-bold text-slate-800">{fmtCurrency(data.stockValue)}</p>
          <p className="text-sm text-slate-500 mt-1">Total cost value of inventory on hand.</p>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------
// SALES OFFICER DASHBOARD
// --------------------------------------------------------
function SalesOfficerDashboard({ data }: { data: DashboardData }) {
  const { report } = data;
  return (
    <div className="p-4 md:p-8 space-y-8 fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Sales Hub (Sales Officer)</h2>
        <p className="text-slate-500">Your daily targets and customer metrics.</p>
      </div>
      <div className="kpi-grid md:gap-6">
        <StatCard title="Today's Sales" value={fmtCurrency(report.todaySales)} icon={<ShoppingCart />} color="emerald" />
        <StatCard title="Total Sales" value={fmtCurrency(report.totalSales)} icon={<Activity />} color="blue" />
        <StatCard title="Customer Outstanding" value={fmtCurrency(report.totalCustomerDebt)} icon={<AlertTriangle />} color="amber" />
        <StatCard title="Daily Target Progress" value={NA} icon={<LucideBarChart />} color="indigo" />
      </div>
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[300px] flex flex-col">
        <h3 className="font-semibold text-slate-700 mb-4">Recent Sales Trend</h3>
        <SalesChart data={toChartData(report.salesChart)} color="green" />
      </div>
    </div>
  );
}

// --------------------------------------------------------
// DRIVER DASHBOARD
// --------------------------------------------------------
function DriverDashboard() {
  return (
    <div className="p-4 md:p-8 space-y-8 fade-in">
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
function TopProducts({ products }: { products: { name: string; qty_sold: number; revenue: number }[] }) {
  if (!products || products.length === 0) {
    return <p className="text-sm text-slate-400">No sales data yet.</p>;
  }
  return (
    <div className="space-y-2">
      {products.map((p, i) => (
        <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded text-sm">
          <span className="flex items-center gap-2 text-slate-700">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
            {p.name}
          </span>
          <span className="font-semibold text-slate-800">{fmtCurrency(p.revenue)} <span className="text-slate-400 font-normal">({p.qty_sold})</span></span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string, icon: ReactNode, color: string }) {
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
