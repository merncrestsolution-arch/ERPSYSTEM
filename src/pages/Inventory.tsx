import React, { useState, useEffect } from 'react';
import { Plus, Search, Layers, TrendingUp, TrendingDown } from 'lucide-react';

export default function Inventory() {
  const [products, setProducts] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setAddModalOpen] = useState(false);

  // Form State
  const [productId, setProductId] = useState('');
  const [type, setType] = useState('Addition');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Physical Count Correction');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        const [prodData, adjData] = await Promise.all([
          // @ts-ignore
          window.electronAPI.getProducts(),
          // @ts-ignore
          window.electronAPI.getStockAdjustments()
        ]);
        setProducts(prodData);
        setAdjustments(adjData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      alert("Please select a product");
      return;
    }

    const newAdj = {
      product_id: parseInt(productId),
      adjustment_type: type,
      quantity: parseInt(quantity),
      reason: reason
    };

    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        await window.electronAPI.addStockAdjustment(newAdj);
        await loadData();
        setAddModalOpen(false);
        setProductId('');
        setType('Addition');
        setQuantity('');
        setReason('Physical Count Correction');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to adjust stock');
    }
  };

  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Inventory & Adjustments</h2>
          <p className="text-slate-500">Track stock levels and make manual inventory corrections.</p>
        </div>
        <button 
          onClick={() => setAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 shadow-sm transition-colors w-full sm:w-auto"
        >
          <Plus size={20} />
          New Adjustment
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2 text-slate-600 font-medium">
            <Layers className="text-blue-500" /> Total Stock Value
          </div>
          <p className="text-2xl font-bold text-slate-800">
            LKR {products.reduce((sum, p) => sum + (p.stock_quantity * p.cost_price), 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2 text-slate-600 font-medium">
            <TrendingUp className="text-green-500" /> High Stock Items
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {products.filter(p => p.stock_quantity > 100).length}
          </p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-slate-200 border-l-4 border-l-red-500">
          <div className="flex items-center gap-3 mb-2 text-red-600 font-medium">
            <TrendingDown className="text-red-500" /> Low Stock Alerts
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {products.filter(p => p.stock_quantity < 20).length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-slate-50 gap-4">
          <h3 className="font-bold text-slate-700">Recent Adjustments Log</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search log..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Qty</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {adjustments.filter(a => a.product_name.toLowerCase().includes(search.toLowerCase()) || a.reason?.toLowerCase().includes(search.toLowerCase())).map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">{a.product_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${a.adjustment_type === 'Addition' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {a.adjustment_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{a.adjustment_type === 'Addition' ? '+' : '-'}{a.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{a.reason}</td>
                </tr>
              ))}
              {adjustments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No adjustments found.
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
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-800">New Stock Adjustment</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAddAdjustment} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
                <select 
                  value={productId} 
                  onChange={e => setProductId(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
                  required
                >
                  <option value="">Select Product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (Current Stock: {p.stock_quantity})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select 
                    value={type} 
                    onChange={e => setType(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="Addition">Addition (+)</option>
                    <option value="Deduction">Deduction (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                  <input required type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                <input required type="text" value={reason} onChange={e => setReason(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="e.g. Broken during transit, Found extra in warehouse" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setAddModalOpen(false)} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-md font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors">Apply Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
