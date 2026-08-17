import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Plus, Search, ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import { getErpApi } from '../lib/erpApi';
import {
  COLLECTION_TYPES,
  enrichCashBookEntries,
  type CashBookEntry,
} from '../lib/cashBookDisplay';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function money(n: number) {
  return `LKR ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function collectionTone(type?: string | null) {
  if (type === 'New Sale') return 'bg-emerald-50 text-emerald-800';
  if (type === 'Cheque RTN') return 'bg-amber-50 text-amber-800';
  if (type === 'Previous Invoice') return 'bg-blue-50 text-blue-800';
  return 'bg-slate-100 text-slate-700';
}

export default function CashBook() {
  const api = getErpApi();
  const [rows, setRows] = useState<CashBookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(daysAgoISO(30));
  const [to, setTo] = useState(todayISO());
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [entryType, setEntryType] = useState<'Income' | 'Expense'>('Income');
  const [collectionType, setCollectionType] = useState('Previous Invoice');
  const [method, setMethod] = useState('Cash');
  const [amount, setAmount] = useState('');
  const [entryDate, setEntryDate] = useState(todayISO());
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [chequeRef, setChequeRef] = useState('');
  const [description, setDescription] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = (await api.getCashBook?.()) || [];
      setRows(enrichCashBookEntries(data));
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((e) => {
      const d = String(e.entry_date || '').slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const hay = [
        e.description,
        e.invoice_number,
        e.receipt_number,
        e.payment_method,
        e.collection_type,
        e.cheque_reference,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, from, to, search]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const e of filtered) {
      const a = Number(e.amount) || 0;
      if (e.entry_type === 'Expense') expense += a;
      else income += a;
    }
    return { income, expense, net: income - expense };
  }, [filtered]);

  const resetForm = () => {
    setEntryType('Income');
    setCollectionType('Previous Invoice');
    setMethod('Cash');
    setAmount('');
    setEntryDate(todayISO());
    setInvoiceNumber('');
    setReceiptNumber('');
    setChequeRef('');
    setDescription('');
    setShowForm(false);
  };

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    const n = parseFloat(amount) || 0;
    if (n <= 0) {
      alert('Enter a valid amount.');
      return;
    }
    setSaving(true);
    try {
      const invoice = invoiceNumber.trim() || null;
      const receipt = receiptNumber.trim() || null;
      const cheque = chequeRef.trim() || null;
      const desc =
        description.trim() ||
        (invoice ? `${method} — ${invoice}` : undefined);
      await api.addCashBookEntry({
        entry_type: entryType,
        category: entryType === 'Expense' ? 'Manual Payment' : collectionType,
        description: desc,
        amount: n,
        entry_date: entryDate,
        payment_method: method,
        collection_type: entryType === 'Income' ? collectionType : null,
        invoice_number: invoice,
        receipt_number: receipt,
        cheque_reference: method === 'Cheque' || collectionType === 'Cheque RTN' ? cheque : null,
      });
      resetForm();
      await load();
    } catch (err: any) {
      alert(err?.message || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 w-full max-w-6xl mx-auto pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Cash Book</h2>
          <p className="text-slate-500 text-sm">
            Daily collections and payments — auto-updated from receipts, invoices, and supplier payments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-lg font-medium min-h-11"
        >
          <Plus size={18} /> Add entry
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#e7eeff] bg-white p-4 flex items-start gap-3">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><ArrowDownLeft size={18} /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Collections</p>
            <p className="text-lg font-bold text-emerald-700">{money(totals.income)}</p>
          </div>
        </div>
        <div className="rounded-xl border border-[#e7eeff] bg-white p-4 flex items-start gap-3">
          <div className="rounded-lg bg-red-50 p-2 text-red-700"><ArrowUpRight size={18} /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payments</p>
            <p className="text-lg font-bold text-red-700">{money(totals.expense)}</p>
          </div>
        </div>
        <div className="rounded-xl border border-[#e7eeff] bg-white p-4 flex items-start gap-3">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-700"><Wallet size={18} /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Net cash</p>
            <p className="text-lg font-bold text-blue-800">{money(totals.net)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#e7eeff] bg-white p-4 space-y-3">
        <h3 className="font-semibold text-slate-800">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Invoice, receipt, cheque, description…"
                className="w-full border border-slate-300 rounded-md pl-10 pr-3 py-2"
              />
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={onSave} className="rounded-xl border border-[#e7eeff] bg-white p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h3 className="md:col-span-2 font-semibold text-slate-800">Manual cash book entry</h3>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Entry type</label>
            <select value={entryType} onChange={(e) => setEntryType(e.target.value as 'Income' | 'Expense')} className="w-full border rounded-md px-3 py-2">
              <option value="Income">Collection (Income)</option>
              <option value="Expense">Payment (Expense)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
            <input type="date" required value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="w-full border rounded-md px-3 py-2" />
          </div>
          {entryType === 'Income' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Collection type</label>
              <select value={collectionType} onChange={(e) => setCollectionType(e.target.value)} className="w-full border rounded-md px-3 py-2">
                {COLLECTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Payment method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full border rounded-md px-3 py-2">
              <option>Cash</option>
              <option>Cheque</option>
              <option>Transfer</option>
              <option>Card</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Amount (LKR)</label>
            <input required type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Invoice number</label>
            <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="e.g. INV-3265" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Receipt number</label>
            <input value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="Optional" />
          </div>
          {(method === 'Cheque' || collectionType === 'Cheque RTN') && entryType === 'Income' && (
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Cheque ref</label>
              <input value={chequeRef} onChange={(e) => setChequeRef(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="Cheque number / bank" />
            </div>
          )}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Description (optional)</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" disabled={saving} className="bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-70">
              {saving ? 'Saving…' : 'Save entry'}
            </button>
            <button type="button" onClick={resetForm} className="border px-4 py-2 rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-[#e7eeff] bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e7eeff] font-semibold text-slate-800">
          Entries ({filtered.length})
        </div>
        {loading ? (
          <p className="text-sm text-slate-500 py-8 text-center">Loading cash book…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">No entries for the selected period.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm min-w-[960px]">
              <thead className="bg-[#f0f3ff] text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Collection type</th>
                  <th className="text-left px-3 py-2">Invoice #</th>
                  <th className="text-left px-3 py-2">Receipt #</th>
                  <th className="text-left px-3 py-2">Method</th>
                  <th className="text-left px-3 py-2">Cheque ref</th>
                  <th className="text-right px-3 py-2">Amount</th>
                  <th className="text-left px-3 py-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-t border-[#e7eeff]">
                    <td className="px-3 py-2 whitespace-nowrap">{String(e.entry_date || '').slice(0, 10)}</td>
                    <td className="px-3 py-2">
                      <span className={e.entry_type === 'Expense' ? 'text-red-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                        {e.entry_type}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {e.collection_type ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${collectionTone(e.collection_type)}`}>
                          {e.collection_type}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{e.invoice_number || '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs">{e.receipt_number || '—'}</td>
                    <td className="px-3 py-2">{e.payment_method || '—'}</td>
                    <td className="px-3 py-2 text-xs">{e.cheque_reference || '—'}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-semibold ${e.entry_type === 'Expense' ? 'text-red-700' : 'text-emerald-700'}`}>
                      {e.entry_type === 'Expense' ? '−' : '+'}{money(Number(e.amount) || 0)}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{e.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
