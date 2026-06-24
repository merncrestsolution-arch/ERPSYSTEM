import React, { useState, useEffect } from 'react';
import { Plus, Search, DollarSign } from 'lucide-react';

export default function SupplierPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setAddModalOpen] = useState(false);

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        const [paymentData, supData] = await Promise.all([
          // @ts-ignore
          window.electronAPI.getSupplierPayments(),
          // @ts-ignore
          window.electronAPI.getSuppliers()
        ]);
        setPayments(paymentData);
        setSuppliers(supData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMakePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) return alert("Select supplier");

    const newPayment = {
      supplier_id: parseInt(supplierId),
      payment_method: paymentMethod,
      reference_number: referenceNumber,
      amount: parseFloat(amount),
      date: date
    };

    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        await window.electronAPI.addSupplierPayment(newPayment);
        await loadData();
        setAddModalOpen(false);
        setSupplierId('');
        setPaymentMethod('Cash');
        setReferenceNumber('');
        setAmount('');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to process payment');
    }
  };

  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Supplier Payments</h2>
          <p className="text-slate-500">Record payments made to suppliers and track ledger balances.</p>
        </div>
        <button 
          onClick={() => setAddModalOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 shadow-sm transition-colors w-full sm:w-auto"
        >
          <Plus size={20} />
          Make Payment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-8">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="text-sm font-medium text-slate-500 mb-1">Total Paid (All Time)</div>
          <div className="text-2xl font-bold text-green-600">
            LKR {payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-slate-200 border-l-4 border-l-red-500">
          <div className="text-sm font-medium text-slate-500 mb-1">Total Outstanding Debt</div>
          <div className="text-2xl font-bold text-red-600">
            LKR {suppliers.reduce((sum, s) => sum + s.balance, 0).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search reference or supplier..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Method</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Reference No.</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {payments.filter(p => p.reference_number?.toLowerCase().includes(search.toLowerCase()) || p.supplier_name?.toLowerCase().includes(search.toLowerCase())).map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{new Date(p.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">{p.supplier_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded-full text-xs font-medium border border-slate-200">
                      {p.payment_method}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{p.reference_number || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">LKR {p.amount.toFixed(2)}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No payments found. Click "Make Payment" to record one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-green-50 sticky top-0 z-10">
              <h3 className="text-lg font-bold text-green-900 flex items-center gap-2"><DollarSign size={20}/> Issue Payment to Supplier</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleMakePayment} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                <select 
                  value={supplierId} 
                  onChange={e => setSupplierId(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
                  required
                >
                  <option value="">Select Supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} (Debt: LKR {s.balance.toFixed(2)})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                  <select 
                    value={paymentMethod} 
                    onChange={e => setPaymentMethod(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date</label>
                  <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (LKR)</label>
                <input required type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-lg font-bold text-slate-800" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reference Number (Optional)</label>
                <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="Cheque No / Transfer ID" />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setAddModalOpen(false)} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-md font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-bold transition-colors">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
