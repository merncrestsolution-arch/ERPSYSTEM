import React from 'react';

export default function DashboardHome() {
  return (
    <div className="p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Sales Today" value="$12,450" trend="+14%" />
        <StatCard title="Active Orders" value="142" trend="+5%" />
        <StatCard title="Low Stock Items" value="28" trend="-2%" alert />
        <StatCard title="Pending Cheques" value="$45,200" trend="0%" />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 h-96 flex items-center justify-center text-slate-400">
        [Chart Area Placeholder: Revenue Analysis]
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, alert = false }: { title: string, value: string, trend: string, alert?: boolean }) {
  return (
    <div className={`bg-white rounded-lg p-6 shadow-sm border ${alert ? 'border-red-200' : 'border-slate-200'}`}>
      <h3 className="text-slate-500 text-sm font-medium mb-2">{title}</h3>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold text-slate-800">{value}</span>
        <span className={`text-sm font-medium ${trend.startsWith('+') ? 'text-green-600' : trend.startsWith('-') ? 'text-red-600' : 'text-slate-500'}`}>
          {trend}
        </span>
      </div>
    </div>
  );
}
