import { useEffect, useState } from 'react';
import { Bell, Shield, Download, Sparkles } from 'lucide-react';
import { getErpApi } from '../lib/erpApi';
import { useAuth } from '../context/AuthContext';
import PdfActions from '../components/PdfActions';
import { COMPANY } from '../lib/companyProfile';

export default function AdminHub() {
  const api = getErpApi();
  const { user } = useAuth();
  const [tab, setTab] = useState<'reports' | 'notifications' | 'audit' | 'ai'>('reports');
  const [from, setFrom] = useState(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [nTitle, setNTitle] = useState('');
  const [nBody, setNBody] = useState('');
  const [nChannel, setNChannel] = useState('in_app');
  const [backupMsg, setBackupMsg] = useState('');

  const load = async () => {
    setNotifications(await api.getNotifications(user?.id));
    setAudits(await api.getAuditLogs());
  };
  useEffect(() => { load(); }, []);

  const runReport = async () => setReport(await api.getExtendedReport({ from, to }));

  const exportCsv = () => {
    if (!report) return;
    const rows = [['Metric', 'Value'], ['Sales Total', report.salesTotal], ['Purchase Total', report.purchaseTotal], ['Visits', report.visitCount], ['Sales Count', report.salesCount]];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `erp-report-${from}-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 w-full">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Reports, Security & AI</h2>
        <p className="text-slate-500">Extended analytics, notifications, audit logs, and AI placeholders.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {([['reports', 'Reports'], ['notifications', 'Notifications'], ['audit', 'Audit / Backup'], ['ai', 'AI (Future)']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-3 py-1.5 rounded-md text-sm font-medium ${tab === id ? 'bg-blue-600 text-white' : 'bg-white border text-slate-700'}`}>{label}</button>
        ))}
      </div>

      {tab === 'reports' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-end">
            <div><label className="text-xs text-slate-500">From</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded-md px-3 py-2 block" /></div>
            <div><label className="text-xs text-slate-500">To</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded-md px-3 py-2 block" /></div>
            <button onClick={runReport} className="bg-blue-600 text-white px-4 py-2 rounded-md">Run</button>
            <button onClick={exportCsv} disabled={!report} className="bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-md flex items-center gap-1"><Download size={16} /> Excel/CSV</button>
            {report && (
              <PdfActions
                targetId="admin-hub-report"
                filename={`ERP-Admin-Report-${from}-to-${to}.pdf`}
                printTitle={`Admin Report ${from} – ${to}`}
              />
            )}
          </div>
          {report && (
            <div id="admin-hub-report" className="bg-white border rounded-xl p-6 space-y-4">
              <div>
                <div className="text-xs text-slate-500">{COMPANY.displayName}</div>
                <h3 className="font-bold text-lg">Extended Report</h3>
                <p className="text-sm text-slate-600">{from} to {to}</p>
                <p className="text-xs text-slate-500">{COMPANY.phone} · {COMPANY.email}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border rounded-xl p-4"><div className="text-xs text-slate-500">Sales</div><div className="text-xl font-bold">{Number(report.salesTotal).toFixed(2)}</div></div>
                <div className="border rounded-xl p-4"><div className="text-xs text-slate-500">Purchases</div><div className="text-xl font-bold">{Number(report.purchaseTotal).toFixed(2)}</div></div>
                <div className="border rounded-xl p-4"><div className="text-xs text-slate-500">Visits</div><div className="text-xl font-bold">{report.visitCount}</div></div>
                <div className="border rounded-xl p-4"><div className="text-xs text-slate-500">Invoices</div><div className="text-xl font-bold">{report.salesCount}</div></div>
              </div>
              {report?.lowStock?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
                  Low stock: {report.lowStock.map((p: any) => p.name).join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'notifications' && (
        <div className="space-y-4">
          <form className="bg-white border rounded-xl p-4 space-y-2" onSubmit={async (e) => {
            e.preventDefault();
            await api.addNotification({ title: nTitle, body: nBody, channel: nChannel, user_id: null });
            setNTitle(''); setNBody(''); load();
          }}>
            <h3 className="font-semibold flex items-center gap-1"><Bell size={16} /> Send notification</h3>
            <input required value={nTitle} onChange={(e) => setNTitle(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="Title" />
            <textarea value={nBody} onChange={(e) => setNBody(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="Body" />
            <select value={nChannel} onChange={(e) => setNChannel(e.target.value)} className="w-full border rounded-md px-3 py-2">
              <option value="in_app">In-App / Push</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
            <p className="text-xs text-slate-500">Email/SMS/WhatsApp are queued as channel stubs until providers are configured.</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md">Send</button>
          </form>
          <ul className="bg-white border rounded-xl divide-y text-sm">
            {notifications.map((n) => (
              <li key={n.id} className="px-4 py-3 flex justify-between gap-2">
                <div><div className="font-medium">{n.title}</div><div className="text-slate-500">{n.body}</div><div className="text-xs uppercase text-slate-400">{n.channel}</div></div>
                {!n.read && <button className="text-blue-600 text-xs" onClick={async () => { await api.markNotificationRead(n.id); load(); }}>Mark read</button>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'audit' && (
        <div className="space-y-4">
          <button className="bg-slate-800 text-white px-4 py-2 rounded-md flex items-center gap-2" onClick={async () => {
            await api.addAuditLog({ user_id: user?.id, username: user?.username, action: 'BACKUP', entity_type: 'system', details: 'Manual backup requested' });
            const b = await api.backupDatabase();
            setBackupMsg(`Backup ready at ${b.timestamp} (${Object.keys(b.dump || {}).length} tables)`);
            const blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `erp-backup-${Date.now()}.json`; a.click();
            load();
          }}><Shield size={16} /> Backup & Audit</button>
          {backupMsg && <div className="text-sm text-emerald-700">{backupMsg}</div>}
          <div className="bg-white border rounded-xl overflow-hidden text-sm max-h-96 overflow-y-auto">
            <table className="w-full"><thead className="bg-slate-50 sticky top-0"><tr><th className="text-left px-4 py-2">When</th><th className="text-left px-4 py-2">User</th><th className="text-left px-4 py-2">Action</th><th className="text-left px-4 py-2">Details</th></tr></thead>
              <tbody className="divide-y">{audits.map((a) => <tr key={a.id}><td className="px-4 py-2">{a.created_at}</td><td className="px-4 py-2">{a.username}</td><td className="px-4 py-2">{a.action}</td><td className="px-4 py-2">{a.details}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'ai' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ['AI Business Dashboard', 'Unified KPIs with anomaly highlights — model pending.'],
            ['AI Sales Forecasting', 'Demand forecasts from historical invoices — model pending.'],
            ['AI Inventory Prediction', 'Reorder suggestions from stock velocity — model pending.'],
            ['AI Customer Insights', 'Credit risk and visit affinity — model pending.'],
            ['AI Smart Reports', 'Natural-language report builder — model pending.'],
            ['AI Assistant', 'In-app chat for ERP workflows — model pending.'],
          ].map(([title, desc]) => (
            <div key={title} className="bg-white border rounded-xl p-5 opacity-90">
              <div className="flex items-center gap-2 font-semibold text-slate-800"><Sparkles size={16} className="text-amber-500" /> {title}</div>
              <p className="text-sm text-slate-500 mt-2">{desc}</p>
              <span className="inline-block mt-3 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">Coming soon · feature-flagged</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
