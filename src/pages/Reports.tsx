import { useState, useEffect, useRef, type ReactNode } from 'react';
import { BarChart, TrendingUp, AlertCircle, ShoppingBag, DollarSign, Download, Calendar, FileText } from 'lucide-react';
import PdfActions from '../components/PdfActions';
import { getErpApi } from '../lib/erpApi';
import { COMPANY, companyFooter } from '../lib/companyProfile';

type ReportKind =
  | 'overview'
  | 'sales'
  | 'purchase'
  | 'inventory'
  | 'customers'
  | 'suppliers'
  | 'visits'
  | 'fleet';

type ReportData = {
  todaySales: number;
  totalSales: number;
  totalCustomerDebt: number;
  totalSupplierDebt: number;
  salesChart: { date: string; total: number }[];
  topProducts: { name: string; qty_sold: number; revenue: number }[];
};

const emptyReport: ReportData = {
  todaySales: 0,
  totalSales: 0,
  totalCustomerDebt: 0,
  totalSupplierDebt: 0,
  salesChart: [],
  topProducts: [],
};

const REPORT_TABS: { id: ReportKind; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'sales', label: 'Sales' },
  { id: 'purchase', label: 'Purchases' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'customers', label: 'Customers' },
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'visits', label: 'Route Visits' },
  { id: 'fleet', label: 'Fleet' },
];

export default function Reports() {
  const api = getErpApi();
  const printRef = useRef<HTMLDivElement>(null);
  const [kind, setKind] = useState<ReportKind>('overview');
  const [data, setData] = useState<ReportData>(emptyReport);
  const [extended, setExtended] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [fuel, setFuel] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!api) {
        setError('Reports are unavailable in this environment.');
        setData(emptyReport);
        return;
      }
      const reportData = await api.getReportData();
      setData({
        todaySales: Number(reportData?.todaySales) || 0,
        totalSales: Number(reportData?.totalSales) || 0,
        totalCustomerDebt: Number(reportData?.totalCustomerDebt) || 0,
        totalSupplierDebt: Number(reportData?.totalSupplierDebt) || 0,
        salesChart: Array.isArray(reportData?.salesChart)
          ? reportData.salesChart.map((d: any) => ({ date: d.date, total: Number(d.total) || 0 }))
          : [],
        topProducts: Array.isArray(reportData?.topProducts)
          ? reportData.topProducts.map((p: any) => ({
              name: p.name,
              qty_sold: Number(p.qty_sold) || 0,
              revenue: Number(p.revenue) || 0,
            }))
          : [],
      });

      if (api.getExtendedReport) setExtended(await api.getExtendedReport({ from, to }));
      if (api.getCustomers) setCustomers(await api.getCustomers());
      if (api.getSuppliers) setSuppliers(await api.getSuppliers());
      if (api.getProducts) setProducts(await api.getProducts());
      if (api.getCustomerVisits) setVisits(await api.getCustomerVisits({}));
      if (api.getVehicles) setVehicles(await api.getVehicles());
      if (api.getVehicleFuel) setFuel(await api.getVehicleFuel());
      if (api.getVehicleExpenses) setExpenses(await api.getVehicleExpenses());
    } catch (e: any) {
      console.error('Reports fetch error:', e);
      setError(e?.message || 'Failed to load reports');
      setData(emptyReport);
    } finally {
      setLoading(false);
    }
  };

  const inRange = (iso?: string) => {
    if (!iso) return true;
    const d = iso.slice(0, 10);
    return d >= from && d <= to;
  };

  const periodSales = (extended?.sales || []).filter((s: any) => inRange(s.created_at));
  const periodPurchases = (extended?.purchases || []).filter((p: any) => inRange(p.created_at));
  const periodVisits = visits.filter((v) => inRange(v.visited_at));
  const lowStock = products.filter((p) => (p.stock_quantity || 0) <= (p.low_stock_threshold ?? 10));
  const outstandingCustomers = customers
    .filter((c) => (c.outstanding_balance || 0) > 0)
    .sort((a, b) => (b.outstanding_balance || 0) - (a.outstanding_balance || 0));
  const outstandingSuppliers = suppliers
    .filter((s) => (s.balance || 0) > 0)
    .sort((a, b) => (b.balance || 0) - (a.balance || 0));

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      ['Report Kind', kind],
      ['Period', from, to],
      [],
    ];
    if (kind === 'overview' || kind === 'sales') {
      rows.push(['Metric', 'Value'], ['Today Sales', data.todaySales], ['Total Sales', data.totalSales], ['Period Sales', extended?.salesTotal ?? '']);
      rows.push([], ['Invoice', 'Net', 'Date']);
      periodSales.forEach((s: any) => rows.push([s.invoice_number, s.net_amount, s.created_at]));
    }
    if (kind === 'purchase') {
      rows.push(['GRN', 'Amount', 'Date']);
      periodPurchases.forEach((p: any) => rows.push([p.grn_number, p.total_amount, p.created_at]));
    }
    if (kind === 'inventory') {
      rows.push(['Product', 'Stock', 'Threshold']);
      lowStock.forEach((p) => rows.push([p.name, p.stock_quantity, p.low_stock_threshold ?? 10]));
    }
    if (kind === 'customers') {
      rows.push(['Shop', 'Outstanding', 'Credit Limit']);
      outstandingCustomers.forEach((c) => rows.push([c.shop_name, c.outstanding_balance, c.credit_limit]));
    }
    if (kind === 'suppliers') {
      rows.push(['Supplier', 'Balance']);
      outstandingSuppliers.forEach((s) => rows.push([s.name, s.balance]));
    }
    if (kind === 'visits') {
      rows.push(['Shop', 'Reason', 'Method', 'When']);
      periodVisits.forEach((v) => rows.push([v.shop_name, v.reason, v.method, v.visited_at]));
    }
    if (kind === 'fleet') {
      rows.push(['Vehicle', 'Driver', 'Insurance', 'License']);
      vehicles.forEach((v) => rows.push([v.registration_number, v.driver_name, v.insurance_expiry, v.revenue_license_expiry]));
    }
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erp-${kind}-report-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-8">Loading Reports...</div>;

  if (error) {
    return (
      <div className="p-8 space-y-4">
        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700">⚠️ {error}</div>
        <button onClick={loadData} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Retry</button>
      </div>
    );
  }

  const title = REPORT_TABS.find((t) => t.id === kind)?.label || 'Report';

  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col overflow-auto bg-slate-50">
      <div className="flex flex-col gap-4 mb-6 print:hidden">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><FileText /> Business Reports</h2>
            <p className="text-slate-500">All report types — download PDF, print, or export CSV.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="text-xs text-slate-500 flex items-center gap-1"><Calendar size={12} /> From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded-md px-3 py-2 block" />
            </div>
            <div>
              <label className="text-xs text-slate-500">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded-md px-3 py-2 block" />
            </div>
            <button onClick={loadData} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-md font-medium">Apply</button>
            <button onClick={exportCsv} className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium flex items-center gap-1"><Download size={16} /> Excel/CSV</button>
            <PdfActions
              targetRef={printRef}
              filename={`ERP-${kind}-Report-${from}-to-${to}.pdf`}
              printTitle={`${title} Report ${from} – ${to}`}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {REPORT_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setKind(t.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${kind === t.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Printable / PDF capture area */}
      <div ref={printRef} id="report-print-area" className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 md:p-8 space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <div className="text-xs text-slate-500">{COMPANY.displayName}</div>
          <h3 className="text-xl font-bold text-slate-900">{title} Report</h3>
          <p className="text-sm text-slate-600">Period: {from} to {to} · Generated {new Date().toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">{COMPANY.address} · {COMPANY.phone} · {COMPANY.email}</p>
        </div>

        {(kind === 'overview') && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Kpi icon={<DollarSign className="text-blue-600" size={20} />} label="Today's Sales" value={`LKR ${data.todaySales.toFixed(2)}`} />
              <Kpi icon={<TrendingUp className="text-green-600" size={20} />} label="Total Sales" value={`LKR ${data.totalSales.toFixed(2)}`} />
              <Kpi icon={<AlertCircle className="text-orange-600" size={20} />} label="Customer Outstanding" value={`LKR ${data.totalCustomerDebt.toFixed(2)}`} />
              <Kpi icon={<ShoppingBag className="text-red-600" size={20} />} label="Supplier Debt" value={`LKR ${data.totalSupplierDebt.toFixed(2)}`} />
            </div>
            {extended && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Kpi label="Period Sales" value={`LKR ${Number(extended.salesTotal || 0).toFixed(2)}`} />
                <Kpi label="Period Purchases" value={`LKR ${Number(extended.purchaseTotal || 0).toFixed(2)}`} />
                <Kpi label="Visits" value={String(extended.visitCount || 0)} />
                <Kpi label="Invoices" value={String(extended.salesCount || 0)} />
              </div>
            )}
            <Section title="Top Products">
              <SimpleTable headers={['#', 'Product', 'Qty', 'Revenue']} rows={data.topProducts.map((p, i) => [i + 1, p.name, p.qty_sold, `LKR ${p.revenue.toFixed(2)}`])} />
            </Section>
          </>
        )}

        {kind === 'sales' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Kpi label="Period Sales Total" value={`LKR ${Number(extended?.salesTotal || 0).toFixed(2)}`} />
              <Kpi label="Invoice Count" value={String(periodSales.length)} />
              <Kpi label="Today" value={`LKR ${data.todaySales.toFixed(2)}`} />
            </div>
            <Section title="Sales invoices in period">
              <SimpleTable
                headers={['Invoice', 'Net Amount', 'Type', 'Status', 'Date']}
                rows={periodSales.map((s: any) => [s.invoice_number, `LKR ${Number(s.net_amount || 0).toFixed(2)}`, s.sale_type, s.status, s.created_at?.slice(0, 10)])}
              />
            </Section>
            <Section title="Top products">
              <SimpleTable headers={['Product', 'Qty', 'Revenue']} rows={data.topProducts.map((p) => [p.name, p.qty_sold, `LKR ${p.revenue.toFixed(2)}`])} />
            </Section>
          </>
        )}

        {kind === 'purchase' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Kpi label="Period Purchases" value={`LKR ${Number(extended?.purchaseTotal || 0).toFixed(2)}`} />
              <Kpi label="GRN Count" value={String(periodPurchases.length)} />
            </div>
            <Section title="Goods received notes">
              <SimpleTable
                headers={['GRN #', 'Amount', 'Status', 'Date']}
                rows={periodPurchases.map((p: any) => [p.grn_number, `LKR ${Number(p.total_amount || 0).toFixed(2)}`, p.status, p.created_at?.slice(0, 10)])}
              />
            </Section>
          </>
        )}

        {kind === 'inventory' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Kpi label="Products" value={String(products.length)} />
              <Kpi label="Low Stock Items" value={String(lowStock.length)} />
            </div>
            <Section title="Low stock alerts">
              <SimpleTable
                headers={['Product', 'Stock', 'Threshold', 'Barcode']}
                rows={lowStock.map((p) => [p.name, p.stock_quantity, p.low_stock_threshold ?? 10, p.barcode || '-'])}
              />
            </Section>
            <Section title="All products (stock)">
              <SimpleTable
                headers={['Product', 'Stock', 'Selling Price']}
                rows={products.slice(0, 100).map((p) => [p.name, p.stock_quantity, `LKR ${Number(p.selling_price || 0).toFixed(2)}`])}
              />
            </Section>
          </>
        )}

        {kind === 'customers' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Kpi label="Customers" value={String(customers.length)} />
              <Kpi label="Total Outstanding" value={`LKR ${data.totalCustomerDebt.toFixed(2)}`} />
            </div>
            <Section title="Customer outstanding aging list">
              <SimpleTable
                headers={['Shop', 'Owner', 'Outstanding', 'Credit Limit', 'Route']}
                rows={outstandingCustomers.map((c) => [c.shop_name, c.owner_name, `LKR ${Number(c.outstanding_balance || 0).toFixed(2)}`, `LKR ${Number(c.credit_limit || 0).toFixed(2)}`, c.route || '-'])}
              />
            </Section>
          </>
        )}

        {kind === 'suppliers' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Kpi label="Suppliers" value={String(suppliers.length)} />
              <Kpi label="Total Payable" value={`LKR ${data.totalSupplierDebt.toFixed(2)}`} />
            </div>
            <Section title="Supplier balances">
              <SimpleTable
                headers={['Supplier', 'Contact', 'Balance']}
                rows={outstandingSuppliers.map((s) => [s.name, s.contact_person || s.contact_number || '-', `LKR ${Number(s.balance || 0).toFixed(2)}`])}
              />
            </Section>
          </>
        )}

        {kind === 'visits' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Kpi label="Visits in period" value={String(periodVisits.length)} />
              <Kpi label="QR visits" value={String(periodVisits.filter((v) => v.method === 'qr').length)} />
            </div>
            <Section title="Customer visit history">
              <SimpleTable
                headers={['Shop', 'Reason', 'Method', 'GPS', 'When']}
                rows={periodVisits.map((v) => [
                  v.shop_name,
                  v.reason || '-',
                  v.method,
                  v.latitude != null ? `${Number(v.latitude).toFixed(4)}, ${Number(v.longitude).toFixed(4)}` : '-',
                  v.visited_at ? new Date(v.visited_at).toLocaleString() : '-',
                ])}
              />
            </Section>
          </>
        )}

        {kind === 'fleet' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Kpi label="Vehicles" value={String(vehicles.length)} />
              <Kpi label="Fuel entries" value={String(fuel.length)} />
              <Kpi label="Expenses" value={String(expenses.length)} />
            </div>
            <Section title="Fleet register">
              <SimpleTable
                headers={['Reg No', 'Driver', 'Insurance Expiry', 'License Expiry', 'Status']}
                rows={vehicles.map((v) => [v.registration_number, v.driver_name || '-', v.insurance_expiry || '-', v.revenue_license_expiry || '-', v.status || 'Active'])}
              />
            </Section>
            <Section title="Recent fuel">
              <SimpleTable
                headers={['Vehicle', 'Liters', 'Amount', 'Date']}
                rows={fuel.slice(0, 50).map((f) => [f.registration_number || f.vehicle_id, f.liters, `LKR ${Number(f.amount || 0).toFixed(2)}`, f.fuel_date])}
              />
            </Section>
          </>
        )}

        <div className="pt-4 border-t text-xs text-slate-400 text-center">
          Confidential — {companyFooter()}
        </div>
      </div>

      {/* Keep chart for overview on screen only (canvas capture still works from printRef tables) */}
      {kind === 'overview' && data.salesChart.length > 0 && (
        <div className="mt-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:hidden">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><BarChart size={20} className="text-slate-400"/> Last 7 Days Sales Trend</h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {data.salesChart.map((day: any, i: number) => {
              const maxVal = Math.max(...data.salesChart.map((d: any) => d.total), 1);
              const heightPercentage = (day.total / maxVal) * 100;
              return (
                <div key={i} className="flex flex-col items-center flex-1 group">
                  <div className="text-xs text-slate-400 font-medium mb-2 opacity-0 group-hover:opacity-100 whitespace-nowrap">LKR {day.total.toFixed(0)}</div>
                  <div className="w-full bg-blue-500 rounded-t-md" style={{ height: `${Math.max(5, heightPercentage)}%` }}></div>
                  <div className="text-xs text-slate-500 mt-3 font-medium">{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
      {icon && <div className="mb-2">{icon}</div>}
      <div className="text-xs text-slate-500 font-medium">{label}</div>
      <div className="text-lg font-bold text-slate-900 mt-1">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="font-semibold text-slate-800 mb-2">{title}</h4>
      {children}
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  if (!rows.length) {
    return <div className="text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg p-6 text-center">No data for this period.</div>;
  }
  return (
    <div className="overflow-auto border border-slate-200 rounded-lg">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-100">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold text-slate-700 border-b">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="odd:bg-white even:bg-slate-50">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 border-b border-slate-100 text-slate-800">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
