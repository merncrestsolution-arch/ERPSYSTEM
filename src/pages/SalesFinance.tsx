import { useEffect, useState, type FormEvent } from 'react';
import { FileText, Banknote } from 'lucide-react';
import { getErpApi } from '../lib/erpApi';
import PdfActions from '../components/PdfActions';
import { COMPANY } from '../lib/companyProfile';

export default function SalesFinance() {
  const api = getErpApi();
  const [tab, setTab] = useState<'quotes' | 'orders' | 'payments' | 'cash' | 'statements'>('quotes');
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [cash, setCash] = useState<any[]>([]);
  const [dns, setDns] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [payCustomer, setPayCustomer] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [stmtCustomer, setStmtCustomer] = useState('');
  const [statement, setStatement] = useState<any>(null);
  const [cashType, setCashType] = useState('Income');
  const [cashAmount, setCashAmount] = useState('');
  const [cashDesc, setCashDesc] = useState('');
  const [promoName, setPromoName] = useState('');
  const [promoPct, setPromoPct] = useState('5');

  const load = async () => {
    setCustomers(await api.getCustomers());
    setProducts(await api.getProducts());
    setQuotes(await api.getQuotations());
    setOrders(await api.getSalesOrders());
    setPayments(await api.getCustomerPayments());
    setCash(await api.getCashBook());
    setDns(await api.getDeliveryNotes());
    setPromos(await api.getPromotions());
  };
  useEffect(() => { load(); }, []);

  const createQuote = async (e: FormEvent) => {
    e.preventDefault();
    const p = products.find((x) => x.id === Number(productId));
    const q = parseInt(qty) || 1;
    const price = p?.selling_price || 0;
    const total = q * price;
    await api.addQuotation({
      customer_id: Number(customerId), quote_number: `QT-${Date.now()}`, total_amount: total, discount: 0, net_amount: total, status: 'Draft',
      items: [{ product_id: Number(productId), quantity: q, selling_price: price, total_price: total }]
    });
    load();
  };

  return (
    <div className="p-4 md:p-8 space-y-6 w-full">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><FileText /> Sales & Finance</h2>
        <p className="text-slate-500">Quotations, orders, payments, cash book, and statements.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {([['quotes', 'Quotations'], ['orders', 'Orders / DN'], ['payments', 'Customer Payments'], ['cash', 'Cash Book'], ['statements', 'Statements']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-3 py-1.5 rounded-md text-sm font-medium ${tab === id ? 'bg-blue-600 text-white' : 'bg-white border text-slate-700'}`}>{label}</button>
        ))}
      </div>

      {tab === 'quotes' && (
        <div className="space-y-4">
          <form onSubmit={createQuote} className="bg-white border rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="border rounded-md px-3 py-2"><option value="">Customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.shop_name}</option>)}</select>
            <select required value={productId} onChange={(e) => setProductId(e.target.value)} className="border rounded-md px-3 py-2"><option value="">Product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="border rounded-md px-3 py-2" />
            <button className="bg-blue-600 text-white rounded-md">Create Quote</button>
          </form>
          <div className="bg-white border rounded-xl overflow-hidden text-sm">
            <table className="w-full"><thead className="bg-slate-50"><tr><th className="text-left px-4 py-2">Quote</th><th className="text-left px-4 py-2">Customer</th><th className="text-left px-4 py-2">Net</th><th className="text-left px-4 py-2">Status</th><th className="text-right px-4 py-2">Action</th></tr></thead>
              <tbody className="divide-y">{quotes.map((q) => (
                <tr key={q.id}>
                  <td className="px-4 py-2">{q.quote_number}</td><td className="px-4 py-2">{q.customer_name}</td><td className="px-4 py-2">{q.net_amount}</td><td className="px-4 py-2">{q.status}</td>
                  <td className="px-4 py-2 text-right">{q.status !== 'Converted' && <button className="text-blue-600" onClick={async () => { await api.convertQuotationToSo(q.id); load(); }}>→ Sales Order</button>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <form className="bg-white border rounded-xl p-4 flex gap-2" onSubmit={async (e) => { e.preventDefault(); await api.addPromotion({ name: promoName, discount_percent: parseFloat(promoPct) || 0, active: true }); setPromoName(''); load(); }}>
            <input required value={promoName} onChange={(e) => setPromoName(e.target.value)} placeholder="Promotion name" className="border rounded-md px-3 py-2 flex-1" />
            <input type="number" value={promoPct} onChange={(e) => setPromoPct(e.target.value)} className="border rounded-md px-3 py-2 w-24" />
            <button className="bg-emerald-600 text-white px-3 rounded-md">Add Promo</button>
          </form>
          <ul className="text-sm text-slate-600">{promos.map((p) => <li key={p.id}>{p.name} — {p.discount_percent}%</li>)}</ul>
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-white border rounded-xl overflow-hidden text-sm">
            <table className="w-full"><thead className="bg-slate-50"><tr><th className="text-left px-4 py-2">SO #</th><th className="text-left px-4 py-2">Customer</th><th className="text-left px-4 py-2">Net</th><th className="text-left px-4 py-2">Status</th><th className="text-right px-4 py-2">Actions</th></tr></thead>
              <tbody className="divide-y">{orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2">{o.so_number}</td><td className="px-4 py-2">{o.customer_name}</td><td className="px-4 py-2">{o.net_amount}</td><td className="px-4 py-2">{o.status}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    {o.status === 'Open' && <button className="text-blue-600" onClick={async () => { await api.convertSoToInvoice(o.id); load(); }}>Invoice</button>}
                    <button className="text-emerald-600" onClick={async () => { await api.addDeliveryNote({ so_id: o.id, customer_id: o.customer_id, dn_number: `DN-${Date.now()}`, status: 'Dispatched' }); load(); }}>DN</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-semibold mb-2">Delivery Notes</h3>
            <ul className="text-sm divide-y">{dns.map((d) => <li key={d.id} className="py-2 flex justify-between"><span>{d.dn_number} — {d.customer_name}</span><span>{d.status}</span></li>)}</ul>
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-4">
          <form className="bg-white border rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3" onSubmit={async (e) => {
            e.preventDefault();
            await api.addCustomerPayment({ customer_id: Number(payCustomer), payment_method: payMethod, amount: parseFloat(payAmount) || 0, date: new Date().toISOString().slice(0, 10), reference_number: `PAY-${Date.now()}` });
            setPayAmount(''); load();
          }}>
            <select required value={payCustomer} onChange={(e) => setPayCustomer(e.target.value)} className="border rounded-md px-3 py-2"><option value="">Customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.shop_name}</option>)}</select>
            <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="border rounded-md px-3 py-2"><option>Cash</option><option>Transfer</option><option>Card</option></select>
            <input required type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="border rounded-md px-3 py-2" placeholder="Amount" />
            <button className="bg-blue-600 text-white rounded-md flex items-center justify-center gap-1"><Banknote size={16} /> Collect</button>
          </form>
          <div className="bg-white border rounded-xl overflow-hidden text-sm">
            <table className="w-full"><thead className="bg-slate-50"><tr><th className="text-left px-4 py-2">Customer</th><th className="text-left px-4 py-2">Method</th><th className="text-left px-4 py-2">Amount</th><th className="text-left px-4 py-2">Date</th></tr></thead>
              <tbody className="divide-y">{payments.map((p) => <tr key={p.id}><td className="px-4 py-2">{p.customer_name}</td><td className="px-4 py-2">{p.payment_method}</td><td className="px-4 py-2">{p.amount}</td><td className="px-4 py-2">{p.date}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'cash' && (
        <div className="space-y-4">
          <form className="bg-white border rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3" onSubmit={async (e) => {
            e.preventDefault();
            await api.addCashBookEntry({ entry_type: cashType, category: cashType, description: cashDesc, amount: parseFloat(cashAmount) || 0, entry_date: new Date().toISOString().slice(0, 10) });
            setCashAmount(''); setCashDesc(''); load();
          }}>
            <select value={cashType} onChange={(e) => setCashType(e.target.value)} className="border rounded-md px-3 py-2"><option>Income</option><option>Expense</option></select>
            <input value={cashDesc} onChange={(e) => setCashDesc(e.target.value)} className="border rounded-md px-3 py-2" placeholder="Description" />
            <input required type="number" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} className="border rounded-md px-3 py-2" placeholder="Amount" />
            <button className="bg-slate-800 text-white rounded-md">Add Entry</button>
          </form>
          <div className="bg-white border rounded-xl overflow-hidden text-sm">
            <table className="w-full"><thead className="bg-slate-50"><tr><th className="text-left px-4 py-2">Type</th><th className="text-left px-4 py-2">Description</th><th className="text-left px-4 py-2">Amount</th><th className="text-left px-4 py-2">Date</th></tr></thead>
              <tbody className="divide-y">{cash.map((c) => <tr key={c.id}><td className="px-4 py-2">{c.entry_type}</td><td className="px-4 py-2">{c.description}</td><td className="px-4 py-2">{c.amount}</td><td className="px-4 py-2">{c.entry_date}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'statements' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <select value={stmtCustomer} onChange={(e) => setStmtCustomer(e.target.value)} className="border rounded-md px-3 py-2 flex-1"><option value="">Customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.shop_name}</option>)}</select>
            <button className="bg-blue-600 text-white px-4 rounded-md" onClick={async () => setStatement(await api.getCustomerStatement(Number(stmtCustomer)))}>Load Statement</button>
          </div>
          {statement?.customer && (
            <div className="space-y-3">
              <PdfActions
                targetId="customer-statement"
                filename={`Statement-${statement.customer.shop_name.replace(/\s+/g, '-')}.pdf`}
                printTitle={`Statement - ${statement.customer.shop_name}`}
              />
              <div id="customer-statement" className="bg-white border rounded-xl p-6 space-y-3 text-sm">
                <div className="text-xs text-slate-500">{COMPANY.displayName} — Customer Statement</div>
                <div className="text-xs text-slate-500">{COMPANY.address} · {COMPANY.phone} · {COMPANY.email}</div>
                <div className="font-semibold text-lg">{statement.customer.shop_name}</div>
                <div>Outstanding: LKR {Number(statement.customer.outstanding_balance || 0).toFixed(2)}</div>
                <div>
                  <h4 className="font-medium mb-1">Sales</h4>
                  <ul>{statement.sales.map((s: any) => <li key={s.id}>{s.invoice_number}: LKR {s.net_amount}</li>)}</ul>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Payments</h4>
                  <ul>{statement.payments.map((p: any) => <li key={p.id}>{p.date}: LKR {p.amount} ({p.payment_method})</li>)}</ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
