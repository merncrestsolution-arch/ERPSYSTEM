import React, { useState, useEffect } from 'react';
import { Plus, Search, Building2, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';

export default function Cheques() {
  const [cheques, setCheques] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  
  const [search, setSearch] = useState('');
  const [bankFilter, setBankFilter] = useState('');
  const [isAddModalOpen, setAddModalOpen] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [receivedFrom, setReceivedFrom] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [amount, setAmount] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [realizeDate, setRealizeDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        const [chequeData, custData] = await Promise.all([
          // @ts-ignore
          window.electronAPI.getCheques(),
          // @ts-ignore
          window.electronAPI.getCustomers()
        ]);
        setCheques(chequeData);
        setCustomers(custData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegisterCheque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return alert("Select customer");

    const newCheque = {
      customer_id: parseInt(customerId),
      received_from: receivedFrom.trim() || null,
      cheque_number: chequeNumber,
      bank_name: bankName,
      branch_name: branchName,
      amount: parseFloat(amount),
      issue_date: issueDate,
      realize_date: realizeDate
    };

    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        await window.electronAPI.addCheque(newCheque);
        await loadData();
        setAddModalOpen(false);
        setCustomerId('');
        setReceivedFrom('');
        setChequeNumber('');
        setBankName('');
        setBranchName('');
        setAmount('');
        setIssueDate('');
        setRealizeDate('');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to register cheque');
    }
  };

  const updateStatus = async (id: number, status: string, customer_id: number, amt: number) => {
    if (status === 'Bounced' && !confirm('Are you sure you want to mark this cheque as Bounced? This will reverse the payment and add the amount back to the customer\'s outstanding balance.')) return;
    
    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        await window.electronAPI.updateChequeStatus({ id, status, customer_id, amount: amt });
        await loadData();
      }
    } catch(e) {
      console.error(e);
      alert('Failed to update status');
    }
  };

  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Cheque Management</h2>
          <p className="text-slate-500">Track post-dated cheques, clearance, and returns.</p>
        </div>
        <button 
          onClick={() => setAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 shadow-sm transition-colors w-full sm:w-auto"
        >
          <Plus size={20} />
          Register Cheque
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
          <div className="text-sm font-medium text-slate-500 mb-1">Total Pending</div>
          <div className="text-2xl font-bold text-blue-600">
            LKR {cheques.filter(c => c.status === 'Pending').reduce((sum, c) => sum + c.amount, 0).toFixed(2)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
          <div className="text-sm font-medium text-slate-500 mb-1">To Realize Today</div>
          <div className="text-2xl font-bold text-orange-500">
            {cheques.filter(c => c.status === 'Pending' && new Date(c.realize_date).toDateString() === new Date().toDateString()).length}
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
          <div className="text-sm font-medium text-slate-500 mb-1">Cleared Value</div>
          <div className="text-2xl font-bold text-green-600">
            LKR {cheques.filter(c => c.status === 'Cleared').reduce((sum, c) => sum + c.amount, 0).toFixed(2)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 border-l-4 border-l-red-500">
          <div className="text-sm font-medium text-slate-500 mb-1">Bounced Value</div>
          <div className="text-2xl font-bold text-red-600">
            LKR {cheques.filter(c => c.status === 'Bounced').reduce((sum, c) => sum + c.amount, 0).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 sm:items-center bg-slate-50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search cheque no, customer or who gave..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <select
            value={bankFilter}
            onChange={(e) => setBankFilter(e.target.value)}
            className="w-full sm:w-56 px-3 py-2 border border-slate-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="">All Banks</option>
            {Array.from(new Set(cheques.map(c => c.bank_name).filter(Boolean))).sort().map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Cheque No</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Who Gave</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Bank/Branch</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Realize Date</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {cheques.filter(c => {
                const q = search.toLowerCase();
                const matchesSearch =
                  c.cheque_number?.toLowerCase().includes(q) ||
                  c.customer_name?.toLowerCase().includes(q) ||
                  c.received_from?.toLowerCase().includes(q) ||
                  c.bank_name?.toLowerCase().includes(q);
                const matchesBank = !bankFilter || c.bank_name === bankFilter;
                return matchesSearch && matchesBank;
              }).map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">{c.cheque_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{c.customer_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{c.received_from || c.customer_name || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    <div className="flex items-center gap-1"><Building2 size={14} className="text-slate-400"/> {c.bank_name}</div>
                    <div className="text-xs text-slate-400 ml-4">{c.branch_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">LKR {c.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    <div className="flex items-center gap-1"><Calendar size={14} className="text-slate-400"/> {new Date(c.realize_date).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium 
                      ${c.status === 'Pending' ? 'bg-orange-100 text-orange-800' : 
                        c.status === 'Cleared' ? 'bg-green-100 text-green-800' : 
                        'bg-red-100 text-red-800'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {c.status === 'Pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => updateStatus(c.id, 'Cleared', c.customer_id, c.amount)} className="text-green-600 hover:text-green-700 p-1 bg-green-50 rounded" title="Mark as Cleared">
                          <CheckCircle size={18} />
                        </button>
                        <button onClick={() => updateStatus(c.id, 'Bounced', c.customer_id, c.amount)} className="text-red-600 hover:text-red-700 p-1 bg-red-50 rounded" title="Mark as Bounced">
                          <AlertTriangle size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {cheques.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    No cheques registered. Click "Register Cheque" to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-800">Register Cheque</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleRegisterCheque} className="p-4 sm:p-6 space-y-4">
              <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm mb-4">
                <strong>Note:</strong> Registering a cheque will immediately deduct the amount from the customer's outstanding balance. If the cheque later bounces, the balance will be restored.
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer (Payer)</label>
                <select 
                  value={customerId} 
                  onChange={e => setCustomerId(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
                  required
                >
                  <option value="">Select Customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.shop_name} (Outstanding: LKR {c.outstanding_balance})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Received From / Who Gave <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="text" value={receivedFrom} onChange={e => setReceivedFrom(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="Name of person who gave the cheque (defaults to customer)" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cheque Number</label>
                  <input required type="text" value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (LKR)</label>
                  <input required type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                  <input required type="text" value={bankName} onChange={e => setBankName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="e.g. Commercial Bank" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Branch Name</label>
                  <input type="text" value={branchName} onChange={e => setBranchName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="e.g. Colombo 03" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Issue Date</label>
                  <input required type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Realize (Deposit) Date</label>
                  <input required type="date" value={realizeDate} onChange={e => setRealizeDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md" />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setAddModalOpen(false)} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-md font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors">Register Cheque</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
