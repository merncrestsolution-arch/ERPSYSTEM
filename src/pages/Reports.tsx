import { useState, useEffect } from 'react';
import { BarChart, TrendingUp, AlertCircle, ShoppingBag, DollarSign } from 'lucide-react';

export default function Reports() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        const reportData = await window.electronAPI.getReportData();
        setData(reportData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading Reports...</div>;
  if (!data) return <div className="p-8">Error loading reports.</div>;

  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col overflow-auto bg-slate-50">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Business Reports</h2>
          <p className="text-slate-500">Overview of sales, inventory, and financial health.</p>
        </div>
        <button 
          onClick={loadData}
          className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 shadow-sm transition-colors w-full sm:w-auto"
        >
          Refresh Data
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="text-blue-600" size={24} />
            </div>
          </div>
          <div className="text-slate-500 text-sm font-medium mb-1">Today's Sales</div>
          <div className="text-3xl font-bold text-slate-800">LKR {data.todaySales.toFixed(2)}</div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>
          <div className="text-slate-500 text-sm font-medium mb-1">Total Sales (All Time)</div>
          <div className="text-3xl font-bold text-slate-800">LKR {data.totalSales.toFixed(2)}</div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="text-orange-600" size={24} />
            </div>
          </div>
          <div className="text-slate-500 text-sm font-medium mb-1">Customer Outstanding (To Receive)</div>
          <div className="text-3xl font-bold text-slate-800">LKR {data.totalCustomerDebt.toFixed(2)}</div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <ShoppingBag className="text-red-600" size={24} />
            </div>
          </div>
          <div className="text-slate-500 text-sm font-medium mb-1">Supplier Debt (To Pay)</div>
          <div className="text-3xl font-bold text-slate-800">LKR {data.totalSupplierDebt.toFixed(2)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 mb-8">
        {/* Sales Chart (Mock visualization using HTML/CSS) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><BarChart size={20} className="text-slate-400"/> Last 7 Days Sales Trend</h3>
          
          {data.salesChart.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 border border-dashed border-slate-300 rounded-lg">
              No sales data for the last 7 days.
            </div>
          ) : (
            <div className="h-64 flex items-end justify-between gap-2">
              {data.salesChart.map((day: any, i: number) => {
                const maxVal = Math.max(...data.salesChart.map((d: any) => d.total));
                const heightPercentage = maxVal === 0 ? 0 : (day.total / maxVal) * 100;
                
                return (
                  <div key={i} className="flex flex-col items-center flex-1 group">
                    <div className="text-xs text-slate-400 font-medium mb-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      LKR {day.total.toFixed(0)}
                    </div>
                    <div 
                      className="w-full bg-blue-500 rounded-t-md hover:bg-blue-600 transition-colors relative"
                      style={{ height: `${Math.max(5, heightPercentage)}%` }}
                    ></div>
                    <div className="text-xs text-slate-500 mt-3 font-medium">
                      {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><ShoppingBag size={20} className="text-slate-400"/> Top Selling Products</h3>
          <div className="space-y-4">
            {data.topProducts.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No sales recorded yet.</div>
            ) : (
              data.topProducts.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.qty_sold} units sold</div>
                    </div>
                  </div>
                  <div className="font-bold text-green-600">
                    LKR {p.revenue.toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
